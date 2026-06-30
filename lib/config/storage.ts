import { wardConfig } from "@/config/ward.config";

function normalizeNamespace(value: string) {
  return value.trim().replace(/[^A-Za-z0-9_.-]/g, "_") || "webgis";
}

export function getStorageKey(key: string) {
  const suffix = key.trim().replace(/^\.+/, "");
  return `${normalizeNamespace(wardConfig.storageNamespace)}.${suffix}`;
}
