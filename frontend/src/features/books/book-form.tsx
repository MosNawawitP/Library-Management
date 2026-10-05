"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import type {
  Book,
  BookCategory,
  BookFieldErrors,
  BookInput,
} from "./books.types";

interface BookFormProps {
  book: Book | null;
  categories: BookCategory[];
  busy: boolean;
  categoriesLoading: boolean;
  error: string;
  fieldErrors: BookFieldErrors;
  onSubmit: (input: BookInput) => Promise<void>;
  onClose: () => void;
}

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50";

export function BookForm({
  book,
  categories,
  busy,
  categoriesLoading,
  error,
  fieldErrors,
  onSubmit,
  onClose,
}: BookFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [validationErrors, setValidationErrors] = useState<BookFieldErrors>({});
  const errors = { ...fieldErrors, ...validationErrors };

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    if (!error) return;
    const field = Object.keys(fieldErrors)[0];
    const target = field
      ? formRef.current?.elements.namedItem(field)
      : dialogRef.current?.querySelector('[role="alert"]');
    if (target instanceof HTMLElement) target.focus();
  }, [error, fieldErrors]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const input: BookInput = {
      bookCode: String(values.get("bookCode") ?? "").trim(),
      title: String(values.get("title") ?? "").trim(),
      author: String(values.get("author") ?? "").trim(),
      isbn: String(values.get("isbn") ?? "").trim() || null,
      categoryId: String(values.get("categoryId") ?? ""),
      totalCopies: Number(values.get("totalCopies")),
    };
    const invalid: BookFieldErrors = {};
    if (!input.bookCode) invalid.bookCode = "กรุณากรอกรหัสหนังสือ";
    if (!input.title) invalid.title = "กรุณากรอกชื่อหนังสือ";
    if (!input.author) invalid.author = "กรุณากรอกชื่อผู้แต่ง";
    if (!categories.some((category) => category.id === input.categoryId))
      invalid.categoryId = "กรุณาเลือกหมวดหมู่";
    if (
      !Number.isSafeInteger(input.totalCopies) ||
      input.totalCopies < 1 ||
      input.totalCopies > 2147483647
    )
      invalid.totalCopies =
        "จำนวนเล่มต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 2,147,483,647";
    setValidationErrors(invalid);
    const firstField = Object.keys(invalid)[0];
    if (firstField) {
      const target = event.currentTarget.elements.namedItem(firstField);
      if (target instanceof HTMLElement) target.focus();
      return;
    }
    void onSubmit(input);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="book-form-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 id="book-form-title" className="text-xl font-bold text-[#0b316c]">
            {book ? "แก้ไขหนังสือ" : "เพิ่มหนังสือ"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            กรอกข้อมูลหนังสือ ช่องที่มี * จำเป็นต้องระบุ
          </p>
        </div>
        <button
          type="button"
          aria-label="ปิดฟอร์ม"
          disabled={busy}
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="space-y-4 p-6"
      >
        {error ? (
          <div
            role="alert"
            tabIndex={-1}
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none focus:ring-2 focus:ring-red-400"
          >
            {error}
          </div>
        ) : null}
        {categoriesLoading ? (
          <p role="status" className="text-sm text-slate-500">
            กำลังโหลดหมวดหมู่...
          </p>
        ) : null}
        <fieldset disabled={busy} className="space-y-4">
          {(
            [
              { name: "bookCode", label: "รหัสหนังสือ", required: true },
              { name: "title", label: "ชื่อหนังสือ", required: true },
              { name: "author", label: "ผู้แต่ง", required: true },
              { name: "isbn", label: "ISBN", required: false },
            ] as const
          ).map((field) => (
            <div key={field.name}>
              <label
                htmlFor={`book-${field.name}`}
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <input
                autoFocus={field.name === "bookCode"}
                id={`book-${field.name}`}
                name={field.name}
                defaultValue={book?.[field.name] ?? ""}
                required={field.required}
                aria-invalid={Boolean(errors[field.name])}
                aria-describedby={
                  errors[field.name] ? `error-${field.name}` : undefined
                }
                onChange={() =>
                  setValidationErrors((current) => {
                    const next = { ...current };
                    delete next[field.name];
                    return next;
                  })
                }
                className={INPUT_CLASS}
              />
              {errors[field.name] ? (
                <p
                  id={`error-${field.name}`}
                  className="mt-1.5 text-xs text-red-600"
                >
                  {errors[field.name]}
                </p>
              ) : null}
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="book-categoryId"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                หมวดหมู่ *
              </label>
              <select
                id="book-categoryId"
                name="categoryId"
                defaultValue={book?.categoryId ?? ""}
                required
                aria-invalid={Boolean(errors.categoryId)}
                aria-describedby={
                  errors.categoryId ? "error-categoryId" : undefined
                }
                className={INPUT_CLASS}
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId ? (
                <p
                  id="error-categoryId"
                  className="mt-1.5 text-xs text-red-600"
                >
                  {errors.categoryId}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="book-totalCopies"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                จำนวนเล่มทั้งหมด *
              </label>
              <input
                id="book-totalCopies"
                name="totalCopies"
                type="number"
                min={1}
                max={2147483647}
                step={1}
                defaultValue={book?.totalCopies ?? 1}
                required
                aria-invalid={Boolean(errors.totalCopies)}
                aria-describedby={
                  errors.totalCopies ? "error-totalCopies" : undefined
                }
                className={INPUT_CLASS}
              />
              {errors.totalCopies ? (
                <p
                  id="error-totalCopies"
                  className="mt-1.5 text-xs text-red-600"
                >
                  {errors.totalCopies}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy || categoriesLoading || categories.length === 0}
            aria-busy={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : null}
            {busy ? "กำลังบันทึก..." : "บันทึกหนังสือ"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
