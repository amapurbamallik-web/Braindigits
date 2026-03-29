import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * usePresence — tracks which users are currently online using Supabase Realtime Presence.
 *
 * Usage:
 *   const onlineIds = usePresence(currentUserId);
 *   const isOnline = onlineIds.has(someUserId);
 */
export function usePresence(currentUserId: string | undefined): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    // Aggressively remove any lingering zombie channels with the same name BEFORE creating a new one.
    // This prevents React from crashing if the component unmounts and remounts rapidly.
    supabase.getChannels().forEach((c) => {
      if (c.topic === "realtime:braindigits:online" || c.topic === "braindigits:online") {
        supabase.removeChannel(c);
      }
    });

    // Create a shared presence channel for all users
    const channel = supabase.channel("braindigits:online", {
      config: { presence: { key: currentUserId } },
    });

    channelRef.current = channel;

    // When any user joins or leaves, rebuild the online set
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ user_id: string }>();
      const ids = new Set<string>();
      Object.values(state).forEach((presences) => {
        presences.forEach((p: any) => {
          if (p.user_id) ids.add(p.user_id);
        });
      });
      setOnlineIds(ids);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Broadcast own presence with user_id payload
        await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
      }
    });

    return () => {
      // Synchronous cleanup prevents race conditions
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return onlineIds;
}
