import { useLanguage } from '../../context/LanguageContext';
import { safeHttpsUrl, safeImageUrl } from '../../utils/urls';

export function StoreRatings({ store, fallback = true }) {
  const { language, t } = useLanguage();
  const system = { 'pt-BR': 'DJCTQ', en: 'ESRB', es: 'PEGI' }[language];
  const rating = [store?.primaryRating, ...(store?.ratings || [])].find((item) => item && (item.system === system || item.id?.startsWith(`${system}:`)));
  if (!rating && !fallback) return null;
  return <section className="game-meta" aria-label={t("Age rating")}>
    <h3>{t("Age rating")}</h3>
    {rating ? <>
      {safeImageUrl(rating.imageUrl) && <img src={safeImageUrl(rating.imageUrl)} alt={rating.label.replace(/^[A-Z]+[:\s·-]+/, '')} height="80" loading="lazy" />}
      <p>{(rating.description || rating.label).replace(/^[A-Z]+[:\s·-]+/, '')}</p>

    </> : <>
      <img src="/assets/ratings/esrb-rating-pending.svg" alt={t("ESRB Rating Pending placeholder")} height="80" loading="lazy" />
      <p>{t("Rating information is unavailable on Microsoft Store.")}</p>
      <a href="https://www.esrb.org/ratings-guide/" target="_blank" rel="noopener noreferrer">{t("Visit esrb.org for rating information.")}</a>
    </>}
  </section>;
}

export function StoreInformation({ store }) {
  const { t, language } = useLanguage();
  if (!store) return null;
  const date = store.updatedAt && Number.isFinite(Date.parse(store.updatedAt)) ? new Date(store.updatedAt).toLocaleDateString(language, { dateStyle: 'long', timeZone: 'UTC' }) : null;
  const rows = [[t("Store package version"), store.version], [t("Last update"), date]].filter(([, value]) => value);
  const publisher = store.publisher || store.developer;
  const publisherUrl = publisher ? `https://apps.microsoft.com/search/publisher?${new URLSearchParams({ name: publisher, hl: store.locale || language, gl: store.market || { 'pt-BR': 'BR', en: 'US', es: 'ES' }[language] })}` : null;
  return <details className="game-meta">
    <summary>{t('Microsoft Store information')}</summary>
    {store.stale && <p role="status">{t("Showing the last available Store information.")}</p>}
    <dl>{rows.map(([label, value]) => <div className="game-meta__item" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {store.releaseNotes?.length > 0 && <div className="game-meta__item"><h3>{t("What’s new")}</h3>{store.releaseNotes.map((note, index) => <p style={{ whiteSpace: 'pre-line' }} key={index}>{note}</p>)}</div>}
    <div className="studio-actions">{[[t("Privacy policy"), store.privacyUrl], [t('More from this publisher'), publisherUrl], [t("View current information on Microsoft Store"), store.storeUrl]].filter(([, url]) => safeHttpsUrl(url)).map(([label, url]) => <a key={label} className="btn btn--secondary" href={safeHttpsUrl(url)} target="_blank" rel="noopener noreferrer">{label}</a>)}</div>
  </details>;
}
