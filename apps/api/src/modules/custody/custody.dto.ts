import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_PHOTO_LENGTH, PHOTO_MESSAGE, PHOTO_PATTERN } from '../../common/validators/photo';

export class HandoffDto {
  @IsString()
  token!: string;

  @IsString()
  sealId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(PHOTO_PATTERN, { each: true, message: PHOTO_MESSAGE })
  @MaxLength(MAX_PHOTO_LENGTH, { each: true })
  photos!: string[];

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
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
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(PHOTO_PATTERN, { each: true, message: PHOTO_MESSAGE })
  @MaxLength(MAX_PHOTO_LENGTH, { each: true })
  photos!: string[];

  @IsString()
  idempotencyKey!: string;
}

export class PingDto {
  @IsString()
  shipmentId!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
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
