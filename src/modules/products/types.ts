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

export interface ProductAlias {
  id: string;
  businessId: string;
  productId: string;
  alias: string;
  normalizedAlias: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithAliases {
  id: string;
  businessId: string;
  name: string;
  normalizedName: string;
  unit: string;
  defaultPrice: number;
  active: boolean;
  isDefault: boolean;
  aliases: Array<{
    id: string;
    alias: string;
    normalizedAlias: string;
  }>;
}

export type ProductResolutionStatus =
  | "RESOLVED"
  | "DEFAULT_USED"
  | "MULTI_PRODUCT_DETECTED"
  | "AMBIGUOUS_PRODUCT"
  | "UNKNOWN_PRODUCT"
  | "NO_DEFAULT_CONFIGURED"
  | "NO_ACTIVE_PRODUCTS";

export interface ResolvedProductInfo {
  id: string;
  name: string;
  unit: string;
  defaultPrice: number;
  isDefault: boolean;
}

export interface ProductResolutionResult {
  status: ProductResolutionStatus;
  product?: ResolvedProductInfo;
  matchedPhrase?: string;
  candidateProducts?: string[];
  unknownTerm?: string;
  activeProductNames?: string[];
  replyText?: string;
}
