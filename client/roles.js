(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  async function request(path, token, options = {}) {
    const response = await fetch(`${window.API_BASE_URL}${path}`, { method: options.method || 'GET', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible completar la operación.');
    return payload;
  }
  function toast(message, isError = false) {
    const item = document.createElement('div'); item.className = `toast-message${isError ? ' error' : ''}`; item.setAttribute('role', 'status'); item.textContent = message; document.body.append(item); window.setTimeout(() => item.remove(), 3800);
  }
  function isAdmin() { return JSON.parse(sessionStorage.getItem('taller.user') || 'null')?.roles?.includes('administrador'); }
  async function mount(container, file) {
    if (!isAdmin()) { container.innerHTML = '<div class="empty-state">Se requiere el rol administrador para administrar roles.</div>'; return false; }
    const response = await fetch(`./${file}`); if (!response.ok) throw new Error('No se pudo cargar la vista de roles.');
    container.innerHTML = await response.text(); return true;
  }
  async function renderRolesCreateView(container, token) {
    if (!await mount(container, 'roles_create.html')) return;
    const form = container.querySelector('#roleCreateForm'), button = container.querySelector('#roleCreateButton');
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      button.disabled = true; button.textContent = 'Guardando…';
      try {
        await request('/roles', token, { method: 'POST', body: { name: form.elements.name.value.trim(), description: form.elements.description.value.trim() } });
        form.reset(); toast('Rol creado correctamente.');
      } catch (error) { toast(error.message, true); }
      finally { button.disabled = false; button.textContent = 'Crear rol'; }
    });
  }
  async function renderRolesManageView(container, token) {
    if (!await mount(container, 'roles_manage.html')) return;
    const table = container.querySelector('#rolesTable'), summary = container.querySelector('#rolesSummary'), dialog = container.querySelector('#roleEditDialog'), form = container.querySelector('#roleEditForm');
    let roles = [];
    async function load() {
      table.innerHTML = '<div class="empty-state">Cargando roles…</div>';
      try {
        roles = await request('/roles', token);
        const activeCount = roles.filter(role => Boolean(role.IsActive)).length;
        summary.textContent = `${activeCount} roles activos · ${roles.length - activeCount} suspendidos.`;
        table.innerHTML = roles.length ? `<table class="table roles-table"><thead><tr><th>ROL</th><th>DESCRIPCIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>${roles.map((role, index) => {
          const active = Boolean(role.IsActive);
          return `<tr><td class="client-name">${escapeHtml(role.RoleName)}</td><td>${escapeHtml(role.Description || '—')}</td><td><span class="role-status ${active ? 'active' : 'suspended'}"><i></i>${active ? 'Activo' : 'Suspendido'}</span></td><td><div class="role-actions"><button type="button" class="role-action" data-edit="${index}" ${active ? '' : 'disabled'}>Editar</button><button type="button" class="role-action suspend" data-suspend="${escapeHtml(role.RoleId)}" ${active ? '' : 'disabled'}>Suspender</button></div></td></tr>`;
        }).join('')}</tbody></table>` : '<div class="empty-state">No hay roles registrados.</div>';
      } catch (error) { table.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; summary.textContent = 'No fue posible cargar roles.'; }
    }
    table.addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit]'), suspend = event.target.closest('[data-suspend]');
      if (edit) { const role = roles[Number(edit.dataset.edit)]; if (!role) return; form.elements.roleId.value = role.RoleId; form.elements.name.value = role.RoleName; form.elements.description.value = role.Description || ''; dialog.showModal(); }
      if (suspend && window.confirm('¿Deseas suspender este rol? Se conservará en la base de datos.')) {
        suspend.disabled = true;
        try { await request(`/roles/${encodeURIComponent(suspend.dataset.suspend)}`, token, { method: 'DELETE' }); toast('Rol suspendido correctamente.'); await load(); }
        catch (error) { toast(error.message, true); suspend.disabled = false; }
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      const id = form.elements.roleId.value, button = container.querySelector('#roleEditSave'); button.disabled = true; button.textContent = 'Guardando…';
      try { await request(`/roles/${encodeURIComponent(id)}`, token, { method: 'PUT', body: { name: form.elements.name.value.trim(), description: form.elements.description.value.trim() } }); dialog.close(); toast('Rol actualizado correctamente.'); await load(); }
      catch (error) { toast(error.message, true); }
      finally { button.disabled = false; button.textContent = 'Guardar cambios'; }
    });
    container.querySelector('#roleEditClose').addEventListener('click', () => dialog.close());
    container.querySelector('#roleEditCancel').addEventListener('click', () => dialog.close());
    await load();
  }
  window.renderRolesCreateView = renderRolesCreateView;
  window.renderRolesManageView = renderRolesManageView;
})();
