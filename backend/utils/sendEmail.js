const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

async function sendEmail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: {
      name: "Nexa Bank",
      address: process.env.SENDER_EMAIL,
    },
    to,
    subject,
    text,
    html,
  });
}

module.exports = sendEmail;
