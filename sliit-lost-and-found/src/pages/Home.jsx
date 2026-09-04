import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [stats, setStats] = useState({
    lost: null,
    found: null,
    returned: null,
    matchedThisWeek: null,
  })

  useEffect(() => {
    let active = true
    async function loadStats() {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [lost, found, returned, matchedThisWeek] = await Promise.all([
        supabase.from('lost_items').select('*', { count: 'exact', head: true }),
        supabase.from('found_items').select('*', { count: 'exact', head: true }),
        supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('created_at', weekAgo),
      ])

      if (!active) return
      setStats({
        lost: lost.count ?? 0,
        found: found.count ?? 0,
        returned: returned.count ?? 0,
        matchedThisWeek: matchedThisWeek.count ?? 0,
      })
    }
    loadStats()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-14 text-center sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-5xl">
            Lost something on campus? Found something? Let's reconnect it.
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            SLIIT Lost &amp; Found is a central place for students to report lost
            belongings, list found items, and safely claim them back — no more
            hoping a stranger posts to the right WhatsApp group.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/lost"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Report a Lost Item
            </Link>
            <Link
              to="/found"
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Report a Found Item
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats + value banner */}
      <section className="mx-auto -mt-6 max-w-5xl px-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
          <StatCard label="Lost items reported" value={stats.lost ?? '—'} accent="blue" />
          <StatCard label="Found items reported" value={stats.found ?? '—'} accent="slate" />
          <StatCard label="Items returned to owners" value={stats.returned ?? '—'} accent="green" />
          <StatCard
            label="Matched this week"
            value={stats.matchedThisWeek ?? '—'}
            accent="amber"
            hint="Claims approved in the last 7 days"
          />
        </div>
      </section>

      {/* Problem explanation */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">The problem we're solving</h2>
            <p className="mt-3 text-slate-600">
              Every semester, SLIIT students misplace ID cards, wallets, phones,
              laptops, water bottles and bags across the Faculty of Computing,
              the library, cafeterias and lecture halls. Right now there is{' '}
              <strong>no central system</strong> to report or search for these
              items — reports are scattered across WhatsApp groups, physical
              notice boards, or word of mouth, and most never reach the
              security office or the owner in time.
            </p>
            <p className="mt-3 text-slate-600">
              The result: items sit unclaimed, honest finders don't know who to
              hand things to, and students lose time and money replacing things
              that were sitting in a lecture hall the whole time.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="font-semibold text-slate-900">Who is affected</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              <li>
                <strong className="text-slate-900">Students who lose items</strong> —
                have no reliable way to report a loss or find out if someone
                has handed it in.
              </li>
              <li>
                <strong className="text-slate-900">Students who find items</strong> —
                want to return them but have no easy way to reach the owner or
                prove a claim is genuine.
              </li>
              <li>
                <strong className="text-slate-900">Campus administration</strong> —
                has no visibility into how many items go missing, where, or
                whether they're being returned.
              </li>
            </ul>
            <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <strong>Success story:</strong> Chamath's scientific calculator,
              lost near the Faculty of Computing, was matched with a found
              report and returned within a day of both reports being filed —
              exactly the kind of match this app is built to create.
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-100 bg-slate-50 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                1
              </div>
              <h3 className="font-semibold text-slate-900">Report</h3>
              <p className="mt-1 text-sm text-slate-600">
                Lost or found something? Report it in under a minute with what,
                where and when.
              </p>
            </div>
            <div className="rounded-xl bg-white p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                2
              </div>
              <h3 className="font-semibold text-slate-900">Search &amp; match</h3>
              <p className="mt-1 text-sm text-slate-600">
                Browse and filter found items by category, location and date to
                spot your item.
              </p>
            </div>
            <div className="rounded-xl bg-white p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                3
              </div>
              <h3 className="font-semibold text-slate-900">Claim &amp; verify</h3>
              <p className="mt-1 text-sm text-slate-600">
                Submit a claim with verifying details; admins confirm it's
                really yours before handover.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
