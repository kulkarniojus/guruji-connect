export type PopularPujaCatalogEntry = {
  name: string;
  description: string;
  basePrice: number;
  price: number;
  type: 'offline' | 'online';
  duration: number;
  items: string[];
  imageUrl: string;
  samagri: Array<{
    name: string;
    quantity: number;
    optional: boolean;
    price: number;
    unit?: string;
  }>;
};

// Public catalog snapshot from development. Existing production prices and
// booking records are never replaced by this list.
export const popularPujaCatalogSnapshot: PopularPujaCatalogEntry[] = [
  {
    name: 'Durga Puja',
    description: 'Devotional worship of Goddess Durga with traditional offerings, prayers, and aarti for family and community occasions.',
    basePrice: 3500,
    price: 3500,
    type: 'offline',
    duration: 120,
    items: [],
    imageUrl: '/images/pujas/durga.jpg',
    samagri: [],
  },
  {
    name: 'Ganesh Puja',
    description: 'A ceremony dedicated to Lord Ganesha, the remover of obstacles.',
    basePrice: 1800,
    price: 1800,
    type: 'offline',
    duration: 90,
    items: ['Modak', 'Red flowers', 'Durva grass', 'Red sandal paste'],
    imageUrl: '/images/pujas/ganesh.jpg',
    samagri: [],
  },
  {
    name: 'Griha Pravesh',
    description: 'A house warming ceremony performed when entering a new home.',
    basePrice: 4000,
    price: 4000,
    type: 'offline',
    duration: 180,
    items: ['Coconut', 'Rice', 'Fruits', 'Flowers', 'Ghee', 'Mango leaves'],
    imageUrl: '/images/pujas/havan.jpg',
    samagri: [],
  },
  {
    name: 'Mahalakshmi Puja',
    description: 'Mahalakshmi Puja',
    basePrice: 5000,
    price: 3999,
    type: 'offline',
    duration: 60,
    items: [],
    imageUrl: '/images/pujas/lakshmi.jpg',
    samagri: [],
  },
  {
    name: 'Rudrabhishek',
    description: 'Traditional abhishek and worship of Lord Shiva with Vedic chanting. Discuss offerings and preparation with your Guruji.',
    basePrice: 3500,
    price: 3850,
    type: 'offline',
    duration: 120,
    items: [],
    imageUrl: '/images/pujas/shiva.jpg',
    samagri: [],
  },
  {
    name: 'Satyanarayan Puja',
    description: 'A ceremony dedicated to Lord Vishnu, seeking blessings for prosperity and peace.',
    basePrice: 2500,
    price: 2000,
    type: 'offline',
    duration: 120,
    items: ['Rice', 'Fruits', 'Flowers', 'Ghee', 'Sugar', 'Incense sticks'],
    imageUrl: '/images/pujas/altar.jpg',
    samagri: [
      { name: 'Oil dabbi', quantity: 1, optional: true, price: 0 },
      { name: 'Halad Kumkum Pardi', quantity: 1, optional: true, price: 0, unit: '2 small packets' },
      { name: 'Flowers', quantity: 1, optional: false, price: 0 },
      { name: 'Har', quantity: 1, optional: false, price: 0 },
      { name: 'Satya Narayan God Photo', quantity: 1, optional: false, price: 0 },
    ],
  },
];
