export type UserRole = "owner" | "admin" | "member";

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface BusinessMembership {
  id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  currentBusinessId: string | null;
  membership: BusinessMembership | null;
  isLoading: boolean;
}
