import type { LayerGeometryTypeMeta, StyleFieldMeta } from "@/types/api/metadata";

const LAYER_ICON_FIELD: StyleFieldMeta = {
  key: "iconAttachmentId",
  label: "Icon (upload)",
  type: "icon_upload",
};

function isIconStyleField(field: StyleFieldMeta): boolean {
  return field.type === "icon" || field.type === "icon_upload";
}

function withLayerIconField(styleFields: StyleFieldMeta[]): StyleFieldMeta[] {
  if (styleFields.some(isIconStyleField)) {
    return styleFields;
  }
  return [LAYER_ICON_FIELD, ...styleFields];
}

export function enrichGeometryTypes(
  types: LayerGeometryTypeMeta[],
): LayerGeometryTypeMeta[] {
  return types.map((type) => {
    if (!["point", "line", "polygon"].includes(type.type)) {
      return type;
    }

    return {
      ...type,
      styleFields: withLayerIconField(type.styleFields ?? []),
    };
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
        LAYER_ICON_FIELD,
        { key: "lineColor", label: "Màu đường", type: "color" },
        { key: "lineWidth", label: "Độ dày", type: "number" },
      ],
    },
    {
      type: "polygon",
      label: "Vùng",
      geometryKind: "polygon",
      styleFields: [
        LAYER_ICON_FIELD,
        { key: "fillColor", label: "Màu vùng", type: "color" },
        { key: "strokeColor", label: "Màu viền", type: "color" },
      ],
    },
  ]);
