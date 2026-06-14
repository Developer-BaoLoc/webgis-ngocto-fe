import { getLayerSchema } from "@/lib/api/layers";
import {
  createSchemaDraft,
  getSchemaDraft,
} from "@/lib/api/schema-drafts";
import type { AdminLayer, SchemaDraft } from "@/types/api/admin";
import type { LayerSchema } from "@/types/api/schema";

export function layerSchemaToDraft(schema: LayerSchema): SchemaDraft {
  return {
    id: schema.schemaVersionId,
    layerId: schema.layerId,
    layerCode: schema.layerCode,
    schemaVersionId: schema.schemaVersionId,
    version: schema.version,
    status: schema.status,
    fields: schema.fields,
  };
}

export async function resolveEditableSchema(
  layerId: string,
  layer: AdminLayer,
): Promise<SchemaDraft> {
  try {
    const published = await getLayerSchema(layerId);
    return layerSchemaToDraft(published);
  } catch {
    const schemaId = layer.currentSchemaVersionId ?? layer.draftSchemaId;
    if (schemaId) {
      return getSchemaDraft(schemaId);
    }
    return createSchemaDraft(layerId);
  }
}

export function getLayerSchemaStatusBadge(layer: AdminLayer): {
  variant: "success" | "warning" | "default";
  label: string;
} {
  if (layer.schemaStatus === "published" || layer.currentSchemaVersionId) {
    return { variant: "success", label: "Sẵn sàng" };
  }

  if (layer.schemaStatus === "draft" || layer.draftSchemaId) {
    return { variant: "warning", label: "Đang chỉnh sửa" };
  }

  return { variant: "default", label: "Chưa có cấu trúc" };
}
