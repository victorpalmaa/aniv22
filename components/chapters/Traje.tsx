import { Cine, CineWord } from '../Cine';

/**
 * Busca de looks no TikTok separada por público. Os resultados de busca do TikTok são
 * personalizados pelo histórico de quem abre, não de quem mandou o link; ainda assim, sem o
 * gênero na busca, um perfil que costuma ver moda masculina tende a receber só terno.
 */
const tiktok = (q: string) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;
/*
 * A busca do TikTok exige login no navegador; o link de um vídeo específico abre sem conta.
 * Com vídeos em `videos`, o card mostra um botão por vídeo; sem vídeos, cai na busca.
 * Use a URL completa (…/@perfil/video/123 ou …/@perfil/photo/123), sem ?q= e &t= da busca, não o link curto vm.tiktok.com.
 */
const LOOKS = [
  {
    who: 'Para elas',
    items: ['Vestido longo', 'Tecidos nobres: brilho, cetim e joias estão liberados', 'Salto e bolsa de mão'],
    q: 'traje gala feminino',
    videos: [
      'https://www.tiktok.com/@alexajadue/video/7515796811114614072',
      'https://www.tiktok.com/@malumatozo4/photo/7675185697212468488',
    ],
  },
  {
    who: 'Para eles',
    items: ['Smoking ou terno escuro', 'Gravata borboleta ou gravata', 'Camisa social e sapato social de couro'],
    q: 'traje gala masculino',
    videos: [
      'https://www.tiktok.com/@sweetsuit.mx/photo/7675109202137795848',
      'https://www.tiktok.com/@the.mens.edit/photo/7683197536647089426',
      'https://www.tiktok.com/@hlm.style/photo/7656926423185181960',
    ],
  },
];

/** 5 · Traje: cena fixa curta (palavra → nome do traje) e, em fluxo normal, o guia com links. */
export function Traje() {
  return (
    <>
      <div className="anchor" id="traje" />
      <section className="chapter bleed" id="trajeCh" style={{ ['--cb' as string]: 'var(--bg)' }}>
        <Cine id="trajeCine" height="300svh">
          <h2 className="sr-only">Traje: gala</h2>
          <div className="cine-stage">
            {/* palco atrás do pano: escuro, com o refletor acendendo enquanto o pano sobe */}
            <div className="cs tj-stage" />
            <div className="cs tj-spot" data-show=".3,.6,.82,1" aria-hidden="true" />
            <div className="cl tj-title" data-show=".44,.62,.8,1" data-fx="lift">
              <small>Traje</small>
              <p className="tj-name">
                <em>Gala</em>
              </p>
              <p className="tj-sub">O traje mais formal da noite: vestido longo para elas, smoking ou terno escuro para eles.</p>
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
                {l.videos.length ? (
                  <div className="tj-vids">
                    {l.videos.map((v, k) => (
                      <a key={v} className="ghost sm tj-tt" href={v} target="_blank" rel="noopener">
                        {l.videos.length > 1 ? `Inspiração ${k + 1}` : 'Ver inspiração no TikTok'}
                      </a>
                    ))}
                  </div>
                ) : (
                  <a className="ghost sm tj-tt" href={tiktok(l.q)} target="_blank" rel="noopener">
                    Ver ideias no TikTok
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
