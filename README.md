# Parme & Varieté

Site de convite e confirmação de presença do aniversário do Victor (15/01/2027, 20h).
Página única, tudo por scroll. Especificação visual: protótipo v15 (artifact no projeto "Site Aniv").

## Stack
- Next.js 16 (App Router) + TypeScript, deploy na Vercel em `parme.recantocolonial.com.br`
- Supabase (`site-aniv-2027`): Auth por OTP de 6 dígitos no email, Postgres + RLS, Realtime só em `guest_pins`
- SMTP do Auth: Resend com remetente `convite@parme.recantocolonial.com.br`
- Fontes Bodoni Moda e Jost self-hosted (OFL, via Fontsource) em `app/fonts`

## Rodar
```bash
cp .env.example .env.local   # URL + chave publishable (podem ir para o cliente)
npm i
npm run dev
```
Abrir com `?c=parme22`: sem o código da festa no link, dá para ver o site mas não confirmar nem perguntar.

## Estrutura
| Caminho | O quê |
|---|---|
| `app/page.tsx` | Ordem dos capítulos |
| `app/globals.css` | Tokens e estilos portados do protótipo (tabela de z-index no topo) |
| `app/agenda.ics/route.ts` | `.ics` servido pelo servidor (abre o "Adicionar ao Calendário" nativo no iOS) |
| `components/chapters/*` | Abertura, Convite, Mesa, Bar, Traje, Quem vai, Surpresa, Dúvidas, Local |
| `components/providers/PartyProvider.tsx` | Sessão, presença (`rsvps`), pins, Realtime, sheet, toast |
| `components/Sheet.tsx` | Fluxo de confirmação e "Já confirmei" |
| `components/FloorPlan.tsx` | Planta ao vivo (física em ref, `transform` no `<g>`) |
| `components/DetailLayer.tsx` | Camada de detalhe por hash + visualizador 360° |
| `components/Cine.tsx`, `hooks/useScene.ts`, `lib/scroll.ts` | Cenas fixas ligadas ao scroll, um rAF por frame |
| `lib/content.ts` | Cardápio e bar (placeholders) |

## Contrato com o banco
- Confirmar: `rpc('rsvp_precheck')` → `auth.signInWithOtp` → `auth.verifyOtp` → `rpc('confirm_rsvp')`. Nunca `insert` em `rsvps`.
- "Já confirmei": `signInWithOtp` com `shouldCreateUser: false`; o destino depois do login é decidido por `rsvps`, não pelo Auth.
- Lugar: `rpc('set_my_room', { p_area })`. Contagem anônima: `rpc('area_counts')`.
- Cancelar: `delete` no próprio `rsvps` (o pin some por cascade).
- Pergunta: `insert` em `questions` **sem** `.select()` (não há policy de select).

## Regras do repo (é público)
- Nunca commitar `service_role`, senhas ou conteúdo restrito. A chave publishable e o código da festa são aceitáveis no cliente.
- Dados da Surpresa (nome, foto, Instagram da atração) não entram no bundle: vêm do servidor, só para confirmados (`lib/surprise.ts`).
- Todo acesso a `localStorage`/`sessionStorage` passa por `lib/storage.ts` (try/catch).
