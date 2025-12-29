import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';

// Resend integration via Replit Connector
let connectionSettings: any;

async function getResendCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    return null;
  }

  try {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || !connectionSettings.settings?.api_key) {
      return null;
    }
    return {
      apiKey: connectionSettings.settings.api_key,
      fromEmail: connectionSettings.settings.from_email || 'info@contestio.sk'
    };
  } catch (error) {
    console.error('[EmailService] Failed to get Resend credentials:', error);
    return null;
  }
}

// SMTP fallback configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const APP_ORIGIN = process.env.APP_ORIGIN || process.env.REPL_SLUG 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
  : 'https://contestio.sk';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private useResend = false;
  private useSMTP = false;
  private initializationPromise: Promise<void>;

  constructor() {
    this.initializationPromise = this.initializeTransporter();
  }

  private async initializeTransporter(): Promise<void> {
    // Try Resend first via Replit Connector
    const resendCreds = await getResendCredentials();
    if (resendCreds) {
      this.isConfigured = true;
      this.useResend = true;
      console.log('[EmailService] Resend configured successfully via Replit Connector');
      return;
    }

    // Fall back to SMTP if Resend is not available
    if (SMTP_CONFIG.host && SMTP_CONFIG.port && SMTP_CONFIG.auth.user && SMTP_CONFIG.auth.pass) {
      try {
        this.transporter = nodemailer.createTransport(SMTP_CONFIG);
        this.isConfigured = true;
        this.useSMTP = true;
        console.log('[EmailService] SMTP transporter configured successfully');
        
        this.verifyConnection().catch(error => {
          console.error('[EmailService] SMTP connection verification failed:', error);
          this.isConfigured = false;
        });
        return;
      } catch (error) {
        console.error('[EmailService] Failed to configure SMTP transporter:', error);
      }
    }

    console.warn('[EmailService] Email configuration incomplete. Email functionality will be disabled.');
    console.warn('[EmailService] Required: Resend Connector or (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)');
  }

  async verifyConnection(): Promise<boolean> {
    if (this.useResend) {
      return true;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('[EmailService] SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP connection failed:', error);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    // Ensure initialization is complete before sending
    await this.initializationPromise;
    
    // For Resend, we need fresh credentials each time (tokens can expire)
    if (this.useResend) {
      const creds = await getResendCredentials();
      if (!creds) {
        console.error('[EmailService] Failed to get Resend credentials');
        return false;
      }

      try {
        const resend = new Resend(creds.apiKey);
        const { data, error } = await resend.emails.send({
          from: creds.fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || this.stripHtml(options.html),
        });

        if (error) {
          console.error('[EmailService] Resend error:', error);
          return false;
        }

        console.log('[EmailService] Email sent successfully via Resend to:', options.to, 'id:', data?.id);
        return true;
      } catch (error) {
        console.error('[EmailService] Failed to send email via Resend:', error);
        return false;
      }
    }

    // SMTP fallback
    if (this.useSMTP && this.transporter) {
      try {
        const result = await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'info@contestio.sk',
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || this.stripHtml(options.html),
        });
        console.log('[EmailService] Email sent successfully via SMTP:', result.messageId);
        return true;
      } catch (error) {
        console.error('[EmailService] Failed to send email via SMTP:', error);
        return false;
      }
    }

    console.error('[EmailService] Email service not configured. Cannot send email.');
    return false;
  }

  async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string
  ): Promise<boolean> {
    const encodedToken = encodeURIComponent(verificationToken);
    const verificationUrl = `${APP_ORIGIN}/verify-email?token=${encodedToken}`;
    
    const subject = 'Verify your Contestio account';
    const html = this.generateVerificationEmailTemplate(firstName, verificationUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    const encodedToken = encodeURIComponent(resetToken);
    const resetUrl = `${APP_ORIGIN}/reset-password?token=${encodedToken}`;
    
    const subject = 'Reset your Contestio password';
    const html = this.generatePasswordResetEmailTemplate(firstName, resetUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private escapeHtml(text: string): string {
    const htmlEscapes: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char]);
  }

  private generateVerificationEmailTemplate(firstName: string, verificationUrl: string): string {
    const escapedFirstName = this.escapeHtml(firstName);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Verify your Contestio account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎣 Welcome to Contestio!</h1>
            </div>
            <div class="content">
              <h2>Hi ${escapedFirstName}!</h2>
              <p>Thank you for joining Contestio, the premier platform for live fishing competitions!</p>
              <p>To complete your registration and start participating in exciting fishing tournaments, please verify your email address by clicking the button below:</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #0ea5e9;">${verificationUrl}</p>
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with Contestio, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 Contestio. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generatePasswordResetEmailTemplate(firstName: string, resetUrl: string): string {
    const escapedFirstName = this.escapeHtml(firstName);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Reset your Contestio password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${escapedFirstName}!</h2>
              <p>We received a request to reset your Contestio account password.</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </div>
              <p>To reset your password, click the button below:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #ef4444;">${resetUrl}</p>
              <p><strong>This reset link will expire in 24 hours for security reasons.</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 Contestio. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendRegistrationConfirmationEmail(
    email: string,
    competitionName: string,
    setupUrl: string
  ): Promise<boolean> {
    const subject = `Registrácia súťaže "${competitionName}" bola prijatá`;
    const html = this.generateRegistrationConfirmationTemplate(competitionName, setupUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  async sendCompetitionApprovalEmail(
    email: string,
    competitionName: string,
    loginUrl: string,
    competitionUrl: string
  ): Promise<boolean> {
    const subject = `Vaša súťaž "${competitionName}" bola schválená!`;
    const html = this.generateCompetitionApprovalTemplate(competitionName, loginUrl, competitionUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private generateRegistrationConfirmationTemplate(competitionName: string, setupUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Registrácia súťaže prijatá</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
            .info-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎣 Contestio</h1>
              <p>Registrácia súťaže prijatá</p>
            </div>
            <div class="content">
              <h2>Ďakujeme za registráciu!</h2>
              <p>Vaša žiadosť o vytvorenie súťaže <strong>"${escapedName}"</strong> bola úspešne prijatá.</p>
              
              <div class="info-box">
                <strong>📋 Ďalšie kroky:</strong>
                <ol>
                  <li>Dokončite nastavenie súťaže cez odkaz nižšie</li>
                  <li>Vaša súťaž bude posúdená naším tímom</li>
                  <li>Po schválení dostanete ďalší email s prístupom</li>
                </ol>
              </div>
              
              <p>Pokračujte v nastavení súťaže kliknutím na tlačidlo:</p>
              <a href="${setupUrl}" class="button">Dokončiť nastavenie</a>
              
              <p>Ak tlačidlo nefunguje, skopírujte tento odkaz:</p>
              <p style="word-break: break-all; color: #16a34a;">${setupUrl}</p>
            </div>
            <div class="footer">
              <p>© 2024 Contestio. Všetky práva vyhradené.</p>
              <p>Toto je automatický email, prosím neodpovedajte naň.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateCompetitionApprovalTemplate(competitionName: string, loginUrl: string, competitionUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Súťaž schválená</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .button-secondary { display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0 20px 10px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
            .success-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Gratulujeme!</h1>
              <p>Vaša súťaž bola schválená</p>
            </div>
            <div class="content">
              <h2>Súťaž "${escapedName}" je aktívna!</h2>
              
              <div class="success-box">
                <strong>✅ Vaša súťaž bola úspešne schválená</strong><br>
                Teraz môžete spravovať tímy, rozhodcov a sledovať výsledky.
              </div>
              
              <p>Pre správu súťaže sa prihláste do organizátorského panelu:</p>
              <a href="${loginUrl}" class="button">Prihlásiť sa</a>
              
              <p>Alebo si pozrite vašu súťaž:</p>
              <a href="${competitionUrl}" class="button-secondary">Zobraziť súťaž</a>
              
              <h3>Čo môžete robiť ako organizátor:</h3>
              <ul>
                <li>📋 Spravovať registrácie tímov</li>
                <li>👨‍⚖️ Pridávať a priraďovať rozhodcov</li>
                <li>🐟 Sledovať úlovky v reálnom čase</li>
                <li>📊 Zobrazovať živý rebríček</li>
                <li>⚙️ Upravovať nastavenia súťaže</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2024 Contestio. Všetky práva vyhradené.</p>
              <p>Toto je automatický email, prosím neodpovedajte naň.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
