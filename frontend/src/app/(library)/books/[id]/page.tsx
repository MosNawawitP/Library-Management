import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BookList } from "@/features/books/book-list";

export default async function BookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");
  const { id } = await params;
  return (
    <main className="mx-auto max-w-[1600px]">
      <BookList
        accessToken={session.accessToken}
        initialQuery={{ page: 1, pageSize: 10, search: "", categoryId: "" }}
        initialBookId={id}
      />
    </main>
  );
}
