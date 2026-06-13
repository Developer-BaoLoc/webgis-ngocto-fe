export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  roles: string[];
  primaryOrganizationId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}
