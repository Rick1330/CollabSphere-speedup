import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { type CommentTargetType } from "@prisma/client";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { CommentsService, type CommentContentNode } from "./comments.service.js";

class CommentTextNodeDto {
  @IsEnum(["text"])
  type!: "text";

  @IsString()
  @MaxLength(5000)
  text!: string;
}

class CommentMentionNodeDto {
  @IsEnum(["mention"])
  type!: "mention";

  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(200)
  display!: string;
}

class CreateCommentBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  content!: Array<CommentTextNodeDto | CommentMentionNodeDto>;

  @IsOptional()
  anchor?: Record<string, unknown> | null;
}

class UpdateCommentBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  content!: Array<CommentTextNodeDto | CommentMentionNodeDto>;
}

class ResolveThreadBodyDto {
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}

class ListCommentsQueryDto {
  @IsEnum(["document", "task"])
  targetType!: CommentTargetType;

  @IsUUID()
  targetId!: string;
}

@Controller("workspaces/:workspaceId/comments")
export class CommentsNestController {
  constructor(@Inject(CommentsService) private readonly commentsService: CommentsService) {}

  @Get()
  async listComments(
    @Param("workspaceId") workspaceId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Query() query: ListCommentsQueryDto,
  ) {
    const resource = await this.commentsService.listThreads({
      actorUserId,
      workspaceId,
      targetType: query.targetType,
      targetId: query.targetId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(resource),
      requestId,
    });
  }

  @Post("threads")
  async createThread(
    @Param("workspaceId") workspaceId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Query() query: ListCommentsQueryDto,
    @Body() body: CreateCommentBodyDto,
  ) {
    const thread = await this.commentsService.createThread({
      actorUserId,
      workspaceId,
      targetType: query.targetType,
      targetId: query.targetId,
      content: body.content as CommentContentNode[],
      anchor: body.anchor ?? null,
    });
    return {
      statusCode: 201,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({ thread }),
        requestId,
      }),
    };
  }

  @Post("threads/:threadId/replies")
  async createReply(
    @Param("workspaceId") workspaceId: string,
    @Param("threadId") threadId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: CreateCommentBodyDto,
  ) {
    const reply = await this.commentsService.createReply({
      actorUserId,
      workspaceId,
      threadId,
      content: body.content as CommentContentNode[],
    });
    return {
      statusCode: 201,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({ reply }),
        requestId,
      }),
    };
  }

  @Patch("threads/:threadId/resolve")
  async resolveThread(
    @Param("workspaceId") workspaceId: string,
    @Param("threadId") threadId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: ResolveThreadBodyDto,
  ) {
    const resource =
      body.resolved === false
        ? await this.commentsService.unresolveThread({ actorUserId, workspaceId, threadId })
        : await this.commentsService.resolveThread({ actorUserId, workspaceId, threadId });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ thread: resource }),
      requestId,
    });
  }

  @Patch(":commentId")
  async updateComment(
    @Param("workspaceId") workspaceId: string,
    @Param("commentId") commentId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: UpdateCommentBodyDto,
  ) {
    const comment = await this.commentsService.updateComment({
      actorUserId,
      workspaceId,
      commentId,
      content: body.content as CommentContentNode[],
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ comment }),
      requestId,
    });
  }

  @Patch(":commentId/delete")
  async deleteComment(
    @Param("workspaceId") workspaceId: string,
    @Param("commentId") commentId: string,
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
  ) {
    const comment = await this.commentsService.deleteComment({
      actorUserId,
      workspaceId,
      commentId,
    });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload({ comment }),
      requestId,
    });
  }
}
