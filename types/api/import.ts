export interface ImportTemplate {
  code: string;
  name: string;
  description?: string;
  layerCode?: string;
  sheetName?: string;
}

export interface ImportUploadResult {
  importId: string;
  jobId?: string;
  fileName?: string;
  totalRows?: number;
  layerId?: string;
}

export interface LayerImportValidationError {
  rowNumber: number;
  field?: string;
  fieldLabel?: string;
  rawValue?: unknown;
  code?: string;
  message: string;
}

export interface ImportPreviewRow {
  rowNumber?: number;
  data?: Record<string, unknown>;
  mapped?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  rawProperties?: Record<string, unknown>;
  valid?: boolean;
  errors?: string[];
}

export interface ImportPreviewResult {
  templateCode?: string;
  sheetName?: string;
  importId?: string;
  layerId?: string;
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  canImport?: boolean;
  message?: string;
  previewCount?: number;
  headers?: string[];
  /** Dòng preview — BE có thể trả rows hoặc previewRows */
  rows?: Array<Record<string, unknown> | unknown[]>;
  previewRows?: ImportPreviewRow[];
  warnings?: string[];
  /** Layer import — lỗi validation chi tiết */
  errors?: LayerImportValidationError[];
  validCount?: number;
  errorCount?: number;
}

export interface LayerImportExecuteResult {
  importId: string;
  layerId: string;
  processed: number;
  created: number;
  duplicates: number;
  errors: number;
  total: number;
  canImport?: boolean;
  validRows?: number;
  errorRows?: number;
  message?: string;
  duplicateRows?: LayerImportValidationError[];
}

export type LayerImportStep = "upload" | "preview" | "executing" | "done";

export interface ImportExecuteResult {
  importId: string;
  jobId: string;
  status?: string;
}

export interface ImportJobProgress {
  processed: number;
  total: number;
  errors: number;
}

export interface ImportJob {
  id: string;
  status: string;
  progress?: ImportJobProgress;
  errorMessage?: string;
  result?: Record<string, unknown>;
}

export interface ImportSession {
  id: string;
  status: string;
  fileName?: string;
  templateCode?: string;
  jobId?: string;
}

export type ImportWizardStep =
  | "template"
  | "upload"
  | "preview"
  | "importing"
  | "done";
