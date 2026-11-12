import { useState } from 'react';
import { apiRequest } from '../api';

const modes = {
  login: { title: 'Bienvenido de nuevo', subtitle: 'Ingresa tus credenciales para continuar al espacio de trabajo.' },
  register: { title: 'Crear usuario', subtitle: 'Crea tu acceso al espacio de trabajo del taller.' },
  recover: { title: 'Recuperar acceso', subtitle: 'Te ayudaremos a recuperar el acceso a tu cuenta.' },
  reset: { title: 'Nueva contraseña', subtitle: 'Elige una contraseña segura para tu cuenta.' }
};

export default function AuthView({ onLogin, tokenFromUrl }) {
  const [mode, setMode] = useState(tokenFromUrl ? 'reset' : 'login');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState(tokenFromUrl || '');
  const title = modes[mode];
  const field = (label, name, type = 'text', placeholder = '', autocomplete = name) => (
    <div key={name}>
      <label className="field-label" htmlFor={`auth-${name}`}>{label}</label>
      <input className="form-control" id={`auth-${name}`} name={name} type={type} placeholder={placeholder} required autoComplete={autocomplete} />
    </div>
  );

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setNotice(null);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === 'login') {
        const session = await apiRequest('/auth/login', { method: 'POST', body });
        onLogin(session);
      } else if (mode === 'register') {
        const result = await apiRequest('/auth/register', { method: 'POST', body });
        setMode('login'); setNotice({ text: result.message || 'Cuenta creada correctamente.', error: !result.emailSent });
      } else if (mode === 'recover') {
        const result = await apiRequest('/auth/recovery', { method: 'POST', body });
        setMode('login'); setNotice({ text: result.message || 'Correo enviado exitosamente. Por favor revisa tu bandeja de entrada.' });
      } else {
        await apiRequest('/auth/reset', { method: 'POST', body: { token: resetToken, password: body.password } });
        window.history.replaceState({}, '', window.location.pathname);
        setMode('login'); setNotice({ text: 'Contraseña actualizada. Inicia sesión con tu nueva clave.' });
      }
    } catch (error) { setNotice({ text: error.message, error: true }); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand-mark"><span className="brand-icon">A</span><span>AUTO-HOST<span className="brand-light"> / GESTIÓN</span></span></div>
      <div className="auth-heading"><div className="eyebrow">PLATAFORMA DE GESTIÓN</div><h1>{title.title}</h1><p>{title.subtitle}</p></div>
      {notice && <div className={`notice ${notice.error ? 'error' : 'success'}`} role="status">{notice.text}</div>}
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && field('Nombre completo', 'name', 'text', 'Tu nombre')}
        {(mode === 'login' || mode === 'register' || mode === 'recover') && field('Correo electrónico', 'email', 'email', 'nombre@empresa.com', 'email')}
        {mode === 'reset' && <div><label className="field-label" htmlFor="auth-token">Token de recuperación</label><input className="form-control" id="auth-token" value={resetToken} onChange={event => setResetToken(event.target.value)} required /></div>}
        {(mode === 'login' || mode === 'register') && field('Contraseña', 'password', 'password', mode === 'login' ? 'Ingresa tu contraseña' : 'Mínimo 10 caracteres', mode === 'login' ? 'current-password' : 'new-password')}
        {mode === 'reset' && field('Nueva contraseña', 'password', 'password', 'Mínimo 10 caracteres', 'new-password')}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : mode === 'recover' ? 'Enviar instrucciones' : 'Actualizar contraseña'}</button>
      </form>
      <div className="auth-links">
        {mode === 'login' ? <><a href="#register" onClick={() => { setMode('register'); setNotice(null); }}>¿No tienes cuenta? Crear usuario</a><a href="#recover" onClick={() => { setMode('recover'); setNotice(null); }}>¿Olvidaste tu contraseña?</a></> : <a href="#login" onClick={() => { setMode('login'); setNotice(null); }}>← Volver a iniciar sesión</a>}
      </div>
      <div className="auth-foot"><span className="status-dot" />Acceso seguro · AUTO-HOST</div>
    </section>
    <aside className="auth-aside"><div className="aside-orb orb-one" /><div className="aside-orb orb-two" /><div className="aside-content"><span className="aside-label">OPERACIÓN, EN ORDEN.</span><h2>Todo el taller.<br /><em>Un solo lugar.</em></h2><p>Una vista clara para mantener el trabajo, los equipos y el servicio avanzando juntos.</p><div className="aside-rule" /><div className="aside-meta"><span>CONTROL CENTRALIZADO</span><span>01 — 03</span></div></div><div className="aside-bottom">HECHO PARA TRABAJAR MEJOR <span>© 2026</span></div></aside>
  </main>;
}
