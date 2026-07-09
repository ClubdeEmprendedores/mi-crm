# CRM — Club de Emprendedores

CRM propio construido con React + TypeScript + Vite + Supabase. Gestiona leads y miembros de los locales CdE San Fernando y San Telmo.

## Stack

- Frontend: React 19 + TypeScript + Vite (sin CSS framework, estilos inline/custom)
- Backend/DB: Supabase (PostgreSQL)
- Deploy: Vercel

## Arrancar en local

```bash
cd D:\CdE\mi-crm
npm run dev   # http://localhost:5173
```

## Conexión Supabase

Las credenciales están en `.env` (no commitear):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Estructura de datos

### Tabla `leads`

| Columna DB        | Campo TS         | Descripción                                      |
|-------------------|------------------|--------------------------------------------------|
| id                | id               | UUID                                             |
| nombre            | nombre           | Nombre del lead                                  |
| empresa           | empresa          | Nombre del emprendimiento                        |
| email             | email            |                                                  |
| telefono          | telefono         | Con código de país (ej. 5491199999999)           |
| instagram         | instagram        | Handle sin @                                     |
| notas             | notas            | Texto libre                                      |
| etapa             | etapa            | Ver etapas abajo                                 |
| creado_en         | creadoEn         | Timestamp ISO                                    |
| contactado_en     | contactadoEn     | Cuándo se contactó por primera vez               |
| propuesta         | propuesta        | "sanfer" / "santelmo" / "ambas"                  |
| sede              | sede             | "sanfer" / "santelmo" (miembros activos)         |
| contact_id        | contactId        | FK a tabla `contacts` (si existe)                |
| motivo_baja       | motivoBaja       | Por qué se fue (exmiembro/perdido)               |
| no_recontactar    | noRecontactar    | Bool — no volver a contactar                     |
| tags              | tags             | Array de strings (ej. "📣 Recontacto 25-jun: tibio") |
| ultimo_mensaje_en | ultimoMensajeEn  | Último contacto WhatsApp                         |
| historial         | historial        | JSONB array de `{fecha, nota}`                   |

### Etapas

- `nuevo` — Sin contactar todavía
- `contactado` — Se inició conversación
- `propuesta` — Se les envió propuesta formal
- `ganado` — Miembro activo del Club
- `exmiembro` — Fue miembro, ya no
- `perdido` — No apto / descartado

### Tabla `contacts`

Agenda de contactos separada (clientes frecuentes del local, no emprendedores). Mismos campos básicos: nombre, empresa, email, telefono, instagram, notas, creado_en.

### Tabla `contenido_calendario`

Calendario de publicaciones de Instagram (posts/historias/carruseles), pestaña "📅 Contenido" del CRM. Es la fuente única de este calendario desde julio 2026 (reemplaza el markdown `contenido/calendario_posteos.md` del proyecto `mente-ai-Matias`). El trabajo creativo (fotos, copy) se sigue coordinando en la sesión de Claude, no en el CRM — el CRM solo refleja estado y permite aprobar rápido.

| Columna DB     | Campo TS      | Descripción                                             |
|----------------|---------------|----------------------------------------------------------|
| id             | id            | UUID                                                      |
| fecha          | fecha         | Fecha de publicación planeada (DATE, "YYYY-MM-DD")        |
| sede           | sede          | "sanfernando" / "santelmo" (OJO: distinto de `Lead.sede` que usa "sanfer") |
| etiqueta       | etiqueta      | Nombre del socio o del contenido (ej. "Colette", "Concurso Cabo Verde") |
| tipo           | tipo          | "post" / "historia" / "carrusel"                          |
| estado_foto    | estadoFoto    | "pendiente" / "recibida" / "aprobada"                      |
| estado_copy    | estadoCopy    | "pendiente" / "borrador" / "aprobado"                      |
| publicado      | publicado     | Bool                                                       |
| image_url      | imageUrl      | Link de referencia (opcional)                              |
| caption        | caption       | Copy final (opcional)                                      |
| notas          | notas         | Texto libre                                                |
| creado_en      | creadoEn      | Timestamp ISO                                              |
| actualizado_en | actualizadoEn | Timestamp ISO                                              |

Cuando Claude arma contenido nuevo en una sesión (fuera de este repo, normalmente en `mente-ai-Matias`), carga/actualiza filas acá directo por REST con el anon key, mismo patrón que el snippet de leads.

**Ojo con tildes/ñ en Windows:** pasar texto con acentos directo en `python -c "..."` desde Bash en esta PC corrompe los caracteres (la consola lo decodifica mal antes de que Python lo vea, ej. "querés" queda "quer�s"). Escribir el JSON a un archivo `.json` con la tool `Write` (UTF-8 real) y que el script de Python lo lea de ahí con `encoding="utf-8"`, en vez de embeber el texto en el argumento `-c`.

```python
import urllib.request, json, ssl

env = {}
with open(r"D:\CdE\mi-crm\.env") as f:
    for line in f:
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

URL, KEY = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
ctx = ssl.create_default_context()

def insertar(row):
    req = urllib.request.Request(
        URL + "/rest/v1/contenido_calendario",
        data=json.dumps(row).encode(),
        headers={**HEADERS, "Prefer": "return=representation"},
        method="POST",
    )
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read())

def actualizar(id_, patch):
    req = urllib.request.Request(
        URL + f"/rest/v1/contenido_calendario?id=eq.{id_}",
        data=json.dumps(patch).encode(),
        headers=HEADERS,
        method="PATCH",
    )
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read())

# Ejemplo: cargar un post nuevo planeado
# insertar({"fecha": "2026-07-10", "sede": "sanfernando", "etiqueta": "Nombre Socio", "tipo": "post"})

# Ejemplo: marcar el copy aprobado
# actualizar("<uuid>", {"estado_copy": "aprobado"})
```

## Al iniciar una sesión de trabajo en el CRM

Leer las credenciales del `.env` y correr este snippet para ver el estado actual:

```python
import urllib.request, json, ssl, os

# Leer del .env
env = {}
with open(r"D:\CdE\mi-crm\.env") as f:
    for line in f:
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

URL = env["VITE_SUPABASE_URL"]
KEY = env["VITE_SUPABASE_ANON_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

def fetch(path):
    req = urllib.request.Request(URL + path, headers=HEADERS)
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read())

all_leads = []
offset = 0
while True:
    chunk = fetch(f"/rest/v1/leads?select=id,nombre,etapa,instagram,telefono,sede,propuesta,tags,creado_en&order=creado_en.desc&limit=1000&offset={offset}")
    all_leads.extend(chunk)
    if len(chunk) < 1000:
        break
    offset += 1000

from collections import Counter
etapas = Counter(l["etapa"] for l in all_leads)
miembros = [l for l in all_leads if l["etapa"] == "ganado"]

print(f"Total leads: {len(all_leads)}")
for e, c in sorted(etapas.items(), key=lambda x: -x[1]):
    print(f"  {e}: {c}")
print(f"\nMiembros activos ({len(miembros)}):")
for m in sorted(miembros, key=lambda x: x.get("nombre") or ""):
    print(f"  [{m.get('sede','?')}] {m['nombre']} | IG: {m.get('instagram','')} | Tel: {m.get('telefono','')}")
```

## Convenciones de código

- Columnas DB en snake_case, tipos TS en camelCase — conversión en `fromDb()` / `toDbPatch()` en `useLeads.ts`
- No hay ORM: queries directas con `supabase.from(...).select/insert/update/delete`
- Paginación de leads: de a 1000 registros en `useLeads.ts`
- Deduplicación automática por instagram/email/teléfono — lógica en `findDuplicateGroups()` y `mergeLeadInto()`
