export interface DictionaryItem {
  id: string;
  code: string;
  label: string;
  parentId?: string | null;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface Dictionary {
  id: string;
  code: string;
  name: string;
  description?: string;
  itemCount?: number;
  /** Giá trị lựa chọn — BE có thể trả `items` hoặc `values` */
  items?: DictionaryItem[];
  values?: DictionaryItem[];
  isHierarchical?: boolean;
}

export interface DictionaryValueInput {
  label: string;
  sortOrder?: number;
  code?: string;
}

export interface CreateDictionaryPayload {
  name: string;
  description?: string;
  isHierarchical?: boolean;
  values?: DictionaryValueInput[];
}

export interface UpdateDictionaryPayload {
  name?: string;
  description?: string | null;
}

export interface CreateDictionaryItemPayload {
  label: string;
  sortOrder?: number;
  code?: string;
}

export interface BatchCreateDictionaryItemsPayload {
  values: DictionaryValueInput[];
}

export interface UpdateDictionaryItemPayload {
  label?: string;
  sortOrder?: number;
}
