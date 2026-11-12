import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import AccessDenied from '../components/AccessDenied';
import ClientFields from '../components/ClientFields';

const PAGE_SIZE = 10;
const emptyAssignment = { assigned: [], available: [] };
const canAssignVehicles = roles => roles?.some(role => ['admin', 'administrador', 'recepcionista'].includes(role));
export default function ClientsManage({ session, notify }) {
  const [items, setItems] = useState([]), [workshops, setWorkshops] = useState([]), [total, setTotal] = useState(0), [totalPages, setTotalPages] = useState(0), [page, setPage] = useState(1), [error, setError] = useState('');
  const [editing, setEditing] = useState(null), [assignment, setAssignment] = useState(emptyAssignment), [clientId, setClientId] = useState(''), [busy, setBusy] = useState(false);
  const editDialog = useRef(null), vehiclesDialog = useRef(null);
  const isAdmin = session.user.roles?.some(role => ['admin', 'administrador'].includes(role));
  const canManageClients = canAssignVehicles(session.user.roles);
  const load = useCallback(async (targetPage = 1) => {
    try {
      setError('');
      const endpoint = isAdmin ? '/clients' : '/clients/vehicle-assignment';
      const result = await apiRequest(`${endpoint}?page=${targetPage}&pageSize=${PAGE_SIZE}`, { token: session.token });
      setItems(result.items); setTotal(result.total); setTotalPages(result.totalPages); setPage(result.page);
    } catch (err) { setError(err.message); }
  }, [isAdmin, session.token]);
  useEffect(() => {
    load(1);
    if (isAdmin) apiRequest('/clients/workshops', { token: session.token }).then(setWorkshops).catch(err => notify(err.message, true));
  }, [isAdmin, load, notify, session.token]);
  if (!canManageClients) return <AccessDenied message="Se requiere el rol admin o recepcionista para consultar clientes y asociar vehículos." />;
  const blank = { Nombre: '', ApellidoPaterno: '', ApellidoMaterno: '', Email: '', TelefonoPersonal: '', TelefonoTrabajo: '', TelefonoEmergencia: '', NombreContactoEmergencia: '', ApellidoPaternoContactoEmergencia: '', ApellidoMaternoContactoEmergencia: '', Calle: '', Numero: '', Colonia: '', Estado: '', Municipio: '', CodigoPostal: '', TallerId: '' };
  function edit(client) { setEditing({ ...blank, ...client }); editDialog.current?.showModal(); }
  function change(event) { setEditing(current => ({ ...current, [event.target.name]: event.target.value })); }
  async function save(event) {
    event.preventDefault(); setBusy(true);
    try { await apiRequest(`/clients/${encodeURIComponent(editing.ClientId)}`, { method: 'PUT', body: editing, token: session.token }); editDialog.current?.close(); notify('Cliente actualizado correctamente.'); await load(page); }
    catch (err) { notify(err.message, true); }
    finally { setBusy(false); }
  }
  async function remove(client) {
    if (!window.confirm(`¿Desactivar a ${[client.Nombre, client.ApellidoPaterno].join(' ')}? El registro se conservará.`)) return;
    try { await apiRequest(`/clients/${encodeURIComponent(client.ClientId)}`, { method: 'DELETE', token: session.token }); notify('Cliente desactivado correctamente.'); await load(items.length === 1 && page > 1 ? page - 1 : page); }
    catch (err) { notify(err.message, true); }
  }
  async function showVehicles(id) {
    setClientId(id); setAssignment(emptyAssignment); vehiclesDialog.current?.showModal();
    try { setAssignment(await apiRequest(`/clients/${encodeURIComponent(id)}/vehicles`, { token: session.token })); }
    catch (err) { notify(err.message, true); }
  }
  async function associate(event) {
    event.preventDefault(); setBusy(true);
    const vehicleId = new FormData(event.currentTarget).get('VehicleId');
    try {
      await apiRequest(`/clients/${encodeURIComponent(clientId)}/vehicles`, { method: 'PUT', body: { vehicleId }, token: session.token });
      notify('Vehículo asociado correctamente.');
      setAssignment(await apiRequest(`/clients/${encodeURIComponent(clientId)}/vehicles`, { token: session.token }));
    } catch (err) { notify(err.message, true); }
    finally { setBusy(false); }
  }
  const activePageCount = Math.max(1, totalPages);
  return <><div className="page-kicker">DIRECTORIO</div><h1 className="page-title">Administrar clientes</h1><p className="page-subtitle">Consulta, actualiza o desactiva clientes registrados.</p>
    <section className="panel clients-panel"><div className="panel-heading clients-heading"><div><h2>Directorio de clientes</h2><p>{error || `${total} cliente${total === 1 ? '' : 's'} activo${total === 1 ? '' : 's'}.`}</p></div></div><div className="table-wrap">{error ? <div className="empty-state">{error}</div> : items.length ? <table className="table clients-table"><thead><tr><th>CLIENTE</th>{isAdmin && <><th>CORREO</th><th>TELÉFONO</th><th>TALLER</th><th>DOMICILIO</th></>}<th>ACCIONES</th></tr></thead><tbody>{items.map(client => <tr key={client.ClientId}><td className="client-name"><span className="initials">{`${client.Nombre?.[0] || ''}${client.ApellidoPaterno?.[0] || ''}`.toUpperCase()}</span>{[client.Nombre, client.ApellidoPaterno, client.ApellidoMaterno].filter(Boolean).join(' ')}</td>{isAdmin && <><td>{client.Email}</td><td>{client.TelefonoPersonal}</td><td>{client.TallerNombre || 'Sin asignar'}</td><td>{[client.Colonia, client.Municipio, client.Estado].filter(Boolean).join(', ')}</td></>}<td><div className="clients-actions">{isAdmin && <button className="client-action" onClick={() => edit(client)}>Editar</button>}<button className="client-action" onClick={() => showVehicles(client.ClientId)}>Vehículos</button>{isAdmin && <button className="client-action danger" onClick={() => remove(client)}>Eliminar</button>}</div></td></tr>)}</tbody></table> : <div className="empty-state">No hay clientes activos para mostrar.</div>}</div><div className="clients-pagination"><button disabled={page <= 1} onClick={() => load(page - 1)}>← Anterior</button><span>Página {page} de {activePageCount}</span><button disabled={page >= activePageCount} onClick={() => load(page + 1)}>Siguiente →</button></div></section>
    <dialog className="client-dialog" ref={editDialog}><div className="client-dialog-header"><div><div className="page-kicker">FICHA DEL CLIENTE</div><h2>Editar cliente</h2></div><button className="client-close" type="button" onClick={() => editDialog.current?.close()} aria-label="Cerrar">×</button></div><form className="client-form" onSubmit={save}><ClientFields value={editing || blank} onChange={change} workshops={workshops} /><div className="client-dialog-actions"><span>* Campos obligatorios.</span><button type="button" className="client-cancel" onClick={() => editDialog.current?.close()}>Cancelar</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></form></dialog>
    <dialog className="vehicle-association-dialog" ref={vehiclesDialog}><div className="client-dialog-header"><div><div className="page-kicker">FLOTA ASIGNADA</div><h2>Vehículos del cliente</h2></div><button type="button" className="client-close" onClick={() => vehiclesDialog.current?.close()} aria-label="Cerrar">×</button></div><div className="client-form"><h3>Vehículos asociados</h3><div className="vehicle-assigned-list">{assignment.assigned.length ? assignment.assigned.map(vehicle => <div className="vehicle-assigned-item" key={vehicle.id}><strong>{vehicle.Marca} {vehicle.Modelo}</strong> · {vehicle.Placa} · {vehicle.VIN} <span className="vehicle-muted">({vehicle.Estatus}{Number(vehicle.IsActive) ? '' : ', inactivo'})</span></div>) : <span className="vehicle-empty-photos">Aún no hay vehículos asociados.</span>}</div><form onSubmit={associate}><label>Vehículo disponible<select name="VehicleId" required defaultValue=""><option value="">{assignment.available.length ? 'Selecciona un vehículo' : 'No hay vehículos activos disponibles'}</option>{assignment.available.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.Marca} {vehicle.Modelo} {vehicle.Anio} · {vehicle.Placa} · {vehicle.VIN}</option>)}</select></label><div className="vehicle-association-actions"><button type="button" className="client-cancel" onClick={() => vehiclesDialog.current?.close()}>Cerrar</button><button type="submit" className="primary-btn" disabled={busy || !assignment.available.length}>{busy ? 'Asociando…' : 'Asociar vehículo'}</button></div></form></div></dialog>
  </>;
}
