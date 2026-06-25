export interface FieldLabelMetadata {
  label?: unknown;
  name?: unknown;
  displayName?: unknown;
  options?: unknown;
  values?: unknown;
  enum?: unknown;
  enumLabels?: unknown;
  dictionaryItems?: unknown;
  dataSchema?: unknown;
  uiSchema?: unknown;
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
  doi_tuong_nuoi: "Đối tượng nuôi",
  loai_dia_diem: "Loại địa điểm",
  loai_tom: "Loại tôm",
  loai_hinh_nuoi: "Loại hình nuôi",
  hinh_thuc_nuoi: "Hình thức nuôi",
  mat_do: "Mật độ",
  mat_do_tha_con_m: "Mật độ thả con/m²",
  loai_hinh_canh_tac: "Loại hình canh tác",
  loai_hinh_san_xuat: "Loại hình sản xuất",
  nang_suat: "Năng suất",
  nang_suat_tan_ha: "Năng suất (tấn/ha)",
  dien_tich_ha: "Diện tích (ha)",
  loi_nhuan_trieu_dong_nam: "Lợi nhuận (triệu đồng/năm)",
  thu_nhap_trieu_dong_nam: "Thu nhập (triệu đồng/năm)",
  chi_phi_trieu_dong_nam: "Chi phí (triệu đồng/năm)",
  loai_vung: "Loại vùng",
  loai_cay_trong: "Loại cây trồng",
  loai_cay: "Loại cây",
  cap_quan_ly: "Cấp quản lý",
  tp_tinh: "TP/Tỉnh",
  ten_xa: "Tên xã",
  ma_ap: "Mã ấp",
  ten_ap: "Tên ấp",
  chieu_dai_ke_khai_m: "Chiều dài kê khai (m)",
  chieu_dai_gis_m: "Chiều dài GIS (m)",
  chieu_rong_m: "Chiều rộng (m)",
  chieu_dai_ke_khai: "Chiều dài kê khai",
  chieu_dai_gis: "Chiều dài GIS",
  chieu_rong: "Chiều rộng",
  chuc_nang: "Chức năng",
  huong_dong_chay: "Hướng dòng chảy",
  tinh_trang: "Tình trạng",
  don_vi_quan_ly: "Đơn vị quản lý",
  ngay_khao_sat: "Ngày khảo sát",
  nguon_du_lieu: "Nguồn dữ liệu",
  ngay_cap_nhat: "Ngày cập nhật",
  trang_thai_xac_minh: "Trạng thái xác minh",
  loai_tuyen: "Loại tuyến",
  ma_tuyen: "Mã tuyến",
  ten_tuyen: "Tên tuyến",
  srid: "SRID",
  ma_cong_trinh: "Mã công trình",
  ten_cong_trinh: "Tên công trình",
  loai_cong_trinh: "Loại công trình",
  cong_suat: "Công suất",
  khau_do: "Khẩu độ",
  muc_do: "Mức độ",
  ma_canh_bao: "Mã cảnh báo",
  loai_canh_bao: "Loại cảnh báo",
  thoi_gian_bat_dau: "Thời gian bắt đầu",
  thoi_gian_ket_thuc: "Thời gian kết thúc",
  ngay_bat_dau: "Ngày bắt đầu",
  ngay_ket_thuc: "Ngày kết thúc",
  thang: "Tháng",
  month: "Tháng",
  quy: "Quý",
  quarter: "Quý",
};

const COMMON_OPTION_LABELS: Record<string, string> = {
  thuy_san: "Thủy sản",
  hoa_mau: "Hoa màu",
  lua: "Lúa",
  vung_lua: "Vùng lúa",
  vung_nuoi_thuy_san: "Vùng nuôi thủy sản",
  vung_trong_hoa_mau: "Vùng trồng hoa màu",
  thap: "Thấp",
  trung_binh: "Trung bình",
  cao: "Cao",
  khan_cap: "Khẩn cấp",
  dang_hieu_luc: "Đang hiệu lực",
  da_ket_thuc: "Đã kết thúc",
  da_xu_ly: "Đã xử lý",
  chua_xac_minh: "Chưa xác minh",
  da_xac_minh: "Đã xác minh",
  hoan_thanh: "Hoàn thành",
  dang_thuc_hien: "Đang thực hiện",
  chua_bat_dau: "Chưa bắt đầu",
  tam_dung: "Tạm dừng",
  loi: "Lỗi",
  trong_trot_lua: "Trồng trọt lúa",
  cay_an_trai: "Cây ăn trái",
  san_xuat: "Sản xuất",
};

const OPTION_LABELS: Record<string, Record<string, string>> = {
  loai_vung: {
    thuy_san: "Thủy sản",
    hoa_mau: "Hoa màu",
    lua: "Lúa",
    vung_lua: "Vùng lúa",
    vung_nuoi_thuy_san: "Vùng nuôi thủy sản",
    vung_trong_hoa_mau: "Vùng trồng hoa màu",
  },
  muc_do: {
    thap: "Thấp",
    trung_binh: "Trung bình",
    cao: "Cao",
    khan_cap: "Khẩn cấp",
  },
  trang_thai: {
    dang_hieu_luc: "Đang hiệu lực",
    da_ket_thuc: "Đã kết thúc",
    da_xu_ly: "Đã xử lý",
    hoan_thanh: "Hoàn thành",
    dang_thuc_hien: "Đang thực hiện",
    chua_bat_dau: "Chưa bắt đầu",
    tam_dung: "Tạm dừng",
    loi: "Lỗi",
  },
  loai_hinh_san_xuat: {
    trong_trot_lua: "Trồng trọt lúa",
    cay_an_trai: "Cây ăn trái",
    san_xuat: "Sản xuất",
  },
  loai_cay_trong: {
    lua: "Lúa",
    hoa_mau: "Hoa màu",
    cay_an_trai: "Cây ăn trái",
  },
  loai_canh_bao: {
    thoi_tiet: "Thời tiết",
    dich_benh_thuy_san: "Dịch bệnh thủy sản",
    moi_truong_nuoc: "Môi trường nước",
    ngap_ung: "Ngập úng",
  },
  cap_quan_ly: {
    ap: "Ấp",
    xa: "Xã",
    thanh_pho: "Thành phố",
    tinh: "Tỉnh",
    huyen: "Huyện",
  },
  loai_tuyen: {
    song: "Sông",
    kenh_cap_1: "Kênh cấp 1",
    kenh_cap_2: "Kênh cấp 2",
    kenh_noi_dong: "Kênh nội đồng",
    muong: "Mương",
    tuyen_thoat_nuoc: "Tuyến thoát nước",
  },
  tinh_trang: {
    tot: "Tốt",
    trung_binh: "Trung bình",
    xuong_cap: "Xuống cấp",
    can_bao_tri: "Cần bảo trì",
    dang_sua_chua: "Đang sửa chữa",
  },
  trang_thai_xac_minh: {
    da_xac_minh: "Đã xác minh",
    chua_xac_minh: "Chưa xác minh",
    can_kiem_tra: "Cần kiểm tra",
    tu_choi: "Từ chối",
  },
  tp_tinh: { can_tho: "Cần Thơ" },
  ten_xa: { ngoc_to: "Ngọc Tố" },
  nguon_du_lieu: {
    khao_sat_thuc_dia: "Khảo sát thực địa",
    khao_sat_nhanh: "Khảo sát nhanh",
    ban_do_nen_khao_sat: "Bản đồ nền + khảo sát",
    nguoi_dan_cung_cap: "Người dân cung cấp",
  },
  don_vi_quan_ly: {
    ubnd_xa_ngoc_to: "UBND xã Ngọc Tố",
    phong_nn_mt: "Phòng NN&MT",
    ban_ap_hoa_my: "Ban ấp Hòa Mỹ",
    ban_ap_tay_kenh: "Ban ấp Tây Kênh",
    htx_hoa_phu: "HTX Hòa Phú",
    htx_trung_binh: "HTX Trung Bình",
    to_thuy_loi_binh_hoa: "Tổ thủy lợi Bình Hòa",
    to_thuy_loi_dong_kenh: "Tổ thủy lợi Đông Kênh",
    to_thuy_loi_nam_song: "Tổ thủy lợi Nam Sông",
  },
  huong_dong_chay: {
    bac_nam: "Bắc - Nam",
    nam_bac: "Nam - Bắc",
    dong_tay: "Đông - Tây",
    tay_dong: "Tây - Đông",
    dong_bac_tay_nam: "Đông Bắc - Tây Nam",
    tay_bac_dong_nam: "Tây Bắc - Đông Nam",
    tay_nam_dong_bac: "Tây Nam - Đông Bắc",
    nam_tay_bac_dong: "Nam Tây Bắc - Đông",
  },
};

const VIETNAMESE_WORDS: Record<string, string> = {
  an: "ăn",
  ap: "ấp",
  ban: "ban",
  bac: "bắc",
  bao: "báo",
  bat: "bắt",
  cap: "cấp",
  cay: "cây",
  chay: "chảy",
  chieu: "chiều",
  chua: "chưa",
  chuc: "chức",
  cong: "công",
  dai: "dài",
  dang: "đang",
  dau: "đầu",
  dia: "địa",
  dien: "diện",
  dong: "đồng",
  don: "đơn",
  du: "dữ",
  dung: "dừng",
  duong: "đường",
  gia: "giá",
  hoan: "hoàn",
  hinh: "hình",
  hoa: "hòa",
  huong: "hướng",
  khao: "khảo",
  kenh: "kênh",
  loai: "loại",
  lua: "lúa",
  ma: "mã",
  ngay: "ngày",
  nguon: "nguồn",
  nguoi: "người",
  nhat: "nhật",
  noi: "nội",
  nuoc: "nước",
  quan: "quản",
  rong: "rộng",
  san: "sản",
  sat: "sát",
  song: "sông",
  tam: "tạm",
  tay: "tây",
  ten: "tên",
  thanh: "thành",
  thai: "thái",
  thoat: "thoát",
  thuc: "thực",
  thoi: "thời",
  thuy: "thủy",
  tich: "tích",
  tinh: "tỉnh",
  tom: "tôm",
  trang: "trạng",
  trai: "trái",
  trong: "trồng",
  trot: "trọt",
  tuyen: "tuyến",
  vi: "vị",
  xa: "xã",
  xuat: "xuất",
};

const UPPERCASE_WORDS: Record<string, string> = {
  gis: "GIS",
  htx: "HTX",
  id: "ID",
  mt: "MT",
  nn: "NN",
  srid: "SRID",
  tp: "TP",
  ubnd: "UBND",
};

function normalizedKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function humanizeFieldKey(fieldKey: string): string {
  const normalized = normalizedKey(fieldKey);
  if (!normalized) return fieldKey;
  return FIELD_LABELS[normalized] ?? humanizeNormalizedValue(normalized);
}

export function humanizeOptionValue(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "(Trống)";
  if (/[À-ỹĐđ]/.test(text)) return text;
  if (/\s/.test(text) && !/[_-]/.test(text)) return text;
  const normalized = normalizedKey(text);
  return normalized ? humanizeNormalizedValue(normalized) : text;
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
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return humanizeFieldKey(fieldKey);
}

export function getOptionLabel(
  fieldKey: string,
  rawValue: unknown,
  metadata?: FieldLabelMetadata | null,
): string {
  return (
    getKnownOptionLabel(fieldKey, rawValue, metadata) ??
    humanizeOptionValue(rawValue)
  );
}

export function getKnownOptionLabel(
  fieldKey: string,
  rawValue: unknown,
  metadata?: FieldLabelMetadata | null,
): string | null {
  const metadataLabel = findMetadataOptionLabel(rawValue, metadata);
  if (metadataLabel) return metadataLabel;

  const normalizedField = normalizedKey(fieldKey);
  const normalizedValue = normalizedKey(String(rawValue ?? ""));
  return (
    OPTION_LABELS[normalizedField]?.[normalizedValue] ??
    COMMON_OPTION_LABELS[normalizedValue] ??
    null
  );
}

function humanizeNormalizedValue(normalized: string): string {
  const words = normalized.split("_").filter(Boolean);
  const result = words.map((word) => {
    if (UPPERCASE_WORDS[word]) return UPPERCASE_WORDS[word];
    return VIETNAMESE_WORDS[word] ?? word;
  });
  if (!result.length) return normalized;
  if (!UPPERCASE_WORDS[words[0]]) {
    result[0] =
      result[0].charAt(0).toLocaleUpperCase("vi-VN") + result[0].slice(1);
  }
  return result.join(" ");
}

function findMetadataOptionLabel(
  rawValue: unknown,
  metadata?: FieldLabelMetadata | null,
): string | null {
  if (!metadata) return null;
  const raw = String(rawValue ?? "");
  const dataSchema = asRecord(metadata.dataSchema);
  const uiSchema = asRecord(metadata.uiSchema);
  const candidates = [
    metadata.options,
    metadata.values,
    metadata.dictionaryItems,
    metadata.enum,
    dataSchema?.options,
    dataSchema?.values,
    dataSchema?.enum,
    dataSchema?.dictionaryItems,
    uiSchema?.options,
    uiSchema?.values,
  ];

  for (const candidate of candidates) {
    const label = readOptionCollection(candidate, raw);
    if (label) return label;
  }

  const enumValues = Array.isArray(dataSchema?.enum)
    ? dataSchema.enum
    : Array.isArray(metadata.enum)
      ? metadata.enum
      : null;
  const enumLabels = Array.isArray(dataSchema?.enumLabels)
    ? dataSchema.enumLabels
    : Array.isArray(uiSchema?.enumNames)
      ? uiSchema.enumNames
      : Array.isArray(metadata.enumLabels)
        ? metadata.enumLabels
        : null;
  const index = enumValues?.findIndex((value) => String(value) === raw) ?? -1;
  const enumLabel = index >= 0 ? enumLabels?.[index] : null;
  return typeof enumLabel === "string" && enumLabel.trim()
    ? enumLabel.trim()
    : null;
}

function readOptionCollection(collection: unknown, rawValue: string) {
  if (Array.isArray(collection)) {
    for (const item of collection) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const option = item as Record<string, unknown>;
      const value = option.value ?? option.code ?? option.key ?? option.id;
      if (String(value ?? "") !== rawValue) continue;
      const label = option.label ?? option.name ?? option.displayName;
      if (typeof label === "string" && label.trim()) return label.trim();
    }
    return null;
  }
  const record = asRecord(collection);
  const label = record?.[rawValue];
  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
