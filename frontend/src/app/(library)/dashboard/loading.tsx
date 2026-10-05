export default function DashboardLoading() {
  return (
    <main
      className="mx-auto max-w-[1500px]"
      aria-label="กำลังโหลดข้อมูลแดชบอร์ด"
      aria-live="polite"
    >
      <div className="animate-pulse space-y-8">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-blue-100" />
          <div className="h-9 w-48 rounded-lg bg-slate-200" />
          <div className="h-4 max-w-xl rounded bg-slate-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-44 rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="h-96 rounded-2xl border border-slate-200 bg-white" />
      </div>
    </main>
  );
}
