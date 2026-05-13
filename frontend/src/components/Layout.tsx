import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

const navItems = [
  { to: "/", label: "Dashboard", icon: "▤" },
  { to: "/departments", label: "Departments", icon: "🏛" },
  { to: "/teachers", label: "Teachers", icon: "👩‍🏫" },
  { to: "/subjects", label: "Subjects", icon: "📚" },
  { to: "/classrooms", label: "Classrooms", icon: "🏫" },
  { to: "/sections", label: "Sections", icon: "👥" },
  { to: "/allotments", label: "Allotments", icon: "🔗" },
  { to: "/timetable", label: "Timetable", icon: "📅" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { fullName, role, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-brand-700">
          <h1 className="font-bold text-lg leading-tight">TTMS</h1>
          <p className="text-xs text-brand-100 mt-0.5">Intelligent Timetable</p>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                pathname === n.to
                  ? "bg-brand-700 text-white border-l-4 border-white pl-5"
                  : "text-brand-100 hover:bg-brand-700/50"
              }`}
            >
              <span className="text-base w-5">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-700">
          <p className="text-xs text-brand-100">Signed in as</p>
          <p className="text-sm font-medium truncate">{fullName}</p>
          <p className="text-xs text-brand-100 capitalize mb-2">{role}</p>
          <button onClick={onLogout} className="w-full text-xs px-2 py-1.5 bg-brand-700 hover:bg-brand-600 rounded">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
