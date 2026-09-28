import StaffPortal from './components/StaffPortal';
import { BrowserRouter, Routes, Route } from "react-router-dom";

// LOGIN
import Login from "./login";
import AdministrationLogin from "./AdministrationLogin";
import PrincipalLogin from "./PrincipalLogin";
import IctLogin from "./ictlogin";

// ADMINISTRATION
import AdministrationDashboard from "./AdministrationDashboard";
import AdministrationCredManagement from "./AdministrationCredManagement";
import PrincipalApprovals from "./PrincipalApprovals";
import AdministrationStudRecord from "./AdministrationStudRecord";
import AdministrationReports from "./AdministrationReports";
import AdministrationActLogs from "./AdministrationActLogs";
import AdministrationSettings from "./AdministrationSettings";

// PRINCIPAL
import PrincipalDashboard from "./PrincipalDashboard";

import PrincipalReports from "./PrincipalReports";
import PrincipalActivity from "./PrincipalActivity";

// ICT PERSONNEL
import IctDashboard from "./IctDashboard";
import IctUserAccess from "./IctUserAccess";
import IctTechnicalSupport from "./IctTechnicalSupport";
import IctSystemMaintenance from "./IctSystemMaintenance";
import IctDataProtection from "./IctDataProtection";
import IctSettings from "./IctSettings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/" element={<Login />} />
        <Route path="/admin-login" element={<AdministrationLogin />} />
        <Route path="/principal-login" element={<PrincipalLogin />} />
        <Route path="/ict-login" element={<IctLogin />} />

        {/* ADMINISTRATION */}
        <Route
          path="/admin-dashboard"
          element={<StaffPortal role="ADMIN" component={AdministrationDashboard} />}
        />
        <Route
          path="/admin-credential-management"
          element={<StaffPortal role="ADMIN" component={AdministrationCredManagement} />}
        />
        <Route
          path="/admin-student-records"
          element={<StaffPortal role="ADMIN" component={AdministrationStudRecord} />}
        />
        <Route
          path="/admin-reports"
          element={<StaffPortal role="ADMIN" component={AdministrationReports} />}
        />
        <Route
          path="/admin-activity-logs"
          element={<StaffPortal role="ADMIN" component={AdministrationActLogs} />}
        />
        <Route
          path="/admin-settings"
          element={<StaffPortal role="ADMIN" component={AdministrationSettings} />}
        />

        {/* PRINCIPAL */}
        <Route
          path="/principal-dashboard"
          element={<StaffPortal role="PRINCIPAL" component={PrincipalDashboard} />}
        />
        <Route
          path="/principal-approvals"
          element={<StaffPortal role="PRINCIPAL" component={PrincipalApprovals} />}
        />
        <Route
          path="/principal-reports"
          element={<StaffPortal role="PRINCIPAL" component={PrincipalReports} />}
        />
        <Route
          path="/principal-activity"
          element={<StaffPortal role="PRINCIPAL" component={PrincipalActivity} />}
        />

        {/* ICT PERSONNEL */}
        <Route
          path="/ict-dashboard"
          element={<StaffPortal role="ICT" component={IctDashboard} />}
        />
        <Route
          path="/ict-user-access"
          element={<StaffPortal role="ICT" component={IctUserAccess} />}
        />
        <Route
          path="/ict-technical-support"
          element={<StaffPortal role="ICT" component={IctTechnicalSupport} />}
        />
        <Route
          path="/ict-system-maintenance"
          element={<StaffPortal role="ICT" component={IctSystemMaintenance} />}
        />
        <Route
          path="/ict-data-protection"
          element={<StaffPortal role="ICT" component={IctDataProtection} />}
        />
        <Route
          path="/ict-settings"
          element={<StaffPortal role="ICT" component={IctSettings} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;