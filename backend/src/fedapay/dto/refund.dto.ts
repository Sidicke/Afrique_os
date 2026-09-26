import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestRefundDto {
  @IsNotEmpty({ message: "L'identifiant de la commande est requis." })
  @IsString()
  orderId: string;

  @IsNotEmpty({ message: 'Le motif de remboursement est obligatoire.' })
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}

export class ApproveRefundDto {
  @IsOptional()
  @IsString()
  payoutMode?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectRefundDto {
  @IsNotEmpty({ message: 'Le motif du refus est obligatoire.' })
  @IsString()
  rejectionReason: string;
}
