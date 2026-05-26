import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Color from "@tiptap/extension-color";
import { FontSize } from "@/components/editor/extensions/fontSize";
import { LineHeight } from "@/components/editor/extensions/lineHeight";
import { ParagraphIndent } from "@/components/editor/extensions/paragraphIndent";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import CharacterCount from "@tiptap/extension-character-count";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

import { MermaidBlock } from "@/features/documents/editor-extensions/mermaid-block";
import { MathBlock } from "@/features/documents/editor-extensions/math-block";
import { CalloutBlock } from "@/features/documents/editor-extensions/callout-block";
import { SectionBlock } from "@/features/documents/editor-extensions/section-block";
import { TOCBlock } from "@/features/documents/editor-extensions/toc-block";
import { CoverPageBlock } from "@/features/documents/editor-extensions/cover-page-block";
import { PageBreakBlock } from "@/features/documents/editor-extensions/page-break-block";
import { createPaginationPlusExtension } from "@/components/editor/canvas/paginationPlusConfig";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";
import { useDocumentPageSetupSync } from "@/hooks/use-document-page-setup-sync";
import { CommentMarkExtension } from "@/features/documents/editor-extensions/comment-mark.extension";
import type { PresenceUser } from "@/features/documents/components/editor/editor-presence";
import { prepareDocumentCollabBootstrap } from "@/features/documents/collab/collab-bootstrap";
import { renderCursor } from "@/editor/cursor-render";
import { normalizeCollabWsUrl, resolveCollabWsUrlFromEnv } from "@/lib/collab-ws-url";
import { encodeYdocState, ydocCache } from "@/lib/ydoc-cache";

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
  const byUserId = new Map<string, PresenceUser & { isCurrentUser?: boolean }>();
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
    byUserId.set(
      id,
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
  const list = Array.from(byUserId.values());
  if (import.meta.env.DEV) {
    console.debug("[collab] awareness states", {
      clientCount: states.size,
      uniqueUsers: list.length,
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
  onThreadClick?: (threadId: string) => void,
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
    CharacterCount as any,
    CommentMarkExtension.configure({
      onThreadClick,
    }),
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
    TextStyle as any,
    (FontFamily as any).configure({ types: ["textStyle"] }),
    FontSize as any,
    (TextAlign as any).configure({ types: ["heading", "paragraph"] }),
    TaskList as any,
    (TaskItem as any).configure({ nested: true }),
    LineHeight as any,
    ParagraphIndent as any,
    (Color as any).configure({ types: ["textStyle"] }),
    (Highlight as any).configure({ multicolor: true }),
    Subscript as any,
    Superscript as any,
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
    createPaginationPlusExtension(useEditorStore.getState().pageSetup),
    MermaidBlock,
    MathBlock,
    CalloutBlock,
    SectionBlock,
    TOCBlock,
    CoverPageBlock,
    PageBreakBlock,
  );

  return extensions;
}

export function useCollaborativeDocumentEditor(input: {
  workspaceId: string;
  documentId: string;
  /** When false, defer collab-token + provider bootstrap until auth session is validated. */
  isSessionReady?: boolean;
  user: { id: string; fullName: string; avatarUrl?: string | null };
  readOnly: boolean;
  properties?: any;
  /** Writing column root for remote mouse pointer overlay (0..1 coordinates). */
  pointerRootRef?: RefObject<HTMLElement | null>;
  onThreadClick?: (threadId: string) => void;
}) {
  const {
    workspaceId,
    documentId,
    isSessionReady = true,
    user,
    readOnly,
    properties = {},
    pointerRootRef,
    onThreadClick,
  } = input;
  const onThreadClickRef = useRef(onThreadClick);
  onThreadClickRef.current = onThreadClick;

  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  const [status, setStatus] = useState<Status>("connecting");
  const [onlineUsers, setOnlineUsers] = useState<(PresenceUser & { isCurrentUser?: boolean })[]>([]);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [restoreGeneration, setRestoreGeneration] = useState(0);
  const [collabSession, setCollabSession] = useState<CollabSession | null>(null);
  const [awarenessSnapshot, setAwarenessSnapshot] = useState<AwarenessClientSnapshot[]>([]);

  const sessionKeyRef = useRef("");
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const collabExtensionsReadyRef = useRef(false);
  const connectTimeoutRef = useRef<number | null>(null);
  const tokenRefreshTimerRef = useRef<number | null>(null);
  const bootstrapGenerationRef = useRef(0);
  const cacheWriteTimerRef = useRef<number | null>(null);
  const authRetryPendingRef = useRef(false);
  const refreshCollabTokenRef = useRef<(options: { reconnect: boolean }) => Promise<void>>(
    async () => {},
  );

  const sessionKey = `${workspaceId}:${documentId}:${restoreGeneration}`;

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

  // v3: fetch token first, then create Y.Doc + provider with token+URL at construction.
  useEffect(() => {
    if (!workspaceId || !documentId || !isSessionReady) return;

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

        const cachedState = await ydocCache.get(documentId);
        if (cachedState && cachedState.length > 0) {
          Y.applyUpdate(ydoc, cachedState);
        }

        const scheduleCacheWrite = () => {
          if (cacheWriteTimerRef.current != null) {
            window.clearTimeout(cacheWriteTimerRef.current);
          }
          cacheWriteTimerRef.current = window.setTimeout(() => {
            const activeDoc = ydocRef.current;
            if (!activeDoc) return;
            void ydocCache.set(documentId, encodeYdocState(activeDoc));
          }, 2_000);
        };

        ydoc.on("update", scheduleCacheWrite);

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
            const activeDoc = ydocRef.current;
            if (activeDoc) {
              void ydocCache.set(documentId, encodeYdocState(activeDoc));
            }
            if (import.meta.env.DEV) {
              console.info("[collab] provider synced", { documentId, workspaceId });
            }
            setStatus("synced");
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
            logAwarenessCursorsDev(active);
          },
        });

        providerRef.current = provider;

        // Install the collaboration extensions as soon as the provider/ydoc
        // exist. We previously waited for `onSynced`, which left a window
        // where the editor was running without collab extensions.
        if (!collabExtensionsReadyRef.current && bootstrapGenerationRef.current === generation) {
          const activeYdoc = ydocRef.current;
          if (activeYdoc) {
            collabExtensionsReadyRef.current = true;
            setCollabSession({ ydoc: activeYdoc, provider });
            setSessionVersion((n) => n + 1);
          }
        }

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
      if (cacheWriteTimerRef.current != null) {
        window.clearTimeout(cacheWriteTimerRef.current);
        cacheWriteTimerRef.current = null;
      }
    };
  }, [sessionKey, isSessionReady]);

  const extensions = useMemo(
    () =>
      buildEditorExtensions(collabSession, user, (threadId) => {
        onThreadClickRef.current?.(threadId);
      }),
    [collabSession, user.id, user.fullName, sessionKey],
  );

  const editor = useEditor(
    {
      extensions,
      editable: !readOnly,
      autofocus: !readOnly ? "end" : false,
      documentProperties: propertiesRef.current,
      editorProps: {
        attributes: {
          class: EDITOR_PROSE_CLASS,
        },
      },
    },
    [extensions, readOnly, user.id, user.fullName],
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

  const presenceUsers = useMemo(() => onlineUsers, [onlineUsers]);

  const reconnect = () => {
    authRetryPendingRef.current = false;
    void refreshCollabTokenRef.current({ reconnect: true });
  };

  /** Disconnect during DOCX import so stale local edits are not synced over the worker result. */
  const pauseCollabForImport = useCallback(() => {
    const provider = providerRef.current;
    if (provider) {
      provider.disconnect();
    }
    setStatus("offline");
  }, []);

  const RESTORE_RECONNECT_DELAY_MS = 1_000;

  /** After version restore or DOCX import: allow collab server to unload room, then re-bootstrap from DB. */
  const hardReconnectAfterRestore = useCallback(() => {
    authRetryPendingRef.current = false;
    void ydocCache.delete(documentId).catch(() => undefined);
    teardownCollabSession();
    window.setTimeout(() => {
      setRestoreGeneration((generation) => generation + 1);
    }, RESTORE_RECONNECT_DELAY_MS);
  }, [documentId, workspaceId]);

  const getLiveYjsState = useCallback((): Uint8Array => {
    const doc = providerRef.current?.document;
    if (!doc) return new Uint8Array(0);
    return Y.encodeStateAsUpdate(doc);
  }, [sessionKey, status]);

  useDocumentPageSetupSync(collabSession?.ydoc ?? null, status === "synced");

  const loadProgress = useMemo(() => {
    switch (status) {
      case "connecting":
        return 15;
      case "connected":
        return 60;
      case "synced":
        return 100;
      case "offline":
        return 40;
      case "error":
      case "auth_failed":
        return 0;
      default:
        return 10;
    }
  }, [status]);

  const isCollabReady = status === "synced";

  return {
    editor,
    status,
    isCollabReady,
    loadProgress,
    onlineUsers: filteredOnlineUsers,
    presenceUsers,
    provider: providerRef.current,
    awarenessSnapshot,
    reconnect,
    pauseCollabForImport,
    hardReconnectAfterRestore,
    sessionVersion,
    getLiveYjsState,
  };
}
