import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Same EmailJS credentials as src/lib/emailConfig.js — update both if config changes
const EMAILJS_SERVICE_ID = 'service_6sssd2s';
const EMAILJS_TEMPLATE_ID = 'template_jrrxz2o';
const EMAILJS_PUBLIC_KEY = 'lIf1A2oKN5LRjDPfK';

function getEmailJSBody(params) {
  return JSON.stringify({
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    accessToken: Deno.env.get('EMAILJS_PRIVATE_KEY'),
    template_params: params
  });
}

Deno.serve(async (req) => {
  try {
    const reqUrl = new URL(req.url);
    let appId, action;

    if (req.method === 'GET') {
      appId = reqUrl.searchParams.get('app');
      action = reqUrl.searchParams.get('action');
    } else {
      const body = await req.json();
      appId = body.app || body.application_id;
      action = body.action;
    }

    if (!appId || !action) {
      return htmlResponse(generateHTML('Error', 'Invalid request. Please use the links from your admission offer email.'));
    }

    const base44 = createClientFromRequest(req);
    const app = await base44.asServiceRole.entities.AdmissionApplication.get(appId);

    if (!app) {
      return htmlResponse(generateHTML('Error', 'Application not found. Please contact the school.'));
    }

    const applicantName = `${app.first_name} ${app.last_name}`.trim();

    // --- REJECT ---
    if (action === 'reject') {
      if (app.status !== 'Offered Admission') {
        return htmlResponse(generateHTML('Already Processed', `This application has already been processed (status: ${app.status}). If you believe this is an error, please contact the school.`));
      }
      await base44.asServiceRole.entities.AdmissionApplication.update(appId, { status: 'Rejected' });
      return htmlResponse(generateHTML('Admission Declined', `You have declined the admission offer for ${applicantName}. If you change your mind, please contact the school admissions office.`));
    }

    // --- DOWNLOAD PDF ---
    if (action === 'download') {
      if (app.status !== 'Accepted') {
        return htmlResponse(generateHTML('Error', 'Acceptance letter is only available after accepting the admission offer.'));
      }
      const pdfBytes = generateAcceptanceLetterPDFBytes({
        candidateName: applicantName,
        admissionNumber: app.admission_number_generated || '',
        classAdmitted: app.final_class_admitted || app.class_applying || '',
        section: app.section_applying || '',
        parentName: app.parent_name || '',
        date: new Date().toISOString().split('T')[0]
      });
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="acceptance-letter-${app.application_number || appId}.pdf"`
        }
      });
    }

    // --- ACCEPT ---
    if (action === 'accept') {
      if (app.status !== 'Offered Admission') {
        return htmlResponse(generateHTML('Already Processed', `This application has already been processed (status: ${app.status}). If you believe this is an error, please contact the school.`));
      }

      await base44.asServiceRole.entities.AdmissionApplication.update(appId, { status: 'Accepted' });

      const downloadLink = `${reqUrl.origin}${reqUrl.pathname}?app=${appId}&action=download`;

      // Send acceptance letter email with download link
      const emailMessage = `Dear ${app.parent_name},

Your admission acceptance has been confirmed!

${applicantName} has been officially accepted into ${app.section_applying} section, Class: ${app.final_class_admitted || app.class_applying} at Milton College of Arts and Science, Kaduna.

Admission Number: ${app.admission_number_generated || 'To be assigned'}

Your Acceptance Letter (PDF) is available for download at:
${downloadLink}

IMPORTANT INSTRUCTIONS:
1. Download and print the acceptance letter.
2. Bring the printed copy to the school on or before the resumption date.
${app.resumption_date ? `3. Resumption Date: ${app.resumption_date}` : ''}
${app.tuition_fee ? `4. Tuition Fee: N${Number(app.tuition_fee).toLocaleString()}` : ''}

We look forward to welcoming ${applicantName} to Milton College!

Warm regards,
Admissions Office
Milton College of Arts and Science, Kaduna`;

      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: getEmailJSBody({
            to_email: app.parent_email,
            subject: `Acceptance Letter — ${applicantName} | Milton College`,
            message: emailMessage
          })
        });
      } catch (emailErr) {
        // Email failed but acceptance is confirmed — still show download button
        console.error('Email send failed:', emailErr);
      }

      return htmlResponse(generateAcceptHTML(applicantName, downloadLink));
    }

    return htmlResponse(generateHTML('Error', 'Unknown action. Please use the links from your admission offer email.'));
  } catch (error) {
    return htmlResponse(generateHTML('Error', error.message));
  }
});

function htmlResponse(html) {
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function generateHTML(title, message) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — Milton College</title><style>body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:20px}.container{max-width:500px;margin:40px auto;background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}h1{color:#1e3a5f}p{color:#555;line-height:1.6}</style></head><body><div class="container"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

function generateAcceptHTML(applicantName, downloadLink) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admission Accepted — Milton College</title><style>body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:20px}.container{max-width:500px;margin:40px auto;background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}.check{width:80px;height:80px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:40px}h1{color:#1e3a5f}p{color:#555;line-height:1.6}.btn{display:inline-block;padding:14px 36px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;margin-top:20px;font-weight:700}.note{background:#fef3c7;padding:12px;border-radius:8px;margin-top:16px;font-size:14px;color:#92400e}</style></head><body><div class="container"><div class="check">\u2705</div><h1>Admission Accepted!</h1><p>Congratulations! ${applicantName}'s admission has been accepted successfully.</p><p>A copy of the acceptance letter has been sent to your email.</p><a href="${downloadLink}" class="btn">Download Acceptance Letter (PDF)</a><div class="note">Please print the acceptance letter and bring it to the school on resumption.</div></div></body></html>`;
}

function generateAcceptanceLetterPDFBytes(data) {
  const { candidateName, admissionNumber, classAdmitted, section, parentName, date } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const M = 15;
  const CW = 210 - M * 2;
  let y = 18;

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
  y += 10;

  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text('ACCEPTANCE OF ADMISSION', 105, y, { align: 'center' });
  y += 4;
  const tw = doc.getTextWidth('ACCEPTANCE OF ADMISSION');
  doc.line(105 - tw / 2, y, 105 + tw / 2, y);
  y += 10;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 210 - M, y, { align: 'right' });
  y += 8;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const body1 = `I, ${parentName || '___________________'}, parent/guardian of ${candidateName || '___________________'}, hereby formally accept the offer of provisional admission into ${section || '_____'} section, Class: ${classAdmitted || '___________'} at Milton College of Arts and Science, Kaduna.`;
  y = addWrappedText(doc, body1, M, y, CW, 5);
  y += 3;

  const body2 = `Admission Number: ${admissionNumber || '___________________'} was assigned to the candidate.`;
  y = addWrappedText(doc, body2, M, y, CW, 5);
  y += 5;

  y = addWrappedText(doc, 'I confirm that:', M, y, CW, 5);
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

  return doc.output('arraybuffer');
}

function addWrappedText(doc, text, x, y, maxWidth, lineH) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}