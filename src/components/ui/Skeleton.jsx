import { useLanguage } from '../../context/LanguageContext';

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

function SkeletonLines({ count = 3 }) {
  return <div style={{ display: 'grid', gap: 12 }}>{Array.from({ length: count }, (_, index) => <Skeleton key={index} style={{ height: 16, width: index === count - 1 ? '65%' : '100%', borderRadius: 6 }} />)}</div>;
}

function SkeletonHero() {
  return <header className="rs-hero" aria-hidden="true"><div className="rs-hero__content container"><div className="rs-hero__identity"><div className="rs-hero__text-col"><Skeleton className="rs-hero__title" /><div className="rs-hero__actions"><Skeleton className="launcher-page__badge" /><Skeleton className="launcher-page__pause" /></div></div><Skeleton className="rs-hero__logo" /></div></div></header>;
}

export function SkeletonDetail() {
  const { t } = useLanguage();
  return <div className="game-details game-product-page" role="status" aria-label={t('Loading')}><SkeletonHero /><div className="container game-details__body"><div className="game-details__main"><section className="game-details__screenshots"><Skeleton className="game-details__screenshots-title launcher-page__section-title" style={{ width: 220 }} /><div className="game-details__screenshots-grid">{[0, 1].map((index) => <Skeleton key={index} className="game-details__screenshot-item" style={{ aspectRatio: '16/9' }} />)}</div></section><section className="launcher-page__about"><Skeleton className="launcher-page__section-title" style={{ width: '40%' }} /><SkeletonLines count={5} /><div className="game-meta" style={{ marginTop: 24 }}><Skeleton style={{ height: 24, width: '65%' }} /></div></section></div><aside className="game-details__aside"><div className="game-meta"><Skeleton style={{ height: 30, marginBottom: 24 }} /><Skeleton style={{ width: 80, height: 80, marginBottom: 20 }} /><SkeletonLines count={2} /></div></aside></div></div>;
}

