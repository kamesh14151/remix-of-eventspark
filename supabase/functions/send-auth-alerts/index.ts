import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // We expect { type: "signup" | "login", email: string, name?: string, loginTime?: string, ip?: string, browser?: string }
    const { type, email, name, loginTime, ip, browser } = payload;
    
    // If triggered by a Supabase webhook on the `users` table instead of direct fetch:
    // the payload might look like { type: "INSERT", table: "users", record: { email: ... } }
    let actionType = type;
    let targetEmail = email;
    let targetName = name || "there";

    if (payload.type === "INSERT") {
      actionType = "signup";
      targetEmail = payload.record.email;
      targetName = payload.record.raw_user_meta_data?.full_name || payload.record.raw_user_meta_data?.name || "there";
    }

    if (!targetEmail || !actionType) {
      return new Response(JSON.stringify({ error: "Missing email or type" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY.");
    }

    let subject = "";
    let htmlContent = "";

    if (actionType === "signup") {
      subject = "Welcome to EventSpark!";
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <body style="background-color: #ffffff; font-family: sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
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
              <hr style="border: 1px solid #E5E7EB; margin: 32px 0;" />
              <div style="margin-bottom: 16px;">
                <p style="font-size: 16px; color: #374151; margin: 0;">Questions? We're here to help!</p>
                <p style="font-size: 16px; color: #020304; font-weight: bold; margin: 0;">The EventSpark Team</p>
              </div>
              <div>
                <p style="font-size: 12px; color: #9CA3AF; margin: 0;">© ${new Date().getFullYear()} EventSpark</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (actionType === "login") {
      subject = "We've noticed a new login";
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <body style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="margin-bottom: 24px;">
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
              <hr style="border-color: #e5e7eb; margin: 32px 0;" />
              <div style="margin-bottom: 24px;">
                <p style="font-size: 16px; color: #000000; margin: 0 0 4px 0; line-height: 1.5;">Best regards,</p>
                <p style="font-size: 16px; color: #000000; font-weight: 600; margin: 0; line-height: 1.5;">The EventSpark Security Team</p>
              </div>
              <div>
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; line-height: 1.5;">© ${new Date().getFullYear()} EventSpark</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "EventSpark Security <onboarding@resend.dev>",
        to: targetEmail,
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendRes.json();
    return new Response(JSON.stringify(resendData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: resendRes.ok ? 200 : 400,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
