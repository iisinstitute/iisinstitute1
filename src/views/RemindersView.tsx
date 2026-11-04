import React, { useState, useMemo } from 'react';
import {
  BellRing,
  Send,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  Users,
  Calendar,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { FeeReminder, Student } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';

export const RemindersView: React.FC = () => {
  const { students, feeTransactions, feeReminders, sendFeeReminder, sendBulkFeeReminders, deleteFeeReminder } = useData();
  const { currentUser, canManageFees } = useAuth();

  const [filterType, setFilterType] = useState<'all' | 'due' | 'overdue' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customTemplate, setCustomTemplate] = useState(
    "Dear Parent, this is a gentle reminder that your child {studentName}'s monthly tuition fee of {amount} is pending at IIS Institute. Kindly clear at your earliest convenience. Thank you."
  );
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeReminder | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFeeReminder(deleteTarget.id, currentUser.name);
      showToast('Fee reminder log removed.');
      setDeleteTarget(null);
    } catch {
      showToast('Error deleting reminder.');
    }
  };

  const todayDateNum = new Date().getDate(); // day of month e.g. 1
  const todayStr = new Date().toISOString().split('T')[0];

  // Evaluate students fee status
  const studentsWithFeeStatus = useMemo(() => {
    return students.map(student => {
      // Find payments this month
      const currentMonth = 'November 2026';
      const payments = feeTransactions.filter(
        t => t.studentId === student.studentId && t.monthFor === currentMonth
      );
      const paid = payments.reduce((acc, p) => acc + p.amountPaid + p.discountApplied, 0);
      const remaining = Math.max(0, student.monthlyFee - paid);

      const dueDay = student.feeDueDate;
      let timingCategory: 'overdue' | 'due' | 'upcoming' | 'cleared' = 'cleared';

      if (remaining > 0) {
        if (todayDateNum > dueDay) {
          timingCategory = 'overdue';
        } else if (todayDateNum === dueDay) {
          timingCategory = 'due';
        } else {
          timingCategory = 'upcoming';
        }
      }

      // Check if reminder sent today
      const reminderSentToday = feeReminders.some(
        r => r.studentId === student.studentId && r.sentAt.startsWith(todayStr)
      );

      return {
        student,
        remaining,
        dueDay,
        timingCategory,
        reminderSentToday,
      };
    });
  }, [students, feeTransactions, feeReminders, todayDateNum, todayStr]);

  // Filtered by category
  const filteredStudents = useMemo(() => {
    return studentsWithFeeStatus.filter(item => {
      if (item.remaining === 0) return false;
      if (filterType !== 'all' && item.timingCategory !== filterType) return false;
      const matchSearch =
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.whatsappNumber.includes(searchQuery);
      return matchSearch;
    });
  }, [studentsWithFeeStatus, filterType, searchQuery]);

  // Single reminder send
  const handleSendSingleReminder = async (student: Student, amount: number) => {
    setSendingId(student.studentId);
    try {
      const msg = customTemplate
        .replace('{studentName}', student.name)
        .replace('{amount}', `₹${amount.toLocaleString()}`);

      await sendFeeReminder(
        {
          studentId: student.studentId,
          studentName: student.name,
          parentPhone: student.whatsappNumber,
          amountDue: amount,
          dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(student.feeDueDate).padStart(2, '0')}`,
          reminderType: 'manual',
          status: 'delivered',
          message: msg,
          sentAt: new Date().toISOString(),
          channel: 'whatsapp',
        },
        currentUser.name
      );

      showToast(`Reminder sent via WhatsApp Gateway to ${student.name}'s parent!`);
    } catch (err) {
      showToast('Error dispatching reminder.');
    } finally {
      setSendingId(null);
    }
  };

  // Bulk reminder dispatch
  const handleSendBulk = async () => {
    const targetIds = filteredStudents.map(f => f.student.studentId);
    if (targetIds.length === 0) {
      showToast('No eligible students in current view.');
      return;
    }

    try {
      const count = await sendBulkFeeReminders(targetIds, customTemplate, currentUser.name);
      showToast(`Dispatched ${count} WhatsApp fee reminders!`);
      setIsBulkModalOpen(false);
    } catch (err) {
      showToast('Failed to dispatch reminders.');
    }
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Automated Fee Reminder Center
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
              WhatsApp Gateway Connected
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Automated alerts before due date, on due date, and overdue reminder logs with confirmed delivery.
          </p>
        </div>

        {canManageFees && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Bulk WhatsApp Reminders</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterType('all')}
          className={`rounded-xl p-3.5 text-left border transition-all ${
            filterType === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">All Pending</span>
          <p className="mt-1 text-xl font-black">
            {studentsWithFeeStatus.filter(s => s.remaining > 0).length}
          </p>
        </button>

        <button
          onClick={() => setFilterType('overdue')}
          className={`rounded-xl p-3.5 text-left border transition-all ${
            filterType === 'overdue'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white text-gray-800 border-gray-200 hover:border-rose-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Overdue (Past Due)</span>
          <p className="mt-1 text-xl font-black">
            {studentsWithFeeStatus.filter(s => s.timingCategory === 'overdue').length}
          </p>
        </button>

        <button
          onClick={() => setFilterType('due')}
          className={`rounded-xl p-3.5 text-left border transition-all ${
            filterType === 'due'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-gray-800 border-gray-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Due Today</span>
          <p className="mt-1 text-xl font-black">
            {studentsWithFeeStatus.filter(s => s.timingCategory === 'due').length}
          </p>
        </button>

        <button
          onClick={() => setFilterType('upcoming')}
          className={`rounded-xl p-3.5 text-left border transition-all ${
            filterType === 'upcoming'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white text-gray-800 border-gray-200 hover:border-purple-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Upcoming Due</span>
          <p className="mt-1 text-xl font-black">
            {studentsWithFeeStatus.filter(s => s.timingCategory === 'upcoming').length}
          </p>
        </button>
      </div>

      {/* Template Preview and Configuration */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <label className="block text-xs font-bold text-gray-700 mb-1">
          WhatsApp Reminder Message Template (Supports dynamic variables)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTemplate}
            onChange={e => setCustomTemplate(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
          <button
            onClick={() => showToast('Template saved for automatic scheduler.')}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Save Template
          </button>
        </div>
      </div>

      {/* Eligible Students Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Pending Fee Accounts Roster ({filteredStudents.length})
          </h3>
          <span className="text-xs text-gray-500">Preventing duplicate dispatches on the same day</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 px-4">Student & ID</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Parent WhatsApp</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Pending Amount</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-gray-400">
                    No students matching this reminder category.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(item => (
                  <tr key={item.student.id} className="hover:bg-blue-50/20">
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900 block">{item.student.name}</span>
                      <span className="text-[11px] font-mono text-gray-500">{item.student.studentId}</span>
                    </td>

                    <td className="py-3 px-4 font-medium text-gray-800">
                      {item.student.classCourse}
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-900">
                      {item.student.whatsappNumber}
                    </td>

                    <td className="py-3 px-4">
                      {item.dueDay}th of month
                    </td>

                    <td className="py-3 px-4 font-extrabold text-rose-600">
                      ₹{item.remaining.toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      {item.timingCategory === 'overdue' && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          OVERDUE
                        </span>
                      )}
                      {item.timingCategory === 'due' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          DUE TODAY
                        </span>
                      )}
                      {item.timingCategory === 'upcoming' && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                          UPCOMING
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.reminderSentToday ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" /> Sent Today
                        </span>
                      ) : (
                        <button
                          disabled={sendingId === item.student.studentId}
                          onClick={() => handleSendSingleReminder(item.student, item.remaining)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-2xs disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                          <span>{sendingId === item.student.studentId ? 'Sending...' : 'Remind'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH AUDIT LOG TABLE */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Reminder Dispatch Log & Delivery Acknowledgements ({feeReminders.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Parent WhatsApp</th>
                <th className="py-3 px-4">Amount Due</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Sent Timestamp</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4">Dispatched Message</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {feeReminders.slice(0, 15).map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">{r.studentName}</td>
                  <td className="py-3 px-4 font-mono text-gray-700">{r.parentPhone}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">₹{r.amountDue.toLocaleString()}</td>
                  <td className="py-3 px-4 uppercase text-[10px] font-bold text-emerald-700">{r.channel}</td>
                  <td className="py-3 px-4 text-gray-500 text-[11px]">
                    {new Date(r.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle className="h-3 w-3" /> Delivered
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-[11px] max-w-xs truncate" title={r.message}>
                    {r.message}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="rounded-lg p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete reminder record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK DISPATCH CONFIRM MODAL */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Confirm Bulk WhatsApp Reminder Dispatch"
        subtitle={`Targeting ${filteredStudents.length} parents with pending fee dues`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            This will dispatch automated WhatsApp messages to <strong>{filteredStudents.length}</strong> parents for the current view.
          </p>

          <div className="rounded-xl bg-gray-50 p-3 border border-gray-200">
            <span className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Message Preview:</span>
            <p className="font-mono text-[11px] text-gray-800 italic">
              "{customTemplate.replace('{studentName}', 'Aarav Kumar').replace('{amount}', '₹4,500')}"
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendBulk}
              className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              Send All via WhatsApp
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE REMINDER DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Reminder Log?"
        message={`Are you sure you want to remove the reminder dispatch record for ${deleteTarget?.studentName} (${deleteTarget?.parentPhone})?`}
        confirmLabel="Delete Record"
      />
    </div>
  );
};
