import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, clearSession, getSession, storeSession } from './api';
import AuthView from './components/AuthView';
import DashboardHome from './components/DashboardHome';
import Sidebar from './components/Sidebar';
import { Toast } from './components/Toast';
import RolesCreate from './pages/RolesCreate';
import RolesManage from './pages/RolesManage';
import ClientsCreate from './pages/ClientsCreate';
import ClientsManage from './pages/ClientsManage';
import WorkshopsCreate from './pages/WorkshopsCreate';
import WorkshopsManage from './pages/WorkshopsManage';
import VehiclesCreate from './pages/VehiclesCreate';
import VehiclesManage from './pages/VehiclesManage';

const routes = {
  home: ['Inicio', DashboardHome],
  'roles-create': ['Crear Rol', RolesCreate],
  'roles-manage': ['Administrar Roles', RolesManage],
  'clients-create': ['Crear Cliente', ClientsCreate],
  'clients-manage': ['Administrar Clientes', ClientsManage],
  'workshops-create': ['Registrar Taller', WorkshopsCreate],
  'workshops-manage': ['Administrar Talleres', WorkshopsManage],
  'vehicles-create': ['Registrar Vehículo', VehiclesCreate],
  'vehicles-manage': ['Administrar Vehículos', VehiclesManage]
};

export default function App() {
  const [session, setSession] = useState(getSession);
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || 'home');
  const [checking, setChecking] = useState(Boolean(getSession().token));
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, error = false) => setToast({ message, error }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const activeRoute = routes[route] ? route : 'home';
  const [pageTitle, Page] = routes[activeRoute];
  const pageProps = useMemo(() => ({ session, notify }), [session, notify]);

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash.slice(1) || 'home');
    const expire = () => { clearSession(); setSession({ token: null, user: null }); setRoute('home'); };
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('auth:expired', expire);
    return () => { window.removeEventListener('hashchange', updateRoute); window.removeEventListener('auth:expired', expire); };
  }, []);

  useEffect(() => {
    if (!session.token) { setChecking(false); return undefined; }
    let active = true;
    setChecking(true);
    apiRequest('/me', { token: session.token }).then(({ user }) => {
      if (!active) return;
      const next = { token: session.token, user };
      storeSession(next); setSession(next);
    }).catch(() => {
      if (!active) return;
      clearSession(); setSession({ token: null, user: null });
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  // Verify only when the token itself changes; later session updates are already verified.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  function login(result) {
    storeSession(result); setSession(result); setRoute('home'); window.location.hash = 'home';
  }
  function logout() {
    clearSession(); setSession({ token: null, user: null }); setRoute('home'); window.location.hash = '';
  }
  function navigate(nextRoute) { setRoute(nextRoute); window.location.hash = nextRoute; }

  if (checking) return <div className="empty-state auth-loading">Verificando sesión…</div>;
  if (!session.token || !session.user) return <><AuthView onLogin={login} tokenFromUrl={new URLSearchParams(window.location.search).get('token')} /><Toast toast={toast} onClose={closeToast} /></>;

  return <div className="app-shell">
    <Sidebar user={session.user} route={activeRoute} onLogout={logout} onNavigate={navigate} />
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>AUTO-HOST</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div><div className="topbar-right"><span className="live-status"><i /> SISTEMA ACTIVO</span><span className="topbar-date">{new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</span></div></header>
      <section className="view-area">{Page === DashboardHome ? <Page {...pageProps} /> : <Page key={activeRoute} {...pageProps} />}</section>
    </main>
    <Toast toast={toast} onClose={closeToast} />
  </div>;
}
