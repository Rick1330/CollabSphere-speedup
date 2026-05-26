import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
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

export class DocumentVariableEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  variableKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  value?: string | null;
}

export class PatchDocumentVersionLabelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  versionLabel!: string;
}

export class CreateDocumentVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  versionLabel?: string;
}

export class PatchDocumentVariablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentVariableEntryDto)
  variables!: DocumentVariableEntryDto[];
}
