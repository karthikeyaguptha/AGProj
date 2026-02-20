import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { smtpHost, smtpPort, smtpUser, smtpPass, from, to, envName, envUrl, group } = body;

        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !to) {
            return NextResponse.json({ error: "Missing SMTP configuration" }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465,
            auth: { user: smtpUser, pass: smtpPass },
        });

        const mailOptions = {
            from: from || smtpUser,
            to,
            subject: `🔴 Environment Down: ${envName}`,
            html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1d24; border-radius: 12px; overflow: hidden; border: 1px solid #2a2d35;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 20px;">⚠️ Environment Down</h1>
          </div>
          <div style="padding: 24px; color: #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Environment</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${envName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Group</td>
                <td style="padding: 8px 0; font-size: 14px;">${group || "Default"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">URL</td>
                <td style="padding: 8px 0; font-size: 14px;"><a href="${envUrl}" style="color: #6366f1;">${envUrl}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Detected At</td>
                <td style="padding: 8px 0; font-size: 14px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <div style="padding: 16px 24px; background: rgba(239, 68, 68, 0.1); text-align: center; font-size: 12px; color: #94a3b8;">
            Sent by Environment Pulse
          </div>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Email send error:", error);
        return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }
}
