'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { GuestPin } from '@/lib/supabase/types';
import { del, getJSON } from '@/lib/storage';

export type Me = { id: string; first: string; last: string; email: string; room: number | null };
export type SheetView = 'form' | 'login' | 'code' | 'done' | 'welcome' | 'mine';
export type AreaCount = { area: number | null; total: number };

type Ctx = {
  ready: boolean;
  session: Session | null;
  me: Me | null;
  /** pins de todos os confirmados (só chega para quem confirmou, por RLS) */
  pins: GuestPin[];
  /** contagem anônima por área, para o preview de quem não confirmou */
  counts: AreaCount[];
  live: 'on' | 'off';
  lastArrival: string | null;
  refreshMe: () => Promise<Me | null>;
  setRoom: (area: number) => Promise<string | null>;
  cancel: () => Promise<string | null>;
  sheet: SheetView | null;
  openSheet: (v?: SheetView) => void;
  closeSheet: () => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
};

const PartyCtx = createContext<Ctx | null>(null);
export const useParty = () => {
  const c = useContext(PartyCtx);
  if (!c) throw new Error('useParty fora do PartyProvider');
  return c;
};

export function PartyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [pins, setPins] = useState<GuestPin[]>([]);
  const [counts, setCounts] = useState<AreaCount[]>([]);
  const [live, setLive] = useState<'on' | 'off'>('off');
  const [lastArrival, setLastArrival] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chan = useRef<RealtimeChannel | null>(null);
  const meRef = useRef<Me | null>(null);
  meRef.current = me;

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  /** "Confirmou" é ter linha em rsvps, não existir no Auth. */
  const refreshMe = useCallback(async (): Promise<Me | null> => {
    const sb = supabase();
    const { data: s } = await sb.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) {
      setMe(null);
      return null;
    }
    const { data: r } = await sb.from('rsvps').select('id, first_name, last_name, email').eq('id', uid).maybeSingle();
    if (!r) {
      setMe(null);
      return null;
    }
    const { data: pin } = await sb.from('guest_pins').select('room').eq('user_id', uid).maybeSingle();
    const next: Me = { id: r.id, first: r.first_name, last: r.last_name, email: r.email, room: pin?.room ?? null };
    setMe(next);
    return next;
  }, []);

  const loadCounts = useCallback(async () => {
    const { data } = await supabase().rpc('area_counts');
    if (data) setCounts(data);
  }, []);

  const loadPins = useCallback(async () => {
    const { data } = await supabase().from('guest_pins').select('*').order('created_at');
    if (data) setPins(data);
  }, []);

  // Realtime só em guest_pins (rsvps tem email; RLS não filtra coluna no payload).
  const subscribe = useCallback(() => {
    const sb = supabase();
    if (chan.current) sb.removeChannel(chan.current);
    chan.current = sb
      .channel('guest_pins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_pins' }, (p) => {
        if (p.eventType === 'INSERT') {
          const row = p.new as GuestPin;
          setPins((cur) => (cur.some((x) => x.user_id === row.user_id) ? cur : [...cur, row]));
          if (row.user_id !== meRef.current?.id) setLastArrival(row.display_name);
        } else if (p.eventType === 'UPDATE') {
          const row = p.new as GuestPin;
          setPins((cur) => (row.visible ? cur.map((x) => (x.user_id === row.user_id ? row : x)) : cur.filter((x) => x.user_id !== row.user_id)));
        } else if (p.eventType === 'DELETE') {
          // replica identity default: o DELETE só traz a PK
          const id = (p.old as Partial<GuestPin>).user_id;
          setPins((cur) => cur.filter((x) => x.user_id !== id));
        }
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED' ? 'on' : 'off'));
  }, []);

  const unsubscribe = useCallback(() => {
    if (chan.current) supabase().removeChannel(chan.current);
    chan.current = null;
    setLive('off');
  }, []);

  // sessão
  useEffect(() => {
    const sb = supabase();
    let alive = true;
    sb.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await refreshMe();
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // token novo precisa chegar ao socket, senão o RLS do Realtime usa o antigo
      if (s?.access_token) sb.realtime.setAuth(s.access_token);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshMe]);

  // dados conforme o estado: confirmado recebe pins + Realtime; os demais, só contagem
  useEffect(() => {
    if (!ready) return;
    if (me) {
      loadPins();
      subscribe();
    } else {
      unsubscribe();
      setPins([]);
      loadCounts();
    }
    return () => unsubscribe();
  }, [ready, me?.id, loadPins, subscribe, unsubscribe, loadCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // iOS mata o WebSocket em segundo plano: ao voltar, recarrega e reconecta
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        unsubscribe();
        return;
      }
      if (meRef.current) {
        loadPins();
        subscribe();
      } else loadCounts();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadPins, subscribe, unsubscribe, loadCounts]);

  const setRoom = useCallback(
    async (area: number) => {
      const { error } = await supabase().rpc('set_my_room', { p_area: area });
      if (error) return 'Não deu para salvar seu lugar. Tente de novo.';
      setMe((m) => (m ? { ...m, room: area } : m));
      setPins((cur) => cur.map((x) => (x.user_id === meRef.current?.id ? { ...x, room: area } : x)));
      return null;
    },
    [],
  );

  const cancel = useCallback(async () => {
    const id = meRef.current?.id;
    if (!id) return null;
    // policy rsvps_delete_own; o pin some por cascade
    const { error } = await supabase().from('rsvps').delete().eq('id', id);
    if (error) return 'Não deu para cancelar agora. Tente de novo.';
    del('local', 'surp_open');
    setMe(null);
    return null;
  }, []);

  const openSheet = useCallback((v?: SheetView) => {
    if (v) return setSheet(v);
    // retoma a etapa salva: o in-app do WhatsApp pode ter recarregado na volta do app de email
    const flow = getJSON<{ step?: string; mode?: string } | null>('session', 'flow', null);
    setSheet(meRef.current ? 'mine' : flow?.step === 'code' ? 'code' : flow?.mode === 'login' ? 'login' : 'form');
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const value = useMemo<Ctx>(
    () => ({ ready, session, me, pins, counts, live, lastArrival, refreshMe, setRoom, cancel, sheet, openSheet, closeSheet, toast, toastMsg }),
    [ready, session, me, pins, counts, live, lastArrival, refreshMe, setRoom, cancel, sheet, openSheet, closeSheet, toast, toastMsg],
  );
  return <PartyCtx.Provider value={value}>{children}</PartyCtx.Provider>;
}
