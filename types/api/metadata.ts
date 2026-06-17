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
  type: "select" | "dictionary" | "layer" | "field" | "text" | string;
  options?: ConfigFieldOption[];
  dependsOn?: { key: string; value: string };
  sourceLayerKey?: string;
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

export interface RelationshipOption {
  value: string;
  label: string;
}

export interface RelationshipResolveResult {
  id: string | null;
  label: string;
  status: "matched" | "not_found" | "ambiguous" | "created";
}

export interface RelationshipCheckResult {
  sourceLayer: { id: string; code: string; name: string };
  childLayer: { id: string; code: string; name: string };
  parentLayer: { id: string; code: string; name: string };
  relationType: string;
  foreignKey: string;
  totalChildRecords?: number;
  childWithForeignKey: number;
  matched: number;
  unmatched: number;
  errors: Array<{
    childId: string;
    childLabel: string;
    rawValue: string;
    message: string;
  }>;
}

export interface RelationshipResolveAgainResult {
  sourceLayerId: string;
  fieldCode: string;
  targetLayerId: string;
  scanned: number;
  alreadyIds: number;
  updated: number;
  notMatched: number;
  errors: Array<{
    recordId: string;
    rawValue: string;
    message: string;
  }>;
}

export interface RelationshipSuggestion {
  sourceLayerId: string;
  sourceLayerCode: string;
  sourceLayerName: string;
  foreignKey: string;
  sourceFieldCode: string;
  sourceFieldLabel: string;
  suggestedLabel: string;
  targetDisplayField: string;
  matchField: string;
  message: string;
}

/** @deprecated Dùng LayerGeometryTypeMeta */
export interface GeometryKindMeta {
  value: string;
  label: string;
}
