import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

export default function DashboardHome({ session, notify }) {
  const [counts, setCounts] = useState({ clients: '—', roles: '—' });
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest('/clients?page=1&pageSize=1', { token: session.token }), apiRequest('/roles', { token: session.token })])
      .then(([clients, roles]) => { if (active) setCounts({ clients: clients.total, roles: roles.filter(role => role.IsActive).length }); })
      .catch(error => notify(error.message, true));
    return () => { active = false; };
  }, [session.token, notify]);
  return <><div className="page-kicker">VISTA GENERAL</div><h1 className="page-title">Buen día, {(session.user.name || '').split(' ')[0]}</h1><p className="page-subtitle">Este es el resumen de tu espacio de trabajo.</p>
    <div className="stat-grid"><article className="stat-card"><div className="stat-label">Clientes registrados</div><div className="stat-value">{counts.clients}</div><div className="stat-foot">Registros activos</div></article><article className="stat-card"><div className="stat-label">Roles del sistema</div><div className="stat-value">{counts.roles}</div><div className="stat-foot">Perfiles configurados</div></article><article className="stat-card"><div className="stat-label">Estado del sistema</div><div className="stat-value" style={{ fontSize: 19 }}>Operativo</div><div className="stat-foot">Conexión autenticada</div></article></div>
    <section className="panel"><div className="panel-heading"><div><h2>Tu espacio de trabajo</h2><p>Accesos habilitados según tu perfil.</p></div><span className="subtle-tag">{session.user.roles?.join(', ') || 'Usuario'}</span></div><div className="table-wrap"><table className="table"><thead><tr><th>MÓDULO</th><th>DESCRIPCIÓN</th><th>ESTADO</th></tr></thead><tbody><tr><td className="client-name">Roles</td><td>Configura y administra perfiles de acceso.</td><td>Disponible</td></tr><tr><td className="client-name">Clientes</td><td>Administra el directorio y vehículos asignados.</td><td>Disponible</td></tr><tr><td className="client-name">Talleres y vehículos</td><td>Consulta la red y administra la flota.</td><td>Disponible</td></tr></tbody></table></div></section>
  </>;
}
