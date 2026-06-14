import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  {
    href: "/quan-tri/lop-du-lieu",
    title: "Lớp dữ liệu",
    description:
      "Tạo lớp (điểm/đường/vùng) và thiết kế cấu trúc trường — áp dụng ngay sau khi lưu",
  },
  {
    href: "/quan-tri/danh-muc",
    title: "Danh mục dùng chung",
    description:
      "Tạo danh mục và các giá trị lựa chọn — dùng cho trường Chọn một / Chọn nhiều",
  },
  {
    href: "/quan-tri/dashboard",
    title: "Dashboard",
    description:
      "Tạo bảng điều khiển động với widget thống kê, biểu đồ và bảng từ dữ liệu lớp",
  },
];

export default function AdminHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản trị"
        description="Cấu hình lớp dữ liệu, danh mục dùng chung và dashboard cho hệ thống GIS"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="pt-5">
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm text-muted">{section.description}</p>
                <p className="mt-4 text-sm font-medium text-primary">Mở →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
