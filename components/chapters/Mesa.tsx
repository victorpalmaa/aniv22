'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { ART, CLOCHE, ITEMS } from '@/lib/content';
import { onFrame } from '@/lib/scroll';
import { clamp, jump, reduceMotion, topH } from '@/lib/motion';
import { openItem } from '@/lib/detail';
import { Ride } from '../Ride';

const SLOTS = ITEMS.length + 1; // pratos + cloche "E tem mais…"

/** 3 · Mesa: só comidas. Scroll horizontal preso na tela, mesa deitada em perspectiva. */
export function Mesa() {
  const hsRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const geo = useRef({ max: 0, top: 0, w: 0, slot: 0, pad: 0 });

  useEffect(() => {
    const hs = hsRef.current!, sticky = stickyRef.current!, track = trackRef.current!;
    const dishes = () => [...track.querySelectorAll<HTMLElement>('.dish')];

    function layout() {
      const hh = topH();
      const vw = sticky.clientWidth;
      if (!vw) return;
      const slot = Math.round(Math.min(Math.max(vw * 0.62, 230), 380));
      const pad = Math.round((vw - slot) / 2); // primeiro e último item terminam centralizados
      const tw = pad * 2 + slot * SLOTS;
      track.style.setProperty('--slot', slot + 'px');
      track.style.setProperty('--pad', pad + 'px');
      track.style.setProperty('--tw', tw + 'px');
      const max = Math.max(0, tw - vw);
      hs.style.height = sticky.offsetHeight + max + 'px';
      geo.current = { max, top: hh, w: vw, slot, pad };
    }

    function update() {
      const g = geo.current;
      if (Math.abs(sticky.clientWidth - g.w) > 1) layout();
      const r = hs.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const p = g.max ? clamp((g.top - r.top) / g.max, 0, 1) : 0;
      track.style.transform = `translate3d(${(-p * g.max).toFixed(1)}px,0,0)`;
      barRef.current!.style.width = (p * 100).toFixed(1) + '%';
      hintRef.current!.style.opacity = p > 0.04 ? '0' : '1';
      // cada prato reage à distância do centro: no meio sobe e encara, nas bordas gira e afunda
      const sx = p * g.max, half = g.w / 2, flat = reduceMotion();
      dishes().forEach((el, i) => {
        const d = clamp((g.pad + g.slot * (i + 0.5) - sx - half) / half, -1.6, 1.6), a = Math.abs(d);
        el.style.transform = flat
          ? 'translate(-50%,-50%)'
          : `translate(-50%,-50%) translateZ(${(70 - a * 130).toFixed(1)}px) rotateY(${(-d * 32).toFixed(1)}deg) rotateX(${(a * 6).toFixed(1)}deg)`;
        el.style.opacity = (1 - Math.max(0, a - 0.55) * 0.75).toFixed(2);
      });
    }

    layout();
    const off = onFrame(update);
    // trackpad com rolagem lateral também anda na mesa
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        window.scrollBy(0, e.deltaX);
      }
    };
    sticky.addEventListener('wheel', onWheel, { passive: false });
    return () => (off(), sticky.removeEventListener('wheel', onWheel));
  }, []);

  // teclado: ao focar um item fora da tela, rola até ele
  function onFocus(e: React.FocusEvent) {
    const el = (e.target as HTMLElement).closest('.dish');
    const g = geo.current;
    if (!el || !g.max) return;
    const i = [...trackRef.current!.querySelectorAll('.dish')].indexOf(el);
    const absTop = hsRef.current!.getBoundingClientRect().top + window.scrollY - g.top;
    window.scrollTo({ top: absTop + Math.min(g.max, Math.max(0, g.slot * i)), behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  return (
    <>
      <div className="anchor" id="mesa" />
      <section className="chapter mesa-ch bleed" id="mesaCh">
        <div className="hs" ref={hsRef}>
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
                    <span className="art" dangerouslySetInnerHTML={{ __html: ART[it.id] }} />
                    <span className="name">{it.name}</span>
                    <span className="cat">{it.cat}</span>
                  </button>
                ))}
                <a
                  className="dish cloche"
                  role="listitem"
                  href="#surpresa"
                  aria-label="E tem mais uma coisa: ir para a Surpresa"
                  style={{ '--x': `calc(var(--pad) + var(--slot) * ${ITEMS.length + 0.5})`, '--y': '50%' } as CSSProperties}
                  onClick={(e) => (e.preventDefault(), jump('surpresa'))}
                >
                  <span className="art" dangerouslySetInnerHTML={{ __html: CLOCHE }} />
                  <span className="name">E tem mais…</span>
                  <span className="cat">Surpresa</span>
                </a>
              </div>
              <div className="hs-ui" aria-hidden="true">
                <span className="hs-hint" ref={hintRef}>
                  Role para percorrer a mesa <span>↓</span>
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
