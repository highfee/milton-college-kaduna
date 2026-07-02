import { jsPDF } from 'jspdf';

export function generateApplicationFormPDF(data) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const M = 15;
  const CW = 210 - M * 2;
  let y = 18;

  // === Header ===
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(5, 5, 200, 287);

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
  y += 8;

  // === Title ===
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('ADMISSION APPLICATION FORM', 105, y, { align: 'center' });
  y += 4;
  const tw = doc.getTextWidth('ADMISSION APPLICATION FORM');
  doc.line(105 - tw / 2, y, 105 + tw / 2, y);
  y += 8;

  // === Application details ===
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Application Number: ${data.application_number || ''}`, M, y);
  doc.text(`Date: ${data.application_date || ''}`, 210 - M, y, { align: 'right' });
  y += 6;
  doc.text(`Status: ${data.status || 'Pending'}`, M, y);
  y += 8;

  // === Section: Personal Information ===
  y = addSectionHeader(doc, 'PERSONAL INFORMATION', M, y, CW);
  y = addField(doc, 'First Name:', data.first_name, 'Middle Name:', data.middle_name, M, y, CW);
  y = addField(doc, 'Last Name:', data.last_name, 'Gender:', data.gender, M, y, CW);
  y = addField(doc, 'Date of Birth:', data.date_of_birth, '', '', M, y, CW);

  // Passport photo
  if (data.passport_photo) {
    try { doc.addImage(data.passport_photo, 'JPEG', 210 - M - 25, y - 18, 25, 30); } catch (e) {}
  }

  y += 6;

  // === Section: Educational Information ===
  y = addSectionHeader(doc, 'EDUCATIONAL INFORMATION', M, y, CW);
  y = addField(doc, 'Section Applying For:', data.section_applying, 'Class Applying For:', data.class_applying, M, y, CW);
  y = addField(doc, 'Former School:', data.former_school_name, 'Class in Former School:', data.former_school_class, M, y, CW);
  y += 4;

  // === Section: Location Information ===
  y = addSectionHeader(doc, 'LOCATION INFORMATION', M, y, CW);
  y = addField(doc, 'State of Origin:', data.state_of_origin, 'Local Government:', data.local_government, M, y, CW);
  y = addField(doc, 'Home Address:', data.address, '', '', M, y, CW, true);
  y += 4;

  // === Section: Parent/Guardian Information ===
  y = addSectionHeader(doc, 'PARENT/GUARDIAN INFORMATION', M, y, CW);
  y = addField(doc, 'Parent Name:', data.parent_name, 'Phone Number:', data.parent_phone, M, y, CW);
  y = addField(doc, 'Email Address:', data.parent_email, 'Occupation:', data.parent_occupation, M, y, CW);
  y = addField(doc, 'Emergency Contact:', data.emergency_contact, '', '', M, y, CW);
  y = addField(doc, 'Health Conditions:', data.health_conditions, '', '', M, y, CW, true);
  y += 8;

  // === Declaration ===
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  const decl = doc.splitTextToSize('I/We declare that the information provided above is true and correct to the best of my/our knowledge. I/We understand that providing false information may result in the cancellation of this application.', CW);
  doc.text(decl, M, y);
  y += decl.length * 4 + 8;

  // Signature lines
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.line(M, y, M + 60, y);
  doc.text('Parent/Guardian Signature', M, y + 5);
  doc.line(210 - M - 60, y, 210 - M, y);
  doc.text('Date', 210 - M - 60, y + 5);

  return doc;
}

function addSectionHeader(doc, title, M, y, CW) {
  doc.setFillColor(178, 34, 34);
  doc.rect(M, y, CW, 6, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title, M + 2, y + 4.5);
  y += 9;
  doc.setTextColor(0, 0, 0);
  return y;
}

function addField(doc, label1, value1, label2, value2, M, y, CW, wrap) {
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  const halfW = (CW - 4) / 2;

  if (wrap) {
    doc.setFont('times', 'bold');
    doc.text(label1, M, y);
    doc.setFont('times', 'normal');
    const valLines = doc.splitTextToSize(value1 || 'N/A', CW - doc.getTextWidth(label1) - 2);
    doc.text(valLines, M + doc.getTextWidth(label1) + 2, y);
    return y + valLines.length * 4 + 3;
  }

  doc.setFont('times', 'bold');
  doc.text(label1, M, y);
  doc.setFont('times', 'normal');
  doc.text(String(value1 || 'N/A'), M + doc.getTextWidth(label1) + 1, y);

  if (label2) {
    const x2 = M + halfW + 2;
    doc.setFont('times', 'bold');
    doc.text(label2, x2, y);
    doc.setFont('times', 'normal');
    doc.text(String(value2 || 'N/A'), x2 + doc.getTextWidth(label2) + 1, y);
  }

  return y + 6;
}