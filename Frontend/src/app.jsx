import { BrowserRouter, Routes, Route } from "react-router-dom";

// Login
import Login from "./login";
import AdministrationLogin from "./AdministrationLogin";
import PrincipalLogin from "./PrincipalLogin";

// Administration
import AdministrationDashboard from "./AdministrationDashboard";
import AdministrationCredManagement from "./AdministrationCredManagement";
import AdministrationStudRecord from "./AdministrationStudRecord";
import AdministrationReports from "./AdministrationReports";
import AdministrationActLogs from "./AdministrationActLogs";
import AdministrationSettings from "./AdministrationSettings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/admin-login"
          element={<AdministrationLogin />}
        />

        <Route
          path="/principal-login"
          element={<PrincipalLogin />}
        />

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;