"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  FunnelIcon,
  MaximizeIcon,
  MinimizeIcon,
  MonitorIcon,
  RadioIcon,
  RefreshCwIcon,
  TableIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ThemeToggle } from "@/components/theme-toggle"
import { groupRaces, laneSeconds, laneView, timeAgo, type LaneResult, type Race, type RaceResultRow } from "@/lib/races"

type View = "table" | "board"
const VIEW_KEY = "ruff-results-view"
const AUTO_REFRESH_MS = 3000

export function RaceResults({ rows }: { rows: RaceResultRow[] }) {
  const router = useRouter()
  const [refreshing, startRefresh] = React.useTransition()
  const [view, setView] = React.useState<View>("table")
  const [auto, setAuto] = React.useState(false)

  const races = React.useMemo(() => groupRaces(rows), [rows])

  // Remember the chosen view so a display screen comes back in big mode after a reload.
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY)
      if (saved === "board" || saved === "table") setView(saved)
    } catch {}
  }, [])

  function chooseView(next: View) {
    setView(next)
    // Live display is pointless without fresh data, so turn polling on with it.
    if (next === "board") setAuto(true)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {}
  }

  React.useEffect(() => {
    if (!auto) return
    const id = setInterval(() => startRefresh(() => router.refresh()), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [auto, router])

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex h-10 rounded-lg border border-border bg-card p-1" role="tablist">
          {([
            { id: "table", label: "Table", Icon: TableIcon },
            { id: "board", label: "Big display", Icon: MonitorIcon },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => chooseView(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                view === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className={cn("h-10 gap-2 px-4", auto && "border-success/50 text-success hover:text-success")}
          onClick={() => setAuto((a) => !a)}
          aria-pressed={auto}
        >
          <RadioIcon className={cn(auto && "animate-pulse")} />
          {auto ? "Auto-refresh on" : "Auto-refresh off"}
        </Button>
        <Button
          variant="outline"
          className="h-10 gap-2 px-4"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
          Refresh
        </Button>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {races.length > 0 ? (
        view === "board" ? (
          <LiveBoard race={races[0]} recent={races.slice(1, 7)} />
        ) : (
          <>
            <LatestRace race={races[0]} />
            <RaceTable races={races} />
          </>
        )
      ) : (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          No races uploaded yet.
        </div>
      )}
    </div>
  )
}

type Lane = "left" | "right"

const laneTone: Record<Lane, { text: string; box: string; bar: string }> = {
  left: { text: "text-lane-left", box: "border-lane-left/40 bg-lane-left/10", bar: "bg-lane-left" },
  right: { text: "text-lane-right", box: "border-lane-right/40 bg-lane-right/10", bar: "bg-lane-right" },
}

function LiveBoard({ race, recent }: { race: Race; recent: Race[] }) {
  const ref = React.useRef<HTMLElement>(null)
  const [full, setFull] = React.useState(false)

  React.useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === ref.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else ref.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <section
      ref={ref}
      className={cn(
        "surface-card flex flex-col gap-5 p-5 md:gap-8 md:p-8",
        full && "h-screen justify-center overflow-auto rounded-none border-0 md:p-12"
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip status={race.status} large />
        <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
          Race {race.race}
          <span className="text-muted-foreground"> · Heat {race.heat}</span>
        </h2>
        <span className="text-sm text-muted-foreground md:text-base" suppressHydrationWarning>
          Rev {race.revision} · {timeAgo(race.modified_at)}
        </span>
        <Button variant="outline" className="ml-auto h-10 gap-2 px-4" onClick={toggleFull}>
          {full ? <MinimizeIcon /> : <MaximizeIcon />}
          {full ? "Exit full screen" : "Full screen"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <BoardLane label="Left lane" side="left" lane={race.left} />
        <BoardLane label="Right lane" side="right" lane={race.right} />
      </div>

      {recent.length > 0 && (
        <div>
          <p className="section-label mb-3">Previous races</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((r) => (
              <div key={r.key} className="rounded-lg border border-border bg-surface-hover/40 px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  #{r.race} · H{r.heat}
                </p>
                <p className="mt-1 flex justify-between gap-2 font-mono text-sm font-semibold tabular-nums">
                  <span className="text-lane-left">
                    <TotalText view={laneView(r.left)} />
                  </span>
                  <span className="text-lane-right">
                    <TotalText view={laneView(r.right)} />
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function BoardLane({ label, side, lane }: { label: string; side: Lane; lane: LaneResult | null }) {
  const view = laneView(lane)
  const tone = laneTone[side]
  return (
    <div className={cn("relative min-w-0 overflow-hidden rounded-xl border-2 p-5 md:p-8", tone.box)}>
      <span className={cn("absolute inset-x-0 top-0 h-1.5", tone.bar)} />
      <p className={cn("text-sm font-bold tracking-[0.2em] uppercase md:text-base", tone.text)}>{label}</p>
      <p className="mt-3 text-[clamp(3.5rem,11vw,10rem)] leading-none font-bold tracking-tight tabular-nums">
        <TotalText view={view} />
        {view.total.kind !== "code" && (
          <span className="ml-2 text-[0.3em] font-semibold text-muted-foreground">s</span>
        )}
      </p>
      <p className="mt-4 font-mono text-lg text-muted-foreground md:text-2xl">
        Start <StartText view={view} />
      </p>
      {view.faults.length > 0 && (
        <p className="mt-2 text-lg font-semibold text-danger md:text-xl">{view.faults.join(" · ")}</p>
      )}
    </div>
  )
}

function LatestRace({ race }: { race: Race }) {
  return (
    <section className="surface-card relative overflow-hidden p-5 md:p-6">
      <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <p className="section-label" suppressHydrationWarning>
        Latest · {timeAgo(race.modified_at)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 md:max-w-xl">
        <LaneTotal label="Left total" side="left" lane={race.left} />
        <LaneTotal label="Right total" side="right" lane={race.right} />
      </div>
      <p className="mt-3 text-sm font-medium text-primary">
        Race {race.race} · Heat {race.heat} · Rev {race.revision} · {race.status}
      </p>
    </section>
  )
}

function LaneTotal({ label, side, lane }: { label: string; side: Lane; lane: LaneResult | null }) {
  const view = laneView(lane)
  return (
    <div className="min-w-0">
      <p className={cn("section-label", laneTone[side].text)}>{label}</p>
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

type Column = {
  id: string
  label: string
  sort: (r: Race) => number | string | null
  filter:
    | { kind: "values"; value: (r: Race) => string }
    | {
        kind: "range"
        value: (r: Race) => number | null
        input: "number" | "datetime-local"
        unit?: string
        step?: string
        note?: string
      }
}

const isoTime = (iso: string | null) => (iso ? new Date(iso).getTime() : null)

const columns: Column[] = [
  { id: "status", label: "Status", sort: (r) => r.status, filter: { kind: "values", value: (r) => r.status } },
  { id: "race", label: "Race", sort: (r) => r.race, filter: { kind: "range", value: (r) => r.race, input: "number", step: "1" } },
  { id: "heat", label: "Heat", sort: (r) => r.heat, filter: { kind: "values", value: (r) => String(r.heat) } },
  {
    id: "left",
    label: "Left lane",
    sort: (r) => laneSeconds(r.left),
    filter: { kind: "range", value: (r) => laneSeconds(r.left), input: "number", unit: "s", step: "0.001", note: "FS, DNF and blank times are hidden while a range is set." },
  },
  {
    id: "right",
    label: "Right lane",
    sort: (r) => laneSeconds(r.right),
    filter: { kind: "range", value: (r) => laneSeconds(r.right), input: "number", unit: "s", step: "0.001", note: "FS, DNF and blank times are hidden while a range is set." },
  },
  { id: "updated", label: "Updated", sort: (r) => isoTime(r.modified_at), filter: { kind: "range", value: (r) => isoTime(r.modified_at), input: "datetime-local" } },
]

type ColumnFilter = { hidden?: string[]; min?: string; max?: string }
type Sort = { id: string; dir: "asc" | "desc" } | null

function isActive(f: ColumnFilter | undefined) {
  return !!f && (!!f.hidden?.length || !!f.min || !!f.max)
}

function parseBound(input: "number" | "datetime-local", s: string | undefined, end = false) {
  if (!s) return null
  // datetime-local is minute precision, so "to 18:39" should include 18:39:59.
  const n = input === "number" ? Number(s) : new Date(s).getTime() + (end ? 59_999 : 0)
  return Number.isNaN(n) ? null : n
}

function passes(race: Race, col: Column, f: ColumnFilter | undefined) {
  if (!f) return true
  if (col.filter.kind === "values") return !f.hidden?.includes(col.filter.value(race))
  const min = parseBound(col.filter.input, f.min)
  const max = parseBound(col.filter.input, f.max, true)
  if (min == null && max == null) return true
  const v = col.filter.value(race)
  if (v == null) return false
  return (min == null || v >= min) && (max == null || v <= max)
}

// Blanks always sort last, like a spreadsheet.
function compare(a: number | string | null, b: number | string | null, dir: "asc" | "desc") {
  if (a == null) return b == null ? 0 : 1
  if (b == null) return -1
  const d = typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), undefined, { numeric: true })
  return dir === "asc" ? d : -d
}

function RaceTable({ races }: { races: Race[] }) {
  const [filters, setFilters] = React.useState<Record<string, ColumnFilter>>({})
  const [sort, setSort] = React.useState<Sort>(null)

  const visible = React.useMemo(() => {
    const out = races.filter((r) => columns.every((c) => passes(r, c, filters[c.id])))
    const col = sort && columns.find((c) => c.id === sort.id)
    if (col && sort) out.sort((a, b) => compare(col.sort(a), col.sort(b), sort.dir))
    return out
  }, [races, filters, sort])

  const anyActive = Object.values(filters).some(isActive) || sort != null
  const menu = (col: Column, className?: string) => (
    <ColumnMenu
      key={col.id}
      column={col}
      races={races}
      filter={filters[col.id]}
      sort={sort?.id === col.id ? sort.dir : null}
      onFilter={(f) => setFilters((prev) => ({ ...prev, [col.id]: f }))}
      onSort={(dir) => setSort(dir ? { id: col.id, dir } : null)}
      className={className}
    />
  )

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Race results</h2>
        <span className="text-sm text-muted-foreground">
          {visible.length === races.length ? `${races.length} races` : `${visible.length} of ${races.length} races`}
        </span>
        {anyActive && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => {
              setFilters({})
              setSort(null)
            }}
          >
            <XIcon />
            Clear filters
          </Button>
        )}
      </div>

      {/* Mobile: no header row, so the column menus sit above the list */}
      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3 md:hidden">
        {columns.map((c) => menu(c, "rounded-full border border-border px-3 py-1.5 text-xs"))}
      </div>

      {visible.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No races match these filters.</p>
      )}

      {/* Desktop / tablet: real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c.id} scope="col" className="px-3 py-2 whitespace-nowrap">
                  {menu(c, "px-2 py-1.5")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((race) => (
              <tr
                key={race.key}
                className="border-b border-border align-top transition-colors last:border-0 hover:bg-surface-hover/50"
              >
                <td className="px-5 py-4">
                  <StatusChip status={race.status} />
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="font-semibold tabular-nums">#{race.race}</div>
                  <div className="text-xs text-muted-foreground">Rev {race.revision}</div>
                </td>
                <td className="px-5 py-4 font-semibold tabular-nums">{race.heat}</td>
                <td className="min-w-56 px-5 py-4">
                  <LaneCell lane={race.left} />
                </td>
                <td className="min-w-56 px-5 py-4">
                  <LaneCell lane={race.right} />
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
        {visible.map((race) => (
          <li key={race.key} className="flex flex-col gap-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <StatusChip status={race.status} />
              <span className="font-semibold tabular-nums">Race {race.race}</span>
              <span className="ml-auto text-right text-xs text-muted-foreground" suppressHydrationWarning>
                Heat {race.heat}
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

function ColumnMenu({
  column,
  races,
  filter,
  sort,
  onFilter,
  onSort,
  className,
}: {
  column: Column
  races: Race[]
  filter: ColumnFilter | undefined
  sort: "asc" | "desc" | null
  onFilter: (f: ColumnFilter) => void
  onSort: (dir: "asc" | "desc" | null) => void
  className?: string
}) {
  const active = isActive(filter)
  const SortIcon = sort === "asc" ? ArrowUpIcon : sort === "desc" ? ArrowDownIcon : ArrowUpDownIcon
  const isTime = column.filter.kind === "range" && column.filter.input === "datetime-local"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "section-label inline-flex items-center gap-1.5 rounded-md transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            (active || sort) && "text-primary",
            className
          )}
        >
          {column.label}
          <SortIcon className={cn("size-3.5", !sort && "opacity-40")} />
          {active && <FunnelIcon className="size-3.5 fill-current" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {(["asc", "desc"] as const).map((dir) => (
            <Button
              key={dir}
              variant={sort === dir ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => onSort(sort === dir ? null : dir)}
            >
              {dir === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {dir === "asc" ? (isTime ? "Oldest" : "Low → High") : isTime ? "Newest" : "High → Low"}
            </Button>
          ))}
        </div>

        <div className="border-t border-border pt-3">
          {column.filter.kind === "values" ? (
            <ValuesFilter column={column} races={races} filter={filter} onFilter={onFilter} />
          ) : (
            <div className="flex flex-col gap-2">
              {(["min", "max"] as const).map((bound) => (
                <label key={bound} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {isTime ? (bound === "min" ? "From" : "To") : bound === "min" ? "Min" : "Max"}
                  {column.filter.kind === "range" && column.filter.unit && ` (${column.filter.unit})`}
                  <Input
                    type={column.filter.kind === "range" ? column.filter.input : "number"}
                    step={column.filter.kind === "range" ? column.filter.step : undefined}
                    value={filter?.[bound] ?? ""}
                    onChange={(e) => onFilter({ ...filter, [bound]: e.target.value })}
                  />
                </label>
              ))}
              {column.filter.kind === "range" && column.filter.note && (
                <p className="text-xs text-muted-foreground">{column.filter.note}</p>
              )}
            </div>
          )}
        </div>

        {active && (
          <Button variant="ghost" size="sm" onClick={() => onFilter({})}>
            Clear {column.label.toLowerCase()} filter
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function ValuesFilter({
  column,
  races,
  filter,
  onFilter,
}: {
  column: Column
  races: Race[]
  filter: ColumnFilter | undefined
  onFilter: (f: ColumnFilter) => void
}) {
  const valueOf = column.filter.kind === "values" ? column.filter.value : () => ""
  const options = [...new Set(races.map(valueOf))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
  const hidden = new Set(filter?.hidden ?? [])
  const allShown = options.every((o) => !hidden.has(o))

  return (
    <div className="flex max-h-60 flex-col gap-1 overflow-y-auto text-sm">
      <label className="flex items-center gap-2 rounded px-1 py-1 font-medium hover:bg-surface-hover">
        <input
          type="checkbox"
          className="accent-primary"
          checked={allShown}
          onChange={() => onFilter({ ...filter, hidden: allShown ? options : [] })}
        />
        (Select all)
      </label>
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-surface-hover">
          <input
            type="checkbox"
            className="accent-primary"
            checked={!hidden.has(o)}
            onChange={() => {
              const next = new Set(hidden)
              if (next.has(o)) next.delete(o)
              else next.add(o)
              onFilter({ ...filter, hidden: [...next] })
            }}
          />
          {o}
        </label>
      ))}
    </div>
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
      {/* Per-dog splits hidden for now
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
      */}
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

function StatusChip({ status, large }: { status: Race["status"]; large?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        large && "px-4 py-1.5 text-sm",
        status === "live"
          ? "bg-success/15 text-success ring-1 ring-success/30"
          : "bg-surface-hover text-foreground"
      )}
    >
      {status === "live" && <span className={cn("animate-pulse rounded-full bg-success", large ? "size-2" : "size-1.5")} />}
      {status}
    </span>
  )
}