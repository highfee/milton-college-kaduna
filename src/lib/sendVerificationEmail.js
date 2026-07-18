import { base44 } from '@/api/base44Client';

/**
 * Sends a verification code email to ANY email address (Outlook, Yahoo, iCloud,
 * AOL, Gmail, etc.) via the Resend backend function.
 *
 * Resend has proper SPF/DKIM/DMARC configuration, ensuring reliable delivery
 * across all email providers — unlike client-side EmailJS which depends on a
 * Gmail SMTP service with poor deliverability to non-Gmail inboxes.
 *
 * @param {string} email - recipient email
 * @param {string} code - 6-digit verification code
 */
export async function sendVerificationEmail(email, code) {
  const response = await base44.functions.invoke('sendVerificationEmail', { email, code });
  if (response.data?.error) {
    throw new Error(response.data.error);
  }
  return response.data;
}