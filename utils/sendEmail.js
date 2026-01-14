const nodemailer = require('nodemailer');

async function sendConfirmationEmail(userEmail, userName) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // You can also use SendGrid, Outlook, etc.
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password or app-specific password
      }
    });

    const mailOptions = {
      from: '"Feet-First.ng" <no-reply@feetfirst.ng>',
      to: userEmail,
      subject: 'Confirm Your Account',
      html: `
        <h2>Hello ${userName},</h2>
        <p>Thank you for signing up at Feet-First.ng!</p>
        <p>Please click the link below to confirm your email:</p>
        <a href="http://localhost:3000/api/users/verify?email=${userEmail}">Confirm Email</a>
        <p>If you did not sign up, ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to', userEmail);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

module.exports = sendConfirmationEmail;
