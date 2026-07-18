import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.16';

Deno.serve(async (req) => {
  const results = {};

  // 1. Check Resend domains
  const resendKey = Deno.env.get("RESEND_API_KEY");
  results.resendKeySet = !!resendKey;
  if (resendKey) {
    try {
      const domainsRes = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${resendKey}` }
      });
      results.resendDomainsStatus = domainsRes.status;
      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        const domains = domainsData.data || domainsData;
        results.domains = Array.isArray(domains) ? domains.map(d => ({ name: d.name, status: d.status })) : [];
      } else {
        results.resendDomainsError = await domainsRes.text();
      }
    } catch (e) {
      results.resendError = e.message;
    }
  }

  // 2. Check Gmail SMTP
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  results.gmailUserSet = !!gmailUser;
  results.gmailPasswordSet = !!gmailPassword;
  results.gmailUserValue = gmailUser || '(not set)';
  if (gmailUser && gmailPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPassword }
      });
      await transporter.verify();
      results.gmailSMTP = 'OK - connection verified';
    } catch (e) {
      results.gmailSMTP = 'FAILED: ' + e.message;
    }
  }

  return Response.json(results);
});