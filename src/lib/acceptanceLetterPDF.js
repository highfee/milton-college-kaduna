import { jsPDF } from 'jspdf';

export function generateAcceptanceLetterPDF(data) {
  const {
    candidateName = '',
    admissionNumber = '',
    classAdmitted = '',
    section = '',
    parentName = '',
    date = new Date().toISOString().split('T')[0]
  } = data;

  const doc = new jsPDF('p', 'mm', 'a4');
  const M = 15;
  const CW = 210 - M * 2;
  let y = 18;

  // Red border
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(5, 5, 200, 287);

  // Header
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(178, 34, 34);
  doc.text('MILTON COLLEGE OF ARTS AND SCIENCE', 105, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 255);
  doc.text('(DAY AND BOARDING)', 105, y, { align: 'center' });
  y += 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('P. O. Box 1558, Kaduna.', M, y);
  doc.text('Milton College Road, Opp. Refinery Junction, Mahuta, Kaduna.', 210 - M, y, { align: 'right' });

  y += 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(M, y, 210 - M, y);
  y += 10;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text('ACCEPTANCE OF ADMISSION', 105, y, { align: 'center' });
  y += 4;
  const tw = doc.getTextWidth('ACCEPTANCE OF ADMISSION');
  doc.line(105 - tw / 2, y, 105 + tw / 2, y);
  y += 10;

  // Date
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 210 - M, y, { align: 'right' });
  y += 8;

  // Body
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const body1 = `I, ${parentName || '_____________________'}, parent/guardian of ${candidateName || '_____________________'}, hereby formally accept the offer of provisional admission into ${section || '_____'} section, Class: ${classAdmitted || '___________'} at Milton College of Arts and Science, Kaduna.`;
  y = addWrappedText(doc, body1, M, y, CW, 5);
  y += 3;

  const body2 = `Admission Number: ${admissionNumber || '_____________________'} was assigned to the candidate.`;
  y = addWrappedText(doc, body2, M, y, CW, 5);
  y += 5;

  const body3 = 'I confirm that:';
  y = addWrappedText(doc, body3, M, y, CW, 5);
  y += 2;

  const confirmations = [
    '1.  All information provided in the application form is true and correct.',
    '2.  I have read and understood the school\u2019s rules and regulations.',
    '3.  I agree to pay all required fees as stipulated by the school.',
    '4.  I will ensure my child/ward adheres to the school\u2019s code of conduct.',
    '5.  I will provide all required documents and materials as requested.'
  ];
  confirmations.forEach(c => {
    y = addWrappedText(doc, c, M + 2, y, CW - 2, 5);
    y += 1;
  });

  y += 6;

  // Closing
  y = addWrappedText(doc, 'I look forward to a fruitful and rewarding academic journey for my child/ward at Milton College of Arts and Science, Kaduna.', M, y, CW, 5);
  y += 8;

  // Instructions box
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, CW, 38, 2, 2, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text('IMPORTANT — PRINT & BRING TO SCHOOL', M + 3, y + 6);
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  y += 10;
  const instrLines = [
    '1.  Print this acceptance letter and sign the Parent/Guardian section below.',
    '2.  Bring the signed printed copy to the school Admissions Office.',
    '3.  Present it on or before the resumption date along with all required documents.',
    '4.  Only signed printed letters will be accepted for registration.'
  ];
  instrLines.forEach(line => {
    y = addWrappedText(doc, line, M + 3, y, CW - 6, 4.5);
    y += 1.5;
  });

  y += 8;
  // Signatures
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 65, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('Parent/Guardian Signature', M, y + 5);
  doc.text(`Name: ${parentName || ''}`, M, y + 10);

  doc.line(210 - M - 65, y, 210 - M, y);
  doc.text('For: Management', 210 - M - 65, y + 5);
  doc.text('Milton College of Arts and Science', 210 - M - 65, y + 10);

  return doc;
}

function addWrappedText(doc, text, x, y, maxWidth, lineH) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}