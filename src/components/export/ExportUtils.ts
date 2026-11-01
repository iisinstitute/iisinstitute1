import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FeeTransaction, Student, StudentMarks, Examination } from '../../types/index.ts';

// 1. Excel / CSV Exporter using SheetJS
export function exportToExcel(data: any[], fileName: string, sheetName = 'Data') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportToCSV(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Official IIS Institute Fee Payment Receipt PDF Generator
export function generateFeeReceiptPDF(tx: FeeTransaction, student?: Student) {
  const doc = new jsPDF();

  // Primary Header Banner
  doc.setFillColor(37, 99, 235); // Royal Blue
  doc.rect(0, 0, 210, 42, 'F');

  // Institute Branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('IIS INSTITUTE', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Premier Coaching for IIT-JEE, NEET, Olympiads & Board Excellence', 14, 25);
  doc.text('Center: Sector 14 / Connaught Place | Ph: +91 98200 11223 | info@iisinstitute.com', 14, 32);

  // Watermark
  doc.setTextColor(240, 243, 250);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.text('IIS INSTITUTE', 35, 150, { angle: 45 });

  // Receipt Title Badge
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(14, 48, 182, 14, 2, 2, 'F');
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL FEE PAYMENT RECEIPT', 18, 57);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${tx.paymentDate}`, 155, 57);

  // Student & Receipt Details Table
  autoTable(doc, {
    startY: 68,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 35 },
      1: { textColor: [17, 24, 39], cellWidth: 55 },
      2: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 35 },
      3: { textColor: [17, 24, 39], cellWidth: 57 },
    },
    body: [
      ['Receipt No:', tx.receiptNo, 'Payment Mode:', tx.paymentMode],
      ['Student Name:', tx.studentName, 'Student ID:', tx.studentId],
      ['Class / Course:', student?.classCourse || 'General Academic', 'Month For:', tx.monthFor],
      ['Father / Guardian:', student?.fatherName || 'Parent', 'WhatsApp No:', student?.whatsappNumber || 'N/A'],
    ],
  });

  // Financial Breakdown Table
  const finalY = (doc as any).lastAutoTable?.finalY || 105;
  autoTable(doc, {
    startY: finalY + 8,
    head: [['Particulars', 'Amount (INR)']],
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 52 },
    },
    body: [
      [`Coaching & Academic Tuition Fee (${tx.monthFor})`, `Rs. ${(tx.amountPaid + tx.discountApplied).toLocaleString()}`],
      ['Scholarship / Sibling Concession Applied', `(-) Rs. ${tx.discountApplied.toLocaleString()}`],
      ['Total Net Installment Payable', `Rs. ${tx.amountPaid.toLocaleString()}`],
      ['Amount Received in this Transaction', `Rs. ${tx.amountPaid.toLocaleString()}`],
      ['Remaining Outstanding Balance', `Rs. ${tx.remainingBalance.toLocaleString()}`],
    ],
  });

  const tableBottom = (doc as any).lastAutoTable?.finalY || 170;

  // Notes & Verification Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, tableBottom + 8, 182, 22, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Transaction Notes: ${tx.notes || 'Payment cleared through verified banking channel.'}`, 18, tableBottom + 16);
  doc.text(`Collected by: ${tx.collectedBy} | Computer Generated Document (No physical signature required)`, 18, tableBottom + 24);

  // Signatures
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.line(18, tableBottom + 55, 70, tableBottom + 55);
  doc.text('Student / Depositor Signature', 18, tableBottom + 60);

  doc.line(140, tableBottom + 55, 192, tableBottom + 55);
  doc.text('Accounts Officer (IIS Institute)', 140, tableBottom + 60);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for trusting IIS Institute with your academic future. Fees once paid are non-refundable.', 14, 285);

  doc.save(`${tx.receiptNo}_${tx.studentName.replace(/\s+/g, '_')}.pdf`);
}

// 3. Official IIS Institute Student Report Card PDF Generator
export function generateReportCardPDF(marks: StudentMarks, exam?: Examination, student?: Student) {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(109, 40, 217); // Royal Purple
  doc.rect(0, 0, 210, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('IIS INSTITUTE', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Academic Assessment & Student Progress Report Card', 14, 26);
  doc.text('Continuous Evaluation System | Student ID: ' + marks.studentId, 14, 33);

  // Title Box
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, 48, 182, 14, 2, 2, 'F');
  doc.setTextColor(91, 33, 182);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(marks.examTitle.toUpperCase(), 18, 57);

  // Student Meta
  autoTable(doc, {
    startY: 68,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 35 },
      1: { textColor: [17, 24, 39], cellWidth: 55 },
      2: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 35 },
      3: { textColor: [17, 24, 39], cellWidth: 57 },
    },
    body: [
      ['Student Name:', marks.studentName, 'Roll / ID:', marks.studentId],
      ['Class / Batch:', student?.classCourse || marks.batchId, 'Date of Exam:', exam?.examDate || 'Recent'],
      ['Overall Percentage:', `${marks.percentage.toFixed(1)}%`, 'Grade Awarded:', marks.grade],
      ['Class Rank:', marks.rank ? `#${marks.rank}` : 'Top Tier', 'Evaluation Status:', 'PASSED'],
    ],
  });

  // Subject Marks Table
  const subjectsData = Object.entries(marks.marks).map(([subj, info]) => {
    const examSubj = exam?.subjects.find(s => s.subjectName === subj);
    const max = examSubj?.maxMarks || 100;
    const pass = examSubj?.passingMarks || Math.round(max * 0.35);
    const scored = info.isAbsent ? 'ABSENT' : info.marksObtained;
    const pct = info.isAbsent ? '0%' : `${((info.marksObtained / max) * 100).toFixed(1)}%`;
    const grade = info.isAbsent
      ? 'Ab'
      : (info.marksObtained / max) >= 0.85
      ? 'A+'
      : (info.marksObtained / max) >= 0.75
      ? 'A'
      : (info.marksObtained / max) >= 0.6
      ? 'B'
      : (info.marksObtained / max) >= 0.4
      ? 'C'
      : 'F';

    return [subj, max.toString(), pass.toString(), scored.toString(), pct, grade];
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 105;
  autoTable(doc, {
    startY: finalY + 8,
    head: [['Subject', 'Max Marks', 'Passing Marks', 'Marks Scored', 'Percentage', 'Grade']],
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 },
      3: { fontStyle: 'bold', textColor: [37, 99, 235] },
      5: { fontStyle: 'bold', textColor: [109, 40, 217] },
    },
    body: subjectsData,
  });

  const marksTableBottom = (doc as any).lastAutoTable?.finalY || 165;

  // Aggregate Box
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(14, marksTableBottom + 8, 182, 16, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(`Grand Total: ${marks.totalMarks} / ${marks.maxTotalMarks} (${marks.percentage.toFixed(1)}%)`, 20, marksTableBottom + 18);
  doc.text(`Final Performance Category: ${marks.grade}`, 120, marksTableBottom + 18);

  // Faculty Remarks Box
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(14, marksTableBottom + 30, 182, 24, 2, 2, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Faculty Observation & Actionable Guidance:', 18, marksTableBottom + 38);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(marks.teacherRemarks || 'Consistent performance shown throughout the module. Keep revising daily assignments.', 18, marksTableBottom + 46);

  // Signatures
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.line(18, marksTableBottom + 78, 70, marksTableBottom + 78);
  doc.text('Class Faculty / Mentor', 18, marksTableBottom + 83);

  doc.line(140, marksTableBottom + 78, 192, marksTableBottom + 78);
  doc.text('Director of Academics (IIS)', 140, marksTableBottom + 83);

  doc.save(`ReportCard_${marks.studentName.replace(/\s+/g, '_')}_${marks.examTitle.substring(0, 15)}.pdf`);
}
