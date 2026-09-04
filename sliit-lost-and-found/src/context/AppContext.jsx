import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AppContext = createContext(null)
const STORAGE_KEY = 'sliit-lost-found-session-token'

const SAFE_USER_COLUMNS = 'id, name, email, role'

function friendlyRpcError(error, fallback) {
  return error?.message || fallback
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [users, setUsers] = useState([])

  // Restore a previous session (if any) on first load. The token is
  // re-verified against the sessions table server-side — a stale or
  // tampered token in localStorage simply fails to restore.
  useEffect(() => {
    let active = true
    async function restoreSession() {
      const savedToken = localStorage.getItem(STORAGE_KEY)
      if (savedToken) {
        const { data, error } = await supabase
          .rpc('current_session_user', { p_token: savedToken })
          .maybeSingle()
        if (!active) return
        if (!error && data) {
          setCurrentUser(data)
          setToken(savedToken)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      if (active) setAuthLoading(false)
    }
    restoreSession()
    return () => {
      active = false
    }
  }, [])

  async function refreshUsers() {
    const { data } = await supabase
      .from('users')
      .select(SAFE_USER_COLUMNS)
      .order('name', { ascending: true })
    if (data) setUsers(data)
    return data || []
  }

  useEffect(() => {
    refreshUsers()
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase
      .rpc('login_user', { p_email: email.trim(), p_password: password })
      .maybeSingle()

    if (error || !data) {
      return {
        success: false,
        message: friendlyRpcError(
          error,
          "We couldn't find an account with that email and password. Please check your details and try again.",
        ),
      }
    }

    setCurrentUser({ id: data.id, name: data.name, email: data.email, role: data.role })
    setToken(data.token)
    localStorage.setItem(STORAGE_KEY, data.token)
    return { success: true }
  }

  async function register(name, email, password) {
    const { data, error } = await supabase
      .rpc('register_user', { p_name: name.trim(), p_email: email.trim(), p_password: password })
      .maybeSingle()

    if (error || !data) {
      return {
        success: false,
        message: friendlyRpcError(error, 'Could not create your account. Please try again.'),
      }
    }

    setCurrentUser({ id: data.id, name: data.name, email: data.email, role: data.role })
    setToken(data.token)
    localStorage.setItem(STORAGE_KEY, data.token)
    refreshUsers()
    return { success: true }
  }

  function logout() {
    if (token) {
      supabase.rpc('logout_user', { p_token: token })
    }
    setCurrentUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  // Admin-only actions. Authorization is enforced server-side inside
  // the RPC (it checks the caller's session role before writing) — the
  // isAdmin check here is only for a snappier UI, not the real gate.
  async function promoteUser(targetUserId) {
    const { data, error } = await supabase
      .rpc('admin_promote_user', { p_token: token, p_target_user_id: targetUserId })
      .maybeSingle()

    if (error || !data) {
      return {
        success: false,
        message: friendlyRpcError(error, 'Could not promote this user. Please try again.'),
      }
    }

    setUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, role: data.role } : u)))
    return { success: true }
  }

  async function decideClaim(claimId, decision) {
    const { data, error } = await supabase
      .rpc('admin_decide_claim', { p_token: token, p_claim_id: claimId, p_decision: decision })
      .maybeSingle()

    if (error || !data) {
      return {
        success: false,
        message: friendlyRpcError(error, 'Could not update this claim. Please try again.'),
      }
    }

    return { success: true, claim: data }
  }

  const isAdmin = currentUser?.role === 'admin'

  const value = {
    currentUser,
    authLoading,
    isAdmin,
    users,
    login,
    register,
    logout,
    promoteUser,
    decideClaim,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within an AppProvider')
  return ctx
}
