# WebGIS Frontend

Frontend Next.js cho nền tảng WebGIS metadata-driven. Dashboard Builder hỗ trợ widget động, Advanced Query Builder và Dashboard Template Engine.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Dashboard Template Wizard

Template Wizard nằm trong `components/admin/dashboard-template-wizard.tsx`, được mở từ Dashboard Builder bằng nút `Tạo từ mẫu`.

Các template nội bộ nằm trong `lib/dashboard/templates/`:

- `types.ts`: schema `DashboardTemplate`, `DashboardTemplateWidget`, `DashboardTemplatePlaceholder`.
- `index.ts`: registry template.
- `apply-template.ts`: thay placeholder `__layer:key__`, `__field:key__`, `__dataset:key__`, `__view:key__` thành giá trị thật.
- `auto-mapping.ts`: keyword matcher, source matcher, field matcher và auto mapping.

### Placeholder

Template không hardcode id dữ liệu thật. Ví dụ:

```ts
dataSourceConfig: {
  layerId: "__layer:aquaculture_layer__",
  aggregation: "sum",
  metricField: "__field:area_field__",
}
```

Field placeholder nên khai báo `sourceKey` để wizard biết field thuộc source nào:

```ts
{
  key: "area_field",
  label: "Field diện tích",
  kind: "metric_field",
  required: true,
  sourceKey: "aquaculture_layer",
}
```

### Auto Mapping

Auto mapping là deterministic, không dùng AI/LLM. Matcher chuẩn hóa tiếng Việt có dấu, dấu gạch dưới và chữ thường rồi chấm điểm theo:

- `code`
- `name`
- `displayName`
- `alias`
- `label`
- keyword theo placeholder
- contains / startsWith / exact match

Nếu chỉ có một kết quả hoặc kết quả đứng đầu đủ rõ, wizard tự chọn và hiển thị `Tự động nhận diện`. Nếu có nhiều ứng viên, wizard hiển thị `Có gợi ý` để admin áp dụng hoặc chọn thủ công.

### Health Check

Nút `Kiểm tra Template` trong wizard kiểm tra:

- đủ placeholder
- đủ mapping bắt buộc
- preview đã chạy xong
- analytics preview pass

Analytics preview lỗi không chặn tạo dashboard nếu mapping hợp lệ, nhưng unresolved placeholder luôn chặn generate.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
