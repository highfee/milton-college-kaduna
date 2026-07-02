import { jsPDF } from 'jspdf';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 8;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function generateAdmissionLetterPDF(data) {
  const {
    candidateName = '',
    admissionNumber = '',
    address = '',
    section = '',
    classAdmitted = '',
    tuitionFee = '',
    resumptionDate = '',
    date = new Date().toISOString().split('T')[0],
    schoolLogo = null
  } = data;

  const doc = new jsPDF('p', 'mm', 'a4');

  // === Red border ===
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(5, 5, PAGE_W - 10, PAGE_H - 10);

  let y = 14;

  // === Top-left address ===
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('P. O. Box 1558, Kaduna.', MARGIN, y);

  // === Top-right address ===
  const rightAddr = 'Milton College Road, Opp. Refinery';
  const rightAddr2 = 'Junction, Mahuta, Kaduna.';
  doc.text(rightAddr, PAGE_W - MARGIN, y, { align: 'right' });
  doc.text(rightAddr2, PAGE_W - MARGIN, y + 4, { align: 'right' });

  y += 14;

  // === School name (center, bold, dark red) ===
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(178, 34, 34); // #B22222
  doc.text('MILTON COLLEGE OF ARTS AND SCIENCE', PAGE_W / 2, y, { align: 'center' });

  y += 6;
  // === Sub-header (blue) ===
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 255); // #0000FF
  doc.text('(DAY AND BOARDING)', PAGE_W / 2, y, { align: 'center' });

  y += 10;

  // === Logo / circular emblem ===
  const emblemX = PAGE_W / 2;
  const emblemY = y + 12;
  const emblemR = 14;

  if (schoolLogo) {
    try {
      doc.addImage(schoolLogo, 'JPEG', emblemX - emblemR, emblemY - emblemR, emblemR * 2, emblemR * 2);
    } catch (e) {
      drawEmblem(doc, emblemX, emblemY, emblemR);
    }
  } else {
    drawEmblem(doc, emblemX, emblemY, emblemR);
  }

  y = emblemY + emblemR + 4;

  // === Motto ribbon ===
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Motto: Excellence All Over', PAGE_W / 2, y, { align: 'center' });

  y += 6;

  // === Date line (right-aligned) ===
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${date}`, PAGE_W - MARGIN, y, { align: 'right' });

  y += 10;

  // === Form fields ===
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  doc.text('Name of Candidate:', MARGIN, y);
  doc.text(candidateName, MARGIN + 38, y);
  drawDashedLine(doc, MARGIN + 38, y + 1, PAGE_W - MARGIN);
  y += 7;

  doc.text("Candidate's Exam No:", MARGIN, y);
  doc.text(admissionNumber, MARGIN + 38, y);
  drawDashedLine(doc, MARGIN + 38, y + 1, PAGE_W - MARGIN);
  y += 7;

  doc.text('Address:', MARGIN, y);
  const addrLines = doc.splitTextToSize(address || '', CONTENT_W - 38);
  if (addrLines.length === 1) {
    doc.text(addrLines[0], MARGIN + 38, y);
    drawDashedLine(doc, MARGIN + 38, y + 1, PAGE_W - MARGIN);
    y += 7;
  } else {
    addrLines.slice(0, 2).forEach((line, i) => {
      doc.text(line, MARGIN + 38, y + i * 5);
      drawDashedLine(doc, MARGIN + 38, y + i * 5 + 1, PAGE_W - MARGIN);
    });
    y += 7 + (addrLines.length > 1 ? 5 : 0);
  }

  y += 6;

  // === Heading ===
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const heading = `ADMISSION INTO ${section ? section.toUpperCase() : '________________'}`;
  doc.text(heading, PAGE_W / 2, y, { align: 'center' });
  // Underline
  const headingW = doc.getTextWidth(heading);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(PAGE_W / 2 - headingW / 2, y + 1.5, PAGE_W / 2 + headingW / 2, y + 1.5);

  y += 10;

  // === Opening text ===
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const openingText = `I am pleased to inform you that as a result of your performance following the placement Examination and interview into Milton College of Arts and Science, you have been offered provisional admission into ${classAdmitted || '____________________'}.`;
  const openingLines = doc.splitTextToSize(openingText, CONTENT_W);
  doc.text(openingLines, MARGIN, y);
  y += openingLines.length * 5 + 3;

  // === Call to action ===
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  const ctaLines = doc.splitTextToSize('You are required to report for registration immediately.', CONTENT_W);
  doc.text(ctaLines, MARGIN, y);
  y += ctaLines.length * 5 + 4;

  // === Requirements list ===
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Please come along with the following documents/requirements:', MARGIN, y);
  y += 6;

  doc.setFont('times', 'normal');
  const requirements = [
    '(a)  Your common Entrance Result Score Sheet, Last Terminal Result, or Testimonial.',
    '(b)  Two (2) recent passport photographs.',
    '(c)  Two (2) File Jackets.',
    '(d)  Certificate of medical fitness from a recognized Hospital.',
    `(e)  Tuition Fee \u20A6 ${tuitionFee || '________________'}`,
    '(f)  Completed original copy of the Acceptance form.',
    '(g)  Other requirement as per attached list.'
  ];
  requirements.forEach(req => {
    const reqLines = doc.splitTextToSize(req, CONTENT_W - 4);
    doc.text(reqLines, MARGIN + 2, y);
    y += reqLines.length * 5 + 1;
  });

  y += 4;

  // === Closing ===
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const closingText = 'I congratulate you on your admission to this reputable institution and I look forward to welcome you.';
  const closingLines = doc.splitTextToSize(closingText, CONTENT_W);
  doc.text(closingLines, MARGIN, y);
  y += closingLines.length * 5 + 5;

  // === Resumption date ===
  doc.text(`Resumption Date is ${resumptionDate || '_____________________________________________________________________'}`, MARGIN, y);
  y += 10;

  // === Sign-off ===
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('MANAGEMENT', MARGIN, y);

  return doc;
}

function drawDashedLine(doc, x1, y, x2) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}

function drawEmblem(doc, cx, cy, r) {
  // Outer circle
  doc.setDrawColor(178, 34, 34);
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, r, 'S');

  // Inner circle
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, r - 1.5, 'S');

  // Open book (simple rectangle with center line)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(cx - 5, cy - 1, 10, 5, 'S');
  doc.line(cx, cy - 1, cx, cy + 4);

  // Torch (simple shape above book)
  doc.setFillColor(255, 215, 0);
  doc.rect(cx - 1.5, cy - 7, 3, 4, 'F');
  // Flame
  doc.setFillColor(255, 140, 0);
  doc.triangle(cx - 2, cy - 7, cx + 2, cy - 7, cx, cy - 10, 'F');

  // Text around emblem
  doc.setFont('times', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(178, 34, 34);
  doc.text('MILTON COLLEGE OF ARTS AND SCIENCE', cx, cy + r - 2, { align: 'center' });
  doc.text('KADUNA', cx, cy + r + 1, { align: 'center' });
}