import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BookList } from "@/features/books/book-list";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");
  const params = await searchParams;
  const page = Number(params.page);
  const pageSize = Number(params.pageSize);
  const initialQuery = {
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    pageSize:
      Number.isSafeInteger(pageSize) && pageSize >= 1 && pageSize <= 100
        ? pageSize
        : 10,
    search: typeof params.search === "string" ? params.search : "",
    categoryId: typeof params.categoryId === "string" ? params.categoryId : "",
  };
  return (
    <main className="mx-auto max-w-[1600px]">
      <BookList accessToken={session.accessToken} initialQuery={initialQuery} />
    </main>
  );
}
