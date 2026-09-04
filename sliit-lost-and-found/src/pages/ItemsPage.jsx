import { useEffect, useMemo, useState } from 'react'
import ItemCard from '../components/ItemCard'
import ItemForm from '../components/ItemForm'
import SearchFilterBar from '../components/SearchFilterBar'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabaseClient'

const emptyFilters = { search: '', category: '', location: '', date: '' }

export default function ItemsPage({ type }) {
  const table = type === 'found' ? 'found_items' : 'lost_items'
  const title = type === 'found' ? 'Found Items' : 'Lost Items'
  const { currentUser, isAdmin, users } = useApp()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  async function loadItems() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .order('date', { ascending: false })
    if (fetchError) {
      setError('Could not load items right now. Please try again shortly.')
    } else {
      setItems(data || [])
      setError('')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  const usersById = useMemo(() => {
    const map = {}
    users.forEach((u) => (map[u.id] = u.name))
    return map
  }, [users])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
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
  }, [items, filters])

  function describeSaveError(saveError) {
    if (saveError?.code === '23514' && saveError.message?.includes('date_not_future')) {
      return type === 'found'
        ? 'The found date cannot be in the future.'
        : 'The lost date cannot be in the future.'
    }
    return null
  }

  async function handleCreate(values) {
    const { error: insertError } = await supabase.from(table).insert([
      {
        ...values,
        user_id: currentUser?.id || null,
      },
    ])
    if (insertError) {
      setError(
        describeSaveError(insertError) ||
          'Could not save your report. Please check your connection and try again.',
      )
      return
    }
    setShowForm(false)
    loadItems()
  }

  async function handleUpdate(values) {
    const { error: updateError } = await supabase
      .from(table)
      .update(values)
      .eq('id', editingItem.id)
    if (updateError) {
      setError(
        describeSaveError(updateError) || 'Could not save your changes. Please try again.',
      )
      return
    }
    setEditingItem(null)
    loadItems()
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    const { error: deleteError } = await supabase.from(table).delete().eq('id', item.id)
    if (deleteError) {
      setError('Could not delete this item. Please try again.')
      return
    }
    loadItems()
  }

  function canManage(item) {
    if (isAdmin) return true
    return item.user_id === currentUser?.id
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {type === 'found'
              ? 'Browse items handed in by other students, or report one you found.'
              : 'Browse reported losses, or let others know what you lost.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem(null)
            setShowForm((s) => !s)
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? 'Close form' : `Report ${type === 'found' ? 'a found' : 'a lost'} item`}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">
            Report {type === 'found' ? 'a found' : 'a lost'} item
          </h2>
          <ItemForm type={type} onSubmit={handleCreate} submitLabel="Submit report" />
        </div>
      )}

      {editingItem && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Edit item</h2>
          <ItemForm
            type={type}
            initialValues={editingItem}
            onSubmit={handleUpdate}
            onCancel={() => setEditingItem(null)}
            submitLabel="Save changes"
          />
        </div>
      )}

      <div className="mt-6">
        <SearchFilterBar filters={filters} onChange={setFilters} />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Showing {filteredItems.length} of {items.length} items
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading items...</p>
      ) : filteredItems.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No items match your search. Try clearing a filter.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              type={type}
              canManage={canManage(item)}
              onEdit={(it) => {
                setShowForm(false)
                setEditingItem(it)
              }}
              onDelete={handleDelete}
              ownerName={usersById[item.user_id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
