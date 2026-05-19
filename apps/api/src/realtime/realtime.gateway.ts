import { Logger, type OnModuleDestroy } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, type RedisClientType } from "redis";
import type { Server, Socket } from "socket.io";
import { apiRuntimeEnv } from "../config/api-runtime.js";
import type {
  DocumentPresencePayload,
  JoinDocumentRoomPayload,
  JoinTaskRoomPayload,
  JoinWorkspaceRoomPayload,
  LeaveDocumentRoomPayload,
  LeaveTaskRoomPayload,
  LeaveWorkspaceRoomPayload,
  RealtimeEventName,
} from "./realtime.types.js";
import { RealtimeSessionService } from "./realtime-session.service.js";

type RoomAckSuccess = { ok: true; room: string };
type RoomAckFailure = { ok: false; message: string };
type RoomAck = RoomAckSuccess | RoomAckFailure;
type RoomsAckSuccess = { ok: true; rooms: string[] };
type RoomsAck = RoomsAckSuccess | RoomAckFailure;

type GenericRoomPayload = {
  room: string;
  workspaceId?: string;
};

type AwarenessBroadcast = {
  workspaceId: string;
  documentId: string;
  activeUsers?: unknown[];
};

/** Resolved Redis URL for gateway init (avoids ConfigService in WebSocket lifecycle). */
export function resolveGatewayRedisUrl(): string {
  return apiRuntimeEnv.REDIS_URL?.trim() ?? "";
}

@WebSocketGateway({
  namespace: "/realtime",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private activeConnections = 0;

  private namespaceRedisPub?: RedisClientType;
  private namespaceRedisSub?: RedisClientType;
  private awarenessRedisSub?: RedisClientType;

  constructor(private readonly sessionService: RealtimeSessionService) {}

  afterInit(server: Server): void {
    this.server = server;
    const redisUrl = resolveGatewayRedisUrl();
    const skipRedis = process.env.SKIP_REDIS_IO_ADAPTER === "1";

    if (!redisUrl || skipRedis) {
      this.logger.log(
        skipRedis
          ? "Realtime gateway initialized (Redis adapter skipped via SKIP_REDIS_IO_ADAPTER)"
          : "Realtime gateway initialized (REDIS_URL not set — single-instance mode)",
      );
      return;
    }

    void this.attachNamespaceRedisAdapter(server, redisUrl);
    void this.attachAwarenessBridge(server, redisUrl);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.awarenessRedisSub?.quit().catch(() => undefined),
      this.namespaceRedisPub?.quit().catch(() => undefined),
      this.namespaceRedisSub?.quit().catch(() => undefined),
    ]);
    this.awarenessRedisSub = undefined;
    this.namespaceRedisPub = undefined;
    this.namespaceRedisSub = undefined;
  }

  async handleConnection(client: Socket): Promise<void> {
    const startedAt = process.hrtime.bigint();
    try {
      const user = await this.sessionService.authenticateSocket(client);

      client.data.user = user;
      await client.join(this.sessionService.toUserRoom(user.userId));
      this.activeConnections += 1;
      this.logger.log(
        JSON.stringify({
          event: "realtime.connection.accepted",
          userId: user.userId,
          activeConnections: this.activeConnections,
          authLatencyMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2)),
        }),
      );
    } catch (error) {
      this.logger.warn(`Rejected socket connection: ${this.toErrorMessage(error)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data.user as { userId?: string } | undefined)?.userId ?? "anonymous";
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    this.logger.debug(`Realtime socket disconnected for user ${userId}`);
    this.logger.log(
      JSON.stringify({
        event: "realtime.connection.closed",
        userId,
        activeConnections: this.activeConnections,
      }),
    );
  }

  @SubscribeMessage("room:join:workspace")
  async joinWorkspaceRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinWorkspaceRoomPayload,
  ): Promise<RoomAck> {
    return this.joinWorkspaceRoomInternal(client, payload.workspaceId);
  }

  @SubscribeMessage("room:leave:workspace")
  async leaveWorkspaceRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveWorkspaceRoomPayload,
  ): Promise<RoomAck> {
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      await this.sessionService.assertWorkspaceMembership(user.userId, payload.workspaceId);
      const room = this.sessionService.toWorkspaceRoom(payload.workspaceId);
      await client.leave(room);
      return { ok: true, room };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  @SubscribeMessage("room:join:task")
  async joinTaskRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinTaskRoomPayload,
  ): Promise<RoomsAck> {
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      await this.sessionService.assertTaskInWorkspace(
        user.userId,
        payload.workspaceId,
        payload.taskId,
      );
      const workspaceRoom = this.sessionService.toWorkspaceRoom(payload.workspaceId);
      const taskRoom = this.sessionService.toTaskRoom(payload.taskId);
      await client.join(workspaceRoom);
      await client.join(taskRoom);
      return { ok: true, rooms: [workspaceRoom, taskRoom] };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  @SubscribeMessage("room:join:document")
  async joinDocumentRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinDocumentRoomPayload,
  ): Promise<RoomAck> {
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      await this.sessionService.assertDocumentInWorkspace(
        user.userId,
        payload.workspaceId,
        payload.documentId,
      );
      const room = this.sessionService.toDocumentRoom(payload.documentId);
      await client.join(room);
      const presence: DocumentPresencePayload = {
        workspaceId: payload.workspaceId,
        documentId: payload.documentId,
        userId: user.userId,
        fullName: payload.fullName?.trim() || user.email,
      };
      client.to(room).emit("document:presence:join", presence);
      return { ok: true, room };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  @SubscribeMessage("room:leave:document")
  async leaveDocumentRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveDocumentRoomPayload & { workspaceId?: string },
  ): Promise<RoomAck> {
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      const room = this.sessionService.toDocumentRoom(payload.documentId);
      await client.leave(room);
      if (payload.workspaceId) {
        client.to(room).emit("document:presence:leave", {
          workspaceId: payload.workspaceId,
          documentId: payload.documentId,
          userId: user.userId,
        });
      }
      return { ok: true, room };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  @SubscribeMessage("document:presence:heartbeat")
  async documentPresenceHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DocumentPresencePayload,
  ): Promise<{ ok: true } | RoomAckFailure> {
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      await this.sessionService.assertWorkspaceMembership(user.userId, payload.workspaceId);
      const room = this.sessionService.toDocumentRoom(payload.documentId);
      client.to(room).emit("document:presence:heartbeat", {
        ...payload,
        userId: user.userId,
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  @SubscribeMessage("room:leave:task")
  async leaveTaskRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveTaskRoomPayload,
  ): Promise<RoomAck> {
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      const workspaceId =
        payload.workspaceId?.trim() ||
        (await this.sessionService.resolveTaskWorkspaceId(payload.taskId));
      if (!workspaceId) {
        return { ok: false, message: "Task not found" };
      }
      await this.sessionService.assertTaskInWorkspace(user.userId, workspaceId, payload.taskId);
      const room = this.sessionService.toTaskRoom(payload.taskId);
      await client.leave(room);
      return { ok: true, room };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  /** Generic join — validates workspace membership for `workspace:*` rooms. */
  @SubscribeMessage("room:join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GenericRoomPayload,
  ): Promise<RoomAck> {
    const room = payload?.room?.trim() ?? "";
    if (!room) {
      return { ok: false, message: "Room is required" };
    }
    if (room.startsWith("workspace:")) {
      const workspaceId = room.slice("workspace:".length);
      return this.joinWorkspaceRoomInternal(client, workspaceId);
    }
    if (room.startsWith("user:")) {
      try {
        const user = this.sessionService.getAuthenticatedUser(client);
        if (room !== this.sessionService.toUserRoom(user.userId)) {
          return { ok: false, message: "Cannot join another user's room" };
        }
        await client.join(room);
        return { ok: true, room };
      } catch (error) {
        return { ok: false, message: this.toErrorMessage(error) };
      }
    }
    if (room.startsWith("task:")) {
      const workspaceId = payload.workspaceId?.trim() ?? "";
      const taskId = room.slice("task:".length);
      if (!workspaceId) {
        return { ok: false, message: "workspaceId is required for task rooms" };
      }
      try {
        const user = this.sessionService.getAuthenticatedUser(client);
        await this.sessionService.assertTaskInWorkspace(user.userId, workspaceId, taskId);
        await client.join(this.sessionService.toWorkspaceRoom(workspaceId));
        await client.join(room);
        return { ok: true, room };
      } catch (error) {
        return { ok: false, message: this.toErrorMessage(error) };
      }
    }
    if (room.startsWith("document:")) {
      const workspaceId = payload.workspaceId?.trim() ?? "";
      const documentId = room.slice("document:".length);
      if (!workspaceId) {
        return { ok: false, message: "workspaceId is required for document rooms" };
      }
      try {
        const user = this.sessionService.getAuthenticatedUser(client);
        await this.sessionService.assertDocumentInWorkspace(user.userId, workspaceId, documentId);
        await client.join(room);
        return { ok: true, room };
      } catch (error) {
        return { ok: false, message: this.toErrorMessage(error) };
      }
    }
    return { ok: false, message: "Unsupported room" };
  }

  @SubscribeMessage("room:leave")
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GenericRoomPayload,
  ): Promise<RoomAck> {
    const room = payload?.room?.trim() ?? "";
    if (!room) {
      return { ok: false, message: "Room is required" };
    }
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      if (room.startsWith("workspace:")) {
        const workspaceId = room.slice("workspace:".length);
        await this.sessionService.assertWorkspaceMembership(user.userId, workspaceId);
      }
      await client.leave(room);
      return { ok: true, room };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  emitToRoom(room: string, event: RealtimeEventName, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }

  emitToWorkspace(workspaceId: string, event: RealtimeEventName, payload: unknown): void {
    this.logger.debug(JSON.stringify({ event: "realtime.emit", channel: "workspace", workspaceId, name: event }));
    this.emitToRoom(this.sessionService.toWorkspaceRoom(workspaceId), event, payload);
  }

  emitToUser(userId: string, event: RealtimeEventName, payload: unknown): void {
    this.server.to(this.sessionService.toUserRoom(userId)).emit(event, payload);
  }

  emitToTask(taskId: string, event: RealtimeEventName, payload: unknown): void {
    this.server.to(this.sessionService.toTaskRoom(taskId)).emit(event, payload);
  }

  private async joinWorkspaceRoomInternal(client: Socket, workspaceId: string): Promise<RoomAck> {
    try {
      const user = this.sessionService.getAuthenticatedUser(client);
      await this.sessionService.assertWorkspaceMembership(user.userId, workspaceId);
      const room = this.sessionService.toWorkspaceRoom(workspaceId);
      await client.join(room);
      return { ok: true, room };
    } catch (error) {
      return { ok: false, message: this.toErrorMessage(error) };
    }
  }

  /**
   * Root bootstrap attaches Redis via {@link RedisIoAdapter}; namespace only adds its own
   * adapter when the root did not (e.g. SKIP_REDIS_IO_ADAPTER at bootstrap).
   */
  private async attachNamespaceRedisAdapter(server: Server, redisUrl: string): Promise<void> {
    try {
      const existing =
        typeof server.adapter === "function" ? server.adapter() : server.adapter;
      if (existing?.constructor?.name === "RedisAdapter") {
        this.logger.log("Realtime namespace using root Redis adapter (no duplicate attach)");
        return;
      }

      this.namespaceRedisPub = createClient({ url: redisUrl }) as RedisClientType;
      this.namespaceRedisSub = this.namespaceRedisPub.duplicate();
      await Promise.all([this.namespaceRedisPub.connect(), this.namespaceRedisSub.connect()]);
      server.adapter(createAdapter(this.namespaceRedisPub, this.namespaceRedisSub));
      this.logger.log("Realtime namespace Redis adapter attached (bootstrap adapter was absent)");
    } catch (error) {
      this.logger.error(`Failed to attach namespace Redis adapter: ${this.toErrorMessage(error)}`);
    }
  }

  private async attachAwarenessBridge(server: Server, redisUrl: string): Promise<void> {
    try {
      this.awarenessRedisSub = createClient({ url: redisUrl }) as RedisClientType;
      await this.awarenessRedisSub.connect();
      await this.awarenessRedisSub.pSubscribe("awareness:doc:*", (message) => {
        try {
          const data = JSON.parse(message) as AwarenessBroadcast;
          if (!data.workspaceId) {
            return;
          }
          server
            .to(this.sessionService.toWorkspaceRoom(data.workspaceId))
            .emit("document:awareness", data);
        } catch (parseError) {
          this.logger.warn(`Awareness bridge parse error: ${this.toErrorMessage(parseError)}`);
        }
      });
      this.logger.log("Awareness bridge subscribed to awareness:doc:*");
    } catch (error) {
      this.logger.error(`Failed to start awareness bridge: ${this.toErrorMessage(error)}`);
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error";
  }
}
