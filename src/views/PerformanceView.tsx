import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  CalendarCheck,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { PerformanceCategory } from '../types/index.ts';

export const PerformanceView: React.FC = () => {
  const { students, studentAttendance, studentMarks, examinations } = useData();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.studentId || '');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected student object
  const activeStudent = students.find(s => s.studentId === selectedStudentId) || students[0];

  // Calculate comprehensive analytics for the student
  const studentMetrics = useMemo(() => {
    if (!activeStudent) return null;

    // Attendance stats
    const records = studentAttendance.filter(a => a.studentId === activeStudent.studentId);
    const presentCount = records.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendancePct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 92;

    // Consecutive absences check
    const sortedAtt = [...records].sort((a, b) => b.date.localeCompare(a.date));
    const recentAbsences = sortedAtt.slice(0, 3).filter(r => r.status === 'absent').length;

    // Exam marks stats
    const myMarks = studentMarks.filter(m => m.studentId === activeStudent.studentId);
    const totalExams = myMarks.length;

    let avgScore = 0;
    let highestScore = 0;
    let lowestScore = 100;
    const subjectAverages: Record<string, { total: number; count: number }> = {};

    if (totalExams > 0) {
      let sumPct = 0;
      myMarks.forEach(m => {
        sumPct += m.percentage;
        if (m.percentage > highestScore) highestScore = m.percentage;
        if (m.percentage < lowestScore) lowestScore = m.percentage;

        Object.entries(m.marks).forEach(([subj, info]) => {
          if (!subjectAverages[subj]) {
            subjectAverages[subj] = { total: 0, count: 0 };
          }
          if (!info.isAbsent) {
            subjectAverages[subj].total += info.marksObtained;
            subjectAverages[subj].count += 1;
          }
        });
      });
      avgScore = Math.round(sumPct / totalExams);
    } else {
      lowestScore = 0;
    }

    // Determine performance category
    let category: PerformanceCategory = 'Good';
    if (avgScore >= 85) category = 'Excellent';
    else if (avgScore >= 75) category = 'Very Good';
    else if (avgScore >= 60) category = 'Good';
    else if (avgScore >= 40) category = 'Needs Improvement';
    else category = 'At Risk';

    if (attendancePct < 70) {
      category = 'At Risk';
    }

    // Strong & weak subjects
    const subjectsRated = Object.entries(subjectAverages).map(([name, data]) => ({
      name,
      avg: Math.round(data.total / (data.count || 1)),
    }));
    subjectsRated.sort((a, b) => b.avg - a.avg);

    const strongSubjects = subjectsRated.filter(s => s.avg >= 70).map(s => s.name);
    const weakSubjects = subjectsRated.filter(s => s.avg < 60).map(s => s.name);

    // Dynamic actionable suggestions grounded in actual records
    const suggestions: string[] = [];
    if (attendancePct < 80) {
      suggestions.push(`Attendance rate is at ${attendancePct}%. Institute policy requires 85% minimum for final exam eligibility.`);
    }
    if (recentAbsences >= 2) {
      suggestions.push(`Notice: Student missed ${recentAbsences} recent lectures. Schedule backlog clearance with batch mentor.`);
    }
    if (weakSubjects.length > 0) {
      suggestions.push(`Scoring lower in ${weakSubjects.join(', ')}. Recommend attending Sunday special revision sessions.`);
    } else {
      suggestions.push('Maintains consistent test scores across subjects. Eligible for National Olympiad / JEE Advanced batch honors.');
    }

    return {
      attendancePct,
      recentAbsences,
      totalExams,
      avgScore,
      highestScore,
      lowestScore: totalExams > 0 ? lowestScore : 0,
      category,
      strongSubjects,
      weakSubjects,
      suggestions,
      myMarks,
    };
  }, [activeStudent, studentAttendance, studentMarks]);

  const categoryBadgeMap = {
    'Excellent': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Very Good': 'bg-blue-100 text-blue-800 border-blue-300',
    'Good': 'bg-purple-100 text-purple-800 border-purple-300',
    'Needs Improvement': 'bg-amber-100 text-amber-800 border-amber-300',
    'At Risk': 'bg-rose-100 text-rose-800 border-rose-300',
  };

  const filteredStudentList = students.filter(s => {
    const matchClass = filterClass === 'all' || s.classCourse === filterClass;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.studentId.includes(searchQuery);
    return matchClass && matchSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Student Performance Analytics</h1>
        <p className="text-xs text-gray-500">
          Individual progress drill-down, subject mastery radar, attendance correlation, and automated academic suggestions.
        </p>
      </div>

      {/* Main 2-Column Split: Student Selector + Deep Performance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Student Selector Roster */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Select Student</h3>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or ID..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {filteredStudentList.map(s => {
              const isSelected = s.studentId === selectedStudentId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.studentId)}
                  className={`w-full text-left rounded-xl p-2.5 transition-all text-xs border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="font-bold block truncate">{s.name}</span>
                  <div className="flex items-center justify-between text-[10px] mt-0.5 opacity-90">
                    <span className="font-mono">{s.studentId}</span>
                    <span>{s.classCourse}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (3 spans): Comprehensive Performance Card */}
        {activeStudent && studentMetrics && (
          <div className="lg:col-span-3 space-y-5">
            {/* Student Hero Banner */}
            <div className="rounded-2xl border border-gray-200 bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-extrabold text-xl shadow-xs">
                    {activeStudent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{activeStudent.name}</h2>
                      <span className="font-mono text-xs text-blue-700 font-bold">({activeStudent.studentId})</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Class: <strong>{activeStudent.classCourse}</strong> • Batches: {activeStudent.assignedBatches.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Performance Category
                  </span>
                  <span className={`rounded-xl border px-3 py-1 text-xs font-black shadow-2xs ${categoryBadgeMap[studentMetrics.category]}`}>
                    ★ {studentMetrics.category.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Academic Metrics 4-Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attendance Rate</span>
                <p className={`mt-1 text-2xl font-black ${studentMetrics.attendancePct >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {studentMetrics.attendancePct}%
                </p>
                <span className="text-[10px] text-gray-500">Min. Target: 85%</span>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Average Marks</span>
                <p className="mt-1 text-2xl font-black text-blue-700">
                  {studentMetrics.avgScore}%
                </p>
                <span className="text-[10px] text-gray-500">Across {studentMetrics.totalExams} tests</span>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Highest Score</span>
                <p className="mt-1 text-2xl font-black text-purple-700">
                  {studentMetrics.highestScore.toFixed(0)}%
                </p>
                <span className="text-[10px] text-gray-500">Peak Performance</span>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lowest Score</span>
                <p className="mt-1 text-2xl font-black text-amber-600">
                  {studentMetrics.lowestScore.toFixed(0)}%
                </p>
                <span className="text-[10px] text-gray-500">Floor Level</span>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Demonstrated Subject Strengths</span>
                </div>
                {studentMetrics.strongSubjects.length === 0 ? (
                  <p className="text-xs text-gray-500">Steady performance, no singular dominant subject yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {studentMetrics.strongSubjects.map(s => (
                      <span key={s} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-xs">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Subjects Needing Attention / Revision</span>
                </div>
                {studentMetrics.weakSubjects.length === 0 ? (
                  <p className="text-xs text-gray-500">No critical weak subjects identified. All scores above baseline!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {studentMetrics.weakSubjects.map(s => (
                      <span key={s} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs">
                        ⚠ {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actionable Guidance & Suggestions Card */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-3">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Faculty & Performance Actionable Suggestions</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-700">
                {studentMetrics.suggestions.map((sug, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{sug}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Past Examination Scores Breakdown */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Examination Scorecard History
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {studentMetrics.myMarks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">No examination scores logged yet for this student.</p>
                ) : (
                  studentMetrics.myMarks.map(m => (
                    <div key={m.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{m.examTitle}</h4>
                          <span className="text-[10px] text-gray-400">Batch: {m.batchId}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-blue-600">{m.percentage.toFixed(1)}%</span>
                          <span className="ml-2 rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            Grade {m.grade}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
                        {Object.entries(m.marks).map(([subj, info]) => (
                          <div key={subj} className="rounded-lg bg-gray-50 px-2.5 py-1 border border-gray-200 text-gray-800">
                            <span className="text-gray-500 mr-1">{subj}:</span>
                            <span className="font-bold">{info.isAbsent ? 'Absent' : info.marksObtained}</span>
                          </div>
                        ))}
                      </div>

                      {m.teacherRemarks && (
                        <p className="mt-2 text-[11px] text-gray-500 italic">
                          Remark: "{m.teacherRemarks}" — <span className="font-medium text-gray-700">{m.enteredBy}</span>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
