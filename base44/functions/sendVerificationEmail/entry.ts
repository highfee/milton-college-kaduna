import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.16';

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

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      return Response.json({ error: 'Email service is not configured yet. Please contact the school admin.' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    await transporter.sendMail({
      from: `Milton College <${gmailUser}>`,
      to: email,
      subject: 'Email Verification Code — Milton College Admission',
      text: `Your email verification code is: ${code}

Enter this code on the admission form to verify your email and proceed with your application.

Milton College of Arts and Science, Kaduna`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a5f;">Email Verification Code</h2>
        <p>Your email verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #1e3a5f; background: #f0f4f8; padding: 15px; text-align: center; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">${code}</div>
        <p>Enter this code on the admission form to verify your email and proceed with your application.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Milton College of Arts and Science, Kaduna</p>
      </div>`
    });

    return Response.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});