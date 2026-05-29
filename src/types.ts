export const STAGES = [
  "nuevo",
  "contactado",
  "propuesta",
  "ganado",
  "perdido",
] as const;

export type Stage = (typeof STAGES)[number];

export type PropuestaOption = "sanfer" | "santelmo" | "palermo";
export type SedeOption = "sanfer" | "santelmo";

export type Lead = {
  id: string;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  instagram: string;
  notas: string;
  valorEstimado: number;
  etapa: Stage;
  creadoEn: string;
  contactadoEn?: string;
  propuesta?: PropuestaOption;
  sede?: SedeOption;
  contactId?: string;
};

export type Contact = {
  id: string;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  instagram: string;
  notas: string;
  creadoEn: string;
};

export type ViewMode = "kanban" | "lista" | "contactos";

export const STAGE_LABELS: Record<Stage, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  propuesta: "Propuesta",
  ganado: "Miembro",
  perdido: "Perdido",
};

export const STAGE_COLORS: Record<Stage, string> = {
  nuevo: "#FFB300",
  contactado: "#FFC933",
  propuesta: "#E6A800",
  ganado: "#FFE566",
  perdido: "#b45309",
};

export const PROPUESTA_LABELS: Record<PropuestaOption, string> = {
  sanfer: "San Fernando",
  santelmo: "San Telmo",
  palermo: "Palermo (Aigavaiga)",
};

export const SEDE_LABELS: Record<SedeOption, string> = {
  sanfer: "San Fernando",
  santelmo: "San Telmo",
};
