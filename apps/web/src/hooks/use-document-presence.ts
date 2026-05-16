import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { PresenceUser } from "@/features/documents/components/editor/editor-presence";
import { authSession } from "@/lib/auth-session";
import { resolveRealtimeSocketOrigin } from "@/api/client";

const AVATAR_COLORS = ["#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#2563EB", "#059669"];

type Peer = {
  userId: string;
  fullName: string;
  lastSeen: number;
};

let sharedSocket: Socket | null = null;

function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = authSession.getAccessToken();
  if (!token) return null;
  if (!sharedSocket) {
    sharedSocket = io(`${resolveRealtimeSocketOrigin()}/realtime`, {
      transports: ["websocket"],
      auth: { token },
      withCredentials: true,
    });
  }
  return sharedSocket;
}

export function useDocumentPresence(
  workspaceId: string,
  documentId: string,
  self: { userId: string; fullName: string },
): PresenceUser[] {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());

  useEffect(() => {
    if (!workspaceId || !documentId) return;
    const socket = getSocket();
    if (!socket) return;

    const upsert = (userId: string, fullName: string) => {
      setPeers((prev) => {
        const next = new Map(prev);
        next.set(userId, { userId, fullName, lastSeen: Date.now() });
        return next;
      });
    };

    const remove = (userId: string) => {
      setPeers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    const join = () => {
      socket.emit("room:join:document", {
        workspaceId,
        documentId,
        fullName: self.fullName,
      });
    };

    const onJoin = (p: { userId: string; fullName: string }) => {
      if (p.userId !== self.userId) upsert(p.userId, p.fullName);
    };
    const onLeave = (p: { userId: string }) => {
      remove(p.userId);
    };
    const onHeartbeat = (p: { userId: string; fullName: string }) => {
      if (p.userId !== self.userId) upsert(p.userId, p.fullName);
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("document:presence:join", onJoin);
    socket.on("document:presence:leave", onLeave);
    socket.on("document:presence:heartbeat", onHeartbeat);

    const interval = window.setInterval(() => {
      socket.emit("document:presence:heartbeat", {
        workspaceId,
        documentId,
        userId: self.userId,
        fullName: self.fullName,
      });
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      socket.off("connect", join);
      socket.off("document:presence:join", onJoin);
      socket.off("document:presence:leave", onLeave);
      socket.off("document:presence:heartbeat", onHeartbeat);
      socket.emit("room:leave:document", { workspaceId, documentId });
    };
  }, [workspaceId, documentId, self.userId, self.fullName]);

  return useMemo(() => {
    const list: PresenceUser[] = [
      {
        id: self.userId,
        fullName: self.fullName,
        color: AVATAR_COLORS[0],
        profileHref: "/settings/profile",
        roleLabel: "You",
        statusLabel: "Editing now",
      },
    ];
    let i = 1;
    for (const peer of peers.values()) {
      list.push({
        id: peer.userId,
        fullName: peer.fullName,
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        profileHref: `/w/${workspaceId}/members/user/${peer.userId}`,
        roleLabel: "Viewer",
        statusLabel: "Viewing now",
      });
      i += 1;
    }
    return list;
  }, [peers, self, workspaceId]);
}
