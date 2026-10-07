import TeacherStudentRecords from './TeacherStudentRecords';
import TeacherReportCard from './TeacherReportCard';
import TeacherDigitalSf9 from './TeacherDigitalSf9';
import TeacherComments from './TeacherComments';
import ProtectedRoute from './components/ProtectedRoute';
import LoginEntry from './components/LoginEntry';
import DeveloperCredit from './components/DeveloperCredit';
import PasswordReset from './PasswordReset';
import StaffPortal from './components/StaffPortal';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// LOGIN
import Login from "./login";
import FirstPage from "./First Page";
import { hasSchoolEntry } from "./auth/schoolEntry";
import AdministrationLogin from "./AdministrationLogin";
import PrincipalLogin from "./PrincipalLogin";

// ADMINISTRATION
import AdministrationDashboard from "./AdministrationDashboard";
import AdministrationCredManagement from "./AdministrationCredManagement";
import RequestQueue from "./components/RequestQueue";
import TeacherLogin from './TeacherLogin';
import Sf9Workspace from './Sf9Workspace';
import PrincipalUserAccess from "./PrincipalUserAccess";
import WorkflowSupport from "./components/WorkflowSupport";
import AdministrationStudRecord from "./AdministrationStudRecord";
import AdministrationReports from "./AdministrationReports";
import AdministrationActLogs from "./AdministrationActLogs";
import AdministrationSettings from "./AdministrationSettings";

// PRINCIPAL
import PrincipalDashboard from "./PrincipalDashboard";

import PrincipalReports from "./PrincipalReports";
import PrincipalActivity from "./PrincipalActivity";



function SchoolEntry({ children }) {
  return hasSchoolEntry() ? children : <Navigate to="/" replace />;
}

function UnknownRoute() {
  const {pathname} = useLocation();
  const path = pathname.toLowerCase();
  const login = /^\/(admin|administration)(?:[-/]|$)/.test(path) ? '/admin-login'
    : /^\/principal(?:[-/]|$)/.test(path) ? '/principal-login'
    : /^\/teacher(?:[-/]|$)/.test(path) ? '/teacher-login'
    : '/';
  return <Navigate to={login} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/principal-students" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><Navigate to="/principal-requests" replace /></ProtectedRoute>} />
        <Route path="/principal-profile" element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><Navigate to="/principal-dashboard" replace /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<PasswordReset />} />
        <Route path="/reset-password/:uid/:token" element={<PasswordReset />} />
        {/* LOGIN */}
        <Route path="/" element={<LoginEntry><FirstPage /></LoginEntry>} />
        <Route path="/login/public" element={<LoginEntry><Login audience="public" /></LoginEntry>} />
        <Route path="/login/school" element={<SchoolEntry><LoginEntry><Login audience="school" /></LoginEntry></SchoolEntry>} />
        <Route path="/admin-login" element={<SchoolEntry><LoginEntry><AdministrationLogin /></LoginEntry></SchoolEntry>} />
        <Route path="/principal-login" element={<SchoolEntry><LoginEntry><PrincipalLogin /></LoginEntry></SchoolEntry>} />

        <Route path="/teacher-login" element={<SchoolEntry><LoginEntry><TeacherLogin/></LoginEntry></SchoolEntry>}/>
        <Route path="/teacher-digital-sf9" element={<StaffPortal role="TEACHER" component={TeacherDigitalSf9}/>}/>
        <Route path="/teacher-comments" element={<StaffPortal role="TEACHER" component={TeacherComments}/>}/>
        <Route path="/teacher-student-records" element={<StaffPortal role="TEACHER" component={TeacherStudentRecords}/>}/>
        <Route path="/teacher-gradebook" element={<StaffPortal role="TEACHER" component={Sf9Workspace}/>}/>
        <Route path="/teacher-sf9-report" element={<StaffPortal role="TEACHER" component={TeacherReportCard}/>}/>
        <Route path="/admin-sf9" element={<StaffPortal role="ADMIN" component={Sf9Workspace}/>}/>
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

        <Route path="/admin-report-issue" element={<StaffPortal role="ADMIN" component={WorkflowSupport}/>}/>
        <Route path="/principal-user-access" element={<StaffPortal role="PRINCIPAL" component={PrincipalUserAccess}/>}/>
        <Route path="/principal-requests" element={<StaffPortal role="PRINCIPAL" component={RequestQueue}/>}/>
        {/* PRINCIPAL */}
        <Route
          path="/principal-dashboard"
          element={<StaffPortal role="PRINCIPAL" component={PrincipalDashboard} />}
        />
        <Route
          path="/principal-approvals"
          element={<ProtectedRoute allowedRoles={["PRINCIPAL"]}><Navigate to="/principal-requests" replace /></ProtectedRoute>}
        />
        <Route
          path="/principal-reports"
          element={<StaffPortal role="PRINCIPAL" component={PrincipalReports} />}
        />
        <Route
          path="/principal-activity"
          element={<StaffPortal role="PRINCIPAL" component={PrincipalActivity} />}
        />

      <Route path="*" element={<UnknownRoute />} />
      </Routes>
      <DeveloperCredit />
    </BrowserRouter>
  );
}

export default App;
