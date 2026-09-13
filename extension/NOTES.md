# Hallazgos de reconocimiento — extracción de teléfono en WhatsApp Web

Reconocimiento hecho con Playwright contra una sesión real de WhatsApp Web (Club de Emprendedores), 2026-09-08.

## Estrategias probadas

**A. `data-id` en mensajes** (`[data-id]` en el DOM) — **descartada**. En la versión actual de WhatsApp Web el `data-id` de cada mensaje es un ID opaco (ej. `AC105A0BFAA191993F61D1C8BF1519C1`), no tiene el formato clásico `<fromMe>_<chatJid>_<msgId>` que documentan guías viejas. No sirve para extraer el JID/teléfono.

**B. Fiber de React en el header** (`__reactFiber$...` walk buscando JIDs) — **descartada**. Devuelve el mismo set de valores sin importar qué chat está abierto (son props globales de sesión/cuenta propia, no del chat activo). Además, muchos contactos ahora usan un identificador opaco `@lid` (linked ID) en vez de `<telefono>@c.us` — Meta migró a este esquema por privacidad, así que ni siquiera walkeando bien el fiber se garantiza tener el número real ahí.

**C. Parsear el teléfono del texto visible del header** (`header.innerText`) — **funciona, es la estrategia primaria**. Cuando el contacto NO está guardado en la agenda (el caso típico de un lead nuevo escribiendo por primera vez), WhatsApp Web muestra el número en formato `+54 9 11 2717-4084` directo en el header. Confirmado con múltiples chats reales, cada uno con su número correcto y distinto.

**D. Contacto guardado con nombre** (sin número visible en el header) — **caso sin resolver todavía**. Cuando el chat es de un contacto guardado en la agenda (ej. "CdE Margy @cherie.arg"), el header muestra el nombre, no el teléfono, y no encontré aún un selector confiable para el panel de "Datos del contacto". Este caso queda como fallback a resolver durante la Fase 2 (implementación del panel real), con más tiempo de iteración en vivo. Mientras tanto, fallback aceptable: intentar matchear el lead por nombre (`headerText` limpio) contra `leads.nombre` como segunda pasada si no hay teléfono.

## Selector de cambio de chat

`div[id="main"] header` existe y se actualiza de forma confiable al cambiar de conversación — sirve como ancla para el `MutationObserver` que dispara la re-lectura del panel.

## Recomendación para Fase 2

Implementar extracción en dos pasos:
1. Regex sobre `header.innerText`: `/\+\d[\d\s-]{8,}/` → limpiar a solo dígitos → buscar lead por últimos 10 dígitos (mismo criterio que `push_historial_to_crm.mjs`).
2. Si no hay match (contacto guardado), fallback por nombre — y en paralelo, seguir iterando el selector del panel de "Datos del contacto" para cubrir el 100% de los casos.
