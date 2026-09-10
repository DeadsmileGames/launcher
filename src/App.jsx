import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    Bell,
    CaretRight,
    CheckCircle,
    Compass,
    DownloadSimple,
    FilmStrip,
    GameController,
    GearSix,
    HeartStraight,
    MagnifyingGlass,
    Minus,
    PencilSimple,
    Play,
    Plus,
    ShieldCheck,
    SignOut,
    Square,
    Trash,
    UploadSimple,
    UserCircle,
    VideoCamera,
    X,
    Newspaper,
    WarningCircle,
    ImageSquare,
    LockKey,
    FloppyDisk,
    CalendarBlank,
    FolderOpen,
    MonitorPlay,
    Check,
    User,
    InstagramLogo,
    GithubLogo,
    Globe,
    LinkSimple,
} from "@phosphor-icons/react";
import { api } from "./services-api";

const SITE_URL = "https://deadsmile.vercel.app";
const API_ASSET_ROOT = SITE_URL;
const TABS = [
    { id: "explore", label: "Explore", icon: Compass },
    { id: "library", label: "Library", icon: GameController },
    { id: "wishlist", label: "Wishlist", icon: HeartStraight },
];

const LANGUAGES = [
    { id: "en", label: "English" },
    { id: "pt-BR", label: "Português (Brasil)" },
    { id: "es", label: "Español" },
];

const COPY = {
    en: {
        explore: "Explore",
        library: "Library",
        wishlist: "Wishlist",
        account: "Account",
        manage: "Manage account",
        logout: "Log out",
        launcher: "Launcher",
        launcherSettings: "Launcher settings",
        language: "Language",
        languageDescription:
            "Choose the language used by the launcher interface.",
        englishDefault: "English is the default language.",
        save: "Save settings",
        profile: "Profile",
        security: "Security",
        changePicture: "Change profile picture",
        websiteOnly:
            "Profile picture changes are available on the Deadsmile Games website.",
        websiteOnlyDescription:
            "Open your account on the website to upload or change your profile picture.",
        openWebsite: "Open website",
        close: "Close",
        games: "Games",
        videos: "Videos",
        newswire: "Newswire",
        viewAll: "View all",
        installed: "Installed",
        play: "Play",
        download: "Download",
        search: "Search games and add-ons",
        noResults: "No results found.",
        game: "Game",
        video: "Video",
        starting: "Starting…",
        downloading: "Downloading…",
        installing: "Installing…",
        ready: "Ready",
        startingLauncher: "Starting launcher",
        signingIn: "Signing in…",
        verifySignIn: "Verify & sign in",
        signIn: "Sign in",
        welcome: "Welcome back.",
        verifyAccount: "Verify your account",
        verifyDescription:
            "Enter the six-digit code from your authenticator app.",
        signInDescription: "Sign in to continue to Deadsmile Games.",
        email: "Email",
        password: "Password",
        authCode: "Authentication code",
        createAccount: "Create account",
        needHelp: "Need help?",
        browseCatalog: "Browse the Deadsmile Games catalog.",
        yourDownloads: "Your downloaded Deadsmile Games.",
        wishlistDesc: "Games you want to keep an eye on.",
        watchVideos:
            "Watch Deadsmile Games videos without leaving the launcher.",
        latest: "The latest from Deadsmile Games.",
        about: "About",
        screenshots: "Screenshots",
        status: "Status",
        genres: "Genres",
        platforms: "Platforms",
        release: "Release",
        trailer: "Trailer",
        wishlisted: "Wishlisted",
        emptyLibrary: "Your library is empty",
        emptyLibraryText:
            "Download a game from Explore and it will appear here.",
        nothingSaved: "Nothing saved yet",
        nothingSavedText: "Add games to your wishlist and find them here.",
        exploreGames: "Explore games",
        localGame: "Local game",
        notifications: "Notifications",
        noNotifications: "No recent notifications.",
        markRead: "Mark all read",
        updateAvailable: "Launcher update available",
        updateDescription:
            "A newer version of Deadsmile Games Launcher is ready.",
        update: "Update",
        later: "Later",
        updating: "Updating… Please Wait.",
        downloadingUpdate: "Downloading",
        installingUpdate: "Installing",
        doNotClose: "Please do not close the launcher while it is updating.",
        updateReady: "Update ready",
        downloadComplete: "Download complete",
        downloadFailed: "Download failed",
        gameReady: "is ready in your library.",
        gameRemoved: "was removed from your library.",
        manageContent: "Manage content",
        manageDescription:
            "Publish and manage games, news and videos from the launcher.",
        contentLibrary: "Content library",
        everything: "Everything you publish",
        refresh: "Refresh",
        nothingPublished: "Nothing published yet.",
        publish: "Publish",
        newGame: "New game",
        newNews: "New news",
        newVideo: "New video",
        deleteItem: "Delete this item permanently?",
        publishedContent: "Published content",
        saveProfile: "Save profile",
        saving: "Saving…",
        profileDetails: "Profile details",
        profileDescription:
            "Manage how your public profile appears across Deadsmile Games.",
        username: "Username",
        bio: "Bio",
        website: "Website",
        location: "Location",
        accountDescription:
            "Manage the email associated with your Deadsmile Games account.",
        twoFactor: "Two-factor authentication",
        enabled: "Enabled",
        notEnabled: "Not enabled",
        manage2fa: "Manage 2FA",
        setUp2fa: "Set up 2FA",
        accountManagement: "Account management",
        accountManagementDescription:
            "For password recovery, account deletion and other sensitive account operations, use the secure account center.",
        openAccountCenter: "Open account center",
        languageSaved: "Language saved.",
        changesSaved: "Changes saved.",
        feedback: "Send feedback",
        downloadApp: "Download official app",
        linksSocials: "Links & socials",
        downloadUnavailable:
            "This game is not available on itch.io for Windows yet.",
    },
    "pt-BR": {
        explore: "Explorar",
        library: "Biblioteca",
        wishlist: "Lista de desejos",
        account: "Conta",
        manage: "Gerenciar conta",
        logout: "Sair",
        launcher: "Launcher",
        launcherSettings: "Configurações do launcher",
        language: "Idioma",
        languageDescription:
            "Escolha o idioma usado pela interface do launcher.",
        englishDefault: "Inglês é o idioma padrão.",
        save: "Salvar configurações",
        profile: "Perfil",
        security: "Segurança",
        changePicture: "Alterar foto de perfil",
        websiteOnly:
            "A alteração da foto de perfil está disponível no site da Deadsmile Games.",
        websiteOnlyDescription:
            "Abra sua conta no site para enviar ou alterar sua foto de perfil.",
        openWebsite: "Abrir site",
        close: "Fechar",
        linksSocials: "Links e redes",
        companyLinks: "Links da Deadsmile Games",
        wishlistAccount: "Seus jogos salvos",
        games: "Jogos",
        videos: "Vídeos",
        newswire: "Newswire",
        viewAll: "Ver tudo",
        installed: "Instalado",
        play: "Jogar",
        download: "Baixar",
        search: "Pesquisar jogos e extras",
        noResults: "Nenhum resultado encontrado.",
        game: "Jogo",
        video: "Vídeo",
        starting: "Iniciando…",
        downloading: "Baixando…",
        installing: "Instalando…",
        ready: "Pronto",
        startingLauncher: "Iniciando launcher",
        signingIn: "Entrando…",
        verifySignIn: "Verificar e entrar",
        signIn: "Entrar",
        welcome: "Bem-vindo de volta.",
        verifyAccount: "Verifique sua conta",
        verifyDescription:
            "Digite o código de seis dígitos do seu aplicativo autenticador.",
        signInDescription: "Entre para continuar na Deadsmile Games.",
        email: "E-mail",
        password: "Senha",
        authCode: "Código de autenticação",
        createAccount: "Criar conta",
        needHelp: "Precisa de ajuda?",
        browseCatalog: "Explore o catálogo da Deadsmile Games.",
        yourDownloads: "Seus jogos Deadsmile Games baixados.",
        wishlistDesc: "Jogos que você quer acompanhar.",
        watchVideos:
            "Assista aos vídeos da Deadsmile Games sem sair do launcher.",
        latest: "As novidades da Deadsmile Games.",
        about: "Sobre",
        screenshots: "Capturas de tela",
        status: "Status",
        genres: "Gêneros",
        platforms: "Plataformas",
        release: "Lançamento",
        trailer: "Trailer",
        wishlisted: "Na lista",
        emptyLibrary: "Sua biblioteca está vazia",
        emptyLibraryText: "Baixe um jogo em Explorar e ele aparecerá aqui.",
        nothingSaved: "Nada salvo ainda",
        nothingSavedText:
            "Adicione jogos à sua lista de desejos e encontre-os aqui.",
        exploreGames: "Explorar jogos",
        localGame: "Jogo local",
        notifications: "Notificações",
        noNotifications: "Nenhuma notificação recente.",
        markRead: "Marcar todas como lidas",
        updateAvailable: "Atualização do launcher disponível",
        updateDescription:
            "Uma versão mais nova do Deadsmile Games Launcher está pronta.",
        update: "Atualizar",
        later: "Depois",
        updating: "Atualizando… Aguarde.",
        downloadingUpdate: "Baixando",
        installingUpdate: "Instalando",
        doNotClose: "Não feche o launcher enquanto ele estiver atualizando.",
        updateReady: "Atualização pronta",
        downloadComplete: "Download concluído",
        downloadFailed: "Falha no download",
        gameReady: "está pronto na sua biblioteca.",
        gameRemoved: "foi removido da sua biblioteca.",
        manageContent: "Gerenciar conteúdo",
        manageDescription:
            "Publique e gerencie jogos, notícias e vídeos pelo launcher.",
        contentLibrary: "Biblioteca de conteúdo",
        everything: "Tudo que você publica",
        refresh: "Atualizar",
        nothingPublished: "Nada publicado ainda.",
        publish: "Publicar",
        newGame: "Novo jogo",
        newNews: "Nova notícia",
        newVideo: "Novo vídeo",
        deleteItem: "Excluir este item permanentemente?",
        publishedContent: "Conteúdo publicado",
        saveProfile: "Salvar perfil",
        saving: "Salvando…",
        profileDetails: "Detalhes do perfil",
        profileDescription:
            "Gerencie como seu perfil público aparece na Deadsmile Games.",
        username: "Nome de usuário",
        bio: "Bio",
        website: "Site",
        location: "Localização",
        accountDescription:
            "Gerencie o e-mail associado à sua conta Deadsmile Games.",
        twoFactor: "Autenticação de dois fatores",
        enabled: "Ativado",
        notEnabled: "Não ativado",
        manage2fa: "Gerenciar 2FA",
        setUp2fa: "Configurar 2FA",
        accountManagement: "Gerenciamento da conta",
        accountManagementDescription:
            "Para recuperação de senha, exclusão da conta e outras operações sensíveis, use a central segura da conta.",
        openAccountCenter: "Abrir central da conta",
        languageSaved: "Idioma salvo.",
        changesSaved: "Alterações salvas.",
        feedback: "Enviar feedback",
        downloadApp: "Baixar app oficial",
        downloadUnavailable: "Este jogo ainda não está disponível no itch.io.",
    },
    es: {
        explore: "Explorar",
        library: "Biblioteca",
        wishlist: "Lista de deseos",
        account: "Cuenta",
        manage: "Gestionar cuenta",
        logout: "Cerrar sesión",
        launcher: "Launcher",
        launcherSettings: "Configuración del launcher",
        language: "Idioma",
        languageDescription: "Elige el idioma de la interfaz del launcher.",
        englishDefault: "El inglés es el idioma predeterminado.",
        save: "Guardar configuración",
        profile: "Perfil",
        security: "Seguridad",
        changePicture: "Cambiar foto de perfil",
        websiteOnly:
            "El cambio de foto de perfil está disponible en el sitio de Deadsmile Games.",
        websiteOnlyDescription:
            "Abre tu cuenta en el sitio para subir o cambiar tu foto de perfil.",
        openWebsite: "Abrir sitio",
        close: "Cerrar",
        linksSocials: "Enlaces y redes",
        companyLinks: "Enlaces de Deadsmile Games",
        wishlistAccount: "Tus juegos guardados",
        games: "Juegos",
        videos: "Vídeos",
        newswire: "Newswire",
        viewAll: "Ver todo",
        installed: "Instalado",
        play: "Jugar",
        download: "Descargar",
        search: "Buscar juegos y extras",
        noResults: "No se encontraron resultados.",
        game: "Juego",
        video: "Vídeo",
        starting: "Iniciando…",
        downloading: "Descargando…",
        installing: "Instalando…",
        ready: "Listo",
        startingLauncher: "Iniciando launcher",
        signingIn: "Iniciando sesión…",
        verifySignIn: "Verificar y entrar",
        signIn: "Entrar",
        welcome: "Bienvenido de nuevo.",
        verifyAccount: "Verifica tu cuenta",
        verifyDescription:
            "Introduce el código de seis dígitos de tu aplicación autenticadora.",
        signInDescription: "Inicia sesión para continuar en Deadsmile Games.",
        email: "Correo electrónico",
        password: "Contraseña",
        authCode: "Código de autenticación",
        createAccount: "Crear cuenta",
        needHelp: "¿Necesitas ayuda?",
        browseCatalog: "Explora el catálogo de Deadsmile Games.",
        yourDownloads: "Tus juegos de Deadsmile Games descargados.",
        wishlistDesc: "Juegos que quieres seguir.",
        watchVideos: "Mira vídeos de Deadsmile Games sin salir del launcher.",
        latest: "Las novedades de Deadsmile Games.",
        about: "Acerca de",
        screenshots: "Capturas",
        status: "Estado",
        genres: "Géneros",
        platforms: "Plataformas",
        release: "Lanzamiento",
        trailer: "Tráiler",
        wishlisted: "En deseos",
        emptyLibrary: "Tu biblioteca está vacía",
        emptyLibraryText: "Descarga un juego desde Explorar y aparecerá aquí.",
        nothingSaved: "Nada guardado todavía",
        nothingSavedText:
            "Añade juegos a tu lista de deseos y encuéntralos aquí.",
        exploreGames: "Explorar juegos",
        localGame: "Juego local",
        notifications: "Notificaciones",
        noNotifications: "No hay notificaciones recientes.",
        markRead: "Marcar todas como leídas",
        updateAvailable: "Actualización del launcher disponible",
        updateDescription:
            "Ya está disponible una versión más nueva de Deadsmile Games Launcher.",
        update: "Actualizar",
        later: "Más tarde",
        updating: "Actualizando… Espera.",
        downloadingUpdate: "Descargando",
        installingUpdate: "Instalando",
        doNotClose: "No cierres el launcher mientras se actualiza.",
        updateReady: "Actualización lista",
        downloadComplete: "Descarga completada",
        downloadFailed: "Error de descarga",
        gameReady: "está listo en tu biblioteca.",
        gameRemoved: "se eliminó de tu biblioteca.",
        manageContent: "Gestionar contenido",
        manageDescription:
            "Publica y gestiona juegos, noticias y vídeos desde el launcher.",
        contentLibrary: "Biblioteca de contenido",
        everything: "Todo lo que publicas",
        refresh: "Actualizar",
        nothingPublished: "No hay publicaciones todavía.",
        publish: "Publicar",
        newGame: "Nuevo juego",
        newNews: "Nueva noticia",
        newVideo: "Nuevo vídeo",
        deleteItem: "¿Eliminar este elemento permanentemente?",
        publishedContent: "Contenido publicado",
        saveProfile: "Guardar perfil",
        saving: "Guardando…",
        profileDetails: "Detalles del perfil",
        profileDescription:
            "Gestiona cómo aparece tu perfil público en Deadsmile Games.",
        username: "Nombre de usuario",
        bio: "Bio",
        website: "Sitio web",
        location: "Ubicación",
        accountDescription:
            "Gestiona el correo asociado a tu cuenta de Deadsmile Games.",
        twoFactor: "Autenticación de dos factores",
        enabled: "Activado",
        notEnabled: "No activado",
        manage2fa: "Gestionar 2FA",
        setUp2fa: "Configurar 2FA",
        accountManagement: "Gestión de la cuenta",
        accountManagementDescription:
            "Para recuperar la contraseña, eliminar la cuenta y otras operaciones sensibles, usa el centro seguro de la cuenta.",
        openAccountCenter: "Abrir centro de cuenta",
        languageSaved: "Idioma guardado.",
        changesSaved: "Cambios guardados.",
        feedback: "Enviar comentarios",
        downloadApp: "Descargar app oficial",
        downloadUnavailable:
            "Este juego todavía no está disponible en itch.io.",
    },
};

let ACTIVE_LANGUAGE = "en";
function text(language, key) {
    return COPY[language]?.[key] || COPY.en[key] || key;
}
function ui(key, fallback = key) {
    return COPY[ACTIVE_LANGUAGE]?.[key] || COPY.en[key] || fallback;
}
const FALLBACK_MARK = `${SITE_URL}/assets/branding/deadsmile-mark.svg`;
const FALLBACK_COVER = `${SITE_URL}/assets/placeholders/game-cover.svg`;
const FALLBACK_HERO = `${SITE_URL}/assets/placeholders/game-hero.svg`;

function openExternal(url) {
    if (!url) return;
    if (window.deadsmile?.openExternal)
        return window.deadsmile.openExternal(url);
    window.open(url, "_blank", "noopener,noreferrer");
}

function listFrom(data, key) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.[key])) return data[key];
    return [];
}

function assetUrl(value, fallback) {
    if (!value) return fallback;
    try {
        const url = new URL(value, API_ASSET_ROOT);
        return url.toString();
    } catch {
        return fallback;
    }
}

function imageOf(game) {
    return assetUrl(
        game?.coverImage || game?.cover_image,
        game?.heroImage
            ? assetUrl(game.heroImage, FALLBACK_COVER)
            : FALLBACK_COVER,
    );
}
function heroOf(game) {
    return assetUrl(
        game?.heroImage ||
            game?.hero_image ||
            game?.coverImage ||
            game?.cover_image,
        FALLBACK_HERO,
    );
}
function mediaUrl(value) {
    return assetUrl(value, "");
}
function slugOf(game) {
    return game?.slug || game?.id;
}
function isAdmin(user) {
    return user?.role === "admin";
}
function initials(user) {
    return String(user?.username || user?.email || "P")
        .slice(0, 1)
        .toUpperCase();
}

const MAX_IMAGE_WIDTH = 1280;
const MAX_IMAGE_HEIGHT = 720;
const imageCache = new Map();
const IMAGE_CACHE_LIMIT = 32;

function rememberImage(key, value) {
    if (imageCache.has(key)) imageCache.delete(key);
    imageCache.set(key, value);
    while (imageCache.size > IMAGE_CACHE_LIMIT) {
        const [oldKey, oldUrl] = imageCache.entries().next().value;
        imageCache.delete(oldKey);
        try {
            URL.revokeObjectURL(oldUrl);
        } catch {}
    }
}

function SmartImage({ src, fallback, alt = "", className = "", ...props }) {
    const holderRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [current, setCurrent] = useState("");
    const [optimized, setOptimized] = useState("");

    useEffect(() => {
        const original = assetUrl(src, fallback);
        setReady(false);
        setCurrent("");
        setOptimized("");
        if (!original) return undefined;

        const cached = imageCache.get(original);
        if (cached) {
            setOptimized(cached);
            setReady(true);
            return undefined;
        }

        const isVector = /\.svg(?:[?#]|$)/i.test(original);
        let cancelled = false;
        let observer;

        const load = async () => {
            if (cancelled) return;
            if (isVector) {
                setCurrent(original);
                setReady(true);
                return;
            }

            try {
                const response = await fetch(original, {
                    mode: "cors",
                    credentials: "omit",
                });
                if (!response.ok) throw new Error("image fetch failed");
                const blob = await response.blob();
                if (
                    !blob.type.startsWith("image/") ||
                    blob.type.includes("svg")
                )
                    throw new Error("unsupported image");

                const bitmap = await createImageBitmap(blob);
                if (cancelled) {
                    bitmap.close();
                    return;
                }

                const scale = Math.min(
                    1,
                    MAX_IMAGE_WIDTH / bitmap.width,
                    MAX_IMAGE_HEIGHT / bitmap.height,
                );
                if (scale >= 1) {
                    bitmap.close();
                    setCurrent(original);
                    setReady(true);
                    return;
                }

                const width = Math.max(1, Math.round(bitmap.width * scale));
                const height = Math.max(1, Math.round(bitmap.height * scale));
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d", {
                    alpha: true,
                    desynchronized: true,
                });
                if (!ctx) {
                    bitmap.close();
                    setCurrent(original);
                    setReady(true);
                    return;
                }
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(bitmap, 0, 0, width, height);
                bitmap.close();

                const output = await new Promise((resolve) =>
                    canvas.toBlob(resolve, "image/webp", 0.8),
                );
                if (!output || cancelled) {
                    setCurrent(original);
                    setReady(true);
                    return;
                }

                const objectUrl = URL.createObjectURL(output);
                rememberImage(original, objectUrl);
                setOptimized(objectUrl);
                setReady(true);
            } catch {
                if (!cancelled) {
                    setCurrent(original);
                    setReady(true);
                }
            }
        };

        if ("IntersectionObserver" in window && holderRef.current) {
            observer = new IntersectionObserver(
                (entries) => {
                    if (entries.some((entry) => entry.isIntersecting)) {
                        observer.disconnect();
                        load();
                    }
                },
                { rootMargin: "240px" },
            );
            observer.observe(holderRef.current);
        } else {
            load();
        }

        return () => {
            cancelled = true;
            observer?.disconnect();
        };
    }, [src, fallback]);

    const finalSrc = optimized || current || fallback;
    return (
        <span
            ref={holderRef}
            className={`smart-image ${className || ""}`}
            style={props.style}
        >
            {ready && (
                <img
                    src={finalSrc}
                    alt={alt}
                    decoding="async"
                    loading="lazy"
                    {...Object.fromEntries(
                        Object.entries(props).filter(
                            ([key]) => key !== "style" && key !== "loading",
                        ),
                    )}
                    onError={(e) => {
                        if (current && e.currentTarget.src !== current)
                            e.currentTarget.src = current;
                    }}
                />
            )}
        </span>
    );
}

function WindowChrome({ locked = false }) {
    return (
        <header className="window-chrome">
            <div
                className="window-drag-zone"
                onDoubleClick={() => window.deadsmile?.window?.toggleMaximize()}
            />
            <div className="window-controls">
                <span className="window-status-dot" aria-hidden="true" />
                <button
                    type="button"
                    onClick={() => window.deadsmile?.window?.minimize()}
                    aria-label="Minimize"
                >
                    <Minus size={18} weight="bold" />
                </button>
                <button
                    type="button"
                    onClick={() => window.deadsmile?.window?.toggleMaximize()}
                    aria-label="Maximize"
                >
                    <Square size={16} weight="bold" />
                </button>
                <button
                    type="button"
                    className="window-close"
                    onClick={() => !locked && window.deadsmile?.window?.close()}
                    aria-label="Close"
                    disabled={locked}
                >
                    <X size={18} weight="bold" />
                </button>
            </div>
        </header>
    );
}

function LoadingBar({ label, percent, indeterminate = false }) {
    return (
        <div
            className={`loading-bar-wrap ${indeterminate ? "indeterminate" : ""}`}
        >
            <span>{label}</span>
            <div className="loading-bar">
                <i
                    style={
                        indeterminate
                            ? undefined
                            : {
                                  width: `${Math.max(0, Math.min(100, percent || 0))}%`,
                              }
                    }
                />
            </div>
        </div>
    );
}

function Boot() {
    return (
        <div className="boot-screen">
            <img
                className="boot-logo"
                src="./assets/branding/deadsmile-mark.svg"
                alt="Deadsmile Games"
            />
            <div className="boot-status">
                <span>{ui("startingLauncher")}</span>
                <div className="loading-bar">
                    <i />
                </div>
            </div>
        </div>
    );
}

function Login({ onAuthenticated }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState("");
    const [twoFactor, setTwoFactor] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    async function submit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const result = twoFactor
                ? await api.post("/auth/verify-2fa", {
                      token: token.replace(/\D/g, "").slice(0, 6),
                  })
                : await api.post("/auth/mobile-login", { email, password });
            if (!twoFactor && result?.requiresTwoFactor) {
                setTwoFactor(true);
                setToken("");
            } else onAuthenticated(result);
        } catch (err) {
            setError(err?.message || "Unable to sign in.");
        } finally {
            setLoading(false);
        }
    }
    return (
        <main className="login-screen">
            <div className="login-art" />
            <div className="login-vignette" />
            <section className="login-card">
                <div className="login-heading">
                    <h1>{twoFactor ? ui("verifyAccount") : ui("welcome")}</h1>
                    <p>
                        {twoFactor
                            ? ui("verifyDescription")
                            : ui("signInDescription")}
                    </p>
                </div>
                {error && (
                    <div className="error-message">
                        <WarningCircle size={18} />
                        {error}
                    </div>
                )}
                <form onSubmit={submit}>
                    {!twoFactor ? (
                        <>
                            <label>
                                {ui("email")}
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    required
                                />
                            </label>
                            <label>
                                {ui("password")}
                                <input
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="Your password"
                                    required
                                />
                            </label>
                        </>
                    ) : (
                        <label>
                            {ui("authCode")}
                            <input
                                className="code-input"
                                value={token}
                                onChange={(e) =>
                                    setToken(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6),
                                    )
                                }
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                autoFocus
                                placeholder="000000"
                                required
                            />
                        </label>
                    )}
                    <button className="primary-button full" disabled={loading}>
                        {loading
                            ? ui("signingIn")
                            : twoFactor
                              ? ui("verifySignIn")
                              : ui("signIn")}
                    </button>
                </form>
                <div className="login-links">
                    <button
                        type="button"
                        onClick={() => openExternal(`${SITE_URL}/register`)}
                    >
                        {ui("createAccount")}
                    </button>
                    <button
                        type="button"
                        onClick={() => openExternal(`${SITE_URL}/support`)}
                    >
                        {ui("needHelp")}
                    </button>
                </div>
            </section>
        </main>
    );
}

function Sidebar({ active, setActive, user, logout, openAdmin, language }) {
    return (
        <aside className="sidebar">
            <button
                className="side-logo"
                onClick={() => setActive("explore")}
                aria-label="Deadsmile Games"
            >
                <img src="./assets/branding/deadsmile-mark.svg" alt="" />
            </button>
            <nav className="main-nav">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        className={active === id ? "active" : ""}
                        onClick={() => setActive(id)}
                    >
                        <Icon
                            size={21}
                            weight={active === id ? "fill" : "regular"}
                        />
                        <span>{text(language, id)}</span>
                    </button>
                ))}
            </nav>
            <div className="sidebar-bottom">
                {isAdmin(user) && (
                    <button
                        className={
                            active === "admin"
                                ? "nav-item active admin-nav"
                                : "nav-item admin-nav"
                        }
                        onClick={openAdmin}
                    >
                        <GearSix size={21} />
                        <span>{text(language, "manage")}</span>
                    </button>
                )}
                <button
                    className={
                        active === "account"
                            ? "profile-tile active"
                            : "profile-tile"
                    }
                    onClick={() => setActive("account")}
                >
                    <div className="avatar">
                        {user?.avatarUrl ? (
                            <SmartImage
                                src={user.avatarUrl}
                                fallback=""
                                alt=""
                            />
                        ) : (
                            <span>{initials(user)}</span>
                        )}
                    </div>
                    <div className="profile-copy">
                        <strong>{user?.username || "Player"}</strong>
                        <span>{text(language, "account")}</span>
                    </div>
                    <CaretRight size={16} />
                </button>
                <button className="logout-button" onClick={logout}>
                    <SignOut size={18} />
                    <span>{text(language, "logout")}</span>
                </button>
            </div>
        </aside>
    );
}

function SocialLinks({ onClose, language }) {
    const links = [
        {
            label: "Instagram",
            url: "https://instagram.com/teamdeadsmile",
            icon: InstagramLogo,
        },
        { label: "Website", url: "https://deadsmile.vercel.app", icon: Globe },
        {
            label: "Linktree",
            url: "https://linktr.ee/teamdeadsmile",
            icon: LinkSimple,
        },
        {
            label: "GitHub",
            url: "https://github.com/teamdeadsmile",
            icon: GithubLogo,
        },
        {
            label: "Itch.io",
            url: "https://deadsml.itch.io",
            icon: GameController,
        },
    ];
    return (
        <div
            className="overlay social-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <section className="social-modal">
                <div className="modal-card__head">
                    <div>
                        <small>{text(language, "launcher")}</small>
                        <h3>{text(language, "companyLinks")}</h3>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <div className="social-list">
                    {links.map(({ label, url, icon: Icon }) => (
                        <button key={url} onClick={() => openExternal(url)}>
                            <span className="social-icon">
                                <Icon size={19} />
                            </span>
                            <span>{label}</span>
                            <ArrowUpRight size={16} />
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

function SearchBar({ query, setQuery, results, openGame }) {
    return (
        <div className="search-wrap">
            <MagnifyingGlass size={18} />
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ui("search")}
                aria-label={ui("search")}
            />
            {query && (
                <button className="search-clear" onClick={() => setQuery("")}>
                    <X size={15} />
                </button>
            )}
            {query.trim() && (
                <div className="search-results">
                    {results.length ? (
                        results.slice(0, 8).map((item) => (
                            <button
                                key={`${item.type}-${item.id || item.slug}`}
                                onClick={() =>
                                    item.type === "game" && openGame(item)
                                }
                            >
                                <SmartImage
                                    src={
                                        item.type === "game"
                                            ? imageOf(item)
                                            : item.image
                                    }
                                    fallback={
                                        item.type === "game"
                                            ? FALLBACK_COVER
                                            : `${SITE_URL}/assets/placeholders/game-cover.svg`
                                    }
                                    alt=""
                                    style={{
                                        aspectRatio: 16 / 9,
                                    }}
                                />
                                <span>
                                    <strong>{item.title}</strong>
                                    <small>
                                        {item.type === "game"
                                            ? ui("game")
                                            : item.type === "video"
                                              ? ui("video")
                                              : ui("newswire")}
                                    </small>
                                </span>
                                <CaretRight size={15} />
                            </button>
                        ))
                    ) : (
                        <div className="search-empty">{ui("noResults")}</div>
                    )}
                </div>
            )}
        </div>
    );
}
function TopActions({
    query,
    setQuery,
    searchResults,
    openGame,
    onBack,
    onForward,
    onNotifications,
    notificationsUnread,
}) {
    return (
        <div className="content-toolbar">
            <div className="history-buttons">
                <button onClick={onBack} aria-label="Back">
                    <ArrowLeft size={18} />
                </button>
                <button onClick={onForward} aria-label="Forward">
                    <ArrowRight size={18} />
                </button>
            </div>
            <SearchBar
                query={query}
                setQuery={setQuery}
                results={searchResults}
                openGame={openGame}
            />
            <div className="toolbar-spacer" />
            <button
                className="toolbar-icon notification-trigger"
                aria-label={ui("notifications")}
                onClick={onNotifications}
            >
                <Bell size={19} />
            </button>
        </div>
    );
}

function GameCard({
    game,
    wishlisted,
    onWishlist,
    onOpen,
    onInstall,
    installed,
    downloading,
}) {
    const progress = downloading?.percent;
    return (
        <article className="game-card">
            <button className="game-card-image" onClick={() => onOpen(game)}>
                <SmartImage
                    src={imageOf(game)}
                    fallback={FALLBACK_COVER}
                    alt={game.title || ""}
                    loading="lazy"
                />
                <span className="card-arrow">
                    <ArrowUpRight size={19} />
                </span>
                {progress !== undefined && (
                    <span className="card-progress">
                        <i style={{ width: `${progress || 0}%` }} />
                    </span>
                )}
            </button>
            <div className="game-card-body">
                <button
                    className="game-card-title"
                    onClick={() => onOpen(game)}
                >
                    <strong>{game.title}</strong>
                    <span>
                        {(game.genres || []).slice(0, 2).join(" · ") ||
                            game.status ||
                            "Game"}
                    </span>
                </button>
                <div className="game-card-actions">
                    <button
                        className={
                            wishlisted
                                ? "round-action selected"
                                : "round-action"
                        }
                        onClick={() => onWishlist(game)}
                        aria-label="Wishlist"
                    >
                        <HeartStraight
                            size={17}
                            weight={wishlisted ? "fill" : "regular"}
                        />
                    </button>
                    {game.downloadUrl && (
                        <button
                            className="install-button"
                            onClick={() => onInstall(game, installed)}
                            disabled={Boolean(downloading)}
                        >
                            {downloading ? (
                                `${progress || 0}%`
                            ) : installed ? (
                                <>
                                    <Play size={14} weight="fill" />{" "}
                                    {ui("play")}
                                </>
                            ) : (
                                <>
                                    <DownloadSimple size={14} />{" "}
                                    {ui("download")}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
function Section({ title, action, onAction, children }) {
    return (
        <section className="content-section">
            <div className="section-title">
                <h2>{title}</h2>
                {action && (
                    <button onClick={onAction}>
                        {action}
                        <CaretRight size={15} />
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}
function PageHeading({ title, description }) {
    return (
        <header className="page-heading">
            <h1>{title}</h1>
            <p>{description}</p>
        </header>
    );
}
function LoadingGrid() {
    return (
        <div className="game-grid">
            {Array.from({ length: 4 }).map((_, i) => (
                <div className="skeleton" key={i}>
                    <div />
                </div>
            ))}
        </div>
    );
}
function Empty({ title, text, action, onAction }) {
    return (
        <div className="empty-state">
            <GameController size={32} />
            <h2>{title}</h2>
            <p>{text}</p>
            {action && (
                <button className="soft-button" onClick={onAction}>
                    {action}
                    <CaretRight size={16} />
                </button>
            )}
        </div>
    );
}
function NotificationsPanel({ notifications, onClose, onClear }) {
    return (
        <div className="notifications-popover">
            <div className="notifications-head">
                <div>
                    <h3>{ui("notifications")}</h3>
                </div>
                <button onClick={onClose}>
                    <X size={17} />
                </button>
            </div>
            {notifications.length ? (
                <div className="notifications-list">
                    {notifications.slice(0, 10).map((item, i) => (
                        <article
                            className={`notification-item ${item.unread ? "unread" : ""}`}
                            key={item.id || i}
                        >
                            <div className="notification-dot" />
                            <div>
                                <strong>{item.title}</strong>
                                <p>{item.message}</p>
                                <small>
                                    {item.time
                                        ? new Date(item.time).toLocaleString()
                                        : ""}
                                </small>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="notifications-empty">
                    <Bell size={24} />
                    <span>{ui("noNotifications")}</span>
                </div>
            )}
            {notifications.length > 0 && (
                <button className="notifications-clear" onClick={onClear}>
                    {ui("markRead")}
                </button>
            )}
        </div>
    );
}

function UpdateOverlay({ info, progress, onUpdate, onLater, updating }) {
    if (!info) return null;
    if (updating)
        return (
            <div className="update-lock overlay">
                <section className="update-panel locked">
                    <img src="./assets/branding/deadsmile-mark.svg" alt="" />
                    <h2>{ui("updating")}</h2>
                    <p>{ui("doNotClose")}</p>
                    <LoadingBar
                        label={
                            progress?.status === "installing"
                                ? ui("installingUpdate")
                                : ui("downloadingUpdate")
                        }
                        percent={progress?.percent || 0}
                    />
                </section>
            </div>
        );
    return (
        <div className="update-overlay overlay">
            <section className="update-panel">
                <img src="./assets/branding/deadsmile-mark.svg" alt="" />
                <small>{ui("launcher")}</small>
                <h2>{ui("updateAvailable")}</h2>
                <p>
                    {ui("updateDescription")}{" "}
                    <strong>v{info.latestVersion}</strong>
                </p>
                {info.notes && <div className="update-notes">{info.notes}</div>}
                <div className="update-actions">
                    <button className="soft-button" onClick={onLater}>
                        {ui("later")}
                    </button>
                    <button className="primary-button" onClick={onUpdate}>
                        {ui("update")} <ArrowRight size={16} />
                    </button>
                </div>
            </section>
        </div>
    );
}

function Explore({
    games,
    news,
    videos,
    loading,
    wishlisted,
    onWishlist,
    onInstall,
    downloading,
    installed,
    openGame,
    openVideo,
    setView,
}) {
    const hero = games.find((g) => g.featured) || games[0];
    return (
        <div className="page explore-page">
            {hero && (
                <section className="hero-card">
                    <SmartImage
                        className="hero-media"
                        src={heroOf(hero)}
                        fallback={FALLBACK_HERO}
                        alt=""
                    />
                    <div className="hero-shade" />
                    <div className="hero-copy">
                        <h1>{hero.title}</h1>
                        <p>
                            {hero.shortDescription ||
                                hero.description ||
                                "Discover the latest from Deadsmile Games."}
                        </p>
                        <div className="hero-buttons">
                            <button
                                className="primary-button"
                                onClick={() => openGame(hero)}
                            >
                                View game <CaretRight size={17} />
                            </button>
                            {hero.downloadUrl && (
                                <button
                                    className="soft-button"
                                    onClick={() =>
                                        onInstall(hero, Boolean(installed?.[hero.id]))
                                    }
                                    disabled={Boolean(downloading[hero.id])}
                                >
                                    {downloading[hero.id] ? (
                                        <>
                                            <DownloadSimple size={17} />{" "}
                                            {ui("downloading")}
                                        </>
                                    ) : installed?.[hero.id] ? (
                                        <>
                                            <Play size={17} weight="fill" />{" "}
                                            {ui("play")}
                                        </>
                                    ) : (
                                        <>
                                            <DownloadSimple size={17} />{" "}
                                            {ui("download")}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}
            <Section
                title={ui("games")}
                action={ui("viewAll")}
                onAction={() => setView({ type: "catalog" })}
            >
                {loading ? (
                    <LoadingGrid />
                ) : (
                    <div className="game-grid">
                        {games.slice(0, 8).map((g) => (
                            <GameCard
                                key={g.id || g.slug}
                                game={g}
                                wishlisted={wishlisted.has(g.id)}
                                onWishlist={onWishlist}
                                onOpen={openGame}
                                onInstall={onInstall}
                                installed={Boolean(installed?.[g.id])}
                                downloading={downloading[g.id]}
                            />
                        ))}
                    </div>
                )}
            </Section>
            {videos.length > 0 && (
                <Section
                    title={ui("videos")}
                    action={ui("viewAll")}
                    onAction={() => setView({ type: "videos" })}
                >
                    <div className="media-grid">
                        {videos.slice(0, 3).map((v) => (
                            <button
                                className="media-card"
                                key={v.id}
                                onClick={() => openVideo(v)}
                            >
                                <div className="media-image">
                                    <SmartImage
                                        src={v.thumbnail}
                                        fallback={FALLBACK_COVER}
                                        alt=""
                                    />
                                    <span>
                                        <Play size={21} weight="fill" />
                                    </span>
                                </div>
                                <div>
                                    <small>{v.category || ui("video")}</small>
                                    <strong>{v.title}</strong>
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>
            )}
            {news.length > 0 && (
                <Section
                    title={ui("newswire")}
                    action={ui("viewAll")}
                    onAction={() => setView({ type: "news" })}
                >
                    <div className="news-grid">
                        {news.slice(0, 3).map((n) => (
                            <button
                                className="news-card"
                                key={n.id}
                                onClick={() =>
                                    setView({ type: "newsDetail", item: n })
                                }
                            >
                                <div className="news-image">
                                    <SmartImage
                                        src={n.image}
                                        fallback={FALLBACK_COVER}
                                        alt=""
                                    />
                                </div>
                                <div>
                                    <small>{ui("newswire")}</small>
                                    <h3>{n.title}</h3>
                                    <p>{n.excerpt || ""}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}

function Catalog({
    games,
    wishlisted,
    onWishlist,
    onInstall,
    downloading,
    installed,
    openGame,
    setView,
    goBack,
}) {
    return (
        <div className="page">
            <PageHeading
                title={ui("games")}
                description={ui("browseCatalog")}
            />
            <div className="game-grid">
                {games.map((g) => (
                    <GameCard
                        key={g.id}
                        game={g}
                        wishlisted={wishlisted.has(g.id)}
                        onWishlist={onWishlist}
                        onOpen={openGame}
                        onInstall={onInstall}
                        installed={Boolean(installed?.[g.id])}
                        downloading={downloading[g.id]}
                    />
                ))}
            </div>
        </div>
    );
}
function Library({ games, installed, onInstall, onDelete, openGame, setView, setActive }) {
    const items = games.filter((g) => installed[g.id]);
    return (
        <div className="page">
            <PageHeading
                title={ui("library")}
                description={ui("yourDownloads")}
            />
            {items.length ? (
                <div className="library-list">
                    {items.map((g) => (
                        <article className="library-row" key={g.id}>
                            <SmartImage
                                src={imageOf(g)}
                                fallback={FALLBACK_COVER}
                                alt=""
                            />
                            <div>
                                <h3>{g.title}</h3>
                                <span>
                                    <CheckCircle size={15} /> {ui("installed")}
                                </span>
                            </div>
                            <div className="library-meta">
                                <small>
                                    {installed[g.id]?.filename || "Local game"}
                                </small>
                                <button
                                    className="soft-button"
                                    onClick={() => onInstall(g, true)}
                                >
                                    <Play size={16} weight="fill" />{" "}
                                    {ui("play")}
                                </button>
                                <button
                                    className="round-action"
                                    onClick={() => openGame(g)}
                                >
                                    <ArrowUpRight size={17} />
                                </button>
                                <button
                                    className="round-action delete-local"
                                    onClick={() => onDelete(g)}
                                    aria-label={`Delete ${g.title}`}
                                >
                                    <Trash size={17} />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <Empty
                    title={ui("emptyLibrary")}
                    text={ui("emptyLibraryText")}
                    action={ui("exploreGames")}
                    onAction={() => {
                        setView(null);
                        setActive("explore");
                    }}
                />
            )}
        </div>
    );
}
function Wishlist({
    games,
    wishlisted,
    onWishlist,
    onInstall,
    installed,
    downloading,
    openGame,
    setView,
    setActive,
}) {
    const items = games.filter((g) => wishlisted.has(g.id));
    return (
        <div className="page">
            <PageHeading
                title={ui("wishlist")}
                description={ui("wishlistDesc")}
            />
            {items.length ? (
                <div className="game-grid">
                    {items.map((g) => (
                        <GameCard
                            key={g.id}
                            game={g}
                            wishlisted
                            onWishlist={onWishlist}
                            onOpen={openGame}
                            onInstall={onInstall}
                            installed={Boolean(installed?.[g.id])}
                            downloading={downloading[g.id]}
                        />
                    ))}
                </div>
            ) : (
               <Empty
                  title={ui("nothingSaved")}
                  text={ui("nothingSavedText")}
                  action={ui("exploreGames")}
                  onAction={() => {
                      setView(null);
                      setActive("explore");
                  }}
              />
            )}
        </div>
    );
}

function GameDetails({
    game,
    onBack,
    wishlisted,
    onWishlist,
    onInstall,
    installed,
    downloading,
}) {
    const [detail, setDetail] = useState(game);
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        let alive = true;
        api.get(`/games/${slugOf(game)}`)
            .then((data) => alive && setDetail(data))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [game]);
    const screenshots = detail?.screenshots?.length
        ? detail.screenshots
        : Array.from(
              { length: 6 },
              (_, i) =>
                  `${SITE_URL}/assets/games/screenshots/${detail?.slug || slugOf(detail)}/${i + 1}.png`,
          );
    return (
        <div className="page game-details">
            <PageHeading title="" description="" />
            <section className="detail-hero">
                <SmartImage
                    className="detail-media"
                    src={heroOf(detail)}
                    fallback={FALLBACK_HERO}
                    alt=""
                />
                <div className="detail-shade" />
                <div className="detail-copy">
                    <h1>{detail?.title}</h1>
                    <p>{detail?.shortDescription}</p>
                    <div className="detail-actions">
                        {detail?.downloadUrl && (
                            <button
                                className="primary-button"
                                onClick={() => onInstall(detail, installed)}
                                disabled={Boolean(downloading)}
                            >
                                {downloading ? (
                                    ui("downloading")
                                ) : installed ? (
                                    <>
                                        <Play size={17} weight="fill" />{" "}
                                        {ui("play")}
                                    </>
                                ) : (
                                    <>
                                        <DownloadSimple size={17} />{" "}
                                        {ui("download")}
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            className="soft-button"
                            onClick={() => onWishlist(detail)}
                        >
                            <HeartStraight
                                size={17}
                                weight={wishlisted ? "fill" : "regular"}
                            />{" "}
                            {wishlisted ? ui("wishlisted") : ui("wishlist")}
                        </button>
                        {detail?.trailerUrl && (
                            <button
                                className="soft-button"
                                onClick={() =>
                                    openExternal(mediaUrl(detail.trailerUrl))
                                }
                            >
                                <Play size={16} /> {ui("trailer")}
                            </button>
                        )}
                    </div>
                </div>
            </section>
            <div className="detail-columns">
                <main>
                    <section className="detail-section">
                        <h2>{ui("about")}</h2>
                        <p>{detail?.description || detail?.shortDescription}</p>
                    </section>
                    <section className="detail-section">
                        <h2>{ui("screenshots")}</h2>
                        <div className="screenshots-grid">
                            {screenshots.map((src, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelected(src)}
                                >
                                    <SmartImage
                                        src={src}
                                        fallback={FALLBACK_COVER}
                                        alt={`Screenshot ${i + 1}`}
                                    />
                                </button>
                            ))}
                        </div>
                    </section>
                </main>
                <aside className="detail-side">
                    <div>
                        <small>{ui("status")}</small>
                        <strong>
                            {String(detail?.status || "released").replaceAll(
                                "_",
                                " ",
                            )}
                        </strong>
                    </div>
                    <div>
                        <small>{ui("genres")}</small>
                        <strong>{detail?.genres?.join(" · ") || "—"}</strong>
                    </div>
                    <div>
                        <small>{ui("platforms")}</small>
                        <strong>
                            {detail?.platforms?.join(" · ") || "Windows"}
                        </strong>
                    </div>
                    {detail?.releaseDate && (
                        <div>
                            <small>{ui("release")}</small>
                            <strong>{detail.releaseDate}</strong>
                        </div>
                    )}
                </aside>
            </div>
            {selected && (
                <div className="lightbox" onClick={() => setSelected(null)}>
                    <SmartImage
                        src={assetUrl(selected, FALLBACK_COVER)}
                        fallback={FALLBACK_COVER}
                        alt=""
                    />
                    <button onClick={() => setSelected(null)}>
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}

function videoEmbed(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtu.be"))
            return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1`;
        if (u.hostname.includes("youtube.com")) {
            const id = u.searchParams.get("v");
            if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
        }
        return null;
    } catch {
        return null;
    }
}
function VideoPlayer({ video, onClose }) {
    const src = mediaUrl(video.video_url || video.videoUrl);
    const embed = videoEmbed(src);
    return (
        <div
            className="overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="video-modal">
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <div className="native-player">
                    {embed ? (
                        <iframe
                            src={embed}
                            title={video.title}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    ) : src ? (
                        <video src={src} controls autoPlay playsInline />
                    ) : (
                        <div className="empty-video">
                            <VideoCamera size={34} />
                            <span>No video source available.</span>
                        </div>
                    )}
                </div>
                <div className="video-modal-copy">
                    <small>{video.category || "Video"}</small>
                    <h2>{video.title}</h2>
                </div>
            </div>
        </div>
    );
}

function VideosPage({ videos, openVideo, setView, goBack }) {
    return (
        <div className="page">
            <PageHeading title={ui("videos")} description={ui("watchVideos")} />
            <div className="media-grid media-grid-large">
                {videos.map((v) => (
                    <button
                        className="media-card"
                        key={v.id}
                        onClick={() => openVideo(v)}
                    >
                        <div className="media-image">
                            <SmartImage
                                src={v.thumbnail}
                                fallback={FALLBACK_COVER}
                                alt=""
                            />
                            <span>
                                <Play size={24} weight="fill" />
                            </span>
                        </div>
                        <div>
                            <small>{v.category || ui("video")}</small>
                            <strong>{v.title}</strong>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
function VideoDetail({ video, setView, goBack }) {
    const src = mediaUrl(video?.video_url || video?.videoUrl);
    const embed = videoEmbed(src);
    return (
        <div className="page video-detail-page">
            <PageHeading
                title={video?.title || "Video"}
                description={video?.category || "Deadsmile Games video"}
            />
            <article className="video-detail">
                <div className="video-detail-player">
                    {embed ? (
                        <iframe
                            src={embed}
                            title={video.title}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    ) : src ? (
                        <video src={src} controls autoPlay playsInline />
                    ) : (
                        <div className="empty-video">
                            <VideoCamera size={34} />
                            <span>No video source available.</span>
                        </div>
                    )}
                </div>
                <div className="video-detail-copy">
                    <small>{video?.category || "Video"}</small>
                    <h2>{video?.title}</h2>
                    {video?.published_at && (
                        <p>
                            {new Date(video.published_at).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </article>
        </div>
    );
}
function NewsPage({ news, setView, goBack }) {
    return (
        <div className="page">
            <PageHeading title={ui("newswire")} description={ui("latest")} />
            <div className="news-grid news-grid-large">
                {news.map((n) => (
                    <button
                        className="news-card"
                        key={n.id}
                        onClick={() => setView({ type: "newsDetail", item: n })}
                    >
                        <div className="news-image">
                            <SmartImage
                                src={n.image}
                                fallback={FALLBACK_COVER}
                                alt=""
                            />
                        </div>
                        <div>
                            <small>{n.category || "Newswire"}</small>
                            <h3>{n.title}</h3>
                            <p>{n.excerpt || ""}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
function NewsDetail({ item, setView, goBack }) {
    const [detail, setDetail] = useState(item);
    useEffect(() => {
        if (!item?.slug) return;
        api.get(`/news/${item.slug}`)
            .then(setDetail)
            .catch(() => {});
    }, [item]);
    return (
        <div className="page">
            <PageHeading
                title={detail?.title || ""}
                description={detail?.category || "Newswire"}
            />
            <article className="news-detail">
                <SmartImage
                    src={detail?.image}
                    fallback={FALLBACK_COVER}
                    alt=""
                />
                <div>
                    <small>{detail?.category || "Newswire"}</small>
                    <p className="news-date">
                        {detail?.published_at
                            ? new Date(detail.published_at).toLocaleDateString()
                            : ""}
                    </p>
                    <div className="rich-copy">
                        {detail?.body || detail?.excerpt}
                    </div>
                </div>
            </article>
        </div>
    );
}

const initialAdmin = {
    type: "",
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    status: "announced",
    releaseDate: "",
    heroImage: "",
    coverImage: "",
    trailerUrl: "",
    featured: false,
    genres: "",
    platforms: "",
    purchaseUrl: "",
    downloadUrl: "",
    excerpt: "",
    body: "",
    image: "",
    category: "Devlog",
    thumbnail: "",
    videoUrl: "",
    durationSeconds: "",
};
function Field({ label, as = "input", children, ...props }) {
    const C = as;
    return (
        <label className="field">
            <span>{label}</span>
            <C {...props}>{children}</C>
        </label>
    );
}

function AvatarEditor({ onClose, language }) {
    return (
        <div
            className="overlay modal-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <section className="modal-card avatar-modal website-only-modal">
                <div className="modal-card__head">
                    <div>
                        <small>Deadsmile Games</small>
                        <h3>{text(language, "changePicture")}</h3>
                    </div>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        aria-label={text(language, "close")}
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="website-only-icon">
                    <WarningCircle size={28} />
                </div>
                <p className="website-only-copy">
                    {text(language, "websiteOnly")}
                </p>
                <p className="website-only-description">
                    {text(language, "websiteOnlyDescription")}
                </p>
                <div className="modal-card__foot">
                    <button className="soft-button" onClick={onClose}>
                        {text(language, "close")}
                    </button>
                    <button
                        className="primary-button"
                        onClick={() => openExternal(`${SITE_URL}/account`)}
                    >
                        {text(language, "openWebsite")}{" "}
                        <ArrowUpRight size={16} />
                    </button>
                </div>
            </section>
        </div>
    );
}

function Account({
    user,
    setUser,
    language,
    setLanguage,
    games,
    wishlist,
    onWishlist,
    onInstall,
    installed,
    downloading,
    openGame,
}) {
    const [tab, setTab] = useState("profile");
    const [form, setForm] = useState({
        username: user?.username || "",
        bio: user?.bio || "",
        websiteUrl: user?.websiteUrl || "",
        location: user?.location || "",
        email: user?.email || "",
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [avatarOpen, setAvatarOpen] = useState(false);
    const [totp, setTotp] = useState({ enabled: false });
    const [totpLoading, setTotpLoading] = useState(false);
    useEffect(() => {
        api.get("/account/totp/status")
            .then((d) => setTotp({ enabled: Boolean(d?.enabled) }))
            .catch(() => {});
    }, []);
    async function save(payload) {
        setSaving(true);
        setMessage("");
        try {
            const next = await api.patch("/account", payload);
            setUser(next);
            setForm((f) => ({
                ...f,
                username: next.username || f.username,
                bio: next.bio || "",
                websiteUrl: next.websiteUrl || "",
                location: next.location || "",
                email: next.email || f.email,
            }));
            setMessage(ui("changesSaved"));
            setTimeout(() => setMessage(""), 1800);
        } catch (e) {
            setMessage(e?.message || "Unable to save changes.");
        } finally {
            setSaving(false);
        }
    }
    async function setup2fa() {
        setTotpLoading(true);
        try {
            const data = await api.get("/account/totp/setup");
            openExternal(`${SITE_URL}/account#security`);
        } catch {
            openExternal(`${SITE_URL}/account#security`);
        } finally {
            setTotpLoading(false);
        }
    }
    const tabs = [
        { id: "profile", label: text(language, "profile"), icon: User },
        { id: "account", label: text(language, "account"), icon: GearSix },
        {
            id: "security",
            label: text(language, "security"),
            icon: ShieldCheck,
        },
        { id: "launcher", label: text(language, "launcher"), icon: GearSix },
    ];
    return (
        <div className="page account-page">
            <div className="account-layout">
                <aside className="account-nav">
                    <span className="account-nav-title">{ui("account")}</span>
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            className={tab === t.id ? "is-active" : ""}
                            onClick={() => setTab(t.id)}
                        >
                            <t.icon size={18} weight="bold" />
                            <span>{t.label}</span>
                        </button>
                    ))}
                    <span className="account-nav-title related">
                        {ui("launcher")}
                    </span>
                    <button onClick={() => setTab("wishlist")}>
                        <HeartStraight size={18} />
                        <span>{ui("wishlist")}</span>
                    </button>
                </aside>
                <div className="account-content">
                    <section className="account-hero">
                        <div className="account-avatar">
                            {user?.avatarUrl ? (
                                <SmartImage
                                    src={user.avatarUrl}
                                    fallback=""
                                    alt=""
                                />
                            ) : (
                                <span>{initials(user)}</span>
                            )}
                            <button
                                onClick={() => setAvatarOpen(true)}
                                aria-label={ui("changePicture")}
                            >
                                <PencilSimple size={18} weight="bold" />
                            </button>
                        </div>
                        <div>
                            <h1>{user?.username || "Player"}</h1>
                            <span>
                                {user?.createdAt
                                    ? `Created ${new Date(user.createdAt).toLocaleDateString()}`
                                    : "Deadsmile Games account"}
                            </span>
                        </div>
                    </section>
                    {tab === "profile" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{ui("profileDetails")}</h2>
                                <p>{ui("profileDescription")}</p>
                            </div>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    save({
                                        username: form.username,
                                        bio: form.bio,
                                        websiteUrl: form.websiteUrl || null,
                                        location: form.location || null,
                                        avatarUrl: user?.avatarUrl || null,
                                    });
                                }}
                                className="account-form"
                            >
                                <Field
                                    label={ui("username")}
                                    value={form.username}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            username:
                                                e.target.value.toLowerCase(),
                                        })
                                    }
                                    minLength={3}
                                    maxLength={24}
                                />
                                <Field
                                    label={ui("bio")}
                                    as="textarea"
                                    value={form.bio}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            bio: e.target.value,
                                        })
                                    }
                                    maxLength={500}
                                    rows={4}
                                    placeholder="Write something about yourself."
                                />
                                <Field
                                    label={ui("website")}
                                    value={form.websiteUrl}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            websiteUrl: e.target.value,
                                        })
                                    }
                                    placeholder="https://…"
                                />
                                <Field
                                    label={ui("location")}
                                    value={form.location}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            location: e.target.value,
                                        })
                                    }
                                    placeholder="City, Country"
                                />
                                <div className="account-form-foot">
                                    {message && (
                                        <span
                                            className={
                                                message === ui("changesSaved")
                                                    ? "success-text"
                                                    : "error-text"
                                            }
                                        >
                                            {message}
                                        </span>
                                    )}
                                    <button
                                        className="primary-button"
                                        disabled={saving}
                                    >
                                        {saving
                                            ? ui("saving")
                                            : ui("saveProfile")}{" "}
                                        <FloppyDisk size={16} />
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                    {tab === "account" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{ui("account")}</h2>
                                <p>{ui("accountDescription")}</p>
                            </div>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    save({ email: form.email.toLowerCase() });
                                }}
                                className="account-form"
                            >
                                <Field
                                    label={ui("email")}
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            email: e.target.value,
                                        })
                                    }
                                />
                                <div className="account-form-foot">
                                    {message && (
                                        <span className="success-text">
                                            {message}
                                        </span>
                                    )}
                                    <button
                                        className="primary-button"
                                        disabled={saving}
                                    >
                                        {ui("save")} <FloppyDisk size={16} />
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                    {tab === "security" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{ui("security")}</h2>
                                <p>
                                    Keep your account protected with two-factor
                                    authentication.
                                </p>
                            </div>
                            <div className="security-row">
                                <div className="security-icon">
                                    <ShieldCheck size={23} />
                                </div>
                                <div>
                                    <h3>{ui("twoFactor")}</h3>
                                    <p>
                                        {totp.enabled
                                            ? "Your account is protected by an authenticator."
                                            : "Add an authenticator app for an extra layer of security."}
                                    </p>
                                </div>
                                <span
                                    className={
                                        totp.enabled
                                            ? "status-pill on"
                                            : "status-pill"
                                    }
                                >
                                    {totp.enabled
                                        ? ui("enabled")
                                        : ui("notEnabled")}
                                </span>
                                <button
                                    className="soft-button"
                                    onClick={() =>
                                        openExternal(
                                            `${SITE_URL}/account#security`,
                                        )
                                    }
                                    disabled={totpLoading}
                                >
                                    {totp.enabled
                                        ? ui("manage2fa")
                                        : ui("setUp2fa")}{" "}
                                    <ArrowUpRight size={16} />
                                </button>
                            </div>
                            <div className="security-danger">
                                <div>
                                    <h3>{ui("accountManagement")}</h3>
                                    <p>{ui("accountManagementDescription")}</p>
                                </div>
                                <button
                                    className="soft-button"
                                    onClick={() =>
                                        openExternal(`${SITE_URL}/account`)
                                    }
                                >
                                    {ui("openAccountCenter")}{" "}
                                    <ArrowUpRight size={16} />
                                </button>
                            </div>
                        </section>
                    )}
                    {tab === "launcher" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{text(language, "launcherSettings")}</h2>
                                <p>{text(language, "languageDescription")}</p>
                            </div>
                            <div className="launcher-settings">
                                <div className="launcher-setting-copy">
                                    <strong>
                                        {text(language, "language")}
                                    </strong>
                                    <span>
                                        {text(language, "englishDefault")}
                                    </span>
                                </div>
                                <select
                                    value={language}
                                    onChange={(e) =>
                                        setLanguage(e.target.value)
                                    }
                                    aria-label={text(language, "language")}
                                >
                                    {LANGUAGES.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </section>
                    )}
                    {tab === "wishlist" && (
                        <section className="account-block account-wishlist">
                            <div className="account-block-head">
                                <h2>{ui("wishlist")}</h2>
                                <p>{ui("wishlistAccount")}</p>
                            </div>
                            {games.filter((g) => wishlist.has(g.id)).length ? (
                                <div className="game-grid">
                                    {games
                                        .filter((g) => wishlist.has(g.id))
                                        .map((g) => (
                                            <GameCard
                                                key={g.id}
                                                game={g}
                                                wishlisted
                                                onWishlist={onWishlist}
                                                onOpen={openGame}
                                                onInstall={onInstall}
                                                installed={Boolean(
                                                    installed?.[g.id],
                                                )}
                                                downloading={
                                                    downloading?.[g.id]
                                                }
                                            />
                                        ))}
                                </div>
                            ) : (
                                <Empty
                                    title={ui("nothingSaved")}
                                    text={ui("nothingSavedText")}
                                />
                            )}
                        </section>
                    )}
                </div>
            </div>
            {avatarOpen && (
                <AvatarEditor
                    onClose={() => setAvatarOpen(false)}
                    language={language}
                />
            )}
        </div>
    );
}

function Admin({ onPublished, setView }) {
    const [form, setForm] = useState(initialAdmin);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [items, setItems] = useState({ games: [], news: [], videos: [] });
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const set = (key) => (e) =>
        setForm((f) => ({
            ...f,
            [key]:
                e.target.type === "checkbox"
                    ? e.target.checked
                    : e.target.value,
        }));
    async function loadContent() {
        setLoading(true);
        try {
            const [g, n, v] = await Promise.all([
                api.get("/games?page=1&limit=48"),
                api.get("/news?limit=48"),
                api.get("/videos?limit=48"),
            ]);
            setItems({
                games: listFrom(g, "games"),
                news: listFrom(n, "news"),
                videos: listFrom(v, "videos"),
            });
        } catch (e) {
            setMessage(e?.message || "Unable to load content.");
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadContent();
    }, []);
    async function publish(e) {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            let path;
            let payload;
            if (form.type === "game") {
                path = "/admin/game";
                payload = {
                    title: form.title,
                    slug: form.slug,
                    shortDescription: form.shortDescription,
                    description: form.description,
                    status: form.status,
                    releaseDate: form.releaseDate || null,
                    heroImage: form.heroImage || null,
                    coverImage: form.coverImage || null,
                    trailerUrl: form.trailerUrl || null,
                    featured: form.featured,
                    purchaseUrl: form.purchaseUrl || null,
                    downloadUrl: form.downloadUrl || null,
                    genres: form.genres
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    platforms: form.platforms
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                };
            } else if (form.type === "news") {
                path = "/admin/newsletter";
                payload = {
                    title: form.title,
                    excerpt: form.excerpt,
                    body: form.body,
                    image: form.image || null,
                };
            } else {
                path = "/admin/video";
                payload = {
                    title: form.title,
                    category: form.category,
                    thumbnail: form.thumbnail || null,
                    videoUrl: form.videoUrl || null,
                    durationSeconds: form.durationSeconds
                        ? Number(form.durationSeconds)
                        : null,
                };
            }
            await api.post(path, payload);
            setMessage("Published successfully.");
            setForm(initialAdmin);
            await loadContent();
            onPublished?.();
        } catch (e) {
            setMessage(e?.message || "Unable to publish.");
        } finally {
            setSaving(false);
        }
    }
    async function remove(kind, id) {
        if (!window.confirm("Delete this item permanently?")) return;
        const endpoint =
            kind === "games"
                ? "game"
                : kind === "news"
                  ? "newsletter"
                  : "video";
        try {
            await api.delete(`/admin/${endpoint}/${id}`);
            setItems((x) => ({
                ...x,
                [kind]: x[kind].filter((i) => i.id !== id),
            }));
            setSelected(null);
        } catch (e) {
            setMessage(e?.message || "Unable to delete.");
        }
    }
    const selectedKind = selected?.kind;
    const selectedItem = selected?.item;
    return (
        <div className="page admin-page">
            <PageHeading
                title="Manage content"
                description="Publish and manage games, news and videos from the launcher."
            />
            <section className="manage-overview">
                <div className="manage-overview-head">
                    <div>
                        <span>Content library</span>
                        <h2>Everything you publish</h2>
                    </div>
                    <button
                        className="soft-button"
                        onClick={loadContent}
                        disabled={loading}
                    >
                        <ArrowRight size={16} /> Refresh
                    </button>
                </div>
                <div className="manage-columns">
                    {["games", "news", "videos"].map((kind) => (
                        <div className="manage-column" key={kind}>
                            <div className="manage-column-head">
                                <span>
                                    {kind === "games"
                                        ? "Games"
                                        : kind === "news"
                                          ? "Newswire"
                                          : "Videos"}
                                </span>
                                <strong>{items[kind].length}</strong>
                            </div>
                            {items[kind].slice(0, 6).map((item) => (
                                <button
                                    className={
                                        selectedItem?.id === item.id
                                            ? "manage-item active"
                                            : "manage-item"
                                    }
                                    key={item.id}
                                    onClick={() => setSelected({ kind, item })}
                                >
                                    <span>{item.title}</span>
                                    <CaretRight size={15} />
                                </button>
                            ))}
                            {!items[kind].length && (
                                <span className="muted">
                                    Nothing published yet.
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>
            {selectedItem && (
                <section className="manage-detail">
                    <div className="manage-detail-media">
                        <SmartImage
                            src={
                                selectedItem.coverImage ||
                                selectedItem.image ||
                                selectedItem.thumbnail ||
                                selectedItem.heroImage
                            }
                            fallback={FALLBACK_COVER}
                            alt=""
                        />
                    </div>
                    <div className="manage-detail-copy">
                        <small>{selectedKind}</small>
                        <h2>{selectedItem.title}</h2>
                        <p>
                            {selectedItem.shortDescription ||
                                selectedItem.excerpt ||
                                selectedItem.category ||
                                "Published content"}
                        </p>
                        <div className="manage-detail-actions">
                            <button
                                className="soft-button"
                                onClick={() => {
                                    if (selectedKind === "games")
                                        setView({
                                            type: "game",
                                            item: selectedItem,
                                        });
                                    else if (selectedKind === "videos")
                                        setView({
                                            type: "videoDetail",
                                            item: selectedItem,
                                        });
                                    else
                                        setView({
                                            type: "newsDetail",
                                            item: selectedItem,
                                        });
                                }}
                            >
                                Open
                            </button>
                            <button
                                className="danger-button"
                                onClick={() =>
                                    remove(selectedKind, selectedItem.id)
                                }
                            >
                                <Trash size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </section>
            )}
            <div className="create-heading">
                <div>
                    <span>Publish</span>
                    <h2>Create something new</h2>
                </div>
            </div>
            <div className="create-actions">
                <button
                    onClick={() => setForm({ ...initialAdmin, type: "game" })}
                >
                    <GameController size={22} />
                    <span>
                        <strong>New game</strong>
                        <small>Add a title to the catalog</small>
                    </span>
                    <Plus size={18} />
                </button>
                <button
                    onClick={() => setForm({ ...initialAdmin, type: "news" })}
                >
                    <Newspaper size={22} />
                    <span>
                        <strong>New news</strong>
                        <small>Publish a Newswire story</small>
                    </span>
                    <Plus size={18} />
                </button>
                <button
                    onClick={() => setForm({ ...initialAdmin, type: "video" })}
                >
                    <FilmStrip size={22} />
                    <span>
                        <strong>New video</strong>
                        <small>Add a native launcher video</small>
                    </span>
                    <Plus size={18} />
                </button>
            </div>
            {form.type && (
                <AdminForm
                    form={form}
                    setForm={setForm}
                    set={set}
                    publish={publish}
                    saving={saving}
                    message={message}
                    onClose={() => setForm({ ...initialAdmin, type: "" })}
                />
            )}
        </div>
    );
}
function AdminForm({ form, setForm, set, publish, saving, message, onClose }) {
    return (
        <div
            className="overlay form-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <section className="modal-card admin-form-card">
                <div className="modal-card__head">
                    <div>
                        <small>Manage content</small>
                        <h3>
                            {form.type === "game"
                                ? "Publish game"
                                : form.type === "news"
                                  ? "Publish news"
                                  : "Publish video"}
                        </h3>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <form className="admin-form" onSubmit={publish}>
                    {form.type === "game" && (
                        <>
                            <Field
                                label="Title"
                                value={form.title}
                                onChange={set("title")}
                                required
                            />
                            <div className="field-row">
                                <Field
                                    label="Slug"
                                    value={form.slug}
                                    onChange={set("slug")}
                                    required
                                />
                                <Field
                                    label="Release date"
                                    type="date"
                                    value={form.releaseDate}
                                    onChange={set("releaseDate")}
                                />
                            </div>
                            <Field
                                label="Short description"
                                value={form.shortDescription}
                                onChange={set("shortDescription")}
                                required
                            />
                            <Field
                                label="Description"
                                as="textarea"
                                value={form.description}
                                onChange={set("description")}
                                rows={6}
                            />
                            <div className="field-row">
                                <Field
                                    label="Hero image URL"
                                    value={form.heroImage}
                                    onChange={set("heroImage")}
                                    placeholder="https://…"
                                />
                                <Field
                                    label="Cover image URL"
                                    value={form.coverImage}
                                    onChange={set("coverImage")}
                                    placeholder="https://…"
                                />
                            </div>
                            <div className="field-row">
                                <Field
                                    label="Trailer URL"
                                    value={form.trailerUrl}
                                    onChange={set("trailerUrl")}
                                    placeholder="https://…"
                                />
                                <Field
                                    label="Download URL (itch.io)"
                                    value={form.downloadUrl}
                                    onChange={set("downloadUrl")}
                                    placeholder="https://…"
                                />
                            </div>
                            <div className="field-row">
                                <Field
                                    label="Genres"
                                    value={form.genres}
                                    onChange={set("genres")}
                                    placeholder="Action, Adventure"
                                />
                                <Field
                                    label="Platforms"
                                    value={form.platforms}
                                    onChange={set("platforms")}
                                    placeholder="Windows, Web"
                                />
                            </div>
                            <label className="check-field">
                                <input
                                    type="checkbox"
                                    checked={form.featured}
                                    onChange={set("featured")}
                                />{" "}
                                Featured game
                            </label>
                        </>
                    )}
                    {form.type === "news" && (
                        <>
                            <Field
                                label="Title"
                                value={form.title}
                                onChange={set("title")}
                                required
                            />
                            <Field
                                label="Excerpt"
                                value={form.excerpt}
                                onChange={set("excerpt")}
                            />
                            <Field
                                label="Body"
                                as="textarea"
                                value={form.body}
                                onChange={set("body")}
                                rows={9}
                                required
                            />
                            <Field
                                label="Image URL"
                                value={form.image}
                                onChange={set("image")}
                                placeholder="https://…"
                            />
                        </>
                    )}
                    {form.type === "video" && (
                        <>
                            <Field
                                label="Title"
                                value={form.title}
                                onChange={set("title")}
                                required
                            />
                            <Field
                                label="Category"
                                value={form.category}
                                onChange={set("category")}
                                required
                            />
                            <Field
                                label="Video URL"
                                value={form.videoUrl}
                                onChange={set("videoUrl")}
                                placeholder="Direct MP4/WebM or YouTube URL"
                            />
                            <Field
                                label="Thumbnail URL"
                                value={form.thumbnail}
                                onChange={set("thumbnail")}
                                placeholder="https://…"
                            />
                            <Field
                                label="Duration (seconds)"
                                type="number"
                                min="0"
                                value={form.durationSeconds}
                                onChange={set("durationSeconds")}
                            />
                        </>
                    )}
                    <div className="admin-submit">
                        <button className="primary-button" disabled={saving}>
                            {saving ? "Publishing…" : "Publish"}{" "}
                            <UploadSimple size={17} />
                        </button>
                        {message && (
                            <span
                                className={
                                    message.includes("success")
                                        ? "success-text"
                                        : "error-text"
                                }
                            >
                                {message}
                            </span>
                        )}
                    </div>
                </form>
            </section>
        </div>
    );
}

export default function App() {
    const [status, setStatus] = useState("booting");
    const [language, setLanguageState] = useState(() => {
        try {
            return localStorage.getItem("deadsmile.language") || "en";
        } catch {
            return "en";
        }
    });
    const [user, setUser] = useState(null);
    const [active, setActive] = useState("explore");
    const [view, setViewState] = useState(null);
    const [games, setGames] = useState([]);
    const [news, setNews] = useState([]);
    const [videos, setVideos] = useState([]);
    const [wishlist, setWishlist] = useState(new Set());
    const [installed, setInstalled] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("deadsmile.library") || "{}",
            );
        } catch {
            return {};
        }
    });
    const [loading, setLoading] = useState(true);
    const [selectedGame, setSelectedGame] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [downloading, setDownloading] = useState({});
    const [notice, setNotice] = useState("");
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);
    const [notifications, setNotifications] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("deadsmile.notifications") || "[]",
            );
        } catch {
            return [];
        }
    });
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [updateProgress, setUpdateProgress] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [linksOpen, setLinksOpen] = useState(false);
    ACTIVE_LANGUAGE = language;
    useEffect(() => {
        let alive = true;
        window.deadsmile?.storage
            ?.normalizeLibrary?.(installed)
            .then?.((next) => {
                if (
                    !alive ||
                    !next ||
                    JSON.stringify(next) === JSON.stringify(installed)
                )
                    return;
                setInstalled(next);
                try {
                    localStorage.setItem(
                        "deadsmile.library",
                        JSON.stringify(next),
                    );
                } catch {}
            })
            .catch?.(() => {});
        return () => {
            alive = false;
        };
    }, []);
    useEffect(() => {
        const open = () => setLinksOpen(true);
        window.addEventListener("deadsmile:open-links", open);
        return () => window.removeEventListener("deadsmile:open-links", open);
    }, []);
    function setLanguage(next) {
        const value = LANGUAGES.some((item) => item.id === next) ? next : "en";
        setLanguageState(value);
        try {
            localStorage.setItem("deadsmile.language", value);
        } catch {}
    }
    function currentRoute() {
        return { active, view, selectedGame, selectedVideo };
    }
    function applyRoute(route) {
        setActive(route?.active ?? "explore");
        setViewState(route?.view ?? null);
        setSelectedGame(route?.selectedGame ?? null);
        setSelectedVideo(route?.selectedVideo ?? null);
    }
    function navigate(next = {}) {
        const target = {
            active: next.active ?? active,
            view: next.view ?? null,
            selectedGame: next.game ?? null,
            selectedVideo: next.video ?? null,
        };
        const current = currentRoute();
        if (JSON.stringify(current) === JSON.stringify(target)) return;
        setHistory((h) => [...h, current]);
        setFuture([]);
        applyRoute(target);
        setQuery("");
    }
    function setView(next) {
        const targetView = typeof next === "function" ? next(view) : next;
        navigate({ view: targetView });
    }
    function nav(id) {
        navigate({ active: id });
    }
    function openGame(game) {
        navigate({ game });
    }
    function openVideo(video) {
        navigate({ video });
    }
    useEffect(() => {
        let alive = true;
        const start = async () => {
            const minBoot = new Promise((r) => setTimeout(r, 5600));
            let me = null;
            try {
                me = await api.get("/auth/me");
            } catch {}
            await minBoot;
            if (!alive) return;
            if (me) {
                setUser(me);
                setStatus("ready");
            } else setStatus("login");
        };
        start();
        return () => {
            alive = false;
        };
    }, []);
    useEffect(() => {
        if (status !== "ready") return;
        let alive = true;
        setLoading(true);
        Promise.all([
            api.get("/games?page=1&limit=48"),
            api.get("/news?limit=48"),
            api.get("/videos?limit=48"),
            api.get("/wishlist"),
        ])
            .then(([g, n, v, w]) => {
                if (!alive) return;
                setGames(listFrom(g, "games"));
                setNews(listFrom(n, "news"));
                setVideos(listFrom(v, "videos"));
                setWishlist(new Set(listFrom(w, "games").map((x) => x.id)));
            })
            .catch(
                (e) =>
                    alive &&
                    setNotice(e?.message || "Unable to load launcher content."),
            )
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [status]);
    useEffect(() => {
        if (status !== "ready" || !window.deadsmile?.checkForUpdate) return;
        let alive = true;
        window.deadsmile
            .checkForUpdate()
            .then((info) => {
                if (!alive || !info?.available) return;
                setUpdateInfo(info);
                setNotifications((n) => [
                    {
                        id: `update-${info.latestVersion}`,
                        title: ui("updateAvailable"),
                        message: `v${info.latestVersion}`,
                        time: Date.now(),
                        unread: true,
                    },
                    ...n,
                ]);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [status]);
    useEffect(() => {
        if (!window.deadsmile?.onUpdateProgress) return;
        return window.deadsmile.onUpdateProgress((p) => setUpdateProgress(p));
    }, []);
    useEffect(() => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            api.get(
                `/search?q=${encodeURIComponent(query.trim())}&page=1&limit=12`,
            )
                .then((data) =>
                    setSearchResults(
                        listFrom(data, "items").map((x) => ({
                            ...x,
                            type: x.type || "game",
                        })),
                    ),
                )
                .catch(() =>
                    setSearchResults(
                        games
                            .filter((g) =>
                                g.title
                                    ?.toLowerCase()
                                    .includes(query.toLowerCase()),
                            )
                            .map((x) => ({ ...x, type: "game" })),
                    ),
                );
        }, 250);
        return () => clearTimeout(timer);
    }, [query, games]);
    useEffect(() => {
        if (!window.deadsmile?.onDownloadProgress) return;
        return window.deadsmile.onDownloadProgress((p) =>
            setDownloading((x) => {
                if (p.status === "complete") {
                    const n = { ...x };
                    delete n[p.id];
                    return n;
                }
                return { ...x, [p.id]: p };
            }),
        );
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem(
                "deadsmile.notifications",
                JSON.stringify(notifications.slice(0, 40)),
            );
        } catch {}
    }, [notifications]);
    async function toggleWishlist(game) {
        try {
            if (wishlist.has(game.id)) {
                await api.delete(`/wishlist/${game.id}`);
                setWishlist((s) => {
                    const n = new Set(s);
                    n.delete(game.id);
                    return n;
                });
            } else {
                await api.post("/wishlist", { gameId: game.id });
                setWishlist((s) => new Set(s).add(game.id));
            }
        } catch (e) {
            setNotice(e?.message || "Unable to update wishlist.");
        }
    }
    async function installGame(game, play = false) {
        if (play && installed[game.id]?.path) {
            const error = await window.deadsmile?.openPath(
                installed[game.id].path,
            );
            if (error) setNotice(error);
            return;
        }
        if (!game.downloadUrl) {
            setNotice(ui("downloadUnavailable"));
            return;
        }
        setDownloading((x) => ({
            ...x,
            [game.id]: { percent: 0, status: "starting" },
        }));
        try {
            const result = await window.deadsmile.downloadGame({
                id: game.id,
                slug: game.slug,
                title: game.title,
                url: game.downloadUrl,
            });
            setInstalled((x) => {
                const n = {
                    ...x,
                    [game.id]: {
                        path: result.path,
                        folderPath: result.folderPath,
                        filename: result.filename,
                        downloadedAt: Date.now(),
                    },
                };
                localStorage.setItem("deadsmile.library", JSON.stringify(n));
                return n;
            });
            setDownloading((x) => {
                const n = { ...x };
                delete n[game.id];
                return n;
            });
            setNotifications((n) => [
                {
                    id: `game-${game.id}-${Date.now()}`,
                    title: ui("downloadComplete"),
                    message: `${game.title} ${ui("gameReady")}`,
                    time: Date.now(),
                    unread: true,
                },
                ...n,
            ]);
            setNotice(`${game.title} ${ui("gameReady")}`);
        } catch (e) {
            setDownloading((x) => {
                const n = { ...x };
                delete n[game.id];
                return n;
            });
            setNotifications((n) => [
                {
                    id: `error-${Date.now()}`,
                    title: ui("downloadFailed"),
                    message: e?.message || ui("downloadFailed"),
                    time: Date.now(),
                    unread: true,
                },
                ...n,
            ]);
            setNotice(e?.message || ui("downloadFailed"));
        }
    }
    async function deleteInstalledGame(game) {
        const entry = installed[game.id];
        if (!entry?.path) return;
        const confirmed = window.confirm(
            `${ui("deleteItem")}\n\n${game.title}`,
        );
        if (!confirmed) return;
        try {
            const error = await window.deadsmile?.deleteGame(
                entry.folderPath || entry.path,
            );
            if (error) throw new Error(error);
            setInstalled((x) => {
                const next = { ...x };
                delete next[game.id];
                localStorage.setItem("deadsmile.library", JSON.stringify(next));
                return next;
            });
            setNotice(`${game.title} was removed from your library.`);
        } catch (e) {
            setNotice(e?.message || "Unable to delete the local game.");
        }
    }
    async function startUpdate() {
        if (!updateInfo || !window.deadsmile?.updateLauncher) return;
        setUpdating(true);
        try {
            await window.deadsmile.updateLauncher();
        } catch (e) {
            setUpdating(false);
            setNotice(e?.message || ui("downloadFailed"));
        }
    }
    function clearNotifications() {
        setNotifications([]);
    }
    async function logout() {
        try {
            await api.post("/auth/logout");
        } catch {}
        setUser(null);
        setStatus("login");
        setActive("explore");
        setSelectedGame(null);
        setView(null);
    }
    async function refreshContent() {
        try {
            const [g, n, v] = await Promise.all([
                api.get("/games?page=1&limit=48"),
                api.get("/news?limit=48"),
                api.get("/videos?limit=48"),
            ]);
            setGames(listFrom(g, "games"));
            setNews(listFrom(n, "news"));
            setVideos(listFrom(v, "videos"));
        } catch {}
    }
    function goBack() {
        const previous = history[history.length - 1];
        if (!previous) return;
        const current = currentRoute();
        setHistory((h) => h.slice(0, -1));
        setFuture((f) => [current, ...f]);
        applyRoute(previous);
        setQuery("");
    }
    function goForward() {
        const next = future[0];
        if (!next) return;
        const current = currentRoute();
        setFuture((f) => f.slice(1));
        setHistory((h) => [...h, current]);
        applyRoute(next);
        setQuery("");
    }
    if (status === "booting")
        return (
            <>
                <WindowChrome />
                <Boot />
            </>
        );
    if (status === "login")
        return (
            <>
                <WindowChrome />
                <Login
                    onAuthenticated={(u) => {
                        setUser(u);
                        setStatus("ready");
                        setActive("explore");
                    }}
                />
            </>
        );
    let current;
    if (selectedGame)
        current = (
            <GameDetails
                game={selectedGame}
                onBack={goBack}
                wishlisted={wishlist.has(selectedGame.id)}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                installed={Boolean(installed[selectedGame.id])}
                downloading={Boolean(downloading[selectedGame.id])}
            />
        );
    else if (view?.type === "catalog")
        current = (
            <Catalog
                games={games}
                wishlisted={wishlist}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                downloading={downloading}
                installed={installed}
                openGame={openGame}
                setView={setView}
                goBack={goBack}
            />
        );
    else if (view?.type === "videos")
        current = (
            <VideosPage
                videos={videos}
                openVideo={openVideo}
                setView={setView}
                goBack={goBack}
            />
        );
    else if (view?.type === "news")
        current = <NewsPage news={news} setView={setView} goBack={goBack} />;
    else if (view?.type === "newsDetail")
        current = (
            <NewsDetail item={view.item} setView={setView} goBack={goBack} />
        );
    else if (view?.type === "videoDetail")
        current = (
            <VideoDetail video={view.item} setView={setView} goBack={goBack} />
        );
    else if (view?.type === "game")
        current = (
            <GameDetails
                game={view.item}
                onBack={goBack}
                wishlisted={wishlist.has(view.item.id)}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                installed={Boolean(installed[view.item.id])}
                downloading={Boolean(downloading[view.item.id])}
            />
        );
    else if (active === "explore")
        current = (
            <Explore
                games={games}
                news={news}
                videos={videos}
                loading={loading}
                wishlisted={wishlist}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                downloading={downloading}
                installed={installed}
                openGame={openGame}
                openVideo={openVideo}
                setView={setView}
            />
        );
    else if (active === "library")
        current = (
            <Library
                games={games}
                installed={installed}
                onInstall={installGame}
                onDelete={deleteInstalledGame}
                openGame={openGame}
                setView={setView}
                setActive={nav}
            />
        );
    else if (active === "wishlist")
        current = (
            <Wishlist
                games={games}
                wishlisted={wishlist}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                installed={installed}
                downloading={downloading}
                openGame={openGame}
                setView={setView}
                setActive={nav}
            />
        );
    else if (active === "account")
        current = (
            <Account
                user={user}
                setUser={(next) => setUser(next)}
                language={language}
                setLanguage={setLanguage}
                games={games}
                wishlist={wishlist}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                installed={installed}
                downloading={downloading}
                openGame={openGame}
            />
        );
    else if (active === "admin" && isAdmin(user))
        current = <Admin onPublished={refreshContent} setView={setView} />;
    else current = null;
    return (
        <>
            <WindowChrome locked={updating} />
            <div className="launcher">
                <Sidebar
                    active={active}
                    setActive={nav}
                    user={user}
                    logout={logout}
                    openAdmin={() => nav("admin")}
                    language={language}
                />
                <main className="content">
                    <TopActions
                        query={query}
                        setQuery={setQuery}
                        searchResults={searchResults}
                        openGame={openGame}
                        onBack={goBack}
                        onForward={goForward}
                        onNotifications={() => setNotificationOpen((x) => !x)}
                        notificationsUnread={
                            notifications.filter((n) => n.unread).length
                        }
                    />
                    {notificationOpen && (
                        <NotificationsPanel
                            notifications={notifications}
                            onClose={() => setNotificationOpen(false)}
                            onClear={clearNotifications}
                        />
                    )}
                    <UpdateOverlay
                        info={updateInfo}
                        progress={updateProgress}
                        updating={updating}
                        onUpdate={startUpdate}
                        onLater={() => setUpdateInfo(null)}
                    />
                    {notice && (
                        <button
                            className="notice"
                            onClick={() => setNotice("")}
                        >
                            <CheckCircle size={17} />
                            {notice}
                            <X size={15} />
                        </button>
                    )}
                    {Object.values(downloading)
                        .filter(Boolean)
                        .map((p) => (
                            <div className="download-strip" key={p.id}>
                                <LoadingBar
                                    label={
                                        p.status === "installing"
                                            ? ui("installing")
                                            : ui("downloading")
                                    }
                                    percent={p.percent || 0}
                                />
                            </div>
                        ))}
                    <div
                        className="route-view"
                        key={`${active}-${view?.type || ""}-${view?.item?.id || ""}-${selectedGame?.id || ""}`}
                    >
                        {current}
                    </div>
                </main>
            </div>
            {linksOpen && (
                <SocialLinks
                    onClose={() => setLinksOpen(false)}
                    language={language}
                />
            )}{" "}
            {selectedVideo && (
                <VideoPlayer video={selectedVideo} onClose={goBack} />
            )}
        </>
    );
}
