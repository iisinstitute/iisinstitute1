import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  Clock,
  Layers,
  CreditCard,
  BellRing,
  FileSpreadsheet,
  TrendingUp,
  Megaphone,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';

export type ActiveTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'batches'
  | 'student-attendance'
  | 'teacher-attendance'
  | 'fees'
  | 'reminders'
  | 'examinations'
  | 'performance'
  | 'parent-portal'
  | 'announcements'
  | 'reports'
  | 'audit-logs';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onOpenResetModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onOpenResetModal,
}) => {
  const { activeRole, switchRole, availableUsers, currentUser } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Institute Dashboard',
      icon: LayoutDashboard,
      roles: ['Super Admin', 'Admin', 'Teacher', 'Accountant'] as UserRole[],
    },
    {
      id: 'parent-portal' as ActiveTab,
      label: 'Parent Child Portal',
      icon: GraduationCap,
      roles: ['Parent', 'Super Admin', 'Admin'] as UserRole[],
      badge: 'Parent',
    },
    {
      id: 'students' as ActiveTab,
      label: 'Student Directory',
      icon: Users,
      roles: ['Super Admin', 'Admin', 'Teacher', 'Accountant'] as UserRole[],
    },
    {
      id: 'student-attendance' as ActiveTab,
      label: 'Student Attendance',
      icon: CalendarCheck,
      roles: ['Super Admin', 'Admin', 'Teacher'] as UserRole[],
    },
    {
      id: 'teachers' as ActiveTab,
      label: 'Faculty & Teachers',
      icon: GraduationCap,
      roles: ['Super Admin', 'Admin'] as UserRole[],
    },
    {
      id: 'teacher-attendance' as ActiveTab,
      label: 'Teacher Attendance (2 Sessions)',
      icon: Clock,
      roles: ['Super Admin', 'Admin', 'Teacher'] as UserRole[],
      privateTag: true,
    },
    {
      id: 'batches' as ActiveTab,
      label: 'Batches & Timetable',
      icon: Layers,
      roles: ['Super Admin', 'Admin', 'Teacher'] as UserRole[],
    },
    {
      id: 'fees' as ActiveTab,
      label: 'Fees & Payment Receipts',
      icon: CreditCard,
      roles: ['Super Admin', 'Admin', 'Accountant'] as UserRole[],
    },
    {
      id: 'reminders' as ActiveTab,
      label: 'Fee Reminders (WhatsApp)',
      icon: BellRing,
      roles: ['Super Admin', 'Admin', 'Accountant'] as UserRole[],
    },
    {
      id: 'examinations' as ActiveTab,
      label: 'Exams & Marks Entry',
      icon: FileSpreadsheet,
      roles: ['Super Admin', 'Admin', 'Teacher'] as UserRole[],
    },
    {
      id: 'performance' as ActiveTab,
      label: 'Performance Analytics',
      icon: TrendingUp,
      roles: ['Super Admin', 'Admin', 'Teacher'] as UserRole[],
    },
    {
      id: 'announcements' as ActiveTab,
      label: 'Notice & Announcements',
      icon: Megaphone,
      roles: ['Super Admin', 'Admin', 'Teacher', 'Accountant', 'Parent'] as UserRole[],
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Reports & Exports (PDF/XLS)',
      icon: BarChart3,
      roles: ['Super Admin', 'Admin', 'Accountant'] as UserRole[],
    },
    {
      id: 'audit-logs' as ActiveTab,
      label: 'Audit Trail & Security',
      icon: ShieldAlert,
      roles: ['Super Admin'] as UserRole[],
    },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(activeRole));

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-gray-200 transition-all duration-200 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-18 items-center justify-between px-4 border-b border-gray-100 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/assets/aistudio/image_5aac2d2d.png"
            alt="IIS Institute Logo"
            className="h-10 w-10 shrink-0 object-contain rounded-xl bg-white p-1 shadow-md border border-white/30"
          />
          {!collapsed && (
            <div className="truncate">
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                IIS INSTITUTE
              </h1>
              <p className="text-[10px] font-medium tracking-wide text-blue-100 uppercase">
                Coaching CRM & ERP
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-blue-100 hover:bg-white/20 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Role Switcher pill in Sidebar */}
      {!collapsed ? (
        <div className="m-3 p-3 rounded-xl bg-linear-to-r from-blue-50 to-purple-50 border border-blue-100/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
              Active Role Switcher
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white">
              {activeRole}
            </span>
          </div>
          <select
            value={activeRole}
            onChange={e => switchRole(e.target.value as UserRole)}
            className="w-full text-xs font-medium rounded-lg border-gray-200 bg-white py-1.5 px-2 text-gray-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
          >
            <option value="Super Admin">Super Admin</option>
            <option value="Admin">Admin (Operations)</option>
            <option value="Teacher">Teacher (Dr. Rajesh Sharma)</option>
            <option value="Accountant">Accountant (Ramesh S.)</option>
            <option value="Parent">Parent (Manoj Kumar)</option>
          </select>
        </div>
      ) : (
        <div className="my-2 flex justify-center">
          <span className="h-2 w-2 rounded-full bg-blue-600" title={`Role: ${activeRole}`} />
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {filteredNav.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'
                }`}
              />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Reset Demo Data */}
      <div className="border-t border-gray-100 p-3">
        {!collapsed ? (
          <button
            onClick={onOpenResetModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Demo Data & Reset</span>
          </button>
        ) : (
          <button
            onClick={onOpenResetModal}
            className="flex w-full justify-center p-2 text-gray-400 hover:text-amber-500"
            title="Demo Data Settings"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
          </button>
        )}
      </div>
    </aside>
  );
};
