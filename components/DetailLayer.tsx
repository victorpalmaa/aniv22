'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ART, BY, type Item } from '@/lib/content';
import { clamp, io, reduceMotion } from '@/lib/motion';
import { leaveItem, openItem, takeLastTrigger } from '@/lib/detail';
import { getJSON, setJSON } from '@/lib/storage';

const idFromHash = () => {
  const h = decodeURIComponent(window.location.hash.slice(1));
  return BY[h] ? h : null;
};

/** Fatias empilhadas em Z dão volume ao 360°. No site real, a mesma interação troca fotos em giro. */
function slices(svg: string) {
  const N = 9, T = 2.6;
  return Array.from({ length: N }, (_, k) => {
    const z = ((k - (N - 1) / 2) * T).toFixed(1);
    const cls = k === N - 1 ? 'slice f' : k === 0 ? 'slice b' : 'slice m';
    const br = k === N - 1 ? 1 : k === 0 ? 0.78 : 0.38 + 0.04 * k;
    return `<div class="${cls}" style="--z:${z}px; --br:${br}">${svg}</div>`;
  }).join('');
}

/**
 * Camada de detalhe por cima da página (não é página nova). Abre por hash, fecha devolvendo
 * o scroll ao mesmo ponto, morph do item via View Transitions com fallback sem animação.
 */
export function DetailLayer() {
  const [id, setId] = useState<string | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<string | null>(null);

  useEffect(() => {
    if (getJSON('session', 'seen', false)) document.body.classList.add('seen');
  }, []);

  const heroOf = (scope: ParentNode | null) => (scope ? { art: scope.querySelector<HTMLElement>('.d-art, .art'), title: scope.querySelector<HTMLElement>('.d-title, .name') } : null);

  const sync = useCallback((animate: boolean) => {
    const next = idFromHash();
    const prev = openRef.current;
    if (next === prev) return;
    const named: HTMLElement[] = [];
    const name = (h: ReturnType<typeof heroOf>) => {
      if (!h) return;
      if (h.art) (h.art.style.viewTransitionName = 'hero-art'), named.push(h.art);
      if (h.title) (h.title.style.viewTransitionName = 'hero-title'), named.push(h.title);
    };
    const clear = () => named.splice(0).forEach((el) => (el.style.viewTransitionName = ''));
    const listEl = (itemId: string) => document.querySelector<HTMLElement>(`[data-id="${itemId}"][data-front]`) ?? document.querySelector<HTMLElement>(`.dish[data-id="${itemId}"]`);
    const update = () => {
      clear();
      openRef.current = next;
      flushSync(() => setId(next));
      // depois do update, nomeia o lado de chegada
      name(next ? heroOf(layerRef.current) : prev ? heroOf(listEl(prev)) : null);
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> } };
    if (animate && !reduceMotion() && doc.startViewTransition) {
      name(!prev && next ? heroOf(listEl(next)) : prev && !next ? heroOf(layerRef.current) : null);
      const t = doc.startViewTransition(update);
      // transições concorrentes (fechar dispara hashchange) rejeitam com "skipped": engole
      t.ready.catch(() => {});
      t.updateCallbackDone.catch(() => {});
      t.finished.catch(() => {}).finally(clear);
    } else {
      update();
      clear();
    }
  }, []);

  useEffect(() => {
    sync(false);
    const onHash = () => sync(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [sync]);

  // efeitos de abrir/fechar: trava a rolagem de trás, foco, "seen"
  useEffect(() => {
    if (!id) {
      document.documentElement.classList.remove('lock');
      takeLastTrigger()?.focus({ preventScroll: true });
      return;
    }
    document.documentElement.classList.add('lock');
    if (!document.body.classList.contains('seen')) {
      document.body.classList.add('seen');
      setJSON('session', 'seen', true);
    }
    layerRef.current!.scrollTop = 0;
    layerRef.current!.querySelector<HTMLElement>('.d-title')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.sheet') && leaveItem();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id]);

  const it = id ? BY[id] : null;
  return (
    <div
      className={`detail-layer${it?.color ? ' drink-mode' : ''}`}
      ref={layerRef}
      role="dialog"
      aria-modal="true"
      aria-label={it ? it.name : 'Detalhe do item'}
      hidden={!it}
      style={{ ['--dc' as string]: it?.color ?? 'transparent' }}
    >
      {it && <Detail key={it.id} it={it} />}
    </div>
  );
}

function Detail({ it }: { it: Item }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef<(ty: number, tx: number, dur: number) => void>(() => {});
  const st = useRef({ rx: -8, ry: -24 });

  // 360°: arrastar gira por completo (Y livre, X até 65°), com inércia; tudo em ref
  useEffect(() => {
    const wrap = wrapRef.current!;
    const s = st.current;
    let raf = 0, vx = 0, vy = 0, held = false, lx = 0, ly = 0;
    let auto: { fy: number; ty: number; fx: number; tx: number; t0: number; dur: number } | null = null;

    function frame(now: number) {
      if (auto) {
        const t = clamp((now - auto.t0) / auto.dur, 0, 1), e = io(t);
        s.ry = auto.fy + (auto.ty - auto.fy) * e;
        s.rx = auto.fx + (auto.tx - auto.fx) * e;
        if (t >= 1) auto = null;
      } else if (!held) {
        s.ry += vy;
        s.rx = clamp(s.rx + vx, -65, 65);
        vy *= 0.95;
        vx *= 0.9;
      }
      spinRef.current!.style.transform = `rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`;
      const rad = (s.ry * Math.PI) / 180;
      glowRef.current!.style.transform = `translateX(${(Math.sin(rad) * 18).toFixed(1)}px)`;
      shadowRef.current!.style.transform = `translateX(-50%) scaleX(${(0.55 + 0.45 * Math.abs(Math.cos(rad))).toFixed(3)})`;
      const moving = held || auto || Math.abs(vy) > 0.02 || Math.abs(vx) > 0.02;
      raf = moving ? requestAnimationFrame(frame) : 0;
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const turnTo = (ty: number, tx: number, dur: number) => {
      auto = { fy: s.ry, ty, fx: s.rx, tx, t0: performance.now(), dur: reduceMotion() ? 1 : dur };
      vx = vy = 0;
      kick();
    };
    turnRef.current = turnTo;

    const down = (e: PointerEvent) => {
      held = true;
      auto = null;
      lx = e.clientX;
      ly = e.clientY;
      wrap.setPointerCapture?.(e.pointerId);
      wrap.classList.add('grab');
      kick();
    };
    const move = (e: PointerEvent) => {
      if (!held) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      s.ry += dx * 0.55;
      s.rx = clamp(s.rx - dy * 0.4, -65, 65);
      vy = dx * 0.55;
      vx = -dy * 0.4;
    };
    const up = () => {
      held = false;
      wrap.classList.remove('grab');
      kick();
    };
    const key = (e: KeyboardEvent) => {
      const k = ({ ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, 15], ArrowDown: [0, -15] } as Record<string, number[]>)[e.key];
      if (k) {
        e.preventDefault();
        turnTo(s.ry + k[0], clamp(s.rx + k[1], -65, 65), 350);
      }
    };
    wrap.addEventListener('pointerdown', down);
    wrap.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => wrap.addEventListener(ev, up));
    wrap.addEventListener('keydown', key);
    if (!reduceMotion()) turnTo(0, -8, 900); // entra girando de leve para mostrar que é 3D
    else kick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      wrap.removeEventListener('pointerdown', down);
      wrap.removeEventListener('pointermove', move);
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => wrap.removeEventListener(ev, up));
      wrap.removeEventListener('keydown', key);
    };
  }, []);

  return (
    <>
      <div className="d-top">
        <button className="back" type="button" onClick={leaveItem}>
          <span aria-hidden="true">←</span> {it.color ? 'Voltar ao bar' : 'Voltar à mesa'}
        </button>
        <span className="chip-prov">{it.cat} · provisório</span>
      </div>
      <div className="d-grid">
        <div className="stage">
          <div className="glow" ref={glowRef} />
          <div className="spin-wrap d-art" ref={wrapRef} tabIndex={0} role="img" aria-label={`${it.name} em 360 graus. Arraste ou use as setas para girar`}>
            <div className="spin" ref={spinRef} dangerouslySetInnerHTML={{ __html: slices(ART[it.id]) }} />
            <div className={`fx fx-${it.fx}`} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="spin-shadow" ref={shadowRef} aria-hidden="true" />
          <div className="spin-ctrl">
            <button className="ghost sm" type="button" onClick={() => turnRef.current(st.current.ry + 360, -8, 2400)}>
              ↻ Girar 360°
            </button>
            <button className="ghost sm" type="button" onClick={() => turnRef.current(Math.round(st.current.ry / 360) * 360, -8, 700)}>
              Ver de frente
            </button>
          </div>
          <p className="drag-hint">Arraste em qualquer direção para ver todos os lados</p>
        </div>
        <div className="d-body">
          <p className="eyebrow">{it.eyebrow}</p>
          <h2 className="d-title" tabIndex={-1}>
            {it.name}
          </h2>
          <p className="d-desc">{it.desc}</p>
          <dl className="specs">
            {it.specs.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="take">
            <b>Take do item.</b> Aqui entram as fotos em giro (24 a 36 quadros) no lugar da ilustração.
          </p>
          <p className="h3">Vai bem com</p>
          <div className="pairs">
            {it.pairs.map((p) => (
              <button key={p} className="pair" type="button" onClick={() => openItem(p)}>
                <span className="mini" dangerouslySetInnerHTML={{ __html: ART[p] }} />
                {BY[p].name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
