import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProcessWithdrawalPayoutDto {
  @IsNotEmpty({ message: "L'identifiant de la demande de retrait est requis." })
  @IsString()
  withdrawalId: string;

  @IsOptional()
  @IsString()
  payoutMode?: string;
}
