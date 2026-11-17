'use client';
import DepthPhoto from './DepthPhoto';
import { ART, type Item } from '@/lib/content';
import { useMotionPrefs } from './providers/MotionPrefs';

/**
 * Arte de um item: foto com profundidade quando existe, ilustração quando não.
 * `active` só para o item em foco (frente do anel, centro da mesa, detalhe aberto):
 * o iOS derruba a aba com muitos contextos WebGL. Os demais ficam como foto estática idêntica.
 */
export function ItemArt({ it, active = false, className }: { it: Item; active?: boolean; className?: string }) {
  const { paused } = useMotionPrefs();
  if (it.photo) {
    const { slug, w, h, amp } = it.photo;
    return (
      <span className={`${className ?? ''} has-photo`}>
        <DepthPhoto className="dp" slug={slug} width={w} height={h} alt={it.name} active={active} paused={paused} amplitude={amp} />
      </span>
    );
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: ART[it.id] ?? '' }} />;
}

/** Miniatura leve (240 px, sem WebGL) para "Vai bem com". */
export function ItemMini({ it }: { it: Item }) {
  if (it.photo) return <img className="mini" src={`/depth/${it.photo.slug}/thumb.webp`} alt="" width={28} height={28} loading="lazy" decoding="async" />;
  return <span className="mini" dangerouslySetInnerHTML={{ __html: ART[it.id] ?? '' }} />;
}
