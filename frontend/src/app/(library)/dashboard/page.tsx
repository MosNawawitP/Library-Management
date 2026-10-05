import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BooksApiError, getBooks } from "@/features/books/books.api";
import type { Book } from "@/features/books/books.types";
import {
  CategoriesApiError,
  getCategories,
} from "@/features/categories/categories.api";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import type { DashboardData } from "@/features/dashboard/dashboard.types";

const DASHBOARD_PAGE_SIZE = 100;
const RECENT_BOOK_LIMIT = 5;

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect("/login");
  }

  let dashboard: DashboardData | undefined;
  let errorMessage = "";

  try {
    dashboard = await loadDashboard(session.accessToken);
  } catch (error) {
    errorMessage = getDashboardErrorMessage(error);
  }

  if (dashboard) {
    return (
      <main className="mx-auto max-w-[1500px]">
        <DashboardOverview state="ready" dashboard={dashboard} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1500px]">
      <DashboardOverview state="error" errorMessage={errorMessage} />
    </main>
  );
}

function getDashboardErrorMessage(error: unknown): string {
  if (!(error instanceof BooksApiError || error instanceof CategoriesApiError)) {
    return "เกิดข้อผิดพลาดระหว่างโหลดข้อมูลแดชบอร์ด กรุณาลองใหม่อีกครั้ง";
  }

  if (error.status === 401) {
    return "เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
  }

  return error.message;
}

async function loadDashboard(accessToken: string): Promise<DashboardData> {
  const [firstBookPage, categoryPage] = await Promise.all([
    getBooks(accessToken, {
      page: 1,
      pageSize: DASHBOARD_PAGE_SIZE,
      search: "",
      categoryId: "",
    }),
    getCategories(accessToken, {
      page: 1,
      pageSize: 1,
      search: "",
    }),
  ]);
  const remainingBooks = await loadRemainingBooks(
    accessToken,
    firstBookPage.pagination.totalPages,
  );
  const books = [...firstBookPage.books, ...remainingBooks];

  return {
    summary: {
      totalBooks: firstBookPage.pagination.totalItems,
      totalBookCopies: books.reduce(
        (total, book) => total + book.totalCopies,
        0,
      ),
      totalCategories: categoryPage.pagination.totalItems,
    },
    recentBooks: firstBookPage.books.slice(0, RECENT_BOOK_LIMIT),
  };
}

async function loadRemainingBooks(
  accessToken: string,
  totalPages: number,
): Promise<Book[]> {
  const requests = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
    getBooks(accessToken, {
      page: index + 2,
      pageSize: DASHBOARD_PAGE_SIZE,
      search: "",
      categoryId: "",
    }),
  );
  const pages = await Promise.all(requests);
  return pages.flatMap((page) => page.books);
}
