import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, publicSupabase } from "@/integrations/supabase/client";
import { Tables, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type Registration = Tables<"registrations"> & {
  events?: { name: string } | null;
};

export function useRegistrations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["registrations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Fetch all events published by this host
      const { data: userEvents, error: evError } = await supabase
        .from("events")
        .select("id, name")
        .eq("user_id", user.id);

      if (evError) throw evError;
      const eventIds = (userEvents || []).map((e) => e.id);
      if (eventIds.length === 0) return [];

      // 2. Query registrations strictly for this host's published events
      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(name)")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Registration[];
    },
    enabled: !!user,
  });
}

export function useRegistrationsByEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["registrations", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"registrations">[];
    },
    enabled: !!eventId,
  });
}

export function useCreateRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ event_id, data }: { event_id: string; data: Record<string, string> }) => {
      const { data: result, error } = await publicSupabase
        .rpc("register_for_event", {
          p_event_id: event_id,
          p_data: data as unknown as Json,
        });
      if (error) {
        throw error;
      }
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registrations"] }),
  });
}

export function useDeleteRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("registrations")
        .delete()
        .eq("id", registrationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registrations"] }),
  });
}

export function useRegistrationStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["registration-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { total: 0, activeEvents: 0, chartData: [], registrations: [], events: [] };
      }

      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, name, status")
        .eq("user_id", user.id);

      if (eventsError) throw eventsError;
      const eventIds = (events || []).map((e) => e.id);

      if (eventIds.length === 0) {
        return { total: 0, activeEvents: 0, chartData: [], registrations: [], events: [] };
      }

      const { data: registrations, error } = await supabase
        .from("registrations")
        .select("created_at, event_id, status")
        .in("event_id", eventIds);

      if (error) throw error;

      const total = registrations?.length ?? 0;
      const activeEvents = events?.filter((e) => e.status === "live").length ?? 0;

      // Group by month
      const byMonth: Record<string, number> = {};
      registrations?.forEach((r) => {
        const month = new Date(r.created_at).toLocaleString("default", { month: "short" });
        byMonth[month] = (byMonth[month] || 0) + 1;
      });

      const chartData = Object.entries(byMonth).map(([date, registrations]) => ({ date, registrations }));

      return { total, activeEvents, chartData, registrations, events };
    },
    enabled: !!user,
  });
}
