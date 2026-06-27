export interface TablePreferences {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  sort: { key: string; direction: "asc" | "desc" } | null;
  pageSize: number;
  columnOrder: string[];
  showGeometry: boolean;
  measurementUnitModes: Record<string, "source" | "normalized">;
}

function safeSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}

export function tablePreferencesKey(input: {
  userId: string;
  layerId: string;
  tableId?: string;
}) {
  return `gis_ngocto.table_preferences.${safeSegment(input.userId)}.${safeSegment(input.layerId)}.${safeSegment(input.tableId ?? "records")}`;
}

export function loadTablePreferences(key: string): TablePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!value || typeof value !== "object") return null;
    return {
      visibleColumns: Array.isArray(value.visibleColumns)
        ? value.visibleColumns.filter((item: unknown): item is string => typeof item === "string")
        : [],
      columnWidths:
        value.columnWidths && typeof value.columnWidths === "object"
          ? value.columnWidths
          : {},
      sort:
        value.sort &&
        typeof value.sort.key === "string" &&
        (value.sort.direction === "asc" || value.sort.direction === "desc")
          ? value.sort
          : null,
      pageSize: [10, 20, 50, 100].includes(Number(value.pageSize))
        ? Number(value.pageSize)
        : 20,
      columnOrder: Array.isArray(value.columnOrder)
        ? value.columnOrder.filter((item: unknown): item is string => typeof item === "string")
        : [],
      showGeometry: value.showGeometry === true,
      measurementUnitModes:
        value.measurementUnitModes && typeof value.measurementUnitModes === "object"
          ? Object.fromEntries(
              Object.entries(value.measurementUnitModes).filter(
                ([, mode]) => mode === "source" || mode === "normalized",
              ),
            ) as Record<string, "source" | "normalized">
          : {},
    };
  } catch {
    return null;
  }
}

export function saveTablePreferences(key: string, preferences: TablePreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    // Preferences remain usable for the current session.
  }
}

export function clearTablePreferences(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}
