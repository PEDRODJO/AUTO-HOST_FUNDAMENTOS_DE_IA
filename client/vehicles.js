(() => {
  const API = window.API_BASE_URL;
  const PAGE_SIZE = 10;
  const VIN_PATTERN = /^[a-hj-npr-z0-9]{17}$/;
  const PLATE_PATTERN = /^(?:[a-z]{3}\d{4}|[a-z]{2}\d{4}[a-z]|[a-z]{3}\d{3}[a-z])$/;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const userRoles = () => JSON.parse(sessionStorage.getItem('taller.user') || 'null')?.roles || [];
  const canAccess = () => userRoles().some(role => ['admin', 'administrador', 'recepcionista'].includes(role));
  const cleanPlate = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '');
  const readPhotos = value => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };
  function toast(message, error = false) {
    const element = document.createElement('div'); element.className = `toast-message${error ? ' error' : ''}`; element.setAttribute('role', error ? 'alert' : 'status'); element.textContent = message; document.body.append(element); window.setTimeout(() => element.remove(), 4000);
  }
  async function request(path, token, options = {}) {
    const response = await fetch(`${API}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No fue posible completar la operación.');
    return payload;
  }
  async function mount(container, viewFile) {
    if (!canAccess()) { container.innerHTML = '<div class="empty-state">Se requiere el rol admin o recepcionista para acceder a Vehículos.</div>'; return false; }
    const response = await fetch(`./${viewFile}`); if (!response.ok) throw new Error('No se pudo cargar la vista de vehículos.');
    container.innerHTML = await response.text();
    return true;
  }
  function setYearLimits(container) {
    const maxYear = String(new Date().getFullYear() + 1);
    container.querySelectorAll('[name="Anio"]').forEach(field => { field.max = maxYear; });
  }
  async function loadMechanics(token) {
    return request('/vehicles/mechanics', token);
  }
  function fillMechanicSelect(select, mechanics) {
    select.innerHTML = '<option value="">Sin asignar</option>' + mechanics.map(mechanic => `<option value="${escapeHtml(mechanic.UserId)}">${escapeHtml(mechanic.DisplayName)}</option>`).join('');
  }
  function validatePhotoFiles(input) {
    if (input.files.length > 10) return 'Puedes adjuntar hasta 10 fotografías.';
    if ([...input.files].some(file => file.size > 15 * 1024 * 1024)) return 'Cada fotografía puede pesar como máximo 15 MB.';
    return null;
  }
  function normalizeForm(form) {
    form.elements.VIN.value = form.elements.VIN.value.trim().toLowerCase();
    form.elements.Placa.value = cleanPlate(form.elements.Placa.value);
  }
  function wireNormalizers(form) {
    form.elements.VIN.addEventListener('input', () => { form.elements.VIN.value = form.elements.VIN.value.toLowerCase().replace(/\s/g, ''); });
    form.elements.Placa.addEventListener('input', () => { form.elements.Placa.value = cleanPlate(form.elements.Placa.value); });
    form.elements.fotos.addEventListener('change', () => {
      const error = validatePhotoFiles(form.elements.fotos);
      if (error) { toast(error, true); form.elements.fotos.value = ''; }
    });
  }

  async function renderVehiclesCreateView(container, token) {
    if (!await mount(container, 'vehicles_create.html')) return;
    const form = container.querySelector('#vehicleCreateForm'), button = container.querySelector('#vehicleCreateSubmit');
    setYearLimits(container);
    try { fillMechanicSelect(form.elements.MecanicoId, await loadMechanics(token)); }
    catch (error) { toast(`No se pudo cargar el catálogo de mecánicos: ${error.message}`, true); }
    wireNormalizers(form);
    form.addEventListener('submit', async event => {
      event.preventDefault(); normalizeForm(form);
      if (!VIN_PATTERN.test(form.elements.VIN.value)) { form.elements.VIN.setCustomValidity('El VIN debe tener 17 caracteres en minúsculas y excluir I, O y Q.'); form.reportValidity(); form.elements.VIN.setCustomValidity(''); return; }
      if (!PLATE_PATTERN.test(form.elements.Placa.value)) { form.elements.Placa.setCustomValidity('Usa un formato admitido: ABC1234, AB123CD o ABC123D.'); form.reportValidity(); form.elements.Placa.setCustomValidity(''); return; }
      const photoError = validatePhotoFiles(form.elements.fotos); if (photoError) return toast(photoError, true);
      if (!form.reportValidity()) return;
      button.disabled = true; button.textContent = 'Guardando…';
      try {
        const result = await request('/vehicles', token, { method: 'POST', body: new FormData(form) });
        form.reset(); toast(result.message || 'Vehículo registrado correctamente.');
      } catch (error) { toast(error.message, true); }
      finally { button.disabled = false; button.textContent = 'Registrar vehículo'; }
    });
  }

  async function renderVehiclesManageView(container, token) {
    if (!await mount(container, 'vehicles_manage.html')) return;
    const rows = container.querySelector('#vehicleRows'), summary = container.querySelector('#vehicleSummary');
    const dialog = container.querySelector('#vehicleEditDialog'), form = container.querySelector('#vehicleEditForm');
    const includeInactiveControl = container.querySelector('#vehicleIncludeInactive');
    const objectUrls = [];
    let page = 1, totalPages = 0, items = [], mechanics = [];
    setYearLimits(container);
    try {
      mechanics = await loadMechanics(token);
      fillMechanicSelect(form.elements.MecanicoId, mechanics);
    } catch (error) { toast(`No se pudo cargar el catálogo de mecánicos: ${error.message}`, true); }
    wireNormalizers(form);

    async function loadPhotoThumbnails(scope) {
      for (const image of scope.querySelectorAll('[data-photo-path]')) {
        const photoPath = image.dataset.photoPath;
        try {
          const response = await fetch(new URL(photoPath, API).href, { headers: { Authorization: `Bearer ${token}` } });
          if (!response.ok) throw new Error('No se pudo cargar la fotografía.');
          const url = URL.createObjectURL(await response.blob()); objectUrls.push(url); image.src = url;
        } catch (error) { image.alt = error.message; image.classList.add('photo-unavailable'); }
      }
    }
    async function load(targetPage = page) {
      for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url);
      rows.innerHTML = '<tr><td colspan="7" class="vehicle-loading">Cargando vehículos…</td></tr>';
      try {
        const result = await request(`/vehicles?page=${targetPage}&pageSize=${PAGE_SIZE}&includeInactive=${includeInactiveControl.checked}`, token);
        page = result.page; totalPages = result.totalPages;
        items = result.items;
        summary.textContent = `${result.total} vehículo${result.total === 1 ? '' : 's'} ${includeInactiveControl.checked ? 'en total' : 'activo(s)'}.`;
        container.querySelector('#vehiclePageInfo').textContent = `Página ${page} de ${Math.max(totalPages, 1)}`;
        container.querySelector('#vehiclePrev').disabled = page <= 1;
        container.querySelector('#vehicleNext').disabled = page >= totalPages;
        rows.innerHTML = items.length ? items.map((vehicle, index) => {
          const photos = readPhotos(vehicle.Fotos);
          const status = Number(vehicle.IsActive) !== 1 ? 'desactivado' : vehicle.Estatus;
          const badge = status === 'activo' ? 'active' : status === 'en_taller' ? 'workshop' : 'inactive';
          const photoMarkup = photos.length ? `<div class="vehicle-photo-list">${photos.slice(0, 2).map((photo, photoIndex) => `<img class="vehicle-thumb" data-photo-path="${escapeHtml(photo)}" alt="Foto ${photoIndex + 1} de ${escapeHtml(vehicle.Marca)} ${escapeHtml(vehicle.Modelo)}" loading="lazy">`).join('')}${photos.length > 2 ? `<span class="vehicle-photo-count">+${photos.length - 2}</span>` : ''}</div>` : '<span class="vehicle-empty-photos">Sin fotos</span>';
          return `<tr><td>${photoMarkup}</td><td><strong>${escapeHtml(vehicle.VIN)}</strong><br><span class="vehicle-muted">${escapeHtml(vehicle.Placa)}</span></td><td class="vehicle-name-cell">${escapeHtml(vehicle.Marca)} ${escapeHtml(vehicle.Modelo)}<br><span class="vehicle-muted">${escapeHtml(vehicle.Anio)} · ${escapeHtml(vehicle.Version)} · ${escapeHtml(vehicle.Color)}</span></td><td><span class="vehicle-status ${badge}"><i></i>${escapeHtml(status.replace('_', ' '))}</span></td><td>${escapeHtml(vehicle.MecanicoNombre || 'Sin asignar')}</td><td>${escapeHtml(vehicle.ClienteNombre || 'Sin asignar')}</td><td><div class="vehicle-actions"><button type="button" class="vehicle-action" data-edit="${index}" ${Number(vehicle.IsActive) === 1 ? '' : 'disabled'}>Editar</button><button type="button" class="vehicle-action danger" data-delete="${escapeHtml(vehicle.id)}" ${Number(vehicle.IsActive) === 1 ? '' : 'disabled'}>Eliminar</button></div></td></tr>`;
        }).join('') : '<tr><td colspan="7" class="vehicle-loading">No hay vehículos para mostrar.</td></tr>';
        await loadPhotoThumbnails(rows);
      } catch (error) {
        rows.innerHTML = `<tr><td colspan="7" class="vehicle-loading">${escapeHtml(error.message)}</td></tr>`;
        summary.textContent = 'No fue posible cargar los vehículos.';
      }
    }
    function openEdit(vehicle) {
      form.reset();
      for (const field of ['id', 'VIN', 'Placa', 'Marca', 'Modelo', 'Anio', 'Version', 'Color', 'Estatus', 'MecanicoId']) {
        if (form.elements[field]) form.elements[field].value = vehicle[field] ?? '';
      }
      const currentPhotos = container.querySelector('#vehicleCurrentPhotos');
      const photos = readPhotos(vehicle.Fotos);
      currentPhotos.innerHTML = photos.length ? photos.map((photo, index) => `<img data-photo-path="${escapeHtml(photo)}" alt="Fotografía existente ${index + 1}" loading="lazy">`).join('') : '<span class="vehicle-empty-photos">Este vehículo no tiene fotografías.</span>';
      dialog.showModal(); loadPhotoThumbnails(currentPhotos);
    }
    rows.addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
      if (edit) return openEdit(items[Number(edit.dataset.edit)]);
      if (remove && window.confirm('¿Desactivar este vehículo? Se conservarán sus datos y fotografías.')) {
        remove.disabled = true;
        try {
          const result = await request(`/vehicles/${encodeURIComponent(remove.dataset.delete)}`, token, { method: 'DELETE' });
          toast(result.message || 'Vehículo desactivado correctamente.');
          const finalRowOnPage = rows.querySelectorAll('tr').length === 1;
          await load(finalRowOnPage && page > 1 ? page - 1 : page);
        } catch (error) { toast(error.message, true); remove.disabled = false; }
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault(); normalizeForm(form);
      if (!VIN_PATTERN.test(form.elements.VIN.value) || !PLATE_PATTERN.test(form.elements.Placa.value)) return toast('Revisa el formato del VIN y de la placa.', true);
      const photoError = validatePhotoFiles(form.elements.fotos); if (photoError) return toast(photoError, true);
      if (!form.reportValidity()) return;
      const button = container.querySelector('#vehicleEditSubmit'); button.disabled = true; button.textContent = 'Guardando…';
      try {
        const id = form.elements.id.value;
        const result = await request(`/vehicles/${encodeURIComponent(id)}`, token, { method: 'PUT', body: new FormData(form) });
        dialog.close(); toast(result.message || 'Vehículo actualizado correctamente.'); await load(page);
      } catch (error) { toast(error.message, true); }
      finally { button.disabled = false; button.textContent = 'Guardar cambios'; }
    });
    container.querySelector('#vehiclePrev').addEventListener('click', () => load(page - 1));
    container.querySelector('#vehicleNext').addEventListener('click', () => load(page + 1));
    includeInactiveControl.addEventListener('change', () => load(1));
    container.querySelector('#vehicleEditClose').addEventListener('click', () => dialog.close());
    container.querySelector('#vehicleEditCancel').addEventListener('click', () => dialog.close());
    await load();
  }

  window.renderVehiclesCreateView = renderVehiclesCreateView;
  window.renderVehiclesManageView = renderVehiclesManageView;
})();
