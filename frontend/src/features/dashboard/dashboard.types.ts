export interface DashboardSummary {
  totalBooks: number;
  totalBookCopies: number;
  totalCategories: number;
}

export interface DashboardRecentBook {
  id: string;
  bookCode: string;
  title: string;
  author: string;
  categoryId: string;
  categoryName: string;
  totalCopies: number;
  createdAt: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentBooks: DashboardRecentBook[];
}
