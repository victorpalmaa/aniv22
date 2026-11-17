'use client';
import { useState, type FormEvent } from 'react';
import { Ride } from '../Ride';
import { VICTOR_WHATSAPP } from '@/lib/party';

const FAQ: [string, string][] = [
  ['Preciso levar alguma coisa?', 'Só você. Comida e bebida são por conta do Victor.'],
  ['Vai ter música?', 'Vai, e ao vivo. Os detalhes ficam na Surpresa, liberada depois que você confirma presença.'],
  ['Tem estacionamento?', 'Sim, estacionamento fechado no próprio local.'],
  ['Até quando posso confirmar?', 'Até 05/01. Depois disso o formulário continua aberto, mas o número da festa já vai estar fechado com a cozinha.'],
  ['Confirmei em outro celular. E agora?', 'Toque em "Confirmar presença" e depois em "Já confirmei". Você recebe um código no email e entra de novo.'],
];

/** 8 · Dúvidas: FAQ + "Pergunte ao Victor" pelo WhatsApp (texto escrito aqui abre a conversa já preenchido). */
/** abre a mensagem no WhatsApp; as perguntas do convidado vêm logo abaixo, uma por linha */
const GREETING = 'Olá Victor, segue algumas dúvidas do seu aniversário:';

export function Duvidas() {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const ready = VICTOR_WHATSAPP.length >= 12;

  function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return setMsg('Escreva sua mensagem.');
    if (!ready) return;
    // wa.me abre o app (iOS/Android) ou o WhatsApp Web; location em vez de nova aba: no navegador do WhatsApp
    // uma aba nova abre por cima e o convidado se perde
    window.location.href = `https://wa.me/${VICTOR_WHATSAPP}?text=${encodeURIComponent(`${GREETING}\n\n${body}`)}`;
  }

  return (
    <>
      <div className="anchor" id="duvidas" />
      <section className="chapter bleed" id="duvCh" style={{ ['--cb' as string]: 'var(--bg)' }}>
        <Ride word="DÚVIDAS" bg="var(--bg)" color="var(--gold)" />
        <div className="wrap info-rest">
          <div className="panel wide faq">
            <p className="eyebrow">Perguntas frequentes</p>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <div className="panel wide">
            <p className="eyebrow">Ficou alguma dúvida?</p>
            <h3>Pergunte ao Victor</h3>
            <p className="muted">Escreva suas dúvidas, uma por linha, e envie: abre a conversa com o Victor no WhatsApp, com a mensagem pronta e começando com “{GREETING}”</p>
            <form onSubmit={send} noValidate>
              <div className="field">
                <label htmlFor="q-text">Suas dúvidas</label>
                <textarea id="q-text" maxLength={500} placeholder={'Ex.:\nPosso chegar um pouco mais tarde?\nTem opção vegetariana?'} value={text} onChange={(e) => (setText(e.target.value), setMsg(null))} />
                <span className="counter">{text.length}/500</span>
              </div>
              <div aria-live="polite">{msg && <p className="msg err" style={{ marginTop: 10 }}>{msg}</p>}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn-gold" type="submit" disabled={!ready}>
                  Enviar no WhatsApp
                </button>
              </div>
              {!ready && <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>O número do Victor ainda vai entrar aqui.</p>}
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
