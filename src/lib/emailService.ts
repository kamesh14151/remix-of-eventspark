export interface EmailAttendee {
  name: string;
  email: string;
}

export interface SendManualEmailOptions {
  type: "announcement" | "registration" | "custom";
  recipients: EmailAttendee[];
  subject?: string;
  message?: string;
  event: {
    id?: string;
    name: string;
    event_date?: string | null;
    event_end_date?: string | null;
    timezone?: string | null;
    location_type?: string | null;
    location_value?: string | null;
    background_image_url?: string | null;
    description?: string | null;
    ticket_price?: number | null;
    team_pricing?: string | null;
    profiles?: any;
  };
  hostName?: string;
}

export async function sendManualEmail({
  type,
  recipients,
  subject,
  message,
  event,
  hostName,
}: SendManualEmailOptions): Promise<{ success: boolean; sentCount: number; message?: string }> {
  if (!recipients || recipients.length === 0) {
    throw new Error("No recipients specified");
  }

  const emails = recipients.map(r => r.email).filter(Boolean);
  if (emails.length === 0) {
    throw new Error("No valid email addresses found for recipients");
  }

  const payload = {
    type,
    emails,
    email: emails[0],
    name: recipients.length === 1 ? recipients[0].name : "Attendee",
    subject,
    message,
    eventTitle: event.name,
    eventDate: event.event_date ? new Date(event.event_date).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: event.timezone || "America/New_York",
    }) : undefined,
    eventLocation: event.location_type === "physical" ? "In-Person" : event.location_type === "hybrid" ? "Hybrid" : "Virtual",
    venueDetails: event.location_value || "",
    flyerUrl: event.background_image_url,
    hostName: hostName || (event as any).profiles?.company || (event as any).profiles?.full_name || "Crack",
  };

  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      // If in dev and the server returned an error (e.g. no Vercel function server running)
      if (import.meta.env.DEV) {
        console.warn("[DEV MODE] /api/send-email returned an error or is not running on dev port. Simulating success:", errData);
        return {
          success: true,
          sentCount: emails.length,
          message: "Simulated sending in development mode",
        };
      }
      throw new Error(errData.error || errData.message || `Failed to send email (${res.status})`);
    }

    const data = await res.json().catch(() => ({ success: true, sentCount: emails.length }));
    return {
      success: true,
      sentCount: data.sentCount || emails.length,
      message: data.message,
    };
  } catch (err: any) {
    // If in dev environment and fetch failed (e.g., 404 or connection refused)
    if (import.meta.env.DEV) {
      console.warn("[DEV MODE] Network error reaching /api/send-email. Simulating success:", err);
      return {
        success: true,
        sentCount: emails.length,
        message: "Simulated sending in development mode",
      };
    }
    throw err;
  }
}
