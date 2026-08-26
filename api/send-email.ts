import { Resend } from "resend";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
    const { type, email, name, loginTime, browser, eventTitle, hostName, teamMembers } = req.body;
    const targetHostName = hostName || "EventSpark";

    if (!email || !type) {
      return res.status(400).json({ error: "Missing email or type" });
    }

    let subject = "";
    let htmlContent = "";
    const targetName = name || "there";
    const logoUrl = "https://events.ajstudioz.co.in/favicon.png"; 
    const ajLogoUrl = "https://events.ajstudioz.co.in/aj-logo.png";
    const creditsHtml = `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center;">
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-size: 14px; color: #6B7280; padding-right: 8px;">Powered by</td>
                  <td><img src="${logoUrl}" alt="EventSpark Logo" width="32" height="32" style="border-radius: 6px; display: block;" /></td>
                  <td style="font-size: 14px; color: #6B7280; font-weight: bold; padding-left: 8px;">EventSpark</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-size: 14px; color: #9CA3AF; padding-right: 8px;">Developed by</td>
                  <td><img src="${ajLogoUrl}" alt="AJ STUDIOZ Logo" width="32" height="32" style="border-radius: 6px; display: block;" /></td>
                  <td style="font-size: 14px; color: #9CA3AF; font-weight: bold; padding-left: 8px;">AJ STUDIOZ</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    let attachments = [];

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
                <a href="https://events.ajstudioz.co.in/dashboard" style="background-color: #020304; color: white; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500; text-decoration: none; display: inline-block;">
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
    } else if (type === "registration") {
      subject = `You're registered for ${eventTitle || "the event"}!`;
      const { flyerUrl, eventDate, eventLocation } = req.body;
      const topLogo = flyerUrl || logoUrl;
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <body style="background-color: #ffffff; font-family: sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <img src="${topLogo}" alt="Event Logo" width="80" height="80" style="display: block; margin: 0 auto 16px auto; border-radius: 12px; object-fit: cover;" />
                <h1 style="font-size: 28px; font-weight: bold; color: #020304; margin: 0 0 16px;">
                  Registration Confirmed!
                </h1>
                <p style="font-size: 18px; color: #374151; margin: 0;">
                  Hi ${targetName},
                </p>
              </div>
              <div style="margin-bottom: 32px;">
                <p style="font-size: 16px; color: #374151; line-height: 24px; margin: 0 0 16px;">
                  Thank you for registering for <strong>${eventTitle || "our event"}</strong> hosted by <strong>${targetHostName}</strong>. We're excited to have you!
                </p>
                <p style="font-size: 16px; color: #374151; line-height: 24px; margin: 0;">
                  You will receive more updates from the host soon.
                </p>
                ${teamMembers && teamMembers.length > 0 ? `
                  <div style="margin-top: 24px; padding: 16px; background-color: #F3F4F6; border-radius: 8px;">
                    <p style="font-size: 16px; font-weight: bold; color: #374151; margin: 0 0 12px;">Team Registration (${teamMembers.length + 1} members total)</p>
                    <p style="font-size: 14px; color: #4B5563; margin: 0;">Your team members have been successfully registered. Check the attached receipt for details.</p>
                  </div>
                ` : ''}
              </div>
              ${creditsHtml}
            </div>
          </body>
        </html>
      `;

      // Always generate a PDF receipt, even for free events
      const { amount, paymentId } = req.body;
      const isPaid = amount && Number(amount) > 0;
      
      try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const sanitize = (str: string) => (str || "").replace(/[^\\x20-\\x7E]/g, "");
        
        let currentY = 842 - 50;
        const marginX = 50;
        const contentWidth = 595 - (marginX * 2);

        // Header: Logo
        try {
          const topLogo = flyerUrl || logoUrl;
          const logoRes = await fetch(topLogo);
          const logoArrayBuffer = await logoRes.arrayBuffer();
          const bytes = new Uint8Array(logoArrayBuffer);
          let image = bytes[0] === 0xFF && bytes[1] === 0xD8 ? await pdfDoc.embedJpg(logoArrayBuffer) : await pdfDoc.embedPng(logoArrayBuffer);
          page.drawImage(image, { x: marginX, y: currentY - 20, width: 40, height: 40 });
        } catch (e) {
          console.error("Failed to load logo for PDF", e);
        }

        const receiptId = isPaid ? paymentId : "FREE-" + Math.floor(Math.random() * 1000000);
        
        // Header Texts
        page.drawText("INVOICE", { x: marginX + contentWidth - 100, y: currentY, size: 24, font: boldFont });
        page.drawText(`#${receiptId}`, { x: marginX + contentWidth - 100, y: currentY - 15, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
        
        currentY -= 60;
        
        // Billed To & From
        page.drawText("From:", { x: marginX, y: currentY, size: 10, font: boldFont });
        page.drawText("Billed To:", { x: marginX + 250, y: currentY, size: 10, font: boldFont });
        
        currentY -= 15;
        page.drawText(sanitize(targetHostName), { x: marginX, y: currentY, size: 10, font });
        page.drawText(sanitize(targetName), { x: marginX + 250, y: currentY, size: 10, font });
        
        currentY -= 15;
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: marginX, y: currentY, size: 10, font });
        page.drawText(sanitize(email), { x: marginX + 250, y: currentY, size: 10, font });
        
        currentY -= 40;
        page.drawLine({ start: { x: marginX, y: currentY }, end: { x: marginX + contentWidth, y: currentY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        
        currentY -= 20;
        page.drawText("Description", { x: marginX, y: currentY, size: 10, font: boldFont });
        page.drawText("Qty", { x: marginX + 250, y: currentY, size: 10, font: boldFont });
        page.drawText("Rate", { x: marginX + 320, y: currentY, size: 10, font: boldFont });
        page.drawText("Amount", { x: marginX + contentWidth - 50, y: currentY, size: 10, font: boldFont });
        
        currentY -= 10;
        page.drawLine({ start: { x: marginX, y: currentY }, end: { x: marginX + contentWidth, y: currentY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        
        currentY -= 20;
        const totalAttendees = teamMembers && teamMembers.length > 0 ? teamMembers.length + 1 : 1;
        const unitPrice = isPaid ? (Number(amount) / 100) / totalAttendees : 0;
        const formattedUnitPrice = isPaid ? `Rs. ${unitPrice.toFixed(2)}` : "Free";
        const formattedTotal = isPaid ? `Rs. ${(Number(amount) / 100).toFixed(2)}` : "Free";
        
        page.drawText(`Registration for ${sanitize(eventTitle)}`, { x: marginX, y: currentY, size: 10, font });
        page.drawText(totalAttendees.toString(), { x: marginX + 250, y: currentY, size: 10, font });
        page.drawText(formattedUnitPrice, { x: marginX + 320, y: currentY, size: 10, font });
        page.drawText(formattedTotal, { x: marginX + contentWidth - 50, y: currentY, size: 10, font });
        
        if (teamMembers && teamMembers.length > 0) {
            currentY -= 15;
            page.drawText(`Includes ${teamMembers.length} team members`, { x: marginX, y: currentY, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
        }
        
        currentY -= 20;
        page.drawLine({ start: { x: marginX, y: currentY }, end: { x: marginX + contentWidth, y: currentY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        
        currentY -= 30;
        page.drawText("Total:", { x: marginX + 320, y: currentY, size: 14, font: boldFont });
        page.drawText(formattedTotal, { x: marginX + contentWidth - 50, y: currentY, size: 14, font: boldFont });
        
        currentY -= 100;
        const pdfBytes = await pdfDoc.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
        
        attachments.push({
          filename: `Receipt_${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
          content: pdfBase64,
        });
      } catch (pdfErr) {
        console.error("Failed to generate PDF receipt:", pdfErr);
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
