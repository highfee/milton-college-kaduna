import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return Response.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'Email service is not configured yet. Please contact the school admin.' }, { status: 500 });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Milton College <onboarding@resend.dev>',
        to: [email],
        subject: 'Email Verification Code — Milton College Admission',
        text: `Your email verification code is: ${code}

Enter this code on the admission form to verify your email and proceed with your application.

Milton College of Arts and Science, Kaduna`
      })
    });

    if (!resendResponse.ok) {
      const errData = await resendResponse.text();
      return Response.json({ error: `Failed to send email: ${errData}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});