const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Required for port 465

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  pool: true,
  maxConnections: 5,
  maxMessages: 100
});

// Verify SMTP connection when the server starts
transporter.verify((error) => {
  if (error) {
    console.error("SMTP ERROR:", error);
  } else {
    console.log("SMTP server is ready.");
  }
});

module.exports = transporter;