import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CategoryList } from "@/features/categories/category-list";

export default async function CategoriesPage({
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
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize:
      Number.isSafeInteger(pageSize) && pageSize > 0 && pageSize <= 100
        ? pageSize
        : 10,
    search: typeof params.search === "string" ? params.search : "",
  };
  return (
    <main className="mx-auto max-w-[1500px]">
      <CategoryList
        accessToken={session.accessToken}
        initialQuery={initialQuery}
      />
    </main>
  );
}
