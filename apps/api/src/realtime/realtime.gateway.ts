import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
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

@WebSocketGateway({
  namespace: "/realtime",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private activeConnections = 0;

  constructor(
    private readonly sessionService: RealtimeSessionService,
  ) {}

  afterInit(): void {
    this.logger.log("Realtime gateway initialized");
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
  ): Promise<{ ok: true; room: string }> {
    const user = this.sessionService.getAuthenticatedUser(client);
    await this.sessionService.assertWorkspaceMembership(user.userId, payload.workspaceId);
    const room = this.sessionService.toWorkspaceRoom(payload.workspaceId);
    await client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage("room:leave:workspace")
  async leaveWorkspaceRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveWorkspaceRoomPayload,
  ): Promise<{ ok: true; room: string }> {
    const user = this.sessionService.getAuthenticatedUser(client);
    await this.sessionService.assertWorkspaceMembership(user.userId, payload.workspaceId);
    const room = this.sessionService.toWorkspaceRoom(payload.workspaceId);
    await client.leave(room);
    return { ok: true, room };
  }

  @SubscribeMessage("room:join:task")
  async joinTaskRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinTaskRoomPayload,
  ): Promise<{ ok: true; rooms: string[] }> {
    const user = this.sessionService.getAuthenticatedUser(client);
    await this.sessionService.assertWorkspaceMembership(user.userId, payload.workspaceId);
    const workspaceRoom = this.sessionService.toWorkspaceRoom(payload.workspaceId);
    const taskRoom = this.sessionService.toTaskRoom(payload.taskId);
    await client.join(workspaceRoom);
    await client.join(taskRoom);
    return { ok: true, rooms: [workspaceRoom, taskRoom] };
  }

  @SubscribeMessage("room:join:document")
  async joinDocumentRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinDocumentRoomPayload,
  ): Promise<{ ok: true; room: string }> {
    const user = this.sessionService.getAuthenticatedUser(client);
    await this.sessionService.assertWorkspaceMembership(user.userId, payload.workspaceId);
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
  }

  @SubscribeMessage("room:leave:document")
  async leaveDocumentRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveDocumentRoomPayload & { workspaceId?: string },
  ): Promise<{ ok: true; room: string }> {
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
  }

  @SubscribeMessage("document:presence:heartbeat")
  async documentPresenceHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DocumentPresencePayload,
  ): Promise<{ ok: true }> {
    const user = this.sessionService.getAuthenticatedUser(client);
    await this.sessionService.assertWorkspaceMembership(user.userId, payload.workspaceId);
    const room = this.sessionService.toDocumentRoom(payload.documentId);
    client.to(room).emit("document:presence:heartbeat", {
      ...payload,
      userId: user.userId,
    });
    return { ok: true };
  }

  @SubscribeMessage("room:leave:task")
  async leaveTaskRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveTaskRoomPayload,
  ): Promise<{ ok: true; room: string }> {
    const room = this.sessionService.toTaskRoom(payload.taskId);
    await client.leave(room);
    return { ok: true, room };
  }

  emitToWorkspace(workspaceId: string, event: RealtimeEventName, payload: unknown): void {
    this.logger.debug(JSON.stringify({ event: "realtime.emit", channel: "workspace", workspaceId, name: event }));
    this.server.to(this.sessionService.toWorkspaceRoom(workspaceId)).emit(event, payload);
  }

  emitToUser(userId: string, event: RealtimeEventName, payload: unknown): void {
    this.server.to(this.sessionService.toUserRoom(userId)).emit(event, payload);
  }

  emitToTask(taskId: string, event: RealtimeEventName, payload: unknown): void {
    this.server.to(this.sessionService.toTaskRoom(taskId)).emit(event, payload);
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error";
  }
}
