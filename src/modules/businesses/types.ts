export interface Business {
  id: string; // Tenant boundary ID
  name: string;
  slug: string;
  currency: string; // Default: 'IDR'
  timezone: string; // Default: 'Asia/Jakarta'
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessDTO {
  name: string;
  slug?: string;
  currency?: string;
  timezone?: string;
}

export interface UpdateBusinessDTO {
  name?: string;
  currency?: string;
  timezone?: string;
}
