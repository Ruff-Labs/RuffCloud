// Race results as the board uploads them to Supabase (see RuffFirmware
// docs/supabase-schema.md). One row per lane per race.
export type Lane = "Left" | "Right"

export type RaceResultRow = {
  id: number
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
}

export type LaneResult = Pick<
  RaceResultRow,
  "splits_ms" | "race_time" | "early_passes"
>

export type Race = {
  key: string
  heat: number
  race: number
  status: "live" | "final"
  revision: number
  modified_at: string | null
  left: LaneResult | null
  right: LaneResult | null
}

// join the Left/Right rows of each race and sort newest first.
export function groupRaces(rows: RaceResultRow[]): Race[] {
  const byKey = new Map<string, Race>()
  for (const row of rows) {
    const key = String(row.race)
    let race = byKey.get(key)
    if (!race) {
      race = {
        key,
        heat: row.heat,
        race: row.race,
        status: row.status ?? "final",
        revision: row.revision ?? 1,
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

// pp to 3 decimals, without trailing zeros: 1200 → "1.2", 5493 → "5.493".
export function formatSeconds(ms: number) {
  return String(Number((ms / 1000).toFixed(3)))
}

// total lane time in seconds or null for FS / DNF / no time.
export function laneSeconds(lane: LaneResult | null) {
  const t = lane?.race_time
  return t != null && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) / 1000 : null
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

// placeholder rows until the dashboard reads from Supabase.
const T = "2026-10-23T"
export const sampleRows: RaceResultRow[] = [
  { id: 1, heat: 6, race: 23, lane: "Left", start_time: `${T}18:39:02Z`, splits_ms: [100, 1200, 1400, 1300, 1500], race_time: "5500", modified_at: `${T}18:39:20Z`, operator: "Layla" },
  { id: 2, heat: 6, race: 23, lane: "Right", start_time: null, splits_ms: null, race_time: null, modified_at: `${T}18:39:20Z`, operator: "Layla" },
  { id: 3, heat: 6, race: 22, lane: "Left", start_time: `${T}18:31:40Z`, splits_ms: [200, 1400, 1200, 1600, 1300], race_time: "5700", modified_at: `${T}18:32:00Z`, operator: "Layla" },
  { id: 4, heat: 6, race: 22, lane: "Right", start_time: `${T}18:31:40Z`, splits_ms: [-100, 1100, 1300, 1200, 1400], race_time: "4900", modified_at: `${T}18:32:00Z`, operator: "Layla", early_passes: [4] },
  { id: 5, heat: 5, race: 21, lane: "Left", start_time: `${T}18:20:11Z`, splits_ms: [100, 1500, 1400, 1700, 1200], race_time: "5900", modified_at: `${T}18:20:30Z`, operator: "Layla" },
  { id: 6, heat: 5, race: 21, lane: "Right", start_time: `${T}18:20:11Z`, splits_ms: [-200, 1300, 1100, 1500, 1400], race_time: "5100", modified_at: `${T}18:20:30Z`, operator: "Layla", early_passes: [2, 4] },
  { id: 7, heat: 5, race: 20, lane: "Left", start_time: `${T}18:12:51Z`, splits_ms: [-300, 1600], race_time: "1300", modified_at: `${T}18:13:05Z`, operator: "Layla" },
  { id: 8, heat: 5, race: 20, lane: "Right", start_time: `${T}18:12:51Z`, splits_ms: [100, 1200, 1500, 1300, 1400], race_time: "5500", modified_at: `${T}18:13:05Z`, operator: "Layla", early_passes: [3] },
  { id: 9, heat: 4, race: 19, lane: "Left", start_time: `${T}18:04:30Z`, splits_ms: [200, 1800], race_time: "DNF", modified_at: `${T}18:05:02Z`, operator: "Layla", revision: 2 },
  { id: 10, heat: 4, race: 19, lane: "Right", start_time: `${T}18:04:30Z`, splits_ms: [100, 1400, 1600, 1200, 1300], race_time: "5600", modified_at: `${T}18:05:02Z`, operator: "Layla", early_passes: [2] },
  { id: 11, heat: 1, race: 4, lane: "Left", start_time: `${T}17:50:00Z`, splits_ms: [200, 1300, 1400, 1200, 1500], race_time: "5600", modified_at: `${T}17:50:22Z`, operator: "Sam", status: "live" },
  { id: 12, heat: 1, race: 4, lane: "Right", start_time: `${T}17:50:00Z`, splits_ms: [200], race_time: "FS", modified_at: `${T}17:50:22Z`, operator: "Sam", status: "live" },
]
