import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ResultSlip from '@/components/ResultSlip';
import { base44 } from '@/api/base44Client';
import { getGrade } from '@/components/GradingUtils';

/**
 * Renders a ResultSlip into a hidden DOM node, captures it as a canvas,
 * converts to PDF, uploads to storage, and saves a ReportCard entity record.
 */
export async function generateResultPDF({ student, results, settings, term, session, classTeacher, rankings }) {
  // 1. Create a hidden container and render the ResultSlip into it
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:white;z-index:-1;';
  document.body.appendChild(container);

  await new Promise((resolve) => {
    const root = createRoot(container);
    root.render(
      React.createElement(ResultSlip, { student, results, settings, term, session, classTeacher, rankings })
    );
    setTimeout(resolve, 800);
  });

  // 2. Capture canvas
  const canvas = await html2canvas(container.firstChild || container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // 3. Convert to PDF
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  const pdfBlob = pdf.output('blob');

  // 4. Clean up DOM node
  document.body.removeChild(container);

  // 5. Upload PDF blob
  const pdfFile = new File([pdfBlob], `result_${student.admission_number}_${term}_${session}.pdf`, { type: 'application/pdf' });
  const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

  // 6. Build summary data for ReportCard
  const totalScore = results.reduce((s, r) => s + (r.total || 0), 0);
  const average = results.length ? parseFloat((totalScore / results.length).toFixed(2)) : 0;
  const section = student.section || 'Primary';
  const overallGrade = getGrade(average, section);
  const creditsCount = results.filter(r => ['A1','A','B2','B3','B','C4','C5','C6','C'].includes(r.grade || '')).length;
  const failsCount = results.filter(r => r.grade === 'F9' || r.grade === 'F').length;
  const aGradeCount = results.filter(r => r.grade === 'A1' || r.grade === 'A').length;

  const subjects_data = results.map(r => ({
    subject_name: r.subject_name,
    first_ca: r.first_ca,
    second_ca: r.second_ca,
    exam_score: r.exam_score,
    total: r.total,
    grade: r.grade,
    remark: r.remark,
  }));

  // 7. Upsert ReportCard record
  const existing = await base44.entities.ReportCard.filter({ student_id: student.id, term, session });

  const reportCardData = {
    student_id: student.id,
    student_name: `${student.first_name} ${student.last_name}`,
    admission_number: student.admission_number,
    class: student.current_class,
    section: student.section,
    term,
    session,
    subjects_data,
    total_score: totalScore,
    average,
    overall_grade: overallGrade,
    position: results[0]?.class_position || rankings?.classPosition || 0,
    total_students: results[0]?.total_in_class || 0,
    credits_count: creditsCount,
    fails_count: failsCount,
    a_grade_count: aGradeCount,
    class_teacher_comment: results[0]?.class_teacher_comment || results[0]?.teacher_comment || '',
    head_teacher_comment: results[0]?.head_teacher_comment || '',
    principal_comment: results[0]?.principal_comment || '',
    next_term_begins: results[0]?.next_term_begins || '',
    status: 'Published',
    generated_by: 'auto',
    pdf_url: file_url,
  };

  if (existing[0]) {
    await base44.entities.ReportCard.update(existing[0].id, reportCardData);
  } else {
    await base44.entities.ReportCard.create(reportCardData);
  }

  return file_url;
}