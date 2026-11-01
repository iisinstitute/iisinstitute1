import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Download,
  Edit2,
  Trash2,
  Lock,
  Zap,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { TeacherAttendance, TeacherAttendanceSession } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { exportToExcel } from '../components/export/ExportUtils.ts';

export const TeacherAttendanceView: React.FC = () => {
  const {
    teachers,
    teacherAttendance,
    recordTeacherArrival,
    recordTeacherDeparture,
    recordTeacherQuickAttendance,
    correctTeacherAttendance,
    deleteTeacherAttendance,
  } = useData();

  const { currentUser, isTeacher, isAdmin, canViewTeacherAttendance } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Selected teacher for admin view or locked to current logged-in teacher
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    isTeacher && currentUser.linkedTeacherId
      ? currentUser.linkedTeacherId
      : teachers[0]?.teacherId || ''
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [correctingLog, setCorrectingLog] = useState<TeacherAttendance | null>(null);
  const [deleteTargetLog, setDeleteTargetLog] = useState<TeacherAttendance | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    session: 'morning' as TeacherAttendanceSession,
    arrivalTime: '',
    departureTime: '',
    status: 'present' as any,
    reason: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Privacy gate: check if current user is permitted to view teacher attendance
  const isAuthorized = isAdmin || (isTeacher && currentUser.linkedTeacherId);

  // Filter attendance records by selectedDate and (if teacher) restricted to self
  const activeRecords = useMemo(() => {
    return teacherAttendance.filter(a => {
      const matchDate = a.date === selectedDate;
      if (isAdmin) {
        return matchDate && (selectedTeacherId === 'all' || a.teacherId === selectedTeacherId);
      }
      return matchDate && a.teacherId === currentUser.linkedTeacherId;
    });
  }, [teacherAttendance, selectedDate, selectedTeacherId, isAdmin, currentUser]);

  // Current teacher's morning & evening sessions for today
  const myTodayMorning = teacherAttendance.find(
    a => a.teacherId === selectedTeacherId && a.date === todayStr && a.session === 'morning'
  );
  const myTodayEvening = teacherAttendance.find(
    a => a.teacherId === selectedTeacherId && a.date === todayStr && a.session === 'evening'
  );

  // 1-Click Arrival Check-In (Time added automatically)
  const handleCheckIn = async (session: TeacherAttendanceSession) => {
    try {
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await recordTeacherArrival(selectedTeacherId, session, now, currentUser.name);
      showToast(`⚡ 1-Click Check-In successful at ${now} for ${session.toUpperCase()} session!`);
    } catch (err) {
      showToast('Error during check-in.');
    }
  };

  // 1-Click Departure Check-Out (Time added automatically, duration calculated)
  const handleCheckOut = async (attendanceId: string, sessionName: string) => {
    try {
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await recordTeacherDeparture(attendanceId, now, currentUser.name);
      showToast(`⚡ 1-Click Check-Out successful at ${now}! Duration auto-calculated.`);
    } catch (err) {
      showToast('Error during check-out.');
    }
  };

  // Quick mark status (e.g. Leave, Holiday)
  const handleQuickStatus = async (session: TeacherAttendanceSession, status: any) => {
    try {
      await recordTeacherQuickAttendance(
        selectedTeacherId,
        session,
        status,
        undefined,
        undefined,
        `Marked as ${status}`,
        currentUser.name
      );
      showToast(`Marked ${session.toUpperCase()} session as ${status.toUpperCase()}.`);
    } catch {
      showToast('Error updating status.');
    }
  };

  // Handle Admin Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingLog || !correctionForm.reason.trim()) return;

    try {
      await correctTeacherAttendance(
        correctingLog.id,
        {
          session: correctionForm.session,
          arrivalTime: correctionForm.arrivalTime,
          departureTime: correctionForm.departureTime,
          status: correctionForm.status,
          lateArrival: correctionForm.arrivalTime > (correctionForm.session === 'morning' ? '09:10' : '16:15'),
        },
        correctionForm.reason,
        currentUser.name
      );
      showToast('Teacher attendance corrected successfully.');
      setCorrectingLog(null);
    } catch (err) {
      showToast('Error correcting attendance.');
    }
  };

  // Handle Record Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetLog) return;
    try {
      await deleteTeacherAttendance(deleteTargetLog.id, currentUser.name, currentUser.role);
      showToast('Teacher attendance entry removed.');
      setDeleteTargetLog(null);
    } catch {
      showToast('Error removing attendance entry.');
    }
  };

  const handleExportExcel = () => {
    const data = teacherAttendance.map(a => ({
      'Teacher ID': a.teacherId,
      'Faculty Name': a.teacherName,
      'Date': a.date,
      'Session': a.session.toUpperCase(),
      'Arrival Time': a.arrivalTime || 'N/A',
      'Departure Time': a.departureTime || 'N/A',
      'Status': a.status.toUpperCase(),
      'Late Arrival': a.lateArrival ? 'YES' : 'NO',
      'Working Mins': a.workingDurationMinutes || 0,
      'Remarks': a.remarks || '',
      'Logged By': a.markedBy,
    }));
    exportToExcel(data, `Teacher_Attendance_TwoSession_${new Date().toISOString().split('T')[0]}`);
    showToast('Exported teacher attendance logs.');
  };

  // Privacy violation fallback
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-gray-200">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Confidential Module</h2>
        <p className="mt-1 text-xs text-gray-500 max-w-md">
          Teacher arrival/departure records and biometric logs are restricted exclusively to authorized faculty members and institute administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Teacher Two-Session Attendance
            </h1>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
              Morning & Evening
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Arrival, departure, punctuality tracking, and working hours calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Check-In / Check-Out Punch Card for Today */}
      <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/60 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-blue-100">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>Today's Live Punch Card ({todayStr})</span>
          </div>
          <span className="text-xs font-semibold text-gray-600">
            Faculty: <strong>{teachers.find(t => t.teacherId === selectedTeacherId)?.name || selectedTeacherId}</strong>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Session 1: Morning Entry */}
          <div className="rounded-xl border border-white bg-white/95 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Option 1: Morning Session
                  </span>
                  <p className="mt-1 text-xs text-gray-500">Inward Entry (09:00 AM - 01:00 PM)</p>
                </div>
                {myTodayMorning ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    myTodayMorning.status === 'holiday'
                      ? 'bg-purple-100 text-purple-700'
                      : myTodayMorning.status === 'leave'
                      ? 'bg-amber-100 text-amber-700'
                      : myTodayMorning.lateArrival
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {myTodayMorning.status.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-medium">Pending Entry</span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Arrival</span>
                  <span className="font-bold text-gray-900">{myTodayMorning?.arrivalTime || '--:--'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Departure</span>
                  <span className="font-bold text-gray-900">{myTodayMorning?.departureTime || '--:--'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Duration</span>
                  <span className="font-bold text-blue-600">
                    {myTodayMorning?.workingDurationMinutes
                      ? `${Math.floor(myTodayMorning.workingDurationMinutes / 60)}h ${myTodayMorning.workingDurationMinutes % 60}m`
                      : myTodayMorning?.arrivalTime
                      ? 'In Institute'
                      : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              {!myTodayMorning ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleCheckIn('morning')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors"
                  >
                    <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
                    <span>1-Click Check-In Morning (Auto-Time)</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickStatus('morning', 'leave')}
                      className="flex-1 rounded-lg border border-amber-200 bg-amber-50 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                    >
                      Mark Leave
                    </button>
                    <button
                      onClick={() => handleQuickStatus('morning', 'holiday')}
                      className="flex-1 rounded-lg border border-purple-200 bg-purple-50 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                    >
                      Mark Holiday
                    </button>
                  </div>
                </div>
              ) : !myTodayMorning.departureTime && myTodayMorning.status !== 'leave' && myTodayMorning.status !== 'holiday' ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleCheckOut(myTodayMorning.id, 'morning')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>1-Click Check-Out Morning (Auto-Time)</span>
                  </button>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">Checked in at {myTodayMorning.arrivalTime}</span>
                    <button
                      onClick={() => setDeleteTargetLog(myTodayMorning)}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Cancel Punch
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Morning Session Complete</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setCorrectingLog(myTodayMorning);
                        setCorrectionForm({
                          session: myTodayMorning.session,
                          arrivalTime: myTodayMorning.arrivalTime || '',
                          departureTime: myTodayMorning.departureTime || '',
                          status: myTodayMorning.status,
                          reason: '',
                        });
                      }}
                      className="rounded p-1 text-gray-500 hover:text-blue-600 hover:bg-white"
                      title="Edit Punch Log"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetLog(myTodayMorning)}
                      className="rounded p-1 text-gray-500 hover:text-rose-600 hover:bg-white"
                      title="Delete Punch Log"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session 2: Evening Entry */}
          <div className="rounded-xl border border-white bg-white/95 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Option 2: Evening Session
                  </span>
                  <p className="mt-1 text-xs text-gray-500">Second Session Entry (03:30 PM - 08:30 PM)</p>
                </div>
                {myTodayEvening ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    myTodayEvening.status === 'holiday'
                      ? 'bg-purple-100 text-purple-700'
                      : myTodayEvening.status === 'leave'
                      ? 'bg-amber-100 text-amber-700'
                      : myTodayEvening.lateArrival
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {myTodayEvening.status.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-medium">Pending Entry</span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Arrival</span>
                  <span className="font-bold text-gray-900">{myTodayEvening?.arrivalTime || '--:--'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Departure</span>
                  <span className="font-bold text-gray-900">{myTodayEvening?.departureTime || '--:--'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Duration</span>
                  <span className="font-bold text-purple-600">
                    {myTodayEvening?.workingDurationMinutes
                      ? `${Math.floor(myTodayEvening.workingDurationMinutes / 60)}h ${myTodayEvening.workingDurationMinutes % 60}m`
                      : myTodayEvening?.arrivalTime
                      ? 'In Institute'
                      : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              {!myTodayEvening ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleCheckIn('evening')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-700 shadow-xs transition-colors"
                  >
                    <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
                    <span>1-Click Check-In Evening (Auto-Time)</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickStatus('evening', 'leave')}
                      className="flex-1 rounded-lg border border-amber-200 bg-amber-50 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                    >
                      Mark Leave
                    </button>
                    <button
                      onClick={() => handleQuickStatus('evening', 'holiday')}
                      className="flex-1 rounded-lg border border-purple-200 bg-purple-50 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                    >
                      Mark Holiday
                    </button>
                  </div>
                </div>
              ) : !myTodayEvening.departureTime && myTodayEvening.status !== 'leave' && myTodayEvening.status !== 'holiday' ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleCheckOut(myTodayEvening.id, 'evening')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>1-Click Check-Out Evening (Auto-Time)</span>
                  </button>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">Checked in at {myTodayEvening.arrivalTime}</span>
                    <button
                      onClick={() => setDeleteTargetLog(myTodayEvening)}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Cancel Punch
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Evening Session Complete</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setCorrectingLog(myTodayEvening);
                        setCorrectionForm({
                          session: myTodayEvening.session,
                          arrivalTime: myTodayEvening.arrivalTime || '',
                          departureTime: myTodayEvening.departureTime || '',
                          status: myTodayEvening.status,
                          reason: '',
                        });
                      }}
                      className="rounded p-1 text-gray-500 hover:text-purple-600 hover:bg-white"
                      title="Edit Punch Log"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetLog(myTodayEvening)}
                      className="rounded p-1 text-gray-500 hover:text-rose-600 hover:bg-white"
                      title="Delete Punch Log"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Filter by Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Filter by Faculty Member</label>
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="all">All Faculty Members</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.teacherId}>
                    {t.teacherId} - {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Attendance Log Sheet ({selectedDate})
          </h3>
          <span className="text-[11px] font-semibold text-gray-500">{activeRecords.length} session entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Arrival & Departure</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status & Punctuality</th>
                <th className="py-3 px-4">Remarks / Logged By</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {activeRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                    No attendance records for the selected date and faculty.
                  </td>
                </tr>
              ) : (
                activeRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900 block">{rec.teacherName}</span>
                      <span className="text-[11px] font-mono text-gray-500">{rec.teacherId}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        rec.session === 'morning' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {rec.session}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-800">
                      <span>{rec.arrivalTime || '--:--'}</span>
                      <span className="text-gray-400 mx-1.5">➔</span>
                      <span>{rec.departureTime || '--:--'}</span>
                    </td>

                    <td className="py-3 px-4">
                      {rec.workingDurationMinutes ? (
                        <span className="font-bold text-gray-900">
                          {Math.floor(rec.workingDurationMinutes / 60)}h {rec.workingDurationMinutes % 60}m
                        </span>
                      ) : (
                        <span className="text-gray-400">Ongoing</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          rec.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : rec.status === 'holiday'
                            ? 'bg-purple-50 text-purple-700'
                            : rec.status === 'leave'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {rec.status.toUpperCase()}
                        </span>
                        {rec.lateArrival && (
                          <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-600">
                            Late Arrival
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-gray-600 text-[11px]">
                      <span>{rec.remarks || 'Standard biometric check-in'}</span>
                      <span className="block text-[10px] text-gray-400">By: {rec.markedBy}</span>
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setCorrectingLog(rec);
                              setCorrectionForm({
                                session: rec.session,
                                arrivalTime: rec.arrivalTime || '',
                                departureTime: rec.departureTime || '',
                                status: rec.status,
                                reason: '',
                              });
                            }}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-purple-600"
                            title="Edit Attendance Record"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetLog(rec)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Attendance Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN CORRECTION MODAL */}
      {correctingLog && (
        <Modal
          isOpen={!!correctingLog}
          onClose={() => setCorrectingLog(null)}
          title="Teacher Attendance Correction"
          subtitle={`Faculty: ${correctingLog.teacherName} (${correctingLog.session} session on ${correctingLog.date})`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Session</label>
              <select
                value={correctionForm.session}
                onChange={e => setCorrectionForm({ ...correctionForm, session: e.target.value as TeacherAttendanceSession })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="morning">Morning Session (Inward Entry)</option>
                <option value="evening">Evening Session (Second Session)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Arrival Time</label>
                <input
                  type="time"
                  value={correctionForm.arrivalTime}
                  onChange={e => setCorrectionForm({ ...correctionForm, arrivalTime: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Departure Time</label>
                <input
                  type="time"
                  value={correctionForm.departureTime}
                  onChange={e => setCorrectionForm({ ...correctionForm, departureTime: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Status</label>
              <select
                value={correctionForm.status}
                onChange={e => setCorrectionForm({ ...correctionForm, status: e.target.value as any })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="present">Present</option>
                <option value="late">Late Arrival</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
                <option value="leave">Approved Faculty Leave</option>
                <option value="holiday">Official Holiday / Off Day</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Correction Audit Reason *</label>
              <textarea
                required
                rows={3}
                value={correctionForm.reason}
                onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                placeholder="e.g. Faculty forgot check-out punch after evening lecture..."
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCorrectingLog(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-purple-700"
              >
                Update Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTargetLog}
        onClose={() => setDeleteTargetLog(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Teacher Attendance Log?"
        message={`Are you sure you want to remove the ${deleteTargetLog?.session} session attendance log for ${deleteTargetLog?.teacherName} on ${deleteTargetLog?.date}?`}
        confirmLabel="Delete Log"
      />
    </div>
  );
};
