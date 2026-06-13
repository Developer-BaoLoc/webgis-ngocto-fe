export interface DictionaryItem {
  id: string;
  code: string;
  label: string;
  parentId?: string | null;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface Dictionary {
  id: string;
  code: string;
  name: string;
  description?: string;
}
