import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Users,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  Clock,
  ShieldCheck,
  Printer,
  CheckCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { exportToExcel, exportToCSV } from '../components/export/ExportUtils.ts';

export const ReportsView: React.FC = () => {
  const {
    students,
    teachers,
    batches,
    studentAttendance,
    teacherAttendance,
    feeTransactions,
    studentMarks,
    auditLogs,
  } = useData();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Export Student Master List
  const handleExportStudents = (format: 'excel' | 'csv') => {
    const data = students.map(s => ({
      'Student ID': s.studentId,
      'Name': s.name,
      'Father Name': s.fatherName,
      'WhatsApp': s.whatsappNumber,
      'Class': s.classCourse,
      'Batches': s.assignedBatches.join(', '),
      'Monthly Fee (INR)': s.monthlyFee,
      'Due Date': s.feeDueDate,
      'Status': s.status,
      'Admission Date': s.admissionDate,
    }));
    if (format === 'excel') exportToExcel(data, `IIS_Student_Directory_${todayStr}`);
    else exportToCSV(data, `IIS_Student_Directory_${todayStr}`);
    showToast(`Exported Student Master List (${format.toUpperCase()})`);
  };

  // 2. Export Student Attendance Register
  const handleExportAttendance = (format: 'excel' | 'csv') => {
    const data = studentAttendance.map(a => ({
      'Date': a.date,
      'Student ID': a.studentId,
      'Student Name': a.studentName || 'N/A',
      'Batch ID': a.batchId,
      'Status': a.status.toUpperCase(),
      'Marked By': a.markedBy,
      'Correction Note': a.correctionReason || 'None',
    }));
    if (format === 'excel') exportToExcel(data, `IIS_Student_Attendance_Register_${todayStr}`);
    else exportToCSV(data, `IIS_Student_Attendance_Register_${todayStr}`);
    showToast(`Exported Student Attendance Register (${format.toUpperCase()})`);
  };

  // 3. Export Faculty Attendance & Punctuality
  const handleExportTeacherAttendance = (format: 'excel' | 'csv') => {
    const data = teacherAttendance.map(t => ({
      'Date': t.date,
      'Faculty ID': t.teacherId,
      'Faculty Name': t.teacherName || 'Faculty',
      'Session': t.session.toUpperCase(),
      'Arrival': t.arrivalTime || '--',
      'Departure': t.departureTime || '--',
      'Working Duration (Mins)': t.workingDurationMinutes || 0,
      'Status': t.status.toUpperCase(),
      'Late Arrival': t.lateArrival ? 'YES' : 'NO',
      'Remarks': t.remarks || '',
    }));
    if (format === 'excel') exportToExcel(data, `IIS_Faculty_Attendance_Logs_${todayStr}`);
    else exportToCSV(data, `IIS_Faculty_Attendance_Logs_${todayStr}`);
    showToast(`Exported Faculty Attendance Report (${format.toUpperCase()})`);
  };

  // 4. Export Fee Collection Ledger
  const handleExportFees = (format: 'excel' | 'csv') => {
    const data = feeTransactions.map(tx => ({
      'Receipt No': tx.receiptNo,
      'Payment Date': tx.paymentDate,
      'Student ID': tx.studentId,
      'Student Name': tx.studentName,
      'Month For': tx.monthFor,
      'Amount Paid (INR)': tx.amountPaid,
      'Mode': tx.paymentMode,
      'Discount Applied': tx.discountApplied,
      'Remaining Balance': tx.remainingBalance,
      'Collected By': tx.collectedBy,
      'Notes': tx.notes || '',
    }));
    if (format === 'excel') exportToExcel(data, `IIS_Fee_Collection_Ledger_${todayStr}`);
    else exportToCSV(data, `IIS_Fee_Collection_Ledger_${todayStr}`);
    showToast(`Exported Fee Collection Ledger (${format.toUpperCase()})`);
  };

  // 5. Export Examination Merit Summary
  const handleExportExams = (format: 'excel' | 'csv') => {
    const data = studentMarks.map(m => ({
      'Exam Title': m.examTitle,
      'Student ID': m.studentId,
      'Student Name': m.studentName,
      'Batch ID': m.batchId,
      'Total Marks Scored': m.totalMarks,
      'Max Marks': m.maxTotalMarks,
      'Percentage': `${m.percentage.toFixed(1)}%`,
      'Grade': m.grade,
      'Rank': m.rank || 'N/A',
      'Teacher Remarks': m.teacherRemarks || '',
    }));
    if (format === 'excel') exportToExcel(data, `IIS_Exam_Merit_Summary_${todayStr}`);
    else exportToCSV(data, `IIS_Exam_Merit_Summary_${todayStr}`);
    showToast(`Exported Examination Summary (${format.toUpperCase()})`);
  };

  // 6. Export Audit Trail
  const handleExportAudit = (format: 'excel' | 'csv') => {
    const data = auditLogs.map(l => ({
      'Timestamp': l.timestamp,
      'Action': l.action,
      'Entity Type': l.entityType,
      'Entity ID': l.entityId,
      'Performed By': l.performedBy,
      'User Role': l.userRole,
      'Details': l.details,
    }));
    if (format === 'excel') exportToExcel(data, `IIS_System_Audit_Trail_${todayStr}`);
    else exportToCSV(data, `IIS_System_Audit_Trail_${todayStr}`);
    showToast(`Exported Audit Trail (${format.toUpperCase()})`);
  };

  const reportCards = [
    {
      id: 'students',
      title: 'Student Directory & Admission Master',
      description: 'Comprehensive roster of all students, enrolled classes, contact numbers, and parent details.',
      icon: Users,
      badge: `${students.length} Records`,
      color: 'blue',
      onExcel: () => handleExportStudents('excel'),
      onCSV: () => handleExportStudents('csv'),
    },
    {
      id: 'student-attendance',
      title: 'Student Attendance Register',
      description: 'Daily batch-wise student attendance records, consecutive absences, and audit corrections.',
      icon: CalendarCheck,
      badge: `${studentAttendance.length} Entries`,
      color: 'purple',
      onExcel: () => handleExportAttendance('excel'),
      onCSV: () => handleExportAttendance('csv'),
    },
    {
      id: 'fee-collection',
      title: 'Fee Collection & Defaulter Report',
      description: 'Transaction ledger, receipts history, discounts, outstanding balances, and mode breakdown.',
      icon: CreditCard,
      badge: `₹${feeTransactions.reduce((a, t) => a + t.amountPaid, 0).toLocaleString()} Collected`,
      color: 'emerald',
      onExcel: () => handleExportFees('excel'),
      onCSV: () => handleExportFees('csv'),
    },
    {
      id: 'teacher-attendance',
      title: 'Faculty Two-Session Attendance & Punctuality',
      description: 'Morning and evening biometric entries, arrival/departure logs, working hours, and late arrival flags.',
      icon: Clock,
      badge: `${teacherAttendance.length} Sessions`,
      color: 'indigo',
      onExcel: () => handleExportTeacherAttendance('excel'),
      onCSV: () => handleExportTeacherAttendance('csv'),
    },
    {
      id: 'exam-merit',
      title: 'Examination Results & Batch Merit List',
      description: 'Class test scores, grade distributions, percentage calculations, and faculty academic remarks.',
      icon: GraduationCap,
      badge: `${studentMarks.length} Scorecards`,
      color: 'purple',
      onExcel: () => handleExportExams('excel'),
      onCSV: () => handleExportExams('csv'),
    },
    {
      id: 'audit-log',
      title: 'System Security & Operations Audit Trail',
      description: 'Permanent log of all admissions, attendance corrections, fee receipts, and faculty check-ins.',
      icon: ShieldCheck,
      badge: `${auditLogs.length} Events`,
      color: 'amber',
      onExcel: () => handleExportAudit('excel'),
      onCSV: () => handleExportAudit('csv'),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Centralized Reports & Data Export</h1>
        <p className="text-xs text-gray-500">
          Instant offline and cloud generation of Excel (.xlsx) and CSV reports for administrative compliance and audits.
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map(rep => {
          const Icon = rep.icon;
          return (
            <div
              key={rep.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold shadow-2xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-700">
                    {rep.badge}
                  </span>
                </div>

                <h3 className="mt-3.5 text-sm font-bold text-gray-900 leading-snug">{rep.title}</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{rep.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={rep.onExcel}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Download Excel</span>
                </button>
                <button
                  onClick={rep.onCSV}
                  className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Download CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
