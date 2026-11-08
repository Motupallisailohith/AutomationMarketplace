/**
 * Email Service
 * Handles sending emails using Nodemailer
 * Supports SMTP configuration via environment variables
 */

import nodemailer, { Transporter } from 'nodemailer';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';

interface PasswordResetEmailData {
  email: string;
  firstName: string;
  resetUrl: string;
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

@Service()
export class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string = '';
  private configured: boolean = false;

  constructor(private logger: Logger) {
    this.initialize();
  }

  /**
   * Initialize email service with environment variables
   */
  private initialize(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    // Check if SMTP is configured
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.info('Email service not configured - SMTP credentials missing');
      this.configured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.fromEmail = smtpFrom || smtpUser;
      this.configured = true;

      this.logger.info('Email service configured successfully', {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
      });
    } catch (error) {
      this.logger.error('Failed to configure email service', { error });
      this.configured = false;
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return this.configured && this.transporter !== null;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    if (!this.isConfigured() || !this.transporter) {
      throw new Error('Email service is not configured');
    }

    const { email, firstName, resetUrl } = data;

    const htmlContent = this.getPasswordResetEmailTemplate(firstName, resetUrl);

    try {
      await this.transporter.sendMail({
        from: `"Automation Marketplace" <${this.fromEmail}>`,
        to: email,
        subject: 'Password Reset Request',
        html: htmlContent,
        text: `Hi ${firstName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nAutomation Marketplace Team`,
      });

      this.logger.info('Password reset email sent', { email });
    } catch (error) {
      this.logger.error('Failed to send password reset email', { error, email });
      throw error;
    }
  }

  /**
   * Get HTML template for password reset email
   */
  private getPasswordResetEmailTemplate(firstName: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6D5A 0%, #FF5555 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Password Reset</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                Hi <strong>${firstName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                We received a request to reset your password for your Automation Marketplace account. Click the button below to create a new password:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #FF6D5A 0%, #FF5555 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px; box-shadow: 0 4px 12px rgba(255, 85, 85, 0.3);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 20px; font-size: 13px; color: #0066cc; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px; border-left: 3px solid #0066cc;">
                ${resetUrl}
              </p>
              
              <p style="margin: 20px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                <strong>This link will expire in 1 hour.</strong>
              </p>
              
              <p style="margin: 20px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                Best regards,<br>
                <strong>Automation Marketplace Team</strong>
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
