import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Clock,
  Calendar,
  Users,
  GraduationCap,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  MapPin,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Batch } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';

export const BatchesView: React.FC = () => {
  const { batches, teachers, students, addBatch, updateBatch, deleteBatch } = useData();
  const { currentUser, canManageBatches } = useAuth();

  const [activeTabMode, setActiveTabMode] = useState<'batch-list' | 'timetable' | 'teacher-schedule'>('batch-list');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const initialForm: Omit<Batch, 'id' | 'batchId'> & { batchId?: string } = {
    name: '',
    classCourse: 'Class 10',
    subject: 'Maths & Science',
    timing: '04:00 PM - 06:00 PM (Mon, Wed, Fri)',
    days: ['Mon', 'Wed', 'Fri'],
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    classroomNumber: 'Room 101',
    maxCapacity: 35,
    assignedTeacherIds: [],
    status: 'active',
  };

  const [formData, setFormData] = useState(initialForm);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingBatch(null);
    setFormData(initialForm);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      batchId: batch.batchId,
      name: batch.name,
      classCourse: batch.classCourse,
      subject: batch.subject,
      timing: batch.timing,
      days: batch.days || ['Mon', 'Wed', 'Fri'],
      startDate: batch.startDate,
      endDate: batch.endDate,
      classroomNumber: batch.classroomNumber,
      maxCapacity: batch.maxCapacity,
      assignedTeacherIds: [...batch.assignedTeacherIds],
      status: batch.status,
    });
    setIsAddEditOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, formData, currentUser.name, currentUser.role);
        showToast(`Batch ${formData.name} updated successfully.`);
      } else {
        await addBatch(formData, currentUser.name, currentUser.role);
        showToast(`New batch ${formData.name} created.`);
      }
      setIsAddEditOpen(false);
    } catch (err) {
      showToast('Error saving batch schedule.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBatch(deleteTarget.id, currentUser.name, currentUser.role);
      showToast(`Batch ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast('Error deleting batch.');
    }
  };

  const classesList = [
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12', 'Spoken English', 'Competitive Exam Preparation'
  ];

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
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Classes & Batches Management</h1>
          <p className="text-xs text-gray-500">
            Many-to-many teacher allocation, batch timetables, and classroom capacities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold text-gray-600">
            <button
              onClick={() => setActiveTabMode('batch-list')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTabMode === 'batch-list' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'hover:text-gray-900'
              }`}
            >
              Batch Cards
            </button>
            <button
              onClick={() => setActiveTabMode('timetable')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTabMode === 'timetable' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'hover:text-gray-900'
              }`}
            >
              Master Timetable
            </button>
            <button
              onClick={() => setActiveTabMode('teacher-schedule')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTabMode === 'teacher-schedule' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'hover:text-gray-900'
              }`}
            >
              Teacher Schedule
            </button>
          </div>

          {canManageBatches && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: BATCH CARDS GRID */}
      {activeTabMode === 'batch-list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(batch => {
            const enrolled = students.filter(s => s.assignedBatches.includes(batch.batchId)).length;
            const capacityPct = Math.round((enrolled / batch.maxCapacity) * 100);

            // Assigned teacher names
            const assignedTeachers = teachers.filter(t => batch.assignedTeacherIds.includes(t.teacherId));

            return (
              <div
                key={batch.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                        {batch.classCourse}
                      </span>
                      <h3 className="mt-1.5 text-sm font-bold text-gray-900 leading-snug">{batch.name}</h3>
                      <span className="text-[11px] font-mono font-bold text-blue-600">{batch.batchId}</span>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {batch.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-gray-600">
                    <p className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="font-medium text-gray-800">{batch.timing}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>{batch.classroomNumber}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span>{batch.startDate} to {batch.endDate}</span>
                    </p>
                  </div>

                  {/* Enrolled Students Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1">
                      <span>Enrolled: {enrolled} students</span>
                      <span>Capacity: {batch.maxCapacity}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          capacityPct > 85 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, capacityPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Assigned Teachers */}
                  <div className="mt-3">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Faculty Members ({assignedTeachers.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {assignedTeachers.length === 0 ? (
                        <span className="text-[10px] text-gray-400">None assigned</span>
                      ) : (
                        assignedTeachers.map(t => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 rounded bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-800 border border-gray-200"
                          >
                            <GraduationCap className="h-3 w-3 text-purple-600" />
                            {t.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setViewingBatch(batch)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Enrolled Students ({enrolled})
                  </button>

                  {canManageBatches && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(batch)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600"
                        title="Edit Batch"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(batch)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-600"
                        title="Delete Batch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: MASTER BATCH TIMETABLE */}
      {activeTabMode === 'timetable' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Master Weekly Schedule & Hall Allocation
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Course / Program</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Timings</th>
                  <th className="py-3 px-4">Classroom</th>
                  <th className="py-3 px-4">Assigned Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {batches.map(b => (
                  <tr key={b.id} className="hover:bg-blue-50/20">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{b.batchId}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{b.name}</td>
                    <td className="py-3 px-4 text-purple-700 font-medium">{b.subject}</td>
                    <td className="py-3 px-4 text-gray-800">{b.timing}</td>
                    <td className="py-3 px-4 text-gray-600">{b.classroomNumber}</td>
                    <td className="py-3 px-4">
                      {teachers
                        .filter(t => b.assignedTeacherIds.includes(t.teacherId))
                        .map(t => t.name)
                        .join(', ') || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEACHER-WISE SCHEDULE */}
      {activeTabMode === 'teacher-schedule' && (
        <div className="space-y-4">
          {teachers.map(tch => {
            const tchBatches = batches.filter(b => b.assignedTeacherIds.includes(tch.teacherId));
            return (
              <div key={tch.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold">
                      {tch.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{tch.name}</h3>
                      <p className="text-xs text-gray-500">{tch.qualification} • {tch.subjectsTaught.join(', ')}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    {tchBatches.length} Active Batches
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {tchBatches.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No batches currently assigned to this faculty member.</p>
                  ) : (
                    tchBatches.map(b => (
                      <div key={b.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                        <span className="text-[10px] font-bold text-blue-700">{b.batchId}</span>
                        <h4 className="text-xs font-bold text-gray-900 mt-0.5">{b.name}</h4>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-purple-600" />
                          {b.timing}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Hall: {b.classroomNumber}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT BATCH MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingBatch ? `Edit Batch: ${editingBatch.batchId}` : 'Create New Batch'}
        subtitle="IIS Institute Class Scheduling"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveBatch} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Batch Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Class 10 - Foundation Board & NTSE"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Class / Program *</label>
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
              <label className="block font-bold text-gray-700 mb-1">Subject(s) Covered *</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Physics, Chemistry & Math"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Batch Timing & Days *</label>
              <input
                type="text"
                required
                value={formData.timing}
                onChange={e => setFormData({ ...formData, timing: e.target.value })}
                placeholder="e.g. 04:00 PM - 06:00 PM (Mon, Wed, Fri)"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Classroom / Hall Number *</label>
              <input
                type="text"
                required
                value={formData.classroomNumber}
                onChange={e => setFormData({ ...formData, classroomNumber: e.target.value })}
                placeholder="e.g. Hall A - Apex Theatre"
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Maximum Student Capacity *</label>
              <input
                type="number"
                required
                min={5}
                max={200}
                value={formData.maxCapacity}
                onChange={e => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Assigned Teachers (Many-to-Many) */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Assign Teachers to Batch (Many-to-Many Relationship)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-xl border border-gray-200 p-2">
              {teachers.map(t => {
                const isAssigned = formData.assignedTeacherIds.includes(t.teacherId);
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer transition-colors ${
                      isAssigned ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assignedTeacherIds: [...formData.assignedTeacherIds, t.teacherId],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assignedTeacherIds: formData.assignedTeacherIds.filter(id => id !== t.teacherId),
                          });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-gray-900 block">{t.name}</span>
                      <span className="text-[10px] text-gray-500">{t.qualification}</span>
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
              className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-blue-700"
            >
              {editingBatch ? 'Save Batch Changes' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW ENROLLED STUDENTS IN BATCH MODAL */}
      {viewingBatch && (
        <Modal
          isOpen={!!viewingBatch}
          onClose={() => setViewingBatch(null)}
          title={`Enrolled Students: ${viewingBatch.batchId}`}
          subtitle={`${viewingBatch.name} (${viewingBatch.timing})`}
          maxWidth="lg"
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-blue-50 p-3 border border-blue-100 text-blue-800 flex justify-between items-center">
              <span>Hall: <strong>{viewingBatch.classroomNumber}</strong></span>
              <span>Capacity: <strong>{viewingBatch.maxCapacity} Seats</strong></span>
            </div>

            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {students.filter(s => s.assignedBatches.includes(viewingBatch.batchId)).length === 0 ? (
                <p className="py-6 text-center text-gray-400">No students enrolled in this batch yet.</p>
              ) : (
                students
                  .filter(s => s.assignedBatches.includes(viewingBatch.batchId))
                  .map(s => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900 block">{s.name}</span>
                        <span className="text-[10px] font-mono text-gray-500">{s.studentId} • WhatsApp: {s.whatsappNumber}</span>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {s.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Batch?"
        message={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.batchId})? Note: Teachers and enrolled students will not be deleted.`}
        confirmLabel="Delete Batch"
      />
    </div>
  );
};
