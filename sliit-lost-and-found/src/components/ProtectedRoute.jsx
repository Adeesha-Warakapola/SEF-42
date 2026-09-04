import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function RequireAuth({ children }) {
  const { currentUser, authLoading } = useApp()
  const location = useLocation()

  if (authLoading) {
    return <p className="px-4 py-16 text-center text-sm text-slate-500">Loading...</p>
  }
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export function RequireAdmin({ children }) {
  const { currentUser, isAdmin, authLoading } = useApp()

  if (authLoading) {
    return <p className="px-4 py-16 text-center text-sm text-slate-500">Loading...</p>
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}
