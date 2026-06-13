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
}

export interface ImportPreviewRow {
  rowNumber?: number;
  data?: Record<string, unknown>;
  mapped?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  errors?: string[];
}

export interface ImportPreviewResult {
  templateCode?: string;
  sheetName?: string;
  totalRows?: number;
  headers?: string[];
  /** Dòng preview — BE có thể trả rows hoặc previewRows */
  rows?: Array<Record<string, unknown> | unknown[]>;
  previewRows?: ImportPreviewRow[];
  warnings?: string[];
  errors?: string[];
  validCount?: number;
  errorCount?: number;
}

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
