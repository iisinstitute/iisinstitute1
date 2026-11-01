import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserPlus,
  Send,
  Layers,
  Award,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { StatCard } from '../components/common/StatCard.tsx';
import { ActiveTab } from '../components/layout/Sidebar.tsx';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    students,
    teachers,
    batches,
    studentAttendance,
    teacherAttendance,
    feeTransactions,
    studentMarks,
    announcements,
  } = useData();

  const { activeRole } = useAuth();
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('month');

  const today = new Date().toISOString().split('T')[0];

  // 1. Student stats
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const inactiveStudents = totalStudents - activeStudents;

  // 2. Attendance stats (Today)
  const todayRecords = studentAttendance.filter(a => a.date === today);
  const presentToday = todayRecords.filter(a => a.status === 'present').length;
  const absentToday = todayRecords.filter(a => a.status === 'absent').length;
  const lateToday = todayRecords.filter(a => a.status === 'late').length;
  const holidayToday = todayRecords.filter(a => a.status === 'holiday').length;
  const leaveToday = todayRecords.filter(a => a.status === 'leave').length;
  const accountableToday = todayRecords.length - holidayToday;
  const attendanceRate = accountableToday > 0
    ? Math.round(((presentToday + lateToday) / accountableToday) * 100)
    : (holidayToday > 0 ? 100 : 92);

  // Identify consecutive absentees (absent in 2 or more recent classes)
  const consecutiveAbsentees = students.filter(stu => {
    const records = studentAttendance
      .filter(a => a.studentId === stu.studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return records.slice(0, 2).filter(r => r.status === 'absent').length >= 2;
  });

  // 3. Financial stats
  const totalCollected = feeTransactions.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const todayCollected = feeTransactions
    .filter(t => t.paymentDate === today)
    .reduce((acc, curr) => acc + curr.amountPaid, 0);
  const totalPending = students.reduce((acc, s) => {
    // If student has transactions in current month, check balance
    const tx = feeTransactions.find(t => t.studentId === s.studentId);
    return acc + (tx ? tx.remainingBalance : s.monthlyFee);
  }, 0);

  // 4. Academic stats
  const avgMarksPct = studentMarks.length > 0
    ? Math.round(studentMarks.reduce((acc, m) => acc + m.percentage, 0) / studentMarks.length)
    : 81;
  const topPerformers = [...studentMarks].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  const atRiskStudents = studentMarks.filter(m => m.percentage < 50 || m.grade === 'Needs Improvement');

  // 5. Teacher attendance stats
  const teacherTodayRecords = teacherAttendance.filter(t => t.date === today);
  const morningPresent = teacherTodayRecords.filter(t => t.session === 'morning' && t.status !== 'absent').length;
  const eveningPresent = teacherTodayRecords.filter(t => t.session === 'evening' && t.status !== 'absent').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Shortcuts */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src="/assets/aistudio/image_5aac2d2d.png"
              alt="IIS Institute Logo"
              className="h-16 w-16 shrink-0 object-contain rounded-2xl bg-white p-1.5 shadow-lg border border-white/40"
            />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                IIS Institute Management System
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
                Welcome to IIS Institute Operations Portal
              </h1>
              <p className="mt-1 text-xs md:text-sm text-blue-100 max-w-xl">
                Live coaching metrics for academic performance, two-session faculty logs, batch timetables, and fee collections.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('students')}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-blue-800 shadow-xs hover:bg-blue-50 transition-all"
            >
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span>New Admission</span>
            </button>
            <button
              onClick={() => onNavigate('student-attendance')}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600/80 border border-white/20 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-600 transition-all backdrop-blur-xs"
            >
              <CalendarCheck className="h-4 w-4" />
              <span>Mark Attendance</span>
            </button>
            <button
              onClick={() => onNavigate('fees')}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600/80 border border-white/20 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-600 transition-all backdrop-blur-xs"
            >
              <CreditCard className="h-4 w-4" />
              <span>Collect Fees</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-8 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Analytical KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={activeStudents}
          subtitle={`Total enrolled: ${totalStudents}`}
          icon={Users}
          colorScheme="blue"
          trend={{ value: '+4 this month', isPositive: true }}
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Today's Attendance"
          value={`${attendanceRate}%`}
          subtitle={holidayToday > 0 ? `${presentToday} Present, ${holidayToday} Holiday` : `${presentToday} Present, ${absentToday} Absent`}
          icon={CalendarCheck}
          colorScheme="purple"
          trend={{ value: 'Daily goal 90%', isPositive: attendanceRate >= 90 }}
          onClick={() => onNavigate('student-attendance')}
        />
        <StatCard
          title="Fee Collected (Nov)"
          value={`₹${totalCollected.toLocaleString()}`}
          subtitle={`Today: ₹${todayCollected.toLocaleString()}`}
          icon={CreditCard}
          colorScheme="emerald"
          trend={{ value: '82% collected', isPositive: true }}
          onClick={() => onNavigate('fees')}
        />
        <StatCard
          title="Faculty Checked In"
          value={`${morningPresent + eveningPresent} logs`}
          subtitle="2 Sessions (Morning & Evening)"
          icon={Clock}
          colorScheme="indigo"
          onClick={() => onNavigate('teacher-attendance')}
        />
      </div>

      {/* Main 2-Column Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Attendance & Performance Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Consecutive Absences Notice Card */}
          {consecutiveAbsentees.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  <h3 className="text-sm font-bold">Frequent Absences Detected (Action Required)</h3>
                </div>
                <button
                  onClick={() => onNavigate('reminders')}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
                >
                  Contact Parents
                </button>
              </div>
              <p className="mt-1 text-xs text-rose-700">
                The following students have missed 2 or more consecutive classes. Automated counseling recommended:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {consecutiveAbsentees.map(stu => (
                  <div
                    key={stu.studentId}
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 border border-rose-200 shadow-2xs"
                  >
                    <span>{stu.name} ({stu.classCourse})</span>
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700 font-bold">
                      {stu.whatsappNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batches Overview and Capacity Trackers */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Current Active Batches & Strength</h3>
                <p className="text-xs text-gray-500">Class capacity and teacher assignments</p>
              </div>
              <button
                onClick={() => onNavigate('batches')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View Timetable <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {batches.slice(0, 4).map(b => {
                const enrolled = students.filter(s => s.assignedBatches.includes(b.batchId)).length;
                const capacityPct = Math.round((enrolled / b.maxCapacity) * 100);
                return (
                  <div key={b.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          {b.classCourse}
                        </span>
                        <h4 className="mt-1 text-xs font-bold text-gray-900 leading-snug">{b.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-gray-700">{b.batchId}</span>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1">
                        <span>Enrolled: {enrolled} students</span>
                        <span>Max: {b.maxCapacity}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            capacityPct > 80 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, capacityPct)}%` }}
                        />
                      </div>
                    </div>

                    <p className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-600" />
                      {b.timing}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Academic Merit & Exam Highlights */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Academic Merit & Top Rankers</h3>
                <p className="text-xs text-gray-500">Average institute marks: {avgMarksPct}%</p>
              </div>
              <button
                onClick={() => onNavigate('examinations')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                All Examinations <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {topPerformers.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{m.studentName}</h4>
                      <p className="text-[11px] text-gray-500">{m.examTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-blue-700">{m.percentage.toFixed(1)}%</span>
                    <span className="ml-2 rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                      Grade {m.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary & Institute Notice Board */}
        <div className="space-y-6">
          {/* Fee Collection Progress Widget */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <h3 className="text-base font-bold text-gray-900">Fee Status Summary</h3>
            <p className="text-xs text-gray-500">Monthly billing for November</p>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Total Paid Fee:</span>
                <span className="font-bold text-emerald-600">₹{totalCollected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Pending Dues:</span>
                <span className="font-bold text-rose-600">₹{totalPending.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Today's Counter Collection:</span>
                <span className="font-bold text-blue-700">₹{todayCollected.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => onNavigate('fees')}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-center text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Payment Ledger
              </button>
              <button
                onClick={() => onNavigate('reminders')}
                className="flex-1 rounded-xl border border-gray-200 py-2 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Send Reminders
              </button>
            </div>
          </div>

          {/* Teacher Two-Session Punctuality Widget */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Faculty Punctuality</h3>
              <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                2 Sessions
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {teachers.slice(0, 3).map(tch => {
                const logs = teacherAttendance.filter(a => a.teacherId === tch.teacherId && a.date === today);
                const morn = logs.find(l => l.session === 'morning');
                const eve = logs.find(l => l.session === 'evening');
                return (
                  <div key={tch.id} className="rounded-xl border border-gray-100 p-2.5 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{tch.name}</span>
                      <span className="text-[10px] text-gray-500">{tch.subjectsTaught[0]}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded bg-white p-1.5 border border-gray-100">
                        <span className="text-gray-400 block">Morning:</span>
                        <span className={`font-bold ${morn ? (morn.lateArrival ? 'text-amber-600' : 'text-emerald-600') : 'text-gray-400'}`}>
                          {morn ? `${morn.arrivalTime} (${morn.status})` : 'Not In Yet'}
                        </span>
                      </div>
                      <div className="rounded bg-white p-1.5 border border-gray-100">
                        <span className="text-gray-400 block">Evening:</span>
                        <span className={`font-bold ${eve ? (eve.lateArrival ? 'text-amber-600' : 'text-emerald-600') : 'text-gray-400'}`}>
                          {eve ? `${eve.arrivalTime} (${eve.status})` : 'Not In Yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Institute Circulars & Notice Board */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Institute Announcements</h3>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Manage
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="rounded-xl border border-gray-100 p-3 bg-blue-50/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-purple-700">
                      Target: {ann.targetAudience}
                    </span>
                    {ann.priority === 'urgent' && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                        Urgent
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-gray-900 leading-snug">{ann.title}</h4>
                  <p className="mt-1 text-[11px] text-gray-600 line-clamp-2">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
