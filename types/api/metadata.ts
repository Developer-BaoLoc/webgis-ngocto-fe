export interface StyleFieldMeta {
  key: string;
  label: string;
  type: "icon" | "icon_upload" | "color" | "number" | string;
  uploadEndpoint?: string;
}

export interface LayerGeometryTypeMeta {
  type: string;
  label: string;
  geometryKind: string;
  styleFields: StyleFieldMeta[];
}

export interface ConfigFieldOption {
  code: string;
  label: string;
}

export interface ConfigFieldMeta {
  key: string;
  label: string;
  required?: boolean;
  type: "select" | "dictionary" | string;
  options?: ConfigFieldOption[];
  dependsOn?: { key: string; value: string };
}

export interface FieldTypeMeta {
  type: string;
  label?: string;
  description?: string;
  uiComponent?: string;
  valueShape?: Record<string, string>;
  configFields?: ConfigFieldMeta[];
}

export interface FieldDisplayGroupMeta {
  key: string;
  label: string;
  hint?: string;
}

export interface FieldDisplayOptionMeta {
  key: string;
  label: string;
  type: "boolean" | "select" | "color" | string;
  default?: unknown;
  group?: string;
  dependsOn?: { key: string; value: unknown };
  options?: ConfigFieldOption[];
}

export interface FieldDisplayOptionsCatalog {
  groups: FieldDisplayGroupMeta[];
  options: FieldDisplayOptionMeta[];
}

/** @deprecated Dùng LayerGeometryTypeMeta */
export interface GeometryKindMeta {
  value: string;
  label: string;
}
