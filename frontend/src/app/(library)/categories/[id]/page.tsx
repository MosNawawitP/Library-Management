import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CategoryList } from "@/features/categories/category-list";

export default async function CategoryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");
  const { id } = await params;
  return (
    <main className="mx-auto max-w-[1500px]">
      <CategoryList
        accessToken={session.accessToken}
        initialQuery={{ page: 1, pageSize: 10, search: "" }}
        initialId={id}
      />
    </main>
  );
}
