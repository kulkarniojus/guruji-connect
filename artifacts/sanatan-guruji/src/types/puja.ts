
export interface PujaSamagri {
  name: string;
  quantity: number;
  optional: boolean;
  price: number;
}

export interface PujaSamagri {
  name: string;
  quantity: number;
  optional: boolean;
  price: number;
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
  samagriPrice?: number;
  isPopular: boolean;
  isActive: boolean;
  type: 'online' | 'offline';
  duration: number;
  createdAt?: Date;
  updatedAt?: Date;
}
