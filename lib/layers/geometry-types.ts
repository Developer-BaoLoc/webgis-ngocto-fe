import type { LayerGeometryTypeMeta, StyleFieldMeta } from "@/types/api/metadata";

const LAYER_ICON_FIELD: StyleFieldMeta = {
  key: "iconAttachmentId",
  label: "Icon (upload)",
  type: "icon_upload",
};

function isIconStyleField(field: StyleFieldMeta): boolean {
  return field.type === "icon" || field.type === "icon_upload";
}

function withPointIconField(styleFields: StyleFieldMeta[]): StyleFieldMeta[] {
  if (styleFields.some(isIconStyleField)) {
    return styleFields;
  }
  return [LAYER_ICON_FIELD, ...styleFields];
}

export function enrichGeometryTypes(
  types: LayerGeometryTypeMeta[],
): LayerGeometryTypeMeta[] {
  return types.map((type) => {
    if (type.type === "point") {
      return {
        ...type,
        styleFields: withPointIconField(type.styleFields ?? []),
      };
    }

    if (type.type === "line" || type.type === "polygon") {
      return {
        ...type,
        styleFields: (type.styleFields ?? []).filter(
          (field) => !isIconStyleField(field),
        ),
      };
    }

    if (type.type === "sub_layer") {
      return {
        ...type,
        label: type.label || "Lớp phụ",
        geometryKind: "none",
        styleFields: [],
      };
    }

    return type;
  });
}

export const FALLBACK_GEOMETRY_TYPES: LayerGeometryTypeMeta[] =
  enrichGeometryTypes([
    {
      type: "point",
      label: "Điểm",
      geometryKind: "point",
      styleFields: [LAYER_ICON_FIELD],
    },
    {
      type: "line",
      label: "Đường",
      geometryKind: "linestring",
      styleFields: [
        { key: "lineColor", label: "Màu đường", type: "color" },
        { key: "lineWidth", label: "Độ dày", type: "number" },
      ],
    },
    {
      type: "polygon",
      label: "Vùng",
      geometryKind: "polygon",
      styleFields: [
        { key: "fillColor", label: "Màu vùng", type: "color" },
        { key: "strokeColor", label: "Màu viền", type: "color" },
      ],
    },
    {
      type: "sub_layer",
      label: "Lớp phụ",
      geometryKind: "none",
      styleFields: [],
    },
  ]);
