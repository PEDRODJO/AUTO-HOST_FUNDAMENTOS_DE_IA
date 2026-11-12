(() => {
  const EMAIL_PATTERN = "[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+";
  const RFC_PATTERN = '[A-Za-zÑñ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Za-z0-9]{3}';
  let postalRequest = 0;

  async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.status === 404 ? 'Ese CP no está en el catálogo SEPOMEX importado.' : 'La consulta del código postal no fue exitosa.');
    return response.json();
  }

  function notifyWorkshop(message, isError = true) {
    const toast = document.createElement('div');
    toast.className = `toast-message${isError ? ' error' : ''}`;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 4500);
  }

  function setField(form, name, value) {
    const field = form.elements.namedItem(name);
    if (field) field.value = value || '';
  }

  function allowManualAddress(form) {
    ['estado', 'municipio', 'colonia'].forEach(name => {
      const field = form.elements[name];
      field.disabled = false;
      if ('readOnly' in field) field.readOnly = false;
    });
  }

  function restoreColoniaInput(form) {
    const current = form.elements.colonia;
    if (current.tagName !== 'SELECT') return current;
    const input = document.createElement('input');
    input.id = 'workshopColonia'; input.name = 'colonia'; input.maxLength = 120;
    input.autocomplete = 'address-level3'; input.required = true;
    current.replaceWith(input);
    return input;
  }

  function setColoniaOptions(form, names) {
    if (names.length < 2) {
      const input = restoreColoniaInput(form);
      input.value = names[0] || '';
      return;
    }
    const current = form.elements.colonia;
    const select = document.createElement('select');
    select.id = 'workshopColonia'; select.name = 'colonia'; select.required = true;
    const prompt = document.createElement('option');
    prompt.value = ''; prompt.textContent = 'Selecciona una colonia'; prompt.disabled = true; prompt.selected = true;
    select.append(prompt);
    names.forEach(name => {
      const option = document.createElement('option'); option.value = name; option.textContent = name;
      select.append(option);
    });
    current.replaceWith(select);
  }

  async function lookupPostalCode(form) {
    const cp = form.elements.codigo_postal.value.trim();
    if (!/^\d{5}$/.test(cp)) return;
    const requestId = ++postalRequest;
    allowManualAddress(form);
    try {
      const payload = await getJson(`${window.API_BASE_URL}/sepomex/${encodeURIComponent(cp)}`);
      if (requestId !== postalRequest) return;
      const colonias = [...new Set((payload.colonias || []).filter(Boolean))];
      if (!payload.estado || !payload.municipio || !colonias.length) throw new Error('La respuesta SEPOMEX no contiene ubicación para ese CP.');
      setField(form, 'estado', payload.estado);
      setField(form, 'municipio', payload.municipio);
      setColoniaOptions(form, colonias);
    } catch (error) {
      if (requestId === postalRequest) {
        console.error('Error al consultar el catálogo SEPOMEX local:', error);
        restoreColoniaInput(form);
        notifyWorkshop(`${error.message} Puedes completar la dirección manualmente.`);
      }
    } finally { allowManualAddress(form); }
  }

  function renderWorkshopRegistration(container, token) {
    container.innerHTML = `
      <div class="page-kicker">DIRECTORIO CORPORATIVO</div>
      <h1 class="page-title">Registro de taller</h1>
      <p class="page-subtitle">Completa la información fiscal, de contacto y domicilio del taller.</p>
      <form id="workshopRegistrationForm" class="workshop-form" enctype="multipart/form-data" novalidate>
        <section class="workshop-panel">
          <div class="workshop-section-head"><div><span class="workshop-step">01</span><div><h2>Datos del taller</h2><p>Información de identificación y contacto.</p></div></div><span class="workshop-status"><i>✓</i> ACTIVO</span></div>
          <div class="workshop-fields">
            <div class="workshop-field"><label for="workshopNombre">Nombre del taller <b>*</b></label><input id="workshopNombre" name="nombre" maxlength="160" autocomplete="organization" required></div>
            <div class="workshop-field"><label for="workshopRfc">RFC <b>*</b></label><input id="workshopRfc" name="rfc" pattern="${RFC_PATTERN}" maxlength="13" minlength="12" title="Formato mexicano: 3 o 4 letras (puede incluir Ñ o &amp;), fecha válida YYMMDD y homoclave de 3 caracteres" autocapitalize="characters" required><small>Formato SAT: 12 caracteres (moral) o 13 (persona física), con fecha y homoclave.</small></div>
            <div class="workshop-field"><label for="workshopEmail">Correo electrónico <b>*</b></label><input id="workshopEmail" name="email" type="email" pattern="${EMAIL_PATTERN}" maxlength="254" autocomplete="email" required></div>
            <div class="workshop-field"><label for="workshopPhoto">Fotografía del taller <b>*</b></label><input id="workshopPhoto" name="fotografia" type="file" accept="image/jpeg,image/png,image/webp" required><small>JPG, PNG o WEBP. Peso máximo 15 MB.</small></div>
          </div>
        </section>
        <section class="workshop-panel">
          <div class="workshop-section-head"><div><span class="workshop-step">02</span><div><h2>Domicilio</h2><p>La búsqueda por CP y por colonia actualiza los campos relacionados.</p></div></div></div>
          <div class="workshop-fields workshop-address-grid">
            <div class="workshop-field"><label for="workshopCalle">Calle <b>*</b></label><input id="workshopCalle" name="calle" maxlength="160" autocomplete="address-line1" required></div>
            <div class="workshop-field"><label for="workshopNumero">Número <b>*</b></label><input id="workshopNumero" name="numero" maxlength="30" autocomplete="address-line2" required></div>
            <div class="workshop-field"><label for="workshopCp">Código postal <b>*</b></label><input id="workshopCp" name="codigo_postal" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" autocomplete="postal-code" required><small id="postalHint">Escribe cinco dígitos para buscar.</small></div>
            <div class="workshop-field"><label for="workshopColonia">Colonia <b>*</b></label><input id="workshopColonia" name="colonia" maxlength="120" autocomplete="address-level3" required><datalist id="workshop-colonias"></datalist></div>
            <div class="workshop-field"><label for="workshopEstado">Estado <b>*</b></label><input id="workshopEstado" name="estado" maxlength="100" autocomplete="address-level1" required></div>
            <div class="workshop-field"><label for="workshopMunicipio">Municipio <b>*</b></label><input id="workshopMunicipio" name="municipio" maxlength="120" autocomplete="address-level2" required></div>
          </div>
          <div class="workshop-actions"><span>Los campos marcados con <b>*</b> son obligatorios.</span><button class="primary-btn" id="workshopSubmit" type="submit">Registrar taller</button></div>
        </section>
      </form>
      <dialog class="workshop-success-modal" id="workshopSuccessModal" aria-labelledby="workshopSuccessTitle"><div class="success-mark">✓</div><h2 id="workshopSuccessTitle">Taller registrado</h2><p id="workshopSuccessMessage">El taller se guardó con estatus activo.</p><button class="primary-btn" type="button" id="workshopSuccessClose">Entendido</button></dialog>`;

    const form = container.querySelector('#workshopRegistrationForm');
    const cp = form.elements.codigo_postal;
    allowManualAddress(form);
    let cpTimer;
    cp.addEventListener('input', () => {
      window.clearTimeout(cpTimer);
      postalRequest++;
      const hint = form.querySelector('#postalHint');
      if (/^\d{5}$/.test(cp.value.trim())) {
        hint.textContent = 'Buscando ubicación…';
        cpTimer = window.setTimeout(() => lookupPostalCode(form).finally(() => { hint.textContent = 'Puedes ajustar la colonia si hay varias opciones.'; }), 300);
      } else {
        restoreColoniaInput(form);
        allowManualAddress(form);
        hint.textContent = 'Escribe cinco dígitos para buscar.';
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const rfc = form.elements.rfc.value.trim(); const email = form.elements.email.value.trim();
      if (!new RegExp(`^${RFC_PATTERN}$`, 'i').test(rfc)) return notifyWorkshop('El RFC no tiene un formato mexicano válido. Revisa las letras, fecha YYMMDD y homoclave.');
      if (!new RegExp(`^${EMAIL_PATTERN}$`, 'i').test(email)) return notifyWorkshop('Captura un correo electrónico válido.');
      if (!/^\d{5}$/.test(cp.value.trim())) return notifyWorkshop('El código postal debe tener cinco dígitos.');
      if (!form.reportValidity()) return;
      if (form.elements.fotografia.files[0].size > 15 * 1024 * 1024) return notifyWorkshop('La fotografía no puede superar 15 MB.');

      const button = form.querySelector('#workshopSubmit');
      button.disabled = true;
      button.textContent = 'Cargando...';
      try {
        const response = await fetch(`${window.API_BASE_URL}/workshops`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: new FormData(form) });
        const result = await response.json().catch(() => ({}));
        if (response.status === 409) throw new Error(result.error || 'RFC o correo duplicado.');
        if (response.status === 400) throw new Error(result.error || 'Revisa los datos del formulario.');
        if (!response.ok) throw new Error(result.error || 'No fue posible registrar el taller.');
        const modal = container.querySelector('#workshopSuccessModal');
        modal.querySelector('#workshopSuccessMessage').textContent = `“${result.taller?.nombre || 'Taller'}” quedó registrado con estatus Activo.`;
        form.reset();
        modal.showModal();
      } catch (error) { notifyWorkshop(error.message); }
      finally { button.disabled = false; button.textContent = 'Registrar taller'; }
    });

    const modal = container.querySelector('#workshopSuccessModal');
    modal.querySelector('#workshopSuccessClose').addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  }

  window.renderWorkshopRegistration = renderWorkshopRegistration;
})();
