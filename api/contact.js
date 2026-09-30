// Vercel serverless function: POST /api/contact
// Sends the enquiry to Coastline (and a "message received" email to the client
// if they gave an email address) from the Coastline Gmail account.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   GMAIL_APP_PASSWORD  required. A Google App Password for the Gmail account below.
//                       Without it this returns 503 and the site falls back to Formspree.
//   GMAIL_USER          optional. Default: coastlinewebdesignstudio@gmail.com
//   CONTACT_TO          optional. Where enquiries go. Default: the Gmail account above

const nodemailer = require('nodemailer');

const SITE = 'https://coastlinewebdesign.co.za';
const PHONE_DISPLAY = '066 253 1866';
const PHONE_INTL = '27662531866';

const C = {
  bg: '#111214',
  surface: '#18191d',
  surface2: '#1f2025',
  border: '#2a2b30',
  muted: '#7a7c86',
  body: '#a8aab4',
  heading: '#e8e9ec',
  accent: '#309eac',
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
};

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 082 123 4567 → 27821234567, +44 7700 900123 → 447700900123
function toIntl(phone) {
  const digits = phone.replace(/\D/g, '');
  if (!phone.trim().startsWith('+') && digits.length === 10 && digits.startsWith('0')) {
    return '27' + digits.slice(1);
  }
  return digits;
}

function validPhone(phone) {
  if (!/^\+?[\d\s()\-.]+$/.test(phone.trim())) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

function button(href, label, primary) {
  const style = primary
    ? `background:${C.accent};color:#ffffff;border:1px solid ${C.accent};`
    : `background:transparent;color:${C.heading};border:1px solid ${C.border};`;
  return `<a href="${href}" style="${style}display:inline-block;padding:12px 22px;border-radius:4px;` +
    `font-family:${C.sans};font-size:14px;font-weight:500;text-decoration:none;margin:0 8px 8px 0;">${label}</a>`;
}

function row(label, value) {
  if (!value) return '';
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-family:${C.sans};font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};width:130px;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-family:${C.sans};font-size:15px;color:${C.heading};vertical-align:top;">${value}</td>
  </tr>`;
}

function layout({ preheader, eyebrow, title, content }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 0 24px;text-align:center;">
        <a href="${SITE}" style="text-decoration:none;">
          <img src="${SITE}/images/logo.png" width="56" height="56" alt="" style="display:inline-block;border:0;border-radius:50%;">
          <div style="font-family:${C.serif};font-size:24px;font-weight:600;color:${C.heading};letter-spacing:.02em;margin-top:10px;">
            Coastline Web Design<span style="color:${C.accent};">.</span>
          </div>
        </a>
      </td></tr>
      <tr><td style="background:${C.surface};border:1px solid ${C.border};border-radius:4px;padding:36px 32px;">
        <div style="font-family:${C.sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${C.accent};margin-bottom:12px;">${esc(eyebrow)}</div>
        <h1 style="margin:0 0 20px;font-family:${C.serif};font-size:30px;line-height:1.2;font-weight:400;color:${C.heading};">${title}</h1>
        ${content}
      </td></tr>
      <tr><td style="padding:24px 8px 0;text-align:center;font-family:${C.sans};font-size:12px;line-height:1.7;color:${C.muted};">
        Coastline Web Design · Shelly Beach, KwaZulu-Natal<br>
        <a href="tel:+${PHONE_INTL}" style="color:${C.muted};text-decoration:none;">${PHONE_DISPLAY}</a> ·
        <a href="${SITE}" style="color:${C.muted};text-decoration:none;">coastlinewebdesign.co.za</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function ownerEmail(d) {
  const wa = `https://wa.me/${d.phoneIntl}?text=${encodeURIComponent(`Hi ${d.firstName}, thanks for contacting Coastline Web Design!`)}`;
  const content = `
    <p style="margin:0 0 24px;font-family:${C.sans};font-size:15px;line-height:1.7;color:${C.body};">
      ${esc(d.name)} sent a message through the website.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Name', esc(d.name))}
      ${row('Phone', `<a href="tel:+${d.phoneIntl}" style="color:${C.heading};text-decoration:none;">${esc(d.phone)}</a>`)}
      ${row('Email', d.email ? `<a href="mailto:${esc(d.email)}" style="color:${C.heading};text-decoration:none;">${esc(d.email)}</a>` : `<span style="color:${C.muted};">Not given</span>`)}
      ${row('Business', esc(d.business))}
      ${row('Type', esc(d.businessType))}
      ${row('Package', esc(d.package) || `<span style="color:${C.muted};">Not sure yet</span>`)}
    </table>
    <div style="background:${C.surface2};border-left:2px solid ${C.accent};padding:18px 20px;margin-bottom:28px;font-family:${C.sans};font-size:15px;line-height:1.7;color:${C.heading};white-space:pre-wrap;">${esc(d.message)}</div>
    ${button(wa, 'Reply on WhatsApp', true)}
    ${button(`tel:+${d.phoneIntl}`, 'Call', false)}
    ${d.email ? button(`mailto:${esc(d.email)}`, 'Email', false) : ''}`;
  return layout({
    preheader: `${d.name}: ${d.message.slice(0, 90)}`,
    eyebrow: 'New website enquiry',
    title: `Message from ${esc(d.name)}`,
    content
  });
}

function clientEmail(d) {
  const steps = [
    'We read your message',
    'We get back to you within 24 hours by WhatsApp or phone',
    'We answer your questions and talk through what you need',
    'You get a clear quote before anything starts'
  ];
  const content = `
    <p style="margin:0 0 16px;font-family:${C.sans};font-size:15px;line-height:1.7;color:${C.body};">
      Hi ${esc(d.firstName)},
    </p>
    <p style="margin:0 0 24px;font-family:${C.sans};font-size:15px;line-height:1.7;color:${C.body};">
      Thanks for getting in touch. We've received your message and will be in contact on
      <span style="color:${C.heading};">${esc(d.phone)}</span> within 24 hours.
    </p>
    <div style="font-family:${C.serif};font-size:20px;color:${C.heading};margin-bottom:12px;">What happens next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${steps.map((s, i) => `<tr>
        <td style="padding:6px 12px 6px 0;font-family:${C.sans};font-size:14px;color:${C.accent};width:18px;vertical-align:top;">${i + 1}</td>
        <td style="padding:6px 0;font-family:${C.sans};font-size:15px;line-height:1.6;color:${C.body};">${s}</td>
      </tr>`).join('')}
    </table>
    <div style="font-family:${C.sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${C.muted};margin-bottom:8px;">Your message</div>
    <div style="background:${C.surface2};border-left:2px solid ${C.accent};padding:18px 20px;margin-bottom:28px;font-family:${C.sans};font-size:15px;line-height:1.7;color:${C.heading};white-space:pre-wrap;">${esc(d.message)}</div>
    <p style="margin:0 0 20px;font-family:${C.sans};font-size:15px;line-height:1.7;color:${C.body};">
      Need us sooner? Message us on WhatsApp.
    </p>
    ${button(`https://wa.me/${PHONE_INTL}`, 'WhatsApp us', true)}
    ${button(`${SITE}/pricing.html`, 'View pricing', false)}`;
  return layout({
    preheader: "We've received your message and will be in touch within 24 hours.",
    eyebrow: 'Message received',
    title: 'Thanks, we got your message',
    content
  });
}

let transporter;
function mailer() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'coastlinewebdesignstudio@gmail.com',
        // App Passwords are shown with spaces; Gmail wants them without
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '')
      }
    });
  }
  return transporter;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.GMAIL_APP_PASSWORD) {
    return res.status(503).json({ error: 'Email not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const field = (k, max) => String(body[k] || '').trim().slice(0, max);

  // Spam trap filled in: pretend it worked
  if (field('_gotcha', 200)) return res.status(200).json({ ok: true });

  const d = {
    name: field('name', 100),
    phone: field('phone', 30),
    email: field('email', 200),
    business: field('business', 150),
    businessType: field('business_type', 150),
    package: field('package', 60),
    message: field('message', 5000)
  };

  if (!d.name) return res.status(400).json({ error: 'Please enter your name.' });
  if (!validPhone(d.phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    return res.status(400).json({ error: "That email address doesn't look right." });
  }
  if (!d.message) return res.status(400).json({ error: 'Please add a message or question.' });

  d.firstName = d.name.split(/\s+/)[0];
  d.phoneIntl = toIntl(d.phone);

  const gmail = process.env.GMAIL_USER || 'coastlinewebdesignstudio@gmail.com';
  const from = { name: 'Coastline Web Design', address: gmail };
  const to = process.env.CONTACT_TO || gmail;

  try {
    await mailer().sendMail({
      from,
      to,
      replyTo: d.email || undefined,
      subject: `New enquiry: ${d.name}${d.package ? ` (${d.package})` : ''}`,
      html: ownerEmail(d)
    });
  } catch (err) {
    console.error('Enquiry email failed', err.message);
    return res.status(502).json({ error: 'Could not send' });
  }

  console.log('Enquiry received', { name: d.name, phone: d.phone, email: d.email, package: d.package });

  // The enquiry reached us; a failed confirmation email shouldn't show the visitor an error
  if (d.email) {
    try {
      await mailer().sendMail({
        from,
        to: d.email,
        replyTo: to,
        subject: "We've received your message | Coastline Web Design",
        html: clientEmail(d)
      });
    } catch (err) {
      console.error('Confirmation email failed', err.message);
    }
  }

  return res.status(200).json({ ok: true });
};
