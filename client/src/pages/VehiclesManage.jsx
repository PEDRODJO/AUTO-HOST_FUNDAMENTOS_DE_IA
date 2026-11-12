import { useCallback, useEffect, useRef, useState } from 'react';
import { apiBaseUrl, apiRequest } from '../api';
import AccessDenied from '../components/AccessDenied';

const PAGE_SIZE = 10;
const STATUS_LABELS = { activo: 'Activo', en_taller: 'En taller', desactivado: 'Desactivado' };
const VIN = /^[a-hj-npr-z0-9]{17}$/;
const PLATE = /^(?:[a-z]{3}\d{4}|[a-z]{2}\d{4}[a-z]|[a-z]{3}\d{3}[a-z])$/;
const canVehicles = roles => roles?.some(role => ['admin', 'administrador', 'recepcionista'].includes(role));
const photosOf = photos => { if (Array.isArray(photos)) return photos; try { const value = JSON.parse(photos || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const photoUrl = path => /^https?:\/\//i.test(apiBaseUrl()) ? new URL(path, apiBaseUrl()).href : new URL(path, window.location.origin).href;

function PrivatePhoto({ path, token, className = '', alt = 'Fotografía del vehículo' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true, objectUrl = '';
    fetch(photoUrl(path), { headers: { Authorization: `Bearer ${token}` } }).then(response => { if (!response.ok) throw new Error('No se pudo cargar la fotografía.'); return response.blob(); }).then(blob => { if (active) { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); } }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, token]);
  return <img className={className} src={src || undefined} alt={alt} loading="lazy" />;
}

export default function VehiclesManage({ session, notify }) {
  const [items, setItems] = useState([]), [page, setPage] = useState(1), [totalPages, setTotalPages] = useState(0), [total, setTotal] = useState(0), [includeInactive, setIncludeInactive] = useState(false), [error, setError] = useState('');
  const [mechanics, setMechanics] = useState([]), [editing, setEditing] = useState(null), [files, setFiles] = useState([]), [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const load = useCallback(async (targetPage = page, all = includeInactive) => {
    try { setError(''); const result = await apiRequest(`/vehicles?page=${targetPage}&pageSize=${PAGE_SIZE}&includeInactive=${all}`, { token: session.token }); setItems(result.items); setTotal(result.total); setPage(result.page); setTotalPages(result.totalPages); }
    catch (err) { setError(err.message); }
  }, [page, includeInactive, session.token]);
  useEffect(() => { let active = true; load(1); apiRequest('/vehicles/mechanics', { token: session.token }).then(result => { if (active) setMechanics(result); }).catch(err => notify(err.message, true)); return () => { active = false; }; }, [session.token]);
  if (!canVehicles(session.user.roles)) return <AccessDenied message="Se requiere el rol admin o recepcionista para administrar vehículos." />;
  function openEdit(vehicle) { setEditing({ ...vehicle }); setFiles([]); dialog.current?.showModal(); }
  function change(event) {
    const { name, value } = event.target;
    const normalized = name === 'VIN' ? value.toLowerCase().replace(/\s/g, '') : name === 'Placa' ? value.toLowerCase().replace(/[\s-]+/g, '') : value;
    setEditing(current => ({ ...current, [name]: normalized }));
  }
  function selectFiles(event) {
    const chosen = [...event.target.files || []];
    if (chosen.length > 10 || chosen.some(file => file.size > 15 * 1024 * 1024)) { notify(chosen.length > 10 ? 'Puedes adjuntar hasta 10 fotografías.' : 'Cada fotografía puede pesar como máximo 15 MB.', true); event.target.value = ''; return; }
    setFiles(chosen);
  }
  async function save(event) {
    event.preventDefault();
    if (!VIN.test(editing.VIN) || !PLATE.test(editing.Placa)) return notify('Revisa el formato del VIN y de la placa.', true);
    setBusy(true); const body = new FormData();
    ['VIN', 'Placa', 'Marca', 'Modelo', 'Anio', 'Version', 'Color', 'Estatus', 'MecanicoId'].forEach(key => body.append(key, editing[key] || ''));
    files.forEach(file => body.append('fotos', file));
    try { const result = await apiRequest(`/vehicles/${encodeURIComponent(editing.id)}`, { method: 'PUT', body, token: session.token }); dialog.current?.close(); notify(result.message || 'Vehículo actualizado correctamente.'); await load(page); }
    catch (err) { notify(err.message, true); }
    finally { setBusy(false); }
  }
  async function remove(vehicle) {
    if (!window.confirm(`¿Desactivar el vehículo ${vehicle.Placa}?`)) return;
    try { await apiRequest(`/vehicles/${encodeURIComponent(vehicle.id)}`, { method: 'DELETE', token: session.token }); notify('Vehículo desactivado correctamente.'); await load(items.length === 1 && page > 1 ? page - 1 : page); }
    catch (err) { notify(err.message, true); }
  }
  const pages = Math.max(1, totalPages), yearMax = new Date().getFullYear() + 1;
  return <><div className="page-kicker">FLOTA</div><div className="vehicle-heading"><div><h1 className="page-title">Administrar vehículos</h1><p className="page-subtitle">Consulta, edita y desactiva los vehículos registrados.</p></div><label className="vehicle-inactive-toggle"><input type="checkbox" checked={includeInactive} onChange={event => { setIncludeInactive(event.target.checked); setPage(1); load(1, event.target.checked); }} /> Incluir desactivados</label></div>
    <section className="panel vehicle-table-panel"><div className="panel-heading"><div><h2>Vehículos</h2><p>{error || `${total} vehículo${total === 1 ? '' : 's'} ${includeInactive ? 'en total' : 'activo(s)'}.`}</p></div><span className="subtle-tag">MÁXIMO {PAGE_SIZE} POR PÁGINA</span></div><div className="table-wrap">{error ? <div className="empty-state">{error}</div> : items.length ? <table className="table vehicle-table"><thead><tr><th>FOTOS</th><th>VIN / PLACA</th><th>VEHÍCULO</th><th>ESTATUS</th><th>TÉCNICO ASIGNADO</th><th>CLIENTE</th><th>ACCIONES</th></tr></thead><tbody>{items.map(vehicle => {
      const photoPaths = photosOf(vehicle.Fotos), status = Number(vehicle.IsActive) ? vehicle.Estatus : 'desactivado', statusClass = status === 'activo' ? 'active' : status === 'en_taller' ? 'workshop' : 'inactive';
      return <tr key={vehicle.id}><td><div className="vehicle-photo-list">{photoPaths.slice(0, 2).map(path => <PrivatePhoto key={path} path={path} token={session.token} className="vehicle-thumb" alt={`Foto ${vehicle.Placa}`} />)}{photoPaths.length > 2 && <span className="vehicle-photo-count">+{photoPaths.length - 2}</span>}{!photoPaths.length && <span className="vehicle-empty-photos">Sin fotos</span>}</div></td><td><strong>{vehicle.VIN}</strong><br /><span className="vehicle-muted">{vehicle.Placa}</span></td><td className="vehicle-name-cell">{vehicle.Marca} {vehicle.Modelo}<br /><span className="vehicle-muted">{vehicle.Anio} · {vehicle.Version} · {vehicle.Color}</span></td><td><span className={`vehicle-status ${statusClass}`}><i />{STATUS_LABELS[status] || status}</span></td><td>{vehicle.MecanicoNombre || 'Sin asignar'}</td><td>{vehicle.ClienteNombre || 'Sin asignar'}</td><td><div className="vehicle-actions"><button className="vehicle-action" disabled={!Number(vehicle.IsActive)} onClick={() => openEdit(vehicle)}>Editar</button><button className="vehicle-action danger" disabled={!Number(vehicle.IsActive)} onClick={() => remove(vehicle)}>Eliminar</button></div></td></tr>;
    })}</tbody></table> : <div className="empty-state">No hay vehículos para mostrar.</div>}</div><div className="vehicle-pagination"><span>Página {page} de {pages}</span><div><button disabled={page <= 1} onClick={() => load(page - 1)}>Anterior</button><button disabled={page >= pages} onClick={() => load(page + 1)}>Siguiente</button></div></div></section>
    <dialog ref={dialog} className="vehicle-dialog"><div className="vehicle-dialog-header"><div><span className="page-kicker">ACTUALIZACIÓN</span><h2>Editar vehículo</h2></div><button className="vehicle-close" type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar">×</button></div><form className="vehicle-form vehicle-edit-form" onSubmit={save}><div className="vehicle-fields">
      <label>VIN *<input name="VIN" value={editing?.VIN || ''} onChange={change} minLength={17} maxLength={17} pattern="[a-hj-npr-z0-9]{17}" required /></label><label>Placa *<input name="Placa" value={editing?.Placa || ''} onChange={change} maxLength={8} pattern="([a-z]{3}[0-9]{4}|[a-z]{2}[0-9]{4}[a-z]|[a-z]{3}[0-9]{3}[a-z])" required /></label>
      <label>Marca *<input name="Marca" value={editing?.Marca || ''} onChange={change} maxLength={80} required /></label><label>Modelo *<input name="Modelo" value={editing?.Modelo || ''} onChange={change} maxLength={80} required /></label><label>Año *<input name="Anio" type="number" min="1886" max={yearMax} value={editing?.Anio || ''} onChange={change} required /></label><label>Versión *<input name="Version" value={editing?.Version || ''} onChange={change} maxLength={100} required /></label>
      <label>Color *<input name="Color" value={editing?.Color || ''} onChange={change} maxLength={50} required /></label><label>Estatus *<select name="Estatus" value={editing?.Estatus || 'activo'} onChange={change}><option value="activo">Activo</option><option value="en_taller">En taller</option><option value="desactivado">Desactivado</option></select></label>
      <label className="vehicle-full-width">Técnico asignado / asociado<select name="MecanicoId" value={editing?.MecanicoId || ''} onChange={change}><option value="">Sin asignar</option>{mechanics.map(mechanic => <option key={mechanic.UserId} value={mechanic.UserId}>{mechanic.DisplayName}</option>)}</select></label><div className="vehicle-full-width vehicle-current-photos">{photosOf(editing?.Fotos).map(path => <PrivatePhoto key={path} path={path} token={session.token} className="vehicle-thumb" />)}</div><label className="vehicle-full-width">Agregar fotografías (máximo 15 MB cada una)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectFiles} /></label>
    </div><div className="vehicle-form-actions"><span>Las fotos existentes se conservan.</span><button type="button" className="vehicle-cancel" onClick={() => dialog.current?.close()}>Cancelar</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></form></dialog>
  </>;
}
