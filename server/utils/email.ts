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
      fromEmail: connectionSettings.settings.from_email || 'info@privode.eu'
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

// Determine the correct app origin URL
function getAppOrigin(): string {
  if (process.env.APP_ORIGIN) {
    return process.env.APP_ORIGIN;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPLIT_DOMAINS) {
    const firstDomain = process.env.REPLIT_DOMAINS.split(',')[0];
    return `https://${firstDomain}`;
  }
  return 'https://privode.eu';
}

const APP_ORIGIN = getAppOrigin();

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
          from: process.env.SMTP_FROM || 'info@privode.eu',
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
    const verificationUrl = `${APP_ORIGIN}/auth/verify-email?token=${encodedToken}`;
    
    const subject = 'Potvrď svoju e-mailovú adresu | PriVode';
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
    const resetUrl = `${APP_ORIGIN}/auth/reset-password?token=${encodedToken}`;
    
    const subject = 'Reset your PriVode password';
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
          <title>Potvrď svoju e-mailovú adresu | PriVode</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #0284c7; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; font-size: 14px; }
            .features { background: #f0f9ff; border-radius: 6px; padding: 16px; margin: 20px 0; }
            .features ul { margin: 10px 0; padding-left: 20px; }
            .features li { margin: 8px 0; }
            .link-fallback { background: #f8fafc; padding: 12px; border-radius: 6px; margin: 16px 0; word-break: break-all; font-size: 13px; }
            .divider { border-top: 1px solid #e5e7eb; margin: 24px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎣 PriVode</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px;">Ahoj <strong>${escapedFirstName}</strong>,</p>
              
              <p>vitaj v <strong>PriVode</strong> 👋<br>
              tvoj účet bol úspešne vytvorený. Aby sme ho mohli aktivovať, potrebujeme potvrdiť tvoju e-mailovú adresu.</p>
              
              <p>👉 <strong>Stačí kliknúť na tlačidlo nižšie:</strong></p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Potvrdiť e-mailovú adresu</a>
              </div>
              
              <div class="features">
                <p style="margin: 0 0 10px 0;"><strong>Týmto krokom získaš plný prístup k:</strong></p>
                <ul>
                  <li>rybárskemu denníku a záznamom úlovkov,</li>
                  <li>sledovaniu obľúbených súťaží a tímov,</li>
                  <li>štatistikám, cieľom a ďalším funkciám PriVode.</li>
                </ul>
              </div>
              
              <p>⏱️ Odkaz je platný <strong>24 hodín</strong>.</p>
              
              <p style="color: #6b7280; font-size: 14px;">Ak si sa do PriVode neregistroval ty, tento e-mail môžeš pokojne ignorovať.</p>
              
              <div class="divider"></div>
              
              <p style="font-size: 14px; color: #6b7280;">Ak by tlačidlo nefungovalo, skopíruj tento odkaz do prehliadača:</p>
              <div class="link-fallback">
                <a href="${verificationUrl}" style="color: #0ea5e9;">${verificationUrl}</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">V prípade otázok nás kontaktuj na<br>
              📩 <a href="mailto:support@privode.eu" style="color: #0ea5e9;"><strong>support@privode.eu</strong></a></p>
            </div>
            <div class="footer">
              <p style="margin: 0 0 8px 0;">Vidíme sa na vode 🎣</p>
              <p style="margin: 0; font-weight: bold;">Tím PriVode</p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af;">© 2024 PriVode. Všetky práva vyhradené.</p>
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
          <title>Reset your PriVode password</title>
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
              <p>We received a request to reset your PriVode account password.</p>
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
              <p>© 2024 PriVode. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // EMAIL 1 - Potvrdenie registrácie súťaže (hneď po vytvorení)
  async sendRegistrationConfirmationEmail(
    email: string,
    competitionName: string,
    setupUrl: string
  ): Promise<boolean> {
    const subject = `🎣 PriVode – Registrácia súťaže bola prijatá`;
    const html = this.generateRegistrationConfirmationTemplate(competitionName, setupUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  // EMAIL 2 - Pripomienka (24-48h po registrácii)
  async sendCompetitionReminderEmail(
    email: string,
    competitionName: string,
    dashboardUrl: string
  ): Promise<boolean> {
    const subject = `🧩 Nezabudni dokončiť nastavenie súťaže`;
    const html = this.generateCompetitionReminderTemplate(competitionName, dashboardUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  // EMAIL 3 - Deň pred začiatkom súťaže
  async sendDayBeforeCompetitionEmail(
    email: string,
    competitionName: string,
    dashboardUrl: string
  ): Promise<boolean> {
    const subject = `⏰ Zajtra štartuje súťaž „${competitionName}"`;
    const html = this.generateDayBeforeCompetitionTemplate(competitionName, dashboardUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  // EMAIL - Potvrdenie platby (hneď po úspešnej platbe)
  async sendPaymentConfirmationEmail(
    email: string,
    competitionName: string,
    planName: string,
    dashboardUrl: string
  ): Promise<boolean> {
    const subject = `✅ Vaša súťaž je aktívna – môžete ju spustiť`;
    const html = this.generatePaymentConfirmationTemplate(competitionName, planName, dashboardUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  // EMAIL 2 - Pripomienka (24-48h po registrácii)
  private generateCompetitionReminderTemplate(competitionName: string, dashboardUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PriVode – Pripomienka</title>
</head>
<body style="margin:0; padding:0; background-color:#0c1f28; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1f28; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f2632; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px 32px 20px; text-align:center;">
              <h1 style="margin:0; font-size:28px; letter-spacing:0.5px;">
                🎣 PriVode
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px;">
                Pripomienka
              </p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6; margin-bottom:16px;">
                Ahoj,
              </p>
              <p style="font-size:16px; line-height:1.6;">
                tvoja súťaž <strong>„${escapedName}"</strong> je vytvorená, ale ešte nie je kompletne pripravená.
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #f97316;">
                <strong>Odporúčame ti skontrolovať:</strong>
                <ul style="margin:12px 0 0; padding-left:18px; color:#cbd5e1;">
                  <li>nastavenia súťaže</li>
                  <li>zoznam tímov</li>
                  <li>rozhodcov</li>
                  <li>základné pravidlá</li>
                </ul>
              </div>
              <p style="font-size:15px; line-height:1.6; color:#94a3b8;">
                👉 Pripomíname, že súťaž bude možné spustiť až v deň jej začiatku.
              </p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${dashboardUrl}"
                   style="display:inline-block; background:#f97316; color:#ffffff; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
                  Pokračovať v nastavení
                </a>
              </div>
              <p style="font-size:15px; line-height:1.6;">
                Keď bude všetko pripravené, v deň pretekov už len klikneš na „Spustiť súťaž" a ide sa na vec.
              </p>
              <p style="margin-top:24px;">
                Tím PriVode 🎣
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px; background:#0c1f28; text-align:center; font-size:12px; color:#64748b;">
              Automatický e-mail, neodpovedaj naň prosím.
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

  // EMAIL 1 - Potvrdenie registrácie súťaže
  private generateRegistrationConfirmationTemplate(competitionName: string, setupUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PriVode – Registrácia súťaže</title>
</head>
<body style="margin:0; padding:0; background-color:#0c1f28; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1f28; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f2632; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px 32px 20px; text-align:center;">
              <h1 style="margin:0; font-size:28px; letter-spacing:0.5px;">
                🎣 PriVode
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px;">
                Registrácia súťaže prijatá
              </p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6; margin-bottom:16px;">
                Ahoj,
              </p>
              <p style="font-size:16px; line-height:1.6;">
                ďakujeme za registráciu súťaže <strong>„${escapedName}"</strong>.
              </p>
              <p style="font-size:16px; line-height:1.6;">
                Tvoja žiadosť bola úspešne prijatá a súťaž je teraz v prípravnom režime.
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #f97316;">
                <strong>Čo môžeš robiť teraz:</strong>
                <ul style="margin:12px 0 0; padding-left:18px; color:#cbd5e1;">
                  <li>doplniť údaje o súťaži</li>
                  <li>nastaviť pravidlá</li>
                  <li>pridať rozhodcov</li>
                  <li>pripraviť tímy</li>
                  <li>skontrolovať všetky detaily</li>
                </ul>
              </div>
              <p style="font-size:15px; line-height:1.6; color:#94a3b8;">
                👉 Súťaž zatiaľ nie je spustená – spustiť ju bude možné až v deň jej začiatku.
              </p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${setupUrl}"
                   style="display:inline-block; background:#f97316; color:#ffffff; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:bold; letter-spacing:0.5px;">
                  Pokračovať v nastavení
                </a>
              </div>
              <p style="font-size:15px; line-height:1.6;">
                Ak budeš čokoľvek potrebovať, sme tu pre teba.
              </p>
              <p style="margin-top:24px;">
                Tím PriVode 🎣
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:#0b1a22; padding:20px; text-align:center; font-size:12px; color:#64748b;">
              Automatický e-mail, neodpovedaj naň prosím.
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

  // EMAIL 3 - Deň pred začiatkom súťaže
  private generateDayBeforeCompetitionTemplate(competitionName: string, dashboardUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PriVode – Zajtra štartuje súťaž</title>
</head>
<body style="margin:0; padding:0; background-color:#0c1f28; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1f28; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f2632; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px 32px 20px; text-align:center;">
              <h1 style="margin:0; font-size:28px; letter-spacing:0.5px;">
                🎣 PriVode
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px;">
                Zajtra štartuje súťaž
              </p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6; margin-bottom:16px;">
                Ahoj,
              </p>
              <p style="font-size:16px; line-height:1.6;">
                zajtra štartuje súťaž <strong>„${escapedName}"</strong> 🎣
              </p>
              <p style="font-size:16px; line-height:1.6;">
                Tu je rýchla kontrola pred začiatkom:
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #22c55e;">
                <ul style="margin:0; padding-left:18px; color:#cbd5e1; list-style:none;">
                  <li style="margin-bottom:8px;">✅ tímy sú pripravené</li>
                  <li style="margin-bottom:8px;">✅ rozhodcovia nastavení</li>
                  <li>✅ pravidlá skontrolované</li>
                </ul>
              </div>
              <p style="font-size:15px; line-height:1.6; color:#94a3b8;">
                👉 Súťaž bude možné spustiť zajtra priamo v administrácii.
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #f97316;">
                <strong>Po spustení:</strong>
                <ul style="margin:12px 0 0; padding-left:18px; color:#cbd5e1;">
                  <li>sa aktivuje zapisovanie úlovkov</li>
                  <li>spustí sa live poradie</li>
                  <li>rozhodcovia môžu potvrdzovať úlovky</li>
                </ul>
              </div>
              <div style="text-align:center; margin:32px 0;">
                <a href="${dashboardUrl}"
                   style="display:inline-block; background:#f97316; color:#ffffff; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
                  Prejsť do správy súťaže
                </a>
              </div>
              <p style="font-size:15px; line-height:1.6;">
                Držíme palce, nech prebehne všetko hladko!
              </p>
              <p style="margin-top:24px;">
                Tím PriVode 🎣
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px; background:#0c1f28; text-align:center; font-size:12px; color:#64748b;">
              Automatický e-mail, neodpovedaj naň prosím.
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

  // EMAIL - Potvrdenie platby template
  private generatePaymentConfirmationTemplate(competitionName: string, planName: string, dashboardUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    const escapedPlan = this.escapeHtml(planName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PriVode – Platba úspešná</title>
</head>
<body style="margin:0; padding:0; background-color:#0c1f28; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1f28; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f2632; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px 32px 20px; text-align:center;">
              <h1 style="margin:0; font-size:28px; letter-spacing:0.5px;">
                🎣 PriVode
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px;">
                Platba úspešná
              </p>
            </td>
          </tr>
          <!-- SUCCESS BANNER -->
          <tr>
            <td style="padding:0 32px;">
              <div style="background:linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding:20px; border-radius:8px; text-align:center;">
                <p style="margin:0; font-size:24px;">✅</p>
                <p style="margin:8px 0 0; font-size:18px; font-weight:bold;">
                  Vaša súťaž je aktívna!
                </p>
              </div>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6; margin-bottom:16px;">
                Ahoj,
              </p>
              <p style="font-size:16px; line-height:1.6;">
                platba za súťaž <strong>„${escapedName}"</strong> prebehla úspešne.
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-radius:8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0; color:#94a3b8;">Súťaž:</td>
                    <td style="padding:8px 0; text-align:right; font-weight:bold;">${escapedName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:#94a3b8;">Balík:</td>
                    <td style="padding:8px 0; text-align:right; font-weight:bold; color:#f97316;">${escapedPlan}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; color:#94a3b8;">Stav:</td>
                    <td style="padding:8px 0; text-align:right; font-weight:bold; color:#22c55e;">Aktívna ✓</td>
                  </tr>
                </table>
              </div>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #22c55e;">
                <strong>Čo to znamená:</strong>
                <ul style="margin:12px 0 0; padding-left:18px; color:#cbd5e1;">
                  <li>súťaž je oficiálne aktívna</li>
                  <li>účastníci sa môžu registrovať</li>
                  <li>máte prístup k plnej správe súťaže</li>
                </ul>
              </div>
              <p style="font-size:15px; line-height:1.6; color:#94a3b8;">
                👉 Súťaž môžete spustiť v deň jej začiatku priamo v administrácii.
              </p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${dashboardUrl}"
                   style="display:inline-block; background:#f97316; color:#ffffff; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
                  Prejsť do správy súťaže
                </a>
              </div>
              <p style="font-size:15px; line-height:1.6;">
                Ak potrebujete niečo upraviť (sektory, pravidlá, rozhodcov), môžete tak urobiť kedykoľvek pred štartom.
              </p>
              <p style="font-size:15px; line-height:1.6; margin-top:20px;">
                🎣 Držíme palce, nech sa súťaž vydarí!
              </p>
              <p style="margin-top:24px;">
                Tím PriVode
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px; background:#0c1f28; text-align:center; font-size:12px; color:#64748b;">
              Automatický e-mail, neodpovedaj naň prosím.
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

  async sendRefereeInvitationEmail(
    email: string,
    competitionName: string,
    organizerName: string,
    registerUrl: string
  ): Promise<boolean> {
    const subject = `🎣 Pozvánka: Staňte sa rozhodcom súťaže „${competitionName}"`;
    const html = this.generateRefereeInvitationTemplate(competitionName, organizerName, registerUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private generateRefereeInvitationTemplate(competitionName: string, organizerName: string, registerUrl: string): string {
    const escapedCompetition = this.escapeHtml(competitionName);
    const escapedOrganizer = this.escapeHtml(organizerName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PriVode – Pozvánka rozhodcu</title>
</head>
<body style="margin:0; padding:0; background-color:#0c1f28; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1f28; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f2632; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px 32px 20px; text-align:center;">
              <h1 style="margin:0; font-size:28px; letter-spacing:0.5px;">
                🎣 PriVode
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px;">
                Pozvánka rozhodcu
              </p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6; margin-bottom:16px;">
                Dobrý deň,
              </p>
              <p style="font-size:16px; line-height:1.6;">
                organizátor <strong>${escapedOrganizer}</strong> vás pozýva stať sa rozhodcom súťaže <strong>„${escapedCompetition}"</strong>.
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #f97316;">
                <strong>Ako rozhodca budete môcť:</strong>
                <ul style="margin:12px 0 0; padding-left:18px; color:#cbd5e1;">
                  <li>Zaznamenávať úlovky tímov</li>
                  <li>Overovať hmotnosť rýb</li>
                  <li>Sledovať priebežné výsledky</li>
                </ul>
              </div>
              <p style="font-size:15px; line-height:1.6; color:#94a3b8;">
                Pre prijatie pozvania sa zaregistrujte v systéme PriVode.
              </p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${registerUrl}"
                   style="display:inline-block; background:#f97316; color:#ffffff; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
                  Zaregistrovať sa
                </a>
              </div>
              <p style="font-size:14px; line-height:1.6; color:#64748b;">
                Po registrácii vás organizátor pridá do súťaže ako rozhodcu.
              </p>
              <p style="margin-top:24px;">
                Tím PriVode 🎣
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px; background:#0c1f28; text-align:center; font-size:12px; color:#64748b;">
              Automatický e-mail, neodpovedaj naň prosím.
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

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
