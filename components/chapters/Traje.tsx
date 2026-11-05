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
        <Cine id="trajeCine" height="300svh">
          <h2 className="sr-only">Traje: passeio completo</h2>
          <div className="cine-stage">
            {/* palco atrás do pano: escuro, com o refletor acendendo enquanto o pano sobe */}
            <div className="cs tj-stage" />
            <div className="cs tj-spot" data-show=".3,.6,.82,1" aria-hidden="true" />
            <div className="cl tj-title" data-show=".44,.62,.8,1" data-fx="lift">
              <small>Traje</small>
              <p className="tj-name">
                Passeio <em>completo</em>
              </p>
              <p className="tj-sub">Mais formal que o esporte fino, sem precisar de black tie.</p>
            </div>
            {/* pano de boca: sobe de uma vez, franzindo, e leva a palavra junto */}
            <div className="tj-curtain" data-rise=".2,.6" aria-hidden="true">
              <div className="tj-cloth" />
              <CineWord word="TRAJE" />
              <p className="cap">O dress code da noite</p>
            </div>
            <div className="sp-valance" data-show="0,0,.84,1" aria-hidden="true" />
          </div>
        </Cine>
        <div className="wrap tj-guide">
          <div className="tj-cards">
            {LOOKS.map((l, i) => (
              <article className="tj-card" key={l.who} data-reveal style={{ ['--d' as string]: `${i * 120}ms` }}>
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
