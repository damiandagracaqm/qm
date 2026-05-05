# CLAUDE.md — GestionQM

Leer siempre antes de trabajar en este proyecto:
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — stack, estructura de archivos, flujo de datos, auth Microsoft
- **[BUSINESS_LOGIC.md](BUSINESS_LOGIC.md)** — dominio, estados, áreas, KPIs, flujo de aprobaciones

## Proyecto
Dashboard React interno de QM Equipment para seguimiento de proyectos de fabricación.
Raíz: `C:\Users\Usuario\GestionQM\` | Dev: `npm run dev` → `http://localhost:5173`

## Reglas de trabajo
- Editar componentes en `src/components/`. No crear componentes nuevos salvo que sea imprescindible.
- Los datos demo están en `src/data/`. En producción se reemplazan por los datos del Excel.
- El estado global vive en `App.jsx`. No introducir librerías de estado (Zustand, Redux, etc.) sin pedido explícito.
- No agregar React Router — el routing es por `useState` en `App.jsx`.
- No agregar librerías de UI (MUI, Shadcn, etc.) — todo el styling es CSS en `src/index.css`.
- El CSV de referencia de la planilla real está en `Proyectos 2.csv` en la raíz.

## Estado actual de la integración Microsoft
La integración con SharePoint vía MSAL está implementada pero **bloqueada** por política del tenant `qm-e.com` que requiere admin consent para toda app nueva. Mientras tanto, los datos se cargan mediante importación manual de `.xlsx` con SheetJS (`ExcelImport.jsx`). Cuando se resuelva el admin consent, el flujo de `graphService.js` toma el control automáticamente al iniciar sesión.

## Usuario
Damián Dagraca (`damian.dagraca@qm-e.com`) — desarrolla y usa la app internamente.
