import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";

const sections = [
  {
    href: "/quan-tri/lop-du-lieu",
    title: "Lớp dữ liệu",
    description:
      "Tạo lớp điểm, đường, vùng và thiết kế cấu trúc trường — áp dụng ngay sau khi lưu.",
    accent: "blue" as const,
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.369 1.684a1.125 1.125 0 0 1-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689A1.125 1.125 0 0 0 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.369-1.684c.381-.19.622-.58.622-1.006Z"
        />
      </svg>
    ),
  },
  {
    href: "/quan-tri/danh-muc",
    title: "Danh mục dùng chung",
    description:
      "Tạo danh mục và giá trị lựa chọn — dùng cho trường Chọn một hoặc Chọn nhiều trong biểu mẫu.",
    accent: "emerald" as const,
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm0 5.25h.007v.008H3.75v-.008Zm0 5.25h.007v.008H3.75v-.008Z"
        />
      </svg>
    ),
  },
  {
    href: "/quan-tri/saved-views",
    title: "Saved Views",
    description:
      "Tạo nguồn dữ liệu đã lọc, sắp xếp và chọn trường để dùng lại trong dashboard widget.",
    accent: "emerald" as const,
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 5.25h16.5m-15 4.5h13.5m-12 4.5h10.5m-9 4.5h7.5"
        />
      </svg>
    ),
  },
  {
    href: "/quan-tri/dashboard",
    title: "Dashboard",
    description:
      "Tạo bảng điều khiển với widget thống kê, biểu đồ và bảng tổng hợp từ Saved View.",
    accent: "violet" as const,
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
        />
      </svg>
    ),
  },
];

export default function AdminHubPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Quản trị"
        description="Cấu hình lớp dữ liệu, danh mục dùng chung và dashboard cho hệ thống GIS phường."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <SectionCard
            key={section.href}
            href={section.href}
            title={section.title}
            description={section.description}
            icon={section.icon}
            accent={section.accent}
          />
        ))}
      </div>
    </div>
  );
}
