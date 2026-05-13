import { TimetableEntry } from "../api/client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOT_TIMES = ["8:00", "8:55", "9:50", "10:45", "11:40", "12:35", "1:30"];
const SLOTS = SLOT_TIMES.length;

interface Props {
  entries: TimetableEntry[];
  title?: string;
  /** What to display in each cell besides the subject code */
  cellAccessor?: (e: TimetableEntry) => string;
}

export default function TimetableGrid({ entries, title, cellAccessor }: Props) {
  // grid[day][slot] = entry or null. Lab entries (length=2) cover 2 slots.
  const grid: (TimetableEntry | null)[][] = Array.from({ length: 5 }, () => Array(SLOTS).fill(null));
  for (const e of entries) {
    for (let off = 0; off < e.length; off++) {
      if (e.start_slot + off < SLOTS) grid[e.day][e.start_slot + off] = e;
    }
  }

  return (
    <div className="card overflow-x-auto">
      {title && <h3 className="text-base font-semibold text-gray-800 mb-3">{title}</h3>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 w-24">Day</th>
            {SLOT_TIMES.map((t, i) => (
              <th key={i} className="border border-gray-200 bg-gray-50 px-3 py-2 text-center font-semibold text-gray-700 min-w-[110px]">
                <div>{t}</div>
                <div className="text-[10px] font-normal text-gray-500">Slot {i + 1}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, dayIdx) => {
            // Skip cells that are the continuation of a 2-slot lab
            const skip = new Set<number>();
            return (
              <tr key={d}>
                <td className="border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-700">{d}</td>
                {SLOT_TIMES.map((_, slotIdx) => {
                  if (skip.has(slotIdx)) return null;
                  const e = grid[dayIdx][slotIdx];
                  if (e && e.start_slot === slotIdx) {
                    if (e.length === 2) skip.add(slotIdx + 1);
                    const isLab = e.course_type === "lab";
                    const baseColor = isLab ? "bg-amber-50 border-amber-300" : "bg-brand-50 border-brand-300";
                    return (
                      <td
                        key={slotIdx}
                        colSpan={e.length}
                        className={`border ${baseColor} px-2 py-1.5 align-top`}
                      >
                        <div className="font-semibold text-gray-900 text-xs">{e.subject_code}</div>
                        <div className="text-[11px] text-gray-700 leading-tight">
                          {cellAccessor ? cellAccessor(e) : `${e.teacher_name} · ${e.section_name}`}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">📍 {e.room_no}{isLab && " (lab)"}</div>
                      </td>
                    );
                  }
                  return (
                    <td key={slotIdx} className="border border-gray-100 px-2 py-1.5 align-top text-gray-300 text-center">—</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-brand-50 border border-brand-300 inline-block" /> Theory</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-50 border border-amber-300 inline-block" /> Lab (2 slots)</span>
      </div>
    </div>
  );
}
