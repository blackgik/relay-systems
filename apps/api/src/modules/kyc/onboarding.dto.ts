import { IsDateString, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

const NAME = /^[A-Za-z][A-Za-z' -]{0,48}$/;
// Data-URL images from the web uploader, capped at ~4 MB of base64.
const IMAGE = /^data:image\/(png|jpe?g|webp);base64,/;

export const ID_TYPES = ['DRIVERS_LICENSE', 'VOTERS_CARD', 'INTL_PASSPORT', 'NIN_SLIP'] as const;

export class PersonalDto {
  @Matches(NAME, { message: 'Enter your first name as it appears on your ID' })
  firstName!: string;

  @IsOptional()
  @Matches(NAME, { message: 'Middle name can only contain letters' })
  middleName?: string;

  @Matches(NAME, { message: 'Enter your surname as it appears on your ID' })
  lastName!: string;

  @IsDateString({}, { message: 'Enter a valid date of birth' })
  dateOfBirth!: string;

  @IsIn(['MALE', 'FEMALE'])
  gender!: string;

  @IsOptional()
  @Matches(/^\+?[0-9 ]{10,15}$/, { message: 'Enter a valid phone number' })
  phone?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  state!: string;
}

export class IdentityDto {
  @Matches(/^\d{11}$/, { message: 'NIN must be 11 digits' })
  nin!: string;

  @Matches(/^\d{11}$/, { message: 'BVN must be 11 digits' })
  bvn!: string;
}

export class DocumentsDto {
  @IsIn(ID_TYPES)
  idType!: (typeof ID_TYPES)[number];

  @Matches(/^[A-Za-z0-9-]{5,20}$/, { message: 'Enter the number printed on your ID' })
  idNumber!: string;

  @Matches(IMAGE, { message: 'Upload a photo of your ID' })
  @MaxLength(5_600_000)
  idDocument!: string;

  @Matches(IMAGE, { message: 'Take a selfie holding your ID' })
  @MaxLength(5_600_000)
  selfie!: string;
}

export class BankDto {
  @IsString()
  @Length(3, 10)
  bankCode!: string;

  @Matches(/^\d{10}$/, { message: 'Account number must be 10 digits (NUBAN)' })
  accountNumber!: string;
}

export class ReviewDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
