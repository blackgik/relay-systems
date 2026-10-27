import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsString()
  originCity!: string;

  @IsString()
  destCity!: string;

  @IsISO8601()
  departAt!: string;

  @IsISO8601()
  arriveAt!: string;

  @IsIn(['ROAD', 'AIR', 'RAIL'])
  mode!: string;

  @IsOptional()
  @IsString()
  flightNumber?: string;

  @IsInt()
  @Min(1)
  capacityKg!: number;

  @IsInt()
  @Min(0)
  pricePerKg!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categories!: string[];

  @IsBoolean()
  international!: boolean;
}

export class UpdateTripDto {
  @IsOptional()
  @IsISO8601()
  departAt?: string;

  @IsOptional()
  @IsISO8601()
  arriveAt?: string;

  @IsOptional()
  @IsIn(['CANCELLED'])
  status?: string;
}

export class TravelProofDto {
  @IsString()
  reference!: string;
}

/** Query filters for GET /trips — validated so bad dates never reach `new Date()`. */
export class ListTripsQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  origin?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  dest?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  mine?: string;
}
