"""
Reconciliación automática CRM <-> planillas de Balance — Club de Emprendedores
================================================================================
Corre en GitHub Actions (.github/workflows/reconciliar_leads.yml), semanal +
disparable a mano (workflow_dispatch). Reproduce en código el proceso manual
que se venía haciendo a mano: leer las dos planillas de Balance (San Fernando
y San Telmo), cruzarlas contra `leads` por email/instagram, y corregir lo que
se pueda corregir con confianza alta sin intervención humana.

Diseño deliberadamente conservador — solo dos tipos de acción se aplican solas:
  1. Un lead ya existente en el CRM que matchea por email/instagram con una
     fila de la planilla pero tiene etapa != "ganado" -> se pasa a "ganado"
     (y se completa la sede si estaba vacía).
  2. Un lead que aparece en las dos planillas (San Fernando y San Telmo) ->
     se le pone propuesta = "ambas".

Todo lo demás (crear leads nuevos para marcas sin ningún registro en el CRM,
marcar exmiembro/baja a alguien que la planilla dice "BAJA"/"ÚLTIMO MES")
NO se escribe solo — quedó demostrado en la práctica que esos casos necesitan
criterio humano (ver ejemplos reales: "Bena" es un amigo que se maneja fuera
del sistema, "Paula"/"Maru" tienen múltiples leads homónimos no relacionados,
etc.). Esos casos se listan en el resumen del run para que alguien los revise.

Variables de entorno requeridas:
  GOOGLE_SERVICE_ACCOUNT_JSON  -- contenido completo del JSON del service
                                  account (con acceso de Viewer a las dos
                                  planillas de Balance), como texto.
  SUPABASE_URL, SUPABASE_ANON_KEY -- mismas credenciales que usa el CRM (no
                                  hay RLS en `leads`, no hace falta service role).

Uso local:
    python reconciliar_leads.py            -> corre reconciliación completa
    python reconciliar_leads.py --dry-run  -> solo imprime qué haría, no escribe nada
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import unicodedata

import gspread
import requests
from google.oauth2.service_account import Credentials

SANFER_SHEET_ID = "1vgNGNUQvzMsxX-Z_kg7BWiDDM-T_KfXmA_TynP3xcAQ"
SANTELMO_SHEET_ID = "1VVi7qfjmuA6TNe1gMyEfp2RqGRqhRpwJmNoPuai4SyQ"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

BAJA_KEYWORDS = ("baja", "ultimo mes", "último mes", "se va")

ISSUE_TITULO = "Reconciliación de leads — revisión pendiente"


def normalize(s: str | None) -> str:
    if not s:
        return ""
    s = s.strip().lower().lstrip("@")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s


def cargar_credenciales_google() -> Credentials:
    crudo = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not crudo:
        raise SystemExit("Falta GOOGLE_SERVICE_ACCOUNT_JSON en el entorno.")
    info = json.loads(crudo)
    return Credentials.from_service_account_info(info, scopes=SCOPES)


def leer_activos_planilla(gc: gspread.Client, sheet_id: str, sede: str) -> list[dict]:
    """Lee la solapa más reciente (la primera/más a la izquierda, según cómo
    se vienen armando estas planillas) y devuelve filas con EMPRENDIMIENTO no vacío."""
    sh = gc.open_by_key(sheet_id)
    ws = sh.get_worksheet(0)
    rows = ws.get_all_values()
    if not rows:
        return []

    header_idx = None
    for i, row in enumerate(rows):
        normed = [normalize(c) for c in row]
        if "emprendimiento" in normed:
            header_idx = i
            break
    if header_idx is None:
        raise SystemExit(f"No encontré la columna EMPRENDIMIENTO en la solapa de {sede}. Revisar formato de la planilla a mano.")

    header = [normalize(c) for c in rows[header_idx]]

    def col(*names: str) -> int | None:
        for n in names:
            if n in header:
                return header.index(n)
        return None

    i_email = col("mails", "mail", "email")
    i_ig = col("instagram")
    i_emp = col("emprendimiento")
    i_estado = col("estado")
    i_estado2 = col("estado 2", "estado  2")

    activos = []
    for row in rows[header_idx + 1:]:
        empresa = row[i_emp].strip() if i_emp is not None and i_emp < len(row) else ""
        if not empresa:
            continue
        email = row[i_email].strip() if i_email is not None and i_email < len(row) else ""
        instagram = row[i_ig].strip() if i_ig is not None and i_ig < len(row) else ""
        estado = row[i_estado].strip() if i_estado is not None and i_estado < len(row) else ""
        estado2 = row[i_estado2].strip() if i_estado2 is not None and i_estado2 < len(row) else ""
        activos.append({
            "empresa": empresa,
            "email": email,
            "instagram": instagram,
            "sede": sede,
            "estado_texto": f"{estado} {estado2}".strip(),
        })
    return activos


def parece_baja(estado_texto: str) -> bool:
    t = normalize(estado_texto)
    return any(kw in t for kw in BAJA_KEYWORDS)


def fetch_leads(url: str, headers: dict) -> list[dict]:
    all_leads: list[dict] = []
    offset = 0
    page = 1000
    while True:
        resp = requests.get(
            f"{url}/rest/v1/leads",
            headers=headers,
            params={
                "select": "id,nombre,empresa,email,instagram,telefono,etapa,sede,propuesta",
                "order": "creado_en.desc",
                "limit": page,
                "offset": offset,
            },
            timeout=30,
        )
        resp.raise_for_status()
        chunk = resp.json()
        all_leads.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return all_leads


def patch_lead(url: str, headers: dict, lead_id: str, body: dict, dry_run: bool) -> None:
    if dry_run:
        return
    resp = requests.patch(
        f"{url}/rest/v1/leads",
        headers={**headers, "Content-Type": "application/json", "Prefer": "return=minimal"},
        params={"id": f"eq.{lead_id}"},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()


def publicar_issue_github(cuerpo: str, hay_pendientes: bool, dry_run: bool) -> None:
    """Crea/actualiza un Issue con los casos que necesitan revisión humana, o lo
    cierra solo si ya no queda nada pendiente. Sin esto el reporte solo vivía en
    el log de la Action y nadie lo veía entre corrida y corrida."""
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        print("(GITHUB_TOKEN/GITHUB_REPOSITORY no disponibles — no publico Issue, corrida local)")
        return

    api = f"https://api.github.com/repos/{repo}/issues"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    resp = requests.get(api, headers=headers, params={"state": "open", "per_page": 100}, timeout=30)
    resp.raise_for_status()
    existente = next((i for i in resp.json() if i["title"] == ISSUE_TITULO), None)

    if dry_run:
        print(f"(dry-run) {'actualizaría' if existente else 'crearía'} Issue de reconciliación" if hay_pendientes else "(dry-run) no habría nada pendiente para publicar")
        return

    if not hay_pendientes:
        if existente:
            requests.post(f"{api}/{existente['number']}/comments", headers=headers,
                           json={"body": "Sin casos pendientes en la corrida más reciente — cierro automáticamente."},
                           timeout=30).raise_for_status()
            requests.patch(f"{api}/{existente['number']}", headers=headers,
                            json={"state": "closed"}, timeout=30).raise_for_status()
        return

    if existente:
        requests.patch(f"{api}/{existente['number']}", headers=headers,
                        json={"body": cuerpo}, timeout=30).raise_for_status()
    else:
        requests.post(api, headers=headers,
                       json={"title": ISSUE_TITULO, "body": cuerpo}, timeout=30).raise_for_status()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="No escribe nada, solo imprime qué haría")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        raise SystemExit("Faltan SUPABASE_URL / SUPABASE_ANON_KEY en el entorno.")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}

    creds = cargar_credenciales_google()
    gc = gspread.authorize(creds)

    print("Leyendo planillas de balance...")
    activos_sanfer = leer_activos_planilla(gc, SANFER_SHEET_ID, "sanfer")
    activos_santelmo = leer_activos_planilla(gc, SANTELMO_SHEET_ID, "santelmo")
    print(f"  San Fernando: {len(activos_sanfer)} filas con EMPRENDIMIENTO")
    print(f"  San Telmo: {len(activos_santelmo)} filas con EMPRENDIMIENTO")

    print("Leyendo leads del CRM...")
    leads = fetch_leads(supabase_url, headers)
    print(f"  {len(leads)} leads")

    by_ig: dict[str, dict] = {}
    by_email: dict[str, dict] = {}
    for lead in leads:
        ig = normalize(lead.get("instagram"))
        email = normalize(lead.get("email"))
        if ig:
            by_ig.setdefault(ig, lead)
        if email:
            by_email.setdefault(email, lead)

    def match(entry: dict) -> dict | None:
        ig = normalize(entry.get("instagram"))
        email = normalize(entry.get("email"))
        if ig and ig in by_ig:
            return by_ig[ig]
        if email and email in by_email:
            return by_email[email]
        return None

    sedes_por_lead: dict[str, set[str]] = {}
    fixes: list[str] = []
    sin_match: list[str] = []
    posibles_bajas: list[str] = []

    for entry in activos_sanfer + activos_santelmo:
        lead = match(entry)
        if not lead:
            sin_match.append(f"[{entry['sede']}] {entry['empresa']} ({entry.get('email') or entry.get('instagram') or 'sin contacto'})")
            continue

        sedes_por_lead.setdefault(lead["id"], set()).add(entry["sede"])

        patch: dict = {}
        if lead.get("etapa") != "ganado":
            patch["etapa"] = "ganado"
        if not lead.get("sede"):
            patch["sede"] = entry["sede"]
        if patch:
            patch_lead(supabase_url, headers, lead["id"], patch, args.dry_run)
            fixes.append(f"{lead.get('nombre') or entry['empresa']}: {patch}")

        if parece_baja(entry["estado_texto"]) and lead.get("etapa") == "ganado":
            posibles_bajas.append(f"[{entry['sede']}] {lead.get('nombre') or entry['empresa']} — planilla dice: \"{entry['estado_texto']}\"")

    for lead_id, sedes in sedes_por_lead.items():
        if len(sedes) > 1:
            lead = next(l for l in leads if l["id"] == lead_id)
            if lead.get("propuesta") != "ambas":
                patch_lead(supabase_url, headers, lead_id, {"propuesta": "ambas"}, args.dry_run)
                fixes.append(f"{lead.get('nombre') or lead_id}: propuesta -> ambas (dual-sede)")

    resumen = []
    resumen.append(f"## Reconciliación de leads vs. planillas de balance ({'DRY RUN — ' if args.dry_run else ''}{len(activos_sanfer) + len(activos_santelmo)} filas activas)")
    resumen.append("")
    resumen.append(f"### Correcciones aplicadas automáticamente ({len(fixes)})")
    resumen.extend(f"- {f}" for f in fixes) if fixes else resumen.append("- (ninguna)")
    resumen.append("")
    resumen.append(f"### Sin match en el CRM — revisar a mano si hace falta crear el lead ({len(sin_match)})")
    resumen.extend(f"- {s}" for s in sin_match) if sin_match else resumen.append("- (ninguna)")
    resumen.append("")
    resumen.append(f"### Posible baja (planilla dice BAJA/ÚLTIMO MES pero sigue como \"ganado\") ({len(posibles_bajas)})")
    resumen.extend(f"- {b}" for b in posibles_bajas) if posibles_bajas else resumen.append("- (ninguna)")

    texto = "\n".join(resumen)
    print("\n" + texto)

    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as f:
            f.write(texto + "\n")

    hay_pendientes = bool(sin_match or posibles_bajas)
    publicar_issue_github(texto, hay_pendientes, args.dry_run)

    return 0


if __name__ == "__main__":
    sys.exit(main())
