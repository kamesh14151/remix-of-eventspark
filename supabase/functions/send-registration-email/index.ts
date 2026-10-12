import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  try {
    // 1. Verify this is a POST request
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 2. Parse the webhook payload
    const payload = await req.json();
    console.log("Webhook payload:", payload);

    // Ensure it's an INSERT operation on registrations
    if (payload.type !== "INSERT" || payload.table !== "registrations") {
      return new Response("Not a new registration", { status: 200 });
    }

    const registration = payload.record;
    
    // We need the attendee email from the formData. 
    // In our app, fields vary, but commonly "Email Address", "Email", or "email".
    let attendeeEmail = "";
    if (registration.data) {
      // Find the first key that looks like an email field
      const emailKey = Object.keys(registration.data).find(k => 
        k.toLowerCase().includes("email")
      );
      if (emailKey) {
        attendeeEmail = registration.data[emailKey];
      }
    }

    if (!attendeeEmail) {
      console.log("No email found in registration data, skipping.");
      return new Response("No email found", { status: 200 });
    }

    // 3. Fetch Event Details using Supabase Admin Client
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("name, event_date, location_type, location_value")
      .eq("id", registration.event_id)
      .single();

    if (eventError || !event) {
      throw new Error(`Failed to fetch event: ${eventError?.message}`);
    }

    // 4. Send Email via Resend API
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY.");
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // NOTE: You must verify your domain in Resend and use it here (e.g. events@yourdomain.com)
        // Using onboarding@resend.dev only works if you send to the email you signed up with.
        from: "Crack <onboarding@resend.dev>",
        to: attendeeEmail,
        subject: `Registration Confirmed: ${event.name}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
            <h2>You're registered for ${event.name}!</h2>
            <p>Thank you for registering. We look forward to seeing you.</p>
            ${event.event_date ? `<p><strong>Date:</strong> ${new Date(event.event_date).toLocaleString()}</p>` : ""}
            ${event.location_value ? `<p><strong>Location/Link:</strong> ${event.location_value}</p>` : ""}
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eaeaea; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 8px;">
                    <img src="https://events.ajstudioz.co.in/Crack.png" alt="Crack" height="20" style="height: 20px; max-height: 20px; display: inline-block; vertical-align: middle; border: 0;" />
                  </td>
                  <td style="vertical-align: middle; font-size: 11px; font-weight: 700; color: #9CA3AF; padding-right: 8px;">
                    BY
                  </td>
                  <td style="vertical-align: middle;">
                    <img src="https://events.ajstudioz.co.in/aj-logo.png" alt="AJ STUDIOZ" height="18" style="height: 18px; max-height: 18px; display: inline-block; vertical-align: middle; border: 0;" />
                  </td>
                </tr>
              </table>
            </div>
          </div>
        `,
      }),
    });

    const resendData = await resendRes.json();
    console.log("Resend response:", resendData);

    return new Response(JSON.stringify(resendData), {
      headers: { "Content-Type": "application/json" },
      status: resendRes.ok ? 200 : 400,
    });
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
