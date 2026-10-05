export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CategoryQuery {
  search: string;
  page: number;
  pageSize: number;
}

export interface CategoryPage {
  categories: Category[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
