import { useState } from 'react';
import { PROJS, INITIAL_PEND_REQS, INITIAL_HIST_REQS } from './data/projects';
import { KpiPage } from './components/pages/KpiPage';
import { ProyectosPage } from './components/pages/ProyectosPage';
import { AprobacionesPage } from './components/pages/AprobacionesPage';
import { DetailView } from './components/detail/DetailView';

export default function App() {
  const [page, setPage] = useState('kpi');
  const [currentProj, setCurrentProj] = useState(null);
  const [pendReqs, setPendReqs] = useState(INITIAL_PEND_REQS);
  const [histReqs, setHistReqs] = useState(INITIAL_HIST_REQS);

  const pendCount = pendReqs.length;

  function openDetail(id) {
    const proj = PROJS.find(p => p.id === id);
    if (proj) { setCurrentProj(proj); setPage('detail'); }
  }

  function closeDetail() {
    setCurrentProj(null);
    setPage('proyectos');
  }

  function resolve(id, decision) {
    const req = pendReqs.find(r => r.id === id);
    if (!req) return;
    setHistReqs(prev => [{ ...req, estado: decision, res: 'Eugenia Leone', fechaRes: '28/04/2026' }, ...prev]);
    setPendReqs(prev => prev.filter(r => r.id !== id));
  }

  function submitCR({ campo, actual, prop, just, proy }) {
    setPendReqs(prev => [...prev, {
      id: Date.now(), proy, campo, actual, prop: prop, just,
      sol: 'Usuario actual', fecha: '28/04/2026', estado: 'pendiente',
    }]);
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">QM<span>projects</span></div>
        <nav className="nav">
          <button className={`nb ${page === 'kpi' ? 'on' : ''}`} onClick={() => setPage('kpi')}>KPIs</button>
          <button className={`nb ${page === 'proyectos' || page === 'detail' ? 'on' : ''}`} onClick={() => { setCurrentProj(null); setPage('proyectos'); }}>Proyectos</button>
          <button className={`nb ${page === 'aprobaciones' ? 'on' : ''}`} onClick={() => setPage('aprobaciones')}>
            Aprobaciones{pendCount > 0 && <span className="ndot"></span>}
          </button>
        </nav>
        <div className="usr">Eugenia Leone<span className="badm">Admin</span></div>
      </div>

      <div className="main">
        {page === 'kpi' && <KpiPage />}
        {page === 'proyectos' && <ProyectosPage onOpenDetail={openDetail} />}
        {page === 'aprobaciones' && <AprobacionesPage pendReqs={pendReqs} histReqs={histReqs} onResolve={resolve} />}
        {page === 'detail' && <DetailView project={currentProj} onBack={closeDetail} onSubmitCR={submitCR} />}
      </div>
    </div>
  );
}
