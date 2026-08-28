import { IsObject } from 'class-validator';

/** Mise à jour des paramètres globaux (merge partiel) */
export class SettingsUpdateDto {
  @IsObject()
  data: Record<string, unknown>;
}
