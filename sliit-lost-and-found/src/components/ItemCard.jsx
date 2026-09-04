const STATUS_STYLES = {
  open: 'bg-blue-50 text-blue-700',
  matched: 'bg-amber-50 text-amber-700',
  claimed: 'bg-amber-50 text-amber-700',
  returned: 'bg-emerald-50 text-emerald-700',
}

export default function ItemCard({ item, type, canManage, onEdit, onDelete, ownerName, children }) {
  const verb = type === 'found' ? 'Found' : 'Lost'

  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{item.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'
            }`}
          >
            {item.status}
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500">{item.category}</p>
        {item.description && (
          <p className="mt-2 text-sm text-slate-600">{item.description}</p>
        )}
        <dl className="mt-3 space-y-1 text-xs text-slate-500">
          <div className="flex justify-between gap-2">
            <dt>{verb} on</dt>
            <dd>{item.date}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>{verb} at</dt>
            <dd className="text-right">{item.location}</dd>
          </div>
          {ownerName && (
            <div className="flex justify-between gap-2">
              <dt>Reported by</dt>
              <dd>{ownerName}</dd>
            </div>
          )}
        </dl>
      </div>

      {children}

      {canManage && (
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
