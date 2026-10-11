import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  DownloadSimple,
  Binoculars,
  GameController,
  GearSix,
  MagnifyingGlass,
  Play,
  SignOut,
  Trash,
  Trophy,
  X,
} from "@phosphor-icons/react";
import { api, friendlyErrorMessage } from "./services-api";
import { LanguageContext, useLanguage } from "./context/LanguageContext";
import messages from "./messages.json";
import { GameHero } from "./components/games/GameHero";
import { StoreOffers } from "./components/games/StoreOffers";
import {
  StoreInformation,
  StoreRatings,
} from "./components/games/StoreInformation";
import { GameMeta } from "./components/games/GameMeta";
import { Skeleton, SkeletonDetail } from "./components/ui/Skeleton";
import { Lightbox } from "./components/ui/Lightbox";
import { Modal } from "./components/ui/Modal";
import {
  safeHttpsUrl,
  safeImageUrl,
  safeOAuthItchUrl,
  safeItchUrl,
} from "./utils/urls";
import { useLibraryLive } from "./useLibraryLive";
const SITE = "https://deadsmilegames.vercel.app";
const bridge = window.deadsmile;
const languages = ["en", "pt-BR", "es"];
const busyJob = (item) => !["complete", "failed"].includes(item.status);
const canLaunch = (game) =>
  game.accessType === "free" ||
  (game.accessType === "paid" && game.owned === true);
const userIdPattern = /^[0-9a-f-]{36}$/i;
function readInstalled() {
  try {
    const value = JSON.parse(
      localStorage.getItem("deadsmile.library") || "{}",
    );
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}
function persistInstalled(value) {
  try {
    localStorage.setItem("deadsmile.library", JSON.stringify(value));
  } catch { }
}
function openExternal(value) {
  const url = safeHttpsUrl(value);
  return url && bridge?.openExternal
    ? bridge.openExternal(url)
    : Promise.reject({
      code: "INVALID_REQUEST_PATH",
    });
}
function itchGamePage(game) {
  const href = [
    game.itchUrl,
    ...(game.offers || [])
      .filter((offer) => offer.provider === "itch")
      .map((offer) => offer.href),
    game.purchaseUrl,
  ]
    .map(safeItchUrl)
    .find(Boolean);

  if (!href) return null;

  const url = new URL(href);
  url.pathname = url.pathname.replace(/\/purchase\/?$/, "") || "/";
  url.search = "";
  url.hash = "";
  return url.href;
}
function bytes(value) {
  const size = Number(value) || 0;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(1)} GB`;
}
function State({ error, onRetry, children }) {
  const { t } = useLanguage();
  return (
    <div className="state-block" role={error ? "alert" : "status"}>
      {error ? (
        <>
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onRetry}
            >
              {t("Try again")}
            </button>
          )}
        </>
      ) : (
        children || (
          <>
            <div className="skeleton launcher-loading" />
            <span>{t("Loading")}</span>
          </>
        )
      )}
    </div>
  );
}
function Login({ onAuthenticated }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verifyEmail, setVerifyEmail] = useState(false);
  const [resent, setResent] = useState(false);
  const submitLock = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    setVerifyEmail(false);
    try {
      const result = twoFactor
        ? await api.post("/auth/verify-2fa", {
          token,
        })
        : await api.post("/auth/mobile-login", {
          email: email.trim(),
          password,
        });
      if (result?.requiresTwoFactor) {
        setTwoFactor(true);
        setToken("");
      } else {
        setPassword("");
        onAuthenticated(result);
      }
    } catch (failure) {
      setError(friendlyErrorMessage(failure));
      setVerifyEmail(failure.code === "EMAIL_NOT_VERIFIED");
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  async function resend() {
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/resend-email", {
        email: email.trim(),
        password,
      });
      setResent(true);
    } catch (failure) {
      setError(friendlyErrorMessage(failure));
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-page__card">
        <h1>{t(twoFactor ? "Verify sign in" : "Sign in")}</h1>
        {error && (
          <p className="auth-page__error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit}>
          {twoFactor ? (
            <div className="auth-page__field">
              <label htmlFor="login-code">
                {t("Authentication code")}
              </label>
              <input
                id="login-code"
                value={token}
                onChange={(event) =>
                  setToken(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6),
                  )
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={6}
                required
                autoFocus
              />
            </div>
          ) : (
            <>
              <div className="auth-page__field">
                <label htmlFor="login-email">
                  {t("Email")}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                  maxLength={254}
                />
              </div>
              <div className="auth-page__field">
                <label htmlFor="login-password">
                  {t("Password")}
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                  maxLength={128}
                />
              </div>
            </>
          )}
          <button
            type="submit"
            className="btn btn--primary auth-page__submit"
            disabled={busy}
          >
            {t(
              busy
                ? "Signing in…"
                : twoFactor
                  ? "Verify sign in"
                  : "Sign in",
            )}
          </button>
        </form>
        {verifyEmail && (
          <button
            type="button"
            className="btn btn--secondary"
            disabled={busy || resent}
            onClick={resend}
          >
            {t(
              resent
                ? "Verification email sent."
                : "Resend verification email",
            )}
          </button>
        )}
        {twoFactor ? (
          <button
            type="button"
            className="btn btn--secondary auth-page__submit"
            style={{ marginTop: 12 }}
            disabled={busy}
            onClick={() => {
              setTwoFactor(false);
              setToken("");
              setError("");
            }}
          >
            {t("Back")}
          </button>
        ) : (
          <>
            <p className="auth-page__footer">
              <a
                href={`${SITE}/forgot-password`}
                onClick={(event) => {
                  event.preventDefault();
                  openExternal(
                    event.currentTarget.href,
                  ).catch((failure) =>
                    setError(friendlyErrorMessage(failure)),
                  );
                }}
              >
                {t("Forgot password?")}
              </a>
            </p>
            <p className="auth-page__footer">
              <a
                href={`${SITE}/register`}
                onClick={(event) => {
                  event.preventDefault();
                  openExternal(
                    event.currentTarget.href,
                  ).catch((failure) =>
                    setError(friendlyErrorMessage(failure)),
                  );
                }}
              >
                {t("Create account")}
              </a>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

function Achievements({ gameId }) {
  const { t } = useLanguage();
  const [state, setState] = useState({
    loading: true,
    items: [],
    error: "",
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState({
      loading: true,
      items: [],
      error: "",
    });
    api.get(`/platform/achievements/${gameId}`)
      .then((items) => {
        if (active)
          setState({
            loading: false,
            items: Array.isArray(items) ? items : [],
            error: "",
          });
      })
      .catch((failure) => {
        if (active)
          setState({
            loading: false,
            items: [],
            error: friendlyErrorMessage(failure),
          });
      });
    const off = bridge?.onAchievementUnlocked?.((event) => {
      if (event.gameId === gameId) setRevision((value) => value + 1);
    });
    return () => {
      active = false;
      off?.();
    };
  }, [gameId, revision]);
  return (
    <section className="launcher-achievements">
      <h2 className="launcher-page__section-title">
        {t("Achievements")}
      </h2>
      {state.loading ? (
        <State />
      ) : state.error ? (
        <State
          error={state.error}
          onRetry={() => setRevision((value) => value + 1)}
        />
      ) : !state.items.length ? (
        <p>{t("No achievements yet.")}</p>
      ) : (
        <ul>
          {state.items.map((item) => {
            const unlocked = Boolean(
              item.unlocked_at || item.unlockedAt,
            );
            const hidden = item.hidden && !unlocked;
            return (
              <li
                key={item.id || item.key}
                className={unlocked ? "is-unlocked" : ""}
              >
                <Trophy
                  size={22}
                  weight={unlocked ? "fill" : "regular"}
                />
                <div>
                  <strong>
                    {hidden
                      ? t("Hidden achievement")
                      : item.title || item.key}
                  </strong>
                  {!hidden && <p>{item.description}</p>}
                  <small>
                    {t(unlocked ? "Unlocked" : "Locked")}
                  </small>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
function Detail({
  game,
  entry,
  running,
  busy,
  onInstall,
  onPlay,
  onUninstall,
  onVerify,
  revision,
}) {
  const { t, language } = useLanguage();
  const [state, setState] = useState({
    loading: true,
    game: null,
    error: "",
  });
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [update, setUpdate] = useState(null);
  const [externalError, setExternalError] = useState("");
  useEffect(() => {
    let active = true;
    setState((value) => ({
      ...value,
      loading: !value.game,
      error: "",
    }));
    api.get(`/games/${encodeURIComponent(game.slug)}`)
      .then((data) => {
        if (active)
          setState({
            loading: false,
            game: data,
            error: "",
          });
      })
      .catch((failure) => {
        if (active)
          setState((value) => ({
            ...value,
            loading: false,
            error: friendlyErrorMessage(failure),
          }));
      });
    return () => {
      active = false;
    };
  }, [game.id, game.slug, language, revision, retry]);
  useEffect(() => {
    let active = true;
    setUpdate(null);
    if (
      canLaunch(game) &&
      entry?.path &&
      game.downloadAvailable &&
      bridge?.checkGameUpdate
    )
      bridge
        .checkGameUpdate({
          id: game.id,
          slug: game.slug,
          currentVersion: entry.version,
          filename: entry.filename,
          path: entry.path,
        })
        .then((value) => {
          if (active) setUpdate(value);
        })
        .catch(() => { });
    return () => {
      active = false;
    };
  }, [
    game.id,
    game.slug,
    game.accessType,
    game.owned,
    game.downloadAvailable,
    entry?.path,
    entry?.version,
    revision,
  ]);
  if (state.loading) return <SkeletonDetail />;
  if (state.error && !state.game)
    return (
      <State
        error={state.error}
        onRetry={() => setRetry((value) => value + 1)}
      />
    );
  const detail = {
    ...state.game,
    owned: game.owned,
    inLibrary: game.inLibrary,
  };
  const accessible = canLaunch(detail);
  const unavailable =
    !(accessible && entry?.path) &&
    (!detail.downloadAvailable || detail.status !== "released");

  const acquired =
    detail.accessType === "paid"
      ? detail.owned === true
      : detail.accessType === "free" && detail.inLibrary === true;

  const reviewUrl = itchGamePage(detail);
  const offers = accessible
    ? detail
    : {
      ...detail,
      offers: (detail.offers || []).filter(
        (offer) => offer.provider === "itch",
      ),
    };
  const screenshots = (detail.screenshots || [])
    .map(safeImageUrl)
    .filter(Boolean);
  const index =
    selected === null || !screenshots.length
      ? null
      : Math.min(selected, screenshots.length - 1);
  return (
    <div className="game-details game-product-page">
      <GameHero game={detail}>
        <div className="launcher-game-actions">
          {accessible && entry?.path ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={running || busy}
              onClick={() => onPlay(detail)}
            >
              <Play weight="fill" />
              {t(
                running
                  ? "Running"
                  : busy
                    ? "Please wait…"
                    : "Play",
              )}
            </button>
          ) : accessible &&
            detail.downloadAvailable &&
            detail.status === "released" ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => onInstall(detail)}
            >
              <DownloadSimple />
              {t(busy ? "Preparing download…" : "Download now")}
            </button>
          ) : !detail.downloadAvailable ||
            detail.status !== "released" ? (
            <button
              type="button"
              className="btn btn--secondary"
              disabled
            >
              {t("Unavailable")}
            </button>
          ) : null}

          {accessible &&
            update?.available &&
            detail.downloadAvailable && (
              <button
                type="button"
                className="btn btn--secondary"
                disabled={running || busy}
                onClick={() => onInstall(detail, true)}
              >
                <ArrowsClockwise />
                {t("Update game")}
              </button>
            )}

          {entry?.path && (
            <button
              type="button"
              className="btn btn--danger"
              disabled={running || busy}
              onClick={() => onUninstall(detail)}
            >
              <Trash />
              {t("Uninstall")}
            </button>
          )}

          {(unavailable || acquired) && reviewUrl && (
            <a
              className="btn btn--secondary"
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                event.preventDefault();
                openExternal(reviewUrl).catch((failure) =>
                  setExternalError(
                    friendlyErrorMessage(failure),
                  ),
                );
              }}
            >
              <ArrowSquareOut />
              {t(
                unavailable
                  ? "View page on itch.io"
                  : "Review on itch.io",
              )}
            </a>
          )}
        </div>

        {!unavailable && !acquired && (
          <StoreOffers game={offers} />
        )}

        {!accessible &&
          detail.downloadAvailable &&
          detail.status === "released" && (
            <button
              type="button"
              className="btn btn--secondary"
              disabled={busy}
              onClick={() => onVerify(detail)}
            >
              {t(
                busy
                  ? "Verifying purchase…"
                  : "Verify purchase",
              )}
            </button>
          )}
      </GameHero>
      {state.error && (
        <div className="container launcher-error" role="alert">
          <p>{state.error}</p>
          <button type="button" className="btn btn--secondary" onClick={() => setRetry((value) => value + 1)}>
            {t("Try again")}
          </button>
        </div>
      )}
      <div className="container game-details__body">
        <div className="game-details__main">
          {screenshots.length > 0 && (
            <section className="game-details__screenshots">
              <h2 className="game-details__screenshots-title launcher-page__section-title">
                {t("Screenshots")}
              </h2>
              <div className="game-details__screenshots-grid">
                {screenshots.map((src, position) => (
                  <button
                    type="button"
                    className="game-details__screenshot-item"
                    key={src}
                    onClick={() => setSelected(position)}
                    aria-label={t("Open screenshot {0}", {
                      "0": position + 1,
                    })}
                  >
                    <img
                      src={src}
                      alt={t("Screenshot {0}", {
                        "0": position + 1,
                      })}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="launcher-page__about">
            <h2 className="launcher-page__section-title">
              {t("games.about")}
            </h2>
            <p className="game-details__description">
              {detail.description || detail.shortDescription}
            </p>
            <StoreInformation store={detail.microsoftStore} />
          </section>
          {safeHttpsUrl(detail.trailerUrl) && (
            <button
              type="button"
              className="btn btn--secondary launcher-trailer"
              onClick={() =>
                openExternal(detail.trailerUrl).catch(
                  (failure) =>
                    setExternalError(
                      friendlyErrorMessage(failure),
                    ),
                )
              }
            >
              <ArrowSquareOut />
              {t("Watch trailer")}
            </button>
          )}
          {externalError && (
            <p className="launcher-error" role="alert">
              {externalError}
            </p>
          )}
          {accessible && <Achievements gameId={detail.id} />}
        </div>
        <aside className="game-details__aside">
          <StoreRatings store={detail.microsoftStore} />
          <GameMeta game={detail} />
        </aside>
      </div>
      <Lightbox
        images={screenshots}
        selectedIndex={index}
        onClose={() => setSelected(null)}
        onPrev={() =>
          setSelected((value) =>
            value === null || !screenshots.length
              ? null
              : (value - 1 + screenshots.length) %
              screenshots.length,
          )
        }
        onNext={() =>
          setSelected((value) =>
            value === null || !screenshots.length
              ? null
              : (value + 1) % screenshots.length,
          )
        }
      />
    </div>
  );
}
function Settings({
  language,
  setLanguage,
  itch,
  busy = false,
  onConnect,
  onDisconnect,
}) {
  const { t } = useLanguage();
  return (
    <section className="launcher-settings">
      <div className="game-meta">
        <h2>{t("Language")}</h2>
        <label className="launcher-field" htmlFor="launcher-language">
          {t("Language")}
          <select
            id="launcher-language"
            className="launcher-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={busy}
          >
            {languages.map((value) => (
              <option key={value} value={value}>
                {value === "pt-BR"
                  ? "Português"
                  : value === "es"
                    ? "Español"
                    : "English"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {itch && (
        <div className="game-meta launcher-connect">
          <p>
            {t(
              itch.connected
                ? "Connected to itch.io"
                : "Connect itch.io to sync purchased games.",
            )}
          </p>
          <button
            type="button"
            className={`btn ${itch.connected ? "btn--danger" : "btn--secondary"}`}
            disabled={
              busy ||
              (!itch.connected &&
                (!itch.configured || itch.connecting))
            }
            onClick={itch.connected ? onDisconnect : onConnect}
          >
            {t(
              busy
                ? "Please wait…"
                : itch.connected
                  ? "Disconnect itch.io"
                  : itch.connecting
                    ? "Connecting…"
                    : "Connect itch.io",
            )}
          </button>
        </div>
      )}
    </section>
  );
}
function Downloads({ queue, report }) {
  const { t } = useLanguage();
  const action = async (name, id) => {
    try {
      await bridge[name](id);
    } catch (failure) {
      report(friendlyErrorMessage(failure));
    }
  };
  return (
    <section className="launcher-downloads">
      <h1>{t("Downloads")}</h1>
      {!queue.length ? (
        <State>{t("No downloads.")}</State>
      ) : (
        queue.map((item) => (
          <article
            className="game-meta launcher-download"
            key={item.id}
          >
            <div>
              <h2>{item.title}</h2>
              <p>{t(item.status)}</p>
              <progress
                max="100"
                value={Math.min(
                  100,
                  Math.max(0, Number(item.percent) || 0),
                )}
                aria-label={t("Download progress")}
              />
              <p>
                {bytes(item.bytesReceived)} /{" "}
                {bytes(item.totalBytes)}
              </p>
              {item.error && (
                <p className="launcher-error" role="alert">
                  {item.errorCode
                    ? friendlyErrorMessage({
                      code: item.errorCode,
                    })
                    : item.error}
                </p>
              )}
            </div>
            {busyJob(item) && (
              <div className="launcher-game-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={[
                    "extracting",
                    "installing",
                    "cancelling",
                  ].includes(item.status)}
                  onClick={() =>
                    action(
                      item.status === "paused"
                        ? "resumeDownload"
                        : "pauseDownload",
                      item.id,
                    )
                  }
                >
                  {t(
                    item.status === "paused"
                      ? "Resume"
                      : "Pause",
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={item.status === "cancelling"}
                  onClick={() =>
                    action("cancelDownload", item.id)
                  }
                >
                  {t("Cancel")}
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}
export default function App() {
  const [language, updateLanguage] = useState(() => {
    try {
      const value = localStorage.getItem("deadsmile.language");
      return languages.includes(value) ? value : "en";
    } catch {
      return "en";
    }
  });
  const setLanguage = useCallback((value) => {
    if (!languages.includes(value)) return;
    document.documentElement.lang = value;
    try {
      localStorage.setItem("deadsmile.language", value);
    } catch { }
    updateLanguage(value);
  }, []);
  const t = useCallback(
    (key, values) => {
      let text = messages[language]?.[key] || messages.en?.[key] || key;
      for (const [name, value] of Object.entries(values || {}))
        text = text.replaceAll(`{${name}}`, String(value));
      return text;
    },
    [language],
  );
  const context = useMemo(
    () => ({
      language,
      t,
    }),
    [language, t],
  );
  const [auth, setAuth] = useState({
    status: "loading",
    user: null,
    error: "",
  });
  const [boot, setBoot] = useState(0);
  const [library, setLibrary] = useState({
    status: "loading",
    items: [],
    error: "",
  });
  const [installed, setInstalled] = useState(readInstalled);
  const installedRef = useRef(installed);
  const installedRevision = useRef(0);
  installedRef.current = installed;
  const [queue, setQueue] = useState([]);
  const [running, setRunning] = useState(new Set());
  const [pending, setPending] = useState(new Set());
  const [active, setActive] = useState("explore");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [itch, setItch] = useState({
    configured: false,
    connected: false,
    connecting: false,
  });
  const [itchBusy, setItchBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [update, setUpdate] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [externalLaunch, setExternalLaunch] = useState(null);
  const refreshSequence = useRef(0);
  const sessionId = useRef(null);
  sessionId.current = auth.user?.id || null;
  const refreshLock = useRef(null);
  const refreshAgain = useRef(null);
  const actionLocks = useRef(new Set());
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("deadsmile.language", language);
    } catch { }
    bridge
      ?.syncGameViewLanguage?.({
        language,
        strings: {
          achievementUnlocked: t("Achievement unlocked"),
        },
      })
      .catch(() => { });
  }, [language, t]);
  useEffect(() => {
    let active = true;
    setAuth({
      status: "loading",
      user: null,
      error: "",
    });
    if (!bridge?.api) {
      setAuth({
        status: "error",
        user: null,
        error: friendlyErrorMessage({
          code: "SERVICE_UNAVAILABLE",
        }),
      });
      return undefined;
    }
    api.get("/auth/me")
      .then((user) => {
        if (active)
          setAuth({
            status: "ready",
            user,
            error: "",
          });
      })
      .catch((failure) => {
        if (active)
          setAuth({
            status: failure.status === 401 ? "login" : "error",
            user: null,
            error:
              failure.status === 401
                ? ""
                : friendlyErrorMessage(failure),
          });
      });
    return () => {
      active = false;
    };
  }, [boot]);
  const refresh = useCallback(
    async (sync = false) => {
      const userId = auth.user?.id;
      if (!userId) return;
      if (
        refreshLock.current?.userId === userId &&
        refreshLock.current?.sequence === refreshSequence.current
      ) {
        refreshAgain.current = {
          userId,
          sync: sync || Boolean(refreshAgain.current?.sync),
        };
        return;
      }
      const sequence = ++refreshSequence.current;
      refreshLock.current = {
        userId,
        sequence,
      };
      setRefreshing(true);
      try {
        const connection = await api.get("/integrations/itch");
        if (
          sessionId.current !== userId ||
          sequence !== refreshSequence.current
        )
          return;
        setItch((value) => ({
          ...value,
          configured: Boolean(connection.configured),
          connected: Boolean(connection.connected),
          connecting: value.connecting && !connection.connected,
        }));
        if (sync && connection.connected) {
          try {
            await api.post("/library/sync");
          } catch (failure) {
            if (
              sessionId.current === userId &&
              sequence === refreshSequence.current
            )
              setNotice(friendlyErrorMessage(failure));
          }
        }
        const localRevision = installedRevision.current;
        const [data, normalized] = await Promise.all([
          api.get("/library/catalog"),
          bridge.storage.normalizeLibrary(installedRef.current),
        ]);
        if (
          sessionId.current !== userId ||
          sequence !== refreshSequence.current
        )
          return;
        const items = (data?.items || []).filter((game) =>
          userIdPattern.test(game.id || ""),
        );
        setLibrary({
          status: "success",
          items,
          error: "",
        });
        if (localRevision === installedRevision.current) {
          setInstalled(normalized || {});
          persistInstalled(normalized || {});
        }
        setSelected((value) =>
          items.some((item) => item.id === value) ? value : null,
        );
        setRevision((value) => value + 1);
      } catch (failure) {
        if (
          sessionId.current === userId &&
          sequence === refreshSequence.current
        ) {
          setNotice(friendlyErrorMessage(failure));
          setLibrary((value) => ({
            ...value,
            status: value.status === "success" ? "success" : "error",
            error: friendlyErrorMessage(failure),
          }));
        }
      } finally {
        if (refreshLock.current?.sequence === sequence) {
          refreshLock.current = null;
          if (sessionId.current === userId) setRefreshing(false);
          const next = refreshAgain.current;
          refreshAgain.current = null;
          if (next?.userId === userId && sessionId.current === userId)
            queueMicrotask(() => {
              if (sessionId.current === userId)
                refresh(next.sync);
            });
        }
      }
    },
    [auth.user?.id],
  );
  useEffect(() => {
    ++refreshSequence.current;
    actionLocks.current.clear();
    setPending(new Set());
    setLibrary({
      status: "loading",
      items: [],
      error: "",
    });
    setActive("explore");
    setSelected(null);
    setQuery("");
    setNotice("");
    setItch({
      configured: false,
      connected: false,
      connecting: false,
    });
    if (auth.user?.id) refresh();
    return () => {
      ++refreshSequence.current;
    };
  }, [auth.user?.id, refresh]);
  useEffect(() => {
    const invalidated = () => {
      api.resetSecurity();
      setAuth({
        status: "login",
        user: null,
        error: "",
      });
    };
    window.addEventListener("deadsmile:auth-invalidated", invalidated);
    return () =>
      window.removeEventListener(
        "deadsmile:auth-invalidated",
        invalidated,
      );
  }, []);
  useLibraryLive(auth.user?.id, () => refresh());
  useEffect(() => {
    if (!auth.user?.id || !itch.connecting) return undefined;
    let active = true,
      polling = false;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (polling || !active) return;
      if (Date.now() - started > 120000) {
        setItch((value) => ({
          ...value,
          connecting: false,
        }));
        setNotice(
          friendlyErrorMessage({
            code: "ITCH_LINK_EXPIRED",
          }),
        );
        return;
      }
      polling = true;
      try {
        const result = await api.get("/integrations/itch");
        if (active && result.connected) {
          setItch({
            configured: Boolean(result.configured),
            connected: true,
            connecting: false,
          });
          refresh(true);
        }
      } catch {
      } finally {
        polling = false;
      }
    }, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [auth.user?.id, itch.connecting, refresh]);
  useEffect(() => {
    let active = true;
    let queueChanged = false,
      gamesChanged = false;
    bridge
      ?.getDownloadSnapshot?.()
      .then((items) => {
        if (active && !queueChanged)
          setQueue(Array.isArray(items) ? items : []);
      })
      .catch(() => { });
    bridge
      ?.getRunningGames?.()
      .then((items) => {
        if (active && !gamesChanged)
          setRunning(new Set((items || []).map((item) => item.id)));
      })
      .catch(() => { });
    const offQueue = bridge?.onDownloadQueue?.((items) => {
      queueChanged = true;
      if (active) setQueue(Array.isArray(items) ? items : []);
    });
    const offState = bridge?.onGameState?.((item) => {
      gamesChanged = true;
      if (!active) return;
      setRunning((value) => {
        const next = new Set(value);
        item.running ? next.add(item.id) : next.delete(item.id);
        return next;
      });
      if (item.launchFailed)
        setNotice(
          friendlyErrorMessage({
            code: "GAME_LAUNCH_FAILED",
          }),
        );
    });
    const offConflict = bridge?.onCloudSaveConflict?.(() =>
      setNotice(
        friendlyErrorMessage({
          code: "SAVE_CONFLICT",
        }),
      ),
    );
    const offLaunch = bridge?.onLaunchGame?.((id) =>
      setExternalLaunch(String(id || "")),
    );
    const offProgress = bridge?.onUpdateProgress?.(setUpdateProgress);
    return () => {
      active = false;
      offQueue?.();
      offState?.();
      offConflict?.();
      offLaunch?.();
      offProgress?.();
    };
  }, []);
  useEffect(() => {
    if (!auth.user?.id) return undefined;
    bridge?.readyForLaunchRequests?.().catch(() => { });
    let active = true;
    bridge
      ?.checkForUpdate?.()
      .then((value) => {
        if (active) setUpdate(value);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [auth.user?.id]);
  async function play(game) {
    const userId = sessionId.current;
    if (
      actionLocks.current.has(game.id) ||
      running.has(game.id) ||
      !canLaunch(game)
    )
      return;
    const entry = installedRef.current[game.id];
    if (!entry?.path) {
      setSelected(game.id);
      return;
    }
    actionLocks.current.add(game.id);
    setPending((value) => new Set(value).add(game.id));
    try {
      await api.post(`/library/${game.id}`);
      if (sessionId.current !== userId) return;
      setLibrary((value) => ({
        ...value,
        items: value.items.map((item) =>
          item.id === game.id
            ? { ...item, owned: true, inLibrary: true }
            : item,
        ),
      }));
      const result = await bridge.playGame({
        id: game.id,
        slug: game.slug,
        exePath: entry.path,
        gameVersion: entry.version || null,
      });
      if (result?.error)
        throw {
          code: result.code || "GAME_LAUNCH_FAILED",
        };
    } catch (failure) {
      if (sessionId.current === userId)
        setNotice(friendlyErrorMessage(failure));
    } finally {
      if (sessionId.current !== userId) return;
      actionLocks.current.delete(game.id);
      setPending((value) => {
        const next = new Set(value);
        next.delete(game.id);
        return next;
      });
    }
  }
  useEffect(() => {
    if (!externalLaunch || !auth.user?.id || library.status !== "success")
      return;
    const game = library.items.find((item) => item.id === externalLaunch);
    setExternalLaunch(null);
    if (game) {
      setActive("library");
      setSelected(game.id);
      play(game);
    } else
      setNotice(
        friendlyErrorMessage({
          code: "GAME_NOT_OWNED",
        }),
      );
  }, [externalLaunch, auth.user?.id, library.status, library.items]);
  async function install(game, updateGame = false) {
    const userId = sessionId.current;
    if (
      actionLocks.current.has(game.id) ||
      !game.downloadAvailable ||
      !canLaunch(game)
    )
      return;
    actionLocks.current.add(game.id);
    setPending((value) => new Set(value).add(game.id));
    setNotice("");
    try {
      await api.post(`/library/${game.id}`);
      if (sessionId.current !== userId) return;
      setLibrary((value) => ({
        ...value,
        items: value.items.map((item) =>
          item.id === game.id
            ? { ...item, owned: true, inLibrary: true }
            : item,
        ),
      }));
      const entry = installedRef.current[game.id];
      const result = await bridge.downloadGame({
        id: game.id,
        slug: game.slug,
        mode: updateGame && entry?.path ? "update" : "download",
        currentVersion: entry?.version,
        filename: entry?.filename,
        path: entry?.path,
      });
      if (sessionId.current !== userId) return;
      if (!result?.path)
        throw {
          code: "GAME_DOWNLOAD_FAILED",
        };
      ++installedRevision.current;
      setInstalled((value) => {
        const next = {
          ...value,
          [game.id]: {
            path: result.path,
            folderPath: result.folderPath,
            filename: result.filename,
            downloadedAt: Date.now(),
            version: result.version || null,
          },
        };
        persistInstalled(next);
        return next;
      });
      setRevision((value) => value + 1);
    } catch (failure) {
      if (sessionId.current === userId)
        setNotice(friendlyErrorMessage(failure));
    } finally {
      if (sessionId.current !== userId) return;
      actionLocks.current.delete(game.id);
      setPending((value) => {
        const next = new Set(value);
        next.delete(game.id);
        return next;
      });
    }
  }
  async function uninstall() {
    const game = confirm;
    if (!game || actionLocks.current.has(game.id) || running.has(game.id))
      return;
    actionLocks.current.add(game.id);
    setPending((value) => new Set(value).add(game.id));
    try {
      const entry = installedRef.current[game.id];
      const error = await bridge.deleteGame(
        entry?.folderPath || entry?.path,
        game.id,
        game.slug,
      );
      if (error)
        throw {
          code: error.code || "GAME_UNINSTALL_FAILED",
        };
      ++installedRevision.current;
      setInstalled((value) => {
        const next = {
          ...value,
        };
        delete next[game.id];
        persistInstalled(next);
        return next;
      });
      setConfirm(null);
    } catch (failure) {
      setNotice(friendlyErrorMessage(failure));
    } finally {
      actionLocks.current.delete(game.id);
      setPending((value) => {
        const next = new Set(value);
        next.delete(game.id);
        return next;
      });
    }
  }
  async function connectItch() {
    if (itchBusy || itch.connecting) return;
    setItchBusy(true);
    try {
      setNotice("");
      const result = await api.post("/integrations/itch/connect", {
        client: "launcher",
        locale: language,
      });
      const url = safeOAuthItchUrl(result.authorizeUrl);
      if (!url)
        throw {
          code: "INVALID_RESPONSE",
        };
      await openExternal(url);
      setItch((value) => ({
        ...value,
        connecting: true,
      }));
    } catch (failure) {
      setNotice(friendlyErrorMessage(failure));
    } finally {
      setItchBusy(false);
    }
  }
  async function disconnectItch() {
    if (
      itchBusy ||
      running.size ||
      pending.size ||
      queue.some(busyJob) ||
      refreshing ||
      updating
    )
      return;
    const userId = sessionId.current;
    setItchBusy(true);
    setNotice("");
    try {
      await api.delete("/integrations/itch");
      if (sessionId.current !== userId) return;
      setItch({
        configured: itch.configured,
        connected: false,
        connecting: false,
      });
      setLibrary((value) => ({
        ...value,
        items: value.items.map((game) =>
          game.accessType === "paid"
            ? { ...game, owned: false, inLibrary: false }
            : game,
        ),
      }));
      await refresh();
    } catch (failure) {
      if (sessionId.current === userId)
        setNotice(friendlyErrorMessage(failure));
    } finally {
      setItchBusy(false);
    }
  }
  async function verifyPurchase(game) {
    if (actionLocks.current.has(game.id)) return;
    actionLocks.current.add(game.id);
    setPending((value) => new Set(value).add(game.id));
    const userId = sessionId.current;
    setNotice("");
    try {
      await api.post(`/library/${game.id}`);
      if (sessionId.current !== userId) return;
      setLibrary((value) => ({
        ...value,
        items: value.items.map((item) =>
          item.id === game.id
            ? { ...item, owned: true, inLibrary: true }
            : item,
        ),
      }));
      await refresh();
    } catch (failure) {
      if (sessionId.current === userId)
        setNotice(friendlyErrorMessage(failure));
    } finally {
      actionLocks.current.delete(game.id);
      setPending((value) => {
        const next = new Set(value);
        next.delete(game.id);
        return next;
      });
    }
  }
  async function logout() {
    if (
      running.size ||
      pending.size ||
      queue.some(busyJob) ||
      refreshing ||
      updating
    )
      return;
    try {
      await api.post("/auth/logout");
      await bridge.clearAuthSession();
      api.resetSecurity();
      setAuth({
        status: "login",
        user: null,
        error: "",
      });
    } catch (failure) {
      setNotice(friendlyErrorMessage(failure));
    }
  }
  async function updateLauncher() {
    if (updating) return;
    setUpdating(true);
    setNotice("");
    try {
      await bridge.updateLauncher();
    } catch (failure) {
      setNotice(friendlyErrorMessage(failure));
      setUpdating(false);
    }
  }
  const selectedGame = library.items.find((item) => item.id === selected);
  const filtered = library.items.filter(
    (game) =>
      (active !== "library" || game.inLibrary === true) &&
      (!installedOnly || installed[game.id]?.path) &&
      `${game.title} ${game.genres?.join(" ") || ""}`
        .toLocaleLowerCase(language)
        .includes(query.trim().toLocaleLowerCase(language)),
  );
  const quick = library.items
    .filter(
      (game) =>
        game.inLibrary && canLaunch(game) && installed[game.id]?.path,
    )
    .slice(0, 4);
  const actionBusy = (id) =>
    refreshing ||
    updating ||
    itchBusy ||
    pending.has(id) ||
    queue.some((item) => item.id === id && busyJob(item));
  return (
    <LanguageContext.Provider value={context}>
      <header className="launcher-titlebar">
        {auth.status !== "ready" && (
          <button
            type="button"
            style={{ background: "none", border: "none", color: "white", display: "flex", alignItems: "center", gap: "10px", padding: "0", margin: "0" }}
            onClick={() =>
              setActive((value) =>
                value === "settings" ? "explore" : "settings",
              )
            }
            aria-label={t(
              active === "settings" ? "Back" : "Settings",
            )}
          >
            <GearSix size={20} />
          </button>
        )}
      </header>
      {active === "settings" && auth.status !== "ready" ? (
        <Settings language={language} setLanguage={setLanguage} />
      ) : auth.status === "loading" ? (
        <State />
      ) : auth.status === "error" ? (
        <State
          error={auth.error}
          onRetry={() => setBoot((value) => value + 1)}
        />
      ) : auth.status === "login" ? (
        <Login
          onAuthenticated={(user) =>
            setAuth({
              status: "ready",
              user,
              error: "",
            })
          }
        />
      ) : (
        <div className="launcher-shell">
          <aside className="launcher-sidebar">
            <nav aria-label={t("Games")}>
              {[
                "explore",
                "library",
                "downloads",
                "settings",
              ].map((tab) => (
                <button
                  type="button"
                  key={tab}
                  className={
                    active === tab ? "is-active" : ""
                  }
                  onClick={() => {
                    setActive(tab);
                    setSelected(null);
                  }}
                >
                  {tab === "downloads" ? (
                    <DownloadSimple size={22} />
                  ) : tab === "settings" ? (
                    <GearSix size={22} />
                  ) : tab === "explore" ? (
                    <Binoculars size={22} />
                  ) : (
                    <GameController size={22} />
                  )}
                  {t(
                    {
                      explore: "Explore",
                      library: "Library",
                      downloads: "Downloads",
                      settings: "Settings",
                    }[tab],
                  )}
                  {tab === "downloads" &&
                    queue.some(busyJob) && (
                      <span>
                        {queue.filter(busyJob).length}
                      </span>
                    )}
                </button>
              ))}
            </nav>
            <div className="launcher-sidebar__bottom">
              <button
                type="button"
                onClick={() =>
                  openExternal(SITE).catch((failure) =>
                    setNotice(
                      friendlyErrorMessage(failure),
                    ),
                  )
                }
              >
                <ArrowSquareOut size={20} />
                {t("Website")}
              </button>
              <span className="launcher-user">
                {safeImageUrl(auth.user.avatarUrl) && (
                  <img
                    src={safeImageUrl(auth.user.avatarUrl)}
                    alt=""
                  />
                )}
                <strong>{auth.user.username}</strong>
              </span>
              <button
                type="button"
                disabled={
                  running.size > 0 ||
                  pending.size > 0 ||
                  queue.some(busyJob) ||
                  refreshing ||
                  updating ||
                  itchBusy
                }
                onClick={logout}
              >
                <SignOut size={20} />
                {t("Sign out")}
              </button>
            </div>
          </aside>
          <main className="launcher-content">
            {notice && (
              <div className="launcher-notice" role="alert">
                <p>{notice}</p>
                <button
                  type="button"
                  aria-label={t("Close")}
                  onClick={() => setNotice("")}
                >
                  <X />
                </button>
              </div>
            )}

            <div className="launcher-toolbar">
              {selectedGame &&
                ["explore", "library"].includes(active) ? (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft />
                  {t(
                    active === "library"
                      ? "Library"
                      : "Explore",
                  )}
                </button>
              ) : (
                <h1>
                  {t(
                    {
                      explore: "Explore",
                      library: "Library",
                      downloads: "Downloads",
                      settings: "Settings",
                    }[active],
                  )}
                </h1>
              )}
              {["explore", "library"].includes(active) &&
                !selectedGame && (
                  <label className="launcher-search">
                    <MagnifyingGlass size={20} />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) =>
                        setQuery(event.target.value)
                      }
                      placeholder={t(
                        active === "explore"
                          ? "Search games"
                          : "Search your library",
                      )}
                      aria-label={t(
                        active === "explore"
                          ? "Search games"
                          : "Search your library",
                      )}
                      maxLength={120}
                    />
                  </label>
                )}
              <button
                type="button"
                className="btn btn--secondary"
                disabled={refreshing || updating || itchBusy}
                onClick={() => refresh(true)}
                aria-label={t("Refresh library")}
              >
                <ArrowsClockwise size={20} />
                {t(
                  refreshing
                    ? "Refreshing…"
                    : "Refresh library",
                )}
              </button>
            </div>
            {update?.available && (
              <div className="launcher-update" role="status">
                <span>
                  {t("Launcher update available")} ·{" "}
                  {update.latestVersion}
                </span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={
                    updating ||
                    running.size > 0 ||
                    queue.some(busyJob)
                  }
                  onClick={updateLauncher}
                >
                  {t(
                    updating
                      ? "Updating…"
                      : "Update launcher",
                  )}
                </button>
                {updating && (
                  <progress
                    max="100"
                    value={Math.max(
                      0,
                      Math.min(
                        100,
                        Number(
                          updateProgress?.percent,
                        ) || 0,
                      ),
                    )}
                    aria-label={t("Update progress")}
                  />
                )}
              </div>
            )}
            {library.status === "error" && (
              <State
                error={library.error}
                onRetry={() => refresh(true)}
              />
            )}
            {active === "settings" ? (
              <Settings
                language={language}
                setLanguage={setLanguage}
                itch={itch}
                busy={
                  itchBusy ||
                  refreshing ||
                  updating ||
                  running.size > 0 ||
                  pending.size > 0 ||
                  queue.some(busyJob)
                }
                onConnect={connectItch}
                onDisconnect={disconnectItch}
              />
            ) : active === "downloads" ? (
              <Downloads queue={queue} report={setNotice} />
            ) : selectedGame ? (
              <Detail
                key={selectedGame.id}
                game={selectedGame}
                entry={installed[selectedGame.id]}
                running={running.has(selectedGame.id)}
                busy={actionBusy(selectedGame.id)}
                onInstall={install}
                onPlay={play}
                onUninstall={setConfirm}
                onVerify={verifyPurchase}
                revision={revision}
              />
            ) : (
              <div className="launcher-library">
                {itch.configured && !itch.connected && (
                  <div className="game-meta launcher-connect">
                    <p>
                      {t(
                        "Connect itch.io to sync purchased games.",
                      )}
                    </p>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={
                        itchBusy ||
                        itch.connecting ||
                        refreshing
                      }
                      onClick={connectItch}
                    >
                      {t(
                        itch.connecting
                          ? "Connecting…"
                          : "Connect itch.io",
                      )}
                    </button>
                  </div>
                )}
                {active === "library" &&
                  quick.length > 0 &&
                  !query &&
                  !installedOnly && (
                    <section className="launcher-quick">
                      <h2>{t("Quick launch")}</h2>
                      <div>
                        {quick.map((game) => (
                          <button
                            type="button"
                            key={game.id}
                            disabled={
                              running.has(
                                game.id,
                              ) ||
                              actionBusy(game.id)
                            }
                            onClick={() =>
                              play(game)
                            }
                          >
                            <img
                              src={
                                safeImageUrl(
                                  game.heroImage,
                                ) ||
                                safeImageUrl(
                                  game.coverImage,
                                ) ||
                                "./assets/placeholders/game-cover.svg"
                              }
                              alt=""
                            />
                            <span>
                              <Play weight="fill" />
                              {game.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                <div className="launcher-library__head">
                  <h2>
                    {t(
                      active === "library"
                        ? "Your games"
                        : "Explore",
                    )}
                  </h2>
                  <label className="launcher-filter">
                    <input
                      type="checkbox"
                      checked={installedOnly}
                      onChange={(event) =>
                        setInstalledOnly(
                          event.target.checked,
                        )
                      }
                    />
                    {t("Installed only")}
                  </label>
                </div>
                {library.status === "loading" ? (
                  <div
                    className="launcher-grid"
                    role="status"
                    aria-label={t("Loading")}
                  >
                    {[0, 1, 2, 3].map((value) => (
                      <article
                        className="launcher-card"
                        key={value}
                      >
                        <Skeleton className="launcher-card__image" />
                        <Skeleton
                          style={{
                            height: 28,
                            width: "75%",
                            marginTop: 16,
                          }}
                        />
                      </article>
                    ))}
                  </div>
                ) : !filtered.length ? (
                  <State>
                    {t(
                      query || installedOnly
                        ? "No matching games."
                        : active === "explore"
                          ? "No games available."
                          : "Your library is empty.",
                    )}
                  </State>
                ) : (
                  <div className="launcher-grid">
                    {filtered.map((game) => (
                      <article
                        className="launcher-card"
                        key={game.id}
                      >
                        <button
                          type="button"
                          className="launcher-card__open"
                          onClick={() =>
                            setSelected(game.id)
                          }
                        >
                          <img
                            className="launcher-card__image"
                            src={
                              safeImageUrl(
                                game.coverImage,
                              ) ||
                              safeImageUrl(
                                game.heroImage,
                              ) ||
                              "./assets/placeholders/game-cover.svg"
                            }
                            alt=""
                            loading="lazy"
                          />
                          <h3>{game.title}</h3>
                        </button>
                        <p>
                          {t(
                            running.has(game.id)
                              ? "Running"
                              : canLaunch(game) &&
                                installed[
                                  game.id
                                ]?.path
                                ? "Installed"
                                : !game.downloadAvailable ||
                                  game.status !==
                                  "released"
                                  ? "Unavailable"
                                  : game.accessType ===
                                    "free"
                                    ? "Free"
                                    : game.owned
                                      ? "Owned"
                                      : "Purchase required",
                          )}
                        </p>
                        {canLaunch(game) &&
                          installed[game.id]?.path ? (
                          <button
                            type="button"
                            className="btn btn--secondary"
                            disabled={
                              running.has(
                                game.id,
                              ) ||
                              actionBusy(game.id)
                            }
                            onClick={() =>
                              play(game)
                            }
                          >
                            <Play weight="fill" />
                            {t("Play")}
                          </button>
                        ) : canLaunch(game) &&
                          game.downloadAvailable &&
                          game.status === "released" ? (
                          <button
                            type="button"
                            className="btn btn--secondary"
                            disabled={actionBusy(
                              game.id,
                            )}
                            onClick={() =>
                              install(game)
                            }
                          >
                            <DownloadSimple />
                            {t(
                              actionBusy(game.id)
                                ? "Preparing download…"
                                : "Download now",
                            )}
                          </button>
                        ) : !game.downloadAvailable ||
                          game.status !== "released" ? (
                          <button
                            type="button"
                            className="btn btn--secondary"
                            disabled
                          >
                            {t("Unavailable")}
                          </button>
                        ) : !canLaunch(game) &&
                          safeItchUrl(
                            game.purchaseUrl ||
                            game.itchUrl,
                          ) ? (
                          <a
                            className="btn btn--primary"
                            href={safeItchUrl(
                              game.purchaseUrl ||
                              game.itchUrl,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                              event.preventDefault();
                              openExternal(
                                event
                                  .currentTarget
                                  .href,
                              ).catch((failure) =>
                                setNotice(
                                  friendlyErrorMessage(
                                    failure,
                                  ),
                                ),
                              );
                            }}
                          >
                            {t("Buy on itch.io")}
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={() =>
                              setSelected(game.id)
                            }
                          >
                            {t("View details")}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
      <Modal
        open={Boolean(confirm)}
        onClose={() => {
          if (!confirm || !actionBusy(confirm.id)) setConfirm(null);
        }}
        labelledBy="uninstall-title"
      >
        <h2 id="uninstall-title">
          {t("Uninstall")} · {confirm?.title}
        </h2>
        <p>{t("Remove the installed game files?")}</p>
        <div className="launcher-game-actions">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={confirm && actionBusy(confirm.id)}
            onClick={() => setConfirm(null)}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={confirm && actionBusy(confirm.id)}
            onClick={uninstall}
          >
            {t("Uninstall")}
          </button>
        </div>
      </Modal>
    </LanguageContext.Provider>
  );
}
