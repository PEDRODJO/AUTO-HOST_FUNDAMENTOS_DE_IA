const definitions = [
  ['Nombre', 'Nombre', 'text', 80, true], ['Apellido paterno', 'ApellidoPaterno', 'text', 80, true], ['Apellido materno', 'ApellidoMaterno', 'text', 80, false],
  ['Correo electrónico', 'Email', 'email', 254, true], ['Teléfono personal', 'TelefonoPersonal', 'tel', 30, true], ['Teléfono de trabajo', 'TelefonoTrabajo', 'tel', 30, false],
  ['Teléfono de emergencia', 'TelefonoEmergencia', 'tel', 30, true], ['Nombre contacto de emergencia', 'NombreContactoEmergencia', 'text', 120, true],
  ['Apellido paterno contacto', 'ApellidoPaternoContactoEmergencia', 'text', 80, true], ['Apellido materno contacto', 'ApellidoMaternoContactoEmergencia', 'text', 80, false],
  ['Calle', 'Calle', 'text', 160, true], ['Número', 'Numero', 'text', 30, true], ['Colonia', 'Colonia', 'text', 120, true],
  ['Estado', 'Estado', 'text', 100, true], ['Municipio', 'Municipio', 'text', 120, true]
];

export default function ClientFields({ value, onChange, workshops }) {
  return <>
    <div className="client-form-section"><h3>Información personal</h3><div className="client-form-grid">
      {definitions.slice(0, 10).map(([label, name, type, maxLength, required]) => <label key={name}>{label}{required && ' *'}<input name={name} type={type} maxLength={maxLength} value={value[name] || ''} onChange={onChange} required={required} /></label>)}
    </div></div>
    <div className="client-form-section"><h3>Domicilio y asignación</h3><div className="client-form-grid">
      {definitions.slice(10).map(([label, name, type, maxLength, required]) => <label key={name}>{label} *<input name={name} type={type} maxLength={maxLength} value={value[name] || ''} onChange={onChange} required={required} /></label>)}
      <label>Código postal *<input name="CodigoPostal" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={value.CodigoPostal || ''} onChange={onChange} required /></label>
      <label className="client-workshop-field">Taller *<select name="TallerId" value={value.TallerId || ''} onChange={onChange} required><option value="">Selecciona un taller activo</option>{workshops.map(workshop => <option key={workshop.id} value={workshop.id}>{workshop.nombre}</option>)}</select></label>
    </div></div>
  </>;
}
