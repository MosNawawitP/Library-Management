import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  CategoriesApiError,
  getCategories,
  getCategoryLookup,
  saveCategory,
  deleteCategory,
} from "../src/features/categories/categories.api.ts";
const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const category = {
  id: "10000000-0000-0000-0000-000000000003",
  name: "Technology",
  createdAt: "2026-10-04T00:00:00+00:00",
  updatedAt: null,
};
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5088";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = originalUrl;
});
test("category management requests pagination while Books lookup requests all categories", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer token",
    );
    const request = new URL(String(url));
    const meta = request.search
      ? { page: 2, pageSize: 10, totalItems: 11, totalPages: 2 }
      : null;
    if (meta)
      assert.equal(request.searchParams.get("search"), "tech & science");
    return Response.json({
      success: true,
      message: "ok",
      data: [category],
      meta,
    });
  };
  assert.equal(
    (
      await getCategories("token", {
        page: 2,
        pageSize: 10,
        search: "tech & science",
      })
    ).pagination.totalItems,
    11,
  );
  assert.deepEqual(await getCategoryLookup("token"), [
    { id: category.id, name: category.name },
  ]);
});
test("category writes use only trimmed name and delete handles 204", async () => {
  for (const id of [undefined, category.id]) {
    globalThis.fetch = async (_url, init) => {
      assert.equal(init?.method, id ? "PUT" : "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), { name: "Science" });
      return Response.json({
        success: true,
        message: "ok",
        data: category,
        meta: null,
      });
    };
    await saveCategory("token", " Science ", id);
  }
  globalThis.fetch = async () => new Response(null, { status: 204 });
  await deleteCategory("token", category.id);
});
test("category validation, reference conflict and malformed data are reported", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        message: "Invalid name",
        data: { errors: { Name: ["Name is required."] } },
        meta: null,
      },
      { status: 400 },
    );
  await assert.rejects(
    saveCategory("token", ""),
    (error: unknown) =>
      error instanceof CategoriesApiError &&
      error.nameError === "Name is required.",
  );
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        message: "Referenced by books",
        data: null,
        meta: null,
      },
      { status: 409 },
    );
  await assert.rejects(
    deleteCategory("token", category.id),
    (error: unknown) =>
      error instanceof CategoriesApiError && error.status === 409,
  );
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      message: "ok",
      data: [{ ...category, name: 123 }],
      meta: null,
    });
  await assert.rejects(getCategoryLookup("token"), CategoriesApiError);
});
