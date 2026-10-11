import { useLanguage } from "../../context/LanguageContext";
export function GameMeta({ game }) {const { t, language } = useLanguage();
  const rows = [
  { label: t("Release date"), value: game.releaseDate && Number.isFinite(Date.parse(game.releaseDate)) ? new Date(game.releaseDate).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : t("To be announced") },
  { label: t("Platforms"), value: game.platforms?.join(', ') || '—' },
  { label: t("Genres"), value: game.genres?.map((genre) => t(genre)).join(', ') || '—' },
  { label: t("Status"), value: t(game.status) || '—' }];


  return (
    <dl className="game-meta">
      {rows.map((row) =>
      <div className="game-meta__row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      )}
    </dl>);

}
