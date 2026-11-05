'use client';
import { useEffect, useRef, useState } from 'react';
import { useParty } from '../providers/PartyProvider';
import { Cine, CineWord } from '../Cine';
import { getJSON, setJSON } from '@/lib/storage';
import { reduceMotion } from '@/lib/motion';
import { loadSurprise, type Surprise } from '@/lib/surprise';

type State = 'locked' | 'ready' | 'open';
const MIC = '/img/mic.webp';

/**
 * 7 · Surpresa: cena fixa (palavra → cortina de veludo abrindo devagar com o scroll → microfone)
 * e, em fluxo normal, o palco do microfone: para confirmados, o holofote acende e revela a atração.
 */
export function Surpresa() {
  const { me, openSheet } = useParty();
  const [opened, setOpened] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [msg, setMsg] = useState(false);
  const [artist, setArtist] = useState<Surprise | null>(null);
  const [artistIn, setArtistIn] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const state: State = !me ? 'locked' : opened ? 'open' : 'ready';

  useEffect(() => setOpened(!!getJSON('local', 'surp_open', 0)), []);
  useEffect(() => {
    if (!me) setOpened(false);
    else setMsg(false);
  }, [me]);

  useEffect(() => {
    if (state !== 'open') {
      setArtistIn(false);
      return;
    }
    let alive = true;
    loadSurprise().then((s) => {
      if (!alive) return;
      setArtist(s);
      requestAnimationFrame(() => requestAnimationFrame(() => alive && setArtistIn(true)));
    });
    return () => {
      alive = false;
    };
  }, [state]);

  function sparkle() {
    const st = stageRef.current;
    if (reduceMotion() || !st?.animate) return;
    for (let i = 0; i < 22; i++) {
      const d = document.createElement('span');
      d.className = 'spark';
      d.style.left = 20 + Math.random() * 60 + '%';
      st.appendChild(d);
      d.animate(
        [
          { transform: 'translateY(-10px)', opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { transform: `translateY(${280 + Math.random() * 240}px) translateX(${(Math.random() - 0.5) * 60}px)`, opacity: 0 },
        ],
        { duration: 1800 + Math.random() * 1200, delay: 700 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' },
      ).onfinish = () => d.remove();
    }
  }

  function tryOpen() {
    if (!me) {
      // sem confirmação: a corda treme e aparece o aviso
      setNudge((n) => n + 1);
      setMsg(true);
      return;
    }
    if (opened) return;
    setOpened(true);
    setJSON('local', 'surp_open', 1);
    sparkle();
  }

  // reinicia a animação de "tremer" a cada toque
  useEffect(() => {
    const p = stageRef.current;
    if (!p || !nudge) return;
    p.classList.remove('nudge');
    void p.offsetWidth;
    p.classList.add('nudge');
  }, [nudge]);

  return (
    <>
      <div className="anchor" id="surpresa" />
      <section className="chapter bleed" id="surpCh" style={{ ['--cb' as string]: 'var(--bg-2)' }}>
        <Cine id="surpCine" height="320svh">
          <div className="cine-stage">
            <div className="cs stage-dark" />
            <div className="cl" data-show="0,0,.12,.26" data-fx="up">
              <CineWord word="SURPRESA" />
              <p className="cap">Só para quem confirmou presença</p>
            </div>
            <div className="cl sp-stage" data-show=".16,.3">
              <div className="sp-photo">
                <img className="sp-mic" src={MIC} alt="" data-push=".3,1" decoding="async" />
              </div>
              <div className="sp-curtain l" data-open=".34,.8" aria-hidden="true" />
              <div className="sp-curtain r" data-open=".34,.8" aria-hidden="true" />
              <div className="sp-valance" aria-hidden="true" />
              <p className="sp-q" data-show=".8,.9" data-fx="up">
                Quem vai segurar <em>esse microfone?</em>
              </p>
            </div>
          </div>
        </Cine>
        <div className="wrap">
          <header className="sec-head">
            <p className="eyebrow">Exclusivo para confirmados</p>
            <h2>
              Quem vai segurar <em>esse microfone?</em>
            </h2>
            <p className="lede">
              {state === 'locked' ? 'Só quem confirmou presença descobre.' : state === 'ready' ? 'Você confirmou. Acenda o holofote.' : 'Nos vemos na pista.'}
            </p>
          </header>
          <div className="spot-stage" ref={stageRef} data-state={state} onClick={(e) => (e.target as Element).closest('.ss-img, .ss-dim') && tryOpen()}>
            <img className="ss-img" src={MIC} alt="Microfone num pedestal, sob um feixe de luz" loading="lazy" decoding="async" />
            <div className="ss-dim" aria-hidden="true" />
            <div className="ss-beam" aria-hidden="true" />
            <p className="palco-name" aria-hidden="true">
              {state === 'open' && artist && (
                <>
                  <small>Ao vivo</small>
                  {artist.name}
                </>
              )}
            </p>
            <div className="ss-cta">
              <button className="btn-gold" type="button" ref={btnRef} onClick={tryOpen}>
                {state === 'locked' ? 'Toque para descobrir' : 'Acender o holofote'}
              </button>
            </div>
            <button
              className="ghost sm palco-close"
              type="button"
              onClick={() => {
                setOpened(false);
                setJSON('local', 'surp_open', 0);
                btnRef.current?.focus({ preventScroll: true });
              }}
            >
              Apagar o holofote
            </button>
            <div className="rope" aria-hidden="true">
              <svg viewBox="0 0 400 120" preserveAspectRatio="none">
                <path d="M40 40 C 140 105, 260 105, 360 40" fill="none" stroke="#7a1624" strokeWidth="9" strokeLinecap="round" />
                <path d="M40 40 C 140 105, 260 105, 360 40" fill="none" stroke="#b02a3c" strokeWidth="3" strokeLinecap="round" opacity=".7" />
                <g fill="#d6b878">
                  <rect x="34" y="34" width="12" height="86" rx="3" />
                  <circle cx="40" cy="32" r="9" />
                  <rect x="354" y="34" width="12" height="86" rx="3" />
                  <circle cx="360" cy="32" r="9" />
                  <rect x="24" y="112" width="32" height="8" rx="3" />
                  <rect x="344" y="112" width="32" height="8" rx="3" />
                </g>
              </svg>
            </div>
            {state === 'locked' && msg && (
              <div className="palco-msg" role="status">
                <p>
                  <b>O holofote só acende para quem confirmou presença.</b>
                </p>
                <button className="btn-gold sm" type="button" onClick={() => openSheet()}>
                  Confirmar presença
                </button>
              </div>
            )}
          </div>
          {state === 'open' && artist && (
            <div className={`artist${artistIn ? ' in' : ''}`} aria-live="polite">
              <span className="artist-badge">
                <i />
                Confirmado
              </span>
              <h3>{artist.name}</h3>
              <p>
                {artist.role} <span className="tag">a confirmar</span>
              </p>
              <p>
                {artist.when} <span className="tag">a confirmar</span>
              </p>
              {artist.ig && (
                <a className="ig" href={artist.ig} target="_blank" rel="noopener">
                  Acesse o Instagram para ver
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
