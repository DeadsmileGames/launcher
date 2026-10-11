import { DownloadSimple } from "@phosphor-icons/react";
import { useLanguage } from "../../context/LanguageContext";
import { safeItchUrl } from "../../utils/urls";

function storeHref(value) {
  try {
    const url = new URL(value);

    return url.origin === "https://apps.microsoft.com" &&
      /^\/detail\/[A-Z0-9]{12}$/i.test(url.pathname) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function StoreOffers({ game, onDownload, downloadBusy = false }) {
  const { t, language } = useLanguage();

  const acquired =
    game.accessType === "paid"
      ? game.owned === true
      : game.accessType === "free" && game.inLibrary === true;

  if (acquired) return null;

  const badgeLocale =
    { "pt-BR": "pt-br", en: "en-us", es: "es-es" }[language] || "en-us";

  return (
    <div className="product-offers">
      {(game.offers || []).map((offer) => {
        if (offer.provider === "direct") {
          return game.isFree && game.downloadAvailable && onDownload ? (
            <div className="product-offer" key="direct">
              <button
                type="button"
                className="btn btn--primary"
                disabled={downloadBusy}
                onClick={onDownload}
              >
                <DownloadSimple weight="bold" />
                {t(
                  downloadBusy ? "Preparing download…" : "Download now",
                )}
              </button>
            </div>
          ) : null;
        }

        const href =
          offer.provider === "itch"
            ? safeItchUrl(offer.href)
            : offer.provider === "microsoft"
              ? storeHref(offer.href)
              : null;

        if (!href) return null;

        return (
          <div className="product-offer" key={offer.provider}>
            {offer.provider === "microsoft" ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(
                  game.isFree
                    ? "Get on Microsoft Store"
                    : "Buy on Microsoft Store",
                )}
              >
                <img
                  className="launcher-page__badge"
                  src={`https://get.microsoft.com/images/${badgeLocale}%20light.svg`}
                  width="200"
                  height="60"
                  alt={t("Get it from Microsoft Store")}
                />
              </a>
            ) : (
              <a
                className="btn btn--primary"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(game.isFree ? "Get on itch.io" : "Buy on itch.io")}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}