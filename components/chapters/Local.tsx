'use client';
import { useRef } from 'react';
import { riseProgress, useScene } from '@/hooks/useScene';
import { reduceMotion } from '@/lib/motion';
import { Ride } from '../Ride';

// TODO: coordenadas reais do restaurante. Enquanto não chegam, os botões ficam visíveis mas desabilitados.
const COORDS = null as { lat: number; lng: number } | null;
const LINKS = COORDS
  ? {
      waze: `https://waze.com/ul?ll=${COORDS.lat},${COORDS.lng}&navigate=yes`,
      apple: `https://maps.apple.com/?daddr=${COORDS.lat},${COORDS.lng}`,
      google: `https://www.google.com/maps/dir/?api=1&destination=${COORDS.lat},${COORDS.lng}`,
    }
  : null;

/** 9 · Local: último capítulo. Mapa ilustrativo que aproxima com o scroll; Waze como botão principal. */
export function Local() {
  const ref = useRef<HTMLDivElement>(null);
  const pinsSet = useRef(false);
  useScene(ref, (_p, el, g) => {
    const p = riseProgress(g);
    el.style.setProperty('--mz', reduceMotion() ? '1' : (1.15 - 0.15 * p).toFixed(4));
    if (p > 0.7 && !pinsSet.current) {
      pinsSet.current = true;
      el.classList.add('pins-in');
    }
  });

  const Btn = ({ href, cls, children }: { href?: string; cls: string; children: string }) =>
    href ? (
      <a className={cls} href={href} target="_blank" rel="noopener">
        {children}
      </a>
    ) : (
      <button className={cls} type="button" disabled title="O link entra quando o endereço chegar">
        {children}
      </button>
    );

  return (
    <>
      <div className="anchor" id="local" />
      <div className="stack-panel paper bleed" id="locPanel" ref={ref}>
        <Ride word="LOCAL" bg="var(--paper)" color="var(--wine)" />
        <h3 className="sr-only">Local da festa</h3>
        <div className="map-wrap">
          <div className="leaves light" aria-hidden="true" />
          <svg className="map" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa ilustrativo do local da festa">
            <rect width="800" height="560" fill="var(--paper)" />
            <path d="M0 470 C 180 430, 260 300, 420 280 S 700 210, 800 120" fill="none" stroke="var(--map-road)" strokeWidth="26" strokeLinecap="round" />
            <path d="M520 0 L 470 560" fill="none" stroke="var(--map-street)" strokeWidth="12" />
            <path d="M0 160 L 800 260" fill="none" stroke="var(--map-street)" strokeWidth="12" />
            <g stroke="var(--map-street)" strokeWidth="5" fill="none">
              <path d="M120 0 L 90 560" />
              <path d="M300 0 L 330 560" />
              <path d="M660 0 L 640 560" />
              <path d="M0 60 L 800 110" />
              <path d="M0 360 L 800 400" />
              <path d="M0 520 L 800 540" />
              <path d="M200 0 L 230 260" />
              <path d="M380 180 L 760 560" />
            </g>
            <path d="M560 300 h 150 v 120 h -150 z" fill="var(--map-park)" />
            <text className="map-lbl" x="635" y="366" textAnchor="middle">
              Praça
            </text>
            <text className="map-lbl" x="150" y="452" transform="rotate(-14 150 452)">
              Rodovia
            </text>
            <path className="route" d="M60 455 C 200 420, 280 320, 400 300 L 452 292" fill="none" />
            <g className="pin p-park" transform="translate(560 240)" style={{ transitionDelay: '0s' }}>
              <circle r="16" fill="var(--wine)" />
              <text y="6" textAnchor="middle" className="pin-t">
                P
              </text>
              <text className="map-lbl" x="24" y="5">
                Estacionamento
              </text>
            </g>
            <g className="pin p-door" transform="translate(452 292)" style={{ transitionDelay: '.09s' }}>
              <circle r="7" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
              <text className="map-lbl" x="-14" y="26" textAnchor="end">
                Entrada
              </text>
            </g>
            <g className="pin p-main" transform="translate(478 268)" style={{ transitionDelay: '.18s' }}>
              <rect x="-22" y="-52" width="44" height="44" fill="var(--ink)" />
              <path d="M-6 -8 L0 2 L6 -8z" fill="var(--ink)" />
              <text y="-23" textAnchor="middle" className="pin-m">
                P&amp;G
              </text>
            </g>
          </svg>
        </div>
        <div className="map-foot">
          <div className="addr">
            <b>Restaurante do Victor</b>
            <span>
              Endereço <span className="tag ink">a definir</span> · mapa ilustrativo
            </span>
          </div>
          <div className="row">
            <Btn href={LINKS?.waze} cls="btn-ink">
              Abrir no Waze
            </Btn>
            <Btn href={LINKS?.apple} cls="ghost-ink">
              Apple Maps
            </Btn>
            <Btn href={LINKS?.google} cls="ghost-ink">
              Google Maps
            </Btn>
          </div>
        </div>
      </div>
      <footer className="proto bleed">
        <span>Parme &amp; Gala · 15.01.2027</span>
      </footer>
    </>
  );
}
