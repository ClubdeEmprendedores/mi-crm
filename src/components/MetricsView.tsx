import { useMemo } from "react";
import type { Lead } from "../types";
import { STAGES, STAGE_COLORS, STAGE_LABELS } from "../types";

type Props = {
  leads: Lead[];
};

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000));
}

export function MetricsView({ leads }: Props) {
  const stats = useMemo(() => {
    const total = leads.length;

    const porEtapa = STAGES.map((s) => ({
      stage: s,
      count: leads.filter((l) => l.etapa === s).length,
    }));

    const nuncaContactados = leads.filter(
      (l) => l.etapa === "nuevo" && !l.contactadoEn && !l.ultimoMensajeEn,
    ).length;

    // "Contactado alguna vez" = tiene el campo cargado, O ya avanzó a una etapa
    // posterior a "nuevo" (leads cargados directo como miembro/ex-miembro no
    // siempre tienen contactadoEn/ultimoMensajeEn poblado).
    const contactadosAlgunaVez = leads.filter(
      (l) => l.etapa !== "nuevo" || !!l.contactadoEn || !!l.ultimoMensajeEn,
    ).length;
    const ganados = leads.filter((l) => l.etapa === "ganado").length;
    const exmiembros = leads.filter((l) => l.etapa === "exmiembro").length;

    const convNuevoContactado = total > 0 ? (contactadosAlgunaVez / total) * 100 : 0;
    const convContactadoMiembro = contactadosAlgunaVez > 0 ? (ganados / contactadosAlgunaVez) * 100 : 0;
    const churn = ganados + exmiembros > 0 ? (exmiembros / (ganados + exmiembros)) * 100 : 0;

    const tiemposContacto = leads
      .filter((l) => l.contactadoEn)
      .map((l) => daysBetween(l.creadoEn, l.contactadoEn!));
    const promedioDiasAContacto =
      tiemposContacto.length > 0
        ? Math.round(tiemposContacto.reduce((a, b) => a + b, 0) / tiemposContacto.length)
        : null;

    const porSede = { sanfer: 0, santelmo: 0, sinSede: 0 };
    leads
      .filter((l) => l.etapa === "ganado")
      .forEach((l) => {
        if (l.sede === "sanfer") porSede.sanfer++;
        else if (l.sede === "santelmo") porSede.santelmo++;
        else porSede.sinSede++;
      });

    const tagCounts = new Map<string, number>();
    leads.forEach((l) => l.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)));
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const destacados = leads.filter((l) => l.prioridad).length;

    return {
      total,
      porEtapa,
      nuncaContactados,
      contactadosAlgunaVez,
      ganados,
      convNuevoContactado,
      convContactadoMiembro,
      churn,
      promedioDiasAContacto,
      porSede,
      topTags,
      destacados,
    };
  }, [leads]);

  const maxEtapa = Math.max(1, ...stats.porEtapa.map((e) => e.count));

  return (
    <div className="metrics-wrap">
      <div className="metrics-grid">
        <div className="metrics-card">
          <span className="metrics-card-label">Total de leads</span>
          <span className="metrics-card-value">{stats.total}</span>
        </div>
        <div className="metrics-card">
          <span className="metrics-card-label">Nunca contactados</span>
          <span className="metrics-card-value metrics-card-value--warning">{stats.nuncaContactados}</span>
        </div>
        <div className="metrics-card">
          <span className="metrics-card-label">Conversión Nuevo → Contactado</span>
          <span className="metrics-card-value">{stats.convNuevoContactado.toFixed(1)}%</span>
        </div>
        <div className="metrics-card">
          <span className="metrics-card-label">Conversión Contactado → Miembro</span>
          <span className="metrics-card-value">{stats.convContactadoMiembro.toFixed(1)}%</span>
        </div>
        <div className="metrics-card">
          <span className="metrics-card-label">Días promedio hasta el 1er contacto</span>
          <span className="metrics-card-value">
            {stats.promedioDiasAContacto !== null ? `${stats.promedioDiasAContacto}d` : "—"}
          </span>
        </div>
        <div className="metrics-card">
          <span className="metrics-card-label">Baja de miembros (churn)</span>
          <span className="metrics-card-value">{stats.churn.toFixed(1)}%</span>
        </div>
      </div>

      <section className="metrics-section">
        <h3 className="metrics-section-title">Embudo por etapa</h3>
        <div className="metrics-funnel">
          {stats.porEtapa.map(({ stage, count }) => (
            <div key={stage} className="metrics-funnel-row">
              <span className="metrics-funnel-label">{STAGE_LABELS[stage]}</span>
              <div className="metrics-funnel-bar-wrap">
                <div
                  className="metrics-funnel-bar"
                  style={{
                    width: `${(count / maxEtapa) * 100}%`,
                    background: STAGE_COLORS[stage],
                  }}
                />
              </div>
              <span className="metrics-funnel-count">
                {count} {stats.total > 0 && `(${((count / stats.total) * 100).toFixed(1)}%)`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="metrics-two-col">
        <section className="metrics-section">
          <h3 className="metrics-section-title">Miembros por sede</h3>
          <ul className="metrics-simple-list">
            <li><span>San Fernando</span><span>{stats.porSede.sanfer}</span></li>
            <li><span>San Telmo</span><span>{stats.porSede.santelmo}</span></li>
            {stats.porSede.sinSede > 0 && (
              <li><span>Sin sede asignada</span><span>{stats.porSede.sinSede}</span></li>
            )}
          </ul>
          <p className="metrics-hint">{stats.destacados} lead{stats.destacados !== 1 ? "s" : ""} marcados como destacados ★</p>
        </section>

        <section className="metrics-section">
          <h3 className="metrics-section-title">Etiquetas de campaña más usadas</h3>
          {stats.topTags.length === 0 ? (
            <p className="metrics-hint">Todavía no hay etiquetas aplicadas.</p>
          ) : (
            <ul className="metrics-simple-list">
              {stats.topTags.map(([tag, count]) => (
                <li key={tag}><span>{tag}</span><span>{count}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
