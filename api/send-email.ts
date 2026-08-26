import { Resend } from "resend";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Missing RESEND_API_KEY environment variable" });
  }

  try {
    const { type, email, name, loginTime, browser, eventTitle } = req.body;

    if (!email || !type) {
      return res.status(400).json({ error: "Missing email or type" });
    }

    let subject = "";
    let htmlContent = "";
    const targetName = name || "there";
    const logoUrl = "https://remix-of-eventspark-five.vercel.app/favicon.png"; 
    const ajLogoUrl = "https://remix-of-eventspark-five.vercel.app/aj-logo.png";
    const creditsHtml = `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center;">
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 16px 0;">
          Powered by <strong>EventSpark</strong>
        </p>
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
          <p style="font-size: 14px; color: #9CA3AF; margin: 0;">Developed by</p>
          <img src="${ajLogoUrl}" alt="AJ STUDIOZ Logo" width="20" height="20" style="border-radius: 4px;" />
          <p style="font-size: 14px; color: #9CA3AF; margin: 0;"><strong>AJ STUDIOZ</strong></p>
        </div>
        <p style="font-size: 12px; color: #9CA3AF; margin: 12px 0 0 0;">
          © ${new Date().getFullYear()} EventSpark. All rights reserved.
        </p>
      </div>
    `;

    if (type === "signup") {
      subject = "Welcome to EventSpark!";
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <body style="background-color: #ffffff; font-family: sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <img src="${logoUrl}" alt="EventSpark Logo" width="48" height="48" style="display: block; margin: 0 auto 16px auto; border-radius: 8px;" />
                <h1 style="font-size: 32px; font-weight: bold; color: #020304; margin: 0 0 16px;">
                  Welcome to EventSpark
                </h1>
                <p style="font-size: 18px; color: #374151; margin: 0;">
                  Hi ${targetName}!
                </p>
              </div>
              <div style="margin-bottom: 32px;">
                <p style="font-size: 16px; color: #374151; line-height: 24px; margin: 0 0 16px;">
                  Thank you for creating an account with EventSpark. We're excited to have you on board!
                </p>
                <p style="font-size: 16px; color: #374151; line-height: 24px; margin: 0;">
                  Get started by creating your first event or exploring the dashboard.
                </p>
              </div>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://remix-of-eventspark-five.vercel.app/dashboard" style="background-color: #020304; color: white; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500; text-decoration: none; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
              ${creditsHtml}
            </div>
          </body>
        </html>
      `;
    } else if (type === "login") {
      subject = "We've noticed a new login";
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <body style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="margin-bottom: 24px;">
                <img src="${logoUrl}" alt="EventSpark Logo" width="48" height="48" style="display: block; margin: 0 0 16px 0; border-radius: 8px;" />
                <h1 style="font-size: 32px; font-weight: 600; color: #000000; margin: 0 0 24px 0; line-height: 1.2;">
                  We've noticed a new login
                </h1>
                <p style="font-size: 16px; color: #000000; margin: 0 0 16px 0; line-height: 1.5;">
                  Hi ${targetName},
                </p>
                <p style="font-size: 16px; color: #000000; margin: 0 0 16px 0; line-height: 1.5;">
                  This is a routine security alert. Someone logged into your EventSpark account from a new IP address or device:
                </p>
              </div>
              <div style="margin: 24px 0;">
                <p style="font-size: 16px; color: #000000; margin: 0 0 8px 0; line-height: 1.5;">
                  <strong>Time:</strong> ${loginTime || new Date().toLocaleString()}
                </p>
                <p style="font-size: 16px; color: #000000; margin: 0 0 8px 0; line-height: 1.5;">
                  <strong>Browser/Device:</strong> ${browser || "Unknown Browser"}
                </p>
              </div>
              <div style="margin-bottom: 24px;">
                <p style="font-size: 16px; color: #000000; margin: 0 0 16px 0; line-height: 1.5;">
                  If this was you, you can ignore this alert. If you noticed any suspicious activity on your account, please secure your account immediately.
                </p>
              </div>
              ${creditsHtml}
            </div>
          </body>
        </html>
      `;
    let attachments = [];

    if (type === "registration") {
      subject = `You're registered for ${eventTitle || "the event"}!`;
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <body style="background-color: #ffffff; font-family: sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <img src="${logoUrl}" alt="EventSpark Logo" width="48" height="48" style="display: block; margin: 0 auto 16px auto; border-radius: 8px;" />
                <h1 style="font-size: 28px; font-weight: bold; color: #020304; margin: 0 0 16px;">
                  Registration Confirmed!
                </h1>
                <p style="font-size: 18px; color: #374151; margin: 0;">
                  Hi ${targetName},
                </p>
              </div>
              <div style="margin-bottom: 32px;">
                <p style="font-size: 16px; color: #374151; line-height: 24px; margin: 0 0 16px;">
                  Thank you for registering for <strong>${eventTitle || "our event"}</strong>. We're excited to have you!
                </p>
                <p style="font-size: 16px; color: #374151; line-height: 24px; margin: 0;">
                  You will receive more updates from the host soon.
                </p>
              </div>
              ${creditsHtml}
            </div>
          </body>
        </html>
      `;

      // If this was a paid registration, generate a PDF receipt
      const { amount, paymentId } = req.body;
      if (amount && Number(amount) > 0) {
        try {
          const PDFDocument = require("pdfkit");
          const doc = new PDFDocument({ margin: 50 });
          const buffers: Buffer[] = [];
          
          const pdfPromise = new Promise<string>((resolve, reject) => {
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => resolve(Buffer.concat(buffers).toString("base64")));
            doc.on("error", reject);
          });

          // Try to fetch logo
          try {
            const logoRes = await fetch(logoUrl);
            const logoArrayBuffer = await logoRes.arrayBuffer();
            doc.image(Buffer.from(logoArrayBuffer), 50, 45, { width: 40 });
            doc.moveDown(3);
          } catch (e) {
            console.error("Failed to load logo for PDF", e);
          }

          doc.fontSize(24).font("Helvetica-Bold").text("Payment Receipt");
          doc.moveDown();
          doc.fontSize(12).font("Helvetica").text(`Receipt ID: ${paymentId || "N/A"}`);
          doc.text(`Date: ${new Date().toLocaleDateString()}`);
          doc.moveDown();
          
          doc.font("Helvetica-Bold").text("Billed To:");
          doc.font("Helvetica").text(targetName);
          doc.text(email);
          doc.moveDown();
          
          doc.font("Helvetica-Bold").text("Event Details:");
          doc.font("Helvetica").text(`Event: ${eventTitle}`);
          doc.moveDown();
          
          doc.font("Helvetica-Bold").text("Payment Info:");
          doc.font("Helvetica").text(`Amount Paid: Rs. ${Number(amount) / 100}`);
          doc.moveDown(2);
          
          doc.fontSize(10).fillColor("gray").text("Thank you for your registration!", { align: "center" });
          doc.text("Powered by EventSpark", { align: "center" });
          
          doc.end();

          const pdfBase64 = await pdfPromise;
          attachments.push({
            filename: `Receipt_${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            content: pdfBase64,
          });
        } catch (pdfErr) {
          console.error("Failed to generate PDF receipt:", pdfErr);
        }
      }
    }

    const { data, error } = await resend.emails.send({
      from: "EventSpark <eventspark@ajstudioz.co.in>",
      to: email,
      subject: subject,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      return res.status(400).json(error);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Error sending email:", error);
    return res.status(500).json({ error: error.message });
  }
}
