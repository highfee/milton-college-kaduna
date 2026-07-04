import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from './emailConfig';

/**
 * Sends a verification code email to any email address (registered or not).
 * Uses EmailJS — works entirely from the browser, no backend needed.
 *
 * @param {string} email - recipient email
 * @param {string} code - 6-digit verification code
 */
export async function sendVerificationEmail(email, code) {
  const { serviceId, templateId, publicKey } = EMAILJS_CONFIG;

  if (!serviceId || serviceId === 'YOUR_SERVICE_ID') {
    throw new Error('Email service is not configured yet. Please contact the school admin.');
  }

  await emailjs.send(serviceId, templateId, {
    to_email: email,
    subject: 'Email Verification Code — Milton College Admission',
    message: `Your email verification code is: ${code}

Enter this code on the admission form to verify your email and proceed with your application.

Milton College of Arts and Science, Kaduna`,
  }, publicKey);
}