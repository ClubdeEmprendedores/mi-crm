-- Migración: campo rubro en leads (sept 2026). Correr en el SQL Editor de Supabase.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS rubro TEXT;

-- Valores esperados (controlados desde el frontend, src/types.ts -> RUBROS):
--   indumentaria_femenina, indumentaria_masculina, indumentaria_infantil,
--   calzado, accesorios, deco_hogar, bazar_regalos, arte_manualidades,
--   belleza_cosmetica, alimentos, otro
