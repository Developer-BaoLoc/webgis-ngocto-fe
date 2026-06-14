import type {
  FieldDisplayOptionMeta,
  FieldDisplayOptionsCatalog,
} from "@/types/api/metadata";

export const DEFAULT_FIELD_DISPLAY_OPTIONS: FieldDisplayOptionsCatalog = {
  groups: [
    {
      key: "mapPopup",
      label: "Popup khi click trên bản đồ",
      hint: "Áp dụng khi bật Hiển thị khi click trên bản đồ",
    },
  ],
  options: [
    {
      key: "showOnMapPopup",
      label: "Hiển thị khi click trên bản đồ",
      type: "boolean",
      default: false,
      group: "mapPopup",
    },
    {
      key: "popupBold",
      label: "In đậm",
      type: "boolean",
      default: false,
      group: "mapPopup",
      dependsOn: { key: "showOnMapPopup", value: true },
    },
    {
      key: "popupFontSize",
      label: "Cỡ chữ",
      type: "select",
      default: "medium",
      group: "mapPopup",
      dependsOn: { key: "showOnMapPopup", value: true },
      options: [
        { code: "small", label: "Nhỏ" },
        { code: "medium", label: "Vừa" },
        { code: "large", label: "Lớn" },
      ],
    },
    {
      key: "popupTextColor",
      label: "Màu chữ",
      type: "color",
      default: null,
      group: "mapPopup",
      dependsOn: { key: "showOnMapPopup", value: true },
    },
  ],
};

export function isDisplayOptionVisible(
  option: FieldDisplayOptionMeta,
  displaySchema: Record<string, unknown>,
): boolean {
  if (!option.dependsOn) return true;
  return displaySchema[option.dependsOn.key] === option.dependsOn.value;
}

export function buildDisplaySchemaForSave(
  displaySchema: Record<string, unknown> = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (displaySchema.showOnMapPopup) {
    result.showOnMapPopup = true;
    if (displaySchema.popupBold) result.popupBold = true;
    result.popupFontSize = displaySchema.popupFontSize ?? "medium";
    const color = displaySchema.popupTextColor;
    if (typeof color === "string" && color.trim()) {
      result.popupTextColor = color;
    }
  } else {
    result.showOnMapPopup = false;
  }

  return result;
}

export function normalizeDisplaySchema(
  displaySchema?: Record<string, unknown>,
): Record<string, unknown> {
  const source = displaySchema ?? {};
  return {
    showOnMapPopup: Boolean(source.showOnMapPopup),
    popupBold: Boolean(source.popupBold),
    popupFontSize:
      typeof source.popupFontSize === "string" ? source.popupFontSize : "medium",
    popupTextColor:
      typeof source.popupTextColor === "string" ? source.popupTextColor : "",
  };
}
