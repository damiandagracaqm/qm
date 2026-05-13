import { useState, useEffect, useRef, useMemo } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { loginRequest } from './auth/msalConfig';
import { fetchProjects, fetchPlanning, fetchCapacidad, updateBudgetPct } from './services/graphService';
import { INITIAL_PEND_REQS, INITIAL_HIST_REQS } from './data/projects';
import { KpiPage } from './components/pages/KpiPage';
import { ProyectosPage } from './components/pages/ProyectosPage';
import { AprobacionesPage } from './components/pages/AprobacionesPage';
import { NuevoProyectoPage } from './components/pages/NuevoProyectoPage';
import { DetailView } from './components/detail/DetailView';
import { ExcelImport, PlanningImport, downloadWorkbook, updateWorkbookBudgetPct } from './components/common/ExcelImport';

function Skel({ w, h = 12, block = false }) {
  return (
    <span style={{
      display: block ? 'block' : 'inline-block',
      width: w ?? '100%', height: h, borderRadius: 4,
      background: 'oklch(0.22 0.005 250)',
      animation: 'skeleton-pulse 1.4s ease-in-out infinite',
      flexShrink: 0,
    }} />
  );
}

function KpiSkeleton() {
  return (
    <div className="page-body">
      <div className="toolbar">
        <Skel w={130} h={28} /> <Skel w={130} h={28} />
      </div>
      <div className="kpi-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="kpi-cell" key={i}>
            <Skel w={72} h={10} />
            <Skel w={52} h={34} />
            <Skel w={90} h={10} />
          </div>
        ))}
      </div>
      <div className="grid-2">
        {[0, 1].map(i => (
          <div className="card" key={i}>
            <div className="card-h" style={{ gap: 6, flexDirection: 'column', alignItems: 'flex-start' }}>
              <Skel w={160} h={12} /> <Skel w={100} h={10} />
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 5 }).map((_, j) => <Skel key={j} h={20} block />)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        {[0, 1].map(i => (
          <div className="card" key={i}>
            <div className="card-h" style={{ gap: 6, flexDirection: 'column', alignItems: 'flex-start' }}>
              <Skel w={160} h={12} /> <Skel w={100} h={10} />
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, j) => <Skel key={j} h={20} block />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProyectosSkeleton() {
  return (
    <div className="page-body">
      <div className="toolbar" style={{ gap: 8 }}>
        <Skel w={220} h={28} />
        {Array.from({ length: 4 }).map((_, i) => <Skel key={i} w={72} h={28} />)}
      </div>
      <div className="client-group">
        <div className="client-h">
          <Skel w={140} h={13} />
          <Skel w={60} h={11} />
        </div>
        <div className="proj-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="pcard" key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skel w={60} h={13} /> <Skel w={90} h={10} />
                </div>
                <Skel w={72} h={22} />
              </div>
              <Skel h={6} block />
              <Skel w={110} h={10} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skel w={80} h={10} /> <Skel w={60} h={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const NavIcon = {
  dash: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  list: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  ),
  inbox: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  ),
  download: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
  ),
  plus: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
};

const PAGE_LABELS = {
  kpi:         { eyebrow: 'PANEL · GESTIÓN', title: 'Resumen operativo' },
  proyectos:   { eyebrow: 'CARTERA', title: 'Proyectos en planta' },
  aprobaciones:{ eyebrow: 'WORKFLOW', title: 'Aprobaciones · Change Requests' },
  nuevo:       { eyebrow: 'GESTIÓN', title: 'Nuevo proyecto' },
  detail:      { eyebrow: 'PROYECTO', title: '' },
};

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [page, setPage] = useState('kpi');
  const [currentProj, setCurrentProj] = useState(null);
  const [pendReqs, setPendReqs] = useState(INITIAL_PEND_REQS);
  const [histReqs, setHistReqs] = useState(INITIAL_HIST_REQS);
  const [projects, setProjects] = useState([]);
  const [xlsxSource, setXlsxSource] = useState('none');
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [xlsxError, setXlsxError] = useState(null);
  const [capacidadData, setCapacidadData] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showPlanningImport, setShowPlanningImport] = useState(false);
  const [planningMap, setPlanningMap] = useState(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const workbookRef = useRef(null);
  const [xlsxMeta, setXlsxMeta] = useState(null);   // { sheetName, budgetColIdx }
  const [hasPendingDownload, setHasPendingDownload] = useState(false);

  const userName = accounts[0]?.name ?? accounts[0]?.username ?? null;
  const userInitials = userName ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';
  const pendCount = pendReqs.length;

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingXlsx(true);
    setXlsxError(null);
    fetchCapacidad()
      .then(data => { if (data) setCapacidadData(data); })
      .catch(err => console.warn('[Capacidad] Error:', err.message));

    Promise.all([
      fetchProjects(),
      fetchPlanning().catch(err => {
        console.warn('Planificación no disponible desde SharePoint:', err.message);
        return new Map();
      }),
    ])
      .then(([{ projects: fetched, sheetNames, budgetColIdx }, planMap]) => {
        console.log('Hojas encontradas:', sheetNames);
        if (fetched.length > 0) {
          setProjects(fetched);
          setXlsxSource('graph');
          setXlsxMeta({ sheetName: sheetNames[0], budgetColIdx: budgetColIdx ?? -1 });
        }
        if (planMap.size > 0) {
          setPlanningMap(planMap);
        }
      })
      .catch(err => {
        console.error('Error cargando planilla:', err);
        setXlsxError(err.message);
      })
      .finally(() => setLoadingXlsx(false));
  }, [isAuthenticated, refreshKey]);

  const mergedProjects = useMemo(() => {
    if (planningMap.size === 0) return projects;
    const normId = id => id.replace(/[\s\-_.]/g, '').toUpperCase();
    const normMap = new Map();
    planningMap.forEach((val, key) => normMap.set(normId(key), val));
    return projects.map(p => ({
      ...p,
      gantt: planningMap.get(p.id) ?? normMap.get(normId(p.id)) ?? (p.gantt ?? []),
    }));
  }, [projects, planningMap]);

  function handlePlanningImport(map) {
    setPlanningMap(map);
    setShowPlanningImport(false);
  }

  function handleExcelImport(imported, sheetNames, meta) {
    if (imported.length > 0) {
      setProjects(imported);
      setXlsxSource('excel');
      setShowImport(false);
      setHasPendingDownload(false);
      if (meta) {
        workbookRef.current = meta.workbook;
        setXlsxMeta({ sheetName: meta.sheetName, budgetColIdx: meta.budgetColIdx });
      }
      console.log('Hojas disponibles:', sheetNames);
    } else {
      alert('No se encontraron proyectos en la planilla. Revisá que la primera fila tenga encabezados.');
    }
  }

  function login() { instance.loginRedirect(loginRequest).catch(console.error); }
  function logout() { instance.logoutRedirect(); }

  function openDetail(id) {
    const proj = mergedProjects.find(p => p.id === id);
    if (proj) { setCurrentProj(proj); setPage('detail'); }
  }

  function closeDetail() {
    setCurrentProj(null);
    setPage('proyectos');
  }

  function handleProjectCreated() {
    setRefreshKey(k => k + 1); // re-fetch desde SharePoint
    setPage('proyectos');
  }

  function handleUpdateProject(updated) {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setCurrentProj(updated);
  }

  function handleSaveBudgetPct(proj, pct) {
    // Actualiza la celda AQ en el workbook local y ofrece descarga
    if (xlsxSource === 'excel' && workbookRef.current && xlsxMeta?.budgetColIdx >= 0 && proj._rowIdx != null) {
      updateWorkbookBudgetPct(workbookRef.current, xlsxMeta.sheetName, proj._rowIdx, xlsxMeta.budgetColIdx, pct);
      setHasPendingDownload(true);
    }
    // Graph API: PATCH directo a la celda (requiere admin consent activo)
    if (xlsxSource === 'graph' && proj._rowIdx != null && xlsxMeta?.budgetColIdx >= 0) {
      updateBudgetPct(proj._rowIdx, xlsxMeta.budgetColIdx, pct).catch(console.error);
    }
  }

  function doDownloadExcel() {
    if (workbookRef.current) {
      downloadWorkbook(workbookRef.current);
      setHasPendingDownload(false);
    }
  }

  function resolve(id, decision) {
    const req = pendReqs.find(r => r.id === id);
    if (!req) return;
    setHistReqs(prev => [{ ...req, estado: decision, res: userName ?? 'Admin', fechaRes: new Date().toLocaleDateString('es-AR') }, ...prev]);
    setPendReqs(prev => prev.filter(r => r.id !== id));
  }

  function submitCR({ campo, actual, prop, just, proy }) {
    setPendReqs(prev => [...prev, {
      id: Date.now(), proy, campo, actual, prop, just,
      sol: userName ?? 'Usuario actual', fecha: new Date().toLocaleDateString('es-AR'), estado: 'pendiente',
    }]);
  }

  const pageLabel = PAGE_LABELS[page] ?? PAGE_LABELS.kpi;
  const pageTitle = page === 'detail' ? (currentProj?.id ?? '') : pageLabel.title;

  const dataSourceStatus = () => {
    if (xlsxSource === 'graph')  return { dot: 'var(--ok)',              label: 'SharePoint sincronizado' };
    if (xlsxSource === 'excel')  return { dot: 'var(--warn)',             label: 'Excel importado' };
    if (loadingXlsx)             return { dot: 'var(--warn)',             label: 'Cargando…' };
    return                              { dot: 'oklch(0.5 0.01 250)',     label: 'Sin datos' };
  };
  const src = dataSourceStatus();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">QM</div>
          <div className="brand-text">GestiónQM<small>Equipment · v2.6</small></div>
        </div>

        <div className="nav-section">Operación</div>
        <button
          className={`nav-item ${page === 'kpi' ? 'active' : ''}`}
          onClick={() => setPage('kpi')}
        >
          <NavIcon.dash /> Resumen
        </button>
        <button
          className={`nav-item ${page === 'proyectos' || page === 'detail' ? 'active' : ''}`}
          onClick={() => { setCurrentProj(null); setPage('proyectos'); }}
        >
          <NavIcon.list /> Proyectos
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'oklch(0.55 0.01 250)' }}>
            {projects.length}
          </span>
          {loadingXlsx && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', marginLeft: 4 }} />}
        </button>
        <button
          className={`nav-item ${page === 'aprobaciones' ? 'active' : ''}`}
          onClick={() => setPage('aprobaciones')}
        >
          <NavIcon.inbox /> Aprobaciones
          {pendCount > 0 && <span className="nav-badge">{pendCount}</span>}
        </button>
        <button
          className={`nav-item ${page === 'nuevo' ? 'active' : ''}`}
          onClick={() => setPage('nuevo')}
        >
          <NavIcon.plus /> Nuevo proyecto
        </button>

        <div className="nav-section">Fuentes</div>
        <div style={{ padding: '6px 10px', fontSize: 11, color: 'oklch(0.7 0.005 80)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: src.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'oklch(0.85 0.005 80)' }}>{src.label}</span>
          </div>
          {xlsxSource === 'graph' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'oklch(0.55 0.01 250)' }}>
              Proyectos 2.0.xlsx
            </div>
          )}
          {xlsxSource === 'graph' && (
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              disabled={loadingXlsx}
              style={{
                marginTop: 6, background: 'none', border: 'none', padding: 0,
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: loadingXlsx ? 'oklch(0.45 0.01 250)' : 'var(--accent)',
                cursor: loadingXlsx ? 'default' : 'pointer',
                textDecoration: 'underline', display: 'block',
              }}
            >
              {loadingXlsx ? 'Sincronizando…' : '↺ Sincronizar datos'}
            </button>
          )}
          <button
            onClick={() => { setShowImport(true); setShowPlanningImport(false); }}
            style={{
              marginTop: 6, background: 'none', border: 'none', padding: 0,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: xlsxSource === 'none' ? 'var(--warn)' : 'oklch(0.55 0.01 250)',
              cursor: 'pointer', textDecoration: 'underline', display: 'block',
            }}
          >
            {xlsxSource === 'none' ? 'Importar Excel' : 'Reimportar Excel'}
          </button>
          {xlsxSource === 'graph' && planningMap.size > 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'oklch(0.55 0.01 250)', marginTop: 4 }}>
              Planif. {planningMap.size} proy.
            </div>
          )}
          {xlsxSource !== 'graph' && (
            <button
              onClick={() => { setShowPlanningImport(true); setShowImport(false); }}
              style={{
                marginTop: 6, background: 'none', border: 'none', padding: 0,
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: planningMap.size > 0 ? 'oklch(0.55 0.01 250)' : 'var(--warn)',
                cursor: 'pointer', textDecoration: 'underline', display: 'block',
              }}
            >
              {planningMap.size > 0
                ? `↺ Reimportar planificación (${planningMap.size})`
                : 'Importar planificación'}
            </button>
          )}
          {hasPendingDownload && (
            <button
              onClick={doDownloadExcel}
              style={{
                marginTop: 6, background: 'none', border: 'none', padding: 0,
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--ok)', cursor: 'pointer', textDecoration: 'underline', display: 'block',
              }}
            >
              Descargar planilla actualizada
            </button>
          )}
        </div>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="user-avatar">{isAuthenticated ? userInitials : 'QM'}</div>
            <div>
              {isAuthenticated ? (
                <>
                  <div className="user-name">{userName ?? 'Usuario'}</div>
                  <div className="user-role" style={{ cursor: 'pointer' }} onClick={logout}>Cerrar sesión</div>
                </>
              ) : (
                <>
                  <div className="user-name" style={{ fontSize: 11 }}>Sin sesión</div>
                  <div className="user-role" style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={login}>
                    Iniciar sesión
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        {xlsxError && (
          <div style={{ background: 'var(--bad-soft)', borderBottom: '1px solid var(--bad)', padding: '8px 32px', fontSize: '0.8rem', color: 'var(--bad)' }}>
            Error cargando planilla: {xlsxError}
          </div>
        )}

        {showImport ? (
          <div style={{ maxWidth: 480, margin: '60px auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '0 24px' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink)' }}>Importar proyectos desde Excel</div>
            <ExcelImport onImport={handleExcelImport} />
            {xlsxSource !== 'none' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)} style={{ alignSelf: 'center' }}>
                Cancelar
              </button>
            )}
          </div>
        ) : showPlanningImport ? (
          <div style={{ maxWidth: 480, margin: '60px auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '0 24px' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink)' }}>Importar planificación por taller</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Importá el archivo <span style={{ fontFamily: 'var(--font-mono)' }}>CopiaPlanificacion_PruebaApp.xlsx</span>.
              Se leerá la hoja <span style={{ fontFamily: 'var(--font-mono)' }}>Planificacion mensual</span> con las columnas
              <span style={{ fontFamily: 'var(--font-mono)' }}> Comienzo</span> y <span style={{ fontFamily: 'var(--font-mono)' }}>Fin</span> por taller.
              Los proyectos sin planificación mostrarán el Gantt vacío.
            </div>
            <PlanningImport onImport={handlePlanningImport} />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPlanningImport(false)} style={{ alignSelf: 'center' }}>
              Cancelar
            </button>
          </div>
        ) : !isAuthenticated ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'oklch(0.55 0.01 250)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--ink)' }}>Iniciá sesión para ver los proyectos</div>
            <div style={{ fontSize: '0.8rem' }}>Conectate con tu cuenta Microsoft de QM Equipment</div>
            <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={login}>Iniciar sesión</button>
          </div>
        ) : loadingXlsx ? (
          <>
            <div className="page-header">
              <div>
                <div className="page-eyebrow">{pageLabel.eyebrow}</div>
                <h1 className="page-title">{pageTitle}</h1>
              </div>
            </div>
            {page === 'proyectos' ? <ProyectosSkeleton /> : <KpiSkeleton />}
          </>
        ) : (
          <>
            <div className="page-header">
              <div>
                <div className="page-eyebrow">{pageLabel.eyebrow}</div>
                <h1 className="page-title">{pageTitle}</h1>
              </div>
              <div className="page-meta">
                <span className="dot-live" />
                <span>Actualizado {new Date().toLocaleDateString('es-AR')}</span>
                {page !== 'detail' && (
                  <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => window.print()}>
                    <NavIcon.download /> Reporte PDF
                  </button>
                )}
              </div>
            </div>

            {page === 'kpi' && <KpiPage projects={mergedProjects} onOpenDetail={openDetail} capacidadData={capacidadData} />}
            {page === 'proyectos' && <ProyectosPage projects={mergedProjects} onOpenDetail={openDetail} />}
            {page === 'aprobaciones' && <AprobacionesPage pendReqs={pendReqs} histReqs={histReqs} onResolve={resolve} />}
            {page === 'nuevo' && <NuevoProyectoPage onCreated={handleProjectCreated} />}
            {page === 'detail' && <DetailView project={currentProj} onBack={closeDetail} onSubmitCR={submitCR} onUpdateProject={handleUpdateProject} onSaveBudgetPct={handleSaveBudgetPct} />}
          </>
        )}
      </main>
    </div>
  );
}
