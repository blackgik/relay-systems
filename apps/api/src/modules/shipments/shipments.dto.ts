import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
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

export class SelectRouteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  tripIds!: string[];
}
