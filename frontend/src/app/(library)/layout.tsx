import type { ReactNode } from "react";

export default function LibraryLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <div>{children}</div>;
}
