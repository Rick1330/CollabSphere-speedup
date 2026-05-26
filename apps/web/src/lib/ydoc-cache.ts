import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import * as Y from "yjs";

interface YDocCacheDB extends DBSchema {
  documents: {
    key: string;
    value: {
      documentId: string;
      ydocState: Uint8Array;
      lastModified: number;
    };
  };
}

const DB_NAME = "collabsphere-ydoc-cache";
const DB_VERSION = 1;

class YDocCache {
  private db: IDBPDatabase<YDocCacheDB> | null = null;

  private async getDb(): Promise<IDBPDatabase<YDocCacheDB>> {
    if (this.db) return this.db;
    this.db = await openDB<YDocCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("documents")) {
          database.createObjectStore("documents", { keyPath: "documentId" });
        }
      },
    });
    return this.db;
  }

  async get(documentId: string): Promise<Uint8Array | null> {
    if (!documentId) return null;
    const db = await this.getDb();
    const cached = await db.get("documents", documentId);
    return cached?.ydocState ?? null;
  }

  async set(documentId: string, ydocState: Uint8Array): Promise<void> {
    if (!documentId || ydocState.length === 0) return;
    const db = await this.getDb();
    await db.put("documents", {
      documentId,
      ydocState,
      lastModified: Date.now(),
    });
  }

  async delete(documentId: string): Promise<void> {
    if (!documentId) return;
    const db = await this.getDb();
    await db.delete("documents", documentId);
  }

  async clear(): Promise<void> {
    const db = await this.getDb();
    await db.clear("documents");
  }
}

export const ydocCache = new YDocCache();

export function encodeYdocState(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}
