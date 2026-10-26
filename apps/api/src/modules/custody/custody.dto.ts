import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class HandoffDto {
  @IsString()
  token!: string;

  @IsString()
  sealId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photos!: string[];

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsString()
  idempotencyKey!: string;
}

export class DeliverDto {
  @IsString()
  @Length(6, 6)
  otp!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photos!: string[];

  @IsString()
  idempotencyKey!: string;
}

export class PingDto {
  @IsString()
  shipmentId!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

export class DisputeDto {
  @IsString()
  shipmentId!: string;

  @IsOptional()
  @IsString()
  legId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class ClaimDto {
  @IsString()
  shipmentId!: string;

  @IsString()
  type!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;
}

export class RuleDto {
  @IsString()
  ruling!: string;
}
