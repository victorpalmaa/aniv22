#!/usr/bin/env node
/**
 * Teste da Surpresa contra o Supabase de verdade (só leitura, não grava nada).
 *
 *   npm run test:surprise
 *
 * Parte 1 (automática): sem login, nada da Surpresa pode vazar.
 * Parte 2 (opcional): login por código no email de um convidado CONFIRMADO; aí tudo tem que aparecer.
 * Usa só a chave publishable do .env.local (a mesma que vai para o navegador).
 * Não imprime o nome da atração, só se ele veio ou não (dá para rodar com alguém olhando a tela).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

// .env.local sem depender de dotenv
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (copie .env.example para .env.local).');
  process.exit(2);
}

const BUCKET = 'surprise';
const OBJECTS = ['cantor.webp', 'palco.webp'];
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  ok  ' : ' FALHA'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------- Parte 1: anônimo ----------
console.log('\nParte 1 · sem login (o que qualquer pessoa com o link consegue)\n');
const anon = client();

{
  const { data, error } = await anon.from('surprise').select('*');
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    console.log('\n  A tabela `surprise` não existe: rode a migration 20261117120000_surprise.sql antes.\n');
    process.exit(1);
  }
  check('tabela surprise não devolve linhas', !data?.length, error ? `bloqueado: ${error.code}` : `${data?.length ?? 0} linha(s)`);
}
{
  const { error } = await anon.rpc('surprise_allowed');
  check('função surprise_allowed fechada para anônimo', !!error, error?.code ?? 'executou');
}
{
  const { data, error } = await anon.storage.from(BUCKET).createSignedUrls(OBJECTS, 60);
  const got = (data ?? []).filter((d) => d.signedUrl).length;
  check('não gera URL assinada', got === 0, error ? 'negado' : `${got} URL(s) geradas`);
}
for (const o of OBJECTS) {
  const r = await fetch(`${URL}/storage/v1/object/public/${BUCKET}/${o}`);
  check(`URL pública de ${o} não abre`, r.status !== 200, `HTTP ${r.status}`);
  const r2 = await fetch(`${URL}/storage/v1/object/${BUCKET}/${o}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  check(`download direto de ${o} negado`, r2.status !== 200, `HTTP ${r2.status}`);
}
{
  const { data } = await anon.storage.from(BUCKET).list();
  check('bucket não lista arquivos', !data?.length, `${data?.length ?? 0} item(ns)`);
}

// ---------- Parte 2: convidado confirmado ----------
const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log('\nParte 2 · convidado confirmado (opcional)');
const email = (await rl.question('Email de quem JÁ confirmou presença (Enter para pular): ')).trim();

if (email) {
  const sb = client();
  // shouldCreateUser:false: email que não existe não vira conta
  const { error: otpErr } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (otpErr) {
    check('envio do código', false, otpErr.message);
  } else {
    const code = (await rl.question('Código de 6 dígitos que chegou no email: ')).trim();
    const { data: v, error: vErr } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
    check('login por código', !vErr && !!v.session, vErr?.message ?? '');
    if (v?.session) {
      const uid = v.session.user.id;
      const { data: me } = await sb.from('rsvps').select('id').eq('id', uid).maybeSingle();
      check('tem linha em rsvps (confirmado)', !!me, me ? '' : 'esse email está no Auth mas não confirmou; o resto vai falhar por isso');

      const { data: row, error } = await sb.from('surprise').select('name, role, when_text, photo_path, stage_path').eq('id', 1).maybeSingle();
      check('lê os dados da atração', !!row?.name, error?.message ?? (row ? 'nome presente' : 'sem linha: rode o seed'));
      if (row) {
        check('role = "Ao vivo com banda"', row.role === 'Ao vivo com banda', row.role);
        check('caminhos das imagens preenchidos', !!row.photo_path && !!row.stage_path, `${row.photo_path} / ${row.stage_path}`);
        const paths = [row.photo_path, row.stage_path].filter(Boolean);
        const { data: signed, error: sErr } = await sb.storage.from(BUCKET).createSignedUrls(paths, 60);
        check('gera URL assinada', (signed ?? []).every((s) => s.signedUrl) && paths.length === 2, sErr?.message ?? '');
        for (const s of signed ?? []) {
          if (!s.signedUrl) continue;
          const r = await fetch(s.signedUrl);
          const buf = await r.arrayBuffer();
          check(`baixa ${s.path} pela URL assinada`, r.ok && buf.byteLength > 1000, `HTTP ${r.status}, ${Math.round(buf.byteLength / 1024)} KB, ${r.headers.get('content-type')}`);
          const bad = s.signedUrl.replace(/token=([^&]{8})/, 'token=xxxxxxxx');
          const rb = await fetch(bad);
          check(`URL com token adulterado não abre (${s.path})`, rb.status !== 200, `HTTP ${rb.status}`);
        }
      }
      await sb.auth.signOut();
    }
  }
} else {
  console.log('  (pulada)');
}
rl.close();

const fail = results.filter((r) => !r.pass);
console.log(`\n${results.length - fail.length}/${results.length} ok${fail.length ? `, ${fail.length} falha(s)` : ''}\n`);
process.exit(fail.length ? 1 : 0);
