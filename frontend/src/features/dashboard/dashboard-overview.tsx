import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CircleAlert,
  Clock3,
  LibraryBig,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type {
  DashboardData,
  DashboardRecentBook,
  DashboardSummary,
} from "./dashboard.types";

type DashboardOverviewProps =
  | { state: "ready"; dashboard: DashboardData }
  | { state: "error"; errorMessage: string };

interface SummaryItem {
  key: keyof DashboardSummary;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackgroundClassName: string;
}

const SUMMARY_ITEMS: readonly SummaryItem[] = [
  {
    key: "totalBooks",
    label: "หนังสือทั้งหมด",
    description: "จำนวนรายการหนังสือในระบบ",
    icon: BookOpenText,
    iconClassName: "text-blue-700",
    iconBackgroundClassName: "bg-blue-100",
  },
  {
    key: "totalBookCopies",
    label: "สำเนาหนังสือทั้งหมด",
    description: "จำนวนเล่มรวมจากหนังสือทุกประเภท",
    icon: LibraryBig,
    iconClassName: "text-cyan-700",
    iconBackgroundClassName: "bg-cyan-100",
  },
  {
    key: "totalCategories",
    label: "หมวดหมู่ทั้งหมด",
    description: "รวมหมวดหมู่ที่ยังไม่มีหนังสือ",
    icon: Tags,
    iconClassName: "text-amber-700",
    iconBackgroundClassName: "bg-amber-100",
  },
];

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function DashboardOverview(props: DashboardOverviewProps) {
  return (
    <div className="space-y-8">
      <DashboardHeader />
      {props.state === "error" ? (
        <DashboardError message={props.errorMessage} />
      ) : (
        <>
          <SummaryCards summary={props.dashboard.summary} />
          <RecentBooks books={props.dashboard.recentBooks} />
        </>
      )}
    </div>
  );
}

function DashboardHeader() {
  return (
    <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-bold text-blue-600">ภาพรวมระบบ</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-950">
          แดชบอร์ด
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          ติดตามจำนวนหนังสือ สำเนาหนังสือ และหมวดหมู่จากข้อมูลล่าสุดในระบบ
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <QuickLink href="/books" label="จัดการหนังสือ" />
        <QuickLink href="/categories" label="จัดการหมวดหมู่" secondary />
      </div>
    </section>
  );
}

function QuickLink({
  href,
  label,
  secondary = false,
}: {
  href: string;
  label: string;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        secondary
          ? "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
          : "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] hover:bg-blue-700"
      }`}
    >
      {label}
      <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
    </Link>
  );
}

function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <section aria-labelledby="dashboard-summary-heading">
      <h2 id="dashboard-summary-heading" className="sr-only">
        สรุปข้อมูลห้องสมุด
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SUMMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,43,82,0.06)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                  <p className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[#0b316c]">
                    {NUMBER_FORMATTER.format(summary[item.key])}
                  </p>
                </div>
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.iconBackgroundClassName} ${item.iconClassName}`}
                >
                  <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
                </span>
              </div>
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                {item.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RecentBooks({ books }: { books: DashboardRecentBook[] }) {
  return (
    <section
      aria-labelledby="recent-books-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,43,82,0.05)]"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-[#0b316c]">
            <Clock3 aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
            <h2 id="recent-books-heading" className="text-lg font-bold">
              หนังสือที่เพิ่มล่าสุด
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">แสดงรายการล่าสุดไม่เกิน 5 รายการ</p>
        </div>
        <Link
          href="/books"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm font-bold text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 hover:text-blue-800"
        >
          ดูหนังสือทั้งหมด
          <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      {books.length === 0 ? (
        <EmptyBooks />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-slate-50/80 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3.5">หนังสือ</th>
                <th scope="col" className="px-4 py-3.5">ผู้แต่ง</th>
                <th scope="col" className="px-4 py-3.5">หมวดหมู่</th>
                <th scope="col" className="px-4 py-3.5 text-center">จำนวนเล่ม</th>
                <th scope="col" className="px-6 py-3.5">วันที่เพิ่ม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books.map((book) => (
                <RecentBookRow key={book.id} book={book} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RecentBookRow({ book }: { book: DashboardRecentBook }) {
  return (
    <tr className="transition hover:bg-blue-50/45">
      <td className="px-6 py-4">
        <Link
          href={`/books/${book.id}`}
          className="font-bold text-slate-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 hover:text-blue-700"
        >
          {book.title}
        </Link>
        <p className="mt-1 text-xs font-semibold text-blue-600">{book.bookCode}</p>
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">{book.author}</td>
      <td className="px-4 py-4">
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
          {book.categoryName}
        </span>
      </td>
      <td className="px-4 py-4 text-center text-sm font-bold text-slate-700">
        {NUMBER_FORMATTER.format(book.totalCopies)}
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-500">
        {DATE_TIME_FORMATTER.format(new Date(book.createdAt))}
      </td>
    </tr>
  );
}

function EmptyBooks() {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
          <BookOpenText aria-hidden="true" className="h-7 w-7" strokeWidth={1.6} />
        </span>
        <h3 className="mt-4 font-bold text-slate-800">ยังไม่มีข้อมูลหนังสือ</h3>
        <p className="mt-2 text-sm text-slate-500">เริ่มต้นเพิ่มหนังสือเพื่อดูข้อมูลล่าสุดบนแดชบอร์ด</p>
        <Link
          href="/books"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          ไปหน้าจัดการหนังสือ
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,43,82,0.05)]"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
          <CircleAlert aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h2 className="font-bold text-slate-900">ไม่สามารถโหลดข้อมูลแดชบอร์ดได้</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{message}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            ลองโหลดอีกครั้ง
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
