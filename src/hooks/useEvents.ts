import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, publicSupabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type Event = Tables<"events">;

export function useEvents(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["events", user?.id, search],
    queryFn: async () => {
      // Try RPC first for team member support
      try {
        const { data, error } = await supabase
          .rpc("get_accessible_events", { p_search: search ?? null });
        if (!error && Array.isArray(data)) return data as Event[];
      } catch (err) {
        console.warn("get_accessible_events RPC failed, falling back to direct query:", err);
      }

      // Resilient fallback: direct query scoped to user
      let query = supabase.from("events").select("*");
      if (user?.id) {
        query = query.eq("user_id", user.id);
      }
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Event[];
    },
    enabled: !!user,
    retry: 1,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Event;
    },
    enabled: !!id,
    retry: 1,
  });
}

export function useEventBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["event-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const normalizedSlug = slug.trim().toLowerCase().replace(/\/+$/, "");

      // 1. Try exact match (case-insensitive) using lightweight publicSupabase client
      let { data: event, error } = await publicSupabase
        .from("events")
        .select("*")
        .ilike("slug", normalizedSlug)
        .eq("status", "live")
        .maybeSingle();

      if (error) {
        console.warn("Exact slug query error:", error);
      }

      // 2. Fallback: prefix match in case the URL had trailing chars truncated or missing
      // (e.g. user visited sonathon-2-o-vqt07 when database slug is sonathon-2-o-vqt07j)
      if (!event && normalizedSlug.length >= 4) {
        const { data: prefixEvents } = await publicSupabase
          .from("events")
          .select("*")
          .ilike("slug", `${normalizedSlug}%`)
          .eq("status", "live")
          .order("created_at", { ascending: false })
          .limit(1);

        if (prefixEvents && prefixEvents.length > 0) {
          event = prefixEvents[0];
        }
      }

      // No live event found for this slug
      if (!event) return null;

      let hostProfile = null;
      if (event.user_id) {
        try {
          const { data: profileData } = await publicSupabase
            .from("profiles")
            .select("company, full_name")
            .eq("id", event.user_id)
            .maybeSingle();
          hostProfile = profileData;
        } catch (e) {
          console.warn("Host profile lookup error:", e);
        }
      }

      return { ...event, profiles: hostProfile } as Event & { profiles?: { company: string | null; full_name: string | null } };
    },
    enabled: !!slug,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 8);
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      event_date?: string;
      event_end_date?: string;
      timezone?: string;
      event_type?: string;
      template?: string;
      location_type?: string;
      location_value?: string;
      ticket_price?: number;
      requires_approval?: boolean;
      capacity?: number;
      max_team_size?: number;
      team_pricing?: string;
      status?: string;
    }) => {
      const slug = generateSlug(input.name);
      const { data, error } = await supabase.from("events").insert({
        ...input,
        slug,
        user_id: user!.id,
        status: input.status || "live",
      } as any).select().single();
      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"events"> & { id: string }) => {
      const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Event;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event", data.id] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
