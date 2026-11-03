'use client';
import { useRef } from 'react';
import { riseProgress, useScene } from '@/hooks/useScene';
import { reduceMotion } from '@/lib/motion';
import { Ride } from '../Ride';

// Afastamento do mapa: 1 = print do Google no enquadramento original; menor = mais longe. Pins e rótulos estão posicionados para 0,6.
const MAP_K = 0.6;
const C = { x: 346, y: 300 }; // restaurante, centro do afastamento

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
            {/* traçado do Google Maps (Av. Vinte e Nove de Abril, Itatiba) em coordenadas do print (x0,55, y0,55-167),
                afastado por MAP_K em torno do restaurante. Traço não escala (.map-base); rótulos e pins ficam fora do grupo. */}
            <g className="map-base" transform={`translate(${C.x} ${C.y}) scale(${MAP_K}) translate(${-C.x} ${-C.y})`}>
              <path d="M712 454 h 160 v 220 h -160 z" fill="var(--map-park)" />
              <path d="M300 -260 L 315 -167 L 337 97 L 380 361 L 410 566 L 434 740" fill="none" stroke="var(--map-road)" strokeWidth="26" strokeLinecap="round" />
              <g stroke="var(--map-street)" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M200 -265 L 385 -167 L 583 -62 L 622 15 L 710 185 Q 735 232 760 222 L 1110 -20" />
                <path d="M500 -260 L 528 -167 L 583 -62 L 572 53 L 545 218 L 531 383 L 536 570 L 540 740" />
                <path d="M-240 307 L 0 229 L 110 193 L 259 133 L 338 100" />
              </g>
              <g stroke="var(--map-street)" strokeWidth="5" fill="none" strokeLinecap="round">
                <path d="M259 133 L 242 460" />
                <path d="M107 196 L 143 570 L 159 740" />
                <path d="M-40 270 L 0 411 L 44 570 L 93 740" />
                <path d="M426 28 Q 455 -20 492 -112" />
                <path d="M275 356 L 380 364" />
                <path d="M542 493 L 810 380 L 1110 253" />
                <path d="M649 53 Q 710 20 732 15 Q 760 -10 765 -68" />
                <path d="M297 493 L 297 740" />
              </g>
            </g>
            <text className="map-lbl lbl-far" x="614" y="456" textAnchor="middle">
              Covabra
            </text>
            <text className="map-lbl" x="372" y="214" transform="rotate(81 372 214)">
              Av. 29 de Abril
            </text>
            <text className="map-lbl" x="478" y="318" transform="rotate(-86 478 318)">
              R. Luiz Scavone
            </text>
            <text className="map-lbl" x="524" y="144" transform="rotate(62 524 144)">
              R. Santa Clara
            </text>
            <text className="map-lbl" x="168" y="238" transform="rotate(-21 168 238)">
              R. São Caetano
            </text>
            <path className="route" d="M321 0 L 341 182 L 358 292 L 353 300" fill="none" />
            {/* TODO confirmar: posição do estacionamento chutada na viela ao lado do restaurante */}
            <g className="pin p-park" transform="translate(318 352)" style={{ transitionDelay: '0s' }}>
              <circle r="16" fill="var(--wine)" />
              <text y="6" textAnchor="middle" className="pin-t">
                P
              </text>
              <text className="map-lbl" y="38" textAnchor="middle">
                Estacionamento
              </text>
            </g>
            <g className="pin p-door" transform="translate(353 300)" style={{ transitionDelay: '.09s' }}>
              <circle r="7" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
              <text className="map-lbl" x="-14" y="26" textAnchor="end">
                Entrada
              </text>
            </g>
            <g className="pin p-main" transform="translate(339 286)" style={{ transitionDelay: '.18s' }}>
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
