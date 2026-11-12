const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporterPromise;
let etherealAccount;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (process.env.MAIL_MODE === 'smtp') {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          throw new Error('Configura SMTP_HOST, SMTP_USER y SMTP_PASS para usar SMTP.');
        }
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
      }

      const user = process.env.ETHEREAL_USER;
      const pass = process.env.ETHEREAL_PASS;
      if (user && pass) {
        etherealAccount = { user };
        return nodemailer.createTransport({
          host: 'smtp.ethereal.email', port: 587, secure: false,
          auth: { user, pass }
        });
      }

      // Ethereal creates a disposable SMTP inbox automatically for local development.
      etherealAccount = await nodemailer.createTestAccount();
      logger.info('Ethereal test mailbox ready', { mailbox: etherealAccount.user, web: etherealAccount.web });
      return nodemailer.createTransport({
        host: etherealAccount.smtp.host,
        port: etherealAccount.smtp.port,
        secure: etherealAccount.smtp.secure,
        auth: { user: etherealAccount.user, pass: etherealAccount.pass }
      });
    })();
  }
  try { return await transporterPromise; }
  catch (error) { transporterPromise = null; throw error; }
}

async function deliver({ to, subject, text, html }) {
  const transporter = await getTransporter();
  const from = process.env.EMAIL_FROM || `Gestión de Talleres <${etherealAccount?.user || process.env.SMTP_USER}>`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) logger.info('Ethereal email preview', { to, subject, previewUrl });
  else logger.info('Email sent', { to, subject, messageId: info.messageId });
  return { messageId: info.messageId, previewUrl };
}

async function sendWelcomeEmail({ to, name }) {
  const greeting = name ? `Hola ${name},` : 'Hola,';
  const htmlGreeting = name ? `Hola ${escapeHtml(name)},` : 'Hola,';
  return deliver({
    to,
    subject: 'Bienvenida al sistema de Gestión de Talleres',
    text: `${greeting}\n\nTu cuenta fue creada correctamente en el sistema de Gestión de Talleres. Ya puedes iniciar sesión.`,
    html: `<p>${htmlGreeting}</p><p>Tu cuenta fue creada correctamente en el sistema de <strong>Gestión de Talleres</strong>.</p><p>Ya puedes iniciar sesión.</p>`
  });
}

async function sendPasswordResetEmail({ to, name, token }) {
  const baseUrl = (process.env.FRONTEND_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const greeting = name ? `Hola ${name},` : 'Hola,';
  const htmlGreeting = name ? `Hola ${escapeHtml(name)},` : 'Hola,';
  return deliver({
    to,
    subject: 'Restablece tu contraseña — Gestión de Talleres',
    text: `${greeting}\n\nRecibimos una solicitud para restablecer tu contraseña. Abre este enlace en los próximos 30 minutos:\n${resetUrl}\n\nSi no solicitaste el cambio, ignora este mensaje.`,
    html: `<p>${htmlGreeting}</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${resetUrl}">Crear una nueva contraseña</a></p><p>El enlace vence en 30 minutos. Si no solicitaste el cambio, ignora este mensaje.</p>`
  });
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };
