import {
    createContext,
    useContext,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import {
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    ArrowCounterClockwise,
    ArrowClockwise,
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
    Pause,
    DotsSixVertical,
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
        error: "Error",
        unableToUpdateWishlist: "Unable to update wishlist.",
        wasRemovedFromYourLibrary: "was removed from your library.",
        unableToDeleteLocalGame: "Unable to delete the local game.",
        easterTitle: "Easter eggs",
        easterFoot: "Finding them by accident is more fun",
        easterCrtHint: "RETRO MODE · click or press ESC to exit",
        easterKonamiName: "Konami Code",
        easterKonamiHint: "↑ ↑ ↓ ↓ ← → ← → B A",
        easterKonamiDesc: "Activates retro CRT mode",
        easterConfettiName: "Party!",
        easterConfettiHint: "Ctrl + Shift + C",
        easterConfettiDesc: "Confetti explosion",
        easterWordName: "Secret word",
        easterWordHint: 'Type "deadsmile" anywhere',
        easterWordDesc: "Skull rain",
        easterMenuName: "This menu",
        easterMenuHint: "Ctrl + Shift + E",
        easterMenuDesc: "You already found this",
        viewGame: "View game",
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
        downloads: "Downloads",
        downloadActive: "active",
        downloadActivePlural: "active",
        downloadQueued: "Queued",
        downloadPaused: "Paused",
        downloadCompleted: "Completed",
        downloadFailedLabel: "Failed",
        downloadStarting: "Starting…",
        downloadInstalling: "Installing…",
        downloadQueuePosition: "Queued",
        pause: "Pause",
        resume: "Resume",
        cancel: "Cancel",
        maxConcurrent: "Max",
        continuePlaying: "Continue playing",
        played: "played",
        justNow: "just now",
        minutesAgo: "{n}min ago",
        hoursAgo: "{n}h ago",
        daysAgo: "{n}d ago",
        sortBy: "Sort",
        sortRecent: "Recently added",
        sortLastPlayed: "Recently played",
        sortMostPlayed: "Most played",
        sortName: "Name (A-Z)",
        offlineBanner:
            "You are offline. Showing cached content. Downloads are disabled.",
        offlineNoDownload:
            "No connection to download. Try again when you're online.",
        offlineCacheNotice: "No connection — showing cached content.",
        downloadCancelled: "download cancelled.",
                noVideoSourceAvailable: "No video source available.",
        adjustPhoto: "Adjust photo",
        rotateLeft: "Rotate left",
        rotateRight: "Rotate right",
        zoom: "Zoom",
        apply: "Apply",
        usePngJpgWebpMax5MB: "Use PNG, JPG or WEBP up to 5 MB.",
        failedToProcessImage: "Failed to process image.",
        created: "Created",
        deadsmileGamesAccount: "Deadsmile Games account",
        keepYourAccountProtectedWithTwoFactor: "Keep your account protected with two-factor authentication.",
        yourAccountIsProtectedByAnAuthenticator: "Your account is protected by an authenticator.",
        addAnAuthenticatorAppForAnExtraLayerOfSecurity: "Add an authenticator app for an extra layer of security.",
        publishedSuccessfully: "Published successfully.",
        unableToPublish: "Unable to publish.",
        deleteThisItemPermanently: "Delete this item permanently?",
        publishAndManageGamesNewsAndVideosFromTheLauncher: "Publish and manage games, news and videos from the launcher.",
        everythingYouPublish: "Everything you publish",
        nothingPublishedYet: "Nothing published yet.",
        open: "Open",
        delete: "Delete",
        createSomethingNew: "Create something new",
        addATitleToTheCatalog: "Add a title to the catalog",
        publishANewswireStory: "Publish a Newswire story",
        addANativeLauncherVideo: "Add a native launcher video",
        publishGame: "Publish game",
        publishNews: "Publish news",
        publishVideo: "Publish video",
        publishing: "Publishing…",
        back: "Back",
        forward: "Forward",
        unableToSaveChanges: "Unable to save changes.",
        writeSomethingAboutYourself: "Write something about yourself.",
        title: "Title",
        slug: "Slug",
        releaseDate: "Release date",
        shortDescription: "Short description",
        description: "Description",
        heroImageURL: "Hero image URL",
        coverImageURL: "Cover image URL",
        trailerURL: "Trailer URL",
        downloadURLItch: "Download URL (itch.io)",
        actionAdventure: "Action, Adventure",
        excerpt: "Excerpt",
        body: "Body",
        imageURL: "Image URL",
        category: "Category",
        videoURL: "Video URL",
        directMP4WebMWebmOrYouTubeURL: "Direct MP4/WebM or YouTube URL",
        thumbnailURL: "Thumbnail URL",
        durationSeconds: "Duration (seconds)",
        unableToDelete: "Unable to delete.",
        minimize: "Minimize",
        maximize: "Maximize",
        featuredGame: "Featured game",
        windowsWeb: "Windows, Web",
        unableToLoadContent: "Unable to load content.",
        unableToSignIn: "Unable to sign in.",
        yourPassword: "Your password",
        cityCountry: "City, Country",
        windows: "Windows",
    },
    "pt-BR": {
        error: "Erro",
        unableToUpdateWishlist: "Não foi possível atualizar a lista.",
        wasRemovedFromYourLibrary: "foi removido da sua biblioteca.",
        unableToDeleteLocalGame: "Não foi possível excluir o jogo local.",
        easterTitle: "Easter eggs",
        easterFoot: "Descoberta por acaso é mais legal",
        easterCrtHint: "RETRO MODE · clique ou ESC pra sair",
        easterKonamiName: "Konami Code",
        easterKonamiHint: "↑ ↑ ↓ ↓ ← → ← → B A",
        easterKonamiDesc: "Ativa modo CRT retrô",
        easterConfettiName: "Festa!",
        easterConfettiHint: "Ctrl + Shift + C",
        easterConfettiDesc: "Explosão de confetti",
        easterWordName: "Palavra secreta",
        easterWordHint: 'Digite "deadsmile" em qualquer tela',
        easterWordDesc: "Chuva de caveiras",
        easterMenuName: "Este menu",
        easterMenuHint: "Ctrl + Shift + E",
        easterMenuDesc: "Você já achou esse",
        viewGame: "Ver jogo",
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
        downloads: "Downloads",
        downloadActive: "ativo",
        downloadActivePlural: "ativos",
        downloadQueued: "Na fila",
        downloadPaused: "Pausado",
        downloadCompleted: "Concluído",
        downloadFailedLabel: "Falhou",
        downloadStarting: "Baixando…",
        downloadInstalling: "Instalando…",
        downloadQueuePosition: "Na fila",
        pause: "Pausar",
        resume: "Retomar",
        cancel: "Cancelar",
        maxConcurrent: "Máx",
        continuePlaying: "Continue jogando",
        played: "jogado",
        justNow: "agora",
        minutesAgo: "há {n}min",
        hoursAgo: "há {n}h",
        daysAgo: "há {n}d",
        sortBy: "Ordenar",
        sortRecent: "Adicionados recentemente",
        sortLastPlayed: "Jogados recentemente",
        sortMostPlayed: "Mais jogados",
        sortName: "Nome (A-Z)",
        offlineBanner:
            "Você está offline. Mostrando conteúdo em cache. Downloads estão desativados.",
        offlineNoDownload:
            "Sem conexão para baixar. Tente novamente quando estiver online.",
        offlineCacheNotice: "Sem conexão — mostrando conteúdo em cache.",
        downloadCancelled: "download cancelado.",
                noVideoSourceAvailable: "Nenhuma fonte de vídeo disponível.",
        adjustPhoto: "Ajustar foto",
        rotateLeft: "Girar à esquerda",
        rotateRight: "Girar à direita",
        zoom: "Zoom",
        apply: "Aplicar",
        usePngJpgWebpMax5MB: "Use PNG, JPG ou WEBP até 5 MB.",
        failedToProcessImage: "Falha ao processar a imagem.",
        created: "Criado em",
        deadsmileGamesAccount: "Conta Deadsmile Games",
        keepYourAccountProtectedWithTwoFactor: "Mantenha sua conta protegida com autenticação de dois fatores.",
        yourAccountIsProtectedByAnAuthenticator: "Sua conta está protegida por um autenticador.",
        addAnAuthenticatorAppForAnExtraLayerOfSecurity: "Adicione um aplicativo autenticador para uma camada extra de segurança.",
        publishedSuccessfully: "Publicado com sucesso.",
        unableToPublish: "Não foi possível publicar.",
        deleteThisItemPermanently: "Excluir este item permanentemente?",
        publishAndManageGamesNewsAndVideosFromTheLauncher: "Publique e gerencie jogos, notícias e vídeos pelo launcher.",
        everythingYouPublish: "Tudo que você publica",
        nothingPublishedYet: "Nada publicado ainda.",
        open: "Abrir",
        delete: "Excluir",
        createSomethingNew: "Crie algo novo",
        addATitleToTheCatalog: "Adicione um título ao catálogo",
        publishANewswireStory: "Publique uma notícia",
        addANativeLauncherVideo: "Adicione um vídeo nativo ao launcher",
        publishGame: "Publicar jogo",
        publishNews: "Publicar notícia",
        publishVideo: "Publicar vídeo",
        publishing: "Publicando…",
                back: "Voltar",
        forward: "Avançar",
        unableToSaveChanges: "Não foi possível salvar as alterações.",
        writeSomethingAboutYourself: "Escreva algo sobre você.",
        title: "Título",
        slug: "Slug",
        releaseDate: "Data de lançamento",
        shortDescription: "Descrição curta",
        description: "Descrição",
        heroImageURL: "URL da imagem hero",
        coverImageURL: "URL da capa",
        trailerURL: "URL do trailer",
        downloadURLItch: "URL de download (itch.io)",
        actionAdventure: "Ação, Aventura",
        excerpt: "Resumo",
        body: "Corpo",
        imageURL: "URL da imagem",
        category: "Categoria",
        videoURL: "URL do vídeo",
        directMP4WebMWebmOrYouTubeURL: "URL direta MP4/WebM ou do YouTube",
        thumbnailURL: "URL da miniatura",
        durationSeconds: "Duração (segundos)",
        unableToDelete: "Não foi possível excluir.",
        minimize: "Minimizar",
        maximize: "Maximizar",
        featuredGame: "Jogo em destaque",
        windowsWeb: "Windows, Web",
        unableToLoadContent: "Não foi possível carregar o conteúdo.",
        unableToSignIn: "Não foi possível entrar.",
        yourPassword: "Sua senha",
        cityCountry: "Cidade, País",
        windows: "Windows",
    },
    es: {
        error: "Error",
        unableToUpdateWishlist: "No se pudo actualizar la lista.",
        wasRemovedFromYourLibrary: "se eliminó de tu biblioteca.",
        unableToDeleteLocalGame: "No se pudo eliminar el juego local.",
        easterTitle: "Easter eggs",
        easterFoot: "Descubrirlos por accidente es más divertido",
        easterCrtHint: "MODO RETRO · clic o ESC para salir",
        easterKonamiName: "Konami Code",
        easterKonamiHint: "↑ ↑ ↓ ↓ ← → ← → B A",
        easterKonamiDesc: "Activa el modo CRT retro",
        easterConfettiName: "¡Fiesta!",
        easterConfettiHint: "Ctrl + Shift + C",
        easterConfettiDesc: "Explosión de confeti",
        easterWordName: "Palabra secreta",
        easterWordHint: 'Escribe "deadsmile" en cualquier pantalla',
        easterWordDesc: "Lluvia de calaveras",
        easterMenuName: "Este menú",
        easterMenuHint: "Ctrl + Shift + E",
        easterMenuDesc: "Ya encontraste este",
        viewGame: "Ver juego",
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
        downloads: "Descargas",
        downloadActive: "activo",
        downloadActivePlural: "activos",
        downloadQueued: "En cola",
        downloadPaused: "Pausado",
        downloadCompleted: "Completado",
        downloadFailedLabel: "Falló",
        downloadStarting: "Descargando…",
        downloadInstalling: "Instalando…",
        downloadQueuePosition: "En cola",
        pause: "Pausar",
        resume: "Reanudar",
        cancel: "Cancelar",
        maxConcurrent: "Máx",
        continuePlaying: "Seguir jugando",
        played: "jugado",
        justNow: "ahora",
        minutesAgo: "hace {n}min",
        hoursAgo: "hace {n}h",
        daysAgo: "hace {n}d",
        sortBy: "Ordenar",
        sortRecent: "Añadidos recientemente",
        sortLastPlayed: "Jugados recientemente",
        sortMostPlayed: "Más jugados",
        sortName: "Nombre (A-Z)",
        offlineBanner:
            "Estás offline. Mostrando contenido en caché. Las descargas están desactivadas.",
        offlineNoDownload:
            "Sin conexión para descargar. Inténtalo cuando estés online.",
        offlineCacheNotice: "Sin conexión — mostrando contenido en caché.",
        downloadCancelled: "descarga cancelada.",
                noVideoSourceAvailable: "No hay fuente de vídeo disponible.",
        adjustPhoto: "Ajustar foto",
        rotateLeft: "Girar a la izquierda",
        rotateRight: "Girar a la derecha",
        zoom: "Zoom",
        apply: "Aplicar",
        usePngJpgWebpMax5MB: "Usa PNG, JPG o WEBP hasta 5 MB.",
        failedToProcessImage: "Error al procesar la imagen.",
        created: "Creado el",
        deadsmileGamesAccount: "Cuenta de Deadsmile Games",
        keepYourAccountProtectedWithTwoFactor: "Mantén tu cuenta protegida con autenticación de dos factores.",
        yourAccountIsProtectedByAnAuthenticator: "Tu cuenta está protegida por un autenticador.",
        addAnAuthenticatorAppForAnExtraLayerOfSecurity: "Añade una aplicación autenticadora para una capa extra de seguridad.",
        publishedSuccessfully: "Publicado correctamente.",
        unableToPublish: "No se pudo publicar.",
        deleteThisItemPermanently: "¿Eliminar este elemento permanentemente?",
        publishAndManageGamesNewsAndVideosFromTheLauncher: "Publica y gestiona juegos, noticias y vídeos desde el launcher.",
        everythingYouPublish: "Todo lo que publicas",
        nothingPublishedYet: "Nada publicado todavía.",
        open: "Abrir",
        delete: "Eliminar",
        createSomethingNew: "Crea algo nuevo",
        addATitleToTheCatalog: "Añade un título al catálogo",
        publishANewswireStory: "Publica una noticia",
        addANativeLauncherVideo: "Añade un vídeo nativo al launcher",
        publishGame: "Publicar juego",
        publishNews: "Publicar noticia",
        publishVideo: "Publicar vídeo",
        publishing: "Publicando…",
                back: "Atrás",
        forward: "Adelante",
        unableToSaveChanges: "No se pudieron guardar los cambios.",
        writeSomethingAboutYourself: "Escribe algo sobre ti.",
        title: "Título",
        slug: "Slug",
        releaseDate: "Fecha de lanzamiento",
        shortDescription: "Descripción corta",
        description: "Descripción",
        heroImageURL: "URL de la imagen hero",
        coverImageURL: "URL de la portada",
        trailerURL: "URL del tráiler",
        downloadURLItch: "URL de descarga (itch.io)",
        actionAdventure: "Acción, Aventura",
        excerpt: "Extracto",
        body: "Cuerpo",
        imageURL: "URL de la imagen",
        category: "Categoría",
        videoURL: "URL del vídeo",
        directMP4WebMWebmOrYouTubeURL: "URL directa MP4/WebM o de YouTube",
        thumbnailURL: "URL de la miniatura",
        durationSeconds: "Duración (segundos)",
        unableToDelete: "No se pudo eliminar.",
        minimize: "Minimizar",
        maximize: "Maximizar",
        featuredGame: "Juego destacado",
        windowsWeb: "Windows, Web",
        unableToLoadContent: "No se pudo cargar el contenido.",
        unableToSignIn: "No se pudo iniciar sesión.",
        yourPassword: "Tu contraseña",
        cityCountry: "Ciudad, País",
        windows: "Windows",
    },
};

function text(language, key) {
    return COPY[language]?.[key] || COPY.en[key] || key;
}

function interpolate(str, params) {
    if (!params || !str) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) =>
        params[k] !== undefined ? String(params[k]) : `{${k}}`,
    );
}

const CONTENT_CACHE_KEY = "deadsmile.cache.content.v1";

function readContentCache() {
    try {
        return JSON.parse(localStorage.getItem(CONTENT_CACHE_KEY) || "null");
    } catch {
        return null;
    }
}

function writeContentCache({ games, news, videos, wishlistIds }) {
    try {
        localStorage.setItem(
            CONTENT_CACHE_KEY,
            JSON.stringify({
                ts: Date.now(),
                games: games || [],
                news: news || [],
                videos: videos || [],
                wishlistIds: wishlistIds || [],
            }),
        );
    } catch {}
}

function useOnline() {
    const [online, setOnline] = useState(() =>
        typeof navigator !== "undefined" ? navigator.onLine : true,
    );
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);
    return online;
}

// Konami Code: ↑↑↓↓←→←→BA
function useKonamiCode(onUnlock) {
    useEffect(() => {
        const sequence = [
            "ArrowUp",
            "ArrowUp",
            "ArrowDown",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "ArrowLeft",
            "ArrowRight",
            "b",
            "a",
        ];
        let index = 0;
        const handler = (e) => {
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (key === sequence[index]) {
                index += 1;
                if (index === sequence.length) {
                    index = 0;
                    onUnlock?.();
                }
            } else {
                index = key === sequence[0] ? 1 : 0;
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onUnlock]);
}

function useSecretWord(word, onMatch) {
    useEffect(() => {
        const lower = word.toLowerCase();
        let buffer = "";
        const handler = (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            if (
                tag === "input" ||
                tag === "textarea" ||
                e.target?.isContentEditable
            )
                return;
            if (e.key.length !== 1) return;
            buffer = (buffer + e.key.toLowerCase()).slice(-lower.length);
            if (buffer === lower) {
                buffer = "";
                onMatch?.();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [word, onMatch]);
}
function useHotkey({ key, ctrl = false, shift = false, alt = false }, handler) {
    useEffect(() => {
        const onKey = (e) => {
            const matches =
                e.key.toLowerCase() === key.toLowerCase() &&
                e.ctrlKey === ctrl &&
                e.shiftKey === shift &&
                e.altKey === alt;
            if (matches) {
                e.preventDefault();
                handler?.();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [key, ctrl, shift, alt, handler]);
}

const LanguageContext = createContext({
    language: "en",
    t: (key, params, fallback) => fallback || key,
});

function useT() {
    return useContext(LanguageContext);
}
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

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond <= 0) return "";
    return `${formatBytes(bytesPerSecond)}/s`;
}

function formatEta(seconds) {
    if (seconds == null || !isFinite(seconds) || seconds <= 0) return "";
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatPlaytime(ms) {
    if (!ms || ms <= 0) return "0m";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${Math.floor(ms / 1000)}s`;
}

function formatRelative(ts, t) {
    if (!ts) return "";
    const tr = t || ((k, _, fb) => fb || k);
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60) return tr("justNow", null, "just now");
    const m = Math.floor(s / 60);
    if (m < 60)
        return tr("minutesAgo", { n: m }, `há ${m}min`);
    const h = Math.floor(m / 60);
    if (h < 24) return tr("hoursAgo", { n: h }, `há ${h}h`);
    const d = Math.floor(h / 24);
    if (d < 30) return tr("daysAgo", { n: d }, `há ${d}d`);
    return new Date(ts).toLocaleDateString();
}

function usePlaytime() {
    const [playtime, setPlaytime] = useState({});

    useEffect(() => {
        if (!window.deadsmile?.playtime?.get) return undefined;
        let alive = true;

        window.deadsmile.playtime
            .get()
            .then((data) => {
                if (alive && data && typeof data === "object") {
                    setPlaytime(data);
                }
            })
            .catch(() => {});

        const off = window.deadsmile.onPlaytimeUpdate?.((data) => {
            if (data && typeof data === "object") setPlaytime(data);
        });

        return () => {
            alive = false;
            off?.();
        };
    }, []);

    return playtime;
}

function useDownloadQueue() {
    const [queue, setQueue] = useState([]);

    useEffect(() => {
        if (!window.deadsmile?.onDownloadQueue) return undefined;
        let alive = true;

        window.deadsmile
            .getDownloadSnapshot?.()
            .then((snap) => {
                if (alive && Array.isArray(snap)) setQueue(snap);
            })
            .catch(() => {});

        const off = window.deadsmile.onDownloadQueue((next) => {
            if (Array.isArray(next)) setQueue(next);
        });

        return () => {
            alive = false;
            off?.();
        };
    }, []);

    const byId = useMemo(() => {
        const map = {};
        for (const item of queue) map[item.id] = item;
        return map;
    }, [queue]);

    return {
        queue,
        byId,
        pause: (id) => window.deadsmile?.pauseDownload?.(id),
        resume: (id) => window.deadsmile?.resumeDownload?.(id),
        cancel: (id) => window.deadsmile?.cancelDownload?.(id),
        reorder: (ids) => window.deadsmile?.reorderDownloads?.(ids),
        setConcurrent: (n) =>
            window.deadsmile?.setMaxConcurrentDownloads?.(n),
    };
}

function Portal({ children }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
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

                const isOurOrigin = (() => {
                    try {
                        const u = new URL(original);
                        return (
                            u.origin === API_ASSET_ROOT ||
                            u.origin === SITE_URL ||
                            u.hostname === "apideadsmile.vercel.app" ||
                            u.hostname.endsWith(".deadsmile.vercel.app")
                        );
                    } catch {
                        return false;
                    }
                })();

                if (!isOurOrigin) {
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
    const { t } = useT();
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
                    aria-label={t("minimize")}
                >
                    <Minus size={18} weight="bold" />
                </button>
                <button
                    type="button"
                    onClick={() => window.deadsmile?.window?.toggleMaximize()}
                    aria-label={t("maximize")}
                >
                    <Square size={16} weight="bold" />
                </button>
                <button
                    type="button"
                    className="window-close"
                    onClick={() => !locked && window.deadsmile?.window?.close()}
                    aria-label={t("close")}
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

function ConfettiBurst({ origin, onDone }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;

        const colors = [
            "#ff5c7c",
            "#ffd166",
            "#7cf7a5",
            "#6ec8ff",
            "#c39bff",
            "#ffffff",
        ];
        const particles = Array.from({ length: 140 }, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 9;
            return {
                x: origin.x,
                y: origin.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                size: 4 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                life: 1,
            };
        });

        let raf;
        const start = performance.now();
        const tick = (now) => {
            const elapsed = (now - start) / 1000;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(dpr, dpr);

            for (const p of particles) {
                p.vy += 0.35;
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.vr;
                p.life = Math.max(0, 1 - elapsed / 3);

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
                ctx.restore();
            }
            ctx.restore();

            if (elapsed < 3) {
                raf = requestAnimationFrame(tick);
            } else {
                onDone?.();
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [origin, onDone]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 3000,
            }}
        />
    );
}

function SkullRain({ onDone }) {
    useEffect(() => {
        const timer = setTimeout(() => onDone?.(), 6000);
        return () => clearTimeout(timer);
    }, [onDone]);

    const skulls = useMemo(
        () =>
            Array.from({ length: 45 }).map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 1.5,
                duration: 2.5 + Math.random() * 2.5,
                size: 22 + Math.random() * 28,
                rotation: (Math.random() - 0.5) * 60,
            })),
        [],
    );

    return (
        <div className="skull-rain" aria-hidden="true">
            {skulls.map((s) => (
                <span
                    key={s.id}
                    style={{
                        left: `${s.left}%`,
                        fontSize: `${s.size}px`,
                        animationDelay: `${s.delay}s`,
                        animationDuration: `${s.duration}s`,
                        "--rot": `${s.rotation}deg`,
                    }}
                >
                    💀
                </span>
            ))}
        </div>
    );
}

function CrtOverlay({ onClose }) {
    const { t } = useT();

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div className="crt-overlay" onClick={onClose}>
            <div className="crt-hint">{t("easterCrtHint")}</div>
        </div>
    );
}

function EasterEggMenu({ onClose, onTrigger }) {
    const { t } = useT();

    const eggs = [
        {
            id: "konami",
            name: t("easterKonamiName"),
            hint: t("easterKonamiHint"),
            desc: t("easterKonamiDesc"),
        },
        {
            id: "confetti",
            name: t("easterConfettiName"),
            hint: t("easterConfettiHint"),
            desc: t("easterConfettiDesc"),
        },
        {
            id: "word",
            name: t("easterWordName"),
            hint: t("easterWordHint"),
            desc: t("easterWordDesc"),
        },
        {
            id: "menu",
            name: t("easterMenuName"),
            hint: t("easterMenuHint"),
            desc: t("easterMenuDesc"),
        },
    ];

    return (
        <Portal>
            <div
                className="overlay easter-overlay"
                onMouseDown={(e) =>
                    e.target === e.currentTarget && onClose()
                }
            >
                <section className="modal-card easter-modal">
                    <div className="modal-card__head">
                        <div>
                            <h3>{t("easterTitle")}</h3>
                        </div>
                        <button
                            type="button"
                            className="modal-close"
                            onClick={onClose}
                            aria-label={t("close")}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="easter-list">
                        {eggs.map((egg) => (
                            <button
                                key={egg.id}
                                type="button"
                                className="easter-item"
                                onClick={() => {
                                    if (egg.id === "menu") return;
                                    onTrigger?.(egg.id);
                                    onClose();
                                }}
                            >
                                <div className="easter-item-copy">
                                    <strong>{egg.name}</strong>
                                    <code>{egg.hint}</code>
                                    <span>{egg.desc}</span>
                                </div>
                                <Play
                                    size={16}
                                    weight="fill"
                                    className="easter-item-play"
                                />
                            </button>
                        ))}
                    </div>

                    <p className="easter-foot">{t("easterFoot")}</p>
                </section>
            </div>
        </Portal>
    );
}

function DownloadPanel({
    queue,
    onPause,
    onResume,
    onCancel,
    onReorder,
    onConcurrencyChange,
}) {
    const { t } = useT();
    const [collapsed, setCollapsed] = useState(false);
    const dragId = useRef(null);

    const active = queue.filter((q) => q.status !== "complete").length;
    const downloadingCount = queue.filter(
        (q) => q.status === "downloading",
    ).length;

    function handleDragStart(e, id) {
        dragId.current = id;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
    }
    function handleDragOver(e, id) {
        e.preventDefault();
        if (!dragId.current || dragId.current === id) return;
        const ids = queue.map((q) => q.id);
        const from = ids.indexOf(dragId.current);
        const to = ids.indexOf(id);
        if (from === -1 || to === -1) return;
        const next = [...ids];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder?.(next);
    }
    function handleDragEnd() {
        dragId.current = null;
    }

    return (
        <div className={`download-panel${collapsed ? " collapsed" : ""}`}>
            <button
                type="button"
                className="download-panel-head"
                onClick={() => setCollapsed((v) => !v)}
            >
                <div className="download-panel-title">
                    <strong>
                        {active > 0
                            ? t("downloads")
                            : t("downloads")}
                    </strong>
                    <span>
                        {downloadingCount}{" "}
                        {downloadingCount === 1
                            ? t("downloadActive")
                            : t("downloadActivePlural")}
                    </span>
                </div>
                <div className="download-panel-actions">
                    <select
                        value={downloadingCount || 2}
                        onChange={(e) =>
                            onConcurrencyChange?.(Number(e.target.value))
                        }
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("downloads")}
                    >
                        {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                                {t("maxConcurrent")} {n}
                            </option>
                        ))}
                    </select>
                    <CaretRight
                        size={16}
                        style={{
                            transform: collapsed
                                ? "rotate(0deg)"
                                : "rotate(90deg)",
                            transition: "transform .18s ease",
                        }}
                    />
                </div>
            </button>

            {!collapsed && (
                <div className="download-panel-list">
                    {queue.map((item) => {
                        const total = item.totalBytes || 0;
                        const received = item.bytesReceived || 0;
                        const speed = item.speed || 0;
                        const eta = item.eta;

                        let subtitle = "";
                        if (item.status === "downloading") {
                            const parts = [];
                            if (total > 0)
                                parts.push(
                                    `${formatBytes(received)} / ${formatBytes(total)}`,
                                );
                            if (speed > 0) parts.push(formatSpeed(speed));
                            if (eta != null && eta > 0)
                                parts.push(`ETA ${formatEta(eta)}`);
                            subtitle = parts.join(" · ") || t("downloadStarting");
                        } else if (item.status === "installing") {
                            subtitle = 	t("downloadInstalling");
                        } else if (item.status === "queued") {
                            subtitle = `${t("downloadQueuePosition")} (#${item.queuePosition + 1})`
                        } else if (item.status === "paused") {
                            subtitle = 	t("downloadPaused");
                        } else if (item.status === "complete") {
                            subtitle = 	t("downloadCompleted");
                        } else if (item.status === "failed") {
                            subtitle = `${t("downloadFailedLabel")}: ${item.error || t("error")}`;
                        }

                        return (
                            <div
                                key={item.id}
                                className={`download-item status-${item.status}`}
                                draggable
                                onDragStart={(e) =>
                                    handleDragStart(e, item.id)
                                }
                                onDragOver={(e) => handleDragOver(e, item.id)}
                                onDragEnd={handleDragEnd}
                            >
                                <span className="download-grip">
                                    <DotsSixVertical size={14} />
                                </span>

                                <div className="download-item-copy">
                                    <div className="download-item-title">
                                        <strong>{item.title}</strong>
                                        <small>{subtitle}</small>
                                    </div>
                                    <div className="download-bar">
                                        <i
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    item.percent || 0,
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="download-item-actions">
                                    {item.status === "downloading" && (
                                        <button
                                            type="button"
                                            title={t("pause")}
                                            onClick={() => onPause?.(item.id)}
                                        >
                                            <Pause size={14} weight="fill" />
                                        </button>
                                    )}
                                    {item.status === "queued" && (
                                        <button
                                            type="button"
                                            title={t("pause")}
                                            onClick={() => onPause?.(item.id)}
                                        >
                                            <Pause size={14} weight="fill" />
                                        </button>
                                    )}
                                    {item.status === "paused" && (
                                        <button
                                            type="button"
                                            title={t("resume")}
                                            onClick={() => onResume?.(item.id)}
                                        >
                                            <Play size={14} weight="fill" />
                                        </button>
                                    )}
                                    {item.status !== "complete" && (
                                        <button
                                            type="button"
                                            title={t("cancel")}
                                            className="danger"
                                            onClick={() => onCancel?.(item.id)}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}




function Boot() {
    const { t } = useT();
    return (
        <div className="boot-screen">
            <img
                className="boot-logo"
                src="./assets/branding/deadsmile-mark.svg"
                alt="Deadsmile Games"
            />
            <div className="boot-status">
                <span>FOIIIIIII O UPDATE BROOOO</span>
                <div className="loading-bar">
                    <i />
                </div>
            </div>
        </div>
    );
}

function Login({ onAuthenticated }) {
    const { t } = useT();
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
            setError(err?.message || t("unableToSignIn"));
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
                    <h1>{twoFactor ? t("verifyAccount") : t("welcome")}</h1>
                    <p>
                        {twoFactor
                            ? t("verifyDescription")
                            : t("signInDescription")}
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
                                {t("email")}
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
                                {t("password")}
                                <input
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder={t("yourPassword")}
                                    required
                                />
                            </label>
                        </>
                    ) : (
                        <label>
                            {t("authCode")}
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
                            ? t("signingIn")
                            : twoFactor
                              ? t("verifySignIn")
                              : t("signIn")}
                    </button>
                </form>
                <div className="login-links">
                    <button
                        type="button"
                        onClick={() => openExternal(`${SITE_URL}/register`)}
                    >
                        {t("createAccount")}
                    </button>
                    <button
                        type="button"
                        onClick={() => openExternal(`${SITE_URL}/support`)}
                    >
                        {t("needHelp")}
                    </button>
                </div>
            </section>
        </main>
    );
}

function Sidebar({ active, setActive, user, logout, openAdmin, language, openLinks }) {
    return (
        <aside className="sidebar">
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
                {isAdmin(user) ? (
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
                ) : (
                    <button
                        className="nav-item social-nav"
                        onClick={openLinks}
                    >
                        <LinkSimple size={21} />
                        <span>{text(language, "linksSocials")}</span>
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
        {
            label: "Itch.io",
            url: "https://deadsml.itch.io",
            icon: GameController,
        },
        {
            label: "GitHub",
            url: "https://github.com/teamdeadsmile",
            icon: GithubLogo,
        },
        {
            label: "More",
            url: "https://linktr.ee/teamdeadsmile",
            icon: LinkSimple,
        },
    ];

    return (
        <div
            className="overlay social-overlay"
            onMouseDown={(e) =>
                e.target === e.currentTarget && onClose()
            }
        >
            <section className="social-modal">
                <div className="modal-card__head">
                    <div>
                        <h3>{text(language, "linksSocials")}</h3>
                    </div>

                    <button
                        className="modal-close"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="social-list">
                    {links.map(({ label, url, icon: Icon }) => (
                        <button
                            key={url}
                            onClick={() => openExternal(url)}
                        >
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
    const { t } = useT();
    return (
        <div className="search-wrap">
            <MagnifyingGlass size={18} />
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
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
                                            ? t("game")
                                            : item.type === "video"
                                              ? t("video")
                                              : t("newswire")}
                                    </small>
                                </span>
                                <CaretRight size={15} />
                            </button>
                        ))
                    ) : (
                        <div className="search-empty">{t("noResults")}</div>
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
    const { t } = useT();
    return (
        <div className="content-toolbar">
            <div className="history-buttons">
                <button onClick={onBack} aria-label={t("back")}>
                    <ArrowLeft size={18} />
                </button>
                <button onClick={onForward} aria-label={t("forward")}>
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
                aria-label={t("notifications")}
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
    const { t } = useT();
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
                            t("game")}
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
                        aria-label={t("wishlist")}
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
                                    {t("play")}
                                </>
                            ) : (
                                <>
                                    <DownloadSimple size={14} />{" "}
                                    {t("download")}
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
    const { t } = useT();
    return (
        <div className="notifications-popover">
            <div className="notifications-head">
                <div>
                    <h3>{t("notifications")}</h3>
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
                    <span>{t("noNotifications")}</span>
                </div>
            )}
            {notifications.length > 0 && (
                <button className="notifications-clear" onClick={onClear}>
                    {t("markRead")}
                </button>
            )}
        </div>
    );
}

function UpdateOverlay({ info, progress, onUpdate, onLater, updating }) {
    const { t } = useT();
    if (!info) return null;
    if (updating)
        return (
            <div className="update-lock overlay">
                <section className="update-panel locked">
                    <h2>{t("updating")}</h2>
                    <p>{t("doNotClose")}</p>
                    <LoadingBar
                        label={
                            progress?.status === "installing"
                                ? t("installingUpdate")
                                : t("downloadingUpdate")
                        }
                        percent={progress?.percent || 0}
                    />
                </section>
            </div>
        );
    return (
        <div className="update-overlay overlay">
            <section className="update-panel">
                <h2>{t("updateAvailable")}</h2>
                <p>
                    {t("updateDescription")}{" "}
                    <strong>v{info.latestVersion}</strong>
                </p>
                {info.notes && <div className="update-notes">{info.notes}</div>}
                <div className="update-actions">
                    <button className="soft-button" onClick={onLater}>
                        {t("later")}
                    </button>
                    <button className="primary-button" onClick={onUpdate}>
                        {t("update")} <ArrowRight size={16} />
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
    playtime,
    openGame,
    openVideo,
    setView,
}) {
    const { t } = useT();
    const hero = games.find((g) => g.featured) || games[0];
    const continuePlaying = useMemo(() => {
        if (!playtime || !installed) return [];
        return Object.entries(playtime)
            .filter(([id]) => installed[id])
            .sort((a, b) => (b[1].lastPlayedAt || 0) - (a[1].lastPlayedAt || 0))
            .slice(0, 3)
            .map(([id, data]) => ({
                game: games.find((g) => String(g.id) === String(id)),
                data,
            }))
            .filter((x) => x.game);
    }, [playtime, installed, games]);
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
                                t("latest")}
                        </p>
                        <div className="hero-buttons">
                            <button
                                className="primary-button"
                                onClick={() => openGame(hero)}
                            >
                                {t("viewGame")} <CaretRight size={17} />
                            </button>
                            {hero.downloadUrl && (
                                <button
                                    className="soft-button"
                                    onClick={() =>
                                        onInstall(
                                            hero,
                                            Boolean(installed?.[hero.id]),
                                        )
                                    }
                                    disabled={Boolean(downloading[hero.id])}
                                >
                                    {downloading[hero.id] ? (
                                        <>
                                            <DownloadSimple size={17} />{" "}
                                            {t("downloading")}
                                        </>
                                    ) : installed?.[hero.id] ? (
                                        <>
                                            <Play size={17} weight="fill" />{" "}
                                            {t("play")}
                                        </>
                                    ) : (
                                        <>
                                            <DownloadSimple size={17} />{" "}
                                            {t("download")}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {continuePlaying.length > 0 && (
                <Section title={t("continuePlaying")}>
                    <div className="continue-grid">
                        {continuePlaying.map(({ game, data }) => (
                            <button
                                key={game.id}
                                className="continue-card"
                                onClick={() => onInstall(game, true)}
                            >
                                <div className="continue-image">
                                    <SmartImage
                                        src={imageOf(game)}
                                        fallback={FALLBACK_COVER}
                                        alt=""
                                    />
                                    <span className="continue-play">
                                        <Play size={20} weight="fill" />
                                    </span>
                                </div>
                                <div className="continue-copy">
                                    <strong>{game.title}</strong>
                                    <small>
                                        {formatPlaytime(data.totalMs)} · {formatRelative(data.lastPlayedAt, t)}
                                    </small>
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>
            )}
            <Section
                title={t("games")}
                action={t("viewAll")}
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
                    title={t("videos")}
                    action={t("viewAll")}
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
                                    <small>{v.category || t("video")}</small>
                                    <strong>{v.title}</strong>
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>
            )}
            {news.length > 0 && (
                <Section
                    title={t("newswire")}
                    action={t("viewAll")}
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
                                    <small>{t("newswire")}</small>
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
    const { t } = useT();
    return (
        <div className="page">
            <PageHeading
                title={t("games")}
                description={t("browseCatalog")}
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
function Library({
    games,
    installed,
    onInstall,
    onDelete,
    playtime,
    openGame,
    setView,
    setActive,
}) {
    const [sort, setSort] = useState("recent");
    const { t } = useT();
    const items = useMemo(() => {
        const list = games.filter((g) => installed[g.id]);
        const withPlay = list.map((g) => ({
            game: g,
            played: playtime?.[g.id]?.totalMs || 0,
            lastPlayed: playtime?.[g.id]?.lastPlayedAt || 0,
            addedAt: installed[g.id]?.downloadedAt || 0,
        }));
        switch (sort) {
            case "most-played":
                return withPlay.sort((a, b) => b.played - a.played);
            case "last-played":
                return withPlay.sort((a, b) => b.lastPlayed - a.lastPlayed);
            case "name":
                return withPlay.sort((a, b) =>
                    a.game.title.localeCompare(b.game.title),
                );
            case "recent":
            default:
                return withPlay.sort((a, b) => b.addedAt - a.addedAt);
        }
    }, [games, installed, playtime, sort]);

    return (
        <div className="page">
            <PageHeading
                title={t("library")}
                description={t("yourDownloads")}
            />

            {items.length > 0 && (
                <div className="library-toolbar">
                    <label>
                        {t("sortBy")}:
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                        >
                            <option value="recent">{t("sortRecent")}</option>
                            <option value="last-played">{t("sortLastPlayed")}</option>
                            <option value="most-played">{t("sortMostPlayed")}</option>
                            <option value="name">{t("sortName")}</option>
                        </select>
                    </label>
                </div>
            )}

            {items.length ? (
                <div className="library-list">
                    {items.map(({ game: g, played, lastPlayed }) => (
                        <article className="library-row" key={g.id}>
                            <SmartImage
                                src={imageOf(g)}
                                fallback={FALLBACK_COVER}
                                alt=""
                            />
                            <div>
                                <h3>{g.title}</h3>
                                <span>
                                    <CheckCircle size={15} /> {t("installed")}
                                </span>
                                {(played > 0 || lastPlayed > 0) && (
                                    <div className="library-playtime">
                                        {played > 0 && (
                                            <span>{formatPlaytime(played)} {t("played")}</span>
                                        )}
                                        {lastPlayed > 0 && (
                                            <span>· {formatRelative(lastPlayed, t)}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="library-meta">
                                <small>
                                    {installed[g.id]?.filename || t("localGame")}
                                </small>
                                <button
                                    className="soft-button"
                                    onClick={() => onInstall(g, true)}
                                >
                                    <Play size={16} weight="fill" />{" "}
                                    {t("play")}
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
                                    aria-label={`${t("delete")} ${g.title}`}
                                >
                                    <Trash size={17} />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <Empty
                    title={t("emptyLibrary")}
                    text={t("emptyLibraryText")}
                    action={t("exploreGames")}
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
    const { t } = useT();
    const items = games.filter((g) => wishlisted.has(g.id));
    return (
        <div className="page">
            <PageHeading
                title={t("wishlist")}
                description={t("wishlistDesc")}
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
                    title={t("nothingSaved")}
                    text={t("nothingSavedText")}
                    action={t("exploreGames")}
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
    const { t } = useT();
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
                                    t("downloading")
                                ) : installed ? (
                                    <>
                                        <Play size={17} weight="fill" />{" "}
                                        {t("play")}
                                    </>
                                ) : (
                                    <>
                                        <DownloadSimple size={17} />{" "}
                                        {t("download")}
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
                            {wishlisted ? t("wishlisted") : t("wishlist")}
                        </button>
                        {detail?.trailerUrl && (
                            <button
                                className="soft-button"
                                onClick={() =>
                                    openExternal(mediaUrl(detail.trailerUrl))
                                }
                            >
                                <Play size={16} /> {t("trailer")}
                            </button>
                        )}
                    </div>
                </div>
            </section>
            <div className="detail-columns">
                <main>
                    <section className="detail-section">
                        <h2>{t("about")}</h2>
                        <p>{detail?.description || detail?.shortDescription}</p>
                    </section>
                    <section className="detail-section">
                        <h2>{t("screenshots")}</h2>
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
                        <small>{t("status")}</small>
                        <strong>
                            {String(detail?.status || "released").replaceAll(
                                "_",
                                " ",
                            )}
                        </strong>
                    </div>
                    <div>
                        <small>{t("genres")}</small>
                        <strong>{detail?.genres?.join(" · ") || "—"}</strong>
                    </div>
                    <div>
                        <small>{t("platforms")}</small>
                        <strong>
                            {detail?.platforms?.join(" · ") || t("windows")}
                        </strong>
                    </div>
                    {detail?.releaseDate && (
                        <div>
                            <small>{t("release")}</small>
                            <strong>{detail.releaseDate}</strong>
                        </div>
                    )}
                </aside>
            </div>
            {selected &&
                createPortal(
                    <div
                        className="lightbox"
                        onMouseDown={(e) =>
                            e.target === e.currentTarget && setSelected(null)
                        }
                    >
                        <SmartImage
                            src={assetUrl(selected, FALLBACK_COVER)}
                            fallback={FALLBACK_COVER}
                            alt=""
                        />
                        <button
                            type="button"
                            onClick={() => setSelected(null)}
                            aria-label={t("close")}
                        >
                            <X size={20} />
                        </button>
                    </div>,
                    document.body,
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
    const { t } = useT();
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
                            <span>{t("noVideoSourceAvailable")}</span>
                        </div>
                    )}
                </div>
                <div className="video-modal-copy">
                    <small>{video.category || t("video")}</small>
                    <h2>{video.title}</h2>
                </div>
            </div>
        </div>
    );
}

function VideosPage({ videos, openVideo, setView, goBack }) {
    const { t } = useT();
    return (
        <div className="page">
            <PageHeading title={t("videos")} description={t("watchVideos")} />
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
                            <small>{v.category || t("video")}</small>
                            <strong>{v.title}</strong>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
function VideoDetail({ video, setView, goBack }) {
    const { t } = useT();
    const src = mediaUrl(video?.video_url || video?.videoUrl);
    const embed = videoEmbed(src);
    return (
        <div className="page video-detail-page">
            <PageHeading
                title={video?.title || t("video")}
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
                            <span>{t("noVideoSourceAvailable")}</span>
                        </div>
                    )}
                </div>
                <div className="video-detail-copy">
                    <small>{video?.category || t("video")}</small>
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
    const { t } = useT();
    return (
        <div className="page">
            <PageHeading title={t("newswire")} description={t("latest")} />
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
                            <small>{n.category || t("newswire")}</small>
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
    const { t } = useT();
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
                description={detail?.category || t("newswire")}
            />
            <article className="news-detail">
                <SmartImage
                    src={detail?.image}
                    fallback={FALLBACK_COVER}
                    alt=""
                />
                <div>
                    <small>{detail?.category || t("newswire")}</small>
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

function AvatarEditor({
    avatarDraft,
    rotation,
    zoom,
    pan,
    onClose,
    onDragStart,
    onDragMove,
    onDragEnd,
    onRotateLeft,
    onRotateRight,
    onZoomChange,
    onApply,
}) {
    const { t } = useT();
    if (!avatarDraft) return null;

    const scale = Math.max(260 / avatarDraft.width, 260 / avatarDraft.height);

    const imageScale = scale * zoom;

    return (
        <div
            className="overlay modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <section className="modal-card avatar-modal">
                <div className="modal-card__head">
                    <div>
                        <h3>{t("adjustPhoto")}</h3>
                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label={t("close")}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    className="crop-viewport"
                    onPointerDown={onDragStart}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                    onPointerCancel={onDragEnd}
                    onPointerLeave={onDragEnd}
                >
                    <img
                        src={avatarDraft.src}
                        alt=""
                        draggable={false}
                        style={{
                            width: avatarDraft.width * imageScale,

                            height: avatarDraft.height * imageScale,

                            marginLeft: -(avatarDraft.width * imageScale) / 2,

                            marginTop: -(avatarDraft.height * imageScale) / 2,

                            transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
                        }}
                    />
                </div>

                <div className="crop-controls">
                    <button
                        type="button"
                        className="crop-icon-btn"
                        onClick={onRotateLeft}
                        aria-label={t("rotateLeft")}
                    >
                        <ArrowCounterClockwise weight="bold" />
                    </button>

                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => onZoomChange(Number(e.target.value))}
                        aria-label={t("zoom")}
                    />

                    <button
                        type="button"
                        className="crop-icon-btn"
                        onClick={onRotateRight}
                        aria-label={t("rotateRight")}
                    >
                        <ArrowClockwise weight="bold" />
                    </button>
                </div>

                <div className="modal-card__foot">
                    <button
                        type="button"
                        className="soft-button"
                        onClick={onClose}
                    >
                        {t("cancel")}
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={onApply}
                    >
                        {t("apply")}
                        <Check size={16} />
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
    const { t } = useT();
    const [tab, setTab] = useState("profile");
    const [form, setForm] = useState({
        username: user?.username || "",
        bio: user?.bio || "",
        websiteUrl: user?.websiteUrl || "",
        location: user?.location || "",
        email: user?.email || "",
        avatarUrl: user?.avatarUrl || null,
    });
    const [saving, setSaving] = useState(false);
    const [totp, setTotp] = useState({ enabled: false });
    const [totpLoading, setTotpLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [avatarDraft, setAvatarDraft] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({
        x: 0,
        y: 0,
    });

    const dragState = useRef(null);

    useEffect(() => {
        api.get("/account/totp/status")
            .then((d) => setTotp({ enabled: Boolean(d?.enabled) }))
            .catch(() => {});
    }, []);

    const CROP_VIEWPORT = 260;
    const OUTPUT_SIZE = 420;

    async function onAvatarSelect(e) {
        const file = e.target.files?.[0];

        e.target.value = "";

        if (!file) return;

        if (
            !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
            file.size > 5_000_000
        ) {
            setMessage(t("usePngJpgWebpMax5MB"));
            return;
        }

        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (event) => resolve(event.target.result);

                reader.onerror = reject;

                reader.readAsDataURL(file);
            });

            const img = await new Promise((resolve, reject) => {
                const image = new Image();

                image.onload = () => resolve(image);
                image.onerror = reject;

                image.src = dataUrl;
            });

            setRotation(0);
            setZoom(1);
            setPan({
                x: 0,
                y: 0,
            });

            setAvatarDraft({
                src: dataUrl,
                width: img.naturalWidth,
                height: img.naturalHeight,
            });

            setMessage("");
        } catch (error) {
            console.error(error);

            setMessage(t("failedToProcessImage"));
        }
    }

    function coverScaleFor(draft) {
        return Math.max(
            CROP_VIEWPORT / draft.width,
            CROP_VIEWPORT / draft.height,
        );
    }

    function onDragStart(e) {
        e.currentTarget.setPointerCapture(e.pointerId);

        dragState.current = {
            startX: e.clientX - pan.x,
            startY: e.clientY - pan.y,
        };
    }

    function onDragMove(e) {
        if (!dragState.current) return;

        setPan({
            x: e.clientX - dragState.current.startX,

            y: e.clientY - dragState.current.startY,
        });
    }

    function onDragEnd() {
        dragState.current = null;
    }

    function cancelCrop() {
        setAvatarDraft(null);
    }

    function applyCrop() {
        if (!avatarDraft) return;

        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement("canvas");

            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;

            const ctx = canvas.getContext("2d");

            if (!ctx) return;

            const k = OUTPUT_SIZE / CROP_VIEWPORT;

            const displayScale = coverScaleFor(avatarDraft) * zoom;

            ctx.save();

            ctx.translate(
                OUTPUT_SIZE / 2 + pan.x * k,

                OUTPUT_SIZE / 2 + pan.y * k,
            );

            ctx.rotate((rotation * Math.PI) / 180);

            ctx.scale(displayScale * k, displayScale * k);

            ctx.drawImage(img, -avatarDraft.width / 2, -avatarDraft.height / 2);

            ctx.restore();

            const finalUrl = canvas.toDataURL("image/jpeg", 0.88);

            setForm((current) => ({
                ...current,
                avatarUrl: finalUrl,
            }));

            setAvatarDraft(null);
        };

        img.src = avatarDraft.src;
    }

    async function save(payload) {
        setSaving(true);
        setMessage("");

        try {
            const next = await api.patch("/account", payload);

            setUser(next);

            setForm((current) => ({
                ...current,

                username: next.username || current.username,

                bio: next.bio || "",

                websiteUrl: next.websiteUrl || "",

                location: next.location || "",

                email: next.email || current.email,

                avatarUrl: next.avatarUrl || null,
            }));

            setMessage(t("changesSaved"));

            setTimeout(() => setMessage(""), 1800);
        } catch (e) {
            setMessage(e?.message || t("unableToSaveChanges"));
        } finally {
            setSaving(false);
        }
    }
    async function setup2fa() {
        setTotpLoading(true);
        try {
            await api.get("/account/totp/setup");
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
                    <span className="account-nav-title">{t("account")}</span>
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            className={tab === item.id ? "is-active" : ""}
                            onClick={() => setTab(item.id)}
                        >
                            <item.icon size={18} weight="bold" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                    <span className="account-nav-title related">
                        {t("launcher")}
                    </span>
                    <button onClick={() => setTab("wishlist")}>
                        <HeartStraight size={18} />
                        <span>{t("wishlist")}</span>
                    </button>
                </aside>
                <div className="account-content">
                    <section className="account-hero">
                        <div className="account-avatar">
                            {form.avatarUrl ? (
                                <SmartImage
                                    src={form.avatarUrl}
                                    fallback=""
                                    alt=""
                                />
                            ) : (
                                <span>{initials(user)}</span>
                            )}
                            <label
                                className="account-avatar-edit"
                                aria-label={t("changePicture")}
                            >
                                <PencilSimple size={18} weight="bold" />

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={onAvatarSelect}
                                />
                            </label>
                        </div>
                        <div>
                            <h1>{user?.username || "Player"}</h1>
                            <span>
                                {user?.createdAt
                                    ? `${t("created")} ${new Date(user.createdAt).toLocaleDateString()}`
                                    : t("deadsmileGamesAccount")}
                            </span>
                        </div>
                    </section>
                    {tab === "profile" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{t("profileDetails")}</h2>
                                <p>{t("profileDescription")}</p>
                            </div>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    save({
                                        username: form.username,
                                        bio: form.bio,
                                        websiteUrl: form.websiteUrl || null,
                                        location: form.location || null,
                                        avatarUrl: form.avatarUrl || null,
                                    });
                                }}
                                className="account-form"
                            >
                                <Field
                                    label={t("username")}
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
                                    label={t("bio")}
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
                                    placeholder={t("writeSomethingAboutYourself")}
                                />
                                <Field
                                    label={t("website")}
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
                                    label={t("location")}
                                    value={form.location}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            location: e.target.value,
                                        })
                                    }
                                    placeholder={t("cityCountry")}
                                />
                                <div className="account-form-foot">
                                    {message && (
                                        <span
                                            className={
                                                message === t("changesSaved")
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
                                            ? t("saving")
                                            : t("saveProfile")}{" "}
                                        <FloppyDisk size={16} />
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                    {tab === "account" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{t("account")}</h2>
                                <p>{t("accountDescription")}</p>
                            </div>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    save({ email: form.email.toLowerCase() });
                                }}
                                className="account-form"
                            >
                                <Field
                                    label={t("email")}
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
                                        {t("save")} <FloppyDisk size={16} />
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                    {tab === "security" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{t("security")}</h2>
                                <p>
                                    {t("keepYourAccountProtectedWithTwoFactor")}
                                </p>
                            </div>
                            <div className="security-row">
                                <div className="security-icon">
                                    <ShieldCheck size={23} />
                                </div>
                                <div>
                                    <h3>{t("twoFactor")}</h3>
                                    <p>
                                        {totp.enabled
                                            ? t("yourAccountIsProtectedByAnAuthenticator")
                                            : t("addAnAuthenticatorAppForAnExtraLayerOfSecurity")}
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
                                        ? t("enabled")
                                        : t("notEnabled")}
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
                                        ? t("manage2fa")
                                        : t("setUp2fa")}{" "}
                                    <ArrowUpRight size={16} />
                                </button>
                            </div>
                            <div className="security-danger">
                                <div>
                                    <h3>{t("accountManagement")}</h3>
                                    <p>{t("accountManagementDescription")}</p>
                                </div>
                                <button
                                    className="soft-button"
                                    onClick={() =>
                                        openExternal(`${SITE_URL}/account`)
                                    }
                                >
                                    {t("openAccountCenter")}{" "}
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
                                <h2>{t("wishlist")}</h2>
                                <p>{t("wishlistAccount")}</p>
                            </div>
                            {games.filter((g) => wishlist.has(g.id)).length ? (
                                <div className="game-grid" style={{ padding: '0px 28px 28px' }}>
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
                                    title={t("nothingSaved")}
                                    text={t("nothingSavedText")}
                                />
                            )}
                        </section>
                    )}
                </div>
            </div>
            {avatarDraft && (
                <Portal>
                    <AvatarEditor
                        avatarDraft={avatarDraft}
                        rotation={rotation}
                        zoom={zoom}
                        pan={pan}
                        onClose={cancelCrop}
                        onDragStart={onDragStart}
                        onDragMove={onDragMove}
                        onDragEnd={onDragEnd}
                        onRotateLeft={() =>
                            setRotation((r) => r - 90)
                        }
                        onRotateRight={() =>
                            setRotation((r) => r + 90)
                        }
                        onZoomChange={setZoom}
                        onApply={applyCrop}
                    />
                </Portal>
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
    const { t } = useT();
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
            setMessage(e?.message || t("unableToLoadContent"));
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
            setMessage(t("publishedSuccessfully"));
            setForm(initialAdmin);
            await loadContent();
            onPublished?.();
        } catch (e) {
            setMessage(e?.message || t("unableToPublish"));
        } finally {
            setSaving(false);
        }
    }
    async function remove(kind, id) {
        if (!window.confirm(t("deleteThisItemPermanently"))) return;
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
            setMessage(e?.message || t("unableToDelete"));
        }
    }
    const selectedKind = selected?.kind;
    const selectedItem = selected?.item;
    return (
        <div className="page admin-page">
            <PageHeading
                title={t("manageContent")}
                description={t("publishAndManageGamesNewsAndVideosFromTheLauncher")}
            />
            <section className="manage-overview">
                <div className="manage-overview-head">
                    <div>
                        <h2>{t("everythingYouPublish")}</h2>
                    </div>
                    <button
                        className="soft-button"
                        onClick={loadContent}
                        disabled={loading}
                    >
                        <ArrowRight size={16} /> {t("refresh")}
                    </button>
                </div>
                <div className="manage-columns">
                    {["games", "news", "videos"].map((kind) => (
                        <div className="manage-column" key={kind}>
                            <div className="manage-column-head">
                                <span>
                                    {kind === "games"
                                        ? t("games")
                                        : kind === "news"
                                        ? t("newswire")
                                        : t("videos")}
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
                                    {t("nothingPublishedYet")}
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
                                t("publishedContent")}
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
                                {t("open")}
                            </button>
                            <button
                                className="danger-button"
                                onClick={() =>
                                    remove(selectedKind, selectedItem.id)
                                }
                            >
                                <Trash size={16} /> {t("delete")}
                            </button>
                        </div>
                    </div>
                </section>
            )}
            <div className="create-heading">
                <div>
                    <span>{t("publish")}</span>
                    <h2>{t("createSomethingNew")}</h2>
                </div>
            </div>
            <div className="create-actions">
                <button
                    onClick={() => setForm({ ...initialAdmin, type: "game" })}
                >
                    <GameController size={22} />
                    <span>
                        <strong>{t("newGame")}</strong>
                        <small>{t("addATitleToTheCatalog")}</small>
                    </span>
                    <Plus size={18} />
                </button>
                <button
                    onClick={() => setForm({ ...initialAdmin, type: "news" })}
                >
                    <Newspaper size={22} />
                    <span>
                        <strong>{t("newNews")}</strong>
                        <small>{t("publishANewswireStory")}</small>
                    </span>
                    <Plus size={18} />
                </button>
                <button
                    onClick={() => setForm({ ...initialAdmin, type: "video" })}
                >
                    <FilmStrip size={22} />
                    <span>
                        <strong>{t("newVideo")}</strong>
                        <small>{t("addANativeLauncherVideo")}</small>
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
    const { t } = useT();
    return (
        <div
            className="overlay form-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <section className="modal-card admin-form-card">
                <div className="modal-card__head">
                    <div>
                        <h3>
                            {form.type === "game"
                                ? t("publishGame")
                                : form.type === "news"
                                  ? t("publishNews")
                                  : t("publishVideo")}
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
                                label={t("title")}
                                value={form.title}
                                onChange={set("title")}
                                required
                            />
                            <div className="field-row">
                                <Field
                                    label={t("slug")}
                                    value={form.slug}
                                    onChange={set("slug")}
                                    required
                                />
                                <Field
                                    label={t("releaseDate")}
                                    type="date"
                                    value={form.releaseDate}
                                    onChange={set("releaseDate")}
                                />
                            </div>
                            <Field
                                label={t("shortDescription")}
                                value={form.shortDescription}
                                onChange={set("shortDescription")}
                                required
                            />
                            <Field
                                label={t("description")}
                                as="textarea"
                                value={form.description}
                                onChange={set("description")}
                                rows={6}
                            />
                            <div className="field-row">
                                <Field
                                    label={t("heroImageURL")}
                                    value={form.heroImage}
                                    onChange={set("heroImage")}
                                    placeholder="https://…"
                                />
                                <Field
                                    label={t("coverImageURL")}
                                    value={form.coverImage}
                                    onChange={set("coverImage")}
                                    placeholder="https://…"
                                />
                            </div>
                            <div className="field-row">
                                <Field
                                    label={t("trailerURL")}
                                    value={form.trailerUrl}
                                    onChange={set("trailerUrl")}
                                    placeholder="https://…"
                                />
                                <Field
                                    label={t("downloadURLItch")}
                                    value={form.downloadUrl}
                                    onChange={set("downloadUrl")}
                                    placeholder="https://…"
                                />
                            </div>
                            <div className="field-row">
                                <Field
                                    label={t("genres")}
                                    value={form.genres}
                                    onChange={set("genres")}
                                    placeholder={t("actionAdventure")}
                                />
                                <Field
                                    label={t("platforms")}
                                    value={form.platforms}
                                    onChange={set("platforms")}
                                    placeholder={t("windowsWeb")}
                                />
                            </div>
                            <label className="check-field">
                                <input
                                    type="checkbox"
                                    checked={form.featured}
                                    onChange={set("featured")}
                                />{" "}
                                {t("featuredGame")}
                            </label>
                        </>
                    )}
                    {form.type === "news" && (
                        <>
                            <Field
                                label={t("title")}
                                value={form.title}
                                onChange={set("title")}
                                required
                            />
                            <Field
                                label={t("excerpt")}
                                value={form.excerpt}
                                onChange={set("excerpt")}
                            />
                            <Field
                                label={t("body")}
                                as="textarea"
                                value={form.body}
                                onChange={set("body")}
                                rows={9}
                                required
                            />
                            <Field
                                label={t("imageURL")}
                                value={form.image}
                                onChange={set("image")}
                                placeholder="https://…"
                            />
                        </>
                    )}
                    {form.type === "video" && (
                        <>
                            <Field
                                label={t("title")}
                                value={form.title}
                                onChange={set("title")}
                                required
                            />
                            <Field
                                label={t("category")}
                                value={form.category}
                                onChange={set("category")}
                                required
                            />
                            <Field
                                label={t("videoURL")}
                                value={form.videoUrl}
                                onChange={set("videoUrl")}
                                placeholder={t("directMP4WebMWebmOrYouTubeURL")}
                            />
                            <Field
                                label={t("thumbnailURL")}
                                value={form.thumbnail}
                                onChange={set("thumbnail")}
                                placeholder="https://…"
                            />
                            <Field
                                label={t("durationSeconds")}
                                type="number"
                                min="0"
                                value={form.durationSeconds}
                                onChange={set("durationSeconds")}
                            />
                        </>
                    )}
                    <div className="admin-submit">
                        <button className="primary-button" disabled={saving}>
                            {saving ? t("publishing") : t("publish")}{" "}
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
    const {
            queue: downloadQueue,
            byId: downloadsById,
            pause: pauseDownload,
            resume: resumeDownload,
            cancel: cancelDownload,
            reorder: reorderDownloads,
            setConcurrent: setDownloadConcurrency,
        } = useDownloadQueue();
        const playtime = usePlaytime();
        const [confettiOrigin, setConfettiOrigin] = useState(null);
        const [skullRain, setSkullRain] = useState(false);
        const [crtMode, setCrtMode] = useState(false);
        const [easterMenuOpen, setEasterMenuOpen] = useState(false);
        const triggerKonami = useCallback(() => setCrtMode(true), []);
        const triggerSkullRain = useCallback(() => setSkullRain(true), []);
        const triggerConfetti = useCallback(
            () =>
                setConfettiOrigin({
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 3,
                }),
            [],
        );
        const triggerMenu = useCallback(() => setEasterMenuOpen(true), []);

        useKonamiCode(triggerKonami);
        useSecretWord("deadsmile", triggerSkullRain);
        useHotkey({ key: "c", ctrl: true, shift: true }, triggerConfetti);
        useHotkey({ key: "e", ctrl: true, shift: true }, triggerMenu);
        const online = useOnline();

        const t = useMemo(
            () => (key, params, fallback) => {
                const dict = COPY[language] || COPY.en;
                const raw = dict[key] || COPY.en[key] || fallback || key;
                return interpolate(raw, params);
            },
            [language],
        );
        const languageCtx = useMemo(() => ({ language, t }), [language, t]);
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
    const cached = readContentCache();
    if (cached) {
        setGames(cached.games || []);
        setNews(cached.news || []);
        setVideos(cached.videos || []);
        if (Array.isArray(cached.wishlistIds)) {
            setWishlist(new Set(cached.wishlistIds));
        }
    }
    Promise.all([
        api.get("/games?page=1&limit=48"),
        api.get("/news?limit=48"),
        api.get("/videos?limit=48"),
        api.get("/wishlist"),
    ])
        .then(([g, n, v, w]) => {
            if (!alive) return;
            const gs = listFrom(g, "games");
            const ns = listFrom(n, "news");
            const vs = listFrom(v, "videos");
            const ids = listFrom(w, "games").map((x) => x.id);

            setGames(gs);
            setNews(ns);
            setVideos(vs);
            setWishlist(new Set(ids));

            writeContentCache({
                games: gs,
                news: ns,
                videos: vs,
                wishlistIds: ids,
            });
        })
        .catch((e) => {
            if (!alive) return;
            if (cached) {
                setNotice(
                    COPY[language]?.offlineCacheNotice ||
                        "Sem conexão — mostrando conteúdo em cache.",
                );
            } else {
                setNotice(e?.message || "Unable to load launcher content.");
            }
        })
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
                        title: t("updateAvailable"),
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
            setNotice(e?.message || t("unableToUpdateWishlist"));
        }
    }
    async function installGame(game, play = false) {
        if (play && installed[game.id]?.path) {
            if (window.deadsmile?.playGame) {
                const result = await window.deadsmile.playGame({
                    id: game.id,
                    exePath: installed[game.id].path,
                });
                if (result?.error) setNotice(result.error);
            } else {
                const error = await window.deadsmile?.openPath(
                    installed[game.id].path,
                );
                if (error) setNotice(error);
            }
            return;
        }

        if (!online) {
            setNotice(t("offlineNoDownload"));
            return;
        }

    if (!game.downloadUrl) {
        setNotice(t("downloadUnavailable"));
        return;
    }

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

        setNotifications((n) => [
            {
                id: `game-${game.id}-${Date.now()}`,
                title: t("downloadComplete"),
                message: `${game.title} ${t("gameReady")}`,
                time: Date.now(),
                unread: true,
            },
            ...n,
        ]);
        setNotice(`${game.title} ${t("gameReady")}`);
    } catch (e) {
        const msg = e?.message || "";
        if (msg === "Cancelled") {
            setNotice(`${game.title}: ${t("downloadCancelled")}`);
            return;
        }
        setNotifications((n) => [
            {
                id: `error-${Date.now()}`,
                title: t("downloadFailed"),
                message: msg || t("downloadFailed"),
                time: Date.now(),
                unread: true,
            },
            ...n,
        ]);
        setNotice(msg || t("downloadFailed"));
    }
}
    async function deleteInstalledGame(game) {
        const entry = installed[game.id];
        if (!entry?.path) return;
        const confirmed = window.confirm(
            `${t("deleteItem")}\n\n${game.title}`,
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
            setNotice(`${game.title} ${t("wasRemovedFromYourLibrary")}`);
        } catch (e) {
            setNotice(e?.message || t("unableToDeleteLocalGame"));
        }
    }
    async function startUpdate() {
        if (!updateInfo || !window.deadsmile?.updateLauncher) return;
        setUpdating(true);
        try {
            await window.deadsmile.updateLauncher();
        } catch (e) {
            setUpdating(false);
            setNotice(e?.message || t("downloadFailed"));
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
            <LanguageContext.Provider value={languageCtx}>
                <WindowChrome />
                <Boot />
            </LanguageContext.Provider>
        );
        if (status === "login")
            return (
                <LanguageContext.Provider value={languageCtx}>
                    <WindowChrome />
                    <Login
                        onAuthenticated={(u) => {
                            setUser(u);
                            setStatus("ready");
                            setActive("explore");
                        }}
                    />
                </LanguageContext.Provider>
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
                downloading={Boolean(downloadsById[selectedGame.id])}
            />
        );
    else if (view?.type === "catalog")
        current = (
            <Catalog
                games={games}
                wishlisted={wishlist}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                downloading={downloadsById}
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
                downloading={Boolean(downloadsById[view.item.id])}
            />
        );
    else if (active === "explore")
        current = (
            <Explore
                games={games}
                news={news}
                videos={videos}
                playtime={playtime}
                loading={loading}
                wishlisted={wishlist}
                onWishlist={toggleWishlist}
                onInstall={installGame}
                downloading={downloadsById}
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
                playtime={playtime}
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
                downloading={downloadsById}
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
                downloading={downloadsById}
                openGame={openGame}
            />
        );
    else if (active === "admin" && isAdmin(user))
        current = <Admin onPublished={refreshContent} setView={setView} />;
    else current = null;
    return (
        <>
            <LanguageContext.Provider value={languageCtx}>
            <WindowChrome locked={updating} />
            <div className="launcher">
                <Sidebar
                    active={active}
                    setActive={nav}
                    user={user}
                    logout={logout}
                    openAdmin={() => nav("admin")}
                    openLinks={() => setLinksOpen(true)}
                    language={language}
                />
                <main className="content">
                        {!online && (
                            <div className="offline-banner">
                                <WarningCircle size={16} weight="bold" />
                                <span>{t("offlineBanner")}</span>
                            </div>
                        )}
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
                        {downloadQueue.length > 0 && (
                            <DownloadPanel
                                queue={downloadQueue}
                                onPause={pauseDownload}
                                onResume={resumeDownload}
                                onCancel={cancelDownload}
                                onReorder={reorderDownloads}
                                onConcurrencyChange={setDownloadConcurrency}
                            />
                        )}
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
                <Portal>
                    <VideoPlayer video={selectedVideo} onClose={goBack} />
                </Portal>
            )}
            {confettiOrigin && (
                <ConfettiBurst
                    origin={confettiOrigin}
                    onDone={() => setConfettiOrigin(null)}
                />
            )}
            {skullRain && <SkullRain onDone={() => setSkullRain(false)} />}
            {crtMode && <CrtOverlay onClose={() => setCrtMode(false)} />}
            {easterMenuOpen && (
                <EasterEggMenu
                onClose={() => setEasterMenuOpen(false)}
                    onTrigger={(id) => {
                        if (id === "konami") setCrtMode(true);
                        if (id === "confetti") {
                            setConfettiOrigin({
                                x: window.innerWidth / 2,
                                y: window.innerHeight / 3,
                            });
                        }
                        if (id === "word") setSkullRain(true);
                    }}
                />
            )}
                </LanguageContext.Provider>
        </>
    );
}
