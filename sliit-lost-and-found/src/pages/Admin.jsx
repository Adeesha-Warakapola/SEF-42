import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabaseClient'

function countBy(rows, field) {
  const counts = {}
  rows.forEach((row) => {
    const key = row[field] || 'unknown'
    counts[key] = (counts[key] || 0) + 1
  })
  return counts
}

export default function Admin() {
  const { users, promoteUser } = useApp()
  const [lostItems, setLostItems] = useState([])
  const [foundItems, setFoundItems] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [promotingId, setPromotingId] = useState(null)
  const [promoteError, setPromoteError] = useState('')

  useEffect(() => {
    let active = true
    async function loadAll() {
      const [lostRes, foundRes, claimsRes] = await Promise.all([
        supabase.from('lost_items').select('*'),
        supabase.from('found_items').select('*'),
        supabase.from('claims').select('*'),
      ])
      if (!active) return
      setLostItems(lostRes.data || [])
      setFoundItems(foundRes.data || [])
      setClaims(claimsRes.data || [])
      setLoading(false)
    }
    loadAll()
    return () => {
      active = false
    }
  }, [])

  const lostByStatus = countBy(lostItems, 'status')
  const foundByStatus = countBy(foundItems, 'status')
  const claimsByStatus = countBy(claims, 'status')

  async function handlePromote(user) {
    if (user.role === 'admin') return
    if (!window.confirm(`Promote ${user.name} (${user.email}) to Admin?`)) return

    setPromoteError('')
    setPromotingId(user.id)
    const result = await promoteUser(user.id)
    setPromotingId(null)
    if (!result.success) {
      setPromoteError(result.message)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Campus-wide overview of lost &amp; found activity.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading stats...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total lost items" value={lostItems.length} accent="blue" />
            <StatCard label="Total found items" value={foundItems.length} accent="slate" />
            <StatCard label="Total claims" value={claims.length} accent="amber" />
            <StatCard label="Registered users" value={users.length} accent="green" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatusBreakdown title="Lost items by status" counts={lostByStatus} />
            <StatusBreakdown title="Found items by status" counts={foundByStatus} />
            <StatusBreakdown title="Claims by status" counts={claimsByStatus} />
          </div>

          <section className="mt-10">
            <h2 className="font-semibold text-slate-900">Users</h2>
            {promoteError && (
              <div className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
                {promoteError}
              </div>
            )}
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-2 font-medium text-slate-800">{u.name}</td>
                      <td className="px-4 py-2 text-slate-600">{u.email}</td>
                      <td className="px-4 py-2 capitalize text-slate-600">{u.role}</td>
                      <td className="px-4 py-2">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-slate-400">Already admin</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePromote(u)}
                            disabled={promotingId === u.id}
                            className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            {promotingId === u.id ? 'Promoting...' : 'Promote to Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatusBreakdown({ title, counts }) {
  const entries = Object.entries(counts)
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map(([status, count]) => (
            <li key={status} className="flex items-center justify-between text-sm">
              <span className="capitalize text-slate-600">{status}</span>
              <span className="font-semibold text-slate-900">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
