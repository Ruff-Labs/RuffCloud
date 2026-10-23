"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronDownIcon, RefreshCwIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { groupRaces, laneView, timeAgo, type LaneResult, type Race, type RaceResultRow } from "@/lib/races"

export function RaceResults({ rows }: { rows: RaceResultRow[] }) {
  const router = useRouter()
  const [refreshing, startRefresh] = React.useTransition()

  const boards = React.useMemo(() => [...new Set(rows.map((r) => r.board_id))].sort(), [rows])
  const [board, setBoard] = React.useState(boards[0] ?? "")
  const races = React.useMemo(
    () => groupRaces(rows.filter((r) => r.board_id === board)),
    [rows, board]
  )

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            aria-label="Board"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            className="h-10 min-w-44 appearance-none rounded-lg border border-border bg-card pr-10 pl-4 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {boards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <ThemeToggle />
        <Button
          variant="outline"
          className="h-10 gap-2 px-4"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {races.length > 0 ? (
        <>
          <LatestRace race={races[0]} />
          <RaceTable races={races} />
        </>
      ) : (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          No races uploaded for this board yet.
        </div>
      )}
    </div>
  )
}

function LatestRace({ race }: { race: Race }) {
  return (
    <section className="surface-card p-5 md:p-6">
      <p className="section-label" suppressHydrationWarning>
        {race.board_id} · {timeAgo(race.modified_at)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 md:max-w-xl">
        <LaneTotal label="Left total" lane={race.left} />
        <LaneTotal label="Right total" lane={race.right} />
      </div>
      <p className="mt-3 text-sm text-primary/80">
        Race {race.race} · Heat {race.heat} · Rev {race.revision} · {race.status}
      </p>
    </section>
  )
}

function LaneTotal({ label, lane }: { label: string; lane: LaneResult | null }) {
  const view = laneView(lane)
  return (
    <div className="min-w-0">
      <p className="section-label">{label}</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
        <TotalText view={view} />
        {view.total.kind !== "code" && (
          <span className="ml-1 text-base font-medium text-muted-foreground">s</span>
        )}
      </p>
      <p className="mt-2 font-mono text-sm text-muted-foreground">
        Start: <StartText view={view} />
      </p>
    </div>
  )
}

function RaceTable({ races }: { races: Race[] }) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Race results</h2>
        <span className="text-sm text-muted-foreground">{races.length} races</span>
      </div>

      {/* Desktop / tablet: real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Status", "Race", "Left lane", "Right lane", "Firmware", "Updated"].map((h) => (
                <th key={h} scope="col" className="section-label px-5 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {races.map((race) => (
              <tr
                key={race.key}
                className="border-b border-border align-top transition-colors last:border-0 hover:bg-surface-hover/50"
              >
                <td className="px-5 py-4">
                  <StatusChip status={race.status} />
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="font-semibold tabular-nums">#{race.race}</div>
                  <div className="text-xs text-muted-foreground">
                    Heat {race.heat} · Rev {race.revision}
                  </div>
                </td>
                <td className="min-w-56 px-5 py-4">
                  <LaneCell lane={race.left} />
                </td>
                <td className="min-w-56 px-5 py-4">
                  <LaneCell lane={race.right} />
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                  {race.firmware ?? "—"}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
                  {timeAgo(race.modified_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per race, lanes stacked */}
      <ul className="divide-y divide-border md:hidden">
        {races.map((race) => (
          <li key={race.key} className="flex flex-col gap-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <StatusChip status={race.status} />
              <span className="font-semibold tabular-nums">Race {race.race}</span>
              <span className="ml-auto text-right text-xs text-muted-foreground" suppressHydrationWarning>
                Heat {race.heat} · {race.firmware ?? "—"}
                <br />
                {timeAgo(race.modified_at)}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-hover/40 p-3">
                <p className="section-label mb-2 text-xs">Left lane</p>
                <LaneCell lane={race.left} />
              </div>
              <div className="rounded-lg bg-surface-hover/40 p-3">
                <p className="section-label mb-2 text-xs">Right lane</p>
                <LaneCell lane={race.right} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LaneCell({ lane }: { lane: LaneResult | null }) {
  const view = laneView(lane)
  return (
    <div className="flex flex-col gap-1">
      <p className="text-base font-bold tabular-nums">
        <TotalText view={view} />
        {view.total.kind !== "code" && "s"}
      </p>
      <p className="font-mono text-sm text-muted-foreground">
        Start: <StartText view={view} />
      </p>
      <p className="font-mono text-sm leading-relaxed">
        {view.dogs.length === 0
          ? "—"
          : view.dogs.map((d, i) => (
              <React.Fragment key={d.dog}>
                {i > 0 && ", "}
                <span className={cn("whitespace-nowrap", d.fault && "text-danger")}>
                  D{d.dog} {d.value}
                </span>
              </React.Fragment>
            ))}
      </p>
      {view.faults.length > 0 && (
        <p className="text-sm font-semibold text-danger/85">{view.faults.join(" · ")}</p>
      )}
    </div>
  )
}

function TotalText({ view }: { view: ReturnType<typeof laneView> }) {
  if (view.total.kind === "none") return <>—</>
  if (view.total.kind === "code") return <span className="text-danger">{view.total.value}</span>
  return <>{view.total.value}</>
}

function StartText({ view }: { view: ReturnType<typeof laneView> }) {
  if (!view.start) return <>—</>
  return <span className={cn(view.start.early && "text-danger")}>{view.start.value}s</span>
}

function StatusChip({ status }: { status: Race["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        status === "live"
          ? "bg-success/15 text-success"
          : "bg-surface-hover text-foreground"
      )}
    >
      {status === "live" && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
      {status}
    </span>
  )
}
