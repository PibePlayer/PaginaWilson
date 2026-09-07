export interface ProductAttribute {
  id: string;
  name: string;
  value_id?: string | null;
  value_name?: string | null;
  value_struct?: {
    number?: number;
    unit?: string;
  } | null;
  attribute_group_id?: string | null;
  attribute_group_name?: string | null;
}

export interface Product {
  meliId: string;

  title: string;

  // MercadoLibre pricing
  meliPrice: number;
  meliDiscountedPrice?: number;
  currencyId: string;

  // Stock
  availableQuantity: number;

  // Content
  description?: string;
  attributes?: ProductAttribute[];

  // Images
  thumbnail: string;
  pictures?: string[];

  // MercadoLibre
  permalink: string;
  status: string;
  categoryId: string;
  categoryName?: string;

  // Store
  visible: boolean;
  featured: boolean;
  featuredOrder?: number;
  discountPercent?: number;

  updatedAt: Date;
}