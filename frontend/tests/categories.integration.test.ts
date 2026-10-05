import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CategoriesApiError,
  deleteCategory,
  getCategories,
  getCategory,
  getCategoryLookup,
  saveCategory,
} from "../src/features/categories/categories.api.ts";
import {
  deleteBook,
  getBook,
  saveBook,
} from "../src/features/books/books.api.ts";

const testApiUrl = process.env.LIBRARY_CATEGORIES_TEST_API_URL;

test(
  "Categories API supports CRUD, pagination and shared Books lookup",
  { skip: !testApiUrl },
  async () => {
    // Never run mutations against the user's runtime storage.
    assert.equal(testApiUrl, "http://localhost:5099");
    const originalUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = testApiUrl;
    const categoryIds: string[] = [];
    const bookIds: string[] = [];
    let token = "";
    const status = (expected: number) => (error: unknown) =>
      error instanceof CategoriesApiError && error.status === expected;
    try {
      const response = await fetch(`${testApiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "Library@123" }),
      });
      assert.equal(response.status, 200);
      token = (await response.json()).data.token;
      const marker = `CATEGORIES-TEST-${Date.now()}`;
      const first = await saveCategory(token, ` ${marker}-A `);
      categoryIds.push(first.id);
      assert.equal(first.name, `${marker}-A`);
      const second = await saveCategory(token, `${marker}-B`);
      categoryIds.push(second.id);
      const page = await getCategories(token, {
        search: marker.toLowerCase(),
        page: 1,
        pageSize: 1,
      });
      assert.deepEqual(page.pagination, {
        page: 1,
        pageSize: 1,
        totalItems: 2,
        totalPages: 2,
      });
      assert.equal(page.categories[0].id, first.id);
      assert.equal(
        (await getCategories(token, { search: marker, page: 2, pageSize: 1 }))
          .categories[0].id,
        second.id,
      );
      await assert.rejects(
        saveCategory(token, ` ${first.name.toLowerCase()} `),
        status(409),
      );
      await assert.rejects(
        saveCategory(token, first.name, second.id),
        status(409),
      );
      await assert.rejects(saveCategory(token, " "), status(400));
      await assert.rejects(saveCategory(token, "x".repeat(101)), status(400));
      const book = await saveBook(token, {
        bookCode: marker,
        title: marker,
        author: "Integration test",
        isbn: null,
        categoryId: first.id,
        totalCopies: 1,
      });
      bookIds.push(book.id);
      const updated = await saveCategory(token, `${marker}-Renamed`, first.id);
      assert.equal(updated.createdAt, first.createdAt);
      assert.ok(updated.updatedAt);
      assert.equal((await getCategory(token, first.id)).name, updated.name);
      assert.equal(
        (await getCategoryLookup(token)).find(
          (category) => category.id === first.id,
        )?.name,
        updated.name,
      );
      assert.equal((await getBook(token, book.id)).categoryName, updated.name);
      await assert.rejects(deleteCategory(token, first.id), status(409));
      assert.equal((await fetch(`${testApiUrl}/api/categories`)).status, 401);
      await deleteBook(token, book.id);
      bookIds.splice(0);
      await deleteCategory(token, first.id);
      categoryIds.splice(categoryIds.indexOf(first.id), 1);
      await assert.rejects(getCategory(token, first.id), status(404));
      await deleteCategory(token, second.id);
      categoryIds.splice(0);
      const empty = await getCategories(token, {
        search: marker,
        page: 1,
        pageSize: 10,
      });
      assert.equal(empty.categories.length, 0);
      assert.equal(empty.pagination.totalItems, 0);
    } finally {
      if (token) {
        await Promise.allSettled(bookIds.map((id) => deleteBook(token, id)));
        await Promise.allSettled(
          categoryIds.map((id) => deleteCategory(token, id)),
        );
      }
      if (originalUrl === undefined)
        delete process.env.NEXT_PUBLIC_API_BASE_URL;
      else process.env.NEXT_PUBLIC_API_BASE_URL = originalUrl;
    }
  },
);
