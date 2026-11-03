'use client';
import { useRef } from 'react';
import { riseProgress, useScene } from '@/hooks/useScene';
import { reduceMotion } from '@/lib/motion';
import { Ride } from '../Ride';

// Afastamento do mapa: 1 = print do Google no enquadramento original; menor = mais longe.
// Rótulos e pins são calculados a partir dele, então dá para mudar só este número.
const MAP_K = 0.4;
const C = { x: 346, y: 300 }; // restaurante, centro do afastamento
const at = (x: number, y: number): [number, number] => [+(C.x + MAP_K * (x - C.x)).toFixed(1), +(C.y + MAP_K * (y - C.y)).toFixed(1)];
const pt = (x: number, y: number) => at(x, y).join(' ');
const DOOR = at(360, 300);

/** Rótulo de rua: ponto no traçado original + deslocamento em unidades de tela (não escala com o mapa). */
function Lbl({ p: [x, y], d = [0, 0], rot = 0, anchor, children }: { p: [number, number]; d?: [number, number]; rot?: number; anchor?: 'middle' | 'end'; children: string }) {
  const [sx, sy] = at(x, y);
  const lx = +(sx + d[0]).toFixed(1), ly = +(sy + d[1]).toFixed(1);
  return (
    <text className="map-lbl" x={lx} y={ly} textAnchor={anchor} transform={rot ? `rotate(${rot} ${lx} ${ly})` : undefined}>
      {children}
    </text>
  );
}

// Sem coordenadas ainda: os três apps resolvem pelo endereço. Quando COORDS chegar, o pino fica exato.
const ADDRESS = 'Avenida 29 de Abril, 350, Itatiba - SP';
const COORDS = null as { lat: number; lng: number } | null;
const DEST = COORDS ? `${COORDS.lat},${COORDS.lng}` : encodeURIComponent(ADDRESS);
const LINKS = {
  waze: COORDS ? `https://waze.com/ul?ll=${DEST}&navigate=yes` : `https://waze.com/ul?q=${DEST}&navigate=yes`,
  apple: `https://maps.apple.com/?daddr=${DEST}`,
  google: `https://www.google.com/maps/dir/?api=1&destination=${DEST}`,
};

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
            {/* traçado do Google Maps (Av. 29 de Abril, 350, Itatiba) em coordenadas do print (x0,55, y0,55-167),
                afastado por MAP_K em torno do restaurante. Traço não escala (.map-base); rótulos e pins ficam fora do grupo. */}
            <g className="map-base" transform={`translate(${C.x} ${C.y}) scale(${MAP_K}) translate(${-C.x} ${-C.y})`}>
              <path d="M712 454 h 160 v 220 h -160 z" fill="var(--map-park)" />
              <path d="M294 -420 L 315 -167 L 337 97 L 380 361 L 410 566 L 434 740 L 470 1000" fill="none" stroke="var(--map-road)" strokeWidth="26" strokeLinecap="round" />
              <g stroke="var(--map-street)" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M-200 -477 L 385 -167 L 583 -62 L 622 15 L 710 185 Q 735 232 760 222 L 1110 -20 L 1400 -240" />
                <path d="M470 -420 L 528 -167 L 583 -62 L 572 53 L 545 218 L 531 383 L 536 570 L 545 1000" />
                <path d="M-700 457 L 0 229 L 110 193 L 259 133 L 338 100" />
              </g>
              <g stroke="var(--map-street)" strokeWidth="5" fill="none" strokeLinecap="round">
                <path d="M259 133 L 242 460" />
                <path d="M107 196 L 143 570 L 185 1000" />
                <path d="M-80 130 L 0 411 L 44 570 L 160 1000" />
                <path d="M426 28 Q 455 -20 492 -112" />
                <path d="M275 356 L 380 364" />
                <path d="M542 493 L 810 380 L 1400 130" />
                <path d="M649 53 Q 710 20 732 15 Q 760 -10 765 -68" />
                <path d="M297 493 L 297 1000" />
              </g>
            </g>
            <Lbl p={[792, 454]} d={[0, -8]} anchor="middle">
              Covabra
            </Lbl>
            <Lbl p={[345, 150]} d={[24, 0]} rot={81}>
              Av. 29 de Abril
            </Lbl>
            <Lbl p={[532, 330]} d={[18, 0]} rot={-86}>
              R. Luiz Scavone
            </Lbl>
            <Lbl p={[670, 110]} d={[14, -8]} rot={62}>
              R. Santa Clara
            </Lbl>
            <Lbl p={[-60, 248]} d={[0, -12]} rot={-21}>
              R. São Caetano
            </Lbl>
            <path className="route" d={`M${pt(294, -420)} L ${pt(315, -167)} L ${pt(337, 97)} L ${pt(366, 286)} L ${DOOR.join(' ')}`} fill="none" />
            {/* TODO confirmar: posição do estacionamento chutada na viela ao lado do restaurante */}
            <g className="pin p-park" transform={`translate(${DOOR[0] - 35} ${DOOR[1] + 52})`} style={{ transitionDelay: '0s' }}>
              <circle r="16" fill="var(--wine)" />
              <text y="6" textAnchor="middle" className="pin-t">
                P
              </text>
              <text className="map-lbl" y="38" textAnchor="middle">
                Estacionamento
              </text>
            </g>
            <g className="pin p-door" transform={`translate(${DOOR.join(' ')})`} style={{ transitionDelay: '.09s' }}>
              <circle r="7" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
              <text className="map-lbl" x="-14" y="26" textAnchor="end">
                Entrada
              </text>
            </g>
            <g className="pin p-main" transform={`translate(${DOOR[0] - 14} ${DOOR[1] - 14})`} style={{ transitionDelay: '.18s' }}>
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
            <b>Recanto Colonial</b>
            <span>Avenida 29 de Abril, 350 · Itatiba, SP</span>
          </div>
          <div className="row">
            <Btn href={LINKS.waze} cls="btn-ink">
              Abrir no Waze
            </Btn>
            <Btn href={LINKS.apple} cls="ghost-ink">
              Apple Maps
            </Btn>
            <Btn href={LINKS.google} cls="ghost-ink">
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
