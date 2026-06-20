export interface FieldLabelMetadata {
  label?: unknown;
  name?: unknown;
  displayName?: unknown;
}

const FIELD_LABELS: Record<string, string> = {
  ten: "Tên",
  name: "Tên",
  nguoi_dai_dien: "Người đại diện",
  representative: "Người đại diện",
  dia_chi: "Địa chỉ",
  address: "Địa chỉ",
  nganh_nghe: "Ngành nghề",
  business_type: "Ngành nghề",
  dien_tich: "Diện tích",
  area_ha: "Diện tích",
  quy_trinh_san_xuat: "Quy trình sản xuất",
  production_process: "Quy trình sản xuất",
  so_thanh_vien: "Số thành viên",
  members: "Số thành viên",
  san_luong: "Sản lượng",
  production: "Sản lượng",
  kenh_tieu_thu: "Kênh tiêu thụ",
  sales_channel: "Kênh tiêu thụ",
  chi_phi_nam: "Chi phí/năm",
  annual_cost: "Chi phí/năm",
  cost: "Chi phí/năm",
  thu_nhap_nam: "Thu nhập/năm",
  annual_income: "Thu nhập/năm",
  revenue: "Thu nhập/năm",
  loi_nhuan_nam: "Lợi nhuận/năm",
  annual_profit: "Lợi nhuận/năm",
  profit: "Lợi nhuận/năm",
  trang_thai: "Trạng thái",
  status: "Trạng thái",
  ghi_chu: "Ghi chú",
  note: "Ghi chú",
  khu_vuc: "Khu vực",
  area: "Khu vực",
  region: "Khu vực",
  loai: "Loại",
  loai_tom: "Loại tôm",
  loai_hinh_nuoi: "Loại hình nuôi",
  hinh_thuc_nuoi: "Hình thức nuôi",
  mat_do: "Mật độ",
  loai_hinh_canh_tac: "Loại hình canh tác",
  loai_hinh_san_xuat: "Loại hình sản xuất",
  nang_suat: "Năng suất",
  loai_cay_trong: "Loại cây trồng",
  loai_cay: "Loại cây",
  ma_tuyen: "Mã tuyến",
  ten_tuyen: "Tên tuyến",
  loai_tuyen: "Loại tuyến",
  cap_quan_ly: "Cấp quản lý",
  chieu_dai_ke_khai: "Chiều dài kê khai",
  chieu_dai_gis: "Chiều dài GIS",
  chieu_rong: "Chiều rộng",
  huong_dong_chay: "Hướng dòng chảy",
  tinh_trang: "Tình trạng",
  don_vi_quan_ly: "Đơn vị quản lý",
  ma_cong_trinh: "Mã công trình",
  ten_cong_trinh: "Tên công trình",
  loai_cong_trinh: "Loại công trình",
  cong_suat: "Công suất",
  khau_do: "Khẩu độ",
  muc_do: "Mức độ",
  loai_canh_bao: "Loại cảnh báo",
};

const VIETNAMESE_WORDS: Record<string, string> = {
  kenh: "Kênh",
  cap: "Cấp",
  loai: "Loại",
  hinh: "Hình",
  nuoi: "Nuôi",
  trang: "Trạng",
  thai: "Thái",
  khu: "Khu",
  vuc: "Vực",
  ten: "Tên",
  ma: "Mã",
  dia: "Địa",
  chi: "Chỉ",
  nguoi: "Người",
  dai: "Đại",
  dien: "Diện",
  tich: "Tích",
  chieu: "Chiều",
  rong: "Rộng",
};

function normalizedFieldKey(fieldKey: string): string {
  return fieldKey
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function humanizeFieldKey(fieldKey: string): string {
  const normalized = normalizedFieldKey(fieldKey);
  if (!normalized) return fieldKey;
  const mapped = FIELD_LABELS[normalized];
  if (mapped) return mapped;
  return normalized
    .split("_")
    .filter(Boolean)
    .map(
      (part) =>
        VIETNAMESE_WORDS[part] ??
        part.charAt(0).toLocaleUpperCase("vi-VN") + part.slice(1),
    )
    .join(" ");
}

export function getFieldLabel(
  fieldKey: string,
  metadata?: FieldLabelMetadata | null,
): string {
  for (const candidate of [
    metadata?.label,
    metadata?.name,
    metadata?.displayName,
  ]) {
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
  }
  return humanizeFieldKey(fieldKey);
}
