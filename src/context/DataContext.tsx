import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Student,
  Teacher,
  Batch,
  StudentAttendance,
  TeacherAttendance,
  FeeTransaction,
  FeeReminder,
  Examination,
  StudentMarks,
  Announcement,
  NotificationItem,
  AuditLogItem,
} from '../types/index.ts';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_BATCHES,
  INITIAL_STUDENT_ATTENDANCE,
  INITIAL_TEACHER_ATTENDANCE,
  INITIAL_FEE_TRANSACTIONS,
  INITIAL_FEE_REMINDERS,
  INITIAL_EXAMINATIONS,
  INITIAL_STUDENT_MARKS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from '../lib/demoData.ts';
import { db, handleFirestoreError, OperationType, testConnection } from '../lib/firebase.ts';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

interface DataContextType {
  students: Student[];
  teachers: Teacher[];
  batches: Batch[];
  studentAttendance: StudentAttendance[];
  teacherAttendance: TeacherAttendance[];
  feeTransactions: FeeTransaction[];
  feeReminders: FeeReminder[];
  examinations: Examination[];
  studentMarks: StudentMarks[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  auditLogs: AuditLogItem[];
  isLoading: boolean;
  error: string | null;

  // Student actions
  addStudent: (student: Omit<Student, 'id' | 'studentId'> & { studentId?: string }, performedBy: string, userRole: string) => Promise<Student>;
  updateStudent: (id: string, updates: Partial<Student>, performedBy: string, userRole: string) => Promise<void>;
  deleteStudent: (id: string, performedBy: string, userRole: string) => Promise<void>;
  importStudents: (newStudents: Partial<Student>[], performedBy: string, userRole: string) => Promise<number>;
  transferStudentBatch: (studentId: string, fromBatchId: string, toBatchId: string, performedBy: string, userRole: string) => Promise<void>;

  // Teacher actions
  addTeacher: (teacher: Omit<Teacher, 'id' | 'teacherId'> & { teacherId?: string }, performedBy: string, userRole: string) => Promise<Teacher>;
  updateTeacher: (id: string, updates: Partial<Teacher>, performedBy: string, userRole: string) => Promise<void>;
  deleteTeacher: (id: string, performedBy: string, userRole: string) => Promise<void>;

  // Batch actions
  addBatch: (batch: Omit<Batch, 'id' | 'batchId'> & { batchId?: string }, performedBy: string, userRole: string) => Promise<Batch>;
  updateBatch: (id: string, updates: Partial<Batch>, performedBy: string, userRole: string) => Promise<void>;
  deleteBatch: (id: string, performedBy: string, userRole: string) => Promise<void>;

  // Attendance actions
  markStudentAttendance: (record: Omit<StudentAttendance, 'id'>, performedBy: string, userRole: string) => Promise<void>;
  bulkMarkStudentAttendance: (records: Omit<StudentAttendance, 'id'>[], performedBy: string, userRole: string) => Promise<void>;
  correctStudentAttendance: (id: string, newStatus: StudentAttendance['status'], reason: string, performedBy: string, userRole: string) => Promise<void>;
  deleteStudentAttendance: (id: string, performedBy: string, userRole: string) => Promise<void>;

  // Teacher attendance actions
  recordTeacherArrival: (teacherId: string, session: 'morning' | 'evening', time?: string, performedBy?: string) => Promise<void>;
  recordTeacherDeparture: (attendanceId: string, departureTime?: string, performedBy?: string) => Promise<void>;
  recordTeacherQuickAttendance: (teacherId: string, session: 'morning' | 'evening', status: TeacherAttendance['status'], arrivalTime?: string, departureTime?: string, remarks?: string, performedBy?: string) => Promise<void>;
  correctTeacherAttendance: (id: string, updates: Partial<TeacherAttendance>, reason: string, performedBy: string) => Promise<void>;
  deleteTeacherAttendance: (id: string, performedBy: string, userRole: string) => Promise<void>;

  // Fee actions
  recordFeePayment: (payment: Omit<FeeTransaction, 'id' | 'receiptNo'>, performedBy: string, userRole: string) => Promise<FeeTransaction>;
  correctFeeTransaction: (id: string, updates: Partial<FeeTransaction>, reason: string, performedBy: string, userRole: string) => Promise<void>;
  updateFeeTransaction: (id: string, updates: Partial<FeeTransaction>, performedBy: string, userRole: string) => Promise<void>;
  deleteFeeTransaction: (id: string, performedBy: string, userRole: string) => Promise<void>;

  // Fee reminders
  sendFeeReminder: (reminder: Omit<FeeReminder, 'id'>, performedBy: string) => Promise<FeeReminder>;
  sendBulkFeeReminders: (targetStudentIds: string[], customMessageTemplate?: string, performedBy?: string) => Promise<number>;
  updateFeeReminder: (id: string, updates: Partial<FeeReminder>, performedBy: string) => Promise<void>;
  deleteFeeReminder: (id: string, performedBy: string) => Promise<void>;

  // Exam actions
  createExam: (exam: Omit<Examination, 'id'>, performedBy: string, userRole: string) => Promise<Examination>;
  updateExam: (id: string, updates: Partial<Examination>, performedBy: string, userRole: string) => Promise<void>;
  deleteExam: (id: string, performedBy: string, userRole: string) => Promise<void>;
  saveStudentMarks: (marksData: Omit<StudentMarks, 'id'>, performedBy: string, userRole: string) => Promise<void>;
  updateStudentMarks: (id: string, updates: Partial<StudentMarks>, performedBy: string, userRole: string) => Promise<void>;
  deleteStudentMarks: (id: string, performedBy: string, userRole: string) => Promise<void>;

  // Announcement actions
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>, performedBy: string) => Promise<Announcement>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>, performedBy: string) => Promise<void>;
  deleteAnnouncement: (id: string, performedBy: string) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // Audit and seed controls
  deleteAuditLog: (id: string) => Promise<void>;
  clearAuditLogs: () => Promise<void>;
  resetToDemoData: () => Promise<void>;
  clearAllInstituteData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>(INITIAL_STUDENT_ATTENDANCE);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendance[]>(INITIAL_TEACHER_ATTENDANCE);
  const [feeTransactions, setFeeTransactions] = useState<FeeTransaction[]>(INITIAL_FEE_TRANSACTIONS);
  const [feeReminders, setFeeReminders] = useState<FeeReminder[]>(INITIAL_FEE_REMINDERS);
  const [examinations, setExaminations] = useState<Examination[]>(INITIAL_EXAMINATIONS);
  const [studentMarks, setStudentMarks] = useState<StudentMarks[]>(INITIAL_STUDENT_MARKS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to append audit logs
  const addAuditLog = useCallback(async (action: string, entityType: string, entityId: string, details: string, performedBy: string, userRole: string) => {
    const newLog: AuditLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      entityType,
      entityId,
      details,
      performedBy,
      userRole,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'audit_logs', newLog.id), newLog);
    } catch {
      // Non-blocking for offline
    }
  }, []);

  // Helper to append notifications
  const pushNotification = useCallback(async (type: NotificationItem['type'], title: string, message: string, metadata?: Record<string, any>) => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      metadata,
    };
    setNotifications(prev => [newNotif, ...prev]);
    try {
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch {
      // Non-blocking
    }
  }, []);

  // Sync initial data from Firestore
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await testConnection();
        // Fetch students
        const stuSnap = await getDocs(collection(db, 'students'));
        if (!stuSnap.empty) {
          const loadedStudents = stuSnap.docs.map(d => ({ ...d.data(), id: d.id } as Student));
          setStudents(loadedStudents);
        } else {
          // Seed Firestore with initial demo students
          for (const s of INITIAL_STUDENTS) {
            await setDoc(doc(db, 'students', s.id), s);
          }
        }

        // Fetch teachers
        const tchSnap = await getDocs(collection(db, 'teachers'));
        if (!tchSnap.empty) {
          setTeachers(tchSnap.docs.map(d => ({ ...d.data(), id: d.id } as Teacher)));
        } else {
          for (const t of INITIAL_TEACHERS) {
            await setDoc(doc(db, 'teachers', t.id), t);
          }
        }

        // Fetch batches
        const batSnap = await getDocs(collection(db, 'batches'));
        if (!batSnap.empty) {
          setBatches(batSnap.docs.map(d => ({ ...d.data(), id: d.id } as Batch)));
        } else {
          for (const b of INITIAL_BATCHES) {
            await setDoc(doc(db, 'batches', b.id), b);
          }
        }

        // Fetch student attendance
        const attSnap = await getDocs(collection(db, 'student_attendance'));
        if (!attSnap.empty) {
          setStudentAttendance(attSnap.docs.map(d => ({ ...d.data(), id: d.id } as StudentAttendance)));
        }

        // Fetch teacher attendance
        const tchAttSnap = await getDocs(collection(db, 'teacher_attendance'));
        if (!tchAttSnap.empty) {
          setTeacherAttendance(tchAttSnap.docs.map(d => ({ ...d.data(), id: d.id } as TeacherAttendance)));
        }

        // Fetch fee transactions
        const txSnap = await getDocs(collection(db, 'fee_transactions'));
        if (!txSnap.empty) {
          setFeeTransactions(txSnap.docs.map(d => ({ ...d.data(), id: d.id } as FeeTransaction)));
        }

        // Fetch fee reminders
        const remSnap = await getDocs(collection(db, 'fee_reminders'));
        if (!remSnap.empty) {
          setFeeReminders(remSnap.docs.map(d => ({ ...d.data(), id: d.id } as FeeReminder)));
        }

        // Fetch examinations
        const examSnap = await getDocs(collection(db, 'examinations'));
        if (!examSnap.empty) {
          setExaminations(examSnap.docs.map(d => ({ ...d.data(), id: d.id } as Examination)));
        }

        // Fetch student marks
        const mrkSnap = await getDocs(collection(db, 'student_marks'));
        if (!mrkSnap.empty) {
          setStudentMarks(mrkSnap.docs.map(d => ({ ...d.data(), id: d.id } as StudentMarks)));
        }

        // Fetch announcements
        const annSnap = await getDocs(collection(db, 'announcements'));
        if (!annSnap.empty) {
          setAnnouncements(annSnap.docs.map(d => ({ ...d.data(), id: d.id } as Announcement)));
        }

        // Fetch notifications
        const notSnap = await getDocs(collection(db, 'notifications'));
        if (!notSnap.empty) {
          setNotifications(notSnap.docs.map(d => ({ ...d.data(), id: d.id } as NotificationItem)));
        }

        // Fetch audit logs
        const logSnap = await getDocs(collection(db, 'audit_logs'));
        if (!logSnap.empty) {
          setAuditLogs(logSnap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLogItem)));
        }
      } catch (err) {
        console.warn('Firestore initial load notice (fallback to loaded local state):', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // 1. STUDENT ACTIONS
  const addStudent = async (studentData: Omit<Student, 'id' | 'studentId'> & { studentId?: string }, performedBy: string, userRole: string): Promise<Student> => {
    const studentCount = students.length + 1;
    const generatedId = studentData.studentId || `IIS-STU-${1000 + studentCount}`;
    const docId = `stu_${Date.now()}`;
    const newStudent: Student = {
      ...studentData,
      id: docId,
      studentId: generatedId,
      status: studentData.status || 'active',
      admissionDate: studentData.admissionDate || studentData.joiningDate || new Date().toISOString().split('T')[0],
      joiningDate: studentData.joiningDate || studentData.admissionDate || new Date().toISOString().split('T')[0],
      assignedBatches: studentData.assignedBatches || [],
    };

    try {
      await setDoc(doc(db, 'students', docId), newStudent);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `students/${docId}`);
    }

    setStudents(prev => [newStudent, ...prev]);
    await addAuditLog('Student Enrolled', 'Student', generatedId, `Admitted ${newStudent.name} (${newStudent.classCourse}) with fee ₹${newStudent.monthlyFee}`, performedBy, userRole);
    await pushNotification('admission', 'New Student Admitted', `${newStudent.name} admitted to ${newStudent.classCourse} (ID: ${generatedId})`);

    return newStudent;
  };

  const updateStudent = async (id: string, updates: Partial<Student>, performedBy: string, userRole: string) => {
    try {
      await setDoc(doc(db, 'students', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${id}`);
    }

    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const target = students.find(s => s.id === id);
    await addAuditLog('Student Updated', 'Student', target?.studentId || id, `Updated student details for ${target?.name || id}`, performedBy, userRole);
  };

  const deleteStudent = async (id: string, performedBy: string, userRole: string) => {
    const target = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete students/${id}:`, err);
    }
    await addAuditLog('Student Deleted', 'Student', target?.studentId || id, `Removed record for student ${target?.name || id}`, performedBy, userRole);
  };

  const importStudents = async (newStudents: Partial<Student>[], performedBy: string, userRole: string): Promise<number> => {
    let count = 0;
    const addedList: Student[] = [];
    for (const item of newStudents) {
      if (!item.name || !item.whatsappNumber) continue;
      const num = students.length + count + 1;
      const id = `stu_${Date.now()}_${count}`;
      const student: Student = {
        id,
        studentId: item.studentId || `IIS-STU-${1000 + num}`,
        name: item.name,
        fatherName: item.fatherName || 'Parent / Guardian',
        whatsappNumber: item.whatsappNumber,
        address: item.address || 'Local Residence',
        dob: item.dob || '2009-01-01',
        gender: (item.gender as any) || 'Male',
        classCourse: item.classCourse || 'Class 10',
        assignedBatches: item.assignedBatches || [],
        monthlyFee: Number(item.monthlyFee) || 4500,
        feeDueDate: Number(item.feeDueDate) || 5,
        status: 'active',
        admissionDate: item.admissionDate || item.joiningDate || new Date().toISOString().split('T')[0],
        joiningDate: item.joiningDate || item.admissionDate || new Date().toISOString().split('T')[0],
        notes: item.notes || 'Imported via CSV/Excel',
      };
      try {
        await setDoc(doc(db, 'students', id), student);
      } catch {
        // ignore
      }
      addedList.push(student);
      count++;
    }

    setStudents(prev => [...addedList, ...prev]);
    await addAuditLog('Bulk Students Imported', 'Student', 'Multiple', `Imported ${count} student records via CSV/Excel`, performedBy, userRole);
    return count;
  };

  const transferStudentBatch = async (studentId: string, fromBatchId: string, toBatchId: string, performedBy: string, userRole: string) => {
    const student = students.find(s => s.studentId === studentId || s.id === studentId);
    if (!student) return;

    const updatedBatches = student.assignedBatches.filter(b => b !== fromBatchId);
    if (!updatedBatches.includes(toBatchId)) {
      updatedBatches.push(toBatchId);
    }

    await updateStudent(student.id, { assignedBatches: updatedBatches }, performedBy, userRole);
    await addAuditLog('Batch Transferred', 'Student', student.studentId, `Transferred ${student.name} from batch ${fromBatchId} to ${toBatchId}`, performedBy, userRole);
  };

  // 2. TEACHER ACTIONS
  const addTeacher = async (teacherData: Omit<Teacher, 'id' | 'teacherId'> & { teacherId?: string }, performedBy: string, userRole: string): Promise<Teacher> => {
    const teacherCount = teachers.length + 1;
    const generatedId = teacherData.teacherId || `IIS-TCH-${100 + teacherCount}`;
    const docId = `tch_${Date.now()}`;
    const newTeacher: Teacher = {
      ...teacherData,
      id: docId,
      teacherId: generatedId,
      status: teacherData.status || 'active',
      assignedBatches: teacherData.assignedBatches || [],
      assignedClasses: teacherData.assignedClasses || [],
      subjectsTaught: teacherData.subjectsTaught || [],
    };

    try {
      await setDoc(doc(db, 'teachers', docId), newTeacher);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teachers/${docId}`);
    }

    setTeachers(prev => [newTeacher, ...prev]);
    await addAuditLog('Teacher Added', 'Teacher', generatedId, `Added faculty member ${newTeacher.name}`, performedBy, userRole);

    return newTeacher;
  };

  const updateTeacher = async (id: string, updates: Partial<Teacher>, performedBy: string, userRole: string) => {
    try {
      await setDoc(doc(db, 'teachers', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teachers/${id}`);
    }

    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const target = teachers.find(t => t.id === id);
    await addAuditLog('Teacher Updated', 'Teacher', target?.teacherId || id, `Updated faculty details for ${target?.name}`, performedBy, userRole);
  };

  const deleteTeacher = async (id: string, performedBy: string, userRole: string) => {
    const target = teachers.find(t => t.id === id);
    setTeachers(prev => prev.filter(t => t.id !== id));
    try {
      await deleteDoc(doc(db, 'teachers', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete teachers/${id}:`, err);
    }
    await addAuditLog('Teacher Deleted', 'Teacher', target?.teacherId || id, `Removed teacher ${target?.name || id}`, performedBy, userRole);
  };

  // 3. BATCH ACTIONS
  const addBatch = async (batchData: Omit<Batch, 'id' | 'batchId'> & { batchId?: string }, performedBy: string, userRole: string): Promise<Batch> => {
    const count = batches.length + 1;
    const generatedId = batchData.batchId || `IIS-BAT-${200 + count}`;
    const docId = `bat_${Date.now()}`;
    const newBatch: Batch = {
      ...batchData,
      id: docId,
      batchId: generatedId,
      assignedTeacherIds: batchData.assignedTeacherIds || [],
      status: batchData.status || 'active',
    };

    try {
      await setDoc(doc(db, 'batches', docId), newBatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `batches/${docId}`);
    }

    setBatches(prev => [newBatch, ...prev]);
    await addAuditLog('Batch Created', 'Batch', generatedId, `Created batch ${newBatch.name} (${newBatch.classCourse})`, performedBy, userRole);

    return newBatch;
  };

  const updateBatch = async (id: string, updates: Partial<Batch>, performedBy: string, userRole: string) => {
    try {
      await setDoc(doc(db, 'batches', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `batches/${id}`);
    }

    setBatches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    const target = batches.find(b => b.id === id);
    await addAuditLog('Batch Updated', 'Batch', target?.batchId || id, `Updated batch schedule/teachers for ${target?.name}`, performedBy, userRole);
  };

  const deleteBatch = async (id: string, performedBy: string, userRole: string) => {
    const target = batches.find(b => b.id === id);
    setBatches(prev => prev.filter(b => b.id !== id));
    try {
      await deleteDoc(doc(db, 'batches', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete batches/${id}:`, err);
    }
    await addAuditLog('Batch Deleted', 'Batch', target?.batchId || id, `Deleted batch ${target?.name || id}`, performedBy, userRole);
  };

  // 4. STUDENT ATTENDANCE ACTIONS
  const markStudentAttendance = async (record: Omit<StudentAttendance, 'id'>, performedBy: string, userRole: string) => {
    // Check if record already exists for this student, batch, date
    const existingIndex = studentAttendance.findIndex(
      a => a.studentId === record.studentId && a.batchId === record.batchId && a.date === record.date
    );

    const docId = existingIndex >= 0 ? studentAttendance[existingIndex].id : `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullRecord: StudentAttendance = {
      ...record,
      id: docId,
      markedBy: performedBy,
      markedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'student_attendance', docId), fullRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `student_attendance/${docId}`);
    }

    if (existingIndex >= 0) {
      setStudentAttendance(prev => {
        const copy = [...prev];
        copy[existingIndex] = fullRecord;
        return copy;
      });
    } else {
      setStudentAttendance(prev => [fullRecord, ...prev]);
    }

    // Check consecutive absence trigger
    if (record.status === 'absent') {
      const studentHistory = studentAttendance
        .filter(a => a.studentId === record.studentId)
        .sort((a, b) => b.date.localeCompare(a.date));
      const recentAbsences = studentHistory.slice(0, 2).filter(a => a.status === 'absent').length;
      if (recentAbsences >= 2) {
        await pushNotification(
          'consecutive_absence',
          'Consecutive Absence Alert',
          `${record.studentName || record.studentId} has missed 3+ consecutive classes in batch ${record.batchName || record.batchId}.`,
          { studentId: record.studentId, batchId: record.batchId }
        );
      }
    }
  };

  const bulkMarkStudentAttendance = async (records: Omit<StudentAttendance, 'id'>[], performedBy: string, userRole: string) => {
    for (const rec of records) {
      await markStudentAttendance(rec, performedBy, userRole);
    }
    await addAuditLog('Batch Attendance Marked', 'StudentAttendance', records[0]?.batchId || '', `Marked attendance for ${records.length} students on ${records[0]?.date}`, performedBy, userRole);
  };

  const correctStudentAttendance = async (id: string, newStatus: StudentAttendance['status'], reason: string, performedBy: string, userRole: string) => {
    const existing = studentAttendance.find(a => a.id === id);
    if (!existing) return;

    const updates = {
      status: newStatus,
      correctionReason: reason,
      updatedBy: performedBy,
    };

    try {
      await setDoc(doc(db, 'student_attendance', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `student_attendance/${id}`);
    }

    setStudentAttendance(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    await addAuditLog('Attendance Corrected', 'StudentAttendance', existing.studentId, `Corrected attendance status from ${existing.status} to ${newStatus}. Reason: ${reason}`, performedBy, userRole);
  };

  const deleteStudentAttendance = async (id: string, performedBy: string, userRole: string) => {
    const existing = studentAttendance.find(a => a.id === id);
    setStudentAttendance(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, 'student_attendance', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete student_attendance/${id}:`, err);
    }
    await addAuditLog('Student Attendance Deleted', 'StudentAttendance', existing?.studentId || id, `Deleted attendance record for ${existing?.studentName || existing?.studentId} on ${existing?.date}`, performedBy, userRole);
  };

  // 5. TEACHER ATTENDANCE ACTIONS
  const recordTeacherArrival = async (teacherId: string, session: 'morning' | 'evening', time?: string, performedBy?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const teacher = teachers.find(t => t.teacherId === teacherId);

    // Morning threshold: 09:10 AM, Evening threshold: 16:15 PM
    const isLate = session === 'morning' ? (nowTime > '09:10') : (nowTime > '16:15');

    const docId = `att_tch_${Date.now()}`;
    const newRecord: TeacherAttendance = {
      id: docId,
      teacherId,
      teacherName: teacher?.name || teacherId,
      date: today,
      session,
      arrivalTime: nowTime,
      status: isLate ? 'late' : 'present',
      lateArrival: isLate,
      markedBy: performedBy || teacher?.name || 'Self',
    };

    try {
      await setDoc(doc(db, 'teacher_attendance', docId), newRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teacher_attendance/${docId}`);
    }

    setTeacherAttendance(prev => [newRecord, ...prev]);
    await addAuditLog('Teacher Arrival Recorded', 'TeacherAttendance', teacherId, `${teacher?.name} checked in for ${session} session at ${nowTime} (${isLate ? 'LATE' : 'ON TIME'})`, performedBy || teacher?.name || 'Self', 'Teacher');
  };

  const recordTeacherDeparture = async (attendanceId: string, departureTime?: string, performedBy?: string) => {
    const nowTime = departureTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const existing = teacherAttendance.find(a => a.id === attendanceId);
    if (!existing) return;

    let workingDuration = 0;
    if (existing.arrivalTime) {
      const [arrH, arrM] = existing.arrivalTime.split(':').map(Number);
      const [depH, depM] = nowTime.split(':').map(Number);
      workingDuration = Math.max(0, (depH * 60 + depM) - (arrH * 60 + arrM));
    }

    const updates = {
      departureTime: nowTime,
      workingDurationMinutes: workingDuration,
    };

    try {
      await setDoc(doc(db, 'teacher_attendance', attendanceId), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teacher_attendance/${attendanceId}`);
    }

    setTeacherAttendance(prev => prev.map(a => a.id === attendanceId ? { ...a, ...updates } : a));
    await addAuditLog('Teacher Departure Recorded', 'TeacherAttendance', existing.teacherId, `${existing.teacherName} checked out at ${nowTime}. Total session duration: ${workingDuration} mins`, performedBy || existing.teacherName || 'Staff', 'Teacher');
  };

  const recordTeacherQuickAttendance = async (
    teacherId: string,
    session: 'morning' | 'evening',
    status: TeacherAttendance['status'],
    arrivalTime?: string,
    departureTime?: string,
    remarks?: string,
    performedBy?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const teacher = teachers.find(t => t.teacherId === teacherId);
    const existing = teacherAttendance.find(a => a.teacherId === teacherId && a.date === today && a.session === session);

    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const finalArrTime = arrivalTime !== undefined ? arrivalTime : (status === 'present' || status === 'late' ? nowTime : undefined);
    const finalDepTime = departureTime !== undefined ? departureTime : undefined;

    let workingDuration = 0;
    if (finalArrTime && finalDepTime) {
      const [arrH, arrM] = finalArrTime.split(':').map(Number);
      const [depH, depM] = finalDepTime.split(':').map(Number);
      workingDuration = Math.max(0, (depH * 60 + depM) - (arrH * 60 + arrM));
    }

    const isLate = status === 'late' || (finalArrTime ? (session === 'morning' ? finalArrTime > '09:10' : finalArrTime > '16:15') : false);

    if (existing) {
      const updates: Partial<TeacherAttendance> = {
        status,
        arrivalTime: finalArrTime || existing.arrivalTime,
        departureTime: finalDepTime || existing.departureTime,
        workingDurationMinutes: workingDuration || existing.workingDurationMinutes,
        lateArrival: isLate,
        remarks: remarks || existing.remarks,
      };
      await correctTeacherAttendance(existing.id, updates, remarks || `Status set to ${status}`, performedBy || 'Admin');
    } else {
      const docId = `att_tch_${Date.now()}`;
      const newRecord: TeacherAttendance = {
        id: docId,
        teacherId,
        teacherName: teacher?.name || teacherId,
        date: today,
        session,
        arrivalTime: finalArrTime,
        departureTime: finalDepTime,
        workingDurationMinutes: workingDuration || undefined,
        status,
        lateArrival: isLate,
        remarks: remarks || `Marked as ${status}`,
        markedBy: performedBy || teacher?.name || 'Self',
      };
      try {
        await setDoc(doc(db, 'teacher_attendance', docId), newRecord);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `teacher_attendance/${docId}`);
      }
      setTeacherAttendance(prev => [newRecord, ...prev]);
      await addAuditLog('Teacher Attendance Stamped', 'TeacherAttendance', teacherId, `Stamped ${status.toUpperCase()} for ${teacher?.name} (${session} session)`, performedBy || 'Self', 'Teacher');
    }
  };

  const correctTeacherAttendance = async (id: string, updates: Partial<TeacherAttendance>, reason: string, performedBy: string) => {
    const target = teacherAttendance.find(a => a.id === id);
    if (!target) return;

    try {
      await setDoc(doc(db, 'teacher_attendance', id), { ...updates, remarks: `Admin Correction: ${reason}` }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teacher_attendance/${id}`);
    }

    setTeacherAttendance(prev => prev.map(a => a.id === id ? { ...a, ...updates, remarks: `Admin Correction: ${reason}` } : a));
    await addAuditLog('Teacher Attendance Corrected', 'TeacherAttendance', target.teacherId, `Adjusted ${target.teacherName} ${target.session} session: ${reason}`, performedBy, 'Admin');
  };

  const deleteTeacherAttendance = async (id: string, performedBy: string, userRole: string) => {
    const existing = teacherAttendance.find(a => a.id === id);
    setTeacherAttendance(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, 'teacher_attendance', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete teacher_attendance/${id}:`, err);
    }
    await addAuditLog('Teacher Attendance Deleted', 'TeacherAttendance', existing?.teacherId || id, `Deleted ${existing?.session} session log for ${existing?.teacherName} on ${existing?.date}`, performedBy, userRole);
  };

  // 6. FEE TRANSACTIONS
  const recordFeePayment = async (paymentData: Omit<FeeTransaction, 'id' | 'receiptNo'>, performedBy: string, userRole: string): Promise<FeeTransaction> => {
    const year = new Date().getFullYear();
    const count = feeTransactions.length + 1;
    const receiptNo = `IIS-REC-${year}-${String(count).padStart(4, '0')}`;
    const docId = `tx_${Date.now()}`;

    const newTx: FeeTransaction = {
      ...paymentData,
      id: docId,
      receiptNo,
      collectedBy: performedBy,
    };

    try {
      await setDoc(doc(db, 'fee_transactions', docId), newTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `fee_transactions/${docId}`);
    }

    setFeeTransactions(prev => [newTx, ...prev]);
    await addAuditLog('Fee Payment Logged', 'FeeTransaction', receiptNo, `Received ₹${newTx.amountPaid.toLocaleString()} for ${newTx.studentName} (${newTx.monthFor}) via ${newTx.paymentMode}`, performedBy, userRole);
    await pushNotification('fee_due', 'Fee Payment Received', `₹${newTx.amountPaid.toLocaleString()} collected for ${newTx.studentName}. Receipt: ${receiptNo}`);

    return newTx;
  };

  const correctFeeTransaction = async (id: string, updates: Partial<FeeTransaction>, reason: string, performedBy: string, userRole: string) => {
    const existing = feeTransactions.find(t => t.id === id);
    if (!existing) return;

    // Never delete original receipt, record adjustment note
    const merged = {
      ...updates,
      isCorrection: true,
      notes: `${existing.notes || ''} [Corrected on ${new Date().toLocaleDateString()}: ${reason}]`,
    };

    try {
      await setDoc(doc(db, 'fee_transactions', id), merged, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fee_transactions/${id}`);
    }

    setFeeTransactions(prev => prev.map(t => t.id === id ? { ...t, ...merged } : t));
    await addAuditLog('Fee Record Corrected', 'FeeTransaction', existing.receiptNo, `Adjusted transaction for ${existing.studentName}. Reason: ${reason}`, performedBy, userRole);
  };

  const updateFeeTransaction = async (id: string, updates: Partial<FeeTransaction>, performedBy: string, userRole: string) => {
    const existing = feeTransactions.find(t => t.id === id);
    if (!existing) return;
    const merged = { ...updates, isCorrection: true };
    try {
      await setDoc(doc(db, 'fee_transactions', id), merged, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fee_transactions/${id}`);
    }
    setFeeTransactions(prev => prev.map(t => t.id === id ? { ...t, ...merged } : t));
    await addAuditLog('Fee Transaction Updated', 'FeeTransaction', existing.receiptNo, `Updated fee transaction for ${existing.studentName}`, performedBy, userRole);
  };

  const deleteFeeTransaction = async (id: string, performedBy: string, userRole: string) => {
    const existing = feeTransactions.find(t => t.id === id);
    setFeeTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await deleteDoc(doc(db, 'fee_transactions', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete fee_transactions/${id}:`, err);
    }
    await addAuditLog('Fee Transaction Deleted', 'FeeTransaction', existing?.receiptNo || id, `Deleted receipt ${existing?.receiptNo} for ${existing?.studentName}`, performedBy, userRole);
  };

  // 7. FEE REMINDERS
  const sendFeeReminder = async (reminderData: Omit<FeeReminder, 'id'>, performedBy: string): Promise<FeeReminder> => {
    const docId = `rem_${Date.now()}`;
    const reminder: FeeReminder = {
      ...reminderData,
      id: docId,
      status: 'delivered', // simulated provider acknowledgement
      sentAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'fee_reminders', docId), reminder);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `fee_reminders/${docId}`);
    }

    setFeeReminders(prev => [reminder, ...prev]);
    await addAuditLog('Fee Reminder Sent', 'FeeReminder', reminder.studentId, `Dispatched WhatsApp/SMS reminder for ₹${reminder.amountDue} to ${reminder.parentPhone}`, performedBy, 'Accountant');

    return reminder;
  };

  const sendBulkFeeReminders = async (targetStudentIds: string[], customMessageTemplate?: string, performedBy = 'Accountant'): Promise<number> => {
    let sentCount = 0;
    const added: FeeReminder[] = [];

    for (const sid of targetStudentIds) {
      const student = students.find(s => s.studentId === sid || s.id === sid);
      if (!student) continue;

      // Check for existing reminder sent today
      const today = new Date().toISOString().split('T')[0];
      const alreadySent = feeReminders.some(r => r.studentId === student.studentId && r.sentAt.startsWith(today));
      if (alreadySent) continue;

      const msg = customMessageTemplate
        ? customMessageTemplate.replace('{studentName}', student.name).replace('{amount}', `₹${student.monthlyFee}`)
        : `Dear Parent, this is a gentle reminder that your child ${student.name}'s monthly fee of ₹${student.monthlyFee.toLocaleString()} is pending at IIS Institute. Kindly clear at your earliest convenience. Thank you.`;

      const id = `rem_${Date.now()}_${sentCount}`;
      const rem: FeeReminder = {
        id,
        studentId: student.studentId,
        studentName: student.name,
        parentPhone: student.whatsappNumber,
        amountDue: student.monthlyFee,
        dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(student.feeDueDate).padStart(2, '0')}`,
        reminderType: 'manual',
        status: 'delivered',
        message: msg,
        sentAt: new Date().toISOString(),
        channel: 'whatsapp',
      };

      try {
        await setDoc(doc(db, 'fee_reminders', id), rem);
      } catch {
        // ignore
      }

      added.push(rem);
      sentCount++;
    }

    setFeeReminders(prev => [...added, ...prev]);
    await addAuditLog('Bulk Reminders Sent', 'FeeReminder', 'Bulk', `Dispatched ${sentCount} fee reminders via WhatsApp Gateway`, performedBy, 'Accountant');
    return sentCount;
  };

  const updateFeeReminder = async (id: string, updates: Partial<FeeReminder>, performedBy: string) => {
    try {
      await setDoc(doc(db, 'fee_reminders', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fee_reminders/${id}`);
    }
    setFeeReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    await addAuditLog('Fee Reminder Updated', 'FeeReminder', id, `Updated reminder record`, performedBy, 'Accountant');
  };

  const deleteFeeReminder = async (id: string, performedBy: string) => {
    setFeeReminders(prev => prev.filter(r => r.id !== id));
    try {
      await deleteDoc(doc(db, 'fee_reminders', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete fee_reminders/${id}:`, err);
    }
    await addAuditLog('Fee Reminder Deleted', 'FeeReminder', id, `Deleted reminder record`, performedBy, 'Accountant');
  };

  // 8. EXAMINATIONS & MARKS
  const createExam = async (examData: Omit<Examination, 'id'>, performedBy: string, userRole: string): Promise<Examination> => {
    const docId = `exam_${Date.now()}`;
    const newExam: Examination = {
      ...examData,
      id: docId,
    };

    try {
      await setDoc(doc(db, 'examinations', docId), newExam);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `examinations/${docId}`);
    }

    setExaminations(prev => [newExam, ...prev]);
    await addAuditLog('Exam Created', 'Examination', newExam.title, `Scheduled exam ${newExam.title} for ${newExam.classCourse} on ${newExam.examDate}`, performedBy, userRole);
    await pushNotification('exam', 'New Examination Scheduled', `${newExam.title} (${newExam.classCourse}) on ${newExam.examDate}`);

    return newExam;
  };

  const updateExam = async (id: string, updates: Partial<Examination>, performedBy: string, userRole: string) => {
    try {
      await setDoc(doc(db, 'examinations', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `examinations/${id}`);
    }

    setExaminations(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const target = examinations.find(e => e.id === id);
    await addAuditLog('Exam Updated', 'Examination', target?.title || id, `Updated examination schedule/status`, performedBy, userRole);
  };

  const deleteExam = async (id: string, performedBy: string, userRole: string) => {
    const target = examinations.find(e => e.id === id);
    setExaminations(prev => prev.filter(e => e.id !== id));
    try {
      await deleteDoc(doc(db, 'examinations', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete examinations/${id}:`, err);
    }
    await addAuditLog('Exam Deleted', 'Examination', target?.title || id, `Deleted examination ${target?.title || id}`, performedBy, userRole);
  };

  const saveStudentMarks = async (marksData: Omit<StudentMarks, 'id'>, performedBy: string, userRole: string) => {
    const existingIndex = studentMarks.findIndex(
      m => m.examId === marksData.examId && m.studentId === marksData.studentId
    );
    const docId = existingIndex >= 0 ? studentMarks[existingIndex].id : `mrk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const fullRecord: StudentMarks = {
      ...marksData,
      id: docId,
      enteredBy: performedBy,
    };

    try {
      await setDoc(doc(db, 'student_marks', docId), fullRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `student_marks/${docId}`);
    }

    if (existingIndex >= 0) {
      setStudentMarks(prev => {
        const copy = [...prev];
        copy[existingIndex] = fullRecord;
        return copy;
      });
    } else {
      setStudentMarks(prev => [fullRecord, ...prev]);
    }

    await addAuditLog('Marks Saved', 'StudentMarks', marksData.studentId, `Saved score for ${marksData.studentName} in ${marksData.examTitle}: ${marksData.totalMarks}/${marksData.maxTotalMarks} (${marksData.percentage}%)`, performedBy, userRole);
  };

  const updateStudentMarks = async (id: string, updates: Partial<StudentMarks>, performedBy: string, userRole: string) => {
    try {
      await setDoc(doc(db, 'student_marks', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `student_marks/${id}`);
    }
    setStudentMarks(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    const target = studentMarks.find(m => m.id === id);
    await addAuditLog('Student Marks Updated', 'StudentMarks', target?.studentId || id, `Updated examination marks for ${target?.studentName}`, performedBy, userRole);
  };

  const deleteStudentMarks = async (id: string, performedBy: string, userRole: string) => {
    const target = studentMarks.find(m => m.id === id);
    setStudentMarks(prev => prev.filter(m => m.id !== id));
    try {
      await deleteDoc(doc(db, 'student_marks', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete student_marks/${id}:`, err);
    }
    await addAuditLog('Student Marks Deleted', 'StudentMarks', target?.studentId || id, `Deleted marks record for ${target?.studentName || id} in ${target?.examTitle || 'Exam'}`, performedBy, userRole);
  };

  // 9. ANNOUNCEMENTS
  const createAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt'>, performedBy: string): Promise<Announcement> => {
    const docId = `ann_${Date.now()}`;
    const ann: Announcement = {
      ...announcementData,
      id: docId,
      createdBy: performedBy,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'announcements', docId), ann);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `announcements/${docId}`);
    }

    setAnnouncements(prev => [ann, ...prev]);
    await addAuditLog('Announcement Published', 'Announcement', ann.title, `Published circular: "${ann.title}" to ${ann.targetAudience}`, performedBy, 'Admin');
    await pushNotification('announcement', `Circular: ${ann.title}`, ann.content.substring(0, 80) + '...');

    return ann;
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>, performedBy: string) => {
    try {
      await setDoc(doc(db, 'announcements', id), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `announcements/${id}`);
    }
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    await addAuditLog('Announcement Updated', 'Announcement', id, `Updated circular notice "${updates.title || id}"`, performedBy, 'Admin');
  };

  const deleteAnnouncement = async (id: string, performedBy: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      console.warn(`Firestore sync note for delete announcements/${id}:`, err);
    }
    await addAuditLog('Announcement Removed', 'Announcement', id, `Removed circular notice`, performedBy, 'Admin');
  };

  // 10. NOTIFICATIONS
  const markNotificationRead = async (id: string) => {
    try {
      await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
    } catch {
      // ignore
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
  };

  // 11. AUDIT LOGS MANAGEMENT
  const deleteAuditLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'audit_logs', id));
    } catch {
      // ignore
    }
    setAuditLogs(prev => prev.filter(l => l.id !== id));
  };

  const clearAuditLogs = async () => {
    setAuditLogs([]);
  };

  // 12. DEMO RESET & WIPE CONTROLS
  const resetToDemoData = async () => {
    setIsLoading(true);
    try {
      // Re-seed all collections
      setStudents(INITIAL_STUDENTS);
      setTeachers(INITIAL_TEACHERS);
      setBatches(INITIAL_BATCHES);
      setStudentAttendance(INITIAL_STUDENT_ATTENDANCE);
      setTeacherAttendance(INITIAL_TEACHER_ATTENDANCE);
      setFeeTransactions(INITIAL_FEE_TRANSACTIONS);
      setFeeReminders(INITIAL_FEE_REMINDERS);
      setExaminations(INITIAL_EXAMINATIONS);
      setStudentMarks(INITIAL_STUDENT_MARKS);
      setAnnouncements(INITIAL_ANNOUNCEMENTS);
      setNotifications(INITIAL_NOTIFICATIONS);
      setAuditLogs(INITIAL_AUDIT_LOGS);

      for (const s of INITIAL_STUDENTS) await setDoc(doc(db, 'students', s.id), s);
      for (const t of INITIAL_TEACHERS) await setDoc(doc(db, 'teachers', t.id), t);
      for (const b of INITIAL_BATCHES) await setDoc(doc(db, 'batches', b.id), b);
      for (const a of INITIAL_STUDENT_ATTENDANCE) await setDoc(doc(db, 'student_attendance', a.id), a);
      for (const ta of INITIAL_TEACHER_ATTENDANCE) await setDoc(doc(db, 'teacher_attendance', ta.id), ta);
      for (const tx of INITIAL_FEE_TRANSACTIONS) await setDoc(doc(db, 'fee_transactions', tx.id), tx);
      for (const r of INITIAL_FEE_REMINDERS) await setDoc(doc(db, 'fee_reminders', r.id), r);
      for (const ex of INITIAL_EXAMINATIONS) await setDoc(doc(db, 'examinations', ex.id), ex);
      for (const m of INITIAL_STUDENT_MARKS) await setDoc(doc(db, 'student_marks', m.id), m);
      for (const ann of INITIAL_ANNOUNCEMENTS) await setDoc(doc(db, 'announcements', ann.id), ann);
    } catch (err) {
      console.error('Error resetting demo data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllInstituteData = async () => {
    setStudents([]);
    setTeachers([]);
    setBatches([]);
    setStudentAttendance([]);
    setTeacherAttendance([]);
    setFeeTransactions([]);
    setFeeReminders([]);
    setExaminations([]);
    setStudentMarks([]);
    setAnnouncements([]);
    setNotifications([]);
  };

  return (
    <DataContext.Provider
      value={{
        students,
        teachers,
        batches,
        studentAttendance,
        teacherAttendance,
        feeTransactions,
        feeReminders,
        examinations,
        studentMarks,
        announcements,
        notifications,
        auditLogs,
        isLoading,
        error,
        addStudent,
        updateStudent,
        deleteStudent,
        importStudents,
        transferStudentBatch,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addBatch,
        updateBatch,
        deleteBatch,
        markStudentAttendance,
        bulkMarkStudentAttendance,
        correctStudentAttendance,
        deleteStudentAttendance,
        recordTeacherArrival,
        recordTeacherDeparture,
        recordTeacherQuickAttendance,
        correctTeacherAttendance,
        deleteTeacherAttendance,
        recordFeePayment,
        correctFeeTransaction,
        updateFeeTransaction,
        deleteFeeTransaction,
        sendFeeReminder,
        sendBulkFeeReminders,
        updateFeeReminder,
        deleteFeeReminder,
        createExam,
        updateExam,
        deleteExam,
        saveStudentMarks,
        updateStudentMarks,
        deleteStudentMarks,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        markNotificationRead,
        clearAllNotifications,
        deleteAuditLog,
        clearAuditLogs,
        resetToDemoData,
        clearAllInstituteData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
