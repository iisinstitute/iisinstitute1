import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  Megaphone,
  Printer,
  CheckCircle,
  AlertTriangle,
  Clock,
  Phone,
  UserCheck,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Student } from '../types/index.ts';
import { generateFeeReceiptPDF, generateReportCardPDF } from '../components/export/ExportUtils.ts';

export const ParentPortalView: React.FC = () => {
  const {
    students,
    studentAttendance,
    feeTransactions,
    studentMarks,
    examinations,
    announcements,
  } = useData();

  const { currentUser, isParent } = useAuth();

  // Find linked children
  const linkedChildren = useMemo(() => {
    // If user has linkedStudentIds, use them
    if (currentUser.linkedStudentIds && currentUser.linkedStudentIds.length > 0) {
      return students.filter(s => currentUser.linkedStudentIds!.includes(s.studentId));
    }
    // Fallback: match by WhatsApp phone or default to first 2 students
    const phoneMatched = students.filter(s => s.whatsappNumber === currentUser.phone);
    if (phoneMatched.length > 0) return phoneMatched;

    return students.slice(0, 2);
  }, [students, currentUser]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    linkedChildren[0]?.studentId || ''
  );

  const activeChild = linkedChildren.find(c => c.studentId === selectedChildId) || linkedChildren[0];

  // Attendance stats for selected child
  const childAttendance = useMemo(() => {
    if (!activeChild) return { rate: 0, present: 0, absent: 0, holiday: 0, total: 0, records: [] };
    const records = studentAttendance.filter(a => a.studentId === activeChild.studentId);
    const present = records.filter(a => a.status === 'present' || a.status === 'late').length;
    const absent = records.filter(a => a.status === 'absent').length;
    const holiday = records.filter(a => a.status === 'holiday').length;
    const accountable = records.length - holiday;
    const rate = accountable > 0 ? Math.round((present / accountable) * 100) : 95;
    return { rate, present, absent, holiday, total: records.length, records };
  }, [activeChild, studentAttendance]);

  // Fee payments for selected child
  const childPayments = useMemo(() => {
    if (!activeChild) return [];
    return feeTransactions.filter(t => t.studentId === activeChild.studentId);
  }, [activeChild, feeTransactions]);

  // Examination marks for selected child
  const childMarks = useMemo(() => {
    if (!activeChild) return [];
    return studentMarks.filter(m => m.studentId === activeChild.studentId);
  }, [activeChild, studentMarks]);

  // Announcements targeted at parents or all
  const parentAnnouncements = announcements.filter(
    a => a.targetAudience === 'parents' || a.targetAudience === 'all'
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="rounded-2xl border border-purple-200 bg-linear-to-r from-purple-700 via-indigo-700 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src="/assets/aistudio/image_5aac2d2d.png"
              alt="IIS Institute Logo"
              className="h-16 w-16 shrink-0 object-contain rounded-2xl bg-white p-1.5 shadow-lg border border-white/40"
            />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <UserCheck className="h-3.5 w-3.5" />
                IIS Institute Parent Connect Portal
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight">
                Hello, {currentUser.name}
              </h1>
              <p className="mt-1 text-xs text-purple-100">
                Direct access to your child's classroom attendance, test evaluations, report cards, and fee receipts.
              </p>
            </div>
          </div>

          {/* Child Switcher (If parent has multiple children at IIS) */}
          {linkedChildren.length > 1 && (
            <div className="rounded-xl bg-white/10 p-2 backdrop-blur-md border border-white/20">
              <span className="text-[10px] uppercase font-bold text-purple-200 block mb-1">Select Child:</span>
              <div className="flex gap-2">
                {linkedChildren.map(child => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.studentId)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      child.studentId === activeChild?.studentId
                        ? 'bg-white text-purple-900 shadow-md'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {child.name} ({child.classCourse})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeChild && (
        <>
          {/* Child Profile Quick Bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white font-extrabold text-lg">
                  {activeChild.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{activeChild.name}</h3>
                  <p className="text-xs text-gray-500">
                    ID: <strong>{activeChild.studentId}</strong> • Program: <strong>{activeChild.classCourse}</strong> • Batches: {activeChild.assignedBatches.join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Monthly Tuition</span>
                  <span className="text-sm font-extrabold text-gray-900">₹{activeChild.monthlyFee.toLocaleString()}</span>
                </div>
                <div className="text-right pl-3 border-l border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Due Day</span>
                  <span className="text-sm font-extrabold text-blue-600">{activeChild.feeDueDate}th of month</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Metric Cards: Attendance, Exam Performance, Fee Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Attendance Card */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Attendance Rate</span>
                <CalendarCheck className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-blue-800">{childAttendance.rate}%</p>
              <p className="mt-1 text-xs text-blue-600">
                {childAttendance.present} classes attended • {childAttendance.absent} absences
              </p>
            </div>

            {/* Exam Average Card */}
            <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Academic Standing</span>
                <GraduationCap className="h-4 w-4 text-purple-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-purple-800">
                {childMarks.length > 0
                  ? `${Math.round(childMarks.reduce((a, m) => a + m.percentage, 0) / childMarks.length)}%`
                  : 'Pending'}
              </p>
              <p className="mt-1 text-xs text-purple-600">
                {childMarks.length} diagnostic assessments recorded
              </p>
            </div>

            {/* Fee Status Card */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Fee Payment Status</span>
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-800">
                {childPayments.length > 0 && childPayments[0].remainingBalance === 0
                  ? 'All Cleared'
                  : `₹${activeChild.monthlyFee.toLocaleString()}`}
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                {childPayments.length} verified receipts on record
              </p>
            </div>
          </div>

          {/* Section: Academic Report Cards */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Assessment Reports & Official Report Cards
                </h3>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {childMarks.length === 0 ? (
                <p className="py-8 text-center text-xs text-gray-400">
                  No examination results published yet for {activeChild.name}.
                </p>
              ) : (
                childMarks.map(m => {
                  const examObj = examinations.find(e => e.id === m.examId);
                  return (
                    <div key={m.id} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">{m.examTitle}</h4>
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            Grade {m.grade}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                          {Object.entries(m.marks).map(([subj, info]) => (
                            <span key={subj} className="rounded bg-gray-100 px-2 py-0.5 text-[11px]">
                              {subj}: <strong>{info.isAbsent ? 'Absent' : info.marksObtained}</strong>
                            </span>
                          ))}
                        </div>
                        {m.teacherRemarks && (
                          <p className="mt-2 text-xs text-gray-500 italic">
                            Teacher's Remark: "{m.teacherRemarks}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-lg font-black text-blue-700">{m.percentage.toFixed(1)}%</span>
                          <span className="block text-[10px] text-gray-400">Score: {m.totalMarks}/{m.maxTotalMarks}</span>
                        </div>
                        <button
                          onClick={() => generateReportCardPDF(m, examObj, activeChild)}
                          className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>PDF Report</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Fee Payment Receipts */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Payment History & Official Receipts
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Month For</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Download Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {childPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                        No payments recorded yet for this child.
                      </td>
                    </tr>
                  ) : (
                    childPayments.map(tx => (
                      <tr key={tx.id} className="hover:bg-blue-50/20">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{tx.receiptNo}</td>
                        <td className="py-3 px-4">{tx.paymentDate}</td>
                        <td className="py-3 px-4">{tx.monthFor}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{tx.paymentMode}</td>
                        <td className="py-3 px-4 font-extrabold text-emerald-600">₹{tx.amountPaid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => generateFeeReceiptPDF(tx, activeChild)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                          >
                            <Printer className="h-3 w-3" /> PDF Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Institute Announcements for Parents */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Megaphone className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Official Institute Notices & Announcements
              </h3>
            </div>

            <div className="mt-3 space-y-3">
              {parentAnnouncements.map(ann => (
                <div key={ann.id} className="rounded-xl border border-gray-100 bg-purple-50/30 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-purple-700">
                      From: {ann.createdBy}
                    </span>
                    {ann.priority === 'urgent' && (
                      <span className="rounded bg-rose-100 px-2 py-0.2 text-[9px] font-bold text-rose-700">
                        Urgent Notice
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-gray-900">{ann.title}</h4>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
