export const STAGES = [
  "nuevo",
  "contactado",
  "ganado",
  "exmiembro",
  "perdido",
] as const;

export type Stage = (typeof STAGES)[number];

export type PropuestaOption = "sanfer" | "santelmo" | "ambas";
export type SedeOption = "sanfer" | "santelmo";

export type HistorialEntry = {
  fecha: string;
  nota: string;
};

export type Lead = {
  id: string;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  instagram: string;
  notas: string;
  etapa: Stage;
  creadoEn: string;
  contactadoEn?: string;
  propuesta?: PropuestaOption;
  sede?: SedeOption;
  contactId?: string;
  motivoBaja: string;
  noRecontactar: boolean;
  tags: string[];
  ultimoMensajeEn?: string;
  historial: HistorialEntry[];
  prioridad: boolean;
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

export type Task = {
  id: string;
  texto: string;
  hecha: boolean;
  creadoEn: string;
  leadId?: string;
};

export type EstadoFoto = "pendiente" | "recibida" | "aprobada";
export type EstadoCopy = "pendiente" | "borrador" | "aprobado";
export type ContenidoTipo = "post" | "historia" | "carrusel";
export type ContenidoSede = "sanfernando" | "santelmo";

export type ContenidoItem = {
  id: string;
  fecha: string;
  sede: ContenidoSede;
  etiqueta: string;
  tipo: ContenidoTipo;
  estadoFoto: EstadoFoto;
  estadoCopy: EstadoCopy;
  publicado: boolean;
  imageUrl?: string;
  caption?: string;
  notas?: string;
  creadoEn: string;
  actualizadoEn: string;
};

export type ViewMode = "kanban" | "lista" | "contactos" | "tareas" | "metricas" | "contenido" | "wspbot";

export type WspMensaje = {
  id: number;
  telefono: string;
  direccion: "entrante" | "saliente";
  texto: string;
  creadoEn: string;
};

export type WspConversacion = {
  telefono: string;
  step: number;
  origen: string;
  producto?: string;
  nombre?: string;
  instagram?: string;
  otrosShowrooms?: boolean;
  showroomsDetalle?: string;
  tieneTiendaPropia?: boolean;
  estadoVenta?: string;
  tieneStock?: boolean;
  localElegido?: string;
  leadListo: boolean;
  atendidoPorHumano: boolean;
  creadoEn: string;
  actualizadoEn: string;
};

export const STAGE_LABELS: Record<Stage, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  ganado: "Miembro",
  exmiembro: "Ex-miembro",
  perdido: "No Apto",
};

export const STAGE_COLORS: Record<Stage, string> = {
  nuevo: "#FFB300",
  contactado: "#FFC933",
  ganado: "#FFE566",
  exmiembro: "#8b95a5",
  perdido: "#b45309",
};

export const PROPUESTA_LABELS: Record<PropuestaOption, string> = {
  sanfer: "San Fernando",
  santelmo: "San Telmo",
  ambas: "Ambas sedes",
};

export const SEDE_LABELS: Record<SedeOption, string> = {
  sanfer: "San Fernando",
  santelmo: "San Telmo",
};

export const CONTENIDO_SEDE_LABELS: Record<ContenidoSede, string> = {
  sanfernando: "San Fernando",
  santelmo: "San Telmo",
};

export const CONTENIDO_TIPO_LABELS: Record<ContenidoTipo, string> = {
  post: "Post",
  historia: "Historia",
  carrusel: "Carrusel",
};

export const ESTADO_FOTO_LABELS: Record<EstadoFoto, string> = {
  pendiente: "Falta foto",
  recibida: "Foto recibida",
  aprobada: "Foto aprobada",
};

export const ESTADO_FOTO_COLORS: Record<EstadoFoto, string> = {
  pendiente: "#b45309",
  recibida: "#FFC933",
  aprobada: "#2fbf5f",
};

export const ESTADO_COPY_LABELS: Record<EstadoCopy, string> = {
  pendiente: "Falta copy",
  borrador: "Copy en borrador",
  aprobado: "Copy aprobado",
};

export const ESTADO_COPY_COLORS: Record<EstadoCopy, string> = {
  pendiente: "#b45309",
  borrador: "#FFC933",
  aprobado: "#2fbf5f",
};
