export type ReporteFila = {
  email: string;
  instagram: string;
  emprendimiento: string;
  /** Resto de columnas del mes (Alquiler, Ventas, Deuda, Comisión, Estado, etc.), tal cual vinieron. */
  campos: Record<string, string>;
};

/**
 * Al pegar celdas copiadas de Google Sheets, el navegador las separa con
 * tabs (preservando columnas vacías). Si en cambio pegan un CSV, separamos
 * por coma.
 */
function splitRow(line: string): string[] {
  return line.includes("\t") ? line.split("\t") : line.split(",");
}

/** Parsea el texto pegado desde la pestaña del mes de "Emprendedores Balance". */
export function parseReporteMensual(texto: string): ReporteFila[] {
  const lines = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  const headerCells = splitRow(lines[0]).map((h) => h.trim());
  const headerLower = headerCells.map((h) => h.toLowerCase());

  const mailIdx = headerLower.findIndex((h) => h.includes("mail"));
  const igIdx = headerLower.findIndex((h) => h.includes("instagram"));
  const empIdx = headerLower.findIndex(
    (h) => h.includes("emprendimiento") || h.includes("marca"),
  );

  const filas: ReporteFila[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitRow(line);
    if (cells.every((c) => !c.trim())) continue;

    const email = mailIdx >= 0 ? (cells[mailIdx] ?? "").trim() : "";
    const instagram = igIdx >= 0 ? (cells[igIdx] ?? "").trim().replace(/^@/, "") : "";
    const emprendimiento = empIdx >= 0 ? (cells[empIdx] ?? "").trim() : "";

    if (!email && !instagram && !emprendimiento) continue;

    const campos: Record<string, string> = {};
    headerCells.forEach((h, i) => {
      if (i === mailIdx || i === igIdx || i === empIdx || !h) return;
      const val = (cells[i] ?? "").trim();
      if (!val) return;
      let key = h;
      let n = 2;
      while (key in campos) key = `${h} ${n++}`;
      campos[key] = val;
    });

    filas.push({ email, instagram, emprendimiento, campos });
  }

  return filas;
}

/** Arma el texto del cuerpo del mail de reporte mensual a partir de los campos parseados. */
export function reporteEmailBody(nombre: string, campos: Record<string, string>): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `Hola ${primerNombre},` : "Hola,";
  const detalle = Object.entries(campos)
    .map(([k, v]) => `${k.trim()}: ${v}`)
    .join("\n");
  return `${saludo}\n\nTe compartimos el reporte de tu emprendimiento en Club de Emprendedores:\n\n${detalle}\n\nCualquier consulta, escribinos.\n\n¡Gracias!`;
}
