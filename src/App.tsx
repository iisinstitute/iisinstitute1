import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DataProvider, useData } from './context/DataContext.tsx';
import { Sidebar, ActiveTab } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { StudentsView } from './views/StudentsView.tsx';
import { TeachersView } from './views/TeachersView.tsx';
import { BatchesView } from './views/BatchesView.tsx';
import { AttendanceView } from './views/AttendanceView.tsx';
import { TeacherAttendanceView } from './views/TeacherAttendanceView.tsx';
import { FeesView } from './views/FeesView.tsx';
import { RemindersView } from './views/RemindersView.tsx';
import { ExaminationsView } from './views/ExaminationsView.tsx';
import { PerformanceView } from './views/PerformanceView.tsx';
import { ParentPortalView } from './views/ParentPortalView.tsx';
import { AnnouncementsView } from './views/AnnouncementsView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { AuditLogsView } from './views/AuditLogsView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { Modal } from './components/common/Modal.tsx';
import { Sparkles, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

const TAB_TITLES: Record<ActiveTab, string> = {
  'dashboard': 'Institute Overview & Analytics',
  'students': 'Student Management & Admissions',
  'teachers': 'Faculty & Teacher Directory',
  'batches': 'Classes, Batches & Timetables',
  'student-attendance': 'Daily Student Attendance System',
  'teacher-attendance': 'Teacher Two-Session Attendance (Morning / Evening)',
  'fees': 'Fee Management, Receipts & Defaulters',
  'reminders': 'Automated WhatsApp Fee Reminders',
  'examinations': 'Examinations, Marking & Report Cards',
  'performance': 'Student Performance & Progress Analytics',
  'parent-portal': 'Parent Connect & Child Progress',
  'announcements': 'Notice & Circulars Bulletin',
  'reports': 'Centralized Reports & Compliance Exports',
  'audit-logs': 'System Security & Operations Audit Trail',
};

const MainAppContent: React.FC = () => {
  const { activeRole, isAuthenticated } = useAuth();
  const { resetToDemoData, clearAllInstituteData, isLoading } = useData();

  // If not authenticated, render the Number & Password Login view
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // If active role is Parent, default to parent-portal
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    activeRole === 'Parent' ? 'parent-portal' : 'dashboard'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Sync activeTab if role switches to Parent
  React.useEffect(() => {
    if (activeRole === 'Parent') {
      setActiveTab('parent-portal');
    }
  }, [activeRole]);

  const handleResetDemo = async () => {
    setIsResetting(true);
    await resetToDemoData();
    setIsResetting(false);
    setIsResetModalOpen(false);
  };

  const handleClearAll = async () => {
    setIsResetting(true);
    await clearAllInstituteData();
    setIsResetting(false);
    setIsResetModalOpen(false);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} />;
      case 'students':
        return <StudentsView />;
      case 'teachers':
        return <TeachersView />;
      case 'batches':
        return <BatchesView />;
      case 'student-attendance':
        return <AttendanceView />;
      case 'teacher-attendance':
        return <TeacherAttendanceView />;
      case 'fees':
        return <FeesView />;
      case 'reminders':
        return <RemindersView />;
      case 'examinations':
        return <ExaminationsView />;
      case 'performance':
        return <PerformanceView />;
      case 'parent-portal':
        return <ParentPortalView />;
      case 'announcements':
        return <AnnouncementsView />;
      case 'reports':
        return <ReportsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      default:
        return <DashboardView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-gray-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenResetModal={() => setIsResetModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header currentTabTitle={TAB_TITLES[activeTab] || 'IIS Institute'} />

        {/* Dynamic View Scroll Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mx-auto max-w-7xl">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* DEMO DATA & RESET MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Demo Data & Institute Database Management"
        subtitle="IIS Institute Data Controls"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600 leading-relaxed">
            Manage test records for evaluation. You can populate comprehensive sample batches, students, attendance, and exam marks, or wipe the test database clean.
          </p>

          <div className="space-y-3 pt-2">
            <button
              disabled={isResetting}
              onClick={handleResetDemo}
              className="w-full flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-left hover:bg-blue-100/70 transition-all disabled:opacity-50"
            >
              <div>
                <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Load / Reset Comprehensive Demo Records
                </span>
                <span className="text-[11px] text-blue-700">
                  Seeds 8 realistic students, 4 faculty members, 5 batches, daily 2-session logs, fee receipts & mock tests.
                </span>
              </div>
              <RefreshCw className={`h-4 w-4 text-blue-600 shrink-0 ${isResetting ? 'animate-spin' : ''}`} />
            </button>

            <button
              disabled={isResetting}
              onClick={handleClearAll}
              className="w-full flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-left hover:bg-rose-100/70 transition-all disabled:opacity-50"
            >
              <div>
                <span className="font-bold text-rose-900 block flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  Clear All Test Data (Fresh Start)
                </span>
                <span className="text-[11px] text-rose-700">
                  Empties all rosters and collections so you can enter live institute data from scratch.
                </span>
              </div>
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            </button>
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainAppContent />
      </DataProvider>
    </AuthProvider>
  );
}
