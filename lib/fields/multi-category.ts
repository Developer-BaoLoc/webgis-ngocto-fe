export const MULTI_CATEGORY_DISPLAY_SEPARATOR = "\n";

/** Hiển thị danh sách label — mỗi giá trị một dòng */
export function formatMultiCategoryLabels(labels: string[]): string {
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .join(MULTI_CATEGORY_DISPLAY_SEPARATOR);
}

/**
 * Chuỗi hiển thị legacy (dấu phẩy) → xuống dòng.
 * Giữ nguyên nếu đã có xuống dòng (Excel Alt+Enter).
 */
export function normalizeMultiCategoryDisplayText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("\n")) {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(MULTI_CATEGORY_DISPLAY_SEPARATOR);
  }

  return trimmed
    .split(/\s*[,;]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(MULTI_CATEGORY_DISPLAY_SEPARATOR);
}

export function formatMultiCategoryValue(
  value: unknown,
  resolveLabel?: (code: string) => string | null,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (Array.isArray(value)) {
    const labels = (value as unknown[])
      .map((item) => {
        const code = String(item).trim();
        if (!code) return null;
        return resolveLabel?.(code) ?? code;
      })
      .filter((label): label is string => Boolean(label));

    return labels.length > 0 ? formatMultiCategoryLabels(labels) : null;
  }

  if (typeof value === "string") {
    const normalized = normalizeMultiCategoryDisplayText(value);
    return normalized || null;
  }

  return null;
}
