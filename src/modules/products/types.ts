export interface Product {
  id: string;
  businessId: string; // Tenant boundary
  name: string;
  code?: string;
  aliases: string[]; // Variations/synonyms recognized in transaction messages
  unit: string; // e.g. "kg", "pcs", "ikat", "liter"
  defaultPriceIdr: number; // Integer IDR (avoiding floating point errors)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDTO {
  businessId: string;
  name: string;
  code?: string;
  aliases?: string[];
  unit: string;
  defaultPriceIdr: number;
}

export interface UpdateProductDTO {
  name?: string;
  code?: string;
  aliases?: string[];
  unit?: string;
  defaultPriceIdr?: number;
  isActive?: boolean;
}
