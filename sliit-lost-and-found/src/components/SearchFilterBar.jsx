import { CATEGORIES, LOCATIONS } from '../lib/constants'

export default function SearchFilterBar({ filters, onChange }) {
  function set(field, value) {
    onChange({ ...filters, [field]: value })
  }

  const hasActiveFilters =
    filters.search || filters.category || filters.location || filters.date

  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
      <input
        type="text"
        placeholder="Search by name or description..."
        className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-4"
        value={filters.search}
        onChange={(e) => set('search', e.target.value)}
      />
      <select
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={filters.category}
        onChange={(e) => set('category', e.target.value)}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={filters.location}
        onChange={(e) => set('location', e.target.value)}
      >
        <option value="">All locations</option>
        {LOCATIONS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={filters.date}
        onChange={(e) => set('date', e.target.value)}
      />
      <button
        type="button"
        disabled={!hasActiveFilters}
        onClick={() => onChange({ search: '', category: '', location: '', date: '' })}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
      >
        Clear filters
      </button>
    </div>
  )
}
