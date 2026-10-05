import { signOut } from "next-auth/react";
import type { Category, CategoryPage, CategoryQuery } from "./categories.types";

export class CategoriesApiError extends Error {
  readonly status: number;
  readonly nameError: string;

  constructor(message: string, status = 0, nameError = "") {
    super(message);
    this.name = "CategoriesApiError";
    this.status = status;
    this.nameError = nameError;
  }
}

export async function getCategories(
  token: string,
  query: CategoryQuery,
  signal?: AbortSignal,
): Promise<CategoryPage> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search.trim()) params.set("search", query.search.trim());
  const payload = await request(`/api/categories?${params}`, token, { signal });
  const meta = payload.meta;
  if (
    !Array.isArray(payload.data) ||
    !payload.data.every(isCategory) ||
    !isRecord(meta) ||
    !integer(meta.page, 1) ||
    !integer(meta.pageSize, 1) ||
    meta.pageSize > 100 ||
    !integer(meta.totalItems, 0) ||
    !integer(meta.totalPages, 0) ||
    meta.totalPages !== Math.ceil(meta.totalItems / meta.pageSize)
  )
    throw invalidResponse();
  return {
    categories: payload.data,
    pagination: {
      page: meta.page,
      pageSize: meta.pageSize,
      totalItems: meta.totalItems,
      totalPages: meta.totalPages,
    },
  };
}

export async function getCategoryLookup(
  token: string,
  signal?: AbortSignal,
): Promise<{ id: string; name: string }[]> {
  const payload = await request("/api/categories", token, { signal });
  if (
    !Array.isArray(payload.data) ||
    !payload.data.every(isCategory) ||
    payload.meta !== null
  )
    throw invalidResponse();
  return payload.data.map(({ id, name }) => ({ id, name }));
}

export async function getCategory(
  token: string,
  id: string,
  signal?: AbortSignal,
): Promise<Category> {
  const payload = await request(
    `/api/categories/${encodeURIComponent(id)}`,
    token,
    { signal },
  );
  if (!isCategory(payload.data)) throw invalidResponse();
  return payload.data;
}

export async function saveCategory(
  token: string,
  name: string,
  id?: string,
): Promise<Category> {
  const payload = await request(
    id ? `/api/categories/${encodeURIComponent(id)}` : "/api/categories",
    token,
    {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({ name: name.trim() }),
    },
  );
  if (!isCategory(payload.data)) throw invalidResponse();
  return payload.data;
}

export async function deleteCategory(token: string, id: string): Promise<void> {
  const payload = await request(
    `/api/categories/${encodeURIComponent(id)}`,
    token,
    { method: "DELETE" },
  );
  if (payload.status !== 204) throw invalidResponse();
}

async function request(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const baseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl)
    throw new CategoriesApiError("ยังไม่ได้กำหนดการเชื่อมต่อ API หมวดหมู่");
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new CategoriesApiError(
      "ไม่สามารถเชื่อมต่อระบบหมวดหมู่ได้ กรุณาลองอีกครั้ง",
    );
  }
  if (response.status === 401) {
    await signOut({ redirectTo: "/login" });
    throw new CategoriesApiError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
  }
  if (response.status === 204) return { status: 204 };
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw invalidResponse();
  }
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง";
    let nameError = "";
    if (
      isRecord(payload) &&
      isRecord(payload.data) &&
      isRecord(payload.data.errors)
    ) {
      const entry = Object.entries(payload.data.errors).find(
        ([key]) => key.toLowerCase() === "name",
      );
      if (entry && Array.isArray(entry[1]))
        nameError = entry[1]
          .filter((value): value is string => typeof value === "string")
          .join(" ");
    }
    throw new CategoriesApiError(message, response.status, nameError);
  }
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    typeof payload.message !== "string" ||
    !Object.hasOwn(payload, "meta")
  )
    throw invalidResponse();
  return payload;
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    date(value.createdAt) &&
    (value.updatedAt === null || date(value.updatedAt))
  );
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function integer(value: unknown, minimum: number): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
  );
}
function date(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
function invalidResponse(): CategoriesApiError {
  return new CategoriesApiError("รูปแบบข้อมูลหมวดหมู่ที่ได้รับไม่ถูกต้อง");
}
