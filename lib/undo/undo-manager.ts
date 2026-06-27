export interface UndoAction {
  id?: string;
  label: string;
  undo: () => void | Promise<void>;
  expiresInMs?: number;
}

interface StoredUndoAction extends UndoAction {
  id: string;
  expiresAt: number;
}

const undoStack: StoredUndoAction[] = [];

export function pushUndoAction(action: UndoAction) {
  const stored: StoredUndoAction = {
    ...action,
    id: action.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expiresAt: Date.now() + (action.expiresInMs ?? 12000),
  };
  undoStack.unshift(stored);
  undoStack.splice(20);
  return stored.id;
}

export async function undoLastAction(id?: string) {
  const index = id
    ? undoStack.findIndex((action) => action.id === id)
    : undoStack.findIndex((action) => action.expiresAt > Date.now());
  if (index < 0) return false;
  const [action] = undoStack.splice(index, 1);
  if (action.expiresAt <= Date.now()) return false;
  await action.undo();
  return true;
}
