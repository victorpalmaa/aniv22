'use client';

/**
 * <DepthPhoto> foto com volume por mapa de profundidade, em órbita automática contínua.
 *
 * Assets gerados por prepare_depth_photos.py em /public/depth/<slug>/{fg.webp,bg.jpg,depth.png,meta.json}.
 *
 * Regras de projeto (Site Aniv):
 * - Parada (ou pausada), a imagem é idêntica à foto original: fg sobre bg em <img>, sem WebGL.
 * - WebGL só existe enquanto o item está visível E ativo. Fora disso o contexto é destruído.
 *   iOS mata a aba por memória com muitos contextos; no anel do bar e na mesa, só o item da frente é `active`.
 * - Nada de estado React por frame: rAF + refs.
 * - Nunca ampliar além de 1 px da foto por px físico. Se o layout pedir mais, avisa no console (foto pequena).
 * - Pausa é controle visível do usuário (prop `paused`), não freeze automático por prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react';

type Props = {
  slug: string;
  width: number;            // meta.json w
  height: number;           // meta.json h
  alt: string;
  active?: boolean;         // item em foco (ex.: frente do anel). Default true.
  paused?: boolean;         // controle global "Pausar animações"
  periodMs?: number;        // volta completa da órbita. Validado: 9000.
  amplitude?: [number, number]; // deslocamento máx. em fração da largura (x, y). Validado: [0.05, 0.038].
  className?: string;
  base?: string;            // pasta pública dos assets
};

const VS = `attribute vec2 p; varying vec2 v;
void main(){ v = p*.5+.5; v.y = 1.-v.y; gl_Position = vec4(p,0,1); }`;

// Ray march da frente para trás: o primeiro ponto em que a superfície fica acima do raio é o visível.
// O método de ponto fixo (mais simples) oscila nas bordas e duplica contornos; não trocar.
const FS = `precision highp float; varying vec2 v;
uniform sampler2D fg, bg, dep; uniform vec2 t; uniform vec2 k;
void main(){
  const float D0 = .45;          // pivô: topo anda para um lado, base para o outro
  const int N = 40;
  vec2 off = t*k;
  float h = 1.; float dh = 1./float(N);
  vec2 u = v - off*(h - D0); float d = texture2D(dep,u).r;
  vec2 pu = u; float ph = h; float pd = d;
  for(int i=0;i<N;i++){
    if(d >= h) break;
    pu = u; ph = h; pd = d;
    h -= dh; u = v - off*(h - D0); d = texture2D(dep,u).r;
  }
  float a0 = pd - ph, a1 = d - h; float w = clamp(a1/(a1 - a0 + 1e-5), 0., 1.);
  u = mix(u, pu, w);
  vec4 f = texture2D(fg, u);
  vec4 b = texture2D(bg, v + off*D0);
  gl_FragColor = vec4(mix(b.rgb, f.rgb, f.a), 1.);
}`;

type Tex = HTMLImageElement | ImageBitmap;

/**
 * Decodifica fora da thread principal. Com UNPACK_COLORSPACE_CONVERSION = NONE o navegador redecodificava
 * o <img> na hora do upload, na thread principal (110 a 420 ms por item, medido). ImageBitmap com
 * colorSpaceConversion:'none' + premultiplyAlpha:'none' dá o mesmo pixel sem esse custo.
 * Fallback: <img> + decode(), o caminho antigo.
 */
async function loadTex(src: string): Promise<Tex> {
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = await (await fetch(src)).blob();
      return await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    } catch {
      /* Safari antigo sem as opções: cai no <img> */
    }
  }
  const im = new Image();
  im.decoding = 'async';
  im.src = src;
  await im.decode();
  return im;
}
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export default function DepthPhoto({
  slug, width, height, alt, active = true, paused = false,
  periodMs = 9000, amplitude = [0.05, 0.038], className, base = '/depth',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [visible, setVisible] = useState(false);
  const [glReady, setGlReady] = useState(false); // muda 1x por ativação, não por frame

  const dir = `${base}/${slug}`;
  const live = active && visible;

  // Só anima o que está na tela.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live) { setGlReady(false); return; }
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const gl = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return; // fica a foto estática

    let raf = 0, alive = true;
    const onLost = (e: Event) => { e.preventDefault(); alive = false; cancelAnimationFrame(raf); setGlReady(false); };
    cv.addEventListener('webglcontextlost', onLost);

    const sh = (type: number, src: string) => {
      const o = gl.createShader(type)!; gl.shaderSource(o, src); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o));
      return o;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(pr, 't');
    gl.uniform2f(gl.getUniformLocation(pr, 'k'), amplitude[0], amplitude[1]);

    const upload = (im: Tex, unit: number, name: string) => {
      const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      // NPOT em WebGL1: sem mipmap e CLAMP obrigatório, senão textura preta no Safari
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(pr, name), unit);
    };

    const resize = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const cssW = wrap.clientWidth, cssH = wrap.clientHeight;
      if (process.env.NODE_ENV !== 'production' && cssW * dpr > width * 1.05) {
        console.warn(`[DepthPhoto] ${slug}: exibida com ${Math.round(cssW * dpr)} px físicos, foto tem ${width}. Vai borrar; peça a foto original.`);
      }
      // canvas nunca maior que a foto: acima disso não ganha nitidez e só custa GPU (tela cheia no iPhone)
      const scale = Math.min(dpr, width / Math.max(1, cssW));
      cv.width = Math.round(cssW * scale); cv.height = Math.round(cssH * scale);
      gl.viewport(0, 0, cv.width, cv.height);
    };
    const ro = new ResizeObserver(resize); ro.observe(wrap); resize();

    // Órbita circular contínua: sem pontos de parada nos extremos.
    let ang = 0, prev = performance.now(), x = 0, y = 0;
    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.min(64, now - prev); prev = now;
      if (!pausedRef.current) ang += (dt / periodMs) * Math.PI * 2;
      const z = pausedRef.current ? 0 : 1;   // pausado volta suave para a foto original
      x += (Math.cos(ang) * 0.85 * z - x) * 0.06;
      y += (Math.sin(ang) * 0.55 * z - y) * 0.06;
      gl.uniform2f(uT, x, y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden && alive) { prev = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', onVis);

    Promise.all([loadTex(`${dir}/fg.webp`), loadTex(`${dir}/bg.jpg`), loadTex(`${dir}/depth.png`)])
      .then(async (texs) => {
        // uma textura por frame: as três juntas eram uma tarefa longa só
        const names = ['fg', 'bg', 'dep'];
        for (let i = 0; i < 3; i++) {
          if (!alive) break;
          upload(texs[i], i, names[i]);
          await nextFrame();
        }
        for (const t of texs) if ('close' in t) t.close();
        if (!alive) return;
        setGlReady(true);
        raf = requestAnimationFrame(frame);
      })
      .catch(() => setGlReady(false));

    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      cv.removeEventListener('webglcontextlost', onLost);
      // Libera o contexto na hora: não esperar o GC do Safari
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      setGlReady(false);
    };
    // amplitude como números: array literal novo a cada render reiniciaria o contexto
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, dir, slug, width, periodMs, amplitude[0], amplitude[1]]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', width: '100%', aspectRatio: `${width} / ${height}`, overflow: 'hidden' }}
    >
      {/* Estado estático = foto original exata. Também é o fallback sem WebGL e o poster enquanto carrega. */}
      <img src={`${dir}/bg.jpg`} loading="lazy" decoding="async" alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <img src={`${dir}/fg.webp`} loading="lazy" decoding="async" alt={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {/* key força canvas novo a cada ativação: contexto perdido não volta no mesmo elemento */}
      {live && (
        <canvas
          key={`${slug}-live`}
          ref={canvasRef}
          aria-hidden
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: glReady ? 1 : 0, transition: 'opacity .3s' }}
        />
      )}
    </div>
  );
}
