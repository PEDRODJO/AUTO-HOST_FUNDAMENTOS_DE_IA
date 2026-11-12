const items = [
  ['roles-create', 'Crear Rol', '＋'], ['roles-manage', 'Administrar Roles', '◇'],
  ['clients-create', 'Crear Cliente', '＋'], ['clients-manage', 'Administrar Clientes', '▤'],
  ['workshops-create', 'Registrar Taller', '＋'], ['workshops-manage', 'Administrar Talleres', '▦'],
  ['vehicles-create', 'Registrar Vehículo', '＋'], ['vehicles-manage', 'Administrar Vehículos', '▣']
];

export default function Sidebar({ user, route, onLogout, onNavigate }) {
  const roles = user?.roles || [];
  const canUseVehicles = roles.some(role => ['admin', 'administrador', 'recepcionista'].includes(role));
  const visibleItems = items.filter(([id]) => !id.startsWith('vehicles-') || canUseVehicles);
  return <aside className="sidebar">
    <a className="side-brand" href="#home" onClick={event => { event.preventDefault(); onNavigate('home'); }}><span className="brand-icon">A</span><span>AUTO-HOST<span className="brand-light"> / GESTIÓN</span></span></a>
    <div className="workspace-label">ESPACIO DE TRABAJO</div>
    <nav className="side-nav">
      <a className={`nav-item${route === 'home' ? ' active' : ''}`} href="#home" onClick={event => { event.preventDefault(); onNavigate('home'); }}><span className="nav-icon">⌂</span><span>Inicio</span></a>
      {visibleItems.map(([id, label, icon]) => <a key={id} className={`nav-item${route === id ? ' active' : ''}`} href={`#${id}`} onClick={event => { event.preventDefault(); onNavigate(id); }}><span className="nav-icon">{icon}</span><span>{label}</span></a>)}
    </nav>
    <div className="sidebar-bottom"><div className="avatar">{String(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</div><div className="user-meta"><strong>{user?.name || user?.email}</strong><span>{roles.join(', ') || 'Usuario'}</span></div><button className="logout-btn" onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión">↗</button></div>
  </aside>;
}
