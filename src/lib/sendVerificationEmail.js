import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from './emailConfig';

/**
 * Sends a verification code email to any email address (registered or not).
 * Uses EmailJS — runs entirely client-side, no backend or API keys needed.
 *
 * @param {string} email - recipient email
 * @param {string} code - 6-digit verification code
 */
export async function sendVerificationEmail(email, code) {
  await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    {
      to_email: email,
      subject: 'Email Verification Code — Milton College Admission',
      message: `Your email verification code is: ${code}

Enter this code on the admission form to verify your email and proceed with your application.

Milton College of Arts and Science, Kaduna`
    },
    EMAILJS_CONFIG.publicKey
  );
}