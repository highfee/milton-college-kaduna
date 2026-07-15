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

    // Construct accept/reject links pointing to handleAdmissionResponse function
    const reqUrl = new URL(req.url);
    const responseUrl = `${reqUrl.origin}${reqUrl.pathname.replace('/sendAdmissionOfferEmail', '/handleAdmissionResponse')}`;
    const acceptLink = `${responseUrl}?app=${application_id}&action=accept`;
    const rejectLink = `${responseUrl}?app=${application_id}&action=reject`;

    const tuitionLine = app.tuition_fee ? `Tuition Fee: N${Number(app.tuition_fee).toLocaleString()}\n` : '';
    const resumeLine = app.resumption_date ? `Resumption Date: ${app.resumption_date}\n` : '';

    const message = `Dear ${app.parent_name},

CONGRATULATIONS!

We are pleased to inform you that ${applicantName} has been offered provisional admission into ${app.section_applying} section, Class: ${app.final_class_admitted || app.class_applying} at Milton College of Arts and Science, Kaduna.

Admission Number: ${app.admission_number_generated || 'To be assigned'}
${tuitionLine}${resumeLine}
To proceed, please choose one of the options below:

ACCEPT ADMISSION:
${acceptLink}

REJECT ADMISSION:
${rejectLink}

If you accept, an acceptance letter (PDF) will be sent to your email immediately. Please print the acceptance letter and bring it to the school.

This offer is valid for 14 days. If you do not respond within this period, the offer may be withdrawn.

For enquiries, please contact the school.

Warm regards,
Admissions Office
Milton College of Arts and Science, Kaduna`;

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: getEmailJSBody({
        to_email: app.parent_email,
        subject: `Admission Offer — ${applicantName} | Milton College`,
        message: message
      })
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      return Response.json({ error: `EmailJS error: ${errText}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Admission offer email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});