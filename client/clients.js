(() => {
  const PAGE_SIZE = 10;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const fullName = client => [client.Nombre, client.ApellidoPaterno, client.ApellidoMaterno].filter(Boolean).join(' ');
  async function request(path, token, options = {}) {
    const response = await fetch(`${window.API_BASE_URL}${path}`, { method: options.method || 'GET', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'No fue posible completar la operación.'); return payload;
  }
  function toast(message, isError = false) { const item = document.createElement('div'); item.className = `toast-message${isError ? ' error' : ''}`; item.setAttribute('role', 'status'); item.textContent = message; document.body.append(item); window.setTimeout(() => item.remove(), 3800); }
  function isAdmin() { return JSON.parse(sessionStorage.getItem('taller.user') || 'null')?.roles?.includes('administrador'); }
  async function mount(container, file) {
    if (!isAdmin()) { container.innerHTML = '<div class="empty-state">Se requiere el rol administrador para administrar clientes.</div>'; return false; }
    const response = await fetch(`./${file}`); if (!response.ok) throw new Error('No se pudo cargar la vista de clientes.'); container.innerHTML = await response.text(); return true;
  }
  async function getFormFields() { const response = await fetch('./clients_form_fields.html'); if (!response.ok) throw new Error('No se pudo cargar el formulario de cliente.'); return response.text(); }
  async function setupFields(target, token) {
    target.innerHTML = await getFormFields();
    const select = target.querySelector('[name="TallerId"]');
    const workshops = await request('/clients/workshops', token);
    select.innerHTML = '<option value="">Selecciona un taller activo</option>' + workshops.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('');
    return workshops.length > 0;
  }
  function formData(form) { const result = Object.fromEntries(new FormData(form)); delete result.ClientId; return result; }

  async function renderClientsCreateView(container, token) {
    if (!await mount(container, 'clients_create.html')) return;
    const form = container.querySelector('#clientCreateForm'), save = container.querySelector('#clientCreateSave');
    try { const ready = await setupFields(container.querySelector('#clientCreateFields'), token); save.disabled = !ready; if (!ready) toast('Registra un taller activo antes de crear clientes.', true); }
    catch (error) { toast(error.message, true); }
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      save.disabled = true; save.textContent = 'Guardando…';
      try { await request('/clients', token, { method: 'POST', body: formData(form) }); form.reset(); toast('Cliente creado correctamente.'); }
      catch (error) { toast(error.message, true); }
      finally { save.disabled = false; save.textContent = 'Guardar cliente'; }
    });
  }

  async function renderClientsManageView(container, token) {
    if (!await mount(container, 'clients_manage.html')) return;
    const table = container.querySelector('#clientsTable'), summary = container.querySelector('#clientsSummary'), pagination = container.querySelector('#clientsPagination'), dialog = container.querySelector('#clientEditDialog'), form = container.querySelector('#clientEditForm');
    const vehiclesDialog = container.querySelector('#clientVehiclesDialog'), vehicleForm = container.querySelector('#clientVehicleAssignForm');
    let page = 1, items = [];
    let editFormReady = false;
    try { await setupFields(container.querySelector('#clientEditFields'), token); editFormReady = true; }
    catch (error) { toast(error.message, true); }
    async function load() {
      table.innerHTML = '<div class="empty-state">Cargando registros…</div>';
      try {
        const result = await request(`/clients?page=${page}&pageSize=${PAGE_SIZE}`, token); items = result.items;
        summary.textContent = `${result.total} cliente${result.total === 1 ? '' : 's'} activo${result.total === 1 ? '' : 's'}.`;
        table.innerHTML = items.length ? `<table class="table clients-table"><thead><tr><th>CLIENTE</th><th>CORREO</th><th>TELÉFONO</th><th>TALLER</th><th>DOMICILIO</th><th>ACCIONES</th></tr></thead><tbody>${items.map((client, index) => {
          const initials = fullName(client).split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
          return `<tr><td class="client-name"><span class="initials">${escapeHtml(initials)}</span>${escapeHtml(fullName(client))}</td><td>${escapeHtml(client.Email)}</td><td>${escapeHtml(client.TelefonoPersonal)}</td><td>${escapeHtml(client.TallerNombre || 'Sin asignar')}</td><td>${escapeHtml([client.Colonia, client.Municipio, client.Estado].filter(Boolean).join(', '))}</td><td><div class="clients-actions"><button type="button" class="client-action" data-edit="${index}">Editar</button><button type="button" class="client-action" data-vehicles="${escapeHtml(client.ClientId)}">Vehículos</button><button type="button" class="client-action danger" data-delete="${escapeHtml(client.ClientId)}">Eliminar</button></div></td></tr>`;
        }).join('')}</tbody></table>` : '<div class="empty-state">No hay clientes activos para mostrar.</div>';
        const pages = Math.max(1, result.totalPages); pagination.innerHTML = `<button type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>← Anterior</button><span>Página ${page} de ${pages}</span><button type="button" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Siguiente →</button>`;
      } catch (error) { table.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; pagination.replaceChildren(); }
    }
    function openEdit(client) { form.reset(); form.elements.ClientId.value = client.ClientId; for (const [key, value] of Object.entries(client)) if (form.elements[key]) form.elements[key].value = value ?? ''; dialog.showModal(); }
    async function loadClientVehicles(clientId) {
      vehicleForm.elements.ClientId.value = clientId;
      const select = vehicleForm.elements.VehicleId, assigned = container.querySelector('#clientAssignedVehicles');
      assigned.innerHTML = '<span class="vehicle-empty-photos">Cargando…</span>';
      select.innerHTML = '<option value="">Cargando…</option>';
      try {
        const result = await request(`/clients/${encodeURIComponent(clientId)}/vehicles`, token);
        assigned.innerHTML = result.assigned.length ? result.assigned.map(vehicle => `<div class="vehicle-assigned-item"><strong>${escapeHtml(vehicle.Marca)} ${escapeHtml(vehicle.Modelo)}</strong> · ${escapeHtml(vehicle.Placa)} · ${escapeHtml(vehicle.VIN)} <span class="vehicle-muted">(${escapeHtml(vehicle.Estatus)}${Number(vehicle.IsActive) ? '' : ', inactivo'})</span></div>`).join('') : '<span class="vehicle-empty-photos">Aún no hay vehículos asociados.</span>';
        select.innerHTML = '<option value="">Selecciona un vehículo</option>' + result.available.map(vehicle => `<option value="${escapeHtml(vehicle.id)}">${escapeHtml(vehicle.Marca)} ${escapeHtml(vehicle.Modelo)} ${escapeHtml(vehicle.Anio)} · ${escapeHtml(vehicle.Placa)} · ${escapeHtml(vehicle.VIN)}</option>`).join('');
        container.querySelector('#clientVehicleAssignButton').disabled = !result.available.length;
        if (!result.available.length) select.options[0].textContent = 'No hay vehículos activos disponibles';
      } catch (error) { assigned.textContent = error.message; select.innerHTML = '<option value="">No se pudo cargar el catálogo</option>'; container.querySelector('#clientVehicleAssignButton').disabled = true; }
    }
    async function openClientVehicles(clientId) {
      vehicleForm.elements.ClientId.value = clientId;
      if (!vehiclesDialog.open) vehiclesDialog.showModal();
      await loadClientVehicles(clientId);
    }
    table.addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
      const vehiclesButton = event.target.closest('[data-vehicles]');
      if (vehiclesButton) return openClientVehicles(vehiclesButton.dataset.vehicles);
      if (edit) { if (!editFormReady) return toast('No se pudo cargar el formulario de edición.', true); return openEdit(items[Number(edit.dataset.edit)]); }
      if (remove && window.confirm('¿Deseas desactivar este cliente? El registro se conservará en el sistema.')) {
        remove.disabled = true;
        try { await request(`/clients/${encodeURIComponent(remove.dataset.delete)}`, token, { method: 'DELETE' }); toast('Cliente desactivado correctamente.'); if (items.length === 1 && page > 1) page--; await load(); }
        catch (error) { toast(error.message, true); remove.disabled = false; }
      }
    });
    pagination.addEventListener('click', event => { const button = event.target.closest('[data-page]'); if (!button || button.disabled) return; page = Number(button.dataset.page); load(); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      const id = form.elements.ClientId.value, save = container.querySelector('#clientSaveButton'); save.disabled = true; save.textContent = 'Guardando…';
      try { await request(`/clients/${encodeURIComponent(id)}`, token, { method: 'PUT', body: formData(form) }); dialog.close(); toast('Cliente actualizado correctamente.'); await load(); }
      catch (error) { toast(error.message, true); }
      finally { save.disabled = false; save.textContent = 'Guardar cambios'; }
    });
    vehicleForm.addEventListener('submit', async event => {
      event.preventDefault(); if (!vehicleForm.reportValidity()) return;
      const button = container.querySelector('#clientVehicleAssignButton'); button.disabled = true; button.textContent = 'Asociando…';
      try {
        const clientId = vehicleForm.elements.ClientId.value;
        await request(`/clients/${encodeURIComponent(clientId)}/vehicles`, token, { method: 'PUT', body: { vehicleId: vehicleForm.elements.VehicleId.value } });
        toast('Vehículo asociado correctamente.'); await loadClientVehicles(clientId);
      } catch (error) { toast(error.message, true); button.disabled = false; }
      finally { button.textContent = 'Asociar vehículo'; }
    });
    container.querySelector('#clientDialogClose').addEventListener('click', () => dialog.close()); container.querySelector('#clientCancelButton').addEventListener('click', () => dialog.close());
    container.querySelector('#clientVehiclesClose').addEventListener('click', () => vehiclesDialog.close()); container.querySelector('#clientVehiclesCancel').addEventListener('click', () => vehiclesDialog.close());
    await load();
  }
  window.renderClientsCreateView = renderClientsCreateView;
  window.renderClientsManageView = renderClientsManageView;
})();
