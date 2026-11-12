import { useState } from 'react';
import { apiRequest } from '../api';
import AccessDenied from '../components/AccessDenied';

const blank = { name: '', description: '' };
export default function RolesCreate({ session, notify }) {
  const [form, setForm] = useState(blank), [busy, setBusy] = useState(false);
  if (!session.user.roles?.includes('administrador')) return <AccessDenied message="Se requiere el rol administrador para crear roles." />;
  function change(event) { setForm(current => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    try { await apiRequest('/roles', { method: 'POST', body: { name: form.name.trim(), description: form.description.trim() }, token: session.token }); setForm(blank); notify('Rol creado correctamente.'); }
    catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  return <><div className="page-kicker">CONFIGURACIÓN</div><h1 className="page-title">Crear rol</h1><p className="page-subtitle">Registra un perfil para organizar el acceso al sistema.</p>
    <section className="form-panel roles-form-panel"><div className="panel-heading"><div><h2>Nuevo rol</h2><p>Define el nombre y una descripción para el perfil.</p></div><span className="subtle-tag">NUEVO REGISTRO</span></div>
      <form className="role-form" onSubmit={submit}><label htmlFor="roleName">Nombre del rol *</label><input className="form-control" id="roleName" name="name" value={form.name} onChange={change} placeholder="Ej. supervisor" minLength={2} maxLength={60} required /><label htmlFor="roleDescription">Descripción <span>(opcional)</span></label><textarea className="form-control" id="roleDescription" name="description" value={form.description} onChange={change} rows="3" maxLength={250} placeholder="Describe brevemente este rol" /><div className="role-form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Crear rol'}</button></div></form>
    </section></>;
}
