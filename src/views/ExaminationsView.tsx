import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Calendar,
  Users,
  Award,
  Download,
  Printer,
  CheckCircle,
  Eye,
  Trash2,
  Edit2,
  TrendingUp,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Examination, ExamSubject, StudentMarks } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { generateReportCardPDF } from '../components/export/ExportUtils.ts';

export const ExaminationsView: React.FC = () => {
  const {
    examinations,
    batches,
    students,
    studentMarks,
    createExam,
    updateExam,
    deleteExam,
    saveStudentMarks,
    deleteStudentMarks,
  } = useData();

  const { currentUser, canManageExams, canEnterMarks } = useAuth();

  const [selectedExamId, setSelectedExamId] = useState<string>(examinations[0]?.id || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEnterMarksModalOpen, setIsEnterMarksModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Examination | null>(null);
  const [deleteMarksTarget, setDeleteMarksTarget] = useState<StudentMarks | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active examination
  const activeExam = examinations.find(e => e.id === selectedExamId) || examinations[0];

  // Examination create form state
  const [newTitle, setNewTitle] = useState('');
  const [newClass, setNewClass] = useState('Class 10');
  const [newBatchId, setNewBatchId] = useState(batches[0]?.batchId || '');
  const [newExamDate, setNewExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [subjectsList, setSubjectsList] = useState<ExamSubject[]>([
    { subjectName: 'Mathematics', maxMarks: 100, passingMarks: 35 },
    { subjectName: 'Science', maxMarks: 100, passingMarks: 35 },
  ]);

  // Examination edit form state
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editClass, setEditClass] = useState('Class 10');
  const [editBatchId, setEditBatchId] = useState('');
  const [editExamDate, setEditExamDate] = useState('');
  const [editStatus, setEditStatus] = useState<Examination['status']>('scheduled');
  const [editSubjectsList, setEditSubjectsList] = useState<ExamSubject[]>([]);

  // Enter marks working state
  const [studentForMarks, setStudentForMarks] = useState<string>('');
  const [workingScores, setWorkingScores] = useState<Record<string, { marksObtained: number; isAbsent: boolean }>>({});
  const [teacherRemarks, setTeacherRemarks] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Enrolled students for the selected exam's batch
  const enrolledStudents = useMemo(() => {
    if (!activeExam) return [];
    return students.filter(s => s.assignedBatches.includes(activeExam.batchId));
  }, [students, activeExam]);

  // Marks scored in active examination
  const examMarksRecords = useMemo(() => {
    if (!activeExam) return [];
    return studentMarks.filter(m => m.examId === activeExam.id);
  }, [studentMarks, activeExam]);

  // Open Enter Marks Modal for a student
  const handleOpenMarksEntry = (studentId: string) => {
    if (!activeExam) return;
    setStudentForMarks(studentId);
    const existing = studentMarks.find(m => m.examId === activeExam.id && m.studentId === studentId);

    const initialMarks: Record<string, { marksObtained: number; isAbsent: boolean }> = {};
    activeExam.subjects.forEach(s => {
      if (existing?.marks[s.subjectName]) {
        initialMarks[s.subjectName] = existing.marks[s.subjectName];
      } else {
        initialMarks[s.subjectName] = { marksObtained: 0, isAbsent: false };
      }
    });

    setWorkingScores(initialMarks);
    setTeacherRemarks(existing?.teacherRemarks || 'Good conceptual understanding. Regular practice recommended.');
    setIsEnterMarksModalOpen(true);
  };

  // Submit student marks
  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam || !studentForMarks) return;

    const studentObj = students.find(s => s.studentId === studentForMarks);
    if (!studentObj) return;

    let totalObtained = 0;
    let maxTotal = 0;

    activeExam.subjects.forEach(s => {
      maxTotal += s.maxMarks;
      const score = workingScores[s.subjectName];
      if (score && !score.isAbsent) {
        totalObtained += Number(score.marksObtained);
      }
    });

    const percentage = maxTotal > 0 ? (totalObtained / maxTotal) * 100 : 0;
    let grade = 'F';
    if (percentage >= 85) grade = 'A+';
    else if (percentage >= 75) grade = 'A';
    else if (percentage >= 60) grade = 'B+';
    else if (percentage >= 50) grade = 'B';
    else if (percentage >= 40) grade = 'C';

    try {
      await saveStudentMarks(
        {
          examId: activeExam.id,
          examTitle: activeExam.title,
          studentId: studentObj.studentId,
          studentName: studentObj.name,
          batchId: activeExam.batchId,
          marks: workingScores,
          totalMarks: totalObtained,
          maxTotalMarks: maxTotal,
          percentage: Number(percentage.toFixed(2)),
          grade,
          rank: 1, // dynamically calculated in merit list
          teacherRemarks,
          enteredBy: currentUser.name,
        },
        currentUser.name,
        currentUser.role
      );

      showToast(`Marks saved for ${studentObj.name}: ${totalObtained}/${maxTotal} (${percentage.toFixed(1)}%)`);
      setIsEnterMarksModalOpen(false);
    } catch (err) {
      showToast('Error saving marks.');
    }
  };

  // Create new examination
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await createExam(
        {
          title: newTitle,
          classCourse: newClass,
          batchId: newBatchId,
          examDate: newExamDate,
          subjects: subjectsList,
          status: 'scheduled',
        },
        currentUser.name,
        currentUser.role
      );

      showToast(`Examination "${newTitle}" scheduled.`);
      setSelectedExamId(created.id);
      setIsCreateModalOpen(false);
      setNewTitle('');
    } catch (err) {
      showToast('Error creating exam.');
    }
  };

  // Add subject to new exam builder
  const handleAddSubjectField = () => {
    setSubjectsList(prev => [...prev, { subjectName: '', maxMarks: 100, passingMarks: 35 }]);
  };

  const handleRemoveSubjectField = (index: number) => {
    setSubjectsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOpenEditExam = (exam: Examination) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditClass(exam.classCourse);
    setEditBatchId(exam.batchId);
    setEditExamDate(exam.examDate);
    setEditStatus(exam.status);
    setEditSubjectsList([...exam.subjects]);
  };

  const handleSaveEditExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam || !editTitle.trim()) return;

    try {
      await updateExam(
        editingExam.id,
        {
          title: editTitle,
          classCourse: editClass,
          batchId: editBatchId,
          examDate: editExamDate,
          subjects: editSubjectsList,
          status: editStatus,
        },
        currentUser.name,
        currentUser.role
      );
      showToast(`Examination "${editTitle}" updated.`);
      setEditingExam(null);
    } catch (err) {
      showToast('Error updating exam.');
    }
  };

  const handleConfirmDeleteExam = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExam(deleteTarget.id, currentUser.name, currentUser.role);
      showToast(`Examination "${deleteTarget.title}" deleted.`);
      if (selectedExamId === deleteTarget.id) {
        const remaining = examinations.filter(e => e.id !== deleteTarget.id);
        setSelectedExamId(remaining[0]?.id || '');
      }
      setDeleteTarget(null);
    } catch (err) {
      showToast('Error deleting exam.');
    }
  };

  const handleConfirmDeleteMarks = async () => {
    if (!deleteMarksTarget) return;
    try {
      await deleteStudentMarks(deleteMarksTarget.id, currentUser.name, currentUser.role);
      showToast(`Marks record for ${deleteMarksTarget.studentName} deleted.`);
      setDeleteMarksTarget(null);
    } catch (err) {
      showToast('Error deleting student marks.');
    }
  };

  // Rank calculation for current exam
  const rankedStudents = useMemo(() => {
    return [...examMarksRecords].sort((a, b) => b.percentage - a.percentage);
  }, [examMarksRecords]);

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
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Examinations & Student Marks</h1>
          <p className="text-xs text-gray-500">
            Exam schedules, automated grading & ranking, subject analysis, and printable student report cards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageExams && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Examination</span>
            </button>
          )}
        </div>
      </div>

      {/* Select Examination Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Examination</label>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs font-bold text-gray-900 focus:border-purple-500 focus:bg-white focus:outline-hidden"
            >
              {examinations.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.classCourse} • Date: {ex.examDate} • Status: {ex.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {activeExam && (
            <div className="flex items-center flex-wrap gap-2 pt-2 sm:pt-4">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                Batch: {activeExam.batchId}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Subjects: {activeExam.subjects.length}
              </span>

              {canManageExams && (
                <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                  <button
                    onClick={() => handleOpenEditExam(activeExam)}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Edit Examination"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Edit Exam</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(activeExam)}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                    title="Delete Examination"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>Delete Exam</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Merit & Score Table */}
      {activeExam && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Merit List & Marks Roster: {activeExam.title}
              </h3>
              <p className="text-[11px] text-gray-500">
                Enrolled Students: {enrolledStudents.length} • Evaluated: {examMarksRecords.length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Student ID & Name</th>
                  {activeExam.subjects.map(s => (
                    <th key={s.subjectName} className="py-3 px-4 text-center">
                      {s.subjectName} <br />
                      <span className="text-[9px] font-normal text-gray-400">Max: {s.maxMarks}</span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">Total Scored</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {enrolledStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6 + activeExam.subjects.length} className="py-12 text-center text-xs text-gray-400">
                      No students enrolled in this examination's batch ({activeExam.batchId}).
                    </td>
                  </tr>
                ) : (
                  enrolledStudents.map(student => {
                    const marksRec = examMarksRecords.find(m => m.studentId === student.studentId);
                    const rankIndex = rankedStudents.findIndex(r => r.studentId === student.studentId);
                    const calculatedRank = rankIndex >= 0 ? rankIndex + 1 : '-';

                    return (
                      <tr key={student.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-md font-bold text-xs ${
                              calculatedRank === 1
                                ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                                : calculatedRank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : calculatedRank === 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {calculatedRank}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">{student.name}</span>
                          <span className="text-[11px] font-mono text-gray-500">{student.studentId}</span>
                        </td>

                        {activeExam.subjects.map(s => {
                          const score = marksRec?.marks[s.subjectName];
                          return (
                            <td key={s.subjectName} className="py-3 px-4 text-center">
                              {score ? (
                                score.isAbsent ? (
                                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                                    ABSENT
                                  </span>
                                ) : (
                                  <span className="font-bold text-blue-700">{score.marksObtained}</span>
                                )
                              ) : (
                                <span className="text-gray-300">--</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3 px-4 text-center font-bold text-gray-900">
                          {marksRec ? `${marksRec.totalMarks} / ${marksRec.maxTotalMarks}` : '--'}
                        </td>

                        <td className="py-3 px-4 text-center font-extrabold text-blue-700">
                          {marksRec ? `${marksRec.percentage.toFixed(1)}%` : '--'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {marksRec ? (
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                              {marksRec.grade}
                            </span>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {marksRec && (
                              <button
                                onClick={() => generateReportCardPDF(marksRec, activeExam, student)}
                                className="flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                                title="Download Official Report Card PDF"
                              >
                                <Printer className="h-3.5 w-3.5" /> PDF Card
                              </button>
                            )}

                            {canEnterMarks && (
                              <>
                                <button
                                  onClick={() => handleOpenMarksEntry(student.studentId)}
                                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 shadow-2xs"
                                >
                                  {marksRec ? 'Edit Marks' : 'Enter Marks'}
                                </button>
                                {marksRec && (
                                  <button
                                    onClick={() => setDeleteMarksTarget(marksRec)}
                                    className="rounded-lg p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete Marks Record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
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
      )}

      {/* ENTER MARKS MODAL */}
      {isEnterMarksModalOpen && activeExam && (
        <Modal
          isOpen={isEnterMarksModalOpen}
          onClose={() => setIsEnterMarksModalOpen(false)}
          title="Enter Examination Marks"
          subtitle={`${students.find(s => s.studentId === studentForMarks)?.name} (${studentForMarks}) • ${activeExam.title}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveMarks} className="space-y-4 text-xs">
            <div className="space-y-3">
              {activeExam.subjects.map(subj => {
                const cur = workingScores[subj.subjectName] || { marksObtained: 0, isAbsent: false };
                return (
                  <div key={subj.subjectName} className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{subj.subjectName}</span>
                      <span className="text-[10px] text-gray-500">Max: {subj.maxMarks} • Pass: {subj.passingMarks}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          min={0}
                          max={subj.maxMarks}
                          disabled={cur.isAbsent}
                          value={cur.isAbsent ? 0 : cur.marksObtained}
                          onChange={e =>
                            setWorkingScores({
                              ...workingScores,
                              [subj.subjectName]: {
                                marksObtained: Number(e.target.value),
                                isAbsent: false,
                              },
                            })
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white py-1.5 px-3 text-xs font-bold text-blue-700 disabled:bg-gray-100 disabled:text-gray-400 focus:border-purple-500 focus:outline-hidden"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-600">
                        <input
                          type="checkbox"
                          checked={cur.isAbsent}
                          onChange={e =>
                            setWorkingScores({
                              ...workingScores,
                              [subj.subjectName]: {
                                marksObtained: 0,
                                isAbsent: e.target.checked,
                              },
                            })
                          }
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Absent</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Faculty Remarks & Guidance</label>
              <textarea
                rows={2}
                value={teacherRemarks}
                onChange={e => setTeacherRemarks(e.target.value)}
                placeholder="e.g. Good mastery over thermodynamics, work on numerical precision..."
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEnterMarksModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-purple-700"
              >
                Save Marks & Update Rank
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SCHEDULE NEW EXAM MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Examination"
        subtitle="IIS Institute Academic Assessment"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Exam Title *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. JEE Advanced Full Mock Assessment 2"
              className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Class / Program *</label>
              <select
                value={newClass}
                onChange={e => setNewClass(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-purple-500 focus:outline-hidden"
              >
                {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Competitive Exam Preparation'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Batch *</label>
              <select
                value={newBatchId}
                onChange={e => setNewBatchId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-purple-500 focus:outline-hidden"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.batchId}>
                    {b.batchId} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Exam Date *</label>
              <input
                type="date"
                required
                value={newExamDate}
                onChange={e => setNewExamDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Subjects Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-gray-700">Examination Subjects & Marking Scheme</label>
              <button
                type="button"
                onClick={handleAddSubjectField}
                className="text-purple-600 font-bold hover:underline flex items-center gap-1"
              >
                + Add Subject
              </button>
            </div>

            <div className="space-y-2">
              {subjectsList.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Subject Name (e.g. Physics)"
                    value={s.subjectName}
                    onChange={e => {
                      const updated = [...subjectsList];
                      updated[idx].subjectName = e.target.value;
                      setSubjectsList(updated);
                    }}
                    className="flex-2 rounded-xl border border-gray-200 py-1.5 px-3 focus:border-purple-500 focus:outline-hidden"
                  />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Max"
                    value={s.maxMarks}
                    onChange={e => {
                      const updated = [...subjectsList];
                      updated[idx].maxMarks = Number(e.target.value);
                      setSubjectsList(updated);
                    }}
                    className="w-20 rounded-xl border border-gray-200 py-1.5 px-2 text-center focus:border-purple-500 focus:outline-hidden"
                  />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Pass"
                    value={s.passingMarks}
                    onChange={e => {
                      const updated = [...subjectsList];
                      updated[idx].passingMarks = Number(e.target.value);
                      setSubjectsList(updated);
                    }}
                    className="w-20 rounded-xl border border-gray-200 py-1.5 px-2 text-center focus:border-purple-500 focus:outline-hidden"
                  />
                  {subjectsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSubjectField(idx)}
                      className="rounded-lg p-1 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-purple-700"
            >
              Schedule Exam
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
