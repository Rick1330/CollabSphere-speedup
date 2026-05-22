import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

import { MermaidBlock } from "@/features/documents/editor-extensions/mermaid-block";
import { MathBlock } from "@/features/documents/editor-extensions/math-block";
import { CalloutBlock } from "@/features/documents/editor-extensions/callout-block";
import { SectionBlock } from "@/features/documents/editor-extensions/section-block";
import { TOCBlock } from "@/features/documents/editor-extensions/toc-block";
import { CoverPageBlock } from "@/features/documents/editor-extensions/cover-page-block";
import { PageBreakBlock } from "@/features/documents/editor-extensions/page-break-block";
import { CommentAnchorExtension } from "@/features/documents/editor-extensions/comment-anchor-extension";
import type { PresenceUser } from "@/features/documents/components/editor/editor-presence";
import { prepareDocumentCollabBootstrap } from "@/features/documents/collab/collab-bootstrap";
import { renderCursor } from "@/editor/cursor-render";
import { normalizeCollabWsUrl, resolveCollabWsUrlFromEnv } from "@/lib/collab-ws-url";

export type CollabPointer = {
  x: number;
  y: number;
  visible: boolean;
};

export type AwarenessClientSnapshot = {
  clientId: number;
  isLocal: boolean;
  hasCursor: boolean;
  hasUser: boolean;
  hasPointer: boolean;
  userName: string | null;
  userColor: string | null;
  pointer: CollabPointer | null;
};

type Status = "connecting" | "connected" | "synced" | "offline" | "error" | "auth_failed";

const COLORS = [
  "#0D9488",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#059669",
  "#0F766E",
  "#1D4ED8",
] as const;

export function generateUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % COLORS.length;
  return COLORS[idx];
}

const CONNECT_TIMEOUT_MS = 15_000;

/** Wait for Strict Mode fake unmount cleanup before opening the WebSocket. */
function deferPastStrictModeUnmount(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function destroyProvider(provider: HocuspocusProvider): void {
  try {
    provider.awareness?.setLocalState(null);
  } catch {
    // ignore
  }
  try {
    provider.disconnect();
  } catch {
    // ignore teardown races
  }
  const maybeDestroy = (provider as { destroy?: () => void }).destroy;
  if (typeof maybeDestroy === "function") {
    try {
      maybeDestroy.call(provider);
    } catch {
      // ignore
    }
  }
}

function setProviderAwarenessUser(
  provider: HocuspocusProvider,
  user: { id: string; fullName: string; avatarUrl?: string | null },
): void {
  provider.setAwarenessField("user", {
    id: user.id,
    name: user.fullName,
    color: generateUserColor(user.id),
    avatarUrl: user.avatarUrl ?? null,
  });
}

function setProviderAwarenessPointer(
  provider: HocuspocusProvider,
  pointer: CollabPointer | null,
): void {
  provider.setAwarenessField("pointer", pointer);
}

const POINTER_THROTTLE_MS = 50;

function collabCursorUser(user: { id: string; fullName: string }) {
  return {
    id: user.id,
    name: user.fullName,
    color: generateUserColor(user.id),
  };
}

function toPresenceUser(input: {
  userId: string;
  fullName: string;
  color: string;
  avatarUrl?: string | null;
  workspaceId: string;
  isCurrentUser?: boolean;
}): PresenceUser & { isCurrentUser?: boolean } {
  return {
    id: input.userId,
    fullName: input.fullName,
    color: input.color,
    profileHref: input.isCurrentUser ? "/settings/profile" : `/w/${input.workspaceId}/members/user/${input.userId}`,
    roleLabel: input.isCurrentUser ? "You" : "Collaborator",
    statusLabel: input.isCurrentUser ? "Editing now" : "Viewing now",
    isCurrentUser: input.isCurrentUser,
  };
}

function collectOnlineUsersFromAwareness(
  provider: HocuspocusProvider,
  currentUserId: string,
  workspaceId: string,
): (PresenceUser & { isCurrentUser?: boolean })[] {
  const states = provider.awareness?.getStates?.() ?? new Map();
  const list: (PresenceUser & { isCurrentUser?: boolean })[] = [];
  for (const state of states.values()) {
    const u = (state as { user?: { id?: string; name?: string; color?: string; avatarUrl?: string | null } })
      ?.user;
    if (!u || typeof u !== "object") continue;
    const id = typeof u.id === "string" ? u.id : "";
    const name = typeof u.name === "string" ? u.name : "";
    if (!id || !name) continue;
    const color = typeof u.color === "string" && u.color ? u.color : generateUserColor(id);
    const avatarUrl = typeof u.avatarUrl === "string" ? u.avatarUrl : null;
    const isCurrentUser = id === currentUserId;
    list.push(
      toPresenceUser({
        userId: id,
        fullName: name,
        color,
        avatarUrl,
        workspaceId,
        isCurrentUser,
      }),
    );
  }
  if (import.meta.env.DEV) {
    console.debug("[collab] awareness states", {
      count: states.size,
      users: list.map((u) => ({ id: u.id, name: u.fullName })),
    });
  }
  return list;
}

export function buildAwarenessSnapshot(provider: HocuspocusProvider): AwarenessClientSnapshot[] {
  const awareness = provider.awareness;
  if (!awareness) return [];
  const localClientId = awareness.clientID;
  const entries: AwarenessClientSnapshot[] = [];
  for (const [clientId, state] of awareness.getStates()) {
    const typed = state as {
      cursor?: unknown;
      pointer?: CollabPointer | null;
      user?: { name?: string; color?: string; id?: string };
    };
    const name = typed.user?.name;
    const userId = typed.user?.id;
    const userColor =
      typeof typed.user?.color === "string" && typed.user.color
        ? typed.user.color
        : userId
          ? generateUserColor(userId)
          : null;
    const pointer = typed.pointer;
    const hasPointer =
      pointer != null &&
      typeof pointer === "object" &&
      pointer.visible === true &&
      typeof pointer.x === "number" &&
      typeof pointer.y === "number";
    entries.push({
      clientId,
      isLocal: clientId === localClientId,
      hasCursor: typed.cursor != null,
      hasUser: typed.user != null,
      hasPointer,
      userName: typeof name === "string" ? name : null,
      userColor,
      pointer: hasPointer ? pointer : null,
    });
  }
  return entries;
}

function logAwarenessCursorsDev(provider: HocuspocusProvider): void {
  if (!import.meta.env.DEV) return;
  console.debug("[collab] awareness cursors", buildAwarenessSnapshot(provider));
}

type CollabSession = {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
};

const EDITOR_PROSE_CLASS = [
  "tiptap",
  "prose prose-stone max-w-none",
  "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-stone-900",
  "prose-p:leading-relaxed prose-p:text-stone-700",
  "prose-a:text-teal-600 prose-a:no-underline hover:prose-a:underline",
  "prose-strong:text-stone-900",
  "prose-code:text-teal-700 prose-code:bg-stone-100",
  "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-medium",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-blockquote:border-l-4 prose-blockquote:border-l-teal-500 prose-blockquote:not-italic",
  "prose-blockquote:text-stone-600 prose-blockquote:font-normal",
  "prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-pre:rounded-lg",
  "prose-li:marker:text-stone-400",
  "prose-hr:border-stone-200",
  "focus:outline-none min-h-[60vh]",
].join(" ");

function buildEditorExtensions(
  collabSession: CollabSession | null,
  user: { id: string; fullName: string },
) {
  const extensions: any[] = [
    (StarterKit as any).configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      history: false,
      gapcursor: false,
      codeBlock: {
        HTMLAttributes: {
          class:
            "not-prose rounded-lg bg-stone-900 text-stone-100 p-4 text-sm font-mono overflow-x-auto",
        },
      },
    }),
    Gapcursor as any,
  ];

  if (collabSession) {
    extensions.push(
      Collaboration.configure({ document: collabSession.provider.document }),
      CollaborationCursor.configure({
        provider: collabSession.provider,
        user: collabCursorUser(user),
        render: renderCursor as any,
      }),
    );
  }

  extensions.push(
    Underline as any,
    (Link as any).configure({
      openOnClick: false,
      HTMLAttributes: { class: "text-teal-600 hover:underline cursor-pointer" },
    }),
    (Placeholder as any).configure({
      placeholder: ({ node }: { node: { type: { name: string } } }) => {
        if (node.type.name === "heading") return "Heading";
        return "Start writing, or press / for commands…";
      },
    }),
    (Table as any).configure({
      resizable: true,
      HTMLAttributes: { class: "w-full border-collapse my-4 text-sm rounded-md overflow-hidden" },
    }),
    TableRow as any,
    (TableHeader as any).configure({
      HTMLAttributes: {
        class:
          "bg-stone-100 text-left font-semibold text-stone-800 px-3 py-2 border border-stone-200",
      },
    }),
    (TableCell as any).configure({
      HTMLAttributes: { class: "px-3 py-2 border border-stone-200 align-top" },
    }),
    MermaidBlock,
    MathBlock,
    CalloutBlock,
    SectionBlock,
    TOCBlock,
    CoverPageBlock,
    PageBreakBlock,
    CommentAnchorExtension,
  );

  return extensions;
}

export function useCollaborativeDocumentEditor(input: {
  workspaceId: string;
  documentId: string;
  user: { id: string; fullName: string; avatarUrl?: string | null };
  readOnly: boolean;
  properties?: any;
  /** Writing column root for remote mouse pointer overlay (0..1 coordinates). */
  pointerRootRef?: RefObject<HTMLElement | null>;
}) {
  const { workspaceId, documentId, user, readOnly, properties = {}, pointerRootRef } = input;

  const [status, setStatus] = useState<Status>("connecting");
  const [onlineUsers, setOnlineUsers] = useState<(PresenceUser & { isCurrentUser?: boolean })[]>([]);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [collabSession, setCollabSession] = useState<CollabSession | null>(null);
  const [awarenessSnapshot, setAwarenessSnapshot] = useState<AwarenessClientSnapshot[]>([]);

  const sessionKeyRef = useRef("");
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const collabExtensionsReadyRef = useRef(false);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootstrapGenerationRef = useRef(0);
  const authRetryPendingRef = useRef(false);
  const refreshCollabTokenRef = useRef<(options: { reconnect: boolean }) => Promise<void>>(
    async () => {},
  );

  const sessionKey = `${workspaceId}:${documentId}`;

  const clearConnectTimeout = () => {
    if (connectTimeoutRef.current != null) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };

  const clearTokenRefreshTimer = () => {
    if (tokenRefreshTimerRef.current != null) {
      window.clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
  };

  const scheduleTokenRefresh = (expiresInSeconds: number) => {
    clearTokenRefreshTimer();
    if (expiresInSeconds <= 0) return;
    const refreshMs = Math.max(30_000, (expiresInSeconds - 60) * 1000);
    tokenRefreshTimerRef.current = window.setTimeout(() => {
      void refreshCollabTokenRef.current({ reconnect: false });
    }, refreshMs);
  };

  const refreshCollabToken = async (options: { reconnect: boolean }) => {
    const provider = providerRef.current;
    if (!provider || !workspaceId || !documentId) return;

    try {
      const bootstrap = await prepareDocumentCollabBootstrap({ workspaceId, documentId });
      if (!bootstrap.token) {
        authRetryPendingRef.current = false;
        setStatus("auth_failed");
        return;
      }

      const resolvedUrl =
        normalizeCollabWsUrl(bootstrap.hocuspocusUrl) ??
        normalizeCollabWsUrl(import.meta.env.VITE_COLLAB_WS_URL) ??
        resolveCollabWsUrlFromEnv();

      provider.setConfiguration({
        url: resolvedUrl,
        token: bootstrap.token,
      });
      setProviderAwarenessUser(provider, user);
      scheduleTokenRefresh(bootstrap.expiresInSeconds);

      if (!options.reconnect) {
        return;
      }

      setStatus("connecting");
      clearConnectTimeout();
      connectTimeoutRef.current = window.setTimeout(() => {
        setStatus((s) => {
          if (s !== "connecting") return s;
          if (import.meta.env.DEV) {
            console.error(
              "[collab] reconnect timed out — check collab server (curl http://127.0.0.1:3002/health)",
            );
          }
          return "error";
        });
      }, CONNECT_TIMEOUT_MS);

      try {
        provider.disconnect();
      } catch {
        // ignore teardown races
      }

      await deferPastStrictModeUnmount();
      try {
        await provider.connect();
      } finally {
        authRetryPendingRef.current = false;
      }
    } catch (error) {
      authRetryPendingRef.current = false;
      console.error("[collab] token refresh failed", error);
      if (options.reconnect) {
        clearConnectTimeout();
        setStatus("auth_failed");
      }
    }
  };

  refreshCollabTokenRef.current = refreshCollabToken;

  const teardownCollabSession = () => {
    clearConnectTimeout();
    clearTokenRefreshTimer();
    collabExtensionsReadyRef.current = false;
    setCollabSession(null);
    setAwarenessSnapshot([]);
    if (providerRef.current) {
      destroyProvider(providerRef.current);
      providerRef.current = null;
    }
    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
      } catch {
        // ignore
      }
      ydocRef.current = null;
    }
  };

  useEffect(() => {
    if (!workspaceId || !documentId) {
      teardownCollabSession();
      sessionKeyRef.current = "";
      authRetryPendingRef.current = false;
      setOnlineUsers([]);
      setStatus("offline");
      return;
    }

    if (sessionKeyRef.current !== sessionKey) {
      collabExtensionsReadyRef.current = false;
      teardownCollabSession();
      sessionKeyRef.current = sessionKey;
      bootstrapGenerationRef.current += 1;
      setSessionVersion((n) => n + 1);
      setStatus("connecting");
    }
  }, [sessionKey, workspaceId, documentId]);

  useEffect(() => {
    const provider = providerRef.current;
    if (!provider || !workspaceId || !documentId) return;

    const updateAwareness = () => {
      setAwarenessSnapshot(buildAwarenessSnapshot(provider));
      if (collabSession?.provider === provider) {
        setOnlineUsers(collectOnlineUsersFromAwareness(provider, user.id, workspaceId));
      }
      logAwarenessCursorsDev(provider);
    };

    const awareness = provider.awareness;
    awareness?.on("change", updateAwareness);
    updateAwareness();

    return () => {
      awareness?.off("change", updateAwareness);
    };
  }, [collabSession, sessionKey, user.id, workspaceId, documentId]);

  // v3: fetch token first, then create Y.Doc + provider with token+URL at construction.
  useEffect(() => {
    if (!workspaceId || !documentId) return;

    const generation = bootstrapGenerationRef.current;
    let alive = true;

    void (async () => {
      try {
        const bootstrap = await prepareDocumentCollabBootstrap({ workspaceId, documentId });
        if (!alive || bootstrapGenerationRef.current !== generation) return;

        if (!bootstrap.token) {
          setStatus("auth_failed");
          return;
        }

        const resolvedUrl =
          normalizeCollabWsUrl(bootstrap.hocuspocusUrl) ??
          normalizeCollabWsUrl(import.meta.env.VITE_COLLAB_WS_URL) ??
          resolveCollabWsUrlFromEnv();

        await deferPastStrictModeUnmount();
        if (!alive || bootstrapGenerationRef.current !== generation) return;

        if (providerRef.current) {
          destroyProvider(providerRef.current);
          providerRef.current = null;
        }
        if (ydocRef.current) {
          try {
            ydocRef.current.destroy();
          } catch {
            // ignore
          }
          ydocRef.current = null;
        }

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        const provider = new HocuspocusProvider({
          url: resolvedUrl,
          name: `doc:${documentId}`,
          document: ydoc,
          token: bootstrap.token,
          autoConnect: false,
          onConnect: () => {
            clearConnectTimeout();
            if (import.meta.env.DEV) {
              console.info("[collab] provider connect", { documentId, workspaceId });
            }
            setStatus("connected");
          },
          onSynced: () => {
            clearConnectTimeout();
            authRetryPendingRef.current = false;
            if (import.meta.env.DEV) {
              console.info("[collab] provider synced", { documentId, workspaceId });
            }
            setStatus("synced");
            const activeYdoc = ydocRef.current;
            const activeProvider = providerRef.current;
            if (
              activeYdoc &&
              activeProvider &&
              !collabExtensionsReadyRef.current &&
              bootstrapGenerationRef.current === generation
            ) {
              collabExtensionsReadyRef.current = true;
              setCollabSession({ ydoc: activeYdoc, provider: activeProvider });
              setSessionVersion((n) => n + 1);
            }
          },
          onDisconnect: () => {
            if (import.meta.env.DEV) {
              console.info("[collab] provider disconnect", { documentId, workspaceId });
            }
            setStatus("offline");
          },
          onAuthenticationFailed: (payload) => {
            clearConnectTimeout();
            if (import.meta.env.DEV) {
              console.warn("[collab] authentication failed", payload?.reason ?? payload);
            }
            if (!authRetryPendingRef.current) {
              authRetryPendingRef.current = true;
              void refreshCollabTokenRef.current({ reconnect: true });
              return;
            }
            setStatus("auth_failed");
          },
          onClose: () => {
            clearConnectTimeout();
            if (import.meta.env.DEV) {
              console.info("[collab] provider close", { documentId, workspaceId });
            }
            setStatus("offline");
          },
          onAwarenessUpdate: () => {
            const active = providerRef.current;
            if (!active) return;
            setAwarenessSnapshot(buildAwarenessSnapshot(active));
            if (collabExtensionsReadyRef.current) {
              setOnlineUsers(collectOnlineUsersFromAwareness(active, user.id, workspaceId));
            }
          },
        });

        providerRef.current = provider;
        setProviderAwarenessUser(provider, user);
        scheduleTokenRefresh(bootstrap.expiresInSeconds);

        clearConnectTimeout();
        connectTimeoutRef.current = window.setTimeout(() => {
          if (!alive) return;
          setStatus((s) => {
            if (s !== "connecting") return s;
            if (import.meta.env.DEV) {
              console.error(
                "[collab] connect timed out — check collab server (curl http://127.0.0.1:3002/health)",
              );
            }
            return "error";
          });
        }, CONNECT_TIMEOUT_MS);

        await provider.connect();
      } catch (error) {
        if (!alive || bootstrapGenerationRef.current !== generation) return;
        clearConnectTimeout();
        console.error("[collab] Failed to bootstrap collab provider", error);
        setStatus("error");
      }
    })();

    return () => {
      alive = false;
      clearConnectTimeout();
      clearTokenRefreshTimer();
    };
  }, [sessionKey]);

  const extensions = useMemo(
    () => buildEditorExtensions(collabSession, user),
    [collabSession, user.id, user.fullName, sessionKey],
  );

  const editor = useEditor(
    {
      extensions,
      editable: !readOnly,
      autofocus: !readOnly ? "end" : false,
      documentProperties: properties,
      editorProps: {
        attributes: {
          class: EDITOR_PROSE_CLASS,
        },
      },
    },
    [extensions, readOnly, documentId, workspaceId, user.id, user.fullName, JSON.stringify(properties)],
  ) as Editor | null;

  useEffect(() => {
    if (!collabSession || !editor || editor.isDestroyed) return;
    const cursorUser = collabCursorUser(user);
    editor.commands.updateUser(cursorUser);
    setProviderAwarenessUser(collabSession.provider, user);
  }, [collabSession, editor, user.id, user.fullName, user.avatarUrl]);

  useEffect(() => {
    const root = pointerRootRef?.current;
    const provider = providerRef.current;
    if (!root || !provider || status !== "synced" || readOnly) {
      if (provider) {
        setProviderAwarenessPointer(provider, null);
      }
      return;
    }

    let lastEmit = 0;

    const clearPointer = () => {
      setProviderAwarenessPointer(provider, null);
    };

    const onMove = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastEmit < POINTER_THROTTLE_MS) return;
      lastEmit = now;
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      setProviderAwarenessPointer(provider, { x, y, visible: true });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearPointer();
      }
    };

    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", clearPointer);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", clearPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      clearPointer();
    };
  }, [pointerRootRef, status, readOnly, sessionKey, collabSession]);

  const filteredOnlineUsers = useMemo(
    () => onlineUsers.filter((u) => !u.isCurrentUser),
    [onlineUsers],
  );

  const reconnect = () => {
    authRetryPendingRef.current = false;
    void refreshCollabTokenRef.current({ reconnect: true });
  };

  return {
    editor,
    status,
    onlineUsers: filteredOnlineUsers,
    provider: providerRef.current,
    awarenessSnapshot,
    reconnect,
    sessionVersion,
  };
}
