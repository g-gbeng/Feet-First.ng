const { Resend } = require("resend");

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in your environment variables.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;