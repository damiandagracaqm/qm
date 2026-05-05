import { useState, useEffect } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { loginRequest } from './auth/msalConfig';
import { fetchProjects } from './services/graphService';
import { PROJS, INITIAL_PEND_REQS, INITIAL_HIST_REQS } from './data/projects';
import { KpiPage } from './components/pages/KpiPage';
import { ProyectosPage } from './components/pages/ProyectosPage';
import { AprobacionesPage } from './components/pages/AprobacionesPage';
import { DetailView } from './components/detail/DetailView';
import { ExcelImport } from './components/common/ExcelImport';

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
};

const PAGE_LABELS = {
  kpi:         { eyebrow: 'PANEL · GESTIÓN', title: 'Resumen operativo' },
  proyectos:   { eyebrow: 'CARTERA', title: 'Proyectos en planta' },
  aprobaciones:{ eyebrow: 'WORKFLOW', title: 'Aprobaciones · Change Requests' },
  detail:      { eyebrow: 'PROYECTO', title: '' },
};

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [page, setPage] = useState('kpi');
  const [currentProj, setCurrentProj] = useState(null);
  const [pendReqs, setPendReqs] = useState(INITIAL_PEND_REQS);
  const [histReqs, setHistReqs] = useState(INITIAL_HIST_REQS);
  const [projects, setProjects] = useState(PROJS);
  const [xlsxSource, setXlsxSource] = useState('demo');
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [xlsxError, setXlsxError] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const userName = accounts[0]?.name ?? accounts[0]?.username ?? null;
  const userInitials = userName ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';
  const pendCount = pendReqs.length;

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingXlsx(true);
    setXlsxError(null);
    fetchProjects()
      .then(({ projects: fetched, sheetNames }) => {
        console.log('Hojas encontradas:', sheetNames);
        if (fetched.length > 0) { setProjects(fetched); setXlsxSource('graph'); }
      })
      .catch(err => {
        console.error('Error cargando planilla:', err);
        setXlsxError(err.message);
      })
      .finally(() => setLoadingXlsx(false));
  }, [isAuthenticated]);

  function handleExcelImport(imported, sheetNames) {
    if (imported.length > 0) {
      setProjects(imported);
      setXlsxSource('excel');
      setShowImport(false);
      console.log('Hojas disponibles:', sheetNames);
    } else {
      alert('No se encontraron proyectos en la planilla. Revisá que la primera fila tenga encabezados.');
    }
  }

  function login() { instance.loginPopup(loginRequest).catch(console.error); }
  function logout() { instance.logoutPopup(); }

  function openDetail(id) {
    const proj = projects.find(p => p.id === id);
    if (proj) { setCurrentProj(proj); setPage('detail'); }
  }

  function closeDetail() {
    setCurrentProj(null);
    setPage('proyectos');
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
    if (xlsxSource === 'graph') return { dot: 'var(--ok)', label: 'SharePoint sincronizado' };
    if (xlsxSource === 'excel') return { dot: 'var(--warn)', label: 'Excel importado' };
    return { dot: 'oklch(0.5 0.01 250)', label: 'Datos demo' };
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
          <button
            onClick={() => setShowImport(true)}
            style={{
              marginTop: 6, background: 'none', border: 'none', padding: 0,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: xlsxSource === 'demo' ? 'var(--warn)' : 'oklch(0.55 0.01 250)',
              cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            {xlsxSource === 'demo' ? 'Importar Excel' : 'Reimportar Excel'}
          </button>
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
            {xlsxSource !== 'demo' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)} style={{ alignSelf: 'center' }}>
                Cancelar
              </button>
            )}
          </div>
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
                  <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => alert('PDF en producción.')}>
                    <NavIcon.download /> Reporte PDF
                  </button>
                )}
              </div>
            </div>

            {page === 'kpi' && <KpiPage projects={projects} onOpenDetail={openDetail} />}
            {page === 'proyectos' && <ProyectosPage projects={projects} onOpenDetail={openDetail} />}
            {page === 'aprobaciones' && <AprobacionesPage pendReqs={pendReqs} histReqs={histReqs} onResolve={resolve} />}
            {page === 'detail' && <DetailView project={currentProj} onBack={closeDetail} onSubmitCR={submitCR} />}
          </>
        )}
      </main>
    </div>
  );
}
