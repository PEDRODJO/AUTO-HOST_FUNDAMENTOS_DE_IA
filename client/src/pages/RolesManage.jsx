import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import AccessDenied from '../components/AccessDenied';

const PAGE_SIZE = 10;
export default function RolesManage({ session, notify }) {
  const [roles, setRoles] = useState([]), [page, setPage] = useState(1), [error, setError] = useState(''), [editing, setEditing] = useState(null), [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const load = useCallback(async () => {
    try { setError(''); setRoles(await apiRequest('/roles', { token: session.token })); }
    catch (err) { setError(err.message); }
  }, [session.token]);
  useEffect(() => { load(); }, [load]);
  if (!session.user.roles?.includes('administrador')) return <AccessDenied message="Se requiere el rol administrador para administrar roles." />;
  const activeCount = roles.filter(role => Boolean(role.IsActive)).length;
  const pageCount = Math.max(1, Math.ceil(roles.length / PAGE_SIZE));
  const visible = roles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function edit(role) { setEditing({ RoleId: role.RoleId, name: role.RoleName, description: role.Description || '' }); dialog.current?.showModal(); }
  async function save(event) {
    event.preventDefault(); setBusy(true);
    try { await apiRequest(`/roles/${encodeURIComponent(editing.RoleId)}`, { method: 'PUT', body: { name: editing.name.trim(), description: editing.description.trim() }, token: session.token }); dialog.current?.close(); notify('Rol actualizado correctamente.'); await load(); }
    catch (err) { notify(err.message, true); }
    finally { setBusy(false); }
  }
  async function suspend(id) {
    if (!window.confirm('¿Suspender este rol? Se conservará en la base de datos.')) return;
    try { await apiRequest(`/roles/${encodeURIComponent(id)}`, { method: 'DELETE', token: session.token }); notify('Rol suspendido correctamente.'); await load(); }
    catch (err) { notify(err.message, true); }
  }
  return <><div className="page-kicker">CONFIGURACIÓN</div><h1 className="page-title">Administrar roles</h1><p className="page-subtitle">Consulta, actualiza o suspende los perfiles de acceso.</p>
    <section className="panel roles-table-panel"><div className="panel-heading"><div><h2>Roles del sistema</h2><p>{error || `${activeCount} roles activos · ${roles.length - activeCount} suspendidos.`}</p></div><span className="subtle-tag">ESTADO DEL PERFIL</span></div><div className="table-wrap">{error ? <div className="empty-state">{error}</div> : visible.length ? <table className="table roles-table"><thead><tr><th>ROL</th><th>DESCRIPCIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{visible.map(role => <tr key={role.RoleId}><td className="client-name">{role.RoleName}</td><td>{role.Description || '—'}</td><td><span className={`role-status ${role.IsActive ? 'active' : 'suspended'}`}><i />{role.IsActive ? 'Activo' : 'Suspendido'}</span></td><td><div className="role-actions"><button className="role-action" disabled={!role.IsActive} onClick={() => edit(role)}>Editar</button><button className="role-action suspend" disabled={!role.IsActive} onClick={() => suspend(role.RoleId)}>Suspender</button></div></td></tr>)}</tbody></table> : <div className="empty-state">No hay roles registrados.</div>}</div><Pager page={page} pageCount={pageCount} onChange={setPage} /></section>
    <dialog className="client-dialog role-edit-dialog" ref={dialog}><div className="client-dialog-header"><div><div className="page-kicker">ACTUALIZACIÓN</div><h2>Editar rol</h2></div><button className="client-close" type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar">×</button></div><form className="client-form role-form" onSubmit={save}><label>Nombre del rol<input className="form-control" value={editing?.name || ''} onChange={event => setEditing(value => ({ ...value, name: event.target.value }))} minLength={2} maxLength={60} required /></label><label>Descripción<textarea className="form-control" rows="3" maxLength={250} value={editing?.description || ''} onChange={event => setEditing(value => ({ ...value, description: event.target.value }))} /></label><div className="role-form-actions"><button type="button" className="role-cancel" onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></form></dialog>
  </>;
}

function Pager({ page, pageCount, onChange }) {
  return <div className="clients-pagination"><button disabled={page <= 1} onClick={() => onChange(page - 1)}>← Anterior</button><span>Página {page} de {pageCount}</span><button disabled={page >= pageCount} onClick={() => onChange(page + 1)}>Siguiente →</button></div>;
}
