'use client';
import { supabase } from '@/lib/supabase/client';

export type Surprise = {
  name: string;
  role: string;
  when: string;
  ig: string | null;
  /** URL assinada (expira). null quando não há imagem ou o usuário não pode ver. */
  photo: string | null;
  stage: string | null;
};

/**
 * Conteúdo da Surpresa. NÃO pode morar no bundle: o repo é público e o JS vai inteiro para o
 * cliente. Vem da tabela `surprise` e do bucket privado `surprise`, ambos com RLS que só libera
 * quem tem linha em rsvps (migration 20261117120000_surprise.sql). Sem permissão, o select volta
 * vazio e caímos no placeholder neutro.
 */
const PLACEHOLDER: Surprise = { name: 'Atração surpresa', role: 'Música ao vivo', when: 'Horário a confirmar', ig: null, photo: null, stage: null };
const TTL = 60 * 60; // 1 h: a imagem já fica decodificada na página depois do primeiro load

// Um fetch por usuário por carregamento de página (abrir/apagar o holofote não refaz a chamada).
const cache = new Map<string, Promise<Surprise>>();

export async function loadSurprise(): Promise<Surprise> {
  const sb = supabase();
  const { data: s } = await sb.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return PLACEHOLDER;
  let p = cache.get(uid);
  if (!p) {
    p = fetchSurprise().catch(() => PLACEHOLDER);
    cache.set(uid, p);
    // falha não fica presa no cache: na próxima abertura tenta de novo
    p.then((r) => r === PLACEHOLDER && cache.delete(uid));
  }
  return p;
}

async function fetchSurprise(): Promise<Surprise> {
  const sb = supabase();
  const { data, error } = await sb.from('surprise').select('name, role, when_text, ig, photo_path, stage_path').eq('id', 1).maybeSingle();
  if (error || !data) return PLACEHOLDER;

  const paths = [data.photo_path, data.stage_path].filter((x): x is string => !!x);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await sb.storage.from('surprise').createSignedUrls(paths, TTL);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return {
    name: data.name,
    role: data.role,
    when: data.when_text,
    ig: data.ig,
    photo: data.photo_path ? urls.get(data.photo_path) ?? null : null,
    stage: data.stage_path ? urls.get(data.stage_path) ?? null : null,
  };
}

/** Resolve quando a imagem terminou de baixar e decodificar (ou falhou): evita a foto "pipocar". */
export function preload(src: string | null): Promise<boolean> {
  if (!src) return Promise.resolve(false);
  return new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => (im.decode ? im.decode().then(() => res(true), () => res(true)) : res(true));
    im.onerror = () => res(false);
    im.src = src;
  });
}
