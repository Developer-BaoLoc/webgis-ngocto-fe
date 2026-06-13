export interface NavItem {
  href: string;
  label: string;
  icon: "dashboard" | "map" | "layers" | "import";
}

export const mainNavigation: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: "dashboard" },
  { href: "/ban-do", label: "Bản đồ", icon: "map" },
  { href: "/lop-du-lieu", label: "Lớp dữ liệu", icon: "layers" },
  { href: "/import", label: "Import", icon: "import" },
];
