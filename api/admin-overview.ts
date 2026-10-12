import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const ADMIN_EMAILS = [
  "ajstudiozofficial@gmail.com",
  "kamesh14151@gmail.com",
  "kamez6592@gmail.com",
  "kamesh6592@gmail.com"
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase service configuration missing" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Authorize: check if requesting user is an admin
    const requesterEmail = (req.body?.userEmail || req.query?.userEmail || req.headers["x-user-email"] || "").toString().toLowerCase().trim();
    const requesterId = (req.body?.userId || req.query?.userId || "").toString().trim();

    let isAuthorized = false;

    if (requesterEmail && ADMIN_EMAILS.includes(requesterEmail)) {
      isAuthorized = true;
    } else if (requesterId) {
      // Check user_roles table for admin role
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", requesterId)
        .eq("role", "admin")
        .maybeSingle();

      if (roleData) {
        isAuthorized = true;
      }
    }

    // Also check Bearer token if provided
    const authHeader = req.headers.authorization;
    if (!isAuthorized && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        isAuthorized = true;
      } else if (user?.id) {
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleData) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    // 2. Fetch all system data using Service Role
    const [usersRes, profilesRes, eventsRes, registrationsRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("events").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("registrations").select("*").order("created_at", { ascending: false }),
    ]);

    const users = usersRes.data?.users || [];
    const profiles = profilesRes.data || [];
    const events = eventsRes.data || [];
    const registrations = registrationsRes.data || [];

    // Map profiles by ID
    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.id, p));

    // Map users by ID
    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, u));

    // Calculate registrations per event
    const eventRegCountMap = new Map();
    const eventRevenueMap = new Map();

    events.forEach(e => {
      eventRegCountMap.set(e.id, 0);
      eventRevenueMap.set(e.id, 0);
    });

    registrations.forEach(r => {
      const current = eventRegCountMap.get(r.event_id) || 0;
      eventRegCountMap.set(r.event_id, current + 1);

      // Check payment in data
      const data = r.data || {};
      const amount = Number(data.razorpay_amount || 0);
      if (amount > 0) {
        eventRevenueMap.set(r.event_id, (eventRevenueMap.get(r.event_id) || 0) + (amount / 100));
      }
    });

    // Compute metrics for hosts
    const hostsList = users.map(u => {
      const prof = profileMap.get(u.id) || {};
      const hostEvents = events.filter(e => e.user_id === u.id);
      const totalAttendees = hostEvents.reduce((acc, ev) => acc + (eventRegCountMap.get(ev.id) || 0), 0);
      const totalRevenue = hostEvents.reduce((acc, ev) => acc + (eventRevenueMap.get(ev.id) || 0), 0);

      return {
        id: u.id,
        email: u.email || "",
        fullName: prof.full_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "Host",
        company: prof.company || "Independent Host",
        companySlug: prof.company_slug || "",
        website: prof.website || "",
        avatarUrl: prof.avatar_url || "",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || u.created_at,
        eventsCount: hostEvents.length,
        attendeesCount: totalAttendees,
        revenue: totalRevenue,
      };
    }).sort((a, b) => b.eventsCount - a.eventsCount || b.attendeesCount - a.attendeesCount);

    // Compute detailed events list
    const eventsList = events.map(e => {
      const hostUser = userMap.get(e.user_id);
      const prof = profileMap.get(e.user_id);
      const regCount = eventRegCountMap.get(e.id) || 0;
      const revenue = eventRevenueMap.get(e.id) || 0;

      return {
        id: e.id,
        name: e.name,
        slug: e.slug,
        status: e.status,
        userId: e.user_id,
        hostEmail: hostUser?.email || "Unknown",
        hostName: prof?.full_name || hostUser?.user_metadata?.full_name || hostUser?.email?.split("@")[0] || "Host",
        hostCompany: prof?.company || "Independent Host",
        eventDate: e.event_date,
        eventEndDate: e.event_end_date,
        locationType: e.location_type,
        locationValue: e.location_value,
        ticketPrice: e.ticket_price || 0,
        capacity: e.capacity || null,
        attendeeCount: regCount,
        revenue: revenue,
        createdAt: e.created_at,
        imageUrl: e.background_image_url || null,
      };
    });

    // Helper to find data fields
    const getField = (data: any, keys: string[]) => {
      if (!data) return "";
      for (const k of keys) {
        if (data[k]) return data[k];
        const found = Object.keys(data).find(dk => dk.toLowerCase().trim() === k.toLowerCase());
        if (found && data[found]) return data[found];
      }
      return "";
    };

    // Compute global attendees list
    const attendeesList = registrations.map(r => {
      const ev = events.find(e => e.id === r.event_id);
      const hostUser = ev ? userMap.get(ev.user_id) : null;
      const prof = ev ? profileMap.get(ev.user_id) : null;
      const data = r.data || {};

      const name = getField(data, ["Full Name", "Attendee Name", "Name", "Student Name", "Team Lead Name"]) || "Attendee";
      const email = getField(data, ["Email Address", "Email", "email", "Email address"]) || "";
      const phone = getField(data, ["Phone Number", "Phone", "Mobile", "Contact", "Whatsapp"]) || "";
      const college = getField(data, ["College", "Institution", "University", "College / Institute"]) || "";
      const department = getField(data, ["Department", "Branch", "Dept"]) || "";

      return {
        id: r.id,
        eventId: r.event_id,
        eventName: ev?.name || "Deleted Event",
        eventSlug: ev?.slug || "",
        hostEmail: hostUser?.email || "Unknown",
        hostName: prof?.full_name || hostUser?.email?.split("@")[0] || "Host",
        name,
        email,
        phone,
        college,
        department,
        status: r.status,
        createdAt: r.created_at,
        data: r.data,
      };
    });

    // Compute overall platform summary
    const totalRevenue = eventsList.reduce((acc, ev) => acc + (ev.revenue || 0), 0);

    const summary = {
      totalHosts: users.length,
      totalEvents: events.length,
      liveEvents: events.filter(e => e.status === "live").length,
      draftEvents: events.filter(e => e.status === "draft").length,
      pastEvents: events.filter(e => e.status === "past").length,
      totalAttendees: registrations.length,
      totalRevenue: totalRevenue,
    };

    return res.status(200).json({
      success: true,
      summary,
      hosts: hostsList,
      events: eventsList,
      attendees: attendeesList,
    });
  } catch (error: any) {
    console.error("Admin overview API error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch admin overview" });
  }
}
