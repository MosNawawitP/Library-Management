import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BooksApiError,
  deleteBook,
  getBook,
  getBookCategories,
  getBooks,
  saveBook,
} from "../src/features/books/books.api.ts";

const testApiUrl = process.env.LIBRARY_BOOKS_TEST_API_URL;

test(
  "Books API supports authenticated CRUD, combined filters, pagination and conflicts",
  { skip: !testApiUrl },
  async () => {
    // This suite is opt-in and restricted to the isolated local test server.
    assert.equal(testApiUrl, "http://localhost:5099");
    const originalUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = testApiUrl;
    const createdIds: string[] = [];
    let token = "";
    try {
      const loginResponse = await fetch(`${testApiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "Library@123" }),
      });
      assert.equal(loginResponse.status, 200);
      const login = await loginResponse.json();
      token = login.data.token;
      const categories = await getBookCategories(token);
      assert.ok(categories.length > 0);
      const categoryId = categories[0].id;
      const marker = `BOOKS-TEST-${Date.now()}`;
      const input = {
        bookCode: `${marker}-1`,
        title: `${marker} Title`,
        author: "Test author",
        isbn: null,
        categoryId,
        totalCopies: 3,
      };
      for (let index = 1; index <= 3; index += 1) {
        const book = await saveBook(token, {
          ...input,
          bookCode: `${marker}-${index}`,
        });
        createdIds.push(book.id);
        assert.equal(book.availableCopies, 3);
      }
      const firstPage = await getBooks(token, {
        search: marker,
        categoryId,
        page: 1,
        pageSize: 2,
      });
      assert.equal(firstPage.books.length, 2);
      assert.deepEqual(firstPage.pagination, {
        page: 1,
        pageSize: 2,
        totalItems: 3,
        totalPages: 2,
      });
      const secondPage = await getBooks(token, {
        search: marker,
        categoryId,
        page: 2,
        pageSize: 2,
      });
      assert.equal(secondPage.books.length, 1);
      const updated = await saveBook(
        token,
        { ...input, title: `${marker} Updated`, totalCopies: 4 },
        createdIds[0],
      );
      assert.equal(updated.totalCopies, 4);
      assert.equal(updated.availableCopies, 4);
      assert.equal(
        (await getBook(token, createdIds[0])).title,
        `${marker} Updated`,
      );
      await assert.rejects(
        saveBook(token, {
          ...input,
          bookCode: ` ${input.bookCode.toLowerCase()} `,
        }),
        (error: unknown) =>
          error instanceof BooksApiError && error.status === 409,
      );
      await assert.rejects(
        saveBook(token, { ...input, title: "" }),
        (error: unknown) =>
          error instanceof BooksApiError &&
          error.status === 400 &&
          Boolean(error.fieldErrors.title),
      );
      const anonymous = await fetch(`${testApiUrl}/api/books`);
      assert.equal(anonymous.status, 401);
      const deletedId = createdIds.pop()!;
      await deleteBook(token, deletedId);
      await assert.rejects(
        getBook(token, deletedId),
        (error: unknown) =>
          error instanceof BooksApiError && error.status === 404,
      );
      const remaining = await getBooks(token, {
        search: marker,
        categoryId,
        page: 1,
        pageSize: 2,
      });
      assert.equal(remaining.pagination.totalItems, 2);
      assert.equal(remaining.pagination.totalPages, 1);
      for (const id of createdIds.splice(0)) await deleteBook(token, id);
      const empty = await getBooks(token, {
        search: marker,
        categoryId,
        page: 1,
        pageSize: 2,
      });
      assert.equal(empty.books.length, 0);
      assert.equal(empty.pagination.totalItems, 0);
    } finally {
      // Records exist only in the separate test storage directory.
      if (token)
        await Promise.allSettled(createdIds.map((id) => deleteBook(token, id)));
      if (originalUrl === undefined)
        delete process.env.NEXT_PUBLIC_API_BASE_URL;
      else process.env.NEXT_PUBLIC_API_BASE_URL = originalUrl;
    }
  },
);
