# Mi CRM

Prototipo simple de CRM con vista Kanban y listado. Los datos se guardan en `localStorage` (clave `mi-crm-leads`).

## Etapas

Nuevo → Contactado → Propuesta → Ganado / Perdido

## Uso

```bash
npm install
npm run dev
```

Abrí la URL que muestra Vite (por defecto `http://localhost:5173`).

## Funciones

- **Kanban**: arrastrar tarjetas entre columnas
- **Listado**: tabla con cambio de etapa por selector
- **Leads**: crear, editar y eliminar desde el modal
- **Persistencia**: automática en el navegador
