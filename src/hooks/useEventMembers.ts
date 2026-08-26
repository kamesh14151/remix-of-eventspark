import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EventMember = {
  id: string;
  event_id: string;
  user_id: string;
  invited_by: string | null;
  created_at: string;
  email?: string; // joined from profiles / auth
};

export function useEventMembers(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-members", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_members")
        .select("*")
        .eq("event_id", eventId!);
      if (error) throw error;

      // Fetch emails for each member via profiles
      const members = data ?? [];
      const userIds = members.map((m) => m.user_id);

      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        profiles?.forEach((p) => {
          emailMap[p.id] = p.full_name || p.id.slice(0, 8) + "…";
        });
      }

      return members.map((m) => ({
        ...m,
        email: emailMap[m.user_id] || m.user_id.slice(0, 8) + "…",
      })) as EventMember[];
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, email }: { eventId: string; email: string }) => {
      const { data, error } = await supabase.rpc("invite_member_to_event", {
        p_event_id: eventId,
        p_email: email,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["event-members", variables.eventId] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { error } = await supabase.rpc("remove_event_member", {
        p_event_id: eventId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["event-members", variables.eventId] });
    },
  });
}
