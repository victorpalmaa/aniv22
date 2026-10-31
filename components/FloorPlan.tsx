'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParty } from './providers/PartyProvider';
import { AREAS, AREAS_IN } from '@/lib/party';
import { clamp, reduceMotion } from '@/lib/motion';
import { getJSON, setJSON } from '@/lib/storage';

type Rect = { x: number; y: number; w: number; h: number };
type Layout = { w: number; h: number; door: { x: number; y: number }; areas: Rect[] };
type G = {
  id: string; name: string; area: number; me?: boolean;
  x: number; y: number; vx: number; vy: number;
  fly?: { t: number; sx: number; sy: number; tx: number; ty: number } | null;
  el?: SVGGElement | null;
};
type Desired = { id: string; name: string; area: number; me?: boolean };

// ids batem com a tabela areas (0 Bar, 1 Salão, 2 Pista). No celular a planta é desenhada na vertical.
const LAYOUTS: Record<'land' | 'port', Layout> = {
  land: { w: 640, h: 400, door: { x: 20, y: 290 }, areas: [{ x: 20, y: 20, w: 360, h: 130 }, { x: 20, y: 160, w: 360, h: 220 }, { x: 390, y: 20, w: 230, h: 360 }] },
  port: { w: 400, h: 600, door: { x: 270, y: 20 }, areas: [{ x: 20, y: 20, w: 130, h: 360 }, { x: 160, y: 20, w: 220, h: 360 }, { x: 20, y: 390, w: 360, h: 190 }] },
};
const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number> = {}, parent?: Element) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  parent?.appendChild(n);
  return n;
};

export function FloorPlan() {
  const { me, pins, counts, setRoom, openSheet, toast } = useParty();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [choosing, setChoosing] = useState(false);
  const [agit, setAgit] = useState(50);
  const sim = useRef({
    L: LAYOUTS.land, guests: new Map<string, G>(), radius: [10, 10, 10], agit: 0.5,
    gLayer: null as SVGGElement | null, tip: null as SVGGElement | null, areaEls: [] as { g: SVGGElement; c: SVGTextElement }[],
    pinned: null as string | null, raf: 0, last: 0, seeded: false, visible: false,
  });
  // place/paint vivem dentro do efeito de construção; o efeito de dados chama por aqui
  const api = useRef<{ place: (g: G, from?: { x: number; y: number } | null) => void; paint: () => void } | null>(null);

  // quem aparece: confirmado vê nomes; não confirmado vê N círculos anônimos por área
  const desired: Desired[] = useMemo(() => {
    if (me)
      return pins
        .filter((p) => p.room != null)
        .map((p) => ({ id: p.user_id, name: p.user_id === me.id ? `${me.first} ${me.last}` : p.display_name, area: p.room!, me: p.user_id === me.id }));
    return counts.flatMap((c) => (c.area == null ? [] : Array.from({ length: c.total }, (_, k) => ({ id: `anon-${c.area}-${k}`, name: '', area: c.area! }))));
  }, [me, pins, counts]);

  const total = me ? pins.length : counts.reduce((s, c) => s + c.total, 0);
  const isChoosing = !!me && (choosing || me.room == null);

  // Preferência do sistema só define o valor inicial do slider; quem manda depois é o convidado
  useEffect(() => {
    const v = getJSON<number>('local', 'agit', reduceMotion() ? 0 : 50);
    setAgit(v);
    sim.current.agit = v / 100;
  }, []);

  // "Mudar de lugar" vindo do sheet
  useEffect(() => {
    const on = () => setChoosing(true);
    window.addEventListener('plan:choose', on);
    return () => window.removeEventListener('plan:choose', on);
  }, []);

  // --------- construção do SVG e loop de física (imperativo, fora do React) ---------
  useEffect(() => {
    const svg = svgRef.current!;
    const S = sim.current;
    const mq = window.matchMedia('(max-width:640px)');

    function place(g: G, from?: { x: number; y: number } | null) {
      const a = S.L.areas[g.area], p = 18;
      const tx = a.x + p + Math.random() * (a.w - 2 * p), ty = a.y + p + Math.random() * (a.h - 2 * p);
      if (from) {
        g.x = from.x; g.y = from.y;
        g.fly = { t: 0, sx: from.x, sy: from.y, tx, ty };
      } else {
        g.x = tx; g.y = ty; g.fly = null;
      }
      g.vx = g.vy = 0;
    }

    function build() {
      S.L = mq.matches ? LAYOUTS.port : LAYOUTS.land;
      const L = S.L;
      svg.setAttribute('viewBox', `0 0 ${L.w} ${L.h}`);
      svg.innerHTML = '';
      const defs = el('defs', {}, svg);
      const pat = el('pattern', { id: 'wood', width: 12, height: 12, patternUnits: 'userSpaceOnUse' }, defs);
      el('rect', { width: 12, height: 12, fill: 'var(--floor-pista)' }, pat);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 12, stroke: 'var(--wood)', 'stroke-width': 1.5, opacity: 0.6 }, pat);
      el('rect', { x: 0, y: 0, width: L.w, height: L.h, fill: 'var(--bg-2)' }, svg);
      const fills = ['var(--floor-bar)', 'var(--floor-salao)', 'url(#wood)'];
      const deco = el('g', {}, svg);
      L.areas.forEach((a, i) => el('rect', { x: a.x, y: a.y, width: a.w, height: a.h, rx: 10, fill: fills[i], stroke: 'var(--line)' }, deco));
      // bar: balcão + 7 banquetas
      const b = L.areas[0], horiz = b.w > b.h;
      if (horiz) {
        el('rect', { x: b.x + 10, y: b.y + 10, width: b.w - 20, height: 14, rx: 4, fill: 'var(--wood)' }, deco);
        for (let i = 0; i < 7; i++) el('circle', { cx: b.x + 30 + i * ((b.w - 60) / 6), cy: b.y + 36, r: 6, fill: 'var(--line)' }, deco);
      } else {
        el('rect', { x: b.x + 10, y: b.y + 10, width: 14, height: b.h - 20, rx: 4, fill: 'var(--wood)' }, deco);
        for (let i = 0; i < 7; i++) el('circle', { cx: b.x + 36, cy: b.y + 30 + i * ((b.h - 60) / 6), r: 6, fill: 'var(--line)' }, deco);
      }
      // salão: 3 mesas
      const s = L.areas[1];
      [0.2, 0.5, 0.8].forEach((f) =>
        horiz
          ? el('rect', { x: s.x + s.w * f - 18, y: s.y + s.h - 26, width: 36, height: 16, rx: 3, fill: 'var(--bg-3)', stroke: 'var(--line)' }, deco)
          : el('rect', { x: s.x + s.w - 28, y: s.y + s.h * f - 18, width: 16, height: 36, rx: 3, fill: 'var(--bg-3)', stroke: 'var(--line)' }, deco),
      );
      // pista: luzes na parede
      const p = L.areas[2];
      for (let i = 0; i < 9; i++) {
        const c = horiz ? { cx: p.x + p.w - 8, cy: p.y + 20 + i * ((p.h - 40) / 8) } : { cx: p.x + 20 + i * ((p.w - 40) / 8), cy: p.y + p.h - 8 };
        el('circle', { r: 3, class: 'light', style: `animation-delay:${(i * 0.27).toFixed(2)}s`, ...c }, deco);
      }
      const d = L.door;
      el('rect', { x: d.x - (horiz ? 4 : 16), y: d.y - (horiz ? 16 : 4), width: horiz ? 8 : 32, height: horiz ? 32 : 8, fill: 'var(--gold)' }, deco);
      el('text', { class: 'cnt', x: d.x + (horiz ? 10 : 20), y: d.y + (horiz ? 4 : 16) }, deco).textContent = 'Entrada';
      // áreas clicáveis: hit test nativo do navegador, acessível por teclado e VoiceOver
      S.areaEls = L.areas.map((a, i) => {
        const g = el('g', { class: 'area', role: 'button', tabindex: 0, 'data-area': i }, svg) as SVGGElement;
        el('rect', { class: 'hit', x: a.x, y: a.y, width: a.w, height: a.h, rx: 10 }, g);
        el('rect', { class: 'ring', x: a.x + 2, y: a.y + 2, width: a.w - 4, height: a.h - 4, rx: 9 }, g);
        let lx = a.x + 12, ly = a.y + 24;
        if (i === 0 && horiz) ly = a.y + 66;
        if (i === 0 && !horiz) lx = a.x + 48;
        el('text', { class: 'lbl', x: lx, y: ly }, g).textContent = AREAS[i];
        const c = el('text', { class: 'cnt', x: lx, y: ly + 16 }, g) as SVGTextElement;
        return { g, c };
      });
      S.gLayer = el('g', {}, svg) as SVGGElement;
      S.tip = el('g', { class: 'tip', visibility: 'hidden', 'pointer-events': 'none' }, svg) as SVGGElement;
      el('rect', { rx: 6, height: 24 }, S.tip);
      el('text', { y: 16, x: 10 }, S.tip);
      S.guests.forEach((g) => {
        g.el = null;
        place(g);
      });
      S.pinned = null;
      paint();
    }

    function guestEl(g: G) {
      const n = el('g', { class: 'guest' + (g.me ? ' me' : ''), 'data-g': g.id, 'aria-hidden': 'true' }, S.gLayer!) as SVGGElement;
      el('circle', { r: S.radius[g.area] }, n);
      if (g.me) el('text', { class: 'you', y: S.radius[g.area] + 13 }, n).textContent = 'Você';
      return n;
    }

    /** sincroniza elementos e raios depois de mudança de dados */
    function paint() {
      const n = [0, 0, 0];
      S.guests.forEach((g) => n[g.area]++);
      // raio adaptado à lotação da área: o bar é pequeno
      S.radius = S.L.areas.map((a, i) => clamp(Math.sqrt((a.w * a.h) / (Math.max(1, n[i]) * 40)), 6, 10));
      S.areaEls.forEach(({ g, c }, i) => {
        c.textContent = `${n[i]} ${n[i] === 1 ? 'pessoa' : 'pessoas'}`;
        g.setAttribute('aria-label', `${AREAS[i]}, ${n[i]} ${n[i] === 1 ? 'pessoa' : 'pessoas'}`);
      });
      S.gLayer?.querySelectorAll<SVGGElement>('.guest').forEach((node) => {
        if (!S.guests.has(node.dataset.g!)) node.remove();
      });
      S.guests.forEach((g) => {
        if (!g.el || !g.el.isConnected) g.el = guestEl(g);
        g.el.querySelector('circle')!.setAttribute('r', S.radius[g.area].toFixed(1));
        g.el.classList.toggle('me', !!g.me);
        const you = g.el.querySelector('.you');
        if (g.me && !you) el('text', { class: 'you', y: S.radius[g.area] + 13 }, g.el).textContent = 'Você';
        if (!g.me && you) you.remove();
      });
      const mine = [...S.guests.values()].find((g) => g.me);
      if (mine?.el) S.gLayer!.appendChild(mine.el); // "Você" sempre por cima
    }

    function step(now: number) {
      const dt = Math.min(48, now - (S.last || now)) / 16.67;
      S.last = now;
      const list = [...S.guests.values()];
      for (const g of list) {
        if (g.fly) {
          g.fly.t = Math.min(1, g.fly.t + (dt * 16.67) / 950);
          const e = 1 - Math.pow(1 - g.fly.t, 3);
          g.x = g.fly.sx + (g.fly.tx - g.fly.sx) * e;
          g.y = g.fly.sy + (g.fly.ty - g.fly.sy) * e;
          if (g.fly.t >= 1) g.fly = null;
          continue;
        }
        const a = S.L.areas[g.area], R = S.radius[g.area], ag = S.agit;
        g.vx += (Math.random() - 0.5) * 0.22 * ag * dt;
        g.vy += (Math.random() - 0.5) * 0.22 * ag * dt;
        for (const h of list) {
          if (h === g || h.area !== g.area || h.fly) continue;
          const dx = g.x - h.x, dy = g.y - h.y, d2 = dx * dx + dy * dy, min = 2 * R + 3;
          if (d2 < min * min && d2 > 0.01) {
            const d = Math.sqrt(d2), f = ((min - d) / min) * 0.45;
            g.vx += (dx / d) * f;
            g.vy += (dy / d) * f;
          }
        }
        const p = R + 6;
        if (g.x < a.x + p) g.vx += 0.12;
        if (g.x > a.x + a.w - p) g.vx -= 0.12;
        if (g.y < a.y + p) g.vy += 0.12;
        if (g.y > a.y + a.h - p) g.vy -= 0.12;
        g.vx *= 0.92;
        g.vy *= 0.92;
        const max = 0.15 + 1.1 * ag, sp = Math.hypot(g.vx, g.vy);
        if (sp > max) {
          g.vx *= max / sp;
          g.vy *= max / sp;
        }
        g.x = clamp(g.x + g.vx * dt, a.x + R, a.x + a.w - R);
        g.y = clamp(g.y + g.vy * dt, a.y + R, a.y + a.h - R);
      }
      // transform no <g>, nunca cx/cy: vai para composição em vez de recalcular geometria
      for (const g of list) g.el?.setAttribute('transform', `translate(${g.x.toFixed(1)} ${g.y.toFixed(1)})`);
      if (S.pinned && S.tip) {
        const g = S.guests.get(S.pinned);
        if (g) {
          const t = S.tip.querySelector('text') as SVGTextElement, w = t.getComputedTextLength() + 20, R = S.radius[g.area];
          const tx = clamp(g.x - w / 2, 4, S.L.w - w - 4);
          let ty = g.y - R - 32;
          if (ty < 4) ty = g.y + R + 8;
          S.tip.querySelector('rect')!.setAttribute('width', w.toFixed(0));
          S.tip.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)})`);
        }
      }
      S.raf = requestAnimationFrame(step);
    }
    const start = () => {
      if (!S.raf && !document.hidden) {
        S.last = 0;
        S.raf = requestAnimationFrame(step);
      }
    };
    const stop = () => {
      if (S.raf) cancelAnimationFrame(S.raf);
      S.raf = 0;
    };

    build();
    api.current = { place, paint };

    // só anima quando está na tela (economiza bateria) e com a aba visível
    const obs = new IntersectionObserver(([en]) => ((S.visible = en.isIntersecting), en.isIntersecting ? start() : stop()), { rootMargin: '100px 0px' });
    obs.observe(wrapRef.current!);
    const onVis = () => (document.hidden ? stop() : S.visible && start());
    document.addEventListener('visibilitychange', onVis);
    const onMq = () => build();
    mq.addEventListener('change', onMq);
    return () => {
      stop();
      obs.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  // --------- dados → simulação ---------
  useEffect(() => {
    const S = sim.current, A = api.current;
    if (!A) return;
    const want = new Map(desired.map((d) => [d.id, d]));
    S.guests.forEach((g, id) => {
      if (!want.has(id)) S.guests.delete(id);
    });
    want.forEach((d) => {
      const g = S.guests.get(d.id);
      if (!g) {
        const ng: G = { ...d, x: 0, y: 0, vx: 0, vy: 0 };
        S.guests.set(d.id, ng);
        // carga inicial aparece já espalhada; quem chega depois voa da porta
        A.place(ng, S.seeded ? S.L.door : null);
      } else {
        g.name = d.name;
        g.me = d.me;
        if (g.area !== d.area) {
          g.area = d.area;
          A.place(g, { x: g.x, y: g.y }); // trocou de área: voa de onde está
        }
      }
    });
    if (desired.length || me || counts.length) S.seeded = true;
    A.paint();
  }, [desired, me, counts.length]);

  function hideTip() {
    const S = sim.current;
    S.pinned = null;
    S.tip?.setAttribute('visibility', 'hidden');
    svgRef.current?.querySelectorAll('.guest.pinned').forEach((n) => n.classList.remove('pinned'));
  }

  async function chooseArea(i: number) {
    if (!me) return toast('Confirme presença para escolher seu lugar.');
    if (me.room != null && !choosing) return;
    setChoosing(false);
    const err = await setRoom(i);
    toast(err ?? `Você está ${AREAS_IN[i]}`);
  }

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    const t = e.target as Element;
    const gEl = t.closest<SVGGElement>('.guest');
    const S = sim.current;
    if (gEl && me) {
      const id = gEl.dataset.g!;
      if (id === me.id) return setChoosing(true);
      const was = S.pinned === id;
      hideTip();
      if (was) return;
      S.pinned = id;
      gEl.classList.add('pinned');
      S.tip!.querySelector('text')!.textContent = S.guests.get(id)?.name ?? '';
      S.tip!.setAttribute('visibility', 'visible');
      return;
    }
    const a = t.closest<SVGGElement>('.area');
    if (a && me && (me.room == null || choosing)) return void chooseArea(Number(a.dataset.area));
    if (S.pinned) hideTip();
    if (a && !me) toast('Confirme presença para escolher seu lugar.');
  }

  function onKey(e: React.KeyboardEvent<SVGSVGElement>) {
    const a = (e.target as Element).closest('.area');
    if (a && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  }

  const rows = me
    ? pins
        .map((p) => ({ name: p.user_id === me.id ? `${me.first} ${me.last}` : p.display_name, me: p.user_id === me.id, area: p.room }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    : [];

  return (
    <>
      <div className={`plan-wrap${isChoosing ? ' choosing' : ''}`} ref={wrapRef}>
        <svg className={`plan${me ? '' : ' anon'}`} ref={svgRef} role="img" aria-label="Planta do restaurante com os convidados" onClick={onClick} onKeyDown={onKey} />
        {!me ? (
          <div className="plan-overlay">
            <span>Os nomes aparecem para quem confirmou.</span>
            <button className="btn-gold" type="button" onClick={() => openSheet()}>
              Confirmar presença
            </button>
          </div>
        ) : isChoosing ? (
          <div className="plan-overlay">
            <span>{choosing && me.room != null ? 'Toque na nova área' : 'Toque onde você quer ficar'}</span>
            {choosing && me.room != null && (
              <button className="ghost" type="button" onClick={() => setChoosing(false)}>
                Cancelar
              </button>
            )}
          </div>
        ) : null}
      </div>
      <div className="plan-ctrl">
        <div className="me-bar">
          {me && me.room != null && (
            <>
              <span>
                Você está {AREAS_IN[me.room].split(' ')[0]} <b>{AREAS[me.room]}</b>
              </span>
              <button className="ghost" type="button" onClick={() => setChoosing(true)}>
                Mudar de lugar
              </button>
            </>
          )}
        </div>
        <label htmlFor="agit">
          Agitação{' '}
          <input
            id="agit"
            type="range"
            min={0}
            max={100}
            step={1}
            value={agit}
            onChange={(e) => {
              const v = Number(e.target.value);
              setAgit(v);
              sim.current.agit = v / 100;
              setJSON('local', 'agit', v);
            }}
          />{' '}
          <span aria-hidden="true">{agit}</span>
        </label>
      </div>
      {me && (
        <details className="who">
          <summary>Ver lista de confirmados ({total})</summary>
          <ul>
            {rows.map((r, i) => (
              <li key={i}>
                {r.name}
                {r.me ? ' (você)' : ''} · {r.area != null ? AREAS[r.area] : 'escolhendo lugar'}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
