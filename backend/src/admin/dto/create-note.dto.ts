import { IsString, MaxLength } from 'class-validator';

/** Note interne (jamais visible par le vendeur/client concerné) */
export class CreateNoteDto {
  @IsString()
  @MaxLength(40)
  targetType: string; // boutique | user | order | report

  @IsString()
  targetId: string;

  @IsString()
  @MaxLength(2000)
  content: string;
}
