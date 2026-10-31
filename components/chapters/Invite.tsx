'use client';
import { useEffect, useRef, useState } from 'react';
import { PARTY_START, pastDeadline } from '@/lib/party';
import { googleCalendarUrl } from '@/lib/calendar';
import { onScroll, vp } from '@/lib/scroll';

const pad = (n: number) => String(n).padStart(2, '0');
function parts(ms: number) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  return [d, h, Math.floor(s / 60), s % 60].map(pad);
}

/** 2 · Convite: contagem, prazo e cards. Fica parado enquanto a Mesa sobe por cima. */
export function Invite() {
  const ref = useRef<HTMLElement>(null);
  // começa em 00 no servidor; o relógio só liga no cliente (evita mismatch de hidratação)
  const [t, setT] = useState<string[]>(['00', '00', '00', '00']);
  const [late, setLate] = useState(false);

  useEffect(() => {
    const tick = () => setT(parts(PARTY_START - Date.now()));
    tick();
    setLate(pastDeadline());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // gruda pela base se for mais alto que a tela; calculado só no resize, nunca por frame
  useEffect(
    () =>
      onScroll(
        () => {},
        () => {
          const el = ref.current;
          if (el) el.style.top = Math.min(vp.hh, vp.vh - el.offsetHeight) + 'px';
        },
      ),
    [],
  );

  return (
    <>
      <div className="anchor" id="convite" />
      <section className="loc-intro bleed" id="intro" ref={ref}>
        <div className="leaves" aria-hidden="true" />
        <div className="wrap">
          <header className="sec-head">
            <p className="eyebrow">Até lá</p>
            <h2>
              A contagem <em>já começou</em>
            </h2>
            <p className="lede">Sexta, 15 de janeiro de 2027, a partir das 20h. O endereço fica no fim da página.</p>
          </header>
          <div className="count" role="timer" aria-label="Contagem regressiva para a festa">
            {['dias', 'horas', 'min', 'seg'].map((u, i) => (
              <div key={u}>
                <b>{t[i]}</b>
                <span>{u}</span>
              </div>
            ))}
          </div>
          <p className="deadline">
            {late ? (
              'O prazo de 05/01 passou, mas você ainda pode confirmar.'
            ) : (
              <>
                Confirme até <b>05/01</b>
              </>
            )}
          </p>
          <div className="loc-cards">
            <div className="loc-card">
              <span className="k">Sexta · 15.01.2027</span>
              <b>20h</b>
              <span className="s">
                Término <span className="tag">a definir</span>
              </span>
              <div className="row">
                <a className="btn-gold sm" href="/agenda.ics">
                  Calendário
                </a>
                <a className="ghost sm" href={googleCalendarUrl()} target="_blank" rel="noopener">
                  Google Agenda
                </a>
              </div>
            </div>
            <div className="loc-card">
              <span className="k">Estacionamento</span>
              <b>P</b>
              <span className="s">Fechado, no próprio local</span>
            </div>
            <div className="loc-card">
              <span className="k">Traje</span>
              <b>
                <i>Gala</i>
              </b>
              <span className="s">Detalhes mais abaixo</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
