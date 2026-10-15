-- 15/10/2026 — Cierre de acceso público a la base del CRM.
-- Antes: cada tabla tenía una política "ALL -> public" con acceso total, así
-- que la clave anon (que viaja en el bundle del CRM) permitía leer, editar y
-- borrar leads, tareas, contenido y mensajes de WhatsApp desde cualquier lado.
-- Ahora: solo usuarios logueados con un mail de la lista, y los procesos de
-- servidor con service_role (wsp-bot, cde-publicador), que saltean RLS.

begin;

create or replace function public.es_admin_crm() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'escandarani.1981@gmail.com',
    'miembros.cde@gmail.com'
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['contacts','contenido_calendario','leads','tasks','wsp_conversaciones','wsp_mensajes'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Borra todas las políticas viejas de la tabla (eran de acceso total).
    execute (
      select coalesce(string_agg(format('drop policy %I on public.%I;', policyname, t), ' '), '')
      from pg_policies where schemaname = 'public' and tablename = t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format(
      'create policy admin_crm_todo on public.%I for all to authenticated using (public.es_admin_crm()) with check (public.es_admin_crm())',
      t
    );
  end loop;
end $$;

-- Secuencias de ids autoincrementales: solo usuarios logueados y servidor.
revoke all on all sequences in schema public from anon;
grant usage, select on all sequences in schema public to authenticated, service_role;

commit;
