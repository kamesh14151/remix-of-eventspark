import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAILS = [
  "ajstudiozofficial@gmail.com",
  "kamesh14151@gmail.com",
  "kamez6592@gmail.com",
  "kamesh6592@gmail.com"
];

export interface AdminHost {
  id: string;
  email: string;
  fullName: string;
  company: string;
  companySlug: string;
  website: string;
  avatarUrl: string;
  createdAt: string;
  lastSignInAt: string;
  eventsCount: number;
  attendeesCount: number;
  revenue: number;
}

export interface AdminEvent {
  id: string;
  name: string;
  slug: string;
  status: "live" | "draft" | "past";
  userId: string;
  hostEmail: string;
  hostName: string;
  hostCompany: string;
  eventDate: string | null;
  eventEndDate: string | null;
  locationType: string | null;
  locationValue: string | null;
  ticketPrice: number;
  capacity: number | null;
  attendeeCount: number;
  revenue: number;
  createdAt: string;
  imageUrl: string | null;
}

export interface AdminAttendee {
  id: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  hostId?: string;
  hostEmail: string;
  hostName: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  status: string;
  createdAt: string;
  data: any;
  rawRecord?: any;
}

export interface AdminOverviewData {
  summary: {
    totalHosts: number;
    totalEvents: number;
    liveEvents: number;
    draftEvents: number;
    pastEvents: number;
    totalAttendees: number;
    totalRevenue: number;
  };
  hosts: AdminHost[];
  events: AdminEvent[];
  attendees: AdminAttendee[];
}

export function useIsAdmin() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const userEmail = (user.email || "").toLowerCase();
      if (ADMIN_EMAILS.includes(userEmail)) return true;

      // Check user_roles table
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAdminOverview() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return useQuery<AdminOverviewData>({
    queryKey: ["admin-overview", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Authentication required");

      const res = await fetch("/api/admin-overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email || "",
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch admin overview");
      }

      return res.json();
    },
    enabled: !!user && !!isAdmin,
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

export function useAdminDelete() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ action, targetId }: { action: "delete_attendee" | "delete_event" | "delete_host"; targetId: string }) => {
      if (!user) throw new Error("Authentication required");

      const res = await fetch("/api/admin-overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email || "",
        },
        body: JSON.stringify({
          action,
          targetId,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute deletion");
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
