import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MarkAttendance from './pages/MarkAttendance';
import StudentAssignments from './pages/StudentAssignments';
import StudentAssignmentScores from './pages/StudentAssignmentScores';
import StudentLMS from './pages/StudentLMS';
import TeacherCMS from './pages/TeacherCMS';
import StudentArchive from './pages/StudentArchive';
import AdmissionRequirements from './pages/AdmissionRequirements';
import CheckAdmissionStatus from './pages/CheckAdmissionStatus';
import ReceiptManagement from './pages/ReceiptManagement';
import CalendarSync from './pages/CalendarSync';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/MarkAttendance" element={<LayoutWrapper currentPageName="MarkAttendance"><MarkAttendance /></LayoutWrapper>} />
      <Route path="/StudentAssignments" element={<LayoutWrapper currentPageName="StudentAssignments"><StudentAssignments /></LayoutWrapper>} />
      <Route path="/StudentAssignmentScores" element={<LayoutWrapper currentPageName="StudentAssignmentScores"><StudentAssignmentScores /></LayoutWrapper>} />
      <Route path="/StudentLMS" element={<LayoutWrapper currentPageName="StudentLMS"><StudentLMS /></LayoutWrapper>} />
      <Route path="/TeacherCMS" element={<LayoutWrapper currentPageName="TeacherCMS"><TeacherCMS /></LayoutWrapper>} />
      <Route path="/StudentArchive" element={<LayoutWrapper currentPageName="StudentArchive"><StudentArchive /></LayoutWrapper>} />
      <Route path="/AdmissionRequirements" element={<LayoutWrapper currentPageName="AdmissionRequirements"><AdmissionRequirements /></LayoutWrapper>} />
      <Route path="/CheckAdmissionStatus" element={<LayoutWrapper currentPageName="CheckAdmissionStatus"><CheckAdmissionStatus /></LayoutWrapper>} />
      <Route path="/ReceiptManagement" element={<LayoutWrapper currentPageName="ReceiptManagement"><ReceiptManagement /></LayoutWrapper>} />
      <Route path="/CalendarSync" element={<LayoutWrapper currentPageName="CalendarSync"><CalendarSync /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App