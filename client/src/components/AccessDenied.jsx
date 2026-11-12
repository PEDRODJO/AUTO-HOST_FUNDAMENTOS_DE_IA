export default function AccessDenied({ message = 'No tienes permisos para acceder a esta sección.' }) {
  return <div className="empty-state access-denied">{message}</div>;
}
