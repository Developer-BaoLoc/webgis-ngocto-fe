import { DASHBOARD_AI_WIDGET_TYPES } from "./schema";
import type { DashboardAiGroundingContext } from "./context";
import { summarizeDashboardAiGroundingContext } from "./context";

export function buildDashboardTemplatePrompt(
  description: string,
  context?: DashboardAiGroundingContext,
) {
  const contextText = summarizeDashboardAiGroundingContext(context);
  return [
    "Bạn là Dashboard Template Generator cho một WebGIS metadata-driven.",
    "Nhiệm vụ: sinh đúng một DashboardTemplate JSON để frontend đưa vào Template Wizard.",
    "",
    "QUY TẮC BẮT BUỘC:",
    "- Chỉ trả JSON thuần, không markdown, không code fence, không giải thích.",
    "- JSON trả về nên là envelope: { \"template\": DashboardTemplate, \"dataPreparationPlan\": DataPreparationPlan | null }.",
    "- Nếu không cần chuẩn bị dữ liệu trước, dataPreparationPlan có thể null hoặc bỏ qua.",
    "- Không sinh HTML, JavaScript, React, TypeScript, backend, SQL hoặc prompt.",
    "- Không sinh DashboardWidget runtime trực tiếp.",
    "- Trong template, không dùng layerId/datasetId/viewId/field thật; chỉ dùng placeholder.",
    "- Trong dataPreparationPlan, có thể dùng layerId/viewId thật từ METADATA CONTEXT để tạo Saved View/Dataset sau khi user xác nhận.",
    "- Chỉ dùng placeholder theo format: __layer:key__, __field:key__, __dataset:key__, __view:key__.",
    "- Mọi field placeholder phải có sourceKey trỏ về placeholder nguồn tương ứng.",
    "- Nếu có METADATA CONTEXT, chỉ chọn ý nghĩa dashboard dựa trên layer/dataset/view/field trong context.",
    "- Không được dùng dữ liệu bản ghi, vì context chỉ là metadata.",
    "- DATA PROFILE (nếu có) chỉ là thống kê tổng hợp, không phải record thô; dùng rowCount, kiểu field, numeric summary, categorical top values, date range, unique count và geometry để chọn widgetType nhạy hơn.",
    "- Nếu profile có numeric tổng hợp đơn lẻ, ưu tiên stat; category + numeric ưu tiên ranking/bar/pie/treemap theo mục đích; date + numeric ưu tiên line; status/severity ưu tiên alert_center/activity_feed; geometry có thể dùng map/minimap; nhiều bản ghi chi tiết có thể dùng table.",
    "- Placeholder key nên phản ánh source/field thật trong context để Wizard auto-map tốt hơn.",
    "- widgetType chỉ được thuộc registry hiện có.",
    "- Mỗi widget nên có purpose mô tả mục đích và widgetTypeReason giải thích ngắn vì sao chọn loại widget đó.",
    "- Chọn widgetType theo ý nghĩa: so sánh/xếp hạng dùng ranking hoặc bar; tỷ trọng dùng pie/donut/treemap; xu hướng dùng line; KPI tổng dùng stat; danh sách dùng table; cảnh báo dùng alert_center/activity_feed; vị trí dùng minimap/map; tiến độ dùng progress_ring; mùa vụ dùng seasonal_calendar.",
    "- layoutConfig dùng grid 12 cột, gồm x, y, w, h là số; w không vượt 12.",
    "- category chỉ dùng: ioc, aquaculture, rice, crop, irrigation, ocop, alert, custom.",
    "- placeholders phải có key, label, kind, required; kind đúng schema.",
    "- Không tự tạo widgetType mới.",
    "- Widget no-data như minimap, text, map, global_filter không cần dataSourceConfig và không cần placeholders.",
    "- Nếu sinh minimap, để dataSourceConfig rỗng/không có; không ép map layer/field analytics cho minimap.",
    "- Nếu dashboard cần Saved View/Dataset/filter/grouping trước khi tạo widget, chỉ đề xuất trong dataPreparationPlan.",
    "- dataPreparationPlan chỉ là kế hoạch để user xác nhận sau; không được nói là đã tạo dữ liệu.",
    "- suggestedSavedViews dùng layerId thật từ METADATA CONTEXT nếu có; nếu không chắc, không đề xuất tạo tự động.",
    "- suggestedDatasets nên tham chiếu savedViewTempId của suggestedSavedViews hoặc viewId thật từ context nếu có.",
    "- Nếu user cần so sánh/xếp hạng nhiều nguồn độc lập như Lúa, Thủy sản, Hoa màu theo cùng một chỉ số, hãy dùng suggestedDatasets[].type = \"multiSourceMetricDataset\".",
    "- multiSourceMetricDataset có output cố định: name, category, value, sourceType; widget ranking/bar nên dùng dataset placeholder trỏ đến dataset tạm này, metricField value, dimensionField category.",
    "",
    `WIDGET TYPES HỢP LỆ: ${DASHBOARD_AI_WIDGET_TYPES.join(", ")}`,
    "",
    "SCHEMA TỐI THIỂU CHO RESPONSE:",
    JSON.stringify(
      {
        template: {
          id: "ai-template-example",
          code: "ai_template_example",
          name: "Tên mẫu",
          description: "Mô tả mẫu",
          category: "custom",
          icon: "sparkles",
          tags: ["ai"],
          widgets: [
            {
              templateWidgetId: "widget-1",
              title: "Tổng diện tích",
              purpose: "Hiển thị tổng diện tích đang quản lý.",
              widgetTypeReason: "Một giá trị tổng hợp phù hợp widget KPI/stat.",
              widgetType: "stat",
              layoutConfig: { x: 0, y: 0, w: 3, h: 2 },
              dataSourceConfig: {
                layerId: "__layer:main__",
                aggregation: "sum",
                metricField: "__field:metric__",
              },
              displayConfig: { unit: "ha" },
              placeholders: [
                {
                  key: "main",
                  label: "Layer dữ liệu chính",
                  kind: "layer",
                  required: true,
                  geometryType: "any",
                },
                {
                  key: "metric",
                  label: "Trường chỉ số",
                  kind: "metric_field",
                  required: true,
                  fieldTypes: ["number", "integer", "decimal", "currency"],
                  sourceKey: "main",
                },
              ],
            },
          ],
        },
        dataPreparationPlan: {
          suggestedSavedViews: [
            {
              tempId: "main_filtered_view",
              name: "Nguồn dữ liệu đã lọc",
              layerId: "layer-id-from-context",
              filters: [{ field: "status", operator: "eq", value: "active" }],
              visibleFields: ["name", "status", "area"],
              groupBy: ["status"],
              metrics: ["area"],
              reason: "Lọc trước dữ liệu đang hoạt động để dashboard gọn hơn.",
            },
          ],
          suggestedDatasets: [
            {
              tempId: "main_dataset",
              type: "dataset",
              name: "Dataset tổng hợp",
              fields: [
                { key: "name", label: "Tên", type: "text" },
                { key: "area", label: "Diện tích", type: "decimal" },
              ],
              sources: [
                {
                  savedViewTempId: "main_filtered_view",
                  sourceLabel: "Nguồn dữ liệu đã lọc",
                  mapping: { name: "name", area: "area" },
                },
              ],
              groupBy: ["name"],
              metrics: ["area"],
              reason: "Chuẩn hóa field để dùng chung cho các widget.",
            },
            {
              tempId: "production_ranking_virtual",
              type: "multiSourceMetricDataset",
              name: "Xếp hạng sản lượng nhiều nguồn",
              sources: [
                {
                  sourceKey: "rice",
                  label: "Lúa",
                  aggregation: "sum",
                },
                {
                  sourceKey: "aquaculture",
                  label: "Thủy sản",
                  aggregation: "sum",
                },
                {
                  sourceKey: "crop",
                  label: "Hoa màu",
                  aggregation: "sum",
                },
              ],
              reason: "Gộp nhiều nguồn thành records name/category/value để dùng ranking hoặc bar chart.",
            },
          ],
          filters: [{ field: "status", operator: "eq", value: "active" }],
          groupBy: ["status"],
          metrics: ["area"],
          reason: "Cần chuẩn bị Saved View/Dataset trước khi dựng dashboard.",
        },
      },
      null,
      2,
    ),
    "",
    "GỢI Ý PLACEHOLDER:",
    "- main/source_layer/aquaculture_layer/rice_layer/crop_layer/irrigation_layer/ocop_layer/alert_layer",
    "- zone_layer cho layer polygon gom nhóm; zone_label_field có sourceKey zone_layer.",
    "- metric/area_field/profit_field/production_field/count_field dùng kind metric_field.",
    "- dimension/type/status/severity dùng kind dimension_field hoặc field.",
    "- date_field dùng kind date_field.",
    "",
    contextText
      ? ["METADATA CONTEXT RÚT GỌN:", contextText].join("\n")
      : "METADATA CONTEXT RÚT GỌN: Không có. Hãy dùng placeholder tổng quát.",
    "",
    "YÊU CẦU NGƯỜI DÙNG:",
    description.trim(),
  ].join("\n");
}
