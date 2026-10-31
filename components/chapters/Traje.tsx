import { Cine, CineWord } from '../Cine';

/** 5 · Traje: cena fixa em 4 tempos. Lista provisória até o dress code real chegar. */
export function Traje() {
  return (
    <>
      <div className="anchor" id="traje" />
      <Cine id="trajeCine" className="bleed" height="420svh" style={{ zIndex: 3 }}>
        <h2 className="sr-only">Traje: gala</h2>
        <div className="cine-stage">
          <div className="cl">
            <div className="cs velvet" />
            <CineWord word="TRAJE" />
            <p className="cap">Noite elegante · escuro, dourado e champanhe</p>
          </div>
          <div className="cl" data-in="window" data-at=".12,.40">
            <div className="cs satin" />
            <div className="side l">
              <small>Base</small>
              <b className="roll">
                <span data-roll=".30,.40,.50,.58">Preto</span>
              </b>
            </div>
            <div className="side r">
              <small>Detalhe</small>
              <b className="roll">
                <span data-roll=".32,.42,.50,.58">Dourado</span>
              </b>
            </div>
            <p className="mid">Do vestido longo ao smoking</p>
          </div>
          <div className="cl" data-in="rise" data-at=".52,.66">
            <div className="cs champagne" />
            <div className="leaves" aria-hidden="true" />
            <p className="aside">O salão é todo no mesmo nível: pode vir de salto.</p>
            <div className="list-col">
              <small>O que vale</small>
              <div className="list-mask">
                <ul className="cine-list" data-list=".60,.88">
                  <li>Vestido longo ou midi</li>
                  <li>Terno escuro ou smoking</li>
                  <li>Gravata ou gravata-borboleta</li>
                  <li>Salto, sandália ou sapato social</li>
                  <li>Preto, vinho, dourado e champanhe</li>
                  <li>Só não vale branco</li>
                </ul>
              </div>
              <span className="tag ink">detalhes provisórios</span>
            </div>
          </div>
          <div className="sline" data-line=".84,.89" aria-hidden="true" />
          <div className="cl plain" data-in="split" data-at=".88,1" style={{ ['--pb' as string]: 'var(--bg)' }}>
            <p className="next">A seguir · quem vai</p>
          </div>
        </div>
      </Cine>
    </>
  );
}
