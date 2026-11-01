import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Calendar,
  User,
  Clock,
  Edit2,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { FeeTransaction, Student } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { exportToExcel, exportToCSV, generateFeeReceiptPDF } from '../components/export/ExportUtils.ts';

export const FeesView: React.FC = () => {
  const {
    students,
    feeTransactions,
    recordFeePayment,
    correctFeeTransaction,
    updateFeeTransaction,
    deleteFeeTransaction,
  } = useData();

  const { currentUser, canManageFees } = useAuth();

  const [activeTab, setActiveTab] = useState<'transactions' | 'defaulters' | 'daily-summary'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('November 2026');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit and Delete transaction states
  const [editingTx, setEditingTx] = useState<FeeTransaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    amountPaid: 0,
    paymentMode: 'Cash' as FeeTransaction['paymentMode'],
    monthFor: 'November 2026',
    discountApplied: 0,
    remainingBalance: 0,
    notes: '',
  });
  const [deleteTargetTx, setDeleteTargetTx] = useState<FeeTransaction | null>(null);

  // Correction state
  const [correctingTx, setCorrectingTx] = useState<FeeTransaction | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');

  // Payment form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amountPaying, setAmountPaying] = useState<number>(4500);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [discountConcession, setDiscountConcession] = useState<number>(0);
  const [monthForInput, setMonthForInput] = useState<string>('November 2026');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // When selected student changes, populate standard monthly fee
  const activeStudent = students.find(s => s.studentId === selectedStudentId);

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    const stu = students.find(s => s.studentId === id);
    if (stu) {
      setAmountPaying(stu.monthlyFee);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return feeTransactions.filter(tx => {
      const matchSearch =
        tx.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.paymentMode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [feeTransactions, searchQuery]);

  // Defaulter list calculation:
  // Students whose fees are due and remaining balance > 0
  const defaultersList = useMemo(() => {
    return students.map(student => {
      // Find all payments made by student for current month
      const studentTxs = feeTransactions.filter(
        t => t.studentId === student.studentId && t.monthFor === selectedMonth
      );
      const paidThisMonth = studentTxs.reduce((sum, t) => sum + t.amountPaid, 0);
      const discountsThisMonth = studentTxs.reduce((sum, t) => sum + t.discountApplied, 0);
      const remaining = Math.max(0, student.monthlyFee - (paidThisMonth + discountsThisMonth));

      return {
        student,
        monthlyFee: student.monthlyFee,
        paid: paidThisMonth,
        discount: discountsThisMonth,
        dueBalance: remaining,
        isDefaulter: remaining > 0,
      };
    }).filter(d => d.isDefaulter);
  }, [students, feeTransactions, selectedMonth]);

  // Submit payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) {
      showToast('Please select a student.');
      return;
    }

    const previousBalance = activeStudent.monthlyFee;
    const remainingBalance = Math.max(0, previousBalance - (amountPaying + discountConcession));

    try {
      const createdTx = await recordFeePayment(
        {
          studentId: activeStudent.studentId,
          studentName: activeStudent.name,
          batchId: activeStudent.assignedBatches[0] || 'General',
          amountPaid: Number(amountPaying),
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMode,
          monthFor: monthForInput,
          discountApplied: Number(discountConcession),
          previousBalance,
          remainingBalance,
          notes: paymentNotes || 'Tuition fee cleared at counter',
          collectedBy: currentUser.name,
        },
        currentUser.name,
        currentUser.role
      );

      showToast(`Receipt ${createdTx.receiptNo} generated for ₹${amountPaying.toLocaleString()}`);
      setIsRecordModalOpen(false);

      // Offer instant download of receipt
      generateFeeReceiptPDF(createdTx, activeStudent);
    } catch (err) {
      showToast('Failed to record payment.');
    }
  };

  // Submit transaction correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingTx || !correctionReason.trim()) return;

    try {
      await correctFeeTransaction(
        correctingTx.id,
        {
          notes: `${correctingTx.notes || ''} [Corrected: ${correctionReason}]`,
        },
        correctionReason,
        currentUser.name,
        currentUser.role
      );
      showToast('Correction note appended to transaction.');
      setCorrectingTx(null);
      setCorrectionReason('');
    } catch (err) {
      showToast('Error correcting transaction.');
    }
  };

  const handleOpenEditTx = (tx: FeeTransaction) => {
    setEditingTx(tx);
    setEditFormData({
      amountPaid: tx.amountPaid,
      paymentMode: tx.paymentMode,
      monthFor: tx.monthFor,
      discountApplied: tx.discountApplied,
      remainingBalance: tx.remainingBalance,
      notes: tx.notes || '',
    });
  };

  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      await updateFeeTransaction(editingTx.id, editFormData, currentUser.name, currentUser.role);
      showToast(`Receipt ${editingTx.receiptNo} updated successfully.`);
      setEditingTx(null);
    } catch (err) {
      showToast('Error updating transaction.');
    }
  };

  const handleConfirmDeleteTx = async () => {
    if (!deleteTargetTx) return;
    try {
      await deleteFeeTransaction(deleteTargetTx.id, currentUser.name, currentUser.role);
      showToast(`Receipt ${deleteTargetTx.receiptNo} deleted.`);
      setDeleteTargetTx(null);
    } catch (err) {
      showToast('Error deleting transaction.');
    }
  };

  // Export transactions
  const handleExportTransactions = () => {
    const data = filteredTransactions.map(t => ({
      'Receipt No': t.receiptNo,
      'Date': t.paymentDate,
      'Student ID': t.studentId,
      'Student Name': t.studentName,
      'Month For': t.monthFor,
      'Amount Paid (INR)': t.amountPaid,
      'Payment Mode': t.paymentMode,
      'Concession / Discount': t.discountApplied,
      'Remaining Balance': t.remainingBalance,
      'Collected By': t.collectedBy,
      'Notes': t.notes || '',
    }));
    exportToExcel(data, `IIS_Fee_Transactions_${new Date().toISOString().split('T')[0]}`);
    showToast('Exported fee transactions to Excel.');
  };

  // Total collected metric
  const totalCollected = feeTransactions.reduce((acc, t) => acc + t.amountPaid, 0);
  const totalDefaulterDues = defaultersList.reduce((acc, d) => acc + d.dueBalance, 0);

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
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Fee Management & Receipts</h1>
          <p className="text-xs text-gray-500">
            Payment collection ledger, official PDF receipts, discounts, and fee defaulters tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageFees && (
            <button
              onClick={() => {
                setSelectedStudentId(students[0]?.studentId || '');
                if (students[0]) setAmountPaying(students[0].monthlyFee);
                setIsRecordModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Collect Fee</span>
            </button>
          )}
          <button
            onClick={handleExportTransactions}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export Ledger</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Total Collections Logged</span>
          <p className="mt-1 text-2xl font-black text-emerald-800">₹{totalCollected.toLocaleString()}</p>
          <span className="text-[11px] text-emerald-600 font-medium">{feeTransactions.length} receipts generated</span>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-700">Outstanding Balance ({selectedMonth})</span>
          <p className="mt-1 text-2xl font-black text-rose-800">₹{totalDefaulterDues.toLocaleString()}</p>
          <span className="text-[11px] text-rose-600 font-medium">{defaultersList.length} students with pending dues</span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-blue-700">Selected Month Billing</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-blue-900">{selectedMonth}</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold rounded-lg border-gray-200 bg-white py-1 px-2 text-gray-800"
            >
              <option value="November 2026">November 2026</option>
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>
          <span className="text-[10px] text-gray-500">Auto due-date: 5th & 10th of each month</span>
        </div>
      </div>

      {/* Sub Tabs: Transactions vs Defaulters List */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'transactions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Transactions & Receipts ({feeTransactions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('defaulters')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'defaulters'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span>Defaulter & Pending List ({defaultersList.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-xs">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search receipt #, student name, ID..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="py-3 px-4">Receipt No & Date</th>
                    <th className="py-3 px-4">Student ID & Name</th>
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Paid Amount</th>
                    <th className="py-3 px-4">Remaining</th>
                    <th className="py-3 px-4 text-right">Receipt & Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(tx => {
                      const studentObj = students.find(s => s.studentId === tx.studentId);
                      return (
                        <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-blue-700 block">{tx.receiptNo}</span>
                            <span className="text-[11px] text-gray-400">{tx.paymentDate}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 block">{tx.studentName}</span>
                            <span className="text-[11px] font-mono text-gray-500">{tx.studentId}</span>
                          </td>

                          <td className="py-3 px-4 text-gray-800">
                            {tx.monthFor}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                              {tx.paymentMode}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-extrabold text-emerald-600 text-sm">
                              ₹{tx.amountPaid.toLocaleString()}
                            </span>
                            {tx.discountApplied > 0 && (
                              <span className="block text-[10px] text-purple-600 font-semibold">
                                Discount: ₹{tx.discountApplied}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {tx.remainingBalance === 0 ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                Nil (Cleared)
                              </span>
                            ) : (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                ₹{tx.remainingBalance.toLocaleString()} Due
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => generateFeeReceiptPDF(tx, studentObj)}
                                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                                title="Download Official Receipt PDF"
                              >
                                <Printer className="h-3.5 w-3.5" /> PDF
                              </button>
                              {canManageFees && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditTx(tx)}
                                    className="rounded-lg p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                    title="Edit Transaction"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setCorrectingTx(tx)}
                                    className="rounded-lg p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                    title="Add Correction Note"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTargetTx(tx)}
                                    className="rounded-lg p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete Transaction"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEFAULTER & OUTSTANDING LIST */}
      {activeTab === 'defaulters' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-rose-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Fee Defaulters for {selectedMonth}
              </h3>
              <p className="text-[11px] text-rose-700">Students with outstanding tuition fee dues</p>
            </div>
            <span className="rounded-full bg-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">
              {defaultersList.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3 px-4">Student ID & Name</th>
                  <th className="py-3 px-4">Class & Batches</th>
                  <th className="py-3 px-4">Parent WhatsApp</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Monthly Fee</th>
                  <th className="py-3 px-4">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Quick Collect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {defaultersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-emerald-600 font-bold">
                      ✓ All student fee dues cleared for {selectedMonth}!
                    </td>
                  </tr>
                ) : (
                  defaultersList.map(def => (
                    <tr key={def.student.id} className="hover:bg-rose-50/20">
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 block">{def.student.name}</span>
                        <span className="text-[11px] font-mono text-gray-500">{def.student.studentId}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800">{def.student.classCourse}</span>
                        <span className="block text-[10px] text-gray-400">{def.student.assignedBatches.join(', ')}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-gray-900">{def.student.whatsappNumber}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-rose-600 font-bold">{def.student.feeDueDate}th of month</span>
                      </td>

                      <td className="py-3 px-4 font-bold text-gray-800">
                        ₹{def.monthlyFee.toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-extrabold text-rose-600 text-sm">
                          ₹{def.dueBalance.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudentId(def.student.studentId);
                            setAmountPaying(def.dueBalance);
                            setIsRecordModalOpen(true);
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs"
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Fee Payment & Issue Receipt"
        subtitle="IIS Institute Cash & Digital Desk"
        maxWidth="lg"
      >
        <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Student *</label>
            <select
              value={selectedStudentId}
              required
              onChange={e => handleStudentSelect(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">Select Enrolled Student</option>
              {students.map(s => (
                <option key={s.id} value={s.studentId}>
                  {s.studentId} - {s.name} ({s.classCourse} • Fee: ₹{s.monthlyFee})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Fee for Month *</label>
              <input
                type="text"
                required
                value={monthForInput}
                onChange={e => setMonthForInput(e.target.value)}
                placeholder="e.g. November 2026"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="Cash">Cash at Counter</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cheque">Bank Cheque</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Amount Paid (INR) *</label>
              <input
                type="number"
                required
                min={1}
                value={amountPaying}
                onChange={e => setAmountPaying(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 font-bold text-emerald-700 text-sm focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Discount / Concession (INR)</label>
              <input
                type="number"
                min={0}
                value={discountConcession}
                onChange={e => setDiscountConcession(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Transaction Ref / Cheque / Remarks</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
              placeholder="e.g. UPI Ref #8273910283 or Cash receipt handed over"
              className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Standard Monthly Tuition:</span>
              <span className="font-bold text-gray-800">₹{(activeStudent?.monthlyFee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Net Paying:</span>
              <span className="font-bold text-emerald-600">₹{amountPaying.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining Balance:</span>
              <span className="font-bold text-rose-600">
                ₹{Math.max(0, (activeStudent?.monthlyFee || 0) - (amountPaying + discountConcession)).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              Confirm & Generate Receipt PDF
            </button>
          </div>
        </form>
      </Modal>

      {/* CORRECTION MODAL */}
      {correctingTx && (
        <Modal
          isOpen={!!correctingTx}
          onClose={() => setCorrectingTx(null)}
          title="Transaction Correction Log"
          subtitle={`Receipt: ${correctingTx.receiptNo} (${correctingTx.studentName})`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
            <p className="text-gray-600">
              In accordance with accounting standards, past transaction amounts are never hard-deleted. A permanent correction audit note will be appended to this receipt.
            </p>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Reason for Adjustment / Note *</label>
              <textarea
                required
                rows={3}
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                placeholder="e.g. Bank chargeback adjustment, partial refund issued..."
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCorrectingTx(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-purple-700"
              >
                Append Correction Note
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT TRANSACTION MODAL */}
      {editingTx && (
        <Modal
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          title="Edit Fee Transaction"
          subtitle={`Receipt: ${editingTx.receiptNo} (${editingTx.studentName})`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditTx} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editFormData.amountPaid}
                  onChange={e => setEditFormData({ ...editFormData, amountPaid: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Mode *</label>
                <select
                  value={editFormData.paymentMode}
                  onChange={e => setEditFormData({ ...editFormData, paymentMode: e.target.value as any })}
                  className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fee Month *</label>
                <input
                  type="text"
                  required
                  value={editFormData.monthFor}
                  onChange={e => setEditFormData({ ...editFormData, monthFor: e.target.value })}
                  placeholder="e.g. November 2026"
                  className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Discount Applied (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={editFormData.discountApplied}
                  onChange={e => setEditFormData({ ...editFormData, discountApplied: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remaining Balance (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={editFormData.remainingBalance}
                  onChange={e => setEditFormData({ ...editFormData, remainingBalance: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Transaction Notes</label>
              <textarea
                rows={2}
                value={editFormData.notes}
                onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-blue-700"
              >
                Update Transaction
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE TRANSACTION DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTargetTx}
        onClose={() => setDeleteTargetTx(null)}
        onConfirm={handleConfirmDeleteTx}
        title="Delete Fee Transaction?"
        message={`Are you sure you want to delete receipt ${deleteTargetTx?.receiptNo} for ${deleteTargetTx?.studentName} (₹${deleteTargetTx?.amountPaid})?`}
        confirmLabel="Delete Transaction"
      />
    </div>
  );
};
