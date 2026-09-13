-- Migración para las mejoras de CRM (sept 2026): baja estructurada, log de recontactos.
-- Correr en el SQL Editor de Supabase.

alter table leads add column if not exists fecha_baja date;
alter table leads add column if not exists motivo_baja_tipo text;
alter table leads add column if not exists recontactos_enviados jsonb not null default '[]'::jsonb;

-- Nota: la etapa "proveedor" y la sede "ambas" son solo valores de texto nuevos en columnas
-- ya existentes (etapa, sede) — no requieren ALTER TABLE si esas columnas no tienen un
-- CHECK constraint. Si al guardar un lead con etapa "proveedor" o sede "ambas" da un error
-- de constraint, correr también:
--   alter table leads drop constraint if exists leads_etapa_check;
--   alter table leads drop constraint if exists leads_sede_check;
