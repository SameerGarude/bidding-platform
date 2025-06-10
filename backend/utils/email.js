const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or "hotmail", "outlook", etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password if using Gmail
  },
});

exports.sendEmail = async ({ to, subject, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"ProjectHub" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log("✅ Email sent:", info.response);
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
  }
};
