// Todo acesso a storage passa por aqui: Safari privado e alguns in-app browsers lançam exceção.
type Kind = 'local' | 'session';

function raw(kind: Kind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getJSON<T>(kind: Kind, key: string, fallback: T): T {
  try {
    const v = raw(kind)?.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function setJSON(kind: Kind, key: string, value: unknown): void {
  try {
    raw(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    /* sem storage: segue em memória */
  }
}

export function del(kind: Kind, key: string): void {
  try {
    raw(kind)?.removeItem(key);
  } catch {
    /* idem */
  }
}

/** Adaptador no formato que o supabase-js espera, com fallback em memória. */
export function safeStorage(kind: Kind) {
  const mem = new Map<string, string>();
  return {
    getItem(k: string) {
      try {
        const s = raw(kind);
        return s ? s.getItem(k) : mem.get(k) ?? null;
      } catch {
        return mem.get(k) ?? null;
      }
    },
    setItem(k: string, v: string) {
      try {
        const s = raw(kind);
        if (s) s.setItem(k, v);
        else mem.set(k, v);
      } catch {
        mem.set(k, v);
      }
    },
    removeItem(k: string) {
      try {
        raw(kind)?.removeItem(k);
      } catch {
        /* nada */
      }
      mem.delete(k);
    },
  };
}
