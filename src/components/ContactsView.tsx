import { useState } from "react";
import type { Contact } from "../types";
import { normalizeSearch } from "../utils/text";
import { InstagramLink } from "./InstagramLink";

type Props = {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  onEdit: (contact: Contact) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ContactsView({ contacts, loading, error, onEdit }: Props) {
  const [search, setSearch] = useState("");

  if (loading) {
    return <div className="app-loading">Cargando contactos…</div>;
  }

  if (error) {
    const needsMigration =
      error.toLowerCase().includes("does not exist") ||
      error.toLowerCase().includes("no existe");
    return (
      <div className="contacts-migration">
        <div className="contacts-migration-box">
          <h3>Tabla de contactos no encontrada</h3>
          <p>Para activar esta función, corré el siguiente SQL en tu proyecto de Supabase:</p>
          <pre className="contacts-migration-sql">{`-- En Supabase → SQL Editor:
CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL DEFAULT '',
  empresa     TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  telefono    TEXT NOT NULL DEFAULT '',
  instagram   TEXT NOT NULL DEFAULT '',
  notas       TEXT NOT NULL DEFAULT '',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_all" ON contacts
  FOR ALL USING (true) WITH CHECK (true);`}</pre>
          {!needsMigration && (
            <p className="contacts-migration-error">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = normalizeSearch(search.trim());
    return (
      normalizeSearch(c.nombre).includes(q) ||
      normalizeSearch(c.empresa).includes(q) ||
      normalizeSearch(c.email).includes(q) ||
      normalizeSearch(c.telefono).includes(q) ||
      normalizeSearch(c.instagram).includes(q)
    );
  });

  if (contacts.length === 0) {
    return (
      <div className="list-empty">
        <p>No hay contactos todavía.</p>
        <p className="list-empty-hint">Creá uno con el botón «Nuevo contacto».</p>
      </div>
    );
  }

  return (
    <div className="list-wrap">
      <div className="contacts-toolbar">
        <input
          className="contacts-search"
          type="search"
          placeholder="Buscar por nombre, empresa, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="contacts-count">
          {filtered.length !== contacts.length
            ? `${filtered.length} de ${contacts.length}`
            : `${contacts.length} contacto${contacts.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <table className="list-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Empresa</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Instagram</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.id} onClick={() => onEdit(c)}>
              <td className="list-name">{c.nombre}</td>
              <td>{c.empresa || "—"}</td>
              <td>
                {c.email ? (
                  <span
                    className="contact-email-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `mailto:${c.email}`;
                    }}
                  >
                    {c.email}
                  </span>
                ) : "—"}
              </td>
              <td>{c.telefono || "—"}</td>
              <td onClick={(e) => e.stopPropagation()}>
                {c.instagram ? <InstagramLink username={c.instagram} /> : "—"}
              </td>
              <td className="list-date">{formatDate(c.creadoEn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
