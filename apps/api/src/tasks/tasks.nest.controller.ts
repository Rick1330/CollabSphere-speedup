import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { type TaskPriority, type TaskStatus } from "@prisma/client";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { TasksService } from "./tasks.service.js";

class ListTasksQueryDto {
  @IsOptional()
  @IsString()
  @IsEnum(["list", "board"])
  view?: "list" | "board";
}

class CreateTaskBodyDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsEnum(["backlog", "todo", "in_progress", "in_review", "done"])
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(["low", "medium", "high", "urgent"])
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  labels?: string[];
}

class UpdateTaskBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsEnum(["low", "medium", "high", "urgent"])
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  labels?: string[];
}

class AssignTaskBodyDto {
  @IsOptional()
  @IsUUID()
  assigneeId!: string | null;
}

class UpdateTaskStatusBodyDto {
  @IsEnum(["backlog", "todo", "in_progress", "in_review", "done"])
  status!: TaskStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;
}

@Controller("workspaces/:workspaceId/tasks")
export class TasksNestController {
  constructor(@Inject(TasksService) private readonly tasksService: TasksService) {}

  @Get()
  async listTasks(
    @Param("workspaceId") workspaceId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Query() query: ListTasksQueryDto,
  ) {
    const response = await this.tasksService.listTasks({
      actorUserId,
      workspaceId,
      view: query.view === "board" ? "board" : "list",
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(response),
      requestId,
    });
  }

  @Get(":taskId")
  async getTask(
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
  ) {
    const task = await this.tasksService.getTaskById({ actorUserId, workspaceId, taskId });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ task }),
      requestId,
    });
  }

  @Post()
  async createTask(
    @Param("workspaceId") workspaceId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: CreateTaskBodyDto,
  ) {
    const task = await this.tasksService.createTask({ actorUserId, workspaceId, ...body });
    return {
      statusCode: 201,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({ task }),
        requestId,
      }),
    };
  }

  @Patch(":taskId")
  async updateTask(
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: UpdateTaskBodyDto,
  ) {
    const task = await this.tasksService.updateTask({ actorUserId, workspaceId, taskId, ...body });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ task }),
      requestId,
    });
  }

  @Patch(":taskId/assign")
  async assignTask(
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: AssignTaskBodyDto,
  ) {
    const task = await this.tasksService.assignTask({
      actorUserId,
      workspaceId,
      taskId,
      assigneeId: body?.assigneeId ?? null,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ task }),
      requestId,
    });
  }

  @Patch(":taskId/status")
  async updateTaskStatus(
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: UpdateTaskStatusBodyDto,
  ) {
    const task = await this.tasksService.updateTaskStatus({
      actorUserId,
      workspaceId,
      taskId,
      status: body.status,
      position: body.position,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ task }),
      requestId,
    });
  }

  @Delete(":taskId")
  async deleteTask(
    @Param("workspaceId") workspaceId: string,
    @Param("taskId") taskId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
  ) {
    const result = await this.tasksService.deleteTask({ actorUserId, workspaceId, taskId });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: result.message }),
      requestId,
    });
  }

}
