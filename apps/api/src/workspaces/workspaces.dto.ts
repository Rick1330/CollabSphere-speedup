import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { WorkspaceRole, WorkspaceType } from "@prisma/client";

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  @IsEnum(WorkspaceType)
  type!: WorkspaceType;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @IsOptional()
  @IsString()
  templateId?: string | null;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;
}

export class UpdateWorkspaceMemberRoleDto {
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

export class TransferOwnershipDto {
  @IsUUID()
  @IsNotEmpty()
  newOwnerUserId!: string;
}
