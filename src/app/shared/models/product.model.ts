export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  categories: string[];
  brand?: string;
  imageUrls: string[];
  rating?: number;
  inStock?: boolean;
  attributes?: Record<string, unknown>;
}

export interface ProductPageResponse {
  items: Product[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface SearchFilters {
  categories?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  attributes?: string[];
  inStock?: boolean;
  minRating?: number;
}

export interface SearchRequest {
  searchTerm: string;
  filters?: SearchFilters;
  page?: number;
  size?: number;
  sortBy?: 'relevance' | 'price' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  results: Product[];
  totalHits: number;
  page: number;
  size: number;
  totalPages: number;
}
