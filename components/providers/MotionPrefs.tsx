'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BY } from '@/lib/content';
import { getJSON, setJSON } from '@/lib/storage';

type Prefs = {
  /** "Pausar animações": controle do usuário, visível na barra do topo. Não segue prefers-reduced-motion. */
  paused: boolean;
  togglePaused: () => void;
  /** Item aberto na camada de detalhe (hash). Com ele aberto, Mesa e Bar soltam o WebGL. */
  detail: string | null;
};

const Ctx = createContext<Prefs>({ paused: false, togglePaused: () => {}, detail: null });
const KEY = 'anim_paused';

export function MotionPrefs({ children }: { children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  // storage só no cliente (SSR renderiza sem pausa)
  useEffect(() => setPaused(!!getJSON('local', KEY, false)), []);

  useEffect(() => {
    const read = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      setDetail(BY[h] ? h : null);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const togglePaused = useCallback(() => {
    setPaused((p) => !p);
  }, []);
  useEffect(() => setJSON('local', KEY, paused), [paused]);

  const value = useMemo(() => ({ paused, togglePaused, detail }), [paused, togglePaused, detail]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMotionPrefs = () => useContext(Ctx);
