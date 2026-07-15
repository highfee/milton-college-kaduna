import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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
    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return Response.json({ error: 'application_id is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const app = await base44.asServiceRole.entities.AdmissionApplication.get(application_id);

    if (!app || !app.parent_email) {
      return Response.json({ error: 'Application not found or no parent email' }, { status: 404 });
    }

    const applicantName = `${app.first_name} ${app.last_name}`.trim();
    const admissionNumber = app.admission_number_generated || 'To be assigned';
    const classAdmitted = app.final_class_admitted || app.class_applying || '';
    const pdfLine = app.admission_letter_pdf_url
      ? `Your official Admission Letter (PDF) is available at:\n${app.admission_letter_pdf_url}`
      : 'Please contact the school for your admission letter.';

    const message = `Dear ${app.parent_name},

CONGRATULATIONS! ${applicantName} has been officially admitted into Milton College of Arts and Science, Kaduna.

ADMISSION DETAILS:
Admission Number: ${admissionNumber}
Full Name: ${applicantName}
Class Admitted: ${classAdmitted}
Section: ${app.section_applying || ''}
Admission Date: ${app.application_date || new Date().toISOString().split('T')[0]}
${app.tuition_fee ? `Tuition Fee: \u20A6${Number(app.tuition_fee).toLocaleString()}\n` : ''}${app.resumption_date ? `Resumption Date: ${app.resumption_date}\n` : ''}

${pdfLine}

Please download and print the admission letter. Bring it along when reporting for registration.

Warm regards,
The Principal
Milton College of Arts and Science, Kaduna`;

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: getEmailJSBody({
        to_email: app.parent_email,
        subject: `ADMISSION LETTER — ${applicantName} | Adm. No: ${admissionNumber}`,
        message: message
      })
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      return Response.json({ error: `EmailJS error: ${errText}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Admission letter email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});