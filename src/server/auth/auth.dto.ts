import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

/**
 * DTO for user registration
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

/**
 * User data returned in auth response
 */
export class UserDto {
  id!: string;
  email!: string;
  name!: string | null;
  avatarUrl!: string | null;
  provider!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Auth response with tokens
 */
export class AuthResponseDto {
  user!: UserDto;
  accessToken!: string;
  refreshToken!: string;
}
