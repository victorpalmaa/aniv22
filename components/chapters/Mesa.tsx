'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useSettledIndex } from '@/hooks/useSettledIndex';
import { useSwipe, useTouchMode } from '@/hooks/useSwipe';
import { ITEMS } from '@/lib/content';
import { ItemArt } from '../ItemArt';
import { useMotionPrefs } from '../providers/MotionPrefs';
import { absTop, onScroll, vp } from '@/lib/scroll';
import { clamp, reduceMotion } from '@/lib/motion';
import { openItem } from '@/lib/detail';
import { Ride } from '../Ride';

const SLOTS = ITEMS.length;

/** 3 · Mesa: só comidas. Scroll horizontal preso na tela, mesa deitada em perspectiva. */
export function Mesa() {
  const hsRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const geo = useRef({ max: 0, top: 0, w: 0, slot: 0, pad: 0 });
  // prato do centro: único com WebGL, e só depois que a rolagem para (useSettledIndex)
  const frontRef = useRef(-1);
  const front = useSettledIndex(frontRef);
  const { detail } = useMotionPrefs();
  // celular/tablet: arrastar para o lado navega; rolar para baixo sai da seção (sem prender a tela)
  const touch = useTouchMode();
  const touchRef = useRef(false);
  touchRef.current = touch;
  const renderRef = useRef<(p: number) => void>(() => {});
  const swipe = useSwipe(stickyRef, {
    enabled: touch,
    steps: SLOTS,
    pxPerStep: () => geo.current.slot * 0.9,
    onP: (p) => renderRef.current(p),
  });

  useEffect(() => {
    const hs = hsRef.current!, sticky = stickyRef.current!, track = trackRef.current!;
    let dishes: HTMLElement[] = [];
    let top = 0;

    // medição: só no load e no resize
    function measure() {
      const vw = sticky.clientWidth;
      if (!vw) return;
      const slot = Math.round(Math.min(Math.max(vw * 0.62, 230), 380));
      const pad = Math.round((vw - slot) / 2); // primeiro e último item terminam centralizados
      const tw = pad * 2 + slot * SLOTS;
      track.style.setProperty('--slot', slot + 'px');
      track.style.setProperty('--pad', pad + 'px');
      track.style.setProperty('--tw', tw + 'px');
      const max = Math.max(0, tw - vw);
      const h = sticky.offsetHeight + (touchRef.current ? 0 : max) + 'px';
      if (hs.style.height !== h) hs.style.height = h;
      top = absTop(hs);
      geo.current = { max, top: vp.hh, w: vw, slot, pad };
      dishes = [...track.querySelectorAll<HTMLElement>('.dish')];
    }

    // frame (desktop): progresso vem da rolagem vertical
    function frame() {
      const g = geo.current;
      if (touchRef.current) return;
      if (top + g.max + vp.vh < vp.y || top > vp.y + vp.vh) return;
      render(g.max ? clamp((vp.y + vp.hh - top) / g.max, 0, 1) : 0);
    }

    // desenha a mesa para um progresso p (0..1); no celular p vem do arraste e pode passar um pouco das bordas
    function render(p: number) {
      const g = geo.current;
      if (!dishes.length) return;
      track.style.transform = `translate3d(${(-p * g.max).toFixed(1)}px,0,0)`;
      barRef.current!.style.transform = `scaleX(${clamp(p, 0, 1).toFixed(4)})`;
      hintRef.current!.style.opacity = p > 0.04 ? '0' : '1';
      // cada prato reage à distância do centro: no meio sobe e encara, nas bordas gira e afunda
      const sx = p * g.max, half = g.w / 2, flat = reduceMotion();
      let best = -1, bestA = 0.5; // só conta como "em foco" perto do centro
      dishes.forEach((el, i) => {
        const d = clamp((g.pad + g.slot * (i + 0.5) - sx - half) / half, -1.6, 1.6), a = Math.abs(d);
        if (a < bestA) (bestA = a), (best = i);
        el.style.transform = flat
          ? 'translate(-50%,-50%)'
          : `translate(-50%,-50%) translateZ(${(46 - a * 90).toFixed(1)}px) rotateY(${(-d * 20).toFixed(1)}deg) rotateX(${(a * 3).toFixed(1)}deg)`;
        el.style.opacity = (1 - Math.max(0, a - 0.55) * 0.6).toFixed(2);
      });
      frontRef.current = best;
    }
    renderRef.current = render;

    const off = onScroll(frame, () => {
      measure();
      if (touchRef.current) render(swipe.progress());
    });
    // trackpad com rolagem lateral também anda na mesa
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        window.scrollBy(0, e.deltaX);
      }
    };
    sticky.addEventListener('wheel', onWheel, { passive: false });
    return () => (off(), sticky.removeEventListener('wheel', onWheel));
  }, [touch]); // eslint-disable-line react-hooks/exhaustive-deps

  // teclado: ao focar um item fora da tela, rola até ele
  function onFocus(e: React.FocusEvent) {
    const el = (e.target as HTMLElement).closest('.dish');
    const g = geo.current;
    if (!el || !g.max) return;
    const i = [...trackRef.current!.querySelectorAll('.dish')].indexOf(el);
    if (touch) return swipe.goTo(i);
    const absTop = hsRef.current!.getBoundingClientRect().top + window.scrollY - g.top;
    window.scrollTo({ top: absTop + Math.min(g.max, Math.max(0, g.slot * i)), behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  return (
    <>
      <div className="anchor" id="mesa" />
      <section className="chapter mesa-ch bleed" id="mesaCh">
        <div className={`hs${touch ? ' swipe' : ''}`} ref={hsRef}>
          <div className="hs-sticky" ref={stickyRef}>
            <Ride word="MESA" bg="var(--bg-2)" color="var(--gold)" />
            <div className="hs-stage">
              <div className="hs-track" ref={trackRef} role="list" aria-label="Itens da mesa. Toque em um item para ver os detalhes" onFocus={onFocus}>
                <div className="hs-plane">
                  <div className="hs-table" />
                  {Array.from({ length: SLOTS }, (_, i) => (
                    <span key={i} className="pool" style={{ left: `calc(var(--pad) + var(--slot) * ${i + 0.5})` }} />
                  ))}
                </div>
                {ITEMS.map((it, i) => (
                  <button
                    key={it.id}
                    className="dish item-btn"
                    role="listitem"
                    type="button"
                    data-id={it.id}
                    aria-label={`${it.name}, ver detalhes`}
                    style={{ '--x': `calc(var(--pad) + var(--slot) * ${i + 0.5})`, '--y': `${i % 2 ? 50 : 44}%`, '--d': `${(i * 0.35).toFixed(2)}s` } as CSSProperties}
                    onClick={(e) => openItem(it.id, e.currentTarget)}
                  >
                    <ItemArt it={it} className="art" active={i === front && !detail} />
                    <span className="name">{it.name}</span>
                    <span className="cat">{it.cat}</span>
                  </button>
                ))}
              </div>
              <div className="hs-ui" aria-hidden="true">
                <span className="hs-hint" ref={hintRef}>
                  {touch ? (
                    <>
                      Arraste para o lado <span>↔</span>
                    </>
                  ) : (
                    <>
                      Role para percorrer a mesa <span>↓</span>
                    </>
                  )}
                </span>
                <i>
                  <b ref={barRef} />
                </i>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
