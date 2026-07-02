import { jsPDF } from 'jspPDF';

export function generateTransactionReportPDF(payments, { periodLabel, dateFrom, dateTo } = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const M = 12;
  const CW = 210 - M * 2;
  let y = 16;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(178, 34, 34);
  doc.text('MILTON COLLEGE OF ARTS AND SCIENCE', 105, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('TRANSACTION HISTORY REPORT', 105, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Period: ${periodLabel || 'All'}`, M, y);
  if (dateFrom && dateTo) {
    doc.text(`${dateFrom} to ${dateTo}`, 210 - M, y, { align: 'right' });
  } else {
    doc.text(`Generated: ${new Date().toLocaleString()}`, 210 - M, y, { align: 'right' });
  }
  y += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(M, y, 210 - M, y);
  y += 6;

  // Summary
  const totalAmount = payments.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const totalBalance = payments.reduce((s, p) => s + (p.balance || 0), 0);
  const paidCount = payments.filter(p => p.status === 'Paid').length;
  const partialCount = payments.filter(p => p.status === 'Partial').length;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Transactions: ${payments.length}`, M, y);
  doc.text(`Total Collected: \u20A6${totalAmount.toLocaleString()}`, M + 60, y);
  y += 4;
  doc.text(`Paid (Full): ${paidCount}`, M, y);
  doc.text(`Partial: ${partialCount}`, M + 60, y);
  doc.text(`Outstanding Balance: \u20A6${totalBalance.toLocaleString()}`, M + 100, y);
  y += 6;

  doc.line(M, y, 210 - M, y);
  y += 5;

  // Table header
  const cols = [
    { header: 'Receipt #', w: 22 },
    { header: 'Student Name', w: 45 },
    { header: 'Class', w: 22 },
    { header: 'Term', w: 20 },
    { header: 'Method', w: 18 },
    { header: 'Amount', w: 22 },
    { header: 'Date', w: 19 }
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setFillColor(30, 58, 95);
  doc.rect(M, y - 3, CW, 5, 'F');
  doc.setTextColor(255, 255, 255);
  let cx = M;
  cols.forEach(c => {
    doc.text(c.header, cx + 1, y, { maxWidth: c.w - 1 });
    cx += c.w;
  });
  doc.setTextColor(0, 0, 0);
  y += 5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  let alt = false;
  payments.forEach((p, idx) => {
    if (y > 280) {
      doc.addPage();
      y = 16;
    }

    if (alt) {
      doc.setFillColor(245, 247, 250);
      doc.rect(M, y - 3, CW, 4, 'F');
    }
    alt = !alt;

    cx = M;
    const rowData = [
      p.receipt_number || '',
      `${(p.student_name || '').substring(0, 25)}`,
      (p.class || '').substring(0, 12),
      (p.term || '').substring(0, 11),
      p.payment_method || '',
      `\u20A6${(p.amount_paid || 0).toLocaleString()}`,
      p.payment_date || ''
    ];
    rowData.forEach((val, i) => {
      doc.text(String(val), cx + 1, y, { maxWidth: cols[i].w - 1 });
      cx += cols[i].w;
    });
    y += 4;
  });

  // Total row
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(M, y, 210 - M, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('GRAND TOTAL:', M, y);
  doc.text(`\u20A6${totalAmount.toLocaleString()}`, M + 130, y);

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('This report was generated electronically by the Milton College Accountant Portal.', 105, 290, { align: 'center' });

  return doc;
}