export type LibraryNavigationIcon = "dashboard" | "books" | "categories";

export interface LibraryNavigationItem {
  href: string;
  label: string;
  description: string;
  icon: LibraryNavigationIcon;
}

export const LIBRARY_NAVIGATION_ITEMS: readonly LibraryNavigationItem[] = [
  {
    href: "/dashboard",
    label: "แดชบอร์ด",
    description: "ภาพรวมระบบห้องสมุด",
    icon: "dashboard",
  },
  {
    href: "/books",
    label: "หนังสือ",
    description: "จัดการข้อมูลหนังสือ",
    icon: "books",
  },
  {
    href: "/categories",
    label: "หมวดหมู่",
    description: "จัดการหมวดหมู่หนังสือ",
    icon: "categories",
  },
];

export function isLibraryNavigationItemActive(
  pathname: string,
  href: string,
): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
