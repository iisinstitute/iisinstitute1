export type UserRole = 'Super Admin' | 'Admin' | 'Teacher' | 'Accountant' | 'Parent';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  password?: string;
  avatarUrl?: string;
  linkedTeacherId?: string;
  linkedStudentIds?: string[];
  createdAt: string;
}

export interface Student {
  id: string; // Firestore doc ID
  studentId: string; // e.g. IIS-STU-1001
  name: string;
  fatherName: string;
  whatsappNumber: string;
  address: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  classCourse: string;
  assignedBatches: string[]; // Batch IDs
  monthlyFee: number;
  feeDueDate: number; // Day of month (e.g. 5)
  photoUrl?: string;
  status: 'active' | 'inactive';
  notes?: string;
  admissionDate: string;
  joiningDate: string; // Student Date of Joining
}

export interface Teacher {
  id: string; // Firestore doc ID
  teacherId: string; // e.g. IIS-TCH-101
  name: string;
  mobile: string;
  email: string;
  subjectsTaught: string[];
  joiningDate: string;
  salary: number;
  assignedClasses: string[];
  assignedBatches: string[]; // Batch IDs
  status: 'active' | 'inactive';
  avatarUrl?: string;
}

export interface Batch {
  id: string; // Firestore doc ID
  batchId: string; // e.g. IIS-BAT-201
  name: string;
  classCourse: string;
  subject: string;
  timing: string; // e.g. "04:00 PM - 05:30 PM"
  days?: string[]; // e.g. ["Mon", "Wed", "Fri"]
  startDate: string;
  endDate: string;
  classroomNumber: string;
  maxCapacity: number;
  assignedTeacherIds: string[]; // Teacher IDs
  status: 'active' | 'completed' | 'upcoming';
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';

export interface StudentAttendance {
  id: string;
  studentId: string;
  studentName?: string;
  batchId: string;
  batchName?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string;
  correctionReason?: string;
  updatedBy?: string;
}

export type TeacherAttendanceSession = 'morning' | 'evening';
export type TeacherAttendanceStatus = 'present' | 'late' | 'absent' | 'half_day' | 'leave' | 'holiday';

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  teacherName?: string;
  date: string; // YYYY-MM-DD
  session: TeacherAttendanceSession;
  arrivalTime?: string; // HH:MM
  departureTime?: string; // HH:MM
  status: TeacherAttendanceStatus;
  lateArrival: boolean;
  workingDurationMinutes?: number;
  remarks?: string;
  markedBy: string;
}

export interface FeeTransaction {
  id: string;
  receiptNo: string; // e.g. IIS-REC-2026-001
  studentId: string; // Matches student.studentId or doc id
  studentName: string;
  batchId?: string;
  amountPaid: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  monthFor: string; // e.g. "November 2026"
  discountApplied: number;
  previousBalance: number;
  remainingBalance: number;
  notes?: string;
  collectedBy: string;
  isCorrection?: boolean;
}

export interface FeeReminder {
  id: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  amountDue: number;
  dueDate: string;
  reminderType: 'before_due' | 'on_due' | 'overdue' | 'manual';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  message: string;
  sentAt: string;
  channel: 'whatsapp' | 'sms';
}

export interface ExamSubject {
  subjectName: string;
  maxMarks: number;
  passingMarks: number;
}

export interface Examination {
  id: string;
  title: string;
  classCourse: string;
  batchId: string;
  examDate: string;
  subjects: ExamSubject[];
  status: 'scheduled' | 'conducted' | 'published';
}

export interface StudentMarks {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  batchId: string;
  marks: Record<string, { marksObtained: number; isAbsent: boolean }>;
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  grade: string;
  rank?: number;
  teacherRemarks?: string;
  enteredBy: string;
}

export type PerformanceCategory = 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement' | 'At Risk';

export interface StudentPerformanceSummary {
  studentId: string;
  studentName: string;
  attendancePercentage: number;
  totalExams: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  category: PerformanceCategory;
  trend: 'improving' | 'stable' | 'declining';
  strongSubjects: string[];
  weakSubjects: string[];
  suggestions: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'class' | 'batch' | 'parents' | 'teachers';
  targetId?: string;
  priority: 'normal' | 'urgent';
  createdBy: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'admission' | 'absence' | 'consecutive_absence' | 'fee_due' | 'fee_overdue' | 'exam' | 'marks' | 'teacher_attendance' | 'announcement';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  userRole: string;
  details: string;
  timestamp: string;
}
