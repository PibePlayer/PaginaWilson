export interface Product {
  meliId: string;
  title: string;
  meliPrice: number;
  currencyId: string;
  availableQuantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  visible: boolean;
  featured: boolean;
  categoryId: string;
  updatedAt: Date;
}