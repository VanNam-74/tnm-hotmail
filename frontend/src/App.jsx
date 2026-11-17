import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Filter from "./pages/Filter";
import Share from "./pages/Share";
import Settings from "./pages/Settings";
import GetToken from "./pages/GetToken";

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="flex h-full items-center justify-center"><Spinner size={28} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<Protected><Overview /></Protected>} />
      <Route path="/app/gettoken" element={<Protected><GetToken /></Protected>} />
      <Route path="/app/filter" element={<Protected><Filter /></Protected>} />
      <Route path="/app/share" element={<Protected><Share /></Protected>} />
      <Route path="/app/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
