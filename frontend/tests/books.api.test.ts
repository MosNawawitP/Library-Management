import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  BooksApiError,
  getBooks,
  getBook,
  getBookCategories,
  saveBook,
  deleteBook,
} from "../src/features/books/books.api.ts";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const book = {
  id: "33333333-3333-3333-3333-333333333333",
  bookCode: "BK-001",
  title: "Clean Code",
  author: "Robert C. Martin",
  isbn: null,
  categoryId: "10000000-0000-0000-0000-000000000003",
  categoryName: "Technology",
  totalCopies: 3,
  availableCopies: 2,
  createdAt: "2026-10-04T11:30:00+00:00",
  updatedAt: null,
};
const input = {
  bookCode: book.bookCode,
  title: book.title,
  author: book.author,
  isbn: null,
  categoryId: book.categoryId,
  totalCopies: 3,
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5088/";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = originalUrl;
});

test("book list sends combined filters and uses API pagination metadata", async () => {
  globalThis.fetch = async (url, init) => {
    const request = new URL(String(url));
    assert.equal(request.pathname, "/api/books");
    assert.equal(request.searchParams.get("search"), "clean & code");
    assert.equal(request.searchParams.get("categoryId"), book.categoryId);
    assert.equal(request.searchParams.get("page"), "2");
    assert.equal(request.searchParams.get("pageSize"), "10");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer token",
    );
    assert.equal(init?.cache, "no-store");
    return Response.json({
      success: true,
      message: "ok",
      data: [book],
      meta: { page: 2, pageSize: 10, totalItems: 11, totalPages: 2 },
    });
  };
  const result = await getBooks("token", {
    search: "clean & code",
    categoryId: book.categoryId,
    page: 2,
    pageSize: 10,
  });
  assert.equal(result.pagination.totalItems, 11);
  assert.equal(result.books[0].availableCopies, 2);
});

test("book list rejects missing metadata and malformed book fields", async () => {
  for (const payload of [
    { success: true, message: "ok", data: [book], meta: null },
    {
      success: true,
      message: "ok",
      data: [{ ...book, availableCopies: "3" }],
      meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    },
    {
      success: false,
      message: "error",
      data: [],
      meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
    },
  ]) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(
      getBooks("token", { search: "", categoryId: "", page: 1, pageSize: 10 }),
      BooksApiError,
    );
  }
});

test("book writes send only editable fields for POST and PUT", async () => {
  for (const id of [undefined, book.id]) {
    globalThis.fetch = async (url, init) => {
      assert.equal(
        String(url),
        `http://localhost:5088/api/books${id ? `/${id}` : ""}`,
      );
      assert.equal(init?.method, id ? "PUT" : "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), input);
      return Response.json(
        { success: true, message: "ok", data: book, meta: null },
        { status: id ? 200 : 201 },
      );
    };
    assert.equal(
      (await saveBook("token", { ...book, ...input }, id)).id,
      book.id,
    );
  }
});

test("delete handles 204 without reading a response body", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), `http://localhost:5088/api/books/${book.id}`);
    assert.equal(init?.method, "DELETE");
    const response = new Response(null, { status: 204 });
    response.json = async () => {
      throw new Error("204 must not be parsed");
    };
    return response;
  };
  await deleteBook("token", book.id);
});

test("book errors preserve validation fields and conflict messages", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        message: "Validation failed",
        data: {
          errors: {
            TotalCopies: ["Must be positive"],
            categoryId: ["Unknown category"],
          },
        },
        meta: null,
      },
      { status: 400 },
    );
  await assert.rejects(
    saveBook("token", input),
    (error: unknown) =>
      error instanceof BooksApiError &&
      error.fieldErrors.totalCopies === "Must be positive" &&
      error.fieldErrors.categoryId === "Unknown category",
  );
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        message: "A book with loan history cannot be deleted.",
        data: null,
        meta: null,
      },
      { status: 409 },
    );
  await assert.rejects(
    deleteBook("token", book.id),
    (error: unknown) =>
      error instanceof BooksApiError &&
      error.status === 409 &&
      error.message.includes("loan history"),
  );
});

test("unauthorized responses clear the session even without JSON", async () => {
  let clears = 0;
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(
    getBooks(
      "token",
      { search: "", categoryId: "", page: 1, pageSize: 10 },
      undefined,
      async () => {
        clears += 1;
      },
    ),
    (error: unknown) => error instanceof BooksApiError && error.status === 401,
  );
  assert.equal(clears, 1);
});

test("category lookup and single book requests validate their payloads", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/api/categories"))
      return Response.json({
        success: true,
        message: "ok",
        data: [{ id: book.categoryId, name: "Technology" }],
        meta: null,
      });
    return Response.json({
      success: true,
      message: "ok",
      data: book,
      meta: null,
    });
  };
  assert.equal((await getBookCategories("token"))[0].name, "Technology");
  assert.equal((await getBook("token", book.id)).title, "Clean Code");
});
