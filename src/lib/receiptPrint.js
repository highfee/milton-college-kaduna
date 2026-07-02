// Generates a printable receipt HTML from stored payment data and opens print dialog
export function printReceiptFromPayment(payment, settings) {
  const dateStr = payment.payment_date
    ? new Date(payment.payment_date).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });

  const items = payment.items || [];
  const totalPaid = payment.amount_paid || 0;
  const balance = payment.balance || 0;

  const itemsRows = items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 2px 4px;">${item.item_name || ''}</td>
      <td style="padding: 2px 4px; text-align: right;">${(item.amount || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const receiptHtml = `
    <div style="width: 80mm; background: white; padding: 8px; font-family: Arial, sans-serif; font-size: 10px; color: #000;">
      <div style="text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 6px;">
        ${settings?.school_logo ? `<img src="${settings.school_logo}" alt="logo" style="width:40px;height:40px;object-fit:contain;margin:0 auto 4px;display:block;" />` : ''}
        <div style="font-weight: bold; font-size: 11px; color: #1e3a5f;">${settings?.school_name || 'MILTON COLLEGE OF ARTS AND SCIENCE'}</div>
        <div style="font-size: 8px; color: #555;">${settings?.address || 'Kaduna, Nigeria'}</div>
        <div style="font-size: 8px; color: #555;">Tel: ${settings?.phone || ''} | Email: ${settings?.email || ''}</div>
        <div style="margin-top: 4px; font-weight: bold; font-size: 10px; color: #1e3a5f; border-top: 1px dashed #ccc; padding-top: 4px;">OFFICIAL SCHOOL FEE RECEIPT</div>
      </div>
      <div style="margin-bottom: 6px; font-size: 9px;">
        <div style="display: flex; justify-content: space-between;">
          <span><b>Receipt No:</b> ${payment.receipt_number || ''}</span>
          <span><b>Date:</b> ${dateStr}</span>
        </div>
      </div>
      <div style="border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 4px 0; margin-bottom: 6px; font-size: 9px;">
        <div><b>Received From:</b> ${payment.parent_name || payment.student_name}</div>
        <div><b>Student Name:</b> ${payment.student_name}</div>
        ${payment.admission_number ? `<div><b>Admission No:</b> ${payment.admission_number}</div>` : ''}
        <div style="display: flex; justify-content: space-between;">
          <span><b>Class:</b> ${payment.class || ''}</span>
          <span><b>Term:</b> ${payment.term || ''}</span>
        </div>
        <div><b>Session:</b> ${payment.session || ''}</div>
        <div><b>Method:</b> ${payment.payment_method || ''}</div>
        ${payment.recorded_by ? `<div><b>Recorded By:</b> ${payment.recorded_by}</div>` : ''}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 6px;">
        <thead>
          <tr style="background-color: #1e3a5f; color: white;">
            <th style="padding: 3px 4px; text-align: left;">Item</th>
            <th style="padding: 3px 4px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
        <tfoot>
          <tr style="background-color: #f0f4ff; font-weight: bold;">
            <td style="padding: 3px 4px;">TOTAL AMOUNT PAID</td>
            <td style="padding: 3px 4px; text-align: right;">${totalPaid.toLocaleString()}</td>
          </tr>
          ${balance > 0 ? `<tr><td style="padding: 2px 4px; color: red;">Balance Outstanding</td><td style="padding: 2px 4px; text-align: right; color: red;">${balance.toLocaleString()}</td></tr>` : ''}
        </tfoot>
      </table>
      <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 8px;">
        <div style="text-align: center;">
          <div style="border-top: 1px solid #000; padding-top: 2px; width: 60px;">Cashier</div>
        </div>
        <div style="text-align: center;">
          <div style="border-top: 1px solid #000; padding-top: 2px; width: 60px;">Accountant</div>
        </div>
      </div>
      <div style="margin-top: 8px; border-top: 2px solid #1e3a5f; padding-top: 4px; text-align: center; font-size: 7px; color: #1e3a5f;">
        <div><b>${settings?.school_name || 'Milton College of Arts and Science'}</b></div>
        <div>${dateStr}</div>
        <div style="margin-top: 2px; font-style: italic;">Thank you for your payment!</div>
      </div>
    </div>
  `;

  const printWin = window.open('', '_blank', 'width=400,height=600');
  printWin.document.write(`
    <html>
    <head>
      <title>Receipt ${payment.receipt_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; }
        @media print { @page { margin: 0; } }
      </style>
    </head>
    <body>${receiptHtml}</body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); }, 300);
}