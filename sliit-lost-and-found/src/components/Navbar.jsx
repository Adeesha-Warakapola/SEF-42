import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const baseLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/lost', label: 'Lost Items' },
  { to: '/found', label: 'Found Items' },
  { to: '/claims', label: 'Claims' },
]

export default function Navbar() {
  const { currentUser, isAdmin, logout } = useApp()

  const links = isAdmin ? [...baseLinks, { to: '/admin', label: 'Admin' }] : baseLinks

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="rounded-lg bg-blue-600 px-2 py-1 text-sm text-white">SLIIT</span>
          Lost &amp; Found
        </NavLink>

        <nav className="flex flex-wrap gap-1 text-sm font-medium">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {currentUser ? (
            <>
              <span className="text-xs text-slate-500">
                {currentUser.name}{' '}
                <span className="capitalize text-slate-400">({currentUser.role})</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Log in
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
