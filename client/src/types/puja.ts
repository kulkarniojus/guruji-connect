export interface Puja {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  price: number;
  imageUrl?: string;
  items?: string[];
  isPopular: boolean;
  isActive: boolean;
  type: 'online' | 'offline';
  duration: number;
  createdAt?: Date;
  updatedAt?: Date;
}