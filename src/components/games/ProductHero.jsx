import { useEffect, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { useLanguage } from '../../context/LanguageContext';

export function productIcon(store) {
  return store?.images?.filter((item) => /(?:square|logo|tile)/i.test(item.purpose) && item.width === item.height)
    .sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url
    || store?.images?.find((item) => /logo|tile/i.test(item.purpose))?.url;
}

export function ProductHero({ title, icon, images = [], enabled = true, children }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [iconFailed, setIconFailed] = useState(false);
  useEffect(() => { setIconFailed(false); }, [icon]);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const imageKey = images.join('\n');
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = (event) => setReduced(event.matches);
    const visibility = () => setVisible(!document.hidden);
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => { setIndex(0); setPaused(false); }, [title, imageKey]);
  useEffect(() => {
    if (!enabled || images.length < 2 || paused || reduced || !visible) return undefined;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % images.length), 5000);
    return () => window.clearInterval(timer);
  }, [imageKey, images.length, enabled, paused, reduced, visible]);
  return <header className="rs-hero">
    {images.map((url, position) => <img key={url} src={url} alt="" aria-hidden="true" className={`game-hero__background launcher-page__background${position === index % images.length ? ' is-active' : ''}`} decoding="async" />)}
    <div className="rs-hero__overlay" />
    <div className="rs-hero__content container"><div className="rs-hero__identity" style={!icon || iconFailed ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
      <div className="rs-hero__text-col"><h1 className="rs-hero__title">{title}</h1><div className="rs-hero__actions">{children}
        {images.length > 1 && !reduced && <button type="button" className="btn btn--secondary launcher-page__pause" aria-label={t(paused ? 'Resume background' : 'Pause background')} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
      </div></div>
      {icon && !iconFailed && <img src={icon} alt="" className="rs-hero__logo" width="180" height="180" onError={() => setIconFailed(true)} />}
    </div></div>
  </header>;
}
