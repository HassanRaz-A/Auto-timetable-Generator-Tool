import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./store/auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";
import Teachers from "./pages/Teachers";
import Subjects from "./pages/Subjects";
import Classrooms from "./pages/Classrooms";
import Sections from "./pages/Sections";
import Allotments from "./pages/Allotments";
import Timetable from "./pages/Timetable";
import Layout from "./components/Layout";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/departments" element={<Protected><Departments /></Protected>} />
      <Route path="/teachers" element={<Protected><Teachers /></Protected>} />
      <Route path="/subjects" element={<Protected><Subjects /></Protected>} />
      <Route path="/classrooms" element={<Protected><Classrooms /></Protected>} />
      <Route path="/sections" element={<Protected><Sections /></Protected>} />
      <Route path="/allotments" element={<Protected><Allotments /></Protected>} />
      <Route path="/timetable" element={<Protected><Timetable /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
