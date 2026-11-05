'use client';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useParty, type SheetView } from './providers/PartyProvider';
import { supabase } from '@/lib/supabase/client';
import { del, getJSON, setJSON } from '@/lib/storage';
import { AREAS, isEmail, partyCode, pastDeadline } from '@/lib/party';
import { jump } from '@/lib/motion';

type Flow = { step: 'form' | 'code'; mode: 'new' | 'login'; first?: string; last?: string; email?: string; sentAt?: number };
const loadFlow = () => getJSON<Flow | null>('session', 'flow', null);
const saveFlow = (f: Flow | null) => (f ? setJSON('session', 'flow', f) : del('session', 'flow'));

const RESEND_S = 60; // casa com o "Minimum interval per user" do Auth

/** Traduz erros do banco e do Auth para a voz do site. */
function explain(err: { message?: string; code?: string; status?: number } | null): ReactNode {
  const m = err?.message ?? '';
  if (/bad_code/.test(m)) return 'Esse link está incompleto. Peça ao Victor o link do convite que ele mandou no WhatsApp.';
  if (/party_full/.test(m)) return 'Infelizmente a lista lotou. Fale com o Victor se quiser entrar na espera.';
  if (err?.status === 429 || /rate limit|over_email_send_rate_limit/i.test(m) || err?.code === 'over_email_send_rate_limit')
    return 'Muitos pedidos de código seguidos. Espere um minuto e tente de novo.';
  if (/otp_expired|expired|invalid/i.test(m) || err?.code === 'otp_expired') return 'Código incorreto ou vencido. Confira o último email que chegou.';
  return 'Algo deu errado. Tente de novo em instantes.';
}

export function Sheet() {
  const { sheet, closeSheet, openSheet, session, me, refreshMe, cancel, toast } = useParty();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<Element | null>(null);

  // trava a rolagem de trás e devolve o foco ao fechar
  useEffect(() => {
    if (!sheet) return;
    lastFocus.current = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSheet();
    document.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      (lastFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [sheet, closeSheet]);

  // reabre na etapa do código se a página recarregou no meio do fluxo
  useEffect(() => {
    if (!me && loadFlow()?.step === 'code') openSheet('code');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sheet) return null;
  const go = (v: SheetView) => openSheet(v);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
      <div className="sheet-panel" ref={panelRef}>
        <button className="x" type="button" aria-label="Fechar" onClick={closeSheet}>
          ✕
        </button>
        {sheet === 'form' && <FormView go={go} sessionEmail={session?.user.email ?? null} refreshMe={refreshMe} />}
        {sheet === 'login' && <LoginView go={go} />}
        {sheet === 'code' && <CodeView go={go} refreshMe={refreshMe} toast={toast} />}
        {(sheet === 'done' || sheet === 'welcome') && me && <DoneView kind={sheet} close={closeSheet} />}
        {sheet === 'mine' && me && <MineView close={closeSheet} cancel={cancel} toast={toast} />}
      </div>
    </div>
  );
}

const Steps = ({ n }: { n: number }) => (
  <div className="steps" aria-hidden="true">
    {[1, 2, 3].map((i) => (
      <i key={i} className={i <= n ? 'on' : ''} />
    ))}
  </div>
);
const Err = ({ children }: { children: ReactNode }) => (children ? <p className="msg err">{children}</p> : null);
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width:641px)').matches;

function FormView({ go, sessionEmail, refreshMe }: { go: (v: SheetView) => void; sessionEmail: string | null; refreshMe: () => Promise<unknown> }) {
  const f = loadFlow() ?? ({} as Partial<Flow>);
  const [first, setFirst] = useState(f.first ?? '');
  const [last, setLast] = useState(f.last ?? '');
  const [email, setEmail] = useState(f.email ?? sessionEmail ?? '');
  const [err, setErr] = useState<ReactNode>(null);
  const [busy, setBusy] = useState(false);
  // logado sem linha em rsvps (começou e não terminou, ou cancelou): confirma direto, sem novo código
  const resumed = !!sessionEmail;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fi = first.trim(), la = last.trim(), em = email.trim().toLowerCase();
    if (!fi || !la) return setErr('Preencha nome e sobrenome.');
    if (!isEmail(em)) return setErr('Confira o email. Ele precisa estar completo, como voce@email.com.');
    const code = partyCode();
    if (!code) return setErr(explain({ message: 'bad_code' }));
    setBusy(true);
    setErr(null);
    const sb = supabase();
    // checa código e lotação ANTES do OTP: ninguém verifica o email para depois descobrir que lotou
    const { data: pre, error: preErr } = await sb.rpc('rsvp_precheck', { p_code: code });
    if (preErr || pre !== 'ok') {
      setBusy(false);
      return setErr(explain({ message: pre === 'full' ? 'party_full' : pre ?? preErr?.message }));
    }
    if (resumed && sessionEmail === em) {
      const { error } = await sb.rpc('confirm_rsvp', { p_code: code, p_first: fi, p_last: la });
      setBusy(false);
      if (error) return setErr(explain(error));
      saveFlow(null);
      await refreshMe();
      return go('done');
    }
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setErr(explain(error));
    saveFlow({ step: 'code', mode: 'new', first: fi, last: la, email: em, sentAt: Date.now() });
    go('code');
  }

  return (
    <>
      <Steps n={1} />
      <h3 id="sheet-title">{resumed ? 'Você ainda não confirmou' : 'Confirmar presença'}</h3>
      <p className="sub">
        {pastDeadline() ? 'O prazo de 05/01 passou, mas ainda dá para confirmar.' : 'Confirme até 05/01. Cada convidado confirma com o próprio email.'}
      </p>
      <form onSubmit={submit} noValidate>
        <div className="two">
          <div className="field">
            <label htmlFor="f-first">Nome</label>
            <input id="f-first" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} autoFocus={isDesktop()} />
          </div>
          <div className="field">
            <label htmlFor="f-last">Sobrenome</label>
            <input id="f-last" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-email">Email</label>
          <input id="f-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div aria-live="polite">
          <Err>{err}</Err>
        </div>
        <button className="btn-gold" type="submit" aria-busy={busy} disabled={busy}>
          {resumed && sessionEmail === email.trim().toLowerCase() ? 'Confirmar presença' : 'Receber código'}
        </button>
      </form>
      {!resumed && (
        <p className="sub">
          Já confirmou em outro aparelho?{' '}
          <button className="linkish" type="button" onClick={() => (saveFlow({ ...(loadFlow() ?? {}), step: 'form', mode: 'login', email }), go('login'))}>
            Já confirmei
          </button>
        </p>
      )}
    </>
  );
}

function LoginView({ go }: { go: (v: SheetView) => void }) {
  const [email, setEmail] = useState(loadFlow()?.email ?? '');
  const [err, setErr] = useState<ReactNode>(null);
  const [busy, setBusy] = useState(false);

  const toForm = (em?: string) => {
    saveFlow({ ...(loadFlow() ?? {}), step: 'form', mode: 'new', email: em ?? email });
    go('form');
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!isEmail(em)) return setErr('Confira o email.');
    setBusy(true);
    setErr(null);
    // código de 6 dígitos, nunca link: o link abriria no Safari, com storage diferente do in-app do WhatsApp
    const { error } = await supabase().auth.signInWithOtp({ email: em, options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) {
      // TODO(primeiro teste real): confirmar o error.code exato para email inexistente
      if (error.code === 'otp_disabled' || /signups not allowed/i.test(error.message))
        return setErr(
          <>
            Esse email ainda não confirmou presença.{' '}
            <button className="linkish" type="button" onClick={() => toForm(em)}>
              Confirmar agora
            </button>
          </>,
        );
      return setErr(explain(error));
    }
    saveFlow({ step: 'code', mode: 'login', email: em, sentAt: Date.now() });
    go('code');
  }

  return (
    <>
      <h3 id="sheet-title">Já confirmei</h3>
      <p className="sub">Digite o email que você usou. Mandamos um código para entrar de novo.</p>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="l-email">Email</label>
          <input id="l-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={isDesktop()} />
        </div>
        <div aria-live="polite">
          <Err>{err}</Err>
        </div>
        <button className="btn-gold" type="submit" aria-busy={busy} disabled={busy}>
          Receber código
        </button>
      </form>
      <p className="sub">
        <button className="linkish" type="button" onClick={() => toForm()}>
          Ainda não confirmei
        </button>
      </p>
    </>
  );
}

/**
 * Fases do efeito do código (referência: "Glassy OTP", adaptado para 6 dígitos e paleta Parme & Gala):
 * idle → orbit (dígitos saem das caixas e orbitam enquanto verifyOtp/confirm_rsvp rodam)
 *      → scan (convergem para o centro, anel dourado pulsa) → ok (selo com check) → done/welcome
 * Erro: orbit → err (caixas tremem em vermelho) → idle.
 */
type Phase = 'idle' | 'orbit' | 'scan' | 'ok' | 'err';
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const calm = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function CodeView({ go, refreshMe, toast }: { go: (v: SheetView) => void; refreshMe: () => Promise<{ room: number | null } | null>; toast: (m: string) => void }) {
  const [flow, setFlow] = useState<Flow | null>(loadFlow);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<ReactNode>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const alive = useRef(true); // sheet pode fechar no meio da animação: nada de setState/go depois disso

  useEffect(() => {
    alive.current = true;
    const t = setInterval(() => setNow(Date.now()), 1000);
    const f = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      alive.current = false;
      clearInterval(t);
      clearTimeout(f);
    };
  }, []);

  if (!flow?.email) return <p className="sub">Comece de novo pelo formulário.</p>;
  const left = Math.max(0, RESEND_S - Math.floor((now - (flow.sentAt ?? 0)) / 1000));
  const busy = phase === 'orbit' || phase === 'scan' || phase === 'ok';

  async function resend() {
    if (!flow?.email || busy) return;
    const { error } = await supabase().auth.signInWithOtp({ email: flow.email, options: { shouldCreateUser: flow.mode === 'new' } });
    if (error) return setErr(explain(error));
    const next = { ...flow, sentAt: Date.now() };
    saveFlow(next);
    setFlow(next);
    toast('Código reenviado');
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!flow?.email || busy) return;
    if (code.length !== 6) return setErr('O código tem 6 dígitos.');
    setErr(null);
    setPhase('orbit');
    const t0 = Date.now();
    // órbita mínima só para a animação não piscar em rede rápida; não é atraso artificial do resultado
    const settle = () => wait(Math.max(0, (calm() ? 0 : 900) - (Date.now() - t0)));

    const fail = async (msg: ReactNode, clear: boolean) => {
      await settle();
      if (!alive.current) return;
      setPhase('err');
      setErr(msg);
      if (clear) setCode('');
      await wait(450);
      if (!alive.current) return;
      setPhase('idle');
      inputRef.current?.focus();
    };

    const sb = supabase();
    const { error } = await sb.auth.verifyOtp({ email: flow.email, token: code, type: 'email' });
    if (error) return fail(explain(error), true);
    if (flow.mode === 'new') {
      // verifyOtp ok; confirm_rsvp é quem decide de verdade (party_full numa corrida)
      const { error: cErr } = await sb.rpc('confirm_rsvp', { p_code: partyCode() ?? '', p_first: flow.first ?? '', p_last: flow.last ?? '' });
      if (cErr)
        return fail(
          /party_full/.test(cErr.message) ? 'Seu email foi verificado, mas a lista lotou enquanto você confirmava. Fale com o Victor.' : explain(cErr),
          false,
        );
    }
    const me = await refreshMe();
    const mode = flow.mode;
    if (!me) {
      // entrou, mas não tem linha em rsvps: volta ao formulário com o email preenchido
      saveFlow({ step: 'form', mode: 'new', email: flow.email });
      return alive.current ? go('form') : undefined;
    }
    // limpa já: um reload no meio da animação não pode reabrir a etapa do código
    saveFlow(null);
    await settle();
    if (!alive.current) return;
    inputRef.current?.blur(); // fecha o teclado antes do selo, para o viewport assentar
    setPhase('scan');
    await wait(calm() ? 250 : 1000);
    if (!alive.current) return;
    setPhase('ok');
    await wait(calm() ? 700 : 1300);
    if (!alive.current) return;
    go(mode === 'new' ? 'done' : 'welcome');
  }

  const active = Math.min(code.length, 5);
  const label = flow.mode === 'new' ? 'Confirmar presença' : 'Entrar';

  return (
    <>
      {flow.mode === 'new' && <Steps n={2} />}
      <h3 id="sheet-title">{phase === 'ok' ? 'Código confirmado' : 'Confira seu email'}</h3>
      <p className="sub">
        {phase === 'ok' ? (
          'Seu email foi verificado.'
        ) : (
          <>
            Mandamos um código de 6 dígitos para <b>{flow.email}</b>. Ele também aparece no assunto do email.
          </>
        )}
      </p>
      <form ref={formRef} onSubmit={submit} noValidate>
        <div className={`otp is-${phase}`}>
          <div className="otp-boxes" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={'otp-box' + (code[i] ? ' full' : '') + (focused && phase === 'idle' && code.length < 6 && i === active ? ' on' : '')}>
                {code[i] ?? ''}
              </span>
            ))}
          </div>
          {/* um input só, transparente por cima das caixas: mantém autofill do iOS (one-time-code) e colar */}
          <input
            ref={inputRef}
            id="c-code"
            className="otp-in"
            aria-label="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]*"
            value={code}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              if (busy) return; // sem readOnly: no iOS ele derruba o teclado no meio da órbita
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              if (phase === 'err') setPhase('idle');
              if (err) setErr(null);
              // autofill do iOS preenche os 6 de uma vez: envia sozinho
              if (v.length === 6) setTimeout(() => formRef.current?.requestSubmit(), 0);
            }}
          />
          <div className="otp-fly" aria-hidden="true">
            {(phase === 'orbit' || phase === 'scan') &&
              Array.from(code).map((d, i) => (
                <span key={i} style={{ '--i': i } as CSSProperties}>
                  {d}
                </span>
              ))}
          </div>
          <div className="otp-seal" aria-hidden="true">
            <i className="otp-ring" />
            <svg viewBox="0 0 24 24">
              <path d="M6 12.5l4 4 8-9" />
            </svg>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {phase === 'orbit' ? 'Verificando código' : phase === 'ok' ? 'Código confirmado' : ''}
        </p>
        {!busy && <p className="sub">Não chegou? Confira o lixo eletrônico ou spam.</p>}
        <div aria-live="polite">
          <Err>{err}</Err>
        </div>
        <button className={'btn-gold otp-btn' + (phase === 'ok' ? ' ok' : '')} type="submit" aria-busy={busy} disabled={busy}>
          {phase === 'orbit' || phase === 'scan' ? (
            <>
              <i className="spin" aria-hidden="true" />
              Verificando…
            </>
          ) : phase === 'ok' ? (
            'Tudo certo'
          ) : (
            label
          )}
        </button>
      </form>
      <p className="sub" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <button className="linkish" type="button" disabled={busy || left > 0} onClick={resend}>
          {left > 0 ? `Reenviar em ${left}s` : 'Reenviar código'}
        </button>
        <button
          className="linkish"
          type="button"
          disabled={busy}
          onClick={() => {
            saveFlow({ ...flow, step: 'form' });
            go(flow.mode === 'new' ? 'form' : 'login');
          }}
        >
          Trocar email
        </button>
      </p>
    </>
  );
}

function DoneView({ kind, close }: { kind: 'done' | 'welcome'; close: () => void }) {
  const { me } = useParty();
  if (!me) return null;
  return (
    <>
      {kind === 'done' && <Steps n={3} />}
      <p className="big-ok" aria-hidden="true">
        Até lá.
      </p>
      <h3 id="sheet-title">{kind === 'done' ? `Você está na lista, ${me.first}` : `Bem-vindo de volta, ${me.first}`}</h3>
      <p className="sub">{me.room == null ? 'Agora escolha onde você quer ficar na festa. Dá para trocar depois.' : 'Sua presença continua confirmada.'}</p>
      <button className="btn-gold" type="button" onClick={() => (close(), jump('quem-vai'))}>
        {me.room == null ? 'Escolher meu lugar' : 'Ver quem vai'}
      </button>
      {kind === 'done' && (
        <p className="lock-box" style={{ display: 'block' }}>
          <b>Bônus desbloqueado:</b> o holofote da Surpresa já acende para você.{' '}
          <button className="linkish" type="button" onClick={() => (close(), jump('surpresa'))}>
            Ver agora
          </button>
        </p>
      )}
    </>
  );
}

function MineView({ close, cancel, toast }: { close: () => void; cancel: () => Promise<string | null>; toast: (m: string) => void }) {
  const { me } = useParty();
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!me) return null;
  return (
    <>
      <h3 id="sheet-title">Minha presença</h3>
      <dl className="specs">
        <div>
          <dt>Nome</dt>
          <dd>
            {me.first} {me.last}
          </dd>
        </div>
        <div>
          <dt>Lugar</dt>
          <dd>{me.room == null ? 'Ainda não escolheu' : AREAS[me.room]}</dd>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <dt>Email</dt>
          <dd>{me.email}</dd>
        </div>
      </dl>
      <button
        className="btn-gold"
        type="button"
        onClick={() => {
          close();
          jump('quem-vai');
          window.dispatchEvent(new CustomEvent('plan:choose'));
        }}
      >
        {me.room == null ? 'Escolher meu lugar' : 'Mudar de lugar'}
      </button>
      {!asking ? (
        <div>
          <button className="linkish" type="button" onClick={() => setAsking(true)}>
            Não vou mais poder ir
          </button>
        </div>
      ) : (
        <div>
          <p className="msg err">{err ?? 'Cancelar tira seu nome da lista e libera o lugar. Tem certeza?'}</p>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              className="ghost"
              type="button"
              onClick={async () => {
                const e = await cancel();
                if (e) return setErr(e);
                close();
                toast('Presença cancelada');
              }}
            >
              Sim, cancelar
            </button>
            <button className="btn-gold" type="button" onClick={() => setAsking(false)}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
