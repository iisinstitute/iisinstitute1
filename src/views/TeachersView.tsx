import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Teacher } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { exportToExcel } from '../components/export/ExportUtils.ts';

export const TeachersView: React.FC = () => {
  const { teachers, batches, addTeacher, updateTeacher, deleteTeacher } = useData();
  const { currentUser, canManageTeachers } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const initialForm: Omit<Teacher, 'id' | 'teacherId'> & { teacherId?: string } = {
    name: '',
    mobile: '',
    email: '',
    subjectsTaught: [],
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 75000,
    assignedClasses: ['Class 11', 'Class 12'],
    assignedBatches: [],
    status: 'active',
  };

  const [formData, setFormData] = useState(initialForm);
  const [subjectsInput, setSubjectsInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.teacherId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subjectsTaught.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData(initialForm);
    setSubjectsInput('');
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (tch: Teacher) => {
    setEditingTeacher(tch);
    setFormData({
      teacherId: tch.teacherId,
      name: tch.name,
      mobile: tch.mobile,
      email: tch.email,
      subjectsTaught: [...tch.subjectsTaught],
      joiningDate: tch.joiningDate,
      salary: tch.salary,
      assignedClasses: [...tch.assignedClasses],
      assignedBatches: [...tch.assignedBatches],
      status: tch.status,
    });
    setSubjectsInput(tch.subjectsTaught.join(', '));
    setIsAddEditOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSubjects = subjectsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      ...formData,
      subjectsTaught: parsedSubjects.length > 0 ? parsedSubjects : ['General Studies'],
    };

    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, payload, currentUser.name, currentUser.role);
        showToast(`Teacher ${payload.name} updated.`);
      } else {
        await addTeacher(payload, currentUser.name, currentUser.role);
        showToast(`New faculty ${payload.name} added to institute roster.`);
      }
      setIsAddEditOpen(false);
    } catch (err) {
      showToast('Error saving faculty member.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTeacher(deleteTarget.id, currentUser.name, currentUser.role);
      showToast(`Removed teacher record for ${deleteTarget.name}.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast('Error deleting teacher.');
    }
  };

  const handleExportExcel = () => {
    const data = filteredTeachers.map(t => ({
      'Teacher ID': t.teacherId,
      'Name': t.name,
      'Subjects': t.subjectsTaught.join(', '),
      'Mobile': t.mobile,
      'Email': t.email,
      'Monthly Salary (INR)': t.salary,
      'Assigned Batches': t.assignedBatches.join(', '),
      'Joining Date': t.joiningDate,
      'Status': t.status,
    }));
    exportToExcel(data, `IIS_Teachers_Directory_${new Date().toISOString().split('T')[0]}`);
    showToast('Exported faculty list to Excel.');
  };

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
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Faculty & Teacher Management</h1>
          <p className="text-xs text-gray-500">
            Teaching staff profiles, subject specialization, and batch assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageTeachers && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Faculty</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search faculty by name, subject, ID..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map(teacher => (
          <div
            key={teacher.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white font-extrabold text-sm shadow-xs">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{teacher.name}</h3>
                    <span className="text-[11px] font-mono text-purple-600 font-semibold">{teacher.teacherId}</span>
                  </div>
                </div>
                {teacher.status === 'active' ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    Inactive
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                <p className="flex items-center gap-2 font-medium text-gray-800">
                  <Briefcase className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>{teacher.subjectsTaught.join(', ')}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{teacher.mobile}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{teacher.email}</span>
                </p>
                <p className="flex items-center gap-2 text-gray-500 text-[11px]">
                  <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Joined: {teacher.joiningDate}</span>
                </p>
              </div>

              {/* Batches Pill List */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5">
                  Assigned Batches ({teacher.assignedBatches.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {teacher.assignedBatches.map(bId => (
                    <span key={bId} className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {bId}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="font-extrabold text-gray-900">₹{teacher.salary.toLocaleString()}/mo</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewingTeacher(teacher)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                  title="View Profile"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {canManageTeachers && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(teacher)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-amber-600"
                      title="Edit Teacher"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(teacher)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-rose-600"
                      title="Delete Teacher"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT TEACHER MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingTeacher ? `Edit Faculty: ${editingTeacher.teacherId}` : 'Add Faculty Member'}
        subtitle="IIS Institute Teaching Staff Master"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Faculty Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Mobile Phone *</label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98200 00000"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="faculty@iisinstitute.com"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Subjects Taught (comma separated) *</label>
              <input
                type="text"
                required
                value={subjectsInput}
                onChange={e => setSubjectsInput(e.target.value)}
                placeholder="e.g. Physics, Advanced Mechanics, Thermodynamics"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Monthly Salary (INR) *</label>
              <input
                type="number"
                required
                min={0}
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Joining Date *</label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Batches Many-to-Many Assignment */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Assign to Batches (Many-to-Many Relationship)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-xl border border-gray-200 p-2">
              {batches.map(b => {
                const checked = formData.assignedBatches.includes(b.batchId);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer transition-colors ${
                      checked ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
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
                      className="rounded text-purple-600 focus:ring-purple-500"
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-purple-700"
            >
              {editingTeacher ? 'Update Faculty Details' : 'Add Faculty Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW TEACHER MODAL */}
      {viewingTeacher && (
        <Modal
          isOpen={!!viewingTeacher}
          onClose={() => setViewingTeacher(null)}
          title={`Faculty Profile: ${viewingTeacher.name}`}
          subtitle={`Teacher ID: ${viewingTeacher.teacherId}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-purple-50 p-4 border border-purple-100">
              <h3 className="text-base font-bold text-gray-900">{viewingTeacher.name}</h3>
              <p className="text-purple-700 font-semibold mt-0.5">Faculty ID: {viewingTeacher.teacherId}</p>
              <p className="text-gray-600 mt-1">Specialization: {viewingTeacher.subjectsTaught.join(', ')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Mobile Phone</span>
                <p className="font-bold text-gray-900 mt-0.5">{viewingTeacher.mobile}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Email Address</span>
                <p className="font-bold text-gray-900 mt-0.5 truncate">{viewingTeacher.email}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Monthly Remuneration</span>
                <p className="font-bold text-emerald-600 mt-0.5">₹{viewingTeacher.salary.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Date of Joining</span>
                <p className="font-bold text-gray-900 mt-0.5">{viewingTeacher.joiningDate}</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Batches Teaching</span>
              <div className="space-y-1.5">
                {viewingTeacher.assignedBatches.map(bId => {
                  const bObj = batches.find(b => b.batchId === bId);
                  return (
                    <div key={bId} className="flex justify-between items-center rounded-lg bg-gray-50 p-2 border border-gray-100">
                      <span className="font-bold text-blue-700">{bId}</span>
                      <span className="text-gray-600">{bObj?.name || 'Assigned Batch'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Faculty Member?"
        message={`Are you sure you want to remove ${deleteTarget?.name} from the institute faculty directory?`}
        confirmLabel="Delete Teacher"
      />
    </div>
  );
};
