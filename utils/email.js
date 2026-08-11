// utils/email.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendResetEmail = async (toEmail, resetLink) => {
  const { data, error } = await resend.emails.send({
    from: 'Movies App <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to set a new password. This link will expire shortly.</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error('Failed to send reset email');
  }

  return data;
};

module.exports = { sendResetEmail };