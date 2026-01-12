import { prisma } from "@/utils/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

// OTP expiration in minutes
const OTP_EXPIRATION_MINUTES = 10;

// Create a Nodemailer transporter (adjust for your SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email: string) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  // Save OTP in DB
  await prisma.otp.upsert({
    where: { email },
    update: { code: otp, expiresAt },
    create: { email, code: otp, expiresAt },
  });

  // Send email
  await transporter.sendMail({
    from: `"Kreability" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}. It will expire in ${OTP_EXPIRATION_MINUTES} minutes.`,
  });

  console.log(`OTP sent to ${email}: ${otp}`);
};

// Verify OTP
export const verifyOTP = async (email: string, code: string) => {
  const record = await prisma.otp.findUnique({ where: { email } });

  if (!record) return false;

  const now = new Date();
  if (record.expiresAt < now) {
    return false;
  }

  return record.code === code;
};

// Optional: Cleanup expired OTPs
export const cleanupExpiredOTPs = async () => {
  await prisma.otp.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
};
