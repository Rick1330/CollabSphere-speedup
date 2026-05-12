import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class RenameFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
