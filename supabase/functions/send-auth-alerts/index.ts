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
      subject = "Welcome to Crack!";
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <body style="background-color: #ffffff; font-family: sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <img src="https://events.ajstudioz.co.in/crack-logo.png" alt="Crack Logo" width="48" height="48" style="display: block; margin: 0 auto 16px auto; border-radius: 8px;" />
                <h1 style="font-size: 32px; font-weight: bold; color: #020304; margin: 0 0 16px;">
                  Welcome to Crack
                </h1>
                <p style="font-size: 18px; color: #374151; margin: 0;">
                  Hi ${targetName}!
                </p>
              </div>
              <div style="margin-bottom: 32px;">
                <p style="font-size: 16px; color: #374151; line-height: 24px; margin: 0 0 16px;">
                  Thank you for creating an account with Crack. We're excited to have you on board!
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
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 8px;">
                      <img src="https://events.ajstudioz.co.in/Crack.png" alt="Crack" height="20" style="height: 20px; max-height: 20px; display: inline-block; vertical-align: middle; border: 0;" />
                    </td>
                    <td style="vertical-align: middle; font-size: 11px; font-weight: 700; color: #9CA3AF; padding-right: 8px;">
                      BY
                    </td>
                    <td style="vertical-align: middle; padding-right: 6px;">
                      <img src="https://events.ajstudioz.co.in/aj-logo.png" alt="AJ STUDIOZ" height="18" style="height: 18px; max-height: 18px; display: inline-block; vertical-align: middle; border: 0;" />
                    </td>
                    <td style="vertical-align: middle; font-size: 12px; font-weight: 700; color: #374151;">
                      AJ STUDIOZ
                    </td>
                  </tr>
                </table>
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
                <img src="https://events.ajstudioz.co.in/crack-logo.png" alt="Crack Logo" width="48" height="48" style="display: block; margin: 0 0 16px 0; border-radius: 8px;" />
                <h1 style="font-size: 32px; font-weight: 600; color: #000000; margin: 0 0 24px 0; line-height: 1.2;">
                  We've noticed a new login
                </h1>
                <p style="font-size: 16px; color: #000000; margin: 0 0 16px 0; line-height: 1.5;">
                  Hi ${targetName},
                </p>
                <p style="font-size: 16px; color: #000000; margin: 0 0 16px 0; line-height: 1.5;">
                  This is a routine security alert. Someone logged into your Crack account from a new IP address or device:
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
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 8px;">
                      <img src="https://events.ajstudioz.co.in/Crack.png" alt="Crack" height="20" style="height: 20px; max-height: 20px; display: inline-block; vertical-align: middle; border: 0;" />
                    </td>
                    <td style="vertical-align: middle; font-size: 11px; font-weight: 700; color: #9CA3AF; padding-right: 8px;">
                      BY
                    </td>
                    <td style="vertical-align: middle; padding-right: 6px;">
                      <img src="https://events.ajstudioz.co.in/aj-logo.png" alt="AJ STUDIOZ" height="18" style="height: 18px; max-height: 18px; display: inline-block; vertical-align: middle; border: 0;" />
                    </td>
                    <td style="vertical-align: middle; font-size: 12px; font-weight: 700; color: #374151;">
                      AJ STUDIOZ
                    </td>
                  </tr>
                </table>
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
        from: "Crack Security <onboarding@resend.dev>",
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
