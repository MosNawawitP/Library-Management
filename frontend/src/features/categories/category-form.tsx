"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Category } from "./categories.types";

interface CategoryFormProps {
  category: Category | null;
  mode: "save" | "delete";
  busy: boolean;
  error: string;
  nameError: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export function CategoryForm({
  category,
  mode,
  busy,
  error,
  nameError,
  onSubmit,
  onClose,
}: CategoryFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState("");
  const deleting = mode === "delete";
  const fieldError = validationError || nameError;
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    if (error) {
      if (nameError) inputRef.current?.focus();
      else alertRef.current?.focus();
    }
  }, [error, nameError]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const name = String(
      new FormData(event.currentTarget).get("name") ?? "",
    ).trim();
    if (!deleting && (!name || name.length > 100)) {
      setValidationError(
        name ? "ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร" : "กรุณากรอกชื่อหมวดหมู่",
      );
      inputRef.current?.focus();
      return;
    }
    setValidationError("");
    void onSubmit(name);
  }
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="category-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <h2
          id="category-dialog-title"
          className="text-xl font-bold text-[#0b316c]"
        >
          {deleting
            ? "ยืนยันการลบหมวดหมู่"
            : category
              ? "แก้ไขหมวดหมู่"
              : "เพิ่มหมวดหมู่"}
        </h2>
        <button
          type="button"
          disabled={busy}
          aria-label="ปิด"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <form noValidate onSubmit={submit} className="space-y-5 p-6">
        {error ? (
          <div
            ref={alertRef}
            role="alert"
            tabIndex={-1}
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none focus:ring-2 focus:ring-red-500"
          >
            {error}
          </div>
        ) : null}
        {deleting ? (
          <p className="text-sm leading-6 text-slate-600">
            ต้องการลบหมวดหมู่ “{category?.name}” ใช่หรือไม่?
            หมวดหมู่ที่มีหนังสืออ้างถึงจะไม่สามารถลบได้
          </p>
        ) : (
          <div>
            <label
              htmlFor="category-name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              ชื่อหมวดหมู่ *
            </label>
            <input
              ref={inputRef}
              autoFocus
              id="category-name"
              name="name"
              defaultValue={category?.name ?? ""}
              disabled={busy}
              required
              maxLength={100}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={
                fieldError ? "category-name-error" : "category-name-help"
              }
              onChange={() => setValidationError("")}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <p id="category-name-help" className="mt-2 text-xs text-slate-400">
              ชื่อหมวดหมู่ยาวไม่เกิน 100 ตัวอักษร
            </p>
            {fieldError ? (
              <p id="category-name-error" className="mt-2 text-xs text-red-600">
                {fieldError}
              </p>
            ) : null}
          </div>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            autoFocus={deleting}
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 ${deleting ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : null}
            {busy
              ? "กำลังดำเนินการ..."
              : deleting
                ? "ยืนยันลบหมวดหมู่"
                : "บันทึกหมวดหมู่"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
