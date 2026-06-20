"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createDictionary, getDictionaries } from "@/lib/api/dictionaries";
import { inputClass } from "@/components/form/field-wrapper";
import type { Dictionary } from "@/types/api/dictionary";
import {
  cleanDictionaryText,
  normalizeDictionaryName,
} from "@/lib/dictionaries/utils";

interface DictionaryPickerProps {
  value?: string;
  onChange: (code: string) => void;
  required?: boolean;
}

export function DictionaryPicker({
  value = "",
  onChange,
  required,
}: DictionaryPickerProps) {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDictionaries(await getDictionaries());
    } catch {
      setDictionaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    const name = cleanDictionaryText(newName);
    const existing = dictionaries.find(
      (dictionary) =>
        normalizeDictionaryName(dictionary.name) ===
        normalizeDictionaryName(name),
    );
    if (existing) {
      onChange(existing.code);
      setError("Danh mục này đã tồn tại; hệ thống đã chọn danh mục có sẵn.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createDictionary({
        name,
        description: newDescription.trim() || undefined,
        isHierarchical: false,
      });
      await load();
      onChange(created.code);
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo danh mục thất bại");
    } finally {
      setCreating(false);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      void handleCreate();
    }
  }

  return (
    <div className="space-y-2">
      <select
        className={inputClass}
        value={value}
        required={required}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Chọn danh mục —</option>
        {dictionaries.map((dict) => (
          <option key={dict.id} value={dict.code}>
            {dict.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setShowCreate((v) => !v)}
        className="text-sm text-primary hover:underline"
      >
        {showCreate ? "Hủy tạo danh mục" : "+ Tạo danh mục mới"}
      </button>

      {showCreate && (
        <div className="space-y-2 rounded-lg border border-border bg-slate-50 p-3">
          <div>
            <label className="block text-sm font-medium">Tên danh mục</label>
            <input
              className={inputClass}
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ngành nghề sản xuất"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Mô tả (tuỳ chọn)
            </label>
            <input
              className={inputClass}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Phân loại ngành nghề HTX"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            disabled={creating || !newName.trim()}
            onClick={handleCreate}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {creating ? "Đang tạo..." : "Tạo danh mục"}
          </button>
        </div>
      )}

      <p className="text-xs text-muted">
        Danh mục dùng chung — tạo một lần, chọn ở nhiều lớp dữ liệu.{" "}
        <Link
          href="/quan-tri/danh-muc"
          className="text-primary hover:underline"
          target="_blank"
        >
          Quản lý danh mục
        </Link>
      </p>
    </div>
  );
}
