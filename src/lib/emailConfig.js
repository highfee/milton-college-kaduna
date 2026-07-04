// EmailJS Configuration
//
// SETUP INSTRUCTIONS (one-time, ~5 minutes):
// 1. Create a FREE account at https://www.emailjs.com
// 2. Go to "Email Services" → Add a service (Gmail, Outlook, etc.) → copy the Service ID
// 3. Go to "Email Templates" → Create a template with these variables in the body:
//      To Email: {{to_email}}
//      Subject: {{subject}}
//      Content: {{message}}
//    Copy the Template ID
// 4. Go to "Account" → "API Keys" → copy your Public Key
// 5. Paste all three values below (replace the YOUR_... placeholders)

export const EMAILJS_CONFIG = {
  serviceId: 'YOUR_SERVICE_ID',
  templateId: 'YOUR_TEMPLATE_ID',
  publicKey: 'YOUR_PUBLIC_KEY',
};