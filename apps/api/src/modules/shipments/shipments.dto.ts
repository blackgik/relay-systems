import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_PHOTO_LENGTH, PHOTO_MESSAGE, PHOTO_PATTERN } from '../../common/validators/photo';

export class CreateShipmentDto {
  @IsString()
  receiverName!: string;

  @IsString()
  receiverPhone!: string;

  @IsString()
  originCity!: string;

  @IsString()
  destCity!: string;

  @IsString()
  category!: string;

  @IsNumber()
  @Min(0.01)
  weightKg!: number;

  @IsInt()
  @Min(0)
  declaredValue!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(PHOTO_PATTERN, { each: true, message: PHOTO_MESSAGE })
  @MaxLength(MAX_PHOTO_LENGTH, { each: true })
  photos!: string[];

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;
}

export class AttestationDto {
  @IsBoolean()
  accepted!: boolean;

  @IsString()
  @Length(3, 120)
  signedName!: string;

  @IsString()
  statementVersion!: string;
}

export class SelectRouteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  tripIds!: string[];

  /** Signed declaration of lawful goods; required on a shipment's first request. */
  @IsOptional()
  @ValidateNested()
  @Type(() => AttestationDto)
  attestation?: AttestationDto;
}

/** Declining a carry request always carries a reason for the sender. */
export class RejectLegDto {
  @IsString()
  @Length(3, 300)
  reason!: string;
}

export class RateDeliveryDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
