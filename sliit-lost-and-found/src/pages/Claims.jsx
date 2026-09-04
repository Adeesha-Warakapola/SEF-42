import { useEffect, useMemo, useState } from 'react'
import ClaimDetailsModal from '../components/ClaimDetailsModal'
import SearchFilterBar from '../components/SearchFilterBar'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabaseClient'
import { validateClaimForm } from '../lib/validation'

const emptyFilters = { search: '', category: '', location: '', date: '' }

const CLAIM_STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

export default function Claims() {
  const { currentUser, isAdmin, users, decideClaim: decideClaimRpc } = useApp()

  const [foundItems, setFoundItems] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [claimingItem, setClaimingItem] = useState(null)
  const [verificationInfo, setVerificationInfo] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewingClaim, setViewingClaim] = useState(null)
  const [deciding, setDeciding] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [foundRes, claimsRes] = await Promise.all([
      supabase.from('found_items').select('*').order('date', { ascending: false }),
      supabase.from('claims').select('*').order('created_at', { ascending: false }),
    ])
    if (foundRes.error || claimsRes.error) {
      setError('Could not load claims data right now. Please try again shortly.')
    } else {
      setFoundItems(foundRes.data || [])
      setClaims(claimsRes.data || [])
      setError('')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const usersById = useMemo(() => {
    const map = {}
    users.forEach((u) => (map[u.id] = u))
    return map
  }, [users])

  const itemsById = useMemo(() => {
    const map = {}
    foundItems.forEach((i) => (map[i.id] = i))
    return map
  }, [foundItems])

  const claimableItems = useMemo(() => {
    return foundItems.filter((item) => {
      if (item.status !== 'open') return false
      if (filters.category && item.category !== filters.category) return false
      if (filters.location && item.location !== filters.location) return false
      if (filters.date && item.date !== filters.date) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const haystack = `${item.name} ${item.description || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [foundItems, filters])

  const visibleClaims = useMemo(() => {
    if (isAdmin) return claims
    return claims.filter((c) => c.claimant_id === currentUser?.id)
  }, [claims, isAdmin, currentUser])

  async function submitClaim(e) {
    e.preventDefault()
    const { valid, errors } = validateClaimForm({ verification_info: verificationInfo })
    if (!valid) {
      setFormError(errors.verification_info)
      return
    }
    setSubmitting(true)
    const { error: insertError } = await supabase.from('claims').insert([
      {
        found_item_id: claimingItem.id,
        claimant_id: currentUser?.id || null,
        verification_info: verificationInfo.trim(),
        status: 'pending',
      },
    ])
    setSubmitting(false)
    if (insertError) {
      setFormError('Could not submit your claim. Please try again.')
      return
    }
    setClaimingItem(null)
    setVerificationInfo('')
    setFormError('')
    loadAll()
  }

  async function decideClaim(claim, status) {
    setError('')
    setDeciding(true)
    const result = await decideClaimRpc(claim.id, status)
    setDeciding(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setViewingClaim(null)
    loadAll()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Claims</h1>
      <p className="mt-1 text-sm text-slate-500">
        Browse found items and submit a claim with details only the real owner
        would know. {isAdmin ? 'As an admin, approve or reject claims below.' : ''}
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Claim form modal-ish panel */}
      {claimingItem && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Claim "{claimingItem.name}"
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Found at {claimingItem.location} on {claimingItem.date}
          </p>
          <form onSubmit={submitClaim} noValidate className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Verification details
              </label>
              <textarea
                rows={3}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  formError ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder="Describe a mark, contents, or exact circumstances that prove this is yours..."
                value={verificationInfo}
                onChange={(e) => setVerificationInfo(e.target.value)}
              />
              {formError && <p className="mt-1 text-sm text-red-600">{formError}</p>}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit claim'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setClaimingItem(null)
                  setFormError('')
                  setVerificationInfo('')
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Browse claimable found items */}
      <section className="mt-8">
        <h2 className="font-semibold text-slate-900">Found items open to claim</h2>
        <div className="mt-3">
          <SearchFilterBar filters={filters} onChange={setFilters} />
        </div>
        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : claimableItems.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No open found items match your search right now.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {claimableItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">{item.category}</p>
                  {item.description && (
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Found at {item.location} on {item.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClaimingItem(item)
                    setVerificationInfo('')
                    setFormError('')
                  }}
                  className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Claim this item
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Claims list */}
      <section className="mt-10">
        <h2 className="font-semibold text-slate-900">
          {isAdmin ? 'All claims' : 'My claims'}
        </h2>
        {visibleClaims.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {isAdmin ? 'No claims submitted yet.' : "You haven't submitted any claims yet."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  {isAdmin && <th className="px-4 py-2">Claimant</th>}
                  <th className="px-4 py-2">Details</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleClaims.map((claim) => {
                  const item = itemsById[claim.found_item_id]
                  return (
                    <tr key={claim.id}>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {item ? item.name : 'Item removed'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2 text-slate-600">
                          {usersById[claim.claimant_id]?.name || 'Unknown'}
                        </td>
                      )}
                      <td className="px-4 py-2 max-w-xs text-slate-600">
                        {claim.verification_info}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            CLAIM_STATUS_STYLES[claim.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingClaim(claim)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            View details
                          </button>
                          {isAdmin && claim.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => decideClaim(claim, 'approved')}
                                className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => decideClaim(claim, 'rejected')}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!isAdmin && (
        <p className="mt-4 text-xs text-slate-400">
          Showing claims submitted from your account, {currentUser?.name}.
        </p>
      )}

      {viewingClaim && (
        <ClaimDetailsModal
          claim={viewingClaim}
          item={itemsById[viewingClaim.found_item_id]}
          claimant={usersById[viewingClaim.claimant_id]}
          reporter={usersById[itemsById[viewingClaim.found_item_id]?.user_id]}
          canDecide={isAdmin}
          deciding={deciding}
          onClose={() => setViewingClaim(null)}
          onApprove={() => decideClaim(viewingClaim, 'approved')}
          onReject={() => decideClaim(viewingClaim, 'rejected')}
        />
      )}
    </div>
  )
}
