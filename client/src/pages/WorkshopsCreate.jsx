import { useState } from 'react';
import { apiRequest } from '../api';

const RFC_REGEX = /^[a-zñ&]{3,4}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[a-z0-9]{3}$/i;
const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const initial = { nombre: '', rfc: '', email: '', calle: '', numero: '', colonia: '', codigo_postal: '', estado: '', municipio: '' };
export default function WorkshopsCreate({ session, notify }) {
  const [value, setValue] = useState(initial), [photo, setPhoto] = useState(null), [busy, setBusy] = useState(false), [colonias, setColonias] = useState([]), [postalHint, setPostalHint] = useState('Escribe cinco dígitos para buscar.');
  function change(event) { setValue(current => ({ ...current, [event.target.name]: event.target.value })); }
  async function lookupPostalCode() {
    if (!/^\d{5}$/.test(value.codigo_postal)) return;
    setPostalHint('Buscando ubicación…');
    try {
      const result = await apiRequest(`/sepomex/${encodeURIComponent(value.codigo_postal)}`, { token: session.token });
      setValue(current => ({ ...current, estado: result.estado || '', municipio: result.municipio || '', colonia: result.colonias?.[0] || '' }));
      setColonias(result.colonias || []); setPostalHint('Dirección SEPOMEX encontrada; puedes ajustar la colonia.');
    } catch (error) { setColonias([]); setPostalHint('No se encontró el CP; completa la dirección manualmente.'); notify(error.message, true); }
  }
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!RFC_REGEX.test(value.rfc.trim())) return notify('El RFC no tiene formato mexicano válido.', true);
    if (!EMAIL_REGEX.test(value.email.trim())) return notify('Captura un correo electrónico válido.', true);
    if (!photo) return notify('Selecciona la fotografía del taller.', true);
    if (photo.size > 15 * 1024 * 1024) return notify('La fotografía no puede superar 15 MB.', true);
    setBusy(true);
    const body = new FormData(); Object.entries(value).forEach(([key, fieldValue]) => body.append(key, fieldValue.trim())); body.append('fotografia', photo);
    try { const result = await apiRequest('/workshops', { method: 'POST', body, token: session.token }); setValue(initial); setPhoto(null); formElement.reset(); setColonias([]); notify(result.message || 'Taller registrado correctamente.'); }
    catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  return <><div className="page-kicker">DIRECTORIO CORPORATIVO</div><h1 className="page-title">Registro de taller</h1><p className="page-subtitle">Completa la información fiscal, de contacto y domicilio del taller.</p>
    <form className="workshop-form" onSubmit={submit}>
      <section className="workshop-panel"><div className="workshop-section-head"><div><span className="workshop-step">01</span><div><h2>Datos del taller</h2><p>Información de identificación y contacto.</p></div></div><span className="workshop-status"><i>✓</i> ACTIVO</span></div><div className="workshop-fields">
        <div className="workshop-field"><label>Nombre del taller <b>*</b></label><input name="nombre" value={value.nombre} onChange={change} maxLength={160} required /></div>
        <div className="workshop-field"><label>RFC <b>*</b></label><input name="rfc" value={value.rfc} onChange={change} pattern="[A-Za-zÑñ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Za-z0-9]{3}" minLength={12} maxLength={13} title="Formato mexicano: letras, fecha YYMMDD y homoclave" required /><small>12 caracteres (persona moral) o 13 (persona física).</small></div>
        <div className="workshop-field"><label>Correo electrónico <b>*</b></label><input name="email" type="email" value={value.email} onChange={change} maxLength={254} required /></div>
        <div className="workshop-field"><label>Fotografía del taller <b>*</b></label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhoto(event.target.files?.[0] || null)} required /><small>JPG, PNG o WEBP. Peso máximo 15 MB.</small></div>
      </div></section>
      <section className="workshop-panel"><div className="workshop-section-head"><div><span className="workshop-step">02</span><div><h2>Domicilio</h2><p>La búsqueda por CP actualiza estado, municipio y colonia.</p></div></div></div><div className="workshop-fields workshop-address-grid">
        <div className="workshop-field"><label>Calle <b>*</b></label><input name="calle" value={value.calle} onChange={change} maxLength={160} required /></div><div className="workshop-field"><label>Número <b>*</b></label><input name="numero" value={value.numero} onChange={change} maxLength={30} required /></div>
        <div className="workshop-field"><label>Código postal <b>*</b></label><input name="codigo_postal" value={value.codigo_postal} onChange={change} onBlur={lookupPostalCode} inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required /><small>{postalHint}</small></div>
        <div className="workshop-field"><label>Colonia <b>*</b></label>{colonias.length > 1 ? <select name="colonia" value={value.colonia} onChange={change} required><option value="">Selecciona colonia</option>{colonias.map(colonia => <option key={colonia}>{colonia}</option>)}</select> : <input name="colonia" value={value.colonia} onChange={change} maxLength={120} required />}</div>
        <div className="workshop-field"><label>Estado <b>*</b></label><input name="estado" value={value.estado} onChange={change} maxLength={100} required /></div><div className="workshop-field"><label>Municipio <b>*</b></label><input name="municipio" value={value.municipio} onChange={change} maxLength={120} required /></div>
      </div><div className="workshop-actions"><span>Los campos marcados con * son obligatorios.</span><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Cargando…' : 'Registrar taller'}</button></div></section>
    </form>
  </>;
}
