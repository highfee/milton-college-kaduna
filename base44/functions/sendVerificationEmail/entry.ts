import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.16';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return Response.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a5f;">Email Verification Code</h2>
        <p>Your email verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #1e3a5f; background: #f0f4f8; padding: 15px; text-align: center; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">${code}</div>
        <p>Enter this code on the admission form to verify your email and proceed with your application.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Milton College of Arts and Science, Kaduna</p>
      </div>`;
    const textBody = `Your email verification code is: ${code}

Enter this code on the admission form to verify your email and proceed with your application.

Milton College of Arts and Science, Kaduna`;
    const subject = 'Email Verification Code — Milton College Admission';

    // ===== APPROACH 1: Resend with verified domain (best deliverability) =====
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      // Check if user has any verified domains
      const domainsRes = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${resendKey}` }
      });
      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        const domains = domainsData.data || domainsData;
        const verified = Array.isArray(domains) ? domains.find(d => d.status === 'verified') : null;
        if (verified) {
          const fromDomain = verified.name;
          const sendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `Milton College <noreply@${fromDomain}>`,
              to: [email],
              subject,
              text: textBody,
              html: htmlBody
            })
          });
          if (sendRes.ok) {
            return Response.json({ success: true, message: 'Verification email sent via Resend', method: 'resend' });
          }
        }
      }
    }

    // ===== APPROACH 2: Gmail SMTP (works for all providers, may go to spam) =====
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    if (gmailUser && gmailPassword) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: gmailUser, pass: gmailPassword }
        });
        await transporter.sendMail({
          from: `Milton College <${gmailUser}>`,
          to: email,
          subject,
          text: textBody,
          html: htmlBody
        });
        return Response.json({ success: true, message: 'Verification email sent via Gmail', method: 'gmail' });
      } catch (gmailError) {
        // Gmail failed — continue to error response
      }
    }

    return Response.json({
      error: 'Email service not properly configured. Admin needs to either: (1) verify a domain in Resend, or (2) set a valid Gmail App Password.'
    }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});