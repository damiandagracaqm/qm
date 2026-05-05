# Architecture — GestionQM

## Stack
- **React 18 + Vite** — SPA sin backend
- **@azure/msal-browser + @azure/msal-react** — autenticación Microsoft (pendiente de admin consent)
- **xlsx (SheetJS)** — lectura de Excel local en el browser
- **CSS custom properties** — theming light/dark sin librería de UI

## Estructura de archivos

```
src/
  auth/
    msalConfig.js         — configuración MSAL (clientId, tenantId, scopes)
  services/
    graphService.js       — llamadas a Microsoft Graph para leer el Excel de SharePoint
  data/
    areas.js              — constantes AREAS (8 áreas de producción con key/label/color) y ESTADIOS
    projects.js           — datos de demo: PROJS, INITIAL_PEND_REQS, INITIAL_HIST_REQS
  components/
    common/
      StatusTag.jsx       — StatusTag (badge de estado con color) y DesvioTag (badge de desvío en días)
      AreaBars.jsx        — barras HH planificado vs consumido por área
      ExcelImport.jsx     — drag & drop / file picker para importar .xlsx localmente con SheetJS
    pages/
      KpiPage.jsx         — dashboard KPIs: cards resumen, HH por área, proyectos por estadío, causas replan, clientes
      ProyectosPage.jsx   — lista de proyectos agrupada por cliente, con filtros de estado/LDP/búsqueda
      AprobacionesPage.jsx — bandeja de solicitudes pendientes + historial de aprobaciones/rechazos
    detail/
      DetailView.jsx      — overlay de detalle: datos generales, budget, Gantt, HH, replans, form CR
      GanttChart.jsx      — Gantt semanal con línea de hoy
  App.jsx                 — router (useState: kpi | proyectos | aprobaciones | detail), estado global de proyectos y aprobaciones
  index.css               — todos los estilos, variables CSS, dark mode via @media
  main.jsx                — entry point, MsalProvider wrapping
```

## Routing
Sin React Router. `App.jsx` usa `useState` con valores `'kpi' | 'proyectos' | 'aprobaciones' | 'detail'`.

## Estado global
Todo en `App.jsx` con `useState`:
- `projects` — lista activa de proyectos (demo o importados desde Excel)
- `pendReqs` / `histReqs` — solicitudes de aprobación
- `currentProj` — proyecto abierto en detalle
- `xlsxSource` — `'demo' | 'excel' | 'graph'` indica el origen de los datos
- `showImport` — muestra/oculta el componente de importación

## Flujo de datos (con Excel importado)
```
Usuario sube .xlsx → ExcelImport → SheetJS parsea → mapRowsToProjects() → setProjects() → KpiPage / ProyectosPage
```

## Flujo de datos (con Graph API — requiere admin consent pendiente)
```
Login MSAL popup → token → fetchProjects() → /me/drive/search → driveItem → /workbook/worksheets → mapRowsToProjects()
```

## Autenticación Microsoft
- App registrada en Azure: `qm-xlsx-access` (tenant: `qm-e.com`)
- Client ID: `de9491c1-9d14-4a48-a6cf-96d669e90450`
- Tenant ID: `327bb5ad-7fae-410e-b419-2cb772fe9489`
- Scope: `Files.Read.All` (delegated, no requiere admin)
- **Bloqueado**: el tenant `qm-e.com` tiene política de requerir admin consent para toda app nueva. Pendiente de resolución con el administrador de Microsoft 365.
- Redirect URI configurada: `http://localhost:5173`

## Dev
```bash
npm run dev   # http://localhost:5173
npm run build
```
Correr desde la raíz de `C:\Users\Usuario\GestionQM\`.
