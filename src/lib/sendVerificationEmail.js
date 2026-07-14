import { base44 } from '@/api/base44Client';

/**
 * Sends a verification code email to any email address (registered or not).
 * Uses the Base44 SendEmail integration via a backend function — no external setup needed.
 *
 * @param {string} email - recipient email
 * @param {string} code - 6-digit verification code
 */
export async function sendVerificationEmail(email, code) {
  const response = await base44.functions.invoke('sendVerificationEmail', { email, code });
  if (response.data?.error) {
    throw new Error(response.data.error);
  }
}