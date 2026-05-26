import { IsArray, ArrayMaxSize, IsString, Matches } from "class-validator";

export class UpdateEditorPreferencesDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^#[0-9A-Fa-f]{6}$/, { each: true })
  recentColors!: string[];
}
