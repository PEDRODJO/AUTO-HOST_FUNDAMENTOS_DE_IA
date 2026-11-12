import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import AccessDenied from '../components/AccessDenied';

const VIN = /^[a-hj-npr-z0-9]{17}$/;
const PLATE = /^(?:[a-z]{3}\d{4}|[a-z]{2}\d{4}[a-z]|[a-z]{3}\d{3}[a-z])$/;
const initial = { VIN: '', Placa: '', Marca: '', Modelo: '', Anio: '', Version: '', Color: '', Estatus: 'activo', MecanicoId: '' };
const canVehicles = roles => roles?.some(role => ['admin', 'administrador', 'recepcionista'].includes(role));

export default function VehiclesCreate({ session, notify }) {
  const [value, setValue] = useState(initial), [mechanics, setMechanics] = useState([]), [files, setFiles] = useState([]), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; apiRequest('/vehicles/mechanics', { token: session.token }).then(result => { if (active) setMechanics(result); }).catch(err => notify(err.message, true)); return () => { active = false; }; }, [session.token, notify]);
  if (!canVehicles(session.user.roles)) return <AccessDenied message="Se requiere el rol admin o recepcionista para registrar vehículos." />;
  function change(event) {
    const { name, value: input } = event.target;
    const normalized = name === 'VIN' ? input.toLowerCase().replace(/\s/g, '') : name === 'Placa' ? input.toLowerCase().replace(/[\s-]+/g, '') : input;
    setValue(current => ({ ...current, [name]: normalized }));
  }
  function selectFiles(event) {
    const selected = [...event.target.files || []];
    if (selected.length > 10) { notify('Puedes adjuntar hasta 10 fotografías.', true); event.target.value = ''; return; }
    const oversized = selected.find(file => file.size > 15 * 1024 * 1024);
    if (oversized) { notify(`La fotografía ${oversized.name} supera 15 MB.`, true); event.target.value = ''; return; }
    setFiles(selected);
  }
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!VIN.test(value.VIN)) return notify('El VIN debe tener 17 caracteres en minúsculas y excluir I, O y Q.', true);
    if (!PLATE.test(value.Placa)) return notify('La placa no coincide con un formato mexicano admitido.', true);
    setBusy(true);
    const form = new FormData(); Object.entries(value).forEach(([name, field]) => form.append(name, field)); files.forEach(file => form.append('fotos', file));
    try { await apiRequest('/vehicles', { method: 'POST', body: form, token: session.token }); setValue(initial); setFiles([]); formElement.reset(); notify('Vehículo registrado correctamente.'); }
    catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  const yearMax = new Date().getFullYear() + 1;
  return <><div className="page-kicker">FLOTA</div><h1 className="page-title">Registrar vehículo</h1><p className="page-subtitle">Captura los datos de identificación, configuración y fotografías.</p>
    <form className="vehicle-form" onSubmit={submit}><section className="panel vehicle-form-panel"><div className="panel-heading"><div><h2>Identificación del vehículo</h2><p>VIN y placa son únicos y se guardan normalizados en minúsculas.</p></div><span className="vehicle-status-badge"><i /> ACTIVO</span></div><div className="vehicle-fields">
      <label>VIN *<input name="VIN" value={value.VIN} onChange={change} minLength={17} maxLength={17} pattern="[a-hj-npr-z0-9]{17}" title="17 caracteres; no se permiten I, O o Q" required /><small>17 caracteres; no se permiten las letras I, O o Q.</small></label>
      <label>Placa *<input name="Placa" value={value.Placa} onChange={change} maxLength={8} pattern="([a-z]{3}[0-9]{4}|[a-z]{2}[0-9]{4}[a-z]|[a-z]{3}[0-9]{3}[a-z])" title="Ejemplos: ABC1234, AB123CD o ABC123D" required /><small>Ejemplos: ABC1234, AB123CD o ABC123D.</small></label>
      <label>Marca *<input name="Marca" value={value.Marca} onChange={change} maxLength={80} required /></label><label>Modelo *<input name="Modelo" value={value.Modelo} onChange={change} maxLength={80} required /></label>
      <label>Año *<input name="Anio" value={value.Anio} onChange={change} type="number" min="1886" max={yearMax} required /></label><label>Versión *<input name="Version" value={value.Version} onChange={change} maxLength={100} required /></label>
      <label>Color *<input name="Color" value={value.Color} onChange={change} maxLength={50} required /></label><label>Estatus *<select name="Estatus" value={value.Estatus} onChange={change}><option value="activo">Activo</option><option value="en_taller">En taller</option></select></label>
      <label className="vehicle-full-width">Técnico asignado / asociado <span>(opcional)</span><select name="MecanicoId" value={value.MecanicoId} onChange={change}><option value="">Sin asignar</option>{mechanics.map(mechanic => <option key={mechanic.UserId} value={mechanic.UserId}>{mechanic.DisplayName}</option>)}</select></label>
      <label className="vehicle-full-width">Fotografías <span>(opcional; hasta 10 archivos, 15 MB cada uno)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectFiles} /><small>Formatos JPG, PNG o WEBP.</small></label>
    </div><div className="vehicle-form-actions"><span>* Campos obligatorios.</span><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Registrar vehículo'}</button></div></section></form>
  </>;
}
