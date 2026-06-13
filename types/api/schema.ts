export interface SchemaField {
  fieldId: string;
  code: string;
  label: string;
  fieldType: string;
  dataSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  displaySchema: Record<string, unknown>;
  sortOrder: number;
}

export interface LayerSchema {
  layerId: string;
  layerCode: string;
  schemaVersionId: string;
  version: number;
  status: string;
  fields: SchemaField[];
}
