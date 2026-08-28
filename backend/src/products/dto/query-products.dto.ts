import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const SORTS = ['newest', 'price_asc', 'price_desc', 'popular'] as const;
export type ProductSort = (typeof SORTS)[number];

export class QueryProductsDto {
  @IsOptional() @IsString()
  category?: string; // slug de catégorie

  @IsOptional() @IsString()
  brand?: string; // slug de marque

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  minPrice?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  maxPrice?: number;

  @IsOptional() @IsIn(SORTS)
  sort?: ProductSort;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 12;
}
