import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { WorkspaceRole } from "@prisma/client";

export class CreateInvitationsDto {
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty({ each: true })
  emails!: string[];

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
