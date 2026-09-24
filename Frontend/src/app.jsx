import { BrowserRouter, Routes, Route } from "react-router-dom";

// =========================================================
// LOGIN
// =========================================================
import Login from "./login";
import AdministrationLogin from "./AdministrationLogin";
import PrincipalLogin from "./PrincipalLogin";

// =========================================================
// ADMINISTRATION
// =========================================================
import AdministrationDashboard from "./AdministrationDashboard";
import AdministrationCredManagement from "./AdministrationCredManagement";
import AdministrationStudRecord from "./AdministrationStudRecord";
import AdministrationReports from "./AdministrationReports";
import AdministrationActLogs from "./AdministrationActLogs";
import AdministrationSettings from "./AdministrationSettings";

// =========================================================
// PRINCIPAL
// =========================================================
import PrincipalDashboard from "./PrincipalDashboard";
import PrincipalApprovals from "./PrincipalApprovals";
import PrincipalReports from "./PrincipalReports";
import PrincipalActivity from "./PrincipalActivity";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            LOGIN
        ========================= */}
        <Route path="/" element={<Login />} />

        <Route
          path="/admin-login"
          element={<AdministrationLogin />}
        />

        <Route
          path="/principal-login"
          element={<PrincipalLogin />}
        />

        {/* =========================
            ADMINISTRATION
        ========================= */}
        <Route
          path="/admin-dashboard"
          element={<AdministrationDashboard />}
        />

        <Route
          path="/admin-credential-management"
          element={<AdministrationCredManagement />}
        />

        <Route
          path="/admin-student-records"
          element={<AdministrationStudRecord />}
        />

        <Route
          path="/admin-reports"
          element={<AdministrationReports />}
        />

        <Route
          path="/admin-activity-logs"
          element={<AdministrationActLogs />}
        />

        <Route
          path="/admin-settings"
          element={<AdministrationSettings />}
        />

        {/* =========================
            PRINCIPAL
        ========================= */}

        <Route
          path="/principal-dashboard"
          element={<PrincipalDashboard />}
        />

        <Route
          path="/principal-approvals"
          element={<PrincipalApprovals />}
        />

        <Route
          path="/principal-reports"
          element={<PrincipalReports />}
        />

        <Route
          path="/principal-activity"
          element={<PrincipalActivity />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;