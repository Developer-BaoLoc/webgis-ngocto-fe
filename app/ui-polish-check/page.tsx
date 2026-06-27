export default function UiPolishCheckPage() {
  const rows = ["Lúa", "Thủy sản", "Hoa màu"];

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl rounded-lg bg-white p-4 shadow-xl">
        <div className="ai-data-preparation min-w-0 max-w-full space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-slate-900 shadow-sm">
          <div>
            <p className="font-semibold">AI đề xuất chuẩn bị dữ liệu trước</p>
            <p className="mt-1 text-xs text-sky-800">
              Kế hoạch này chỉ được áp dụng khi bạn xác nhận.
            </p>
          </div>
          <div className="min-w-0 max-w-full space-y-3 overflow-hidden rounded-lg border border-sky-100 bg-white/80 px-3 py-3 text-xs text-slate-700">
            {rows.map((label) => (
              <div
                key={label}
                className="ai-data-source-row rounded-lg border border-slate-200 bg-slate-50/80 p-2.5"
              >
                <span className="min-w-0 truncate font-semibold text-slate-800">
                  {label}
                </span>
                <select className="ioc-select-sm" defaultValue="long">
                  <option value="long">
                    Lớp dữ liệu có tên rất dài để kiểm tra khả năng rút gọn trong modal nhỏ
                  </option>
                </select>
                <select className="ioc-select-sm" defaultValue="long-field">
                  <option value="long-field">
                    Trường chỉ số có nhãn rất dài và không được tràn khỏi khung
                  </option>
                </select>
                <select className="ioc-select-sm" defaultValue="sum">
                  <option value="sum">Tổng</option>
                </select>
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap gap-2.5">
            <button className="inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white">
              <span className="ioc-loading-spinner" aria-hidden="true" />Đang tạo
            </button>
            <button className="min-h-9 max-w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700">
              Xác nhận tiện ích và liên kết thủ công
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

