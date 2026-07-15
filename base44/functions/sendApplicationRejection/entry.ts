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

    const message = `Dear ${app.parent_name},

We regret to inform you that the application for ${applicantName} (Ref: ${app.application_number}) has not been successful at this time.

If you have any questions, please contact our admissions office.

Warm regards,
Milton College of Arts and Science, Kaduna`;

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: getEmailJSBody({
        to_email: app.parent_email,
        subject: `Admission Application Update — ${app.application_number}`,
        message: message
      })
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      return Response.json({ error: `EmailJS error: ${errText}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Rejection email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});