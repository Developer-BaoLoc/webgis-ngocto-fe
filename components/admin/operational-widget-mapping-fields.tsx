"use client";

import { inputClass } from "@/components/form/field-wrapper";
import {
  DATE_FIELD_TYPES,
  GROUPABLE_FIELD_TYPES,
} from "@/lib/dashboard/utils";
import { getFieldLabel } from "@/lib/fields/field-label";
import { isNumericField } from "@/lib/fields/field-types";
import type { DataSourceField, WidgetType } from "@/types/api/dashboard";

export type OperationalFieldKey =
  | "titleField"
  | "descriptionField"
  | "startDateField"
  | "dateField"
  | "endDateField"
  | "statusField"
  | "groupField"
  | "typeField"
  | "severityField"
  | "areaField"
  | "progressField"
  | "ownerField"
  | "deadlineField"
  | "resultField";

interface Props {
  widgetType: WidgetType;
  fields: DataSourceField[];
  values: Record<OperationalFieldKey, string>;
  metricFields: string[];
  limit: number;
  onFieldChange: (key: OperationalFieldKey, value: string) => void;
  onMetricFieldsChange: (fields: string[]) => void;
  onLimitChange: (limit: number) => void;
}

const TEXT_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "string",
  "category",
  "select",
  "boolean",
]);

function FieldSelect({
  label,
  description,
  value,
  fields,
  required,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  fields: DataSourceField[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <p className="mb-1 text-xs text-muted">{description}</p>
      <select
        className={inputClass}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">— Chọn trường —</option>
        {fields.map((field) => (
          <option key={field.code} value={field.code}>
            {getFieldLabel(field.code, field)}
          </option>
        ))}
      </select>
      {fields.length === 0 && (
        <p className="mt-1 text-xs text-amber-700">
          Nguồn dữ liệu chưa có trường đúng kiểu.
        </p>
      )}
    </div>
  );
}

export function OperationalWidgetMappingFields({
  widgetType,
  fields,
  values,
  metricFields,
  limit,
  onFieldChange,
  onMetricFieldsChange,
  onLimitChange,
}: Props) {
  const textFields = fields.filter((field) =>
    TEXT_FIELD_TYPES.has(field.fieldType.toLocaleLowerCase()),
  );
  const dateFields = fields.filter((field) =>
    DATE_FIELD_TYPES.has(field.fieldType.toLocaleLowerCase()),
  );
  const numericFields = fields.filter((field) => isNumericField(field));
  const statusFields = textFields.filter((field) =>
    GROUPABLE_FIELD_TYPES.has(field.fieldType.toLocaleLowerCase()),
  );
  const select = (
    key: OperationalFieldKey,
    label: string,
    description: string,
    source: DataSourceField[],
    required = false,
  ) => (
    <FieldSelect
      key={key}
      label={label}
      description={description}
      value={values[key]}
      fields={source}
      required={required}
      onChange={(value) => onFieldChange(key, value)}
    />
  );

  return (
    <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
      <div>
        <p className="text-sm font-semibold text-sky-950">
          Ánh xạ trường nghiệp vụ
        </p>
        <p className="mt-1 text-xs text-sky-800">
          Widget đọc từng bản ghi; nhãn chỉ dùng hiển thị, dữ liệu vẫn giữ giá
          trị gốc.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {widgetType === "timeline" && (
          <>
            {select(
              "titleField",
              "Tên sự kiện",
              "Tiêu đề của từng mốc thời gian.",
              textFields,
              true,
            )}
            {select(
              "startDateField",
              "Ngày bắt đầu",
              "Trường ngày dùng để sắp xếp timeline.",
              dateFields,
              true,
            )}
            {select(
              "endDateField",
              "Ngày kết thúc",
              "Không bắt buộc nếu sự kiện chỉ có một ngày.",
              dateFields,
            )}
            {select(
              "statusField",
              "Trạng thái",
              "Hiển thị badge trạng thái.",
              statusFields,
            )}
            {select(
              "groupField",
              "Loại sự kiện",
              "Dùng để tạo màu phân loại.",
              statusFields,
            )}
          </>
        )}

        {widgetType === "calendar" && (
          <>
            {select(
              "titleField",
              "Tên công việc",
              "Nội dung công việc trên lịch.",
              textFields,
              true,
            )}
            {select(
              "dateField",
              "Ngày thực hiện",
              "Ngày chính để phân loại hôm nay, sắp tới hoặc quá hạn.",
              dateFields,
              true,
            )}
            {select(
              "endDateField",
              "Ngày kết thúc",
              "Thời điểm kết thúc nếu công việc kéo dài.",
              dateFields,
            )}
            {select(
              "statusField",
              "Trạng thái",
              "Xác định công việc đã hoàn thành.",
              statusFields,
            )}
            {select(
              "typeField",
              "Loại công việc",
              "Dùng chọn icon gieo sạ, bón phân, thay nước...",
              statusFields,
            )}
          </>
        )}

        {widgetType === "progress" && (
          <>
            {select(
              "titleField",
              "Tên hạng mục",
              "Tên công việc hoặc chương trình cần theo dõi.",
              textFields,
              true,
            )}
            {select(
              "progressField",
              "Tiến độ phần trăm",
              "Chỉ hiển thị trường số.",
              numericFields,
              true,
            )}
            {select(
              "statusField",
              "Trạng thái",
              "Trạng thái thực hiện hiện tại.",
              statusFields,
            )}
            {select(
              "ownerField",
              "Đơn vị phụ trách",
              "Cơ quan hoặc cá nhân chịu trách nhiệm.",
              textFields,
            )}
            {select(
              "deadlineField",
              "Hạn hoàn thành",
              "Dùng cảnh báo hạng mục quá hạn.",
              dateFields,
            )}
          </>
        )}

        {widgetType === "milestone" && (
          <>
            {select(
              "titleField",
              "Tên chương trình",
              "Tên chương trình hoặc kết quả triển khai.",
              textFields,
              true,
            )}
            {select(
              "resultField",
              "Kết quả",
              "Mô tả kết quả nổi bật.",
              textFields,
              true,
            )}
            {select(
              "progressField",
              "Tiến độ phần trăm",
              "Tiến độ tổng thể của chương trình.",
              numericFields,
              true,
            )}
            {select(
              "statusField",
              "Trạng thái",
              "Hiển thị badge trạng thái.",
              statusFields,
            )}
          </>
        )}

        {(widgetType === "activity_history" ||
          widgetType === "activity_feed") && (
          <>
            {select(
              "titleField",
              "Tiêu đề hoạt động",
              "Tiêu đề cảnh báo hoặc hoạt động.",
              textFields,
              true,
            )}
            {select(
              "descriptionField",
              "Nội dung",
              "Mô tả chi tiết của hoạt động.",
              textFields,
            )}
            {select(
              "dateField",
              "Thời gian bắt đầu",
              "Trường ngày/giờ để sắp xếp lịch sử.",
              dateFields,
              true,
            )}
            {select(
              "statusField",
              "Trạng thái",
              "Trạng thái xử lý cảnh báo.",
              statusFields,
            )}
            {select(
              "severityField",
              "Mức độ",
              "Thấp, Trung bình, Cao hoặc Khẩn cấp.",
              statusFields,
            )}
            {select(
              "typeField",
              "Loại cảnh báo",
              "Nhóm nghiệp vụ của cảnh báo.",
              statusFields,
            )}
          </>
        )}

        {widgetType === "alert_center" && (
          <>
            {select(
              "titleField",
              "Tiêu đề cảnh báo",
              "Tên hoặc nội dung chính của từng cảnh báo.",
              textFields,
              true,
            )}
            {select(
              "severityField",
              "Mức độ",
              "Khẩn cấp, Cao, Trung bình hoặc Thấp.",
              statusFields,
              true,
            )}
            {select(
              "areaField",
              "Khu vực",
              "Vùng, địa bàn hoặc khu vực phát sinh cảnh báo.",
              textFields,
              true,
            )}
            {select(
              "dateField",
              "Thời gian cảnh báo",
              "Trường ngày/giờ để sắp xếp cảnh báo mới nhất.",
              dateFields,
              true,
            )}
            {select(
              "statusField",
              "Trạng thái xử lý",
              "Đang xử lý, đã xử lý hoặc trạng thái nghiệp vụ tương ứng.",
              statusFields,
            )}
          </>
        )}

        {widgetType === "seasonal_calendar" && (
          <>
            {select(
              "titleField",
              "Tên mùa vụ/công việc",
              "Tên hiển thị trên từng dòng lịch.",
              textFields,
              true,
            )}
            {select(
              "startDateField",
              "Ngày bắt đầu",
              "Mốc bắt đầu thanh thời gian.",
              dateFields,
              true,
            )}
            {select(
              "endDateField",
              "Ngày kết thúc",
              "Để trống nếu sự kiện chỉ có một ngày.",
              dateFields,
            )}
            {select(
              "typeField",
              "Loại công việc",
              "Dùng tạo màu và chú giải.",
              statusFields,
            )}
            {select(
              "statusField",
              "Trạng thái",
              "Trạng thái thực hiện mùa vụ.",
              statusFields,
            )}
            {select(
              "groupField",
              "Nhóm cây trồng/vật nuôi",
              "Thông tin nhóm hiển thị dưới tên công việc.",
              textFields,
            )}
          </>
        )}
      </div>

      {widgetType === "milestone" && (
        <div>
          <label className="block text-sm font-medium">Các chỉ số phụ</label>
          <p className="mb-2 text-xs text-muted">
            Ví dụ: số hộ tham gia, diện tích, kinh phí triển khai.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {numericFields.map((field) => (
              <label
                key={field.code}
                className="flex items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={metricFields.includes(field.code)}
                  onChange={(event) =>
                    onMetricFieldsChange(
                      event.target.checked
                        ? [...metricFields, field.code]
                        : metricFields.filter((code) => code !== field.code),
                    )
                  }
                />
                {getFieldLabel(field.code, field)}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Số bản ghi tối đa</label>
        <p className="mb-1 text-xs text-muted">
          Giới hạn số sự kiện hoặc hạng mục tải vào widget.
        </p>
        <input
          type="number"
          min={1}
          max={100}
          className={inputClass}
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value) || 20)}
        />
      </div>
    </div>
  );
}
