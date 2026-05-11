/**
 * Startling Capital Email Notification Service
 *
 * Sends automated emails at each application stage.
 * In development: emails are logged to console.
 * In production: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM env vars.
 *
 * Integration options:
 *  - Nodemailer + SMTP (Gmail, Sendgrid, Mailgun, Postmark, AWS SES)
 *  - Set env vars to enable live sending.
 */

import { logger } from "./logger";

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface EmailPayload {
  to: string;
  name: string;
  programName: string;
  status: ApplicationStatus;
  feedbackNote?: string;
}

function getSubjectAndBody(payload: EmailPayload): { subject: string; text: string; html: string } {
  const { name, programName, status, feedbackNote } = payload;
  const firstName = name.split(" ")[0];

  const base = {
    submitted: {
      subject: `✅ Application Received — ${programName}`,
      text: `Hi ${firstName},\n\nWe've received your application to the ${programName} program. Our team will review your submission and be in touch soon.\n\nThank you for applying to Startling Capital!\n\nBest regards,\nThe Startling Capital Team`,
      html: `<p>Hi <strong>${firstName}</strong>,</p><p>We've received your application to the <strong>${programName}</strong> program. Our selection committee will review your submission carefully and will be in touch soon.</p><p>Thank you for applying to Startling Capital!</p><p><em>Best regards,<br>The Startling Capital Team</em></p>`,
    },
    under_review: {
      subject: `👀 Your Application is Under Review — ${programName}`,
      text: `Hi ${firstName},\n\nGreat news! Your application to ${programName} is now being reviewed by our selection committee. We appreciate your patience — you'll hear from us soon.\n\nBest regards,\nThe Startling Capital Team`,
      html: `<p>Hi <strong>${firstName}</strong>,</p><p>Great news! Your application to <strong>${programName}</strong> is now being reviewed by our selection committee. We appreciate your patience and will be in touch with a decision soon.</p><p><em>Best regards,<br>The Startling Capital Team</em></p>`,
    },
    shortlisted: {
      subject: `🌟 You've Been Shortlisted — ${programName}`,
      text: `Hi ${firstName},\n\nCongratulations! You have been shortlisted for the ${programName} program. This means your application stood out from the pool — well done!\n\nOur team will be in contact to arrange the next steps in the selection process.\n${feedbackNote ? `\nNote: ${feedbackNote}\n` : ""}\nBest regards,\nThe Startling Capital Team`,
      html: `<p>Hi <strong>${firstName}</strong>,</p><p>🎉 <strong>Congratulations!</strong> You have been <strong>shortlisted</strong> for the <strong>${programName}</strong> program. Your application stood out from the pool — well done!</p><p>Our team will be in contact to arrange the next steps in the selection process.</p>${feedbackNote ? `<p><em>Note: ${feedbackNote}</em></p>` : ""}<p><em>Best regards,<br>The Startling Capital Team</em></p>`,
    },
    accepted: {
      subject: `🎉 Welcome to ${programName} — You've Been Accepted!`,
      text: `Hi ${firstName},\n\nWe are THRILLED to inform you that you have been ACCEPTED into the ${programName} program at Startling Capital!\n\nThis is a transformative opportunity and we can't wait to support your journey. Our team will be reaching out with onboarding details shortly.\n${feedbackNote ? `\nNote: ${feedbackNote}\n` : ""}\nWelcome to the Startling Capital family!\n\nBest regards,\nThe Startling Capital Team`,
      html: `<p>Hi <strong>${firstName}</strong>,</p><p>🎉 We are <strong>THRILLED</strong> to inform you that you have been <strong>ACCEPTED</strong> into the <strong>${programName}</strong> program at Startling Capital!</p><p>This is a transformative opportunity and we can't wait to support your journey. Our team will be reaching out with onboarding details shortly.</p>${feedbackNote ? `<p><em>Note: ${feedbackNote}</em></p>` : ""}<p><strong>Welcome to the Startling Capital family!</strong></p><p><em>Best regards,<br>The Startling Capital Team</em></p>`,
    },
    rejected: {
      subject: `Your Startling Capital Application — ${programName}`,
      text: `Hi ${firstName},\n\nThank you for your application to the ${programName} program. After careful consideration by our selection committee, we regret to inform you that we are unable to offer you a place in this cohort.\n\nThis decision does not reflect your potential as a founder. We encourage you to continue building and to apply to future Startling Capital programs.\n${feedbackNote ? `\nFeedback: ${feedbackNote}\n` : ""}\nBest regards,\nThe Startling Capital Team`,
      html: `<p>Hi <strong>${firstName}</strong>,</p><p>Thank you for your application to the <strong>${programName}</strong> program. After careful consideration by our selection committee, we regret to inform you that we are unable to offer you a place in this cohort.</p><p>This decision does not reflect your potential as a founder. We encourage you to continue building and to apply to future Startling Capital programs — we would love to see you again.</p>${feedbackNote ? `<p><em>Feedback: ${feedbackNote}</em></p>` : ""}<p><em>Best regards,<br>The Startling Capital Team</em></p>`,
    },
    withdrawn: {
      subject: `Application Withdrawn — ${programName}`,
      text: `Hi ${firstName},\n\nYour application to the ${programName} program has been marked as withdrawn. If this was an error, please contact us.\n\nWe hope to see you in a future cohort!\n\nBest regards,\nThe Startling Capital Team`,
      html: `<p>Hi <strong>${firstName}</strong>,</p><p>Your application to the <strong>${programName}</strong> program has been marked as withdrawn. If this was an error, please contact us.</p><p>We hope to see you in a future cohort!</p><p><em>Best regards,<br>The Startling Capital Team</em></p>`,
    },
  };

  return base[status];
}

async function sendViaSMTP(payload: EmailPayload, content: ReturnType<typeof getSubjectAndBody>): Promise<void> {
  // Dynamically import nodemailer only if SMTP is configured
  const nodemailer = await import("nodemailer").catch(() => null);
  if (!nodemailer) {
    throw new Error("nodemailer not available");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Startling Capital Programs" <noreply@startling-capital.com>`,
    to: payload.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

export async function sendApplicationStatusEmail(payload: EmailPayload): Promise<void> {
  const content = getSubjectAndBody(payload);
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (smtpConfigured && process.env.NODE_ENV === "production") {
    try {
      await sendViaSMTP(payload, content);
      logger.info(`Email sent to ${payload.to} for status: ${payload.status}`);
    } catch (err) {
      logger.error({ err, payload }, "Failed to send email via SMTP");
    }
  } else {
    // Development: log email content to console
    logger.info(
      {
        to: payload.to,
        subject: content.subject,
        status: payload.status,
        program: payload.programName,
        note: smtpConfigured ? "SMTP configured but NODE_ENV != production" : "SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS to enable",
      },
      `[EMAIL NOTIFICATION] ${content.subject}`
    );
    logger.info({ body: content.text }, "[EMAIL BODY]");
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0];
  const subject = `Welcome to Startling Capital Programs, ${firstName}! 🎉`;
  const text = `Hi ${firstName},\n\nWelcome to Startling Capital Programs! Your account has been created successfully.\n\nYou can now:\n• Browse our active programs and apply\n• Set up your investor data room\n• Access exclusive advisory resources\n\nWe're excited to support your entrepreneurial journey!\n\nBest regards,\nThe Startling Capital Team\nstartling-capital.com`;
  const html = `<p>Hi <strong>${firstName}</strong>,</p><p>Welcome to <strong>Startling Capital Programs</strong>! Your account has been created successfully.</p><p>You can now:</p><ul><li>Browse our active programs and apply</li><li>Set up your investor data room</li><li>Access exclusive advisory resources</li></ul><p>We're excited to support your entrepreneurial journey!</p><p><em>Best regards,<br>The Startling Capital Team<br><a href="https://www.startling-capital.com">startling-capital.com</a></em></p>`;

  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (smtpConfigured && process.env.NODE_ENV === "production") {
    const nodemailer = await import("nodemailer").catch(() => null);
    if (nodemailer) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Startling Capital Programs" <noreply@startling-capital.com>`,
        to,
        subject,
        text,
        html,
      }).catch((err: unknown) => logger.error({ err }, "Failed to send welcome email"));
    }
  } else {
    logger.info({ to, subject }, `[EMAIL WELCOME] ${subject}`);
  }
}


