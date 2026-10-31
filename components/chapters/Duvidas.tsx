'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useParty } from '../providers/PartyProvider';
import { Ride } from '../Ride';
import { supabase } from '@/lib/supabase/client';
import { isEmail, partyCode } from '@/lib/party';

const FAQ: [string, string][] = [
  ['Posso levar acompanhante?', 'Pode, desde que ele confirme presença com o próprio email. Cada pessoa tem o seu lugar na lista.'],
  ['Preciso levar alguma coisa?', 'Só você. Comida e bebida são por conta do Victor.'],
  ['Crianças podem ir?', 'Não. A festa é só para adultos.'],
  ['Vai ter música?', 'Vai, e ao vivo. Os detalhes ficam na Surpresa, liberada depois que você confirma presença.'],
  ['Tem estacionamento?', 'Sim, estacionamento fechado no próprio local.'],
  ['Até quando posso confirmar?', 'Até 05/01. Depois disso o formulário continua aberto, mas o número da festa já vai estar fechado com a cozinha.'],
  ['Confirmei em outro celular. E agora?', 'Toque em "Confirmar presença" e depois em "Já confirmei". Você recebe um código no email e entra de novo.'],
];

/** 8 · Dúvidas: FAQ + caixa de pergunta (insert-only, validada pelo código da festa). */
export function Duvidas() {
  const { me } = useParty();
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ cls: 'ok' | 'err'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) setEmail(me.email);
  }, [me]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase(), body = text.trim();
    if (!isEmail(em)) return setMsg({ cls: 'err', t: 'Coloque seu email para o Victor conseguir responder.' });
    if (!body) return setMsg({ cls: 'err', t: 'Escreva sua pergunta.' });
    const code = partyCode();
    if (!code) return setMsg({ cls: 'err', t: 'Só quem recebeu o link do convite pode mandar perguntas. Peça o link ao Victor.' });
    setBusy(true);
    // sem .select(): não há policy de select em questions e o retorno daria erro de permissão
    const { error } = await supabase()
      .from('questions')
      .insert({ asker_email: em, body, party_code: code, asker_name: me ? `${me.first} ${me.last}` : null });
    setBusy(false);
    if (error) {
      if (/question_rate_limited/.test(error.message)) return setMsg({ cls: 'err', t: 'Você já mandou 3 perguntas na última hora. Tente de novo mais tarde.' });
      if (error.code === '42501') return setMsg({ cls: 'err', t: 'Esse link está incompleto. Peça ao Victor o link do convite.' });
      return setMsg({ cls: 'err', t: 'Não deu para enviar agora. Tente de novo em instantes.' });
    }
    setText('');
    setMsg({ cls: 'ok', t: 'Pergunta enviada. O Victor responde no seu email.' });
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
            <p className="muted">A pergunta vai direto para ele, e a resposta chega no seu email.</p>
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="q-email">Seu email</label>
                <input id="q-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field" style={{ marginTop: 10 }}>
                <label htmlFor="q-text">Sua pergunta</label>
                <textarea id="q-text" maxLength={500} placeholder="Ex.: posso chegar um pouco mais tarde?" value={text} onChange={(e) => setText(e.target.value)} />
                <span className="counter">{text.length}/500</span>
              </div>
              <div aria-live="polite">{msg && <p className={`msg ${msg.cls}`} style={{ marginTop: 10 }}>{msg.t}</p>}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn-gold" type="submit" aria-busy={busy} disabled={busy}>
                  Enviar pergunta
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
