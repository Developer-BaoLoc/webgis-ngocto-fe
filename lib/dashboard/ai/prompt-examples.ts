export interface DashboardAiPromptExample {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export const dashboardAiPromptExamples: DashboardAiPromptExample[] = [
  {
    id: "ioc",
    label: "IOC tổng quan",
    description: "Cảnh báo, bản đồ, ranking và KPI vận hành.",
    prompt: "Tạo dashboard IOC tổng quan cho xã/phường, gồm cảnh báo nông nghiệp, bản đồ nhỏ, ranking khu vực và KPI vận hành.",
  },
  {
    id: "aquaculture",
    label: "Nuôi thủy sản",
    description: "Diện tích, sản lượng, lợi nhuận và cảnh báo vùng nuôi.",
    prompt: "Tạo dashboard theo dõi vùng nuôi thủy sản: tổng diện tích, cơ cấu loại hình nuôi, top lợi nhuận, cảnh báo và phân tích theo ấp.",
  },
  {
    id: "rice",
    label: "Lúa",
    description: "Diện tích, sản lượng, mùa vụ và lợi nhuận.",
    prompt: "Tạo dashboard quản lý sản xuất lúa: KPI diện tích, sản lượng, biểu đồ theo loại hình canh tác, ranking lợi nhuận trên ha và lịch mùa vụ.",
  },
  {
    id: "crop",
    label: "Hoa màu",
    description: "Cơ cấu cây trồng, diện tích và hiệu quả kinh tế.",
    prompt: "Tạo dashboard theo dõi hoa màu: tổng diện tích, cơ cấu cây trồng, treemap cơ cấu, ranking lợi nhuận và bản đồ chủ đề theo khu vực.",
  },
  {
    id: "irrigation",
    label: "Thủy lợi",
    description: "Công trình, tuyến, tình trạng và cảnh báo bảo trì.",
    prompt: "Tạo dashboard quản lý thủy lợi: số công trình, chiều dài tuyến, cảnh báo công trình xuống cấp, thống kê theo ấp và minimap.",
  },
  {
    id: "ocop",
    label: "OCOP",
    description: "Cơ sở, sản phẩm, xếp hạng và bảng danh sách.",
    prompt: "Tạo dashboard OCOP: số cơ sở, số sản phẩm, ranking sản phẩm/cơ sở, bảng sản phẩm và biểu đồ theo xếp hạng.",
  },
  {
    id: "alert",
    label: "Cảnh báo",
    description: "Alert Center, hoạt động mới và phân bố cảnh báo.",
    prompt: "Tạo dashboard trung tâm cảnh báo: danh sách cảnh báo, hoạt động mới, cảnh báo theo khu vực, biểu đồ theo mức độ và trạng thái xử lý.",
  },
];
