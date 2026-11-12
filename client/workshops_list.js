(() => {
  const API = `${window.API_BASE_URL}/workshops`;
  const PAGE_SIZE = 10;
  const RFC = /^[a-zñ&]{3,4}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[a-z0-9]{3}$/i;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const address = row => [row.calle, row.numero, row.colonia, row.municipio, row.estado, row.codigo_postal].filter(Boolean).join(', ');

  window.renderWorkshopsList = async function renderWorkshopsList(container, token) {
    const response = await fetch('./workshops_list.html');
    if (!response.ok) throw new Error('No se pudo cargar la vista de talleres.');
    container.innerHTML = await response.text();
    const rows = container.querySelector('#workshopsRows');
    const dialog = container.querySelector('#workshopEditDialog');
    const form = container.querySelector('#workshopEditForm');
    const state = { page: 1, totalPages: 0 };

    async function request(url, options = {}) {
      const result = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
      const payload = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(payload.error || 'No fue posible completar la solicitud.');
      return payload;
    }

    async function load(page = state.page) {
      rows.innerHTML = '<tr><td colspan="6" class="workshops-loading">Cargando talleres…</td></tr>';
      try {
        const result = await request(`${API}?page=${page}&pageSize=${PAGE_SIZE}`);
        state.page = result.page;
        state.totalPages = result.totalPages;
        container.querySelector('#workshopsTotal').textContent = `${result.total} ${result.total === 1 ? 'taller' : 'talleres'}`;
        container.querySelector('#workshopsPageInfo').textContent = `Página ${result.page} de ${Math.max(result.totalPages, 1)}`;
        container.querySelector('#workshopsPrev').disabled = result.page <= 1;
        container.querySelector('#workshopsNext').disabled = result.page >= result.totalPages;
        rows.innerHTML = result.items.length ? result.items.map(row => {
          const active = Number(row.IsActive) === 1;
          return `<tr><td class="client-name">${esc(row.nombre)}</td><td>${esc(row.rfc)}</td><td>${esc(row.email)}</td><td class="workshops-location">${esc(address(row))}</td><td><span class="workshops-status ${active ? 'active' : 'inactive'}"><i></i>${active ? 'Activo' : 'Inactivo'}</span></td><td><div class="workshops-actions"><button type="button" class="workshops-action" data-edit="${esc(row.id)}" ${active ? '' : 'disabled'}>Editar</button><button type="button" class="workshops-action danger" data-delete="${esc(row.id)}" ${active ? '' : 'disabled'}>Eliminar</button></div></td></tr>`;
        }).join('') : '<tr><td colspan="6" class="workshops-loading">No hay talleres registrados.</td></tr>';
        container._workshopItems = result.items;
      } catch (error) {
        rows.innerHTML = `<tr><td colspan="6" class="workshops-loading">${esc(error.message)}</td></tr>`;
      }
    }

    function openEdit(id) {
      const row = (container._workshopItems || []).find(item => item.id === id);
      if (!row) return;
      for (const [name, value] of Object.entries(row)) {
        const input = form.elements.namedItem(name);
        if (input && input.type !== 'file') input.value = value ?? '';
      }
      form.elements.namedItem('fotografia').value = '';
      dialog.showModal();
    }

    rows.addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit]');
      if (edit) return openEdit(edit.dataset.edit);
      const remove = event.target.closest('[data-delete]');
      if (!remove || !confirm('¿Desactivar este taller? El registro se conservará en la base de datos.')) return;
      remove.disabled = true;
      try {
        const result = await request(`${API}/${encodeURIComponent(remove.dataset.delete)}`, { method: 'DELETE' });
        window.notify?.(result.message || 'Taller desactivado correctamente.');
        const willBeEmpty = rows.querySelectorAll('tr').length === 1 && state.page > 1;
        await load(willBeEmpty ? state.page - 1 : state.page);
      } catch (error) { window.notify?.(error.message, true); remove.disabled = false; }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      if (!form.reportValidity()) return;
      if (!RFC.test(form.elements.rfc.value.trim())) { form.elements.rfc.setCustomValidity('El RFC mexicano debe incluir letras, fecha YYMMDD válida y homoclave.'); form.reportValidity(); form.elements.rfc.setCustomValidity(''); return; }
      button.disabled = true; button.textContent = 'Guardando…';
      try {
        const id = form.elements.namedItem('id').value;
        const result = await request(`${API}/${encodeURIComponent(id)}`, { method: 'PUT', body: new FormData(form) });
        dialog.close();
        window.notify?.(result.message || 'Taller actualizado correctamente.');
        await load();
      } catch (error) { window.notify?.(error.message, true); }
      finally { button.disabled = false; button.textContent = 'Guardar cambios'; }
    });

    container.querySelector('#workshopsPrev').addEventListener('click', () => load(state.page - 1));
    container.querySelector('#workshopsNext').addEventListener('click', () => load(state.page + 1));
    container.querySelector('#workshopClose').addEventListener('click', () => dialog.close());
    container.querySelector('#workshopCancel').addEventListener('click', () => dialog.close());
    await load();
  };
})();
