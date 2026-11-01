import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Save,
  Edit3,
  Trash2,
  Search,
  Filter,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { AttendanceStatus, StudentAttendance } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { exportToExcel, exportToCSV } from '../components/export/ExportUtils.ts';

export const AttendanceView: React.FC = () => {
  const {
    students,
    batches,
    studentAttendance,
    bulkMarkStudentAttendance,
    correctStudentAttendance,
    deleteStudentAttendance,
  } = useData();

  const { currentUser, isTeacher, isAdmin } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Accessible batches: Teachers can only view/mark their assigned batches
  const availableBatches = useMemo(() => {
    if (isAdmin) return batches;
    if (isTeacher && currentUser.linkedTeacherId) {
      return batches.filter(b => b.assignedTeacherIds.includes(currentUser.linkedTeacherId!));
    }
    return batches;
  }, [batches, isAdmin, isTeacher, currentUser]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    availableBatches[0]?.batchId || ''
  );

  // Search in attendance roster
  const [searchRoster, setSearchRoster] = useState('');

  // Attendance correction & deletion state
  const [correctingRecord, setCorrectingRecord] = useState<StudentAttendance | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<StudentAttendance | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active batch object
  const currentBatch = batches.find(b => b.batchId === selectedBatchId);

  // Students in this batch
  const batchStudents = useMemo(() => {
    if (!selectedBatchId) return [];
    return students.filter(s => s.assignedBatches.includes(selectedBatchId));
  }, [students, selectedBatchId]);

  // Existing attendance for selectedBatch and selectedDate
  const existingAttendanceMap = useMemo(() => {
    const map = new Map<string, StudentAttendance>();
    studentAttendance
      .filter(a => a.batchId === selectedBatchId && a.date === selectedDate)
      .forEach(a => map.set(a.studentId, a));
    return map;
  }, [studentAttendance, selectedBatchId, selectedDate]);

  // Working state for marking attendance
  const [workingStatusMap, setWorkingStatusMap] = useState<Record<string, AttendanceStatus>>({});

  // Sync working status when batch or date changes
  React.useEffect(() => {
    const initialMap: Record<string, AttendanceStatus> = {};
    batchStudents.forEach(stu => {
      const existing = existingAttendanceMap.get(stu.studentId);
      initialMap[stu.studentId] = existing ? existing.status : 'present';
    });
    setWorkingStatusMap(initialMap);
  }, [selectedBatchId, selectedDate, batchStudents, existingAttendanceMap]);

  // Quick mark all present
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    batchStudents.forEach(s => {
      updated[s.studentId] = status;
    });
    setWorkingStatusMap(updated);
  };

  // Submit batch attendance
  const handleSaveAttendance = async () => {
    if (!currentBatch || batchStudents.length === 0) return;

    const records: Omit<StudentAttendance, 'id'>[] = batchStudents.map(stu => ({
      studentId: stu.studentId,
      studentName: stu.name,
      batchId: currentBatch.batchId,
      batchName: currentBatch.name,
      date: selectedDate,
      status: workingStatusMap[stu.studentId] || 'present',
      markedBy: currentUser.name,
      markedAt: new Date().toISOString(),
    }));

    try {
      await bulkMarkStudentAttendance(records, currentUser.name, currentUser.role);
      showToast(`Attendance recorded for ${records.length} students in ${currentBatch.name}`);
    } catch (err) {
      console.error(err);
      showToast('Error recording attendance.');
    }
  };

  // Submit attendance correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord || !correctionReason.trim()) return;

    try {
      await correctStudentAttendance(correctingRecord.id, newStatus, correctionReason, currentUser.name, currentUser.role);
      showToast(`Attendance corrected to ${newStatus.toUpperCase()}`);
      setCorrectingRecord(null);
      setCorrectionReason('');
    } catch (err) {
      showToast('Error updating attendance correction.');
    }
  };

  const handleDeleteAttendanceRecord = async () => {
    if (!recordToDelete) return;
    try {
      await deleteStudentAttendance(recordToDelete.id, currentUser.name, currentUser.role);
      showToast(`Deleted attendance record for ${recordToDelete.studentName || recordToDelete.studentId}.`);
      setRecordToDelete(null);
    } catch {
      showToast('Error deleting attendance record.');
    }
  };

  // Stats for the selected batch on the selected date
  const totalEnrolled = batchStudents.length;
  const presentCount = Object.values(workingStatusMap).filter(s => s === 'present' || s === 'late').length;
  const absentCount = Object.values(workingStatusMap).filter(s => s === 'absent').length;
  const leaveCount = Object.values(workingStatusMap).filter(s => s === 'leave').length;
  const holidayCount = Object.values(workingStatusMap).filter(s => s === 'holiday').length;
  const accountableStudents = totalEnrolled - holidayCount;
  const currentPct = accountableStudents > 0
    ? Math.round((presentCount / accountableStudents) * 100)
    : (holidayCount > 0 ? 100 : 0);

  // Export current attendance register
  const handleExportAttendanceExcel = () => {
    const data = batchStudents.map(s => {
      const rec = existingAttendanceMap.get(s.studentId);
      return {
        'Student ID': s.studentId,
        'Student Name': s.name,
        'Class': s.classCourse,
        'Batch': selectedBatchId,
        'Date': selectedDate,
        'Status': (rec?.status || workingStatusMap[s.studentId] || 'Unmarked').toUpperCase(),
        'Marked By': rec?.markedBy || currentUser.name,
      };
    });
    exportToExcel(data, `Attendance_${selectedBatchId}_${selectedDate}`);
    showToast('Exported attendance register to Excel.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Student Attendance System</h1>
          <p className="text-xs text-gray-500">
            {isTeacher && !isAdmin
              ? `Mark attendance for your assigned batches (Teacher Mode: ${currentUser.name})`
              : 'Daily session register, batch records, and consecutive absence tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAttendanceExcel}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export Register</span>
          </button>
          <button
            onClick={handleSaveAttendance}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save Attendance</span>
          </button>
        </div>
      </div>

      {/* Date & Batch Selector Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Attendance Date</label>
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

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Batch</label>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              {availableBatches.length === 0 ? (
                <option value="">No Assigned Batches Found</option>
              ) : (
                availableBatches.map(b => (
                  <option key={b.id} value={b.batchId}>
                    {b.batchId} - {b.name} ({b.classCourse})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Search in Roster</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchRoster}
                onChange={e => setSearchRoster(e.target.value)}
                placeholder="Search student in this batch..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Metrics Pill Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Enrolled</span>
          <p className="mt-1 text-xl font-extrabold text-gray-900">{totalEnrolled}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Present / Late</span>
          <p className="mt-1 text-xl font-extrabold text-emerald-700">{presentCount}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Absent</span>
          <p className="mt-1 text-xl font-extrabold text-rose-700">{absentCount}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Approved Leave</span>
          <p className="mt-1 text-xl font-extrabold text-amber-800">{leaveCount}</p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Institute Holiday</span>
          <p className="mt-1 text-xl font-extrabold text-purple-800">{holidayCount}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Attendance Rate</span>
          <p className="mt-1 text-xl font-extrabold text-blue-700">{currentPct}%</p>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">Batch: {currentBatch?.name || 'Select Batch'}</span>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-medium text-gray-500">Timing: {currentBatch?.timing}</span>
          </div>

          {/* Quick Mark All Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-500 mr-1">Mark All:</span>
            <button
              onClick={() => handleMarkAll('present')}
              className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-200"
            >
              All Present
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="rounded-lg bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-200"
            >
              All Absent
            </button>
            <button
              onClick={() => handleMarkAll('leave')}
              className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200"
            >
              All Leave
            </button>
            <button
              onClick={() => handleMarkAll('holiday')}
              className="rounded-lg bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-200"
            >
              All Holiday
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 px-4">Student ID & Name</th>
                <th className="py-3 px-4">Consecutive Absence Status</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4 text-right">Audit & Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {batchStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-gray-400">
                    No students currently enrolled in this batch.
                  </td>
                </tr>
              ) : (
                batchStudents
                  .filter(s => s.name.toLowerCase().includes(searchRoster.toLowerCase()) || s.studentId.includes(searchRoster))
                  .map(student => {
                    const currentStatus = workingStatusMap[student.studentId] || 'present';
                    const existingRecord = existingAttendanceMap.get(student.studentId);

                    // Check consecutive absence in past classes
                    const pastRecords = studentAttendance
                      .filter(a => a.studentId === student.studentId && a.batchId === selectedBatchId)
                      .sort((a, b) => b.date.localeCompare(a.date));
                    const recentAbsences = pastRecords.slice(0, 3).filter(r => r.status === 'absent').length;

                    return (
                      <tr key={student.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 block">{student.name}</span>
                              <span className="text-[11px] font-mono text-gray-500">{student.studentId}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {recentAbsences >= 2 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              <AlertTriangle className="h-3 w-3" /> Absent in {recentAbsences} recent classes
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Regular Attendance</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(['present', 'absent', 'late', 'leave', 'holiday'] as AttendanceStatus[]).map(status => {
                              const isSelected = currentStatus === status;
                              const colors = {
                                present: isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700',
                                absent: isSelected ? 'bg-rose-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700',
                                late: isSelected ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700',
                                leave: isSelected ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                                holiday: isSelected ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-700 hover:bg-purple-100',
                              };

                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() =>
                                    setWorkingStatusMap(prev => ({ ...prev, [student.studentId]: status }))
                                  }
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${colors[status]}`}
                                >
                                  {status === 'leave' ? 'On Leave' : status === 'holiday' ? 'Holiday' : status}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {existingRecord ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {existingRecord.correctionReason && (
                                <span
                                  className="text-[10px] text-amber-600 underline cursor-help mr-1"
                                  title={`Corrected: ${existingRecord.correctionReason}`}
                                >
                                  Corrected
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setCorrectingRecord(existingRecord);
                                  setNewStatus(existingRecord.status);
                                  setCorrectionReason(existingRecord.correctionReason || '');
                                }}
                                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-100"
                                title="Edit Attendance"
                              >
                                <Edit3 className="h-3 w-3 text-purple-600" /> Correct
                              </button>
                              <button
                                onClick={() => setRecordToDelete(existingRecord)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="Delete Attendance Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400">Not Saved Yet</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ATTENDANCE CORRECTION MODAL */}
      {correctingRecord && (
        <Modal
          isOpen={!!correctingRecord}
          onClose={() => setCorrectingRecord(null)}
          title="Attendance Correction & Audit Log"
          subtitle={`Student: ${correctingRecord.studentName} (${correctingRecord.studentId})`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">New Attendance Status</label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as AttendanceStatus)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late Arrival</option>
                <option value="leave">Approved Leave</option>
                <option value="holiday">Institute Holiday / Declared Off</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Reason for Correction (Required for Audit Trail) *
              </label>
              <textarea
                required
                rows={3}
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                placeholder="e.g. Parent provided medical certificate; student arrived 20 mins late due to bus breakdown..."
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCorrectingRecord(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-purple-700"
              >
                Apply Correction
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ATTENDANCE RECORD DELETION CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteAttendanceRecord}
        title="Delete Attendance Record?"
        message={`Are you sure you want to delete the attendance log for ${recordToDelete?.studentName || recordToDelete?.studentId} on ${recordToDelete?.date}? This will delete the entry from the institute attendance database.`}
        confirmLabel="Delete Record"
      />
    </div>
  );
};
