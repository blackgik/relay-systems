import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

// At least 8 characters with a letter and a number.
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include a letter and a number';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\+?[0-9 ]{10,15}$/, { message: 'Enter a valid phone number' })
  phone!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @Matches(PASSWORD, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class EmailDto {
  @IsEmail()
  email!: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code!: string;
}

export class ResetPasswordDto extends VerifyEmailDto {
  @IsString()
  @Matches(PASSWORD, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class OAuthExchangeDto {
  @IsString()
  code!: string;
}
