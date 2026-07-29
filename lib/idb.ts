/**
 * プロジェクト・ファイル・会話は IndexedDB（端末ローカル）。
 * WHY-not サーバDB: BYOK/プライバシーが売りの MVP。クラウド同期は v2。
 */

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type ProjectFile = {
  id: string;
  projectId: string;
  name: string;
  mime: string;
  text: string;
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  projectId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  modelId?: string;
  createdAt: number;
};

const DB_NAME = "presence-v1";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("files")) {
        const files = db.createObjectStore("files", { keyPath: "id" });
        files.createIndex("byProject", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains("messages")) {
        const messages = db.createObjectStore("messages", { keyPath: "id" });
        messages.createIndex("byProject", "projectId", { unique: false });
      }
    };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb request failed"));
  });
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function listProjects(): Promise<Project[]> {
  const db = await openDb();
  const tx = db.transaction("projects", "readonly");
  const all = await reqToPromise(tx.objectStore("projects").getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertProject(project: Project): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("projects", "readwrite");
  await reqToPromise(tx.objectStore("projects").put(project));
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["projects", "files", "messages"], "readwrite");
  await reqToPromise(tx.objectStore("projects").delete(id));
  const files = await reqToPromise(
    tx.objectStore("files").index("byProject").getAllKeys(id),
  );
  await Promise.all(
    files.map((key) => reqToPromise(tx.objectStore("files").delete(key))),
  );
  // projectId=null の雑談は消さない。プロジェクト紐付け分だけ消す。
  const msgs = await reqToPromise(
    tx.objectStore("messages").index("byProject").getAll(id),
  );
  await Promise.all(
    msgs.map((m) => reqToPromise(tx.objectStore("messages").delete(m.id))),
  );
}

export async function listFiles(projectId: string): Promise<ProjectFile[]> {
  const db = await openDb();
  const tx = db.transaction("files", "readonly");
  const all = await reqToPromise(
    tx.objectStore("files").index("byProject").getAll(projectId),
  );
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addFile(file: ProjectFile): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("files", "readwrite");
  await reqToPromise(tx.objectStore("files").put(file));
}

export async function deleteFile(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("files", "readwrite");
  await reqToPromise(tx.objectStore("files").delete(id));
}

export async function listMessages(
  projectId: string | null,
): Promise<ChatMessage[]> {
  const db = await openDb();
  const tx = db.transaction("messages", "readonly");
  if (projectId === null) {
    const all = await reqToPromise(tx.objectStore("messages").getAll());
    return all
      .filter((m) => m.projectId === null)
      .sort((a, b) => a.createdAt - b.createdAt);
  }
  const all = await reqToPromise(
    tx.objectStore("messages").index("byProject").getAll(projectId),
  );
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addMessage(message: ChatMessage): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("messages", "readwrite");
  await reqToPromise(tx.objectStore("messages").put(message));
}

export async function clearMessages(projectId: string | null): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("messages", "readwrite");
  const all = await reqToPromise(tx.objectStore("messages").getAll());
  const targets = all.filter((m) => m.projectId === projectId);
  await Promise.all(
    targets.map((m) => reqToPromise(tx.objectStore("messages").delete(m.id))),
  );
}

/** テキスト抽出: プレーン / markdown / csv。PDF は MVP 対象外（バイナリは拒否）。 */
export async function readFileAsText(file: File): Promise<string> {
  const allowed = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "text/html",
  ];
  const okExt =
    /\.(txt|md|markdown|csv|json|html|htm|ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|css|yml|yaml)$/i;
  if (!allowed.includes(file.type) && !okExt.test(file.name)) {
    throw new Error(
      "対応形式: テキスト系（.md .txt .csv .json など）。PDF は次フェーズ。",
    );
  }
  // WHY 上限 1.5MB: IndexedDB に載せてコンテキストに載せる前提。巨大ファイルは分割アップロードへ誘導。
  if (file.size > 1.5 * 1024 * 1024) {
    throw new Error(
      "ファイルが大きすぎます（上限 1.5MB）。分割して追加してください。",
    );
  }
  return file.text();
}
