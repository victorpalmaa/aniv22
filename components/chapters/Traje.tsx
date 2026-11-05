import { Cine, CineWord } from '../Cine';

/**
 * Busca de looks no TikTok separada por público. Os resultados de busca do TikTok são
 * personalizados pelo histórico de quem abre, não de quem mandou o link; ainda assim, sem o
 * gênero na busca, um perfil que costuma ver moda masculina tende a receber só terno.
 */
const tiktok = (q: string) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;
const LOOKS = [
  {
    who: 'Para elas',
    items: ['Vestido midi ou longo, ou conjunto de alfaiataria', 'Tecidos nobres: brilho e joias estão liberados', 'Salto e bolsa de mão'],
    q: 'passeio completo feminino',
  },
  {
    who: 'Para eles',
    items: ['Terno completo com gravata', 'Camisa social e sapato social de couro', 'Colete é opcional'],
    q: 'passeio completo masculino',
  },
];

/** 5 · Traje: cena fixa curta (palavra → nome do traje) e, em fluxo normal, o guia com links. */
export function Traje() {
  return (
    <>
      <div className="anchor" id="traje" />
      <section className="chapter bleed" id="trajeCh" style={{ ['--cb' as string]: 'var(--bg)' }}>
        <Cine id="trajeCine" height="240svh">
          <h2 className="sr-only">Traje: passeio completo</h2>
          <div className="cine-stage">
            <div className="cs velvet" />
            <div className="cl" data-show="0,0,.16,.34" data-fx="up">
              <CineWord word="TRAJE" />
              <p className="cap">O dress code da noite</p>
            </div>
            <div className="cs tj-glow" data-show=".26,.6" aria-hidden="true" />
            <div className="cl tj-title" data-show=".3,.56" data-fx="up">
              <small>Traje</small>
              <p className="tj-name">
                Passeio <em>completo</em>
              </p>
              <p className="tj-sub">Mais formal que o esporte fino, sem precisar de black tie.</p>
            </div>
          </div>
        </Cine>
        <div className="wrap tj-guide">
          <div className="tj-cards">
            {LOOKS.map((l) => (
              <article className="tj-card" key={l.who}>
                <p className="k">{l.who}</p>
                <ul>
                  {l.items.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <a className="ghost sm tj-tt" href={tiktok(l.q)} target="_blank" rel="noopener">
                  Ver ideias no TikTok
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
