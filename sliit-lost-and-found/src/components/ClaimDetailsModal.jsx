export default function ClaimDetailsModal({ claim, item, claimant, reporter, canDecide, onClose, onApprove, onReject, deciding }) {
  if (!claim) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Claim details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Claim ID</dt>
            <dd className="break-all text-slate-700">{claim.id}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Claiming user</dt>
            <dd className="text-slate-700">
              {claimant?.name || 'Unknown'}
              {claimant?.email && <span className="text-slate-500"> — {claimant.email}</span>}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Claim submitted</dt>
            <dd className="text-slate-700">
              {claim.created_at ? new Date(claim.created_at).toLocaleString() : '—'}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Claim status</dt>
            <dd className="capitalize text-slate-700">{claim.status}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Claim request</dt>
            <dd className="whitespace-pre-wrap text-slate-700">{claim.verification_info}</dd>
          </div>

          <hr className="border-slate-100" />

          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Found item</dt>
            <dd className="text-slate-700">
              {item ? `${item.name} (${item.category})` : 'Item removed'}
            </dd>
          </div>

          {item && (
            <>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Item ID</dt>
                <dd className="break-all text-slate-700">{item.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Item description</dt>
                <dd className="text-slate-700">{item.description || 'No description provided.'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Found at / on</dt>
                <dd className="text-slate-700">
                  {item.location} — {item.date}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Item status</dt>
                <dd className="capitalize text-slate-700">{item.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Reported by</dt>
                <dd className="text-slate-700">
                  {reporter?.name || 'Unknown'}
                  {reporter?.email && <span className="text-slate-500"> — {reporter.email}</span>}
                </dd>
              </div>
            </>
          )}
        </dl>

        {canDecide && claim.status === 'pending' ? (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onApprove}
              disabled={deciding}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {deciding ? 'Saving...' : 'Approve claim'}
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={deciding}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {deciding ? 'Saving...' : 'Reject claim'}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-xs text-slate-400">
            {claim.status === 'pending'
              ? 'Waiting for an admin to review this claim.'
              : 'This claim has already been decided.'}
          </p>
        )}
      </div>
    </div>
  )
}
