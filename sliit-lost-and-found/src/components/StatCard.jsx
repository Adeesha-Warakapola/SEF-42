export default function StatCard({ label, value, accent = 'blue', hint }) {
  const accents = {
    blue: 'text-blue-700 bg-blue-50',
    green: 'text-emerald-700 bg-emerald-50',
    amber: 'text-amber-700 bg-amber-50',
    slate: 'text-slate-700 bg-slate-100',
  }

  return (
    <div className={`rounded-xl p-4 ${accents[accent]}`}>
      <p className="text-3xl font-bold sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      {hint && <p className="mt-1 text-xs opacity-80">{hint}</p>}
    </div>
  )
}
