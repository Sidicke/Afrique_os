import { IsIn, IsString, IsOptional, MaxLength } from 'class-validator';

const STATUSES = [
  'PENDING',
  'PAID',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
] as const;

export class UpdateOrderStatusDto {
  @IsIn(STATUSES)
  status: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deliveryContact?: string;
}
