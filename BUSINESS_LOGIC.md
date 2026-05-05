# Business Logic — GestionQM

## Contexto
Dashboard interno de seguimiento de proyectos para **QM Equipment** (`qm-e.com`). Permite al equipo de gestión visualizar el estado de fabricación de equipos industriales (bombas de fractura, skids, piletas, etc.) en tiempo real.

## Fuente de datos
**Planilla maestra**: `Proyectos 2.0.xlsx` en SharePoint:
`https://qmequipment123.sharepoint.com/sites/Produccin/Documentos compartidos/Proyectos/Proyectos 2.0.xlsx`

La planilla tiene acceso restringido a ciertos usuarios de la organización. El CSV de referencia está en la raíz del proyecto como `Proyectos 2.csv`.

### Columnas clave del Excel
| Columna | Descripción |
|---|---|
| N°de serie | ID del proyecto (ej: QM-3149, ODS-1057) |
| Proyecto | Descripción del equipo |
| Cliente | Empresa cliente |
| LDP | Líder de proyecto |
| Estado | Estado actual (ver tabla de estados) |
| Próximo estadío | Etapa siguiente en la línea de producción |
| Fecha de fin estimada | Fecha fin planificada original |
| Fecha de entrega estimada | Fecha fin estimada actual |
| Fecha KOM | Kick-off meeting, inicio del proyecto |
| KPI 2: Retraso vs Programación Inicial (días) | Desvío en días respecto al plan original |
| Cotizado Met/Inox/GyP/Mont/Mont E/Total | HH cotizadas por área |
| Reales Met/Inox/GyP/Montaje/Montaje E/Total | HH reales consumidas por área |

## Estados de proyectos
Los estados representan la etapa de producción actual o el estado general del proyecto.

| Estado | Categoría | Color en app |
|---|---|---|
| Ingeniería | En producción | Azul |
| Corte y Plegado | En producción | Azul |
| Metalurgia | En producción | Azul |
| Metalurgia Tigre | En producción (planta Tigre) | Azul |
| Inoxidable | En producción | Azul |
| Pintura | En producción | Azul |
| Montaje | En producción | Azul |
| Próximo a terminar | Cierre inminente | Amarillo |
| Próximo a entregar | Cierre inminente | Amarillo |
| Entregado | Finalizado | Verde |
| Entregado a NQN | Finalizado (sede Neuquén) | Verde |
| Sin empezar | Sin actividad | Gris |
| Stand by | Pausado | Gris |
| Cancelado | Cancelado | Rojo |

**Estados activos** (para KPIs y filtros): todos excepto Entregado, Entregado a NQN y Cancelado.

## Áreas de producción (HH)
8 áreas con su clave interna, label y color en gráficos:

| Key | Label | Color |
|---|---|---|
| `ing` | Ingeniería | Violeta |
| `cyp` | Corte y plegado | Celeste |
| `metneg` | Met. negro | Amarillo |
| `metinox` | Met. inox | Naranja oscuro |
| `gyp` | Granalla/pintura | Verde |
| `mongral` | Montaje gral | Azul |
| `monelec` | Montaje elec | Índigo |
| `testeo` | Testeo | Rosa |

## KPIs
- **Proyectos activos**: count de estados activos
- **En tiempo**: activos con desvío = 0
- **Con desvío**: desvío entre 1 y 30 días
- **Críticos**: desvío > 30 días
- **Entregados**: estados Entregado + Entregado a NQN

## Flujo de aprobaciones (Change Requests)
Los LDPs pueden proponer cambios a datos de un proyecto (fecha, estadío, porcentaje de avance, etc.). El flujo es:
1. LDP completa el formulario CR en el detalle del proyecto → queda en cola `pendReqs`
2. Un admin (rol "Admin" en la topbar) aprueba o rechaza desde la sección Aprobaciones
3. Al resolver, la solicitud pasa a `histReqs` con el nombre del resolutor y fecha

**Nota**: actualmente el estado Admin/usuario está hardcodeado. La integración real usará el nombre del usuario autenticado vía MSAL (`accounts[0].name`).

## Tipos de proyecto
La planilla incluye proyectos con prefijos:
- `QM-XXXX` — proyectos de fabricación principales
- `ODS-XXXX` — órdenes de servicio / trabajos menores

## Plantas / Sedes
- **Tigre**: planta principal de fabricación (referenciada en "Metalurgia Tigre")
- **NQN (Neuquén)**: sede de campo donde se entregan algunos equipos ("Entregado a NQN")
