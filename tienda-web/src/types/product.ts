export interface Product {
  meliId: string;
  title: string;
  categoryId: string;
  meliPrice: number;
  currencyId: string;
  availableQuantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  visible: boolean;
  updatedAt: Date;
}