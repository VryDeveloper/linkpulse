/**
 * "Meus links" no IndexedDB do navegador.
 * Cada registro guarda os dados do link e a chave secreta que dá acesso ao analytics dele.
 * Nada aqui é enviado para outro lugar além do próprio servidor do LinkPulse.
 */

export interface LocalLink {
  slug: string;
  url: string;
  title: string | null;
  preciseGeo: boolean;
  createdAt: string;
  token: string;
}

const DB_NAME = "linkpulse";
const STORE = "links";
const CHANGE_EVENT = "linkpulse:links-changed";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponível neste navegador"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "slug" });
      store.createIndex("createdAt", "createdAt");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function listLocalLinks(): Promise<LocalLink[]> {
  const all = await tx<LocalLink[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLocalLink(slug: string): Promise<LocalLink | undefined> {
  return tx<LocalLink | undefined>("readonly", (s) => s.get(slug));
}

export async function saveLocalLink(link: LocalLink): Promise<void> {
  await tx("readwrite", (s) => s.put(link));
  notify();
}

export async function removeLocalLink(slug: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(slug));
  notify();
}

/** Avisa quando a lista muda (nesta aba ou em outra aba do mesmo navegador). */
export function onLocalLinksChange(callback: () => void): () => void {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANGE_EVENT) : null;
  const local = () => {
    channel?.postMessage("changed");
    callback();
  };
  window.addEventListener(CHANGE_EVENT, local);
  channel?.addEventListener("message", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, local);
    channel?.close();
  };
}

/** Link que abre o analytics em outro aparelho e importa a chave para o navegador de lá. */
export function accessUrl(origin: string, link: Pick<LocalLink, "slug" | "token">): string {
  // A chave vai no fragmento (#): o navegador nunca envia essa parte da URL para o servidor.
  return `${origin}/links/${encodeURIComponent(link.slug)}#chave=${encodeURIComponent(link.token)}`;
}

export function shortUrlFor(slug: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || window.location.origin;
  return `${base}/${slug}`;
}
