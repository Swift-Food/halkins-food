// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/core/auth/dto/create-auth.dto.ts

export interface SignInDto {
  email: string; // Valid email format
  password: string; // Min 6 characters
  role: string; // UserRole (CUSTOMER, RESTAURANT_OWNER, DRIVER, ADMIN)
}

export interface GoogleLoginDto {
  idToken: string; // Google OAuth ID token
}

export interface GoogleRegisterDto {
  idToken: string; // Google OAuth ID token
}

export interface RegisterCorporateUserDto {
  email: string; // Company email, valid format
  password: string; // Min 6 characters
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
}

export interface VerifyCorporateEmailDto {
  email: string; // Valid email format
  code: string; // 6-digit verification code
}

export interface CheckDomainDto {
  email: string; // Valid email format (used to extract domain)
}
