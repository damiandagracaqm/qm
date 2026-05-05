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

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [page, setPage] = useState('kpi');
  const [currentProj, setCurrentProj] = useState(null);
  const [pendReqs, setPendReqs] = useState(INITIAL_PEND_REQS);
  const [histReqs, setHistReqs] = useState(INITIAL_HIST_REQS);
  const [projects, setProjects] = useState(PROJS);
  const [xlsxSource, setXlsxSource] = useState('demo'); // 'demo' | 'excel' | 'graph'
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [xlsxError, setXlsxError] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const userName = accounts[0]?.name ?? accounts[0]?.username ?? null;
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

  function login() {
    instance.loginPopup(loginRequest).catch(console.error);
  }

  function logout() {
    instance.logoutPopup();
  }

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

  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">QM<span>projects</span></div>
        <nav className="nav">
          <button className={`nb ${page === 'kpi' ? 'on' : ''}`} onClick={() => setPage('kpi')}>KPIs</button>
          <button className={`nb ${page === 'proyectos' || page === 'detail' ? 'on' : ''}`} onClick={() => { setCurrentProj(null); setPage('proyectos'); }}>
            Proyectos
            {loadingXlsx && <span className="ndot" style={{ background: '#f59e0b' }}></span>}
          </button>
          <button className={`nb ${page === 'aprobaciones' ? 'on' : ''}`} onClick={() => setPage('aprobaciones')}>
            Aprobaciones{pendCount > 0 && <span className="ndot"></span>}
          </button>
        </nav>
        <div className="usr" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {xlsxSource === 'excel' && (
            <button className="nb" onClick={() => setShowImport(true)} style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              📂 Reimportar Excel
            </button>
          )}
          {xlsxSource === 'demo' && (
            <button className="nb" onClick={() => setShowImport(true)} style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
              📂 Importar Excel
            </button>
          )}
          {isAuthenticated ? (
            <>
              {userName && <span>{userName}</span>}
              <button className="nb" onClick={logout} style={{ fontSize: '0.75rem', opacity: 0.7 }}>Salir</button>
            </>
          ) : (
            <button className="nb" onClick={login} style={{ fontWeight: 600 }}>
              Iniciar sesión Microsoft
            </button>
          )}
        </div>
      </div>

      {xlsxError && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fca5a5', padding: '8px 24px', fontSize: '0.8rem', color: '#dc2626' }}>
          Error cargando planilla: {xlsxError}
        </div>
      )}

      <div className="main">
        {showImport ? (
          <div style={{ maxWidth: 480, margin: '60px auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>Importar proyectos desde Excel</div>
            <ExcelImport onImport={handleExcelImport} />
            {xlsxSource !== 'demo' && (
              <button className="nb" onClick={() => setShowImport(false)} style={{ alignSelf: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
                Cancelar
              </button>
            )}
          </div>
        ) : (
          <>
            {page === 'kpi' && <KpiPage projects={projects} />}
            {page === 'proyectos' && <ProyectosPage projects={projects} onOpenDetail={openDetail} />}
            {page === 'aprobaciones' && <AprobacionesPage pendReqs={pendReqs} histReqs={histReqs} onResolve={resolve} />}
            {page === 'detail' && <DetailView project={currentProj} onBack={closeDetail} onSubmitCR={submitCR} />}
          </>
        )}
      </div>
    </div>
  );
}
