export interface Book {
  id: string;
  bookCode: string;
  title: string;
  author: string;
  isbn: string | null;
  categoryId: string;
  categoryName: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface BookInput {
  bookCode: string;
  title: string;
  author: string;
  isbn: string | null;
  categoryId: string;
  totalCopies: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface BookQuery {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string;
}

export interface BookPage {
  books: Book[];
  pagination: Pagination;
}

export interface BookCategory {
  id: string;
  name: string;
}

export type BookFieldErrors = Partial<Record<keyof BookInput, string>>;
