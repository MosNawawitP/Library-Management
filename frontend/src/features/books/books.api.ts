import { signOut } from "next-auth/react";
import type {
  Book,
  BookCategory,
  BookFieldErrors,
  BookInput,
  BookPage,
  BookQuery,
  Pagination,
} from "./books.types";

type UnauthorizedHandler = () => Promise<void>;

export class BooksApiError extends Error {
  readonly status: number;
  readonly fieldErrors: BookFieldErrors;

  constructor(message: string, status = 0, fieldErrors: BookFieldErrors = {}) {
    super(message);
    this.name = "BooksApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function getBooks(
  token: string,
  query: BookQuery,
  signal?: AbortSignal,
  onUnauthorized?: UnauthorizedHandler,
): Promise<BookPage> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.categoryId) params.set("categoryId", query.categoryId);
  const payload = await request(
    `/api/books?${params}`,
    token,
    { signal },
    onUnauthorized,
  );
  if (
    !Array.isArray(payload.data) ||
    !payload.data.every(isBook) ||
    !isPagination(payload.meta)
  )
    throw invalidResponse();
  return { books: payload.data, pagination: payload.meta };
}

export async function getBook(
  token: string,
  id: string,
  signal?: AbortSignal,
): Promise<Book> {
  const payload = await request(`/api/books/${encodeURIComponent(id)}`, token, {
    signal,
  });
  if (!isBook(payload.data)) throw invalidResponse();
  return payload.data;
}

// The bare Categories endpoint is the contract's all-category lookup for book forms.
export async function getBookCategories(
  token: string,
  signal?: AbortSignal,
): Promise<BookCategory[]> {
  const payload = await request("/api/categories", token, { signal });
  if (!Array.isArray(payload.data) || !payload.data.every(isCategory))
    throw invalidResponse();
  return payload.data.map(({ id, name }) => ({ id, name }));
}

export async function saveBook(
  token: string,
  input: BookInput,
  id?: string,
): Promise<Book> {
  const { bookCode, title, author, isbn, categoryId, totalCopies } = input;
  const payload = await request(
    id ? `/api/books/${encodeURIComponent(id)}` : "/api/books",
    token,
    {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({
        bookCode: bookCode.trim(),
        title: title.trim(),
        author: author.trim(),
        isbn: isbn?.trim() || null,
        categoryId,
        totalCopies,
      }),
    },
  );
  if (!isBook(payload.data)) throw invalidResponse();
  return payload.data;
}

export async function deleteBook(token: string, id: string): Promise<void> {
  const payload = await request(`/api/books/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
  if (payload.status !== 204) throw invalidResponse();
}

async function request(
  path: string,
  token: string,
  init: RequestInit = {},
  onUnauthorized: UnauthorizedHandler = clearSession,
): Promise<Record<string, unknown>> {
  const baseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl)
    throw new BooksApiError("ยังไม่ได้กำหนดการเชื่อมต่อระบบหนังสือ");
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
    throw new BooksApiError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง");
  }
  if (response.status === 401) {
    await onUnauthorized();
    throw new BooksApiError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
  }
  if (response.status === 204) return { status: 204 };
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BooksApiError("ข้อมูลตอบกลับจากระบบไม่ถูกต้อง", response.status);
  }
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง";
    throw new BooksApiError(message, response.status, readFieldErrors(payload));
  }
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    typeof payload.message !== "string" ||
    !Object.hasOwn(payload, "data") ||
    !Object.hasOwn(payload, "meta")
  )
    throw invalidResponse();
  return payload;
}

async function clearSession(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

function invalidResponse(): BooksApiError {
  return new BooksApiError(
    "รูปแบบข้อมูลหนังสือที่ได้รับไม่ถูกต้อง กรุณาลองอีกครั้ง",
  );
}

function readFieldErrors(payload: unknown): BookFieldErrors {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !isRecord(payload.data.errors)
  )
    return {};
  const result: BookFieldErrors = {};
  const fields: (keyof BookInput)[] = [
    "bookCode",
    "title",
    "author",
    "isbn",
    "categoryId",
    "totalCopies",
  ];
  for (const [key, messages] of Object.entries(payload.data.errors)) {
    const field = fields.find(
      (name) => name.toLowerCase() === key.toLowerCase(),
    );
    if (field && Array.isArray(messages))
      result[field] = messages
        .filter((message): message is string => typeof message === "string")
        .join(" ");
  }
  return result;
}

function isBook(value: unknown): value is Book {
  if (!isRecord(value)) return false;
  return (
    ["id", "bookCode", "title", "author", "categoryId", "categoryName"].every(
      (key) => typeof value[key] === "string" && value[key].trim().length > 0,
    ) &&
    (value.isbn === null || typeof value.isbn === "string") &&
    isInteger(value.totalCopies, 1) &&
    isInteger(value.availableCopies, 0) &&
    value.availableCopies <= value.totalCopies &&
    isDate(value.createdAt) &&
    (value.updatedAt === null || isDate(value.updatedAt))
  );
}

function isCategory(value: unknown): value is BookCategory {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0
  );
}

function isPagination(value: unknown): value is Pagination {
  return (
    isRecord(value) &&
    isInteger(value.page, 1) &&
    isInteger(value.pageSize, 1) &&
    value.pageSize <= 100 &&
    isInteger(value.totalItems, 0) &&
    isInteger(value.totalPages, 0) &&
    value.totalPages === Math.ceil(value.totalItems / value.pageSize)
  );
}

function isInteger(value: unknown, minimum: number): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
  );
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
