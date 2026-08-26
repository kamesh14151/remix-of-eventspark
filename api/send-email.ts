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
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 14px; color: #6B7280; vertical-align: middle;">Powered by</span>
          <img src="${logoUrl}" alt="EventSpark Logo" width="28" height="28" style="vertical-align: middle; margin: 0 8px; border-radius: 6px;" />
          <strong style="font-size: 14px; color: #6B7280; vertical-align: middle;">EventSpark</strong>
        </div>
        <div>
          <span style="font-size: 14px; color: #9CA3AF; vertical-align: middle;">Developed by</span>
          <img src="${ajLogoUrl}" alt="AJ STUDIOZ Logo" width="28" height="28" style="vertical-align: middle; margin: 0 8px; border-radius: 6px;" />
          <strong style="font-size: 14px; color: #9CA3AF; vertical-align: middle;">AJ STUDIOZ</strong>
        </div>
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
      const { flyerUrl } = req.body;
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
        
        let currentY = 842 - 60;
        const marginX = 50;
        const contentWidth = 595 - (marginX * 2);

        // Header: Logo and host
        try {
          const logoRes = await fetch(logoUrl);
          const logoArrayBuffer = await logoRes.arrayBuffer();
          const bytes = new Uint8Array(logoArrayBuffer);
          let image = bytes[0] === 0xFF && bytes[1] === 0xD8 ? await pdfDoc.embedJpg(logoArrayBuffer) : await pdfDoc.embedPng(logoArrayBuffer);
          page.drawImage(image, { x: marginX, y: currentY - 15, width: 20, height: 20 });
          page.drawText(sanitize(targetHostName), { x: marginX + 30, y: currentY - 10, size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.4) });
          page.drawText(`—  ${sanitize(eventTitle)}`, { x: marginX + 30 + font.widthOfTextAtSize(sanitize(targetHostName), 12) + 10, y: currentY - 10, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
        } catch (e) {
          console.error("Failed to load logo for PDF", e);
          page.drawText(sanitize(targetHostName), { x: marginX, y: currentY - 10, size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.4) });
          page.drawText(`—  ${sanitize(eventTitle)}`, { x: marginX + font.widthOfTextAtSize(sanitize(targetHostName), 12) + 10, y: currentY - 10, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
        }

        currentY -= 40;
        const receiptId = isPaid ? paymentId : "FREE-" + Math.floor(Math.random() * 1000000);
        page.drawText(`Receipt of Payment: #${receiptId}`, { x: marginX, y: currentY, size: 22, font: boldFont });
        currentY -= 20;
        page.drawText(`Organization: ${sanitize(targetHostName)}`, { x: marginX, y: currentY, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
        
        currentY -= 20;
        page.drawLine({ start: { x: marginX, y: currentY }, end: { x: marginX + contentWidth, y: currentY }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
        
        currentY -= 30;
        page.drawText("Attendee information", { x: marginX, y: currentY, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        currentY -= 20;
        page.drawText("NAME", { x: marginX, y: currentY, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        page.drawText("EMAIL", { x: marginX + 250, y: currentY, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        currentY -= 15;
        page.drawText(sanitize(targetName), { x: marginX, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(sanitize(email), { x: marginX + 250, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        
        currentY -= 30;
        page.drawText("Event details", { x: marginX, y: currentY, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        currentY -= 20;
        page.drawText(`${sanitize(eventTitle)} — ${new Date().toLocaleDateString()}`, { x: marginX, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        
        currentY -= 40;
        page.drawText("Purchase summary", { x: marginX, y: currentY, size: 18, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        
        currentY -= 25;
        // Table Header Background
        page.drawRectangle({ x: marginX, y: currentY - 10, width: contentWidth, height: 25, color: rgb(0.95, 0.95, 0.95) });
        page.drawLine({ start: { x: marginX, y: currentY + 15 }, end: { x: marginX + contentWidth, y: currentY + 15 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        page.drawLine({ start: { x: marginX, y: currentY - 10 }, end: { x: marginX + contentWidth, y: currentY - 10 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        
        page.drawText("Purchase", { x: marginX + 10, y: currentY, size: 11, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        page.drawText("Quantity", { x: marginX + 200, y: currentY, size: 11, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        page.drawText("Unit price", { x: marginX + 300, y: currentY, size: 11, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        page.drawText("Amount", { x: marginX + 420, y: currentY, size: 11, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        
        currentY -= 25;
        const totalAttendees = teamMembers && teamMembers.length > 0 ? teamMembers.length + 1 : 1;
        const unitPrice = isPaid ? (Number(amount) / 100) / totalAttendees : 0;
        const formattedUnitPrice = isPaid ? `Rs. ${unitPrice.toFixed(2)}` : "Free";
        const formattedTotal = isPaid ? `Rs. ${(Number(amount) / 100).toFixed(2)}` : "Free";
        
        page.drawText("Registration Ticket", { x: marginX + 10, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(totalAttendees.toString(), { x: marginX + 200, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(formattedUnitPrice, { x: marginX + 300, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(formattedTotal, { x: marginX + 420, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        
        currentY -= 15;
        page.drawLine({ start: { x: marginX, y: currentY }, end: { x: marginX + contentWidth, y: currentY }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        
        // Subtotal box
        currentY -= 65;
        page.drawRectangle({ x: marginX, y: currentY - 10, width: contentWidth, height: 60, color: rgb(0.97, 0.97, 0.97) });
        
        page.drawText("Subtotal", { x: marginX + 10, y: currentY + 30, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(formattedTotal, { x: marginX + 420, y: currentY + 30, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        
        page.drawText("Fees", { x: marginX + 10, y: currentY + 10, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(isPaid ? "Rs. 0.00" : "Free", { x: marginX + 420, y: currentY + 10, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        
        page.drawLine({ start: { x: marginX + 10, y: currentY - 5 }, end: { x: marginX + contentWidth - 10, y: currentY - 5 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        
        currentY -= 25;
        page.drawText("Total paid", { x: marginX + 10, y: currentY + 5, size: 13, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(formattedTotal, { x: marginX + 420, y: currentY + 5, size: 13, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        
        currentY -= 50;
        page.drawText("Payment details", { x: marginX, y: currentY, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        currentY -= 20;
        page.drawText("PAYMENT METHOD", { x: marginX, y: currentY, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        page.drawText("PAYMENT DATE", { x: marginX + 250, y: currentY, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        currentY -= 15;
        page.drawText(isPaid ? "Razorpay" : "Free Registration", { x: marginX, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(new Date().toLocaleString(), { x: marginX + 250, y: currentY, size: 11, font, color: rgb(0.2, 0.2, 0.2) });

        
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
