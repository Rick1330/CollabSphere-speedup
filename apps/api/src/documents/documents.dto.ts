import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { DocumentStatus } from "@prisma/client";

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsString()
  templateId?: string | null;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}

export class UpdateDocumentContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  contentPlaintext!: string;

  @IsOptional()
  @IsString()
  yjsStateBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockTypes?: string[];
}

export class TransitionNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note!: string;
}
