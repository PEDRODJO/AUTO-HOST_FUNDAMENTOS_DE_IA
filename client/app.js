/* Adapter: normalize transport errors and API payloads for UI callers. */
class ApiAdapter {
  async request(path, { method = 'GET', body, token } = {}) {
    const response = await fetch(`${window.API_BASE_URL}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible completar la solicitud.');
    return payload;
  }
}
/* Bridge: UI-facing gateway delegates API operations to the adapter. */
class ApiBridge {
  constructor(transport) { this.transport = transport; }
  login(body) { return this.transport.request('/auth/login', { method: 'POST', body }); }
  register(body) { return this.transport.request('/auth/register', { method: 'POST', body }); }
  recover(body) { return this.transport.request('/auth/recovery', { method: 'POST', body }); }
  reset(body) { return this.transport.request('/auth/reset', { method: 'POST', body }); }
  get(path, token) { return this.transport.request(path, { token }); }
  post(path, body, token) { return this.transport.request(path, { method: 'POST', body, token }); }
}
/* Decorator: adds current authorization token and redirects on expired sessions. */
class AuthenticatedApiDecorator {
  constructor(bridge) { this.bridge = bridge; }
  get(path) { return this.bridge.get(path, state.token).catch(error => { if (/sesión inválida|expirada/i.test(error.message)) logout(); throw error; }); }
  post(path, body) { return this.bridge.post(path, body, state.token); }
}
const api = new ApiBridge(new ApiAdapter());
const privateApi = new AuthenticatedApiDecorator(api);
const state = { token: sessionStorage.getItem('taller.token'), user: JSON.parse(sessionStorage.getItem('taller.user') || 'null'), page: 'inicio', clients: [] };
const $ = selector => document.querySelector(selector);

function notify(message, error = false) {
  const el = document.createElement('div'); el.className = `toast-message${error ? ' error' : ''}`; el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 3600);
}
function setNotice(message, error = false) { const box = $('#authNotice'); box.textContent = message; box.className = `notice ${error ? 'error' : 'success'}`; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function showAuth(mode = 'login') {
  $('#appShell').classList.add('d-none'); $('#authShell').classList.remove('d-none');
  const form = $('#authForm'), links = $('#authLinks'), notice = $('#authNotice'); notice.className = 'notice d-none';
  const field = (label, name, type = 'text', placeholder = '') => `<div><label class="field-label" for="${name}">${label}</label><input class="form-control" id="${name}" name="${name}" type="${type}" placeholder="${placeholder}" required autocomplete="${name === 'password' ? 'current-password' : name}"></div>`;
  if (mode === 'register') {
    $('#authTitle').textContent = 'Crear usuario'; $('#authSubtitle').textContent = 'Crea tu acceso al espacio de trabajo del taller.';
    form.innerHTML = `${field('Nombre completo', 'name', 'text', 'Tu nombre')}${field('Correo electrónico', 'email', 'email', 'nombre@empresa.com')}${field('Contraseña', 'password', 'password', 'Mínimo 10 caracteres')}<button class="auth-submit" type="submit">Crear cuenta</button>`;
    links.innerHTML = '<a href="#login" data-view="login">← Volver a iniciar sesión</a>';
  } else if (mode === 'recover' || mode === 'reset') {
    const resetting = mode === 'reset'; $('#authTitle').textContent = resetting ? 'Nueva contraseña' : 'Recuperar acceso'; $('#authSubtitle').textContent = resetting ? 'Elige una contraseña segura para tu cuenta.' : 'Te ayudaremos a recuperar el acceso a tu cuenta.';
    form.innerHTML = resetting ? `${field('Token de recuperación', 'token', 'text', 'Pega el token recibido')}${field('Nueva contraseña', 'password', 'password', 'Mínimo 10 caracteres')}<button class="auth-submit" type="submit">Actualizar contraseña</button>` : `${field('Correo electrónico', 'email', 'email', 'nombre@empresa.com')}<button class="auth-submit" type="submit">Enviar instrucciones</button>`;
    links.innerHTML = '<a href="#login" data-view="login">← Volver a iniciar sesión</a>';
  } else {
    $('#authTitle').textContent = 'Bienvenido de nuevo'; $('#authSubtitle').textContent = 'Ingresa tus credenciales para continuar al espacio de trabajo.';
    form.innerHTML = `${field('Correo electrónico', 'email', 'email', 'nombre@empresa.com')}${field('Contraseña', 'password', 'password', 'Ingresa tu contraseña')}<button class="auth-submit" type="submit">Iniciar sesión</button>`;
    links.innerHTML = '<a href="#register" data-view="register">¿No tienes cuenta? Crear usuario</a><a href="#recover" data-view="recover">¿Olvidaste tu contraseña?</a>';
  }
  form.onsubmit = event => submitAuth(event, mode);
  links.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); showAuth(link.dataset.view); }));
}
async function submitAuth(event, mode) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
  const button = event.currentTarget.querySelector('button'); button.disabled = true; button.textContent = 'Procesando…';
  try {
    if (mode === 'login') { const result = await api.login(data); setSession(result); return; }
    if (mode === 'register') { const result = await api.register(data); showAuth('login'); setNotice(result.message, !result.emailSent); return; }
    if (mode === 'recover') {
      await api.recover(data);
      showAuth('login'); setNotice('Correo enviado exitosamente. Por favor revisa tu bandeja de entrada.');
      return;
    }
    const result = await api.reset(data);
    history.replaceState({}, '', '/');
    showAuth('login'); setNotice(result.message);
  } catch (error) { setNotice(error.message, true); } finally { if (button.isConnected) { button.disabled = false; button.textContent = mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : mode === 'recover' ? 'Enviar instrucciones' : 'Actualizar contraseña'; } }
}
function setSession(result) { state.token = result.token; state.user = result.user; sessionStorage.setItem('taller.token', state.token); sessionStorage.setItem('taller.user', JSON.stringify(state.user)); enterApp(); }
function logout() { sessionStorage.clear(); state.token = null; state.user = null; location.hash = ''; showAuth('login'); }
const navItems = [
  { id: 'inicio', label: 'Inicio', icon: '⌂' },
  { id: 'roles_create', label: 'Crear Rol', icon: '＋' },
  { id: 'roles_manage', label: 'Administrar Roles', icon: '◇' },
  { id: 'clients_create', label: 'Crear Cliente', icon: '＋' },
  { id: 'clients_manage', label: 'Administrar Clientes', icon: '▤' },
  { id: 'taller', label: 'Registrar Taller', icon: '＋' },
  { id: 'talleres', label: 'Administrar Talleres', icon: '▦' },
  { id: 'vehicles_create', label: 'Registrar Vehículo', icon: '＋', vehicleOnly: true },
  { id: 'vehicles_manage', label: 'Administrar Vehículos', icon: '▣', vehicleOnly: true }
];
function canAccessVehicleModule() {
  const roles = state.user?.roles || [];
  return roles.some(role => ['admin', 'administrador', 'recepcionista'].includes(role));
}
function visibleNavItems() { return navItems.filter(item => !item.vehicleOnly || canAccessVehicleModule()); }
function enterApp() {
  if (!state.token || !state.user) return showAuth();
  $('#authShell').classList.add('d-none'); $('#appShell').classList.remove('d-none');
  $('#userName').textContent = state.user.name || state.user.email; $('#userRole').textContent = (state.user.roles || []).join(', ') || 'Usuario';
  $('#userAvatar').textContent = (state.user.name || state.user.email).slice(0, 1).toUpperCase();
  $('#todayDate').textContent = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  $('#sideNav').innerHTML = visibleNavItems().map(item => `<a class="nav-item${state.page === item.id ? ' active' : ''}" href="#${item.id}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span></a>`).join('');
  $('#logoutBtn').onclick = logout; renderPage();
}
function renderPage() {
  const view = $('#view'); const page = state.page; $('#pageCrumb').textContent = navItems.find(item => item.id === page)?.label || 'Inicio';
  if (page === 'inicio') {
    view.innerHTML = `<div class="page-kicker">VISTA GENERAL</div><h1 class="page-title">Buen día, ${esc((state.user.name || '').split(' ')[0])}</h1><p class="page-subtitle">Este es el resumen de tu espacio de trabajo.</p><div class="stat-grid"><article class="stat-card"><div class="stat-label">Clientes registrados</div><div class="stat-value" id="clientCount">—</div><div class="stat-foot">Registros activos</div></article><article class="stat-card"><div class="stat-label">Roles del sistema</div><div class="stat-value" id="roleCount">—</div><div class="stat-foot">Perfiles configurados</div></article><article class="stat-card"><div class="stat-label">Estado del sistema</div><div class="stat-value" style="font-size:19px">Operativo</div><div class="stat-foot">Conexión autenticada</div></article></div><section class="panel"><div class="panel-heading"><div><h2>Tu espacio de trabajo</h2><p>Accesos habilitados según tu perfil.</p></div><span class="subtle-tag">${esc((state.user.roles || []).join(', ') || 'Usuario')}</span></div><div class="table-wrap"><table class="table"><thead><tr><th>MÓDULO</th><th>DESCRIPCIÓN</th><th>ESTADO</th></tr></thead><tbody><tr><td class="client-name">Crear Rol</td><td>Configura los perfiles de acceso del taller.</td><td>Disponible</td></tr><tr><td class="client-name">Clientes</td><td>Administra el directorio de clientes.</td><td>Disponible</td></tr></tbody></table></div></section>`;
    Promise.all([privateApi.get('/customers'), privateApi.get('/roles')]).then(([clients, roles]) => { $('#clientCount').textContent = clients.total; $('#roleCount').textContent = roles.filter(role => role.IsActive).length; }).catch(err => notify(err.message, true));
  } else if (page === 'roles_create') {
    window.renderRolesCreateView(view, state.token).catch(error => { view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; });
  } else if (page === 'roles_manage') {
    window.renderRolesManageView(view, state.token).catch(error => { view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; });
  } else if (page === 'clients_create') {
    window.renderClientsCreateView(view, state.token).catch(error => { view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; });
  } else if (page === 'clients_manage') {
    window.renderClientsManageView(view, state.token).catch(error => { view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; });
  } else if (page === 'taller') {
    window.renderWorkshopRegistration(view, state.token);
  } else if (page === 'talleres') {
    window.renderWorkshopsList(view, state.token).catch(error => { view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; });
  } else if (page === 'vehicles_create') {
    window.renderVehiclesCreateView(view, state.token).catch(error => { view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; });
  } else if (page === 'vehicles_manage') {
    window.renderVehiclesManageView(view, state.token).catch(error => { view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; });
  }
}
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1); const authModes = ['login', 'register', 'recover', 'reset'];
  if (state.token && visibleNavItems().some(item => item.id === id)) { state.page = id; enterApp(); }
  else if (!state.token && authModes.includes(id)) showAuth(id);
});
const resetTokenFromLink = new URLSearchParams(location.search).get('token');
if (location.pathname === '/reset-password' && resetTokenFromLink) {
  sessionStorage.removeItem('taller.token');
  sessionStorage.removeItem('taller.user');
  state.token = null; state.user = null;
  showAuth('reset');
  $('#token').value = resetTokenFromLink;
  history.replaceState({}, '', '/');
} else if (state.token && state.user) {
  api.get('/me', state.token).then(result => { state.user = result.user; sessionStorage.setItem('taller.user', JSON.stringify(state.user)); enterApp(); })
    .catch(() => logout());
} else showAuth('login');
