// Race results as the board uploads them to Supabase (see RuffFirmware
// docs/supabase-schema.md). One row per lane per race.
export type Lane = "Left" | "Right"

export type RaceResultRow = {
  id: number
  board_id: string
  heat: number
  race: number
  lane: Lane
  start_time: string | null
  splits_ms: number[] | null // [FirstPass, Dog1..Dog9]; FirstPass < 0 = early start
  race_time: string | null // ms, or "FS" / "DNF"
  modified_at: string | null
  operator: string | null
  // Not in race_results yet: shown when present.
  early_passes?: number[] // 1-based dog numbers that passed early
  status?: "live" | "final"
  revision?: number
  firmware?: string
}

export type LaneResult = Pick<
  RaceResultRow,
  "splits_ms" | "race_time" | "early_passes"
>

export type Race = {
  key: string
  board_id: string
  heat: number
  race: number
  status: "live" | "final"
  revision: number
  firmware: string | null
  modified_at: string | null
  left: LaneResult | null
  right: LaneResult | null
}

// Join the Left/Right rows of each race and sort newest first.
export function groupRaces(rows: RaceResultRow[]): Race[] {
  const byKey = new Map<string, Race>()
  for (const row of rows) {
    const key = `${row.board_id}:${row.race}`
    let race = byKey.get(key)
    if (!race) {
      race = {
        key,
        board_id: row.board_id,
        heat: row.heat,
        race: row.race,
        status: row.status ?? "final",
        revision: row.revision ?? 1,
        firmware: row.firmware ?? null,
        modified_at: row.modified_at,
        left: null,
        right: null,
      }
      byKey.set(key, race)
    }
    if (row.modified_at && (!race.modified_at || row.modified_at > race.modified_at)) {
      race.modified_at = row.modified_at
    }
    const lane = { splits_ms: row.splits_ms, race_time: row.race_time, early_passes: row.early_passes }
    if (row.lane === "Left") race.left = lane
    else race.right = lane
  }
  return [...byKey.values()].sort((a, b) => b.race - a.race)
}

export function formatSeconds(ms: number) {
  return (ms / 1000).toFixed(3)
}

export type LaneView = {
  total: { kind: "time"; value: string } | { kind: "code"; value: string } | { kind: "none" }
  start: { value: string; early: boolean } | null
  dogs: { dog: number; value: string; fault: boolean }[]
  faults: string[]
}

export function laneView(lane: LaneResult | null): LaneView {
  const raceTime = lane?.race_time ?? null
  const total: LaneView["total"] =
    raceTime == null || raceTime === ""
      ? { kind: "none" }
      : /^-?\d+(\.\d+)?$/.test(raceTime)
        ? { kind: "time", value: formatSeconds(Number(raceTime)) }
        : { kind: "code", value: raceTime }

  const splits = lane?.splits_ms ?? []
  const firstPass = splits.length > 0 ? splits[0] : null
  const earlyStart = firstPass != null && firstPass < 0
  const earlyPasses = new Set(lane?.early_passes ?? [])

  const dogs = splits.slice(1).map((ms, i) => {
    const dog = i + 1
    return {
      dog,
      value: formatSeconds(ms),
      fault: (dog === 1 && earlyStart) || earlyPasses.has(dog),
    }
  })

  const faults: string[] = []
  if (earlyStart) faults.push("D1 early start")
  for (const dog of [...earlyPasses].sort((a, b) => a - b)) faults.push(`D${dog} early pass`)

  return {
    total,
    start: firstPass == null ? null : { value: formatSeconds(firstPass), early: earlyStart },
    dogs,
    faults,
  }
}

export function timeAgo(iso: string | null, now = Date.now()) {
  if (!iso) return "—"
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? "" : "s"} ago`
}

// Placeholder rows until the dashboard reads from Supabase.
const T = "2026-10-23T"
export const sampleRows: RaceResultRow[] = [
  { id: 1, board_id: "Light Tree Pero", heat: 6, race: 23, lane: "Left", start_time: `${T}18:39:02Z`, splits_ms: [56, 3860, 3770, 3773, 3934], race_time: "15393", modified_at: `${T}18:39:20Z`, operator: "Layla", firmware: "1.6.5-test10" },
  { id: 2, board_id: "Light Tree Pero", heat: 6, race: 23, lane: "Right", start_time: null, splits_ms: null, race_time: null, modified_at: `${T}18:39:20Z`, operator: "Layla", firmware: "1.6.5-test10" },
  { id: 3, board_id: "Light Tree Pero", heat: 6, race: 22, lane: "Left", start_time: `${T}18:31:40Z`, splits_ms: [67, 3828, 3800, 3820, 3822], race_time: "15337", modified_at: `${T}18:32:00Z`, operator: "Layla", firmware: "1.6.5-test10" },
  { id: 4, board_id: "Light Tree Pero", heat: 6, race: 22, lane: "Right", start_time: `${T}18:31:40Z`, splits_ms: [-15, 3765, 3827, 3761, 3740], race_time: "15078", modified_at: `${T}18:32:00Z`, operator: "Layla", early_passes: [4], firmware: "1.6.5-test10" },
  { id: 5, board_id: "Light Tree Pero", heat: 5, race: 21, lane: "Left", start_time: `${T}18:20:11Z`, splits_ms: [122, 3928, 3951, 3998, 3941], race_time: "15940", modified_at: `${T}18:20:30Z`, operator: "Layla", firmware: "1.6.5-test10" },
  { id: 6, board_id: "Light Tree Pero", heat: 5, race: 21, lane: "Right", start_time: `${T}18:20:11Z`, splits_ms: [-7, 3812, 3776, 4126, 3668], race_time: "15375", modified_at: `${T}18:20:30Z`, operator: "Layla", early_passes: [2, 4], firmware: "1.6.5-test10" },
  { id: 7, board_id: "Light Tree Pero", heat: 5, race: 20, lane: "Left", start_time: `${T}18:12:51Z`, splits_ms: [-991, 6258], race_time: "5267", modified_at: `${T}18:13:05Z`, operator: "Layla", firmware: "1.6.5-test10" },
  { id: 8, board_id: "Light Tree Pero", heat: 5, race: 20, lane: "Right", start_time: `${T}18:12:51Z`, splits_ms: [82, 3765, 3947, 3811, 3990], race_time: "15595", modified_at: `${T}18:13:05Z`, operator: "Layla", early_passes: [3], firmware: "1.6.5-test10" },
  { id: 9, board_id: "Light Tree Pero", heat: 4, race: 19, lane: "Left", start_time: `${T}18:04:30Z`, splits_ms: [558, 4088], race_time: "DNF", modified_at: `${T}18:05:02Z`, operator: "Layla", revision: 2, firmware: "1.6.5-test10" },
  { id: 10, board_id: "Light Tree Pero", heat: 4, race: 19, lane: "Right", start_time: `${T}18:04:30Z`, splits_ms: [91, 3781, 4259, 3947, 3989], race_time: "16067", modified_at: `${T}18:05:02Z`, operator: "Layla", early_passes: [2], firmware: "1.6.5-test10" },
  { id: 11, board_id: "Ring 2 Board", heat: 1, race: 4, lane: "Left", start_time: `${T}17:50:00Z`, splits_ms: [140, 4012, 3988, 4105, 4020], race_time: "16265", modified_at: `${T}17:50:22Z`, operator: "Sam", status: "live", firmware: "1.6.4" },
  { id: 12, board_id: "Ring 2 Board", heat: 1, race: 4, lane: "Right", start_time: `${T}17:50:00Z`, splits_ms: [210], race_time: "FS", modified_at: `${T}17:50:22Z`, operator: "Sam", status: "live", firmware: "1.6.4" },
]
