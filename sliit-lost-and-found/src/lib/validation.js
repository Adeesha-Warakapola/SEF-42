// Local calendar date (YYYY-MM-DD) — comparing plain date strings avoids
// timezone bugs from constructing Date objects near midnight.
export function todayLocalISODate() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Client-side validation for the report-item form (lost or found).
// Every message tells the student exactly what to fix and why it matters.
export function validateItemForm(values, type) {
  const errors = {}
  const verb = type === 'found' ? 'found' : 'lost'

  if (!values.name || !values.name.trim()) {
    errors.name = "Please give the item a short name, e.g. \"Blue water bottle\"."
  }

  if (!values.category) {
    errors.category = 'Please pick a category so others can filter for it.'
  }

  if (!values.date) {
    errors.date = `Please pick the date you ${verb} it, so we can match reports accurately.`
  } else if (values.date > todayLocalISODate()) {
    errors.date =
      type === 'found'
        ? 'The found date cannot be in the future.'
        : 'The lost date cannot be in the future.'
  }

  if (!values.location || !values.location.trim()) {
    errors.location =
      type === 'found'
        ? 'Please tell us where you found it so the owner can be matched.'
        : 'Please tell us where you lost it so others can help.'
  }

  if (values.description && values.description.length > 500) {
    errors.description = 'Please keep the description under 500 characters.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateClaimForm(values) {
  const errors = {}

  if (!values.verification_info || !values.verification_info.trim()) {
    errors.verification_info =
      'Please add a few details only the real owner would know (a mark, contents, or exactly where it was lost) so we can verify your claim.'
  } else if (values.verification_info.trim().length < 15) {
    errors.verification_info =
      "That's a bit short — add more detail so we can be confident this is really your item."
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
