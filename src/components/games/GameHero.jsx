import { ProductHero, productIcon } from "./ProductHero";
import { safeImageUrl } from "../../utils/urls";

export function GameHero({ game, children }) {
  const store = game.microsoftStore;

  const storeScreenshots = Array.isArray(store?.screenshots)
    ? store.screenshots
    : [];

  const screenshots = [
    ...new Set(
      storeScreenshots
        .map((item) =>
          safeImageUrl(typeof item === "string" ? item : item?.url),
        )
        .filter(Boolean),
    ),
  ];

  const cover = safeImageUrl(game.coverImage);
  const icon = safeImageUrl(productIcon(store));
  const images = screenshots.length
    ? screenshots
    : cover
      ? [cover]
      : [];

  return (
    <ProductHero title={game.title} icon={icon} images={images}>
      {children}
    </ProductHero>
  );
}