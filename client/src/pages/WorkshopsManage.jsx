import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import AccessDenied from '../components/AccessDenied';

const PAGE_SIZE = 10;
const RFC_REGEX = /^[a-zñ&]{3,4}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[a-z0-9]{3}$/i;
const fields = ['nombre', 'rfc', 'email', 'calle', 'numero', 'colonia', 'codigo_postal', 'estado', 'municipio'];
export default function WorkshopsManage({ session, notify }) {
  const [items, setItems] = useState([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [totalPages, setTotalPages] = useState(0), [error, setError] = useState(''), [editing, setEditing] = useState(null), [photo, setPhoto] = useState(null), [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const load = useCallback(async (targetPage = page) => {
    try { setError(''); const result = await apiRequest(`/workshops?page=${targetPage}&pageSize=${PAGE_SIZE}`, { token: session.token }); setItems(result.items); setTotal(result.total); setPage(result.page); setTotalPages(result.totalPages); }
    catch (err) { setError(err.message); }
  }, [page, session.token]);
  useEffect(() => { load(1); }, [session.token]);
  if (!session.user.roles?.includes('administrador')) return <AccessDenied message="Se requiere el rol administrador para administrar talleres." />;
  function openEdit(item) { setEditing(Object.fromEntries(fields.map(key => [key, item[key] || '']).concat([['id', item.id]]))); setPhoto(null); dialog.current?.showModal(); }
  function change(event) { setEditing(current => ({ ...current, [event.target.name]: event.target.value })); }
  async function save(event) {
    event.preventDefault();
    if (!RFC_REGEX.test(editing.rfc.trim())) return notify('El RFC no tiene formato mexicano válido.', true);
    if (photo && photo.size > 15 * 1024 * 1024) return notify('La fotografía no puede superar 15 MB.', true);
    setBusy(true); const body = new FormData(); fields.forEach(key => body.append(key, editing[key])); if (photo) body.append('fotografia', photo);
    try { const result = await apiRequest(`/workshops/${encodeURIComponent(editing.id)}`, { method: 'PUT', body, token: session.token }); dialog.current?.close(); notify(result.message || 'Taller actualizado correctamente.'); await load(); }
    catch (err) { notify(err.message, true); }
    finally { setBusy(false); }
  }
  async function remove(item) {
    if (!window.confirm(`¿Desactivar el taller ${item.nombre}?`)) return;
    try { await apiRequest(`/workshops/${encodeURIComponent(item.id)}`, { method: 'DELETE', token: session.token }); notify('Taller desactivado correctamente.'); await load(items.length === 1 && page > 1 ? page - 1 : page); }
    catch (err) { notify(err.message, true); }
  }
  const pages = Math.max(1, totalPages);
  return <><div className="page-kicker">DIRECTORIO</div><h1 className="page-title">Administrar talleres</h1><p className="page-subtitle">Consulta, actualiza y desactiva talleres registrados.</p><section className="panel workshops-list-panel"><div className="panel-heading"><div><h2>Talleres registrados</h2><p>{error || `${total} talleres`}</p></div><span className="subtle-tag">PÁGINA DE ${PAGE_SIZE}</span></div><div className="table-wrap">{error ? <div className="empty-state">{error}</div> : items.length ? <table className="table workshops-table"><thead><tr><th>TALLER</th><th>RFC</th><th>CORREO</th><th>UBICACIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td className="client-name">{item.nombre}</td><td>{item.rfc}</td><td>{item.email}</td><td>{[item.calle, item.numero, item.colonia, item.municipio, item.estado].join(', ')}</td><td>{Number(item.IsActive) ? 'Activo' : 'Inactivo'}</td><td><div className="workshops-actions"><button className="workshops-action" disabled={!Number(item.IsActive)} onClick={() => openEdit(item)}>Editar</button><button className="workshops-action danger" disabled={!Number(item.IsActive)} onClick={() => remove(item)}>Eliminar</button></div></td></tr>)}</tbody></table> : <div className="empty-state">No hay talleres registrados.</div>}</div><div className="clients-pagination"><button disabled={page <= 1} onClick={() => load(page - 1)}>← Anterior</button><span>Página {page} de {pages}</span><button disabled={page >= pages} onClick={() => load(page + 1)}>Siguiente →</button></div></section>
    <dialog ref={dialog} className="client-dialog"><div className="client-dialog-header"><div><div className="page-kicker">ACTUALIZACIÓN</div><h2>Editar taller</h2></div><button className="client-close" onClick={() => dialog.current?.close()} type="button" aria-label="Cerrar">×</button></div><form className="client-form" onSubmit={save}><div className="client-form-grid">{fields.map(key => <label key={key}>{({ nombre: 'Nombre', rfc: 'RFC', email: 'Correo', calle: 'Calle', numero: 'Número', colonia: 'Colonia', codigo_postal: 'Código postal', estado: 'Estado', municipio: 'Municipio' })[key]}<input name={key} type={key === 'email' ? 'email' : 'text'} value={editing?.[key] || ''} onChange={change} required maxLength={key === 'rfc' ? 13 : undefined} pattern={key === 'rfc' ? '[A-Za-zÑñ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Za-z0-9]{3}' : undefined} /></label>)}</div><label className="workshop-photo-edit">Fotografía nueva (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhoto(event.target.files?.[0] || null)} /></label><div className="client-dialog-actions"><span>El estatus se conserva como activo.</span><button type="button" className="client-cancel" onClick={() => dialog.current?.close()}>Cancelar</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></form></dialog>
  </>;
}
