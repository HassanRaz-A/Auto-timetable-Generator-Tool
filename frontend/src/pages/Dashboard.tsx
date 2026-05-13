import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Department, Teacher, Subject, Classroom, Section, Allotment, TimetableEntry } from "../api/client";

interface Stats {
  departments: number;
  teachers: number;
  subjects: number;
  classrooms: number;
  sections: number;
  allotments: number;
  entries: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [d, t, s, c, sc, a, e] = await Promise.all([
          api.list<Department>("/departments"),
          api.list<Teacher>("/teachers"),
          api.list<Subject>("/subjects"),
          api.list<Classroom>("/classrooms"),
          api.list<Section>("/sections"),
          api.list<Allotment>("/allotments"),
          api.list<TimetableEntry>("/timetable"),
        ]);
        setStats({
          departments: d.length, teachers: t.length, subjects: s.length,
          classrooms: c.length, sections: sc.length, allotments: a.length,
          entries: e.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      }
    })();
  }, []);

  const cards = [
    { label: "Departments", value: stats?.departments, link: "/departments", color: "bg-blue-50 text-blue-700" },
    { label: "Teachers",    value: stats?.teachers,    link: "/teachers",    color: "bg-green-50 text-green-700" },
    { label: "Subjects",    value: stats?.subjects,    link: "/subjects",    color: "bg-amber-50 text-amber-700" },
    { label: "Classrooms",  value: stats?.classrooms,  link: "/classrooms",  color: "bg-purple-50 text-purple-700" },
    { label: "Sections",    value: stats?.sections,    link: "/sections",    color: "bg-pink-50 text-pink-700" },
    { label: "Allotments",  value: stats?.allotments,  link: "/allotments",  color: "bg-cyan-50 text-cyan-700" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h2>
      <p className="text-sm text-gray-500 mb-6">Overview of master data and the latest generated timetable.</p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} to={c.link} className="card hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 ${c.color.split(" ")[1]}`}>
              {c.value ?? "—"}
            </p>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Timetable Engine</h3>
            <p className="text-sm text-gray-500">Currently {stats?.entries ?? 0} scheduled sessions in the system.</p>
          </div>
          <Link to="/timetable" className="btn-primary">Open Timetable →</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded p-4">
            <p className="font-medium text-gray-700 mb-1">Solver</p>
            <p className="text-gray-600">Google OR-Tools CP-SAT</p>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <p className="font-medium text-gray-700 mb-1">Schedule grid</p>
            <p className="text-gray-600">5 days × 7 slots (50-min blocks)</p>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <p className="font-medium text-gray-700 mb-1">Constraints</p>
            <p className="text-gray-600">No teacher / room / section clashes, lab continuity, daily balance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
