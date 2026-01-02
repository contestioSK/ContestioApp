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
  return 'https://contestio.sk';
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
    const verificationUrl = `${APP_ORIGIN}/auth/verify-email?token=${encodedToken}`;
    
    const subject = 'Potvrď svoju e-mailovú adresu | Contestio';
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
          <title>Potvrď svoju e-mailovú adresu | Contestio</title>
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
              <h1 style="margin: 0; font-size: 28px;">🎣 Contestio</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px;">Ahoj <strong>${escapedFirstName}</strong>,</p>
              
              <p>vitaj v <strong>Contestio</strong> 👋<br>
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
                  <li>štatistikám, cieľom a ďalším funkciám Contestio.</li>
                </ul>
              </div>
              
              <p>⏱️ Odkaz je platný <strong>24 hodín</strong>.</p>
              
              <p style="color: #6b7280; font-size: 14px;">Ak si sa do Contestio neregistroval ty, tento e-mail môžeš pokojne ignorovať.</p>
              
              <div class="divider"></div>
              
              <p style="font-size: 14px; color: #6b7280;">Ak by tlačidlo nefungovalo, skopíruj tento odkaz do prehliadača:</p>
              <div class="link-fallback">
                <a href="${verificationUrl}" style="color: #0ea5e9;">${verificationUrl}</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">V prípade otázok nás kontaktuj na<br>
              📩 <a href="mailto:support@contestio.sk" style="color: #0ea5e9;"><strong>support@contestio.sk</strong></a></p>
            </div>
            <div class="footer">
              <p style="margin: 0 0 8px 0;">Vidíme sa na vode 🎣</p>
              <p style="margin: 0; font-weight: bold;">Tím Contestio</p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af;">© 2024 Contestio. Všetky práva vyhradené.</p>
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

  async sendCompetitionReminderEmail(
    email: string,
    competitionName: string,
    dashboardUrl: string
  ): Promise<boolean> {
    const subject = `Pripomienka: Dokončite nastavenie súťaže "${competitionName}"`;
    const html = this.generateCompetitionReminderTemplate(competitionName, dashboardUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private generateCompetitionReminderTemplate(competitionName: string, dashboardUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Contestio – Pripomienka súťaže</title>
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
                🎣 Contestio
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px;">
                Pripomienka - Vaša súťaž čaká
              </p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6; margin-bottom:16px;">
                Ahoj 👋,
              </p>
              <p style="font-size:16px; line-height:1.6;">
                Vaša súťaž <strong>„${escapedName}"</strong> bola schválená pred 24 hodinami a čaká na dokončenie nastavenia.
              </p>
              <p style="font-size:16px; line-height:1.6;">
                Nezabudnite skontrolovať všetky detaily súťaže, aby ste mohli začať prijímať prihlášky tímov.
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #f97316;">
                <strong>Čo by ste mali skontrolovať:</strong>
                <ul style="margin:12px 0 0; padding-left:18px; color:#cbd5e1;">
                  <li>základné informácie a pravidlá</li>
                  <li>dátumy a miesto konania</li>
                  <li>nastavenie sektorov (ak ich používate)</li>
                  <li>výšku štartovného</li>
                </ul>
              </div>
              <div style="text-align:center; margin:32px 0;">
                <a href="${dashboardUrl}"
                   style="display:inline-block; background:#f97316; color:#ffffff; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
                  Prejsť do správy súťaže
                </a>
              </div>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px; background:#0c1f28; text-align:center; font-size:12px; color:#64748b;">
              Tento email bol odoslaný automaticky systémom <strong>Contestio</strong>.<br/>
              Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:info@contestio.sk" style="color:#f97316;">info@contestio.sk</a>.
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

  private generateRegistrationConfirmationTemplate(competitionName: string, setupUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Contestio – Registrácia súťaže</title>
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
                🎣 Contestio
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
                Ahoj 👋,
              </p>
              <p style="font-size:16px; line-height:1.6;">
                ďakujeme za registráciu súťaže <strong>„${escapedName}"</strong> v systéme <strong>Contestio</strong>.
              </p>
              <p style="font-size:16px; line-height:1.6;">
                Tvoja žiadosť bola úspešne prijatá a teraz je čas dokončiť nastavenie, aby si mohol súťaž spustiť a pustiť rybárov do akcie.
              </p>
              <div style="margin:24px 0; padding:16px; background:#132f3f; border-left:4px solid #f97316;">
                <strong>Čo ťa čaká ďalej:</strong>
                <ul style="margin:12px 0 0; padding-left:18px; color:#cbd5e1;">
                  <li>doplnenie detailov súťaže</li>
                  <li>nastavenie pravidiel a kategórií</li>
                  <li>kontrola údajov</li>
                  <li>schválenie naším tímom</li>
                </ul>
              </div>
              <!-- CTA -->
              <div style="text-align:center; margin:32px 0;">
                <a href="${setupUrl}"
                   style="display:inline-block; background:#f97316; color:#0c1f28; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:bold; letter-spacing:0.5px;">
                  Dokončiť nastavenie súťaže
                </a>
              </div>
              <p style="font-size:14px; color:#94a3b8; line-height:1.6;">
                Ak by tlačidlo nefungovalo, skopíruj tento odkaz do prehliadača:<br>
                <span style="word-break:break-all; color:#f97316;">
                  ${setupUrl}
                </span>
              </p>
              <p style="margin-top:32px; font-size:15px;">
                🎯 <strong>Tip:</strong> Čím skôr súťaž nastavíš, tým skôr ju môžeš zdieľať s účastníkmi a rozhodcami.
              </p>
              <p style="margin-top:24px;">
                Lovu zdar!<br>
                <strong>Tím Contestio</strong>
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:#0b1a22; padding:20px; text-align:center; font-size:12px; color:#64748b;">
              © 2024 Contestio · Všetky práva vyhradené<br/>
              Tento e-mail bol odoslaný automaticky, prosím neodpovedajte naň.
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

  private generateCompetitionApprovalTemplate(competitionName: string, loginUrl: string, competitionUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Contestio – Súťaž schválená</title>
</head>
<body style="margin:0; padding:0; background-color:#0c1f28; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1f28; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f2632; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px; text-align:center;">
              <h1 style="margin:0; font-size:28px;">🎉 Súťaž schválená!</h1>
              <p style="margin-top:8px; font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px;">
                Contestio Organizer
              </p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6;">
                Super správa! Tvoja súťaž <strong>„${escapedName}"</strong> bola úspešne schválená ✅
              </p>
              <p style="font-size:16px; line-height:1.6;">
                Teraz máš plný prístup k organizátorskému panelu a môžeš:
              </p>
              <ul style="margin:16px 0; padding-left:20px; color:#cbd5e1;">
                <li>👥 pridávať tímy</li>
                <li>🎣 spravovať úlovky</li>
                <li>👨‍⚖️ pozvať rozhodcov</li>
                <li>📣 posielať oznamy účastníkom</li>
                <li>🚦 spustiť súťaž v správny čas</li>
              </ul>
              <div style="margin:32px 0; text-align:center;">
                <a href="${loginUrl}"
                   style="display:inline-block; background:#22c55e; color:#06210f; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:bold;">
                  Prejsť do organizátorského panelu
                </a>
              </div>
              <p style="font-size:14px; color:#94a3b8;">
                💡 Tip: Nezabudni pridať rozhodcov ešte pred štartom súťaže – výrazne ti to uľahčí priebeh.
              </p>
              <p style="margin-top:24px;">
                Držíme palce a prajeme úspešný priebeh súťaže! 🎣<br>
                <strong>Tím Contestio</strong>
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:#0b1a22; padding:20px; text-align:center; font-size:12px; color:#64748b;">
              © 2024 Contestio · Automatická správa
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

  async sendCompetitionReminderEmail(
    email: string,
    competitionName: string,
    dashboardUrl: string
  ): Promise<boolean> {
    const subject = `🚦 Čas začať – pozvi tímy do súťaže "${competitionName}"`;
    const html = this.generateCompetitionReminderTemplate(competitionName, dashboardUrl);

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private generateCompetitionReminderTemplate(competitionName: string, dashboardUrl: string): string {
    const escapedName = this.escapeHtml(competitionName);
    return `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Contestio – Čas začať!</title>
</head>
<body style="margin:0; padding:0; background-color:#0c1f28; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1f28; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f2632; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px; text-align:center;">
              <h1 style="margin:0; font-size:28px;">🚦 Čas začať!</h1>
              <p style="margin-top:8px; font-size:13px; color:#94a3b8;">
                Tvoja súťaž „${escapedName}" čaká na prvých účastníkov
              </p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:16px; line-height:1.6;">
                Ahoj,<br><br>
                Tvoja súťaž je pripravená – teraz je ideálny čas:
              </p>
              <ul style="margin:16px 0; padding-left:20px; color:#cbd5e1;">
                <li>📨 poslať pozvánky tímom</li>
                <li>📲 zdieľať súťaž cez QR kód</li>
                <li>🎯 nastaviť pravidlá a hodnotenie</li>
                <li>▶️ spustiť súťaž v správnom momente</li>
              </ul>
              <div style="margin:32px 0; text-align:center;">
                <a href="${dashboardUrl}"
                   style="display:inline-block; background:#f97316; color:#0c1f28; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:bold;">
                  Otvoriť správu súťaže
                </a>
              </div>
              <p style="font-size:14px; color:#94a3b8;">
                💡 Tip: Organizátori, ktorí pozvú tímy hneď, majú vyššiu účasť a menej problémov počas preteku.
              </p>
              <p style="margin-top:24px;">
                Držíme palce! 🎣<br>
                <strong>Tím Contestio</strong>
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:#0b1a22; padding:20px; text-align:center; font-size:12px; color:#64748b;">
              © 2024 Contestio · Tento e-mail bol odoslaný automaticky
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

  isReady(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
