"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import {
  CategoriesApiError,
  getCategories,
  getCategory,
  saveCategory,
  deleteCategory,
} from "./categories.api";
import { CategoryForm } from "./category-form";
import { formatThaiDateTime } from "@/lib/thai-date-time";
import type { Category, CategoryPage, CategoryQuery } from "./categories.types";

const BUTTON =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

export function CategoryList({
  accessToken,
  initialQuery,
  initialId,
}: {
  accessToken: string;
  initialQuery: CategoryQuery;
  initialId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<CategoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState<{
    category: Category | null;
    mode: "save" | "delete";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [nameError, setNameError] = useState("");
  const [notice, setNotice] = useState("");
  const triggerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const page = await getCategories(accessToken, query, controller.signal);
        if (controller.signal.aborted) return;
        if (page.pagination.page > Math.max(1, page.pagination.totalPages)) {
          const next = {
            ...query,
            page: Math.max(1, page.pagination.totalPages),
          };
          setQuery(next);
          updateUrl(next);
          return;
        }
        setResult(page);
      } catch (error) {
        if (!controller.signal.aborted) setError(message(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [accessToken, query, reload]);
  useEffect(() => {
    if (!initialId) return;
    const controller = new AbortController();
    void getCategory(accessToken, initialId, controller.signal)
      .then((category) => {
        if (!controller.signal.aborted) setDialog({ category, mode: "save" });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDetailError(message(error));
      });
    return () => controller.abort();
  }, [accessToken, initialId]);
  function changeQuery(next: CategoryQuery) {
    setLoading(true);
    setNotice("");
    setQuery(next);
    updateUrl(next);
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changeQuery({
      ...query,
      page: 1,
      search: String(
        new FormData(event.currentTarget).get("search") ?? "",
      ).trim(),
    });
  }
  function open(
    category: Category | null,
    mode: "save" | "delete",
    trigger: HTMLElement,
  ) {
    triggerRef.current = trigger;
    setMutationError("");
    setNameError("");
    setDialog({ category, mode });
  }
  function focusTrigger() {
    requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
      else headingRef.current?.focus();
    });
  }
  function close() {
    if (busy) return;
    setDialog(null);
    focusTrigger();
  }
  async function submit(name: string) {
    if (busy || !dialog) return;
    setBusy(true);
    setMutationError("");
    setNameError("");
    try {
      if (dialog.mode === "delete" && dialog.category)
        await deleteCategory(accessToken, dialog.category.id);
      else await saveCategory(accessToken, name, dialog.category?.id);
      setNotice(
        dialog.mode === "delete"
          ? "ลบหมวดหมู่เรียบร้อยแล้ว"
          : dialog.category
            ? "แก้ไขหมวดหมู่เรียบร้อยแล้ว"
            : "เพิ่มหมวดหมู่เรียบร้อยแล้ว",
      );
      setDialog(null);
      setLoading(true);
      setReload((value) => value + 1);
      router.refresh();
      focusTrigger();
    } catch (error) {
      setMutationError(message(error));
      if (error instanceof CategoriesApiError) setNameError(error.nameError);
    } finally {
      setBusy(false);
    }
  }
  const meta = result?.pagination;
  const first =
    meta && meta.totalItems ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const last = meta ? Math.min(meta.page * meta.pageSize, meta.totalItems) : 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-blue-600">
            จัดระเบียบคลังหนังสือ
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-3xl font-bold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            หมวดหมู่หนังสือ
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            ค้นหา เพิ่ม และดูแลหมวดหมู่ที่ใช้กับหนังสือในระบบ
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => open(null, "save", event.currentTarget)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          เพิ่มหมวดหมู่
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
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {detailError}
        </p>
      ) : null}
      <section
        aria-label="รายการหมวดหมู่"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <form
          onSubmit={search}
          className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5"
        >
          <div className="min-w-48 flex-1">
            <label
              htmlFor="category-search"
              className="mb-2 block text-sm font-semibold text-slate-600"
            >
              ค้นหาหมวดหมู่
            </label>
            <input
              id="category-search"
              name="search"
              defaultValue={initialQuery.search}
              placeholder="กรอกชื่อหมวดหมู่"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <button type="submit" disabled={loading} className={`${BUTTON} h-11`}>
            <Search aria-hidden="true" className="h-4 w-4" />
            ค้นหา
          </button>
          <button
            type="button"
            disabled={loading}
            aria-label="โหลดหมวดหมู่ใหม่"
            onClick={() => {
              setLoading(true);
              setReload((value) => value + 1);
            }}
            className={`${BUTTON} h-11`}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
        <div aria-busy={loading}>
          {loading ? (
            <div
              role="status"
              className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"
            >
              <LoaderCircle
                aria-hidden="true"
                className="h-5 w-5 animate-spin"
              />
              กำลังโหลดหมวดหมู่...
            </div>
          ) : error ? (
            <div role="alert" className="space-y-4 p-8 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setReload((value) => value + 1);
                }}
                className={BUTTON}
              >
                ลองอีกครั้ง
              </button>
            </div>
          ) : result?.categories.length === 0 ? (
            <div className="p-12 text-center">
              <Tags
                aria-hidden="true"
                className="mx-auto h-10 w-10 text-blue-300"
              />
              <h2 className="mt-4 font-bold text-slate-800">
                {query.search
                  ? "ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา"
                  : "ยังไม่มีหมวดหมู่"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {query.search
                  ? "ลองเปลี่ยนคำค้นหา"
                  : "เพิ่มหมวดหมู่เพื่อใช้จัดกลุ่มหนังสือ"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <caption className="sr-only">
                  หมวดหมู่หนังสือ วันเวลาที่เพิ่มและแก้ไข พร้อมปุ่มแก้ไขและลบ
                </caption>
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    {[
                      "ชื่อหมวดหมู่",
                      "วันที่เพิ่ม",
                      "แก้ไขล่าสุด",
                      "จัดการ",
                    ].map((label) => (
                      <th scope="col" key={label} className="px-5 py-4">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result?.categories.map((category) => (
                    <tr key={category.id} className="hover:bg-blue-50/40">
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {category.name}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        <time dateTime={category.createdAt}>
                          {formatThaiDateTime(category.createdAt)}
                        </time>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {category.updatedAt ? (
                          <time dateTime={category.updatedAt}>
                            {formatThaiDateTime(category.updatedAt)}
                          </time>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`แก้ไข ${category.name}`}
                            onClick={(event) =>
                              open(category, "save", event.currentTarget)
                            }
                            className={BUTTON}
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            aria-label={`ลบ ${category.name}`}
                            onClick={(event) =>
                              open(category, "delete", event.currentTarget)
                            }
                            className={`${BUTTON} text-red-600 hover:bg-red-50`}
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
            {meta && !error
              ? `แสดง ${first}–${last} จาก ${meta.totalItems} รายการ`
              : "รายการหมวดหมู่"}
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500">
              ต่อหน้า{" "}
              <select
                value={query.pageSize}
                disabled={loading}
                aria-label="จำนวนหมวดหมู่ต่อหน้า"
                onChange={(event) =>
                  changeQuery({
                    ...query,
                    page: 1,
                    pageSize: Number(event.target.value),
                  })
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-2"
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
              disabled={loading || Boolean(error) || !meta || meta.page <= 1}
              onClick={() => changeQuery({ ...query, page: query.page - 1 })}
              className={BUTTON}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-600">
              หน้า {meta?.page ?? query.page} /{" "}
              {Math.max(1, meta?.totalPages ?? 1)}
            </span>
            <button
              type="button"
              aria-label="หน้าถัดไป"
              disabled={
                loading ||
                Boolean(error) ||
                !meta ||
                meta.page >= meta.totalPages
              }
              onClick={() => changeQuery({ ...query, page: query.page + 1 })}
              className={BUTTON}
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      {dialog ? (
        <CategoryForm
          category={dialog.category}
          mode={dialog.mode}
          busy={busy}
          error={mutationError}
          nameError={nameError}
          onSubmit={submit}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
function message(error: unknown) {
  return error instanceof CategoriesApiError
    ? error.message
    : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
}
function updateUrl(query: CategoryQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) params.set("search", query.search);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params}`,
  );
}
