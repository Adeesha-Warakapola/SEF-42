import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import { RequireAdmin, RequireAuth } from './components/ProtectedRoute'
import { AppProvider } from './context/AppContext'
import { supabaseConfigured } from './lib/supabaseClient'
import Admin from './pages/Admin'
import Claims from './pages/Claims'
import FoundItems from './pages/FoundItems'
import Home from './pages/Home'
import Login from './pages/Login'
import LostItems from './pages/LostItems'
import Register from './pages/Register'

export default function App() {
  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col bg-white">
        {!supabaseConfigured && (
          <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-800">
            Supabase isn't configured yet — copy .env.example to .env and add
            your project URL and anon key to load real data.
          </div>
        )}
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/lost"
              element={
                <RequireAuth>
                  <LostItems />
                </RequireAuth>
              }
            />
            <Route
              path="/found"
              element={
                <RequireAuth>
                  <FoundItems />
                </RequireAuth>
              }
            />
            <Route
              path="/claims"
              element={
                <RequireAuth>
                  <Claims />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              }
            />
          </Routes>
        </main>
        <footer className="border-t border-slate-100 px-4 py-6 text-center text-xs text-slate-400">
          SLIIT Lost &amp; Found — built to help students reunite with their belongings.
        </footer>
      </div>
    </AppProvider>
  )
}
