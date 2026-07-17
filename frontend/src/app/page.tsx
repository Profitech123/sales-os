import {
  Brain,
  CalendarCheck,
  CircleDollarSign,
  ListChecks,
  Target,
} from "lucide-react";
import { getDeals, type Deal } from "@/lib/sales-data";

export const dynamic = "force-dynamic"; // always re-read the second-brain

function scoreColor(score: number | null): string {
  if (score === null) return "bg-zinc-200 text-zinc-600";
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {deal.company}
          </h2>
          {deal.leadName && (
            <p className="text-sm text-zinc-500">{deal.leadName}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${scoreColor(deal.leadScore)}`}
        >
          {deal.leadScore !== null ? `Score ${deal.leadScore}` : deal.type}
        </span>
      </div>

      {deal.summary && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          {deal.summary}
        </p>
      )}

      {deal.nextSteps.length > 0 && (
        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <ListChecks className="h-3.5 w-3.5" />
            Recommended Next Steps
          </h3>
          <ul className="mt-2 space-y-1.5">
            {deal.nextSteps.map((step) => (
              <li key={step} className="flex gap-2 text-sm text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-400">{deal.date}</p>
    </article>
  );
}

const PIPELINE_STATS = [
  { label: "MTD Revenue", value: "$142,500", icon: CircleDollarSign },
  { label: "Close Rate", value: "31%", icon: Target },
  { label: "Meetings Booked", value: "18", icon: CalendarCheck },
];

export default function DashboardPage() {
  const deals = getDeals();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-600 p-2">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Sales OS</h1>
            <p className="text-sm text-zinc-500">
              Second-brain intelligence dashboard
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: deals read from the second-brain */}
          <section className="space-y-4 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Active Deals ({deals.length})
            </h2>
            {deals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                No deals yet — the backend writes research briefs and proposals
                into <code>second-brain/deals</code>.
              </p>
            ) : (
              deals.map((deal) => <DealCard key={deal.slug} deal={deal} />)
            )}
          </section>

          {/* Right column: static pipeline snapshot */}
          <aside>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Pipeline Snapshot
            </h2>
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              {PIPELINE_STATS.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="rounded-lg bg-indigo-50 p-2.5">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="text-xl font-bold text-zinc-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
