import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import AccessDenied from '../components/AccessDenied';
import ClientFields from '../components/ClientFields';

const blank = { Nombre: '', ApellidoPaterno: '', ApellidoMaterno: '', Email: '', TelefonoPersonal: '', TelefonoTrabajo: '', TelefonoEmergencia: '', NombreContactoEmergencia: '', ApellidoPaternoContactoEmergencia: '', ApellidoMaternoContactoEmergencia: '', Calle: '', Numero: '', Colonia: '', Estado: '', Municipio: '', CodigoPostal: '', TallerId: '' };
export default function ClientsCreate({ session, notify }) {
  const [value, setValue] = useState(blank), [workshops, setWorkshops] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    apiRequest('/clients/workshops', { token: session.token }).then(result => { if (active) setWorkshops(result); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session.token]);
  if (!session.user.roles?.includes('administrador')) return <AccessDenied message="Se requiere el rol administrador para crear clientes." />;
  function change(event) { setValue(current => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    try { await apiRequest('/clients', { method: 'POST', body: value, token: session.token }); setValue(blank); notify('Cliente creado correctamente.'); }
    catch (err) { notify(err.message, true); }
    finally { setBusy(false); }
  }
  return <><div className="page-kicker">DIRECTORIO</div><h1 className="page-title">Crear cliente</h1><p className="page-subtitle">Registra la información personal, de contacto y domicilio.</p>
    <section className="panel clients-create-panel"><div className="panel-heading"><div><h2>Ficha del cliente</h2><p>{error || (loading ? 'Cargando talleres activos…' : 'Los campos marcados con * son obligatorios.')}</p></div></div><form className="client-form" onSubmit={submit}><ClientFields value={value} onChange={change} workshops={workshops} /><div className="client-dialog-actions"><span>La cuenta quedará activa al guardar.</span><button className="primary-btn" type="submit" disabled={busy || loading || !workshops.length}>{busy ? 'Guardando…' : 'Guardar cliente'}</button></div></form></section>
  </>;
}
