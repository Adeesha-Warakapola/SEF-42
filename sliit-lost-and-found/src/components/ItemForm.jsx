import { useState } from 'react'
import { CATEGORIES, LOCATIONS } from '../lib/constants'
import { todayLocalISODate, validateItemForm } from '../lib/validation'

const empty = { name: '', category: '', description: '', date: '', location: '' }

export default function ItemForm({ type, initialValues, onSubmit, onCancel, submitLabel }) {
  const [values, setValues] = useState({ ...empty, ...initialValues })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { valid, errors: nextErrors } = validateItemForm(values, type)
    setErrors(nextErrors)
    if (!valid) return

    setSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setSubmitting(false)
    }
  }

  const verb = type === 'found' ? 'found' : 'lost'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Item name</label>
        <input
          type="text"
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            errors.name ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="e.g. Black Wallet"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              errors.category ? 'border-red-400' : 'border-slate-300'
            }`}
            value={values.category}
            onChange={(e) => set('category', e.target.value)}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date {verb}
          </label>
          <input
            type="date"
            max={todayLocalISODate()}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              errors.date ? 'border-red-400' : 'border-slate-300'
            }`}
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Location {verb}
        </label>
        <select
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            errors.location ? 'border-red-400' : 'border-slate-300'
          }`}
          value={values.location}
          onChange={(e) => set('location', e.target.value)}
        >
          <option value="">Select a location</option>
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            errors.description ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="Any details that could help identify the item (color, brand, marks...)"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
