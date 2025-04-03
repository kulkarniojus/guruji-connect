export interface PujaSamagri {
  name: string;
  quantity: number;
  optional: boolean;
}

export interface Puja {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  price: number;
  imageUrl?: string;
  items?: string[];
  samagri?: PujaSamagri[];
  isPopular: boolean;
  isActive: boolean;
  type: 'online' | 'offline';
  duration: number;
  createdAt?: Date;
  updatedAt?: Date;
}