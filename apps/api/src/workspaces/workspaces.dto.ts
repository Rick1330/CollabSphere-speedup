import { WorkspaceRole, WorkspaceType } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  icon?: string;

  @IsEnum(WorkspaceType)
  type!: WorkspaceType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateId?: string | null;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  icon?: string | null;
}

export class UpdateWorkspaceMemberRoleDto {
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

export class TransferOwnershipDto {
  @IsUUID()
  newOwnerUserId!: string;
}

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
