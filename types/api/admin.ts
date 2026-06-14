export type LayerGeometryType = "point" | "line" | "polygon" | string;

export interface LayerIconStyle {
  source?: string;
  attachmentId?: string;
  url?: string;
}

export interface LayerStyle {
  geometryType?: string;
  icon?: string | LayerIconStyle;
  iconAttachmentId?: string;
  iconUrl?: string;
  lineColor?: string;
  lineWidth?: number;
  fillColor?: string;
  strokeColor?: string;
}

export interface CreateLayerPayload {
  name: string;
  description?: string | null;
  geometryType: LayerGeometryType;
  sortOrder?: number;
  style: LayerStyle;
}

export interface UpdateLayerPayload {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  style?: LayerStyle;
  isActive?: boolean;
}

export interface DeleteLayerResult {
  id: string;
  deleted: boolean;
  recordsDeleted?: number;
}

export interface AdminLayer {
  id: string;
  code: string;
  name: string;
  description: string | null;
  geometryType: LayerGeometryType;
  geometryKind?: string;
  geometryRequired?: boolean;
  sortOrder: number;
  endpoint?: string;
  style?: LayerStyle;
  isActive?: boolean;
  draftSchemaId?: string | null;
  currentSchemaVersionId?: string;
  schemaStatus?: "published" | "draft" | string;
  renderMode?: string;
}

export interface CreateFieldPayload {
  label: string;
  fieldType: string;
  dataSchema?: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  displaySchema?: Record<string, unknown>;
  sortOrder?: number;
}

export interface UpdateFieldPayload {
  label?: string;
  fieldType?: string;
  dataSchema?: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  displaySchema?: Record<string, unknown>;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ReorderFieldsPayload {
  fieldIds: string[];
}

export interface SchemaDraft {
  id: string;
  layerId: string;
  layerCode?: string;
  schemaVersionId?: string;
  version: number;
  status: string;
  fields: import("./schema").SchemaField[];
}
