"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  BooksApiError,
  deleteBook,
  getBook,
  getBooks,
  saveBook,
} from "./books.api";
import {
  CategoriesApiError,
  getCategoryLookup,
} from "../categories/categories.api";
import { BookForm } from "./book-form";
import { formatThaiDateTime } from "@/lib/thai-date-time";
import type {
  Book,
  BookCategory,
  BookFieldErrors,
  BookInput,
  BookPage,
  BookQuery,
} from "./books.types";

interface BookListProps {
  accessToken: string;
  initialQuery: BookQuery;
  initialBookId?: string;
}

const BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");

export function BookList({
  accessToken,
  initialQuery,
  initialBookId,
}: BookListProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<BookPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [categoryReload, setCategoryReload] = useState(0);
  const [editor, setEditor] = useState<{ book: Book | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<BookFieldErrors>({});
  const [notice, setNotice] = useState("");
  const triggerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setListError("");
      try {
        const page = await getBooks(accessToken, query, controller.signal);
        if (controller.signal.aborted) return;
        if (page.pagination.page > Math.max(1, page.pagination.totalPages)) {
          const corrected = {
            ...query,
            page: Math.max(1, page.pagination.totalPages),
          };
          setQuery(corrected);
          replaceQueryUrl(corrected);
          return;
        }
        setResult(page);
      } catch (error) {
        if (!controller.signal.aborted) setListError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [accessToken, query, reload]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setCategoriesLoading(true);
      setCategoryError("");
      try {
        const lookup = await getCategoryLookup(accessToken, controller.signal);
        if (!controller.signal.aborted) setCategories(lookup);
      } catch (error) {
        if (!controller.signal.aborted) setCategoryError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      }
    }
    void load();
    function refreshOnFocus() {
      setCategoryReload((value) => value + 1);
      setReload((value) => value + 1);
    }
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [accessToken, categoryReload]);

  useEffect(() => {
    if (!initialBookId) return;
    const controller = new AbortController();
    void getBook(accessToken, initialBookId, controller.signal)
      .then((book) => {
        if (!controller.signal.aborted) setEditor({ book });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDetailError(errorMessage(error));
      });
    return () => controller.abort();
  }, [accessToken, initialBookId]);

  function changeQuery(next: BookQuery) {
    setLoading(true);
    setNotice("");
    setQuery(next);
    replaceQueryUrl(next);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    changeQuery({
      ...query,
      page: 1,
      search: String(values.get("search") ?? "").trim(),
      categoryId: String(values.get("categoryId") ?? ""),
    });
  }

  function openEditor(book: Book | null, trigger: HTMLElement) {
    triggerRef.current = trigger;
    setMutationError("");
    setFieldErrors({});
    setEditor({ book });
  }

  function closeDialog() {
    if (busy) return;
    setEditor(null);
    setDeleteTarget(null);
    setMutationError("");
    setFieldErrors({});
    restoreFocus();
  }

  function restoreFocus() {
    requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
        return;
      }
      headingRef.current?.focus();
    });
  }

  async function handleSave(input: BookInput) {
    if (busy) return;
    setBusy(true);
    setMutationError("");
    setFieldErrors({});
    try {
      await saveBook(accessToken, input, editor?.book?.id);
      setEditor(null);
      setNotice(
        editor?.book
          ? "แก้ไขหนังสือเรียบร้อยแล้ว"
          : "เพิ่มหนังสือเรียบร้อยแล้ว",
      );
      setLoading(true);
      setReload((value) => value + 1);
      router.refresh();
      restoreFocus();
    } catch (error) {
      setMutationError(errorMessage(error));
      if (error instanceof BooksApiError) setFieldErrors(error.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy || !deleteTarget) return;
    setBusy(true);
    setMutationError("");
    try {
      await deleteBook(accessToken, deleteTarget.id);
      setDeleteTarget(null);
      setNotice("ลบหนังสือเรียบร้อยแล้ว");
      setLoading(true);
      setReload((value) => value + 1);
      router.refresh();
      restoreFocus();
    } catch (error) {
      setMutationError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const pagination = result?.pagination;
  const firstItem =
    pagination && pagination.totalItems > 0
      ? (pagination.page - 1) * pagination.pageSize + 1
      : 0;
  const lastItem = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.totalItems)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-blue-600">จัดการคลังหนังสือ</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-3xl font-bold tracking-tight text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            หนังสือ
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            ค้นหา เพิ่ม และดูแลข้อมูลหนังสือในห้องสมุด
          </p>
        </div>
        <button
          type="button"
          disabled={
            categoriesLoading ||
            Boolean(categoryError) ||
            categories.length === 0
          }
          onClick={(event) => openEditor(null, event.currentTarget)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          เพิ่มหนังสือ
        </button>
      </div>
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      ) : null}
      {detailError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          ไม่สามารถเปิดหนังสือได้: {detailError}{" "}
          <Link href="/books" className="font-bold underline">
            กลับหน้ารายการ
          </Link>
        </p>
      ) : null}
      {categoryError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>โหลดหมวดหมู่ไม่สำเร็จ: {categoryError}</p>
          <button
            type="button"
            onClick={() => setCategoryReload((value) => value + 1)}
            className={BUTTON_CLASS}
          >
            ลองโหลดหมวดหมู่ใหม่
          </button>
        </div>
      ) : null}
      {!categoriesLoading && !categoryError && categories.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          กรุณาเพิ่มหมวดหมู่ก่อนเพิ่มหนังสือ{" "}
          <Link href="/categories" className="font-bold underline">
            ไปหน้าหมวดหมู่
          </Link>
        </p>
      ) : null}
      <section
        aria-label="รายการหนังสือ"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,43,82,0.05)]"
      >
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5"
        >
          <div className="min-w-48 flex-1">
            <label
              htmlFor="book-search"
              className="mb-1.5 block text-sm font-semibold text-slate-600"
            >
              ค้นหาหนังสือ
            </label>
            <input
              id="book-search"
              name="search"
              defaultValue={initialQuery.search}
              placeholder="รหัส ชื่อหนังสือ ผู้แต่ง หรือ ISBN"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div>
            <label
              htmlFor="book-filter-category"
              className="mb-1.5 block text-sm font-semibold text-slate-600"
            >
              หมวดหมู่
            </label>
            <select
              id="book-filter-category"
              name="categoryId"
              defaultValue={initialQuery.categoryId}
              disabled={categoriesLoading || Boolean(categoryError)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 sm:w-52"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`${BUTTON_CLASS} h-11`}
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            ค้นหา
          </button>
          <button
            type="button"
            aria-label="โหลดรายการใหม่"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setReload((value) => value + 1);
            }}
            className={`${BUTTON_CLASS} h-11`}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
        <div aria-busy={loading}>
          {loading ? (
            <div
              role="status"
              className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-500"
            >
              <LoaderCircle
                aria-hidden="true"
                className="h-5 w-5 animate-spin"
              />
              กำลังโหลดหนังสือ...
            </div>
          ) : listError ? (
            <div role="alert" className="space-y-4 p-8 text-center">
              <p className="text-sm text-red-700">{listError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setReload((value) => value + 1);
                }}
                className={BUTTON_CLASS}
              >
                ลองอีกครั้ง
              </button>
            </div>
          ) : result?.books.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <BookOpenText
                  aria-hidden="true"
                  className="mx-auto h-10 w-10 text-blue-300"
                />
                <h2 className="mt-3 font-bold text-slate-800">
                  {query.search || query.categoryId
                    ? "ไม่พบหนังสือที่ตรงกับเงื่อนไข"
                    : "ยังไม่มีหนังสือในระบบ"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {query.search || query.categoryId
                    ? "ลองเปลี่ยนคำค้นหาหรือหมวดหมู่"
                    : "กดเพิ่มหนังสือเพื่อเริ่มต้นจัดการคลังหนังสือ"}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <caption className="sr-only">
                  ข้อมูลหนังสือ วันที่สร้าง และปุ่มแก้ไข ลบ
                </caption>
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    {[
                      "หนังสือ",
                      "ผู้แต่ง / ISBN",
                      "หมวดหมู่",
                      "ทั้งหมด",
                      "พร้อมให้ยืม",
                      "วันที่สร้าง",
                      "จัดการ",
                    ].map((label) => (
                      <th key={label} scope="col" className="px-5 py-4">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result?.books.map((book) => (
                    <tr key={book.id} className="hover:bg-blue-50/40">
                      <td className="max-w-72 px-5 py-4">
                        <p className="font-bold text-slate-900 break-words">
                          {book.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-blue-600">
                          {book.bookCode}
                        </p>
                      </td>
                      <td className="max-w-64 px-5 py-4">
                        <p className="text-slate-600 break-words">
                          {book.author}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {book.isbn ?? "ไม่มี ISBN"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {book.categoryName}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {NUMBER_FORMATTER.format(book.totalCopies)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            book.availableCopies > 0
                              ? "font-bold text-emerald-700"
                              : "font-bold text-amber-700"
                          }
                        >
                          {NUMBER_FORMATTER.format(book.availableCopies)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                        <time dateTime={book.createdAt}>
                          {formatThaiDateTime(book.createdAt)}
                        </time>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`แก้ไข ${book.title}`}
                            disabled={
                              categoriesLoading ||
                              Boolean(categoryError) ||
                              categories.length === 0
                            }
                            onClick={(event) =>
                              openEditor(book, event.currentTarget)
                            }
                            className={BUTTON_CLASS}
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            aria-label={`ลบ ${book.title}`}
                            onClick={(event) => {
                              triggerRef.current = event.currentTarget;
                              setMutationError("");
                              setDeleteTarget(book);
                            }}
                            className={`${BUTTON_CLASS} text-red-600 hover:bg-red-50`}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 p-5">
          <p className="text-sm text-slate-500">
            {pagination && !listError
              ? `แสดง ${NUMBER_FORMATTER.format(firstItem)}–${NUMBER_FORMATTER.format(lastItem)} จาก ${NUMBER_FORMATTER.format(pagination.totalItems)} รายการ`
              : "รายการหนังสือ"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-500">
              ต่อหน้า
              <select
                aria-label="จำนวนรายการต่อหน้า"
                value={query.pageSize}
                disabled={loading}
                onChange={(event) =>
                  changeQuery({
                    ...query,
                    page: 1,
                    pageSize: Number(event.target.value),
                  })
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-slate-700"
              >
                {Array.from(new Set([10, 25, 50, 100, initialQuery.pageSize]))
                  .sort((a, b) => a - b)
                  .map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              aria-label="หน้าก่อนหน้า"
              disabled={
                loading ||
                Boolean(listError) ||
                !pagination ||
                pagination.page <= 1
              }
              onClick={() => changeQuery({ ...query, page: query.page - 1 })}
              className={BUTTON_CLASS}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-600">
              หน้า {pagination?.page ?? query.page} /{" "}
              {Math.max(1, pagination?.totalPages ?? 1)}
            </span>
            <button
              type="button"
              aria-label="หน้าถัดไป"
              disabled={
                loading ||
                Boolean(listError) ||
                !pagination ||
                pagination.page >= pagination.totalPages
              }
              onClick={() => changeQuery({ ...query, page: query.page + 1 })}
              className={BUTTON_CLASS}
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      {editor ? (
        <BookForm
          book={editor.book}
          categories={categories}
          busy={busy}
          categoriesLoading={categoriesLoading}
          error={mutationError || categoryError}
          fieldErrors={fieldErrors}
          onSubmit={handleSave}
          onClose={closeDialog}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteBookDialog
          book={deleteTarget}
          busy={busy}
          error={mutationError}
          onConfirm={handleDelete}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}

function replaceQueryUrl(query: BookQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params}`,
  );
}

function errorMessage(error: unknown): string {
  return error instanceof BooksApiError || error instanceof CategoriesApiError
    ? error.message
    : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
}

function DeleteBookDialog({
  book,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  book: Book;
  busy: boolean;
  error: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-book-title"
      aria-describedby="delete-book-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/45"
    >
      <h2 id="delete-book-title" className="text-xl font-bold text-slate-900">
        ยืนยันการลบหนังสือ
      </h2>
      <p
        id="delete-book-description"
        className="mt-3 text-sm leading-6 text-slate-600"
      >
        ต้องการลบหนังสือ “{book.title}” ({book.bookCode}) ใช่หรือไม่?
        เมื่อยืนยันแล้วจะไม่สามารถคืนข้อมูลจากหน้านี้ได้
      </p>
      {error ? (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 outline-none focus:ring-2 focus:ring-red-400"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <button
          autoFocus
          type="button"
          disabled={busy}
          onClick={onClose}
          className={BUTTON_CLASS}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void onConfirm()}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          )}
          {busy ? "กำลังลบ..." : "ยืนยันลบหนังสือ"}
        </button>
      </div>
    </dialog>
  );
}
