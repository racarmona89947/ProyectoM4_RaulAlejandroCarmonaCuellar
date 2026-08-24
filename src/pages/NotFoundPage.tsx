import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <h1>Pagina no encontrada</h1>
      <p>La ruta solicitada no existe dentro de la aplicacion.</p>
      <Link className="button button--primary" to="/tasks">
        Volver a tareas
      </Link>
    </main>
  )
}
