import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateVariantDto {
  @IsString() name: string;
  @IsString() value: string;
  @IsOptional() @IsNumber() priceDelta?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional() @IsString() @MaxLength(4000)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional() @IsNumber() @Min(0)
  oldPrice?: number;

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @IsString() @MaxLength(80)
  sku?: string;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  brandId?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
