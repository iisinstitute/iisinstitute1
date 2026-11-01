import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Student } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { exportToExcel, exportToCSV } from '../components/export/ExportUtils.ts';

export const StudentsView: React.FC = () => {
  const {
    students,
    batches,
    studentAttendance,
    feeTransactions,
    studentMarks,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    transferStudentBatch,
  } = useData();

  const { currentUser, canManageStudents } = useAuth();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [transferTarget, setTransferTarget] = useState<Student | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Transfer batch form state
  const [transferFromBatch, setTransferFromBatch] = useState('');
  const [transferToBatch, setTransferToBatch] = useState('');

  // Form state
  const initialForm: Omit<Student, 'id' | 'studentId'> & { studentId?: string } = {
    name: '',
    fatherName: '',
    whatsappNumber: '',
    address: '',
    dob: '2009-01-01',
    gender: 'Male',
    classCourse: 'Class 10',
    assignedBatches: [],
    monthlyFee: 4500,
    feeDueDate: 5,
    status: 'active',
    notes: '',
    admissionDate: new Date().toISOString().split('T')[0],
    joiningDate: new Date().toISOString().split('T')[0],
  };

  const [formData, setFormData] = useState(initialForm);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.whatsappNumber.includes(searchQuery) ||
        s.fatherName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = selectedClass === 'all' || s.classCourse === selectedClass;
      const matchBatch = selectedBatch === 'all' || s.assignedBatches.includes(selectedBatch);
      const matchStatus = selectedStatus === 'all' || s.status === selectedStatus;

      return matchSearch && matchClass && matchBatch && matchStatus;
    });
  }, [students, searchQuery, selectedClass, selectedBatch, selectedStatus]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData(initialForm);
    setIsAddEditOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      studentId: student.studentId,
      name: student.name,
      fatherName: student.fatherName,
      whatsappNumber: student.whatsappNumber,
      address: student.address,
      dob: student.dob,
      gender: student.gender,
      classCourse: student.classCourse,
      assignedBatches: [...student.assignedBatches],
      monthlyFee: student.monthlyFee,
      feeDueDate: student.feeDueDate,
      status: student.status,
      notes: student.notes || '',
      admissionDate: student.admissionDate || student.joiningDate || new Date().toISOString().split('T')[0],
      joiningDate: student.joiningDate || student.admissionDate || new Date().toISOString().split('T')[0],
    });
    setIsAddEditOpen(true);
  };

  // Handle Save
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        admissionDate: formData.admissionDate || formData.joiningDate,
        joiningDate: formData.joiningDate || formData.admissionDate,
      };
      if (editingStudent) {
        await updateStudent(editingStudent.id, payload, currentUser.name, currentUser.role);
        showToast(`Student ${formData.name} updated successfully.`);
      } else {
        await addStudent(payload, currentUser.name, currentUser.role);
        showToast(`Student ${formData.name} admitted successfully.`);
      }
      setIsAddEditOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Error saving student record.');
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStudent(deleteTarget.id, currentUser.name, currentUser.role);
      showToast(`Student record for ${deleteTarget.name} removed.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast('Error removing student.');
    }
  };

  // Handle Batch Transfer
  const handleBatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget || !transferFromBatch || !transferToBatch) return;
    try {
      await transferStudentBatch(transferTarget.studentId, transferFromBatch, transferToBatch, currentUser.name, currentUser.role);
      showToast(`Transferred ${transferTarget.name} to batch ${transferToBatch}`);
      setTransferTarget(null);
    } catch (err) {
      showToast('Failed to transfer batch.');
    }
  };

  // Handle CSV Import
  const handleProcessImport = async () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const imported: Partial<Student>[] = [];

    // Header expected: Name, FatherName, WhatsApp, Class, MonthlyFee, DateOfJoining
    const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 3 && parts[0]) {
        const jDate = parts[5] || new Date().toISOString().split('T')[0];
        imported.push({
          name: parts[0],
          fatherName: parts[1] || 'Parent',
          whatsappNumber: parts[2],
          classCourse: parts[3] || 'Class 10',
          monthlyFee: Number(parts[4]) || 4500,
          admissionDate: jDate,
          joiningDate: jDate,
        });
      }
    }

    if (imported.length > 0) {
      const count = await importStudents(imported, currentUser.name, currentUser.role);
      showToast(`Imported ${count} students successfully!`);
      setIsImportModalOpen(false);
      setCsvText('');
    } else {
      showToast('No valid student rows found in CSV text.');
    }
  };

  const handleExportExcel = () => {
    const data = filteredStudents.map(s => ({
      'Student ID': s.studentId,
      'Full Name': s.name,
      'Father Name': s.fatherName,
      'WhatsApp Number': s.whatsappNumber,
      'Class / Course': s.classCourse,
      'Batches': s.assignedBatches.join(', '),
      'Monthly Fee (INR)': s.monthlyFee,
      'Fee Due Day': s.feeDueDate,
      'Status': s.status,
      'Admission Date': s.admissionDate,
      'Date of Joining': s.joiningDate || s.admissionDate,
    }));
    exportToExcel(data, `IIS_Students_Master_${new Date().toISOString().split('T')[0]}`);
    showToast('Exported student directory to Excel.');
  };

  const handleExportCSV = () => {
    const data = filteredStudents.map(s => ({
      StudentID: s.studentId,
      Name: s.name,
      FatherName: s.fatherName,
      WhatsApp: s.whatsappNumber,
      ClassCourse: s.classCourse,
      MonthlyFee: s.monthlyFee,
      Status: s.status,
      JoiningDate: s.joiningDate || s.admissionDate,
    }));
    exportToCSV(data, `IIS_Students_List_${new Date().toISOString().split('T')[0]}`);
    showToast('Exported student directory to CSV.');
  };

  // Classes list for filter
  const classesList = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Spoken English', 'Competitive Exam Preparation'];

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
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Student Management</h1>
          <p className="text-xs text-gray-500">
            Admissions, student profiles, batch enrollments, and academic records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageStudents && (
            <>
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Student</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-4 w-4 text-purple-600" />
                <span>Import CSV</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
            title="Download Excel"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
            title="Download CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, mobile..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Classes & Courses</option>
              {classesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.batchId}>
                  {b.batchId} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 px-4">Student ID & Name</th>
                <th className="py-3 px-4">Class & Batches</th>
                <th className="py-3 px-4">Contact (WhatsApp)</th>
                <th className="py-3 px-4">Monthly Fee</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  // Calculate student attendance rate
                  const stuRecords = studentAttendance.filter(a => a.studentId === student.studentId);
                  const presentCount = stuRecords.filter(a => a.status === 'present' || a.status === 'late').length;
                  const attRate = stuRecords.length > 0 ? Math.round((presentCount / stuRecords.length) * 100) : 95;

                  return (
                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-2xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{student.name}</span>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-mono text-blue-600 font-semibold">{student.studentId}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-500">Joined: {student.joiningDate || student.admissionDate}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                          {student.classCourse}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {student.assignedBatches.map(bId => (
                            <span key={bId} className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] text-gray-600">
                              {bId}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-gray-900 font-medium block">{student.whatsappNumber}</span>
                        <span className="text-[11px] text-gray-400">Father: {student.fatherName}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900">₹{student.monthlyFee.toLocaleString()}</span>
                        <span className="block text-[10px] text-gray-400">Due: {student.feeDueDate}th of month</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                attRate >= 80 ? 'bg-emerald-500' : attRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${attRate}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700">{attRate}%</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {student.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingStudent(student)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canManageStudents && (
                            <>
                              <button
                                onClick={() => {
                                  setTransferTarget(student);
                                  setTransferFromBatch(student.assignedBatches[0] || '');
                                  setTransferToBatch('');
                                }}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-purple-600 transition-colors"
                                title="Transfer Batch"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(student)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-amber-600 transition-colors"
                                title="Edit Student"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(student)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-rose-600 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="h-4 w-4" />
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

      {/* ADD / EDIT STUDENT MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.studentId}` : 'Enroll New Student'}
        subtitle="IIS Institute Student Master Record"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Student Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Father's / Guardian's Name *</label>
              <input
                type="text"
                required
                value={formData.fatherName}
                onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="e.g. Ramesh Sharma"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">WhatsApp Mobile Number *</label>
              <input
                type="text"
                required
                value={formData.whatsappNumber}
                onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="+91 98200 00000"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Class / Academic Program *</label>
              <select
                value={formData.classCourse}
                onChange={e => setFormData({ ...formData, classCourse: e.target.value })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                {classesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Monthly Tuition Fee (INR) *</label>
              <input
                type="number"
                required
                min={0}
                value={formData.monthlyFee}
                onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Monthly Due Date (Day of Month) *</label>
              <input
                type="number"
                min={1}
                max={31}
                value={formData.feeDueDate}
                onChange={e => setFormData({ ...formData, feeDueDate: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Date of Joining / Admission *</label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={e => setFormData({ ...formData, joiningDate: e.target.value, admissionDate: e.target.value })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full street address and city"
              className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Batches Selection (Multiple) */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Assign Batches (Select multiple as appropriate)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto rounded-xl border border-gray-200 p-2">
              {batches.map(b => {
                const checked = formData.assignedBatches.includes(b.batchId);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData({ ...formData, assignedBatches: [...formData.assignedBatches, b.batchId] });
                        } else {
                          setFormData({
                            ...formData,
                            assignedBatches: formData.assignedBatches.filter(id => id !== b.batchId),
                          });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="truncate">
                      <span className="font-bold text-gray-900 block">{b.batchId}</span>
                      <span className="text-[10px] text-gray-500">{b.name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Enrollment Notes / Academic Background</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Target exam, school name, special remarks..."
              className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              {editingStudent ? 'Update Student Record' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW FULL PROFILE MODAL */}
      {viewingStudent && (
        <Modal
          isOpen={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          title={`Profile: ${viewingStudent.name}`}
          subtitle={`Student ID: ${viewingStudent.studentId}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            {/* Top Info Card */}
            <div className="flex items-start gap-4 rounded-xl bg-linear-to-r from-blue-50 to-purple-50 p-4 border border-blue-100">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white font-extrabold text-2xl shadow-md">
                {viewingStudent.name.charAt(0)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">{viewingStudent.name}</h3>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {viewingStudent.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600">Class: <strong>{viewingStudent.classCourse}</strong> • S/D of {viewingStudent.fatherName}</p>
                <p className="text-gray-600">WhatsApp: <strong>{viewingStudent.whatsappNumber}</strong></p>
                <p className="text-gray-500">Address: {viewingStudent.address}</p>
              </div>
            </div>

            {/* Attendance & Fee Snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <span className="text-[10px] uppercase font-bold text-gray-500">Monthly Tuition</span>
                <p className="mt-1 text-sm font-extrabold text-gray-900">₹{viewingStudent.monthlyFee.toLocaleString()}</p>
                <span className="text-[10px] text-gray-400">Due on {viewingStudent.feeDueDate}th</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <span className="text-[10px] uppercase font-bold text-gray-500">Date of Joining</span>
                <p className="mt-1 text-sm font-extrabold text-blue-600">{viewingStudent.joiningDate || viewingStudent.admissionDate}</p>
                <span className="text-[10px] text-gray-400">DOB: {viewingStudent.dob}</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-gray-500">Enrolled Batches</span>
                <p className="mt-1 text-xs font-bold text-purple-700">{viewingStudent.assignedBatches.join(', ') || 'None'}</p>
              </div>
            </div>

            {/* Recent Fee Payments */}
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Recent Fee Transactions</h4>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="py-2 px-3">Receipt No</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {feeTransactions.filter(t => t.studentId === viewingStudent.studentId).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-gray-400">No payment records yet</td>
                      </tr>
                    ) : (
                      feeTransactions
                        .filter(t => t.studentId === viewingStudent.studentId)
                        .map(tx => (
                          <tr key={tx.id}>
                            <td className="py-2 px-3 font-mono font-bold text-blue-600">{tx.receiptNo}</td>
                            <td className="py-2 px-3">{tx.paymentDate}</td>
                            <td className="py-2 px-3">{tx.monthFor}</td>
                            <td className="py-2 px-3">{tx.paymentMode}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600">₹{tx.amountPaid.toLocaleString()}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Examination Marks */}
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Examination & Test Score History</h4>
              <div className="space-y-2">
                {studentMarks.filter(m => m.studentId === viewingStudent.studentId).length === 0 ? (
                  <p className="text-gray-400">No examinations recorded for this student yet.</p>
                ) : (
                  studentMarks
                    .filter(m => m.studentId === viewingStudent.studentId)
                    .map(m => (
                      <div key={m.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{m.examTitle}</span>
                          <span className="font-extrabold text-blue-600">{m.percentage.toFixed(1)}% ({m.grade})</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                          {Object.entries(m.marks).map(([subj, info]) => (
                            <span key={subj} className="rounded bg-white px-2 py-0.5 border border-gray-200 text-gray-700">
                              {subj}: <strong>{info.isAbsent ? 'Absent' : info.marksObtained}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* BATCH TRANSFER MODAL */}
      {transferTarget && (
        <Modal
          isOpen={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          title={`Transfer Batch: ${transferTarget.name}`}
          subtitle={`Student ID: ${transferTarget.studentId}`}
          maxWidth="md"
        >
          <form onSubmit={handleBatchTransfer} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Transfer From Current Batch</label>
              <select
                value={transferFromBatch}
                onChange={e => setTransferFromBatch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                {transferTarget.assignedBatches.map(bId => (
                  <option key={bId} value={bId}>{bId}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Transfer Into New Target Batch</label>
              <select
                value={transferToBatch}
                required
                onChange={e => setTransferToBatch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">Select Destination Batch</option>
                {batches
                  .filter(b => !transferTarget.assignedBatches.includes(b.batchId))
                  .map(b => (
                    <option key={b.id} value={b.batchId}>
                      {b.batchId} - {b.name} ({b.classCourse})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-purple-700"
              >
                Confirm Transfer
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CSV IMPORT MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Students via CSV"
        subtitle="Bulk admissions upload"
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <p className="text-gray-600">
            Paste CSV rows with format: <br />
            <code className="rounded bg-gray-100 px-2 py-1 font-mono text-[11px] block mt-1">
              Name, FatherName, WhatsApp, Class, MonthlyFee
            </code>
          </p>

          <textarea
            rows={6}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={`Manish Roy, Suresh Roy, +91 98200 44556, Class 10, 4500\nKavita Nair, Ravi Nair, +91 98200 77889, Class 12, 6500`}
            className="w-full rounded-xl border border-gray-200 p-3 font-mono text-xs focus:border-blue-500 focus:outline-hidden"
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessImport}
              className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-blue-700"
            >
              Upload & Import
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Student Record?"
        message={`Are you sure you want to permanently delete the admission record for ${deleteTarget?.name} (${deleteTarget?.studentId})? All academic history will be removed.`}
        confirmLabel="Delete Student"
      />
    </div>
  );
};
