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
    CurrencyDollarIcon,
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

const SITE_URL = "https://deadsmilegames.vercel.app";
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
        telemetry: "Optional diagnostics",
        telemetryDescription: "Share anonymous crash and install failure reports. No gameplay or personal files are collected.",
        telemetryEnabled: "Diagnostics enabled",
        telemetryDisabled: "Diagnostics disabled",
        save: "Save settings",
        profile: "Profile",
        security: "Security",
        changePicture: "Change profile picture",
        websiteOnly:
            "Profile picture changes are available on the Deadsmile Games website.",
        websiteOnlyDescription:
            "Open your account on the website to upload or change your profile picture.",
        openWebsite: "Open website",
        companyLinks: "Deadsmile Games links",
        wishlistAccount: "Your saved games",
        close: "Close",
        games: "Games",
        videos: "Videos",
        newswire: "Newswire",
        viewAll: "View all",
        installed: "Installed",
        play: "Play",
        playing: "Playing",
        cloudSaves: "Cloud saves",
        noCloudSaves: "No cloud saves found.",
        deleteCloudSave: "Delete cloud save",
        deleteCloudSaveConfirm: "Click delete again to confirm.",
        cloudSaveDeleted: "Cloud save deleted.",
        cloudSaveConflict: "Cloud save conflict detected. Your local and remote copies were preserved for recovery.",
        loading: "Loading…",
        achievementUnlocked: "Achievement unlocked",
        achievements: "Achievements",
        gameView: "Game View",
        gameViewSubtitle: "Your game tools without leaving the action.",
        gameViewSetting: "Game View",
        gameViewSettingDescription: "Show the Game View overlay while a game is running.",
        gameViewEnabled: "Enabled",
        gameViewDisabled: "Disabled",
        gameViewShortcut: "Game View shortcut",
        gameViewShortcutDescription: "Choose the keyboard shortcut used while playing.",
        changeGameViewShortcut: "Change shortcut",
        pressGameViewShortcut: "Press a new shortcut…",
        gameViewShortcutUpdated: "Game View shortcut updated.",
        gameViewShortcutUnavailable: "That shortcut is already being used.",
        gameViewShortcutInvalid: "Use a shortcut such as Ctrl + G.",
        gameViewTutorialTitle: "Meet Game View",
        gameViewTutorialDescription: "Press {shortcut} to open or close Game View while playing.",
        gameViewTutorialProfile: "See your profile and the game currently running.",
        gameViewTutorialLibrary: "Browse the games in your library.",
        gameViewTutorialCloud: "Check and delete cloud saves for supported games.",
        gameViewTutorialScreenshot: "Take a clean screenshot of the game without the overlay.",
        gotIt: "Got it",
        takeScreenshot: "Take screenshot",
        screenshotSaved: "Screenshot saved",
        screenshotFailed: "Could not take screenshot",
        openScreenshotFolder: "Open screenshot folder",
        shareOnX: "Share on X",
        sharePreparing: "Preparing screenshot…",
        shareFailed: "Could not share on X.",
        sharePlayingX: "Look what I'm playing on the @DeadsmileGames Launcher: {game}",
        sharePasteScreenshot: "Screenshot copied. Paste it into X with Ctrl + V.",
        noAchievements: "No achievements yet.",
        cloudSavesUnavailable: "Cloud saves are not enabled for this game.",
        selectGame: "Select a game",
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
        relatedVideos: "Related videos",
        relatedGames: "Related games",
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
        newContentAvailable: "New content is available.",
        noNotifications: "No recent notifications.",
        markRead: "Mark all read",
        updateAvailable: "Update available",
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
        retry: "Try again",
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
        purchaseURLItch: "Purchase URL (itch.io)",
        itchGameId: "itch.io game ID",
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
        unableToPlayGame: "We could not start this game right now.",
        unableToSignIn: "Unable to sign in.",
        yourPassword: "Your password",
        cityCountry: "City, Country",
        windows: "Windows",
        checkForUpdates: "Check for updates",
        updateCheckFailed: "We could not check for updates right now.",
        checkingUpdate: "Checking…",
        youAreUpToDate: "You're up to date.",
        launcherUpdatedEyebrow: "Launcher updated",
        launcherUpdatedTitle: "You're on the latest version",
        launcherUpdatedDescription:
            "Deadsmile Games Launcher was updated to v{version}.",
        whatsNew: "What's new",
        viewOnGithub: "View on GitHub",
        dismiss: "Dismiss",
        purchase: "Purchase",
        buy: "Buy",
        owned: "Owned",
        purchaseTitle: "Get this game",
        connectItchTitle: "Connect itch.io",
        connectItchText: "Connect your itch.io account so Deadsmile Games can verify games you purchased or claimed.",
        connectItchAction: "Connect account",
        connectingItch: "Waiting for itch.io",
        connectingItchText: "Finish connecting in your browser. This launcher will update automatically.",
        checkoutTitle: "Secure checkout",
        checkoutText: "Complete the purchase on itch.io, then return here. Your library will update automatically.",
        openCheckout: "Open checkout",
        verifyPurchase: "I completed the purchase",
        purchaseVerified: "Purchase verified",
        purchaseVerifiedText: "The game is now in your Deadsmile Games library.",
        itchConnectionFailed: "We could not connect to itch.io right now.",
        itchVerificationFailed: "We could not verify this purchase right now.",
        itchAccount: "itch.io account",
        itchAccountDescription: "Verify purchases and keep your library synchronized.",
        connectedAs: "Connected account",
        connected: "Connected",
        notConnected: "Not connected",
        refreshLibrary: "Refresh library",
        disconnect: "Disconnect",
        libraryUpdated: "Your itch.io library is up to date.",
        accountDisconnected: "Your itch.io account was disconnected.",
        purchased: "Purchased",
    },
    "pt-BR": {
        error: "Erro",
        unableToUpdateWishlist: "Não foi possível atualizar a lista.",
        wasRemovedFromYourLibrary: "foi removido da sua biblioteca.",
        unableToDeleteLocalGame: "Não foi possível excluir o jogo local.",
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
        telemetry: "Diagnóstico opcional",
        telemetryDescription: "Compartilhe falhas anônimas do launcher e de instalação. Jogabilidade e arquivos pessoais não são coletados.",
        telemetryEnabled: "Diagnóstico ativado",
        telemetryDisabled: "Diagnóstico desativado",
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
        playing: "Jogando",
        cloudSaves: "Saves na nuvem",
        noCloudSaves: "Nenhum save na nuvem encontrado.",
        deleteCloudSave: "Apagar save da nuvem",
        deleteCloudSaveConfirm: "Clique em apagar novamente para confirmar.",
        cloudSaveDeleted: "Save da nuvem apagado.",
        cloudSaveConflict: "Conflito de save na nuvem detectado. As cópias local e remota foram preservadas para recuperação.",
        loading: "Carregando…",
        achievementUnlocked: "Conquista desbloqueada",
        achievements: "Conquistas",
        gameView: "Game View",
        gameViewSubtitle: "Suas ferramentas de jogo sem sair da partida.",
        gameViewSetting: "Game View",
        gameViewSettingDescription: "Exibe a Game View enquanto um jogo estiver aberto.",
        gameViewEnabled: "Ativada",
        gameViewDisabled: "Desativada",
        gameViewShortcut: "Atalho da Game View",
        gameViewShortcutDescription: "Escolha o atalho usado para abrir a Game View durante o jogo.",
        changeGameViewShortcut: "Mudar atalho",
        pressGameViewShortcut: "Pressione o novo atalho…",
        gameViewShortcutUpdated: "Atalho da Game View atualizado.",
        gameViewShortcutUnavailable: "Esse atalho já está sendo usado.",
        gameViewShortcutInvalid: "Use um atalho como Ctrl + G.",
        gameViewTutorialTitle: "Conheça a Game View",
        gameViewTutorialDescription: "Pressione {shortcut} para abrir ou fechar a Game View enquanto joga.",
        gameViewTutorialProfile: "Veja seu perfil e o jogo que está rodando.",
        gameViewTutorialLibrary: "Navegue pelos jogos da sua biblioteca.",
        gameViewTutorialCloud: "Veja e apague saves na nuvem dos jogos compatíveis.",
        gameViewTutorialScreenshot: "Tire uma captura limpa do jogo sem o overlay aparecer.",
        gotIt: "Entendi",
        takeScreenshot: "Tirar screenshot",
        screenshotSaved: "Screenshot salvo",
        screenshotFailed: "Não foi possível tirar o screenshot",
        openScreenshotFolder: "Abrir pasta de screenshots",
        shareOnX: "Compartilhar no X",
        sharePreparing: "Preparando screenshot…",
        shareFailed: "Não foi possível compartilhar no X.",
        sharePlayingX: "Olha o que eu estou jogando no @DeadsmileGames Launcher: {game}",
        sharePasteScreenshot: "Screenshot copiada. Cole no X com Ctrl + V.",
        noAchievements: "Nenhuma conquista ainda.",
        cloudSavesUnavailable: "Os saves na nuvem não estão ativados para este jogo.",
        selectGame: "Selecione um jogo",
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
        relatedVideos: "Vídeos relacionados",
        relatedGames: "Jogos relacionados",
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
        newContentAvailable: "Há um novo conteúdo disponível.",
        noNotifications: "Nenhuma notificação recente.",
        markRead: "Marcar todas como lidas",
        updateAvailable: "Atualização disponível",
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
        retry: "Tentar novamente",
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
        purchaseURLItch: "URL de compra (itch.io)",
        itchGameId: "ID do jogo no itch.io",
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
        unableToPlayGame: "Não foi possível iniciar este jogo agora.",
        unableToSignIn: "Não foi possível entrar.",
        yourPassword: "Sua senha",
        cityCountry: "Cidade, País",
        windows: "Windows",
        checkForUpdates: "Verificar atualizações",
        updateCheckFailed: "Não foi possível verificar atualizações agora.",
        checkingUpdate: "Verificando…",
        youAreUpToDate: "Você está atualizado.",
        launcherUpdatedEyebrow: "Atualização do launcher",
        launcherUpdatedTitle: "Você está na versão mais recente",
        launcherUpdatedDescription:
            "O Deadsmile Games Launcher foi atualizado para a versão v{version}.",
        whatsNew: "Novidades",
        viewOnGithub: "Ver no GitHub",
        dismiss: "Ignorar",
        purchase: "Comprar",
        buy: "Comprar",
        owned: "Na biblioteca",
        purchaseTitle: "Obter este jogo",
        connectItchTitle: "Vincular itch.io",
        connectItchText: "Vincule sua conta itch.io para a Deadsmile Games verificar jogos comprados ou resgatados.",
        connectItchAction: "Vincular conta",
        connectingItch: "Aguardando o itch.io",
        connectingItchText: "Conclua a vinculação no navegador. O launcher será atualizado automaticamente.",
        checkoutTitle: "Compra segura",
        checkoutText: "Conclua a compra no itch.io e volte para cá. Sua biblioteca será atualizada automaticamente.",
        openCheckout: "Abrir compra",
        verifyPurchase: "Concluí a compra",
        purchaseVerified: "Compra verificada",
        purchaseVerifiedText: "O jogo agora está na sua biblioteca Deadsmile Games.",
        itchConnectionFailed: "Não foi possível conectar ao itch.io agora.",
        itchVerificationFailed: "Não foi possível verificar esta compra agora.",
        itchAccount: "Conta itch.io",
        itchAccountDescription: "Verifique compras e mantenha sua biblioteca sincronizada.",
        connectedAs: "Conta vinculada",
        connected: "Vinculada",
        notConnected: "Não vinculada",
        refreshLibrary: "Atualizar biblioteca",
        disconnect: "Desvincular",
        libraryUpdated: "Sua biblioteca do itch.io está atualizada.",
        accountDisconnected: "Sua conta itch.io foi desvinculada.",
        purchased: "Comprado",
    },
    es: {
        error: "Error",
        unableToUpdateWishlist: "No se pudo actualizar la lista.",
        wasRemovedFromYourLibrary: "se eliminó de tu biblioteca.",
        unableToDeleteLocalGame: "No se pudo eliminar el juego local.",
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
        telemetry: "Diagnóstico opcional",
        telemetryDescription: "Comparte fallos anónimos del launcher y de instalación. No se recopilan partidas ni archivos personales.",
        telemetryEnabled: "Diagnóstico activado",
        telemetryDisabled: "Diagnóstico desactivado",
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
        playing: "Jugando",
        cloudSaves: "Guardados en la nube",
        noCloudSaves: "No hay guardados en la nube.",
        deleteCloudSave: "Borrar guardado de la nube",
        deleteCloudSaveConfirm: "Pulsa borrar de nuevo para confirmar.",
        cloudSaveDeleted: "Guardado de la nube eliminado.",
        cloudSaveConflict: "Se detectó un conflicto de guardado en la nube. Las copias local y remota se conservaron para recuperación.",
        loading: "Cargando…",
        achievementUnlocked: "Logro desbloqueado",
        achievements: "Logros",
        gameView: "Game View",
        gameViewSubtitle: "Tus herramientas de juego sin salir de la partida.",
        gameViewSetting: "Game View",
        gameViewSettingDescription: "Muestra Game View mientras un juego está abierto.",
        gameViewEnabled: "Activada",
        gameViewDisabled: "Desactivada",
        gameViewShortcut: "Atajo de Game View",
        gameViewShortcutDescription: "Elige el atajo para abrir Game View durante el juego.",
        changeGameViewShortcut: "Cambiar atajo",
        pressGameViewShortcut: "Pulsa el nuevo atajo…",
        gameViewShortcutUpdated: "Atajo de Game View actualizado.",
        gameViewShortcutUnavailable: "Ese atajo ya está en uso.",
        gameViewShortcutInvalid: "Usa un atajo como Ctrl + G.",
        gameViewTutorialTitle: "Conoce Game View",
        gameViewTutorialDescription: "Pulsa {shortcut} para abrir o cerrar Game View mientras juegas.",
        gameViewTutorialProfile: "Mira tu perfil y el juego que está en ejecución.",
        gameViewTutorialLibrary: "Explora los juegos de tu biblioteca.",
        gameViewTutorialCloud: "Consulta y elimina guardados en la nube de juegos compatibles.",
        gameViewTutorialScreenshot: "Haz una captura limpia del juego sin mostrar el overlay.",
        gotIt: "Entendido",
        takeScreenshot: "Tomar captura",
        screenshotSaved: "Captura guardada",
        screenshotFailed: "No se pudo tomar la captura",
        openScreenshotFolder: "Abrir carpeta de capturas",
        shareOnX: "Compartir en X",
        sharePreparing: "Preparando captura…",
        shareFailed: "No se pudo compartir en X.",
        sharePlayingX: "Mira lo que estoy jugando en el @DeadsmileGames Launcher: {game}",
        sharePasteScreenshot: "Captura copiada. Pégala en X con Ctrl + V.",
        noAchievements: "Todavía no hay logros.",
        cloudSavesUnavailable: "Los guardados en la nube no están activados para este juego.",
        selectGame: "Selecciona un juego",
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
        relatedVideos: "Vídeos relacionados",
        relatedGames: "Juegos relacionados",
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
        newContentAvailable: "Hay nuevo contenido disponible.",
        noNotifications: "No hay notificaciones recientes.",
        markRead: "Marcar todas como leídas",
        updateAvailable: "Actualización disponible",
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
        retry: "Intentar de nuevo",
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
        purchaseURLItch: "URL de compra (itch.io)",
        itchGameId: "ID del juego en itch.io",
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
        unableToPlayGame: "No se pudo iniciar este juego ahora.",
        unableToSignIn: "No se pudo iniciar sesión.",
        yourPassword: "Tu contraseña",
        cityCountry: "Ciudad, País",
        windows: "Windows",
        checkForUpdates: "Verificar actualizaciones",
        updateCheckFailed: "No se pudieron verificar actualizaciones ahora.",
        checkingUpdate: "Verificando…",
        youAreUpToDate: "Estás actualizado.",
        launcherUpdatedEyebrow: "Launcher actualizado",
        launcherUpdatedTitle: "Estás en la última versión",
        launcherUpdatedDescription:
            "Deadsmile Games Launcher se actualizó a la v{version}.",
        whatsNew: "Novedades",
        viewOnGithub: "Ver en GitHub",
        dismiss: "Descartar",
        purchase: "Comprar",
        buy: "Comprar",
        owned: "En la biblioteca",
        purchaseTitle: "Obtener este juego",
        connectItchTitle: "Conectar itch.io",
        connectItchText: "Conecta tu cuenta de itch.io para que Deadsmile Games verifique juegos comprados o reclamados.",
        connectItchAction: "Conectar cuenta",
        connectingItch: "Esperando a itch.io",
        connectingItchText: "Termina la conexión en el navegador. El launcher se actualizará automáticamente.",
        checkoutTitle: "Compra segura",
        checkoutText: "Completa la compra en itch.io y vuelve aquí. Tu biblioteca se actualizará automáticamente.",
        openCheckout: "Abrir compra",
        verifyPurchase: "Completé la compra",
        purchaseVerified: "Compra verificada",
        purchaseVerifiedText: "El juego ya está en tu biblioteca de Deadsmile Games.",
        itchConnectionFailed: "No se pudo conectar con itch.io ahora.",
        itchVerificationFailed: "No se pudo verificar esta compra ahora.",
        itchAccount: "Cuenta de itch.io",
        itchAccountDescription: "Verifica compras y mantén tu biblioteca sincronizada.",
        connectedAs: "Cuenta conectada",
        connected: "Conectada",
        notConnected: "No conectada",
        refreshLibrary: "Actualizar biblioteca",
        disconnect: "Desconectar",
        libraryUpdated: "Tu biblioteca de itch.io está actualizada.",
        accountDisconnected: "Tu cuenta de itch.io fue desconectada.",
        purchased: "Comprado",
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

const PUBLIC_CONTENT_CACHE_KEY = "deadsmile.cache.content.v2";
const LEGACY_CONTENT_CACHE_KEY = "deadsmile.cache.content.v1";
const USER_CACHE_PREFIX = "deadsmile.cache.user.v1:";

function validUserId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function readPublicContentCache() {
    try {
        const current = JSON.parse(localStorage.getItem(PUBLIC_CONTENT_CACHE_KEY) || "null");
        if (current) return current;
        const legacy = JSON.parse(localStorage.getItem(LEGACY_CONTENT_CACHE_KEY) || "null");
        if (!legacy) return null;
        return {
            ts: legacy.ts || 0,
            games: legacy.games || [],
            news: legacy.news || [],
            videos: legacy.videos || [],
        };
    } catch {
        return null;
    }
}

function writePublicContentCache({ games, news, videos }) {
    try {
        localStorage.setItem(
            PUBLIC_CONTENT_CACHE_KEY,
            JSON.stringify({
                ts: Date.now(),
                games: games || [],
                news: news || [],
                videos: videos || [],
            }),
        );
        localStorage.removeItem(LEGACY_CONTENT_CACHE_KEY);
    } catch {}
}

function userCacheKey(userId) {
    return validUserId(userId) ? `${USER_CACHE_PREFIX}${userId}` : null;
}

function readUserContentCache(userId) {
    const key = userCacheKey(userId);
    if (!key) return null;
    try {
        return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
        return null;
    }
}

function writeUserContentCache(userId, { wishlistIds }) {
    const key = userCacheKey(userId);
    if (!key) return;
    try {
        localStorage.setItem(
            key,
            JSON.stringify({
                ts: Date.now(),
                wishlistIds: Array.isArray(wishlistIds) ? wishlistIds : [],
            }),
        );
    } catch {}
}

function clearUserContentCache(userId) {
    const key = userCacheKey(userId);
    if (!key) return;
    try { localStorage.removeItem(key); } catch {}
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


const RunningGamesContext = createContext(new Set());
function useRunningGames() { return useContext(RunningGamesContext); }

const LanguageContext = createContext({
    language: "en",
    t: (key, params, fallback) => fallback || key,
});

function useT() {
    return useContext(LanguageContext);
}
const FALLBACK_COVER = `${SITE_URL}/assets/placeholders/game-cover.svg`;
const FALLBACK_HERO = `${SITE_URL}/assets/placeholders/game-hero.svg`;

function safeExternalUrl(value) {
    if (typeof value !== "string" || value.length > 4096) return "";
    try {
        const url = new URL(value);
        if (url.username || url.password) return "";
        return ["https:", "mailto:"].includes(url.protocol) ? url.toString() : "";
    } catch {
        return "";
    }
}

function openExternal(url) {
    const safe = safeExternalUrl(url);
    if (!safe) return false;
    if (window.deadsmile?.openExternal) return window.deadsmile.openExternal(safe);
    window.open(safe, "_blank", "noopener,noreferrer");
    return true;
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
    const raw = String(value);
    if (raw.length > 2_000_000) return fallback;
    if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(raw)) return raw;
    try {
        const url = new URL(raw, API_ASSET_ROOT);
        if (url.protocol !== "https:" || url.username || url.password) return fallback;
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

function formatCalendarDate(value, locale) {
    if (!value) return "";

    const text = String(value).trim();

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);

    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return "";
        }

        return new Intl.DateTimeFormat(locale || undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: "UTC",
        }).format(date);
    }

    return "";
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
                            u.hostname === "deadsmile.vercel.app" ||
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
                            subtitle = t("downloadInstalling");
                        } else if (item.status === "updating") {
                            subtitle = t("updating");
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
            <div className="boot-status">
                <span>{t("startingLauncher")}</span>
                <div className="loading-bar boot-loading-bar">
                    <i />
                </div>
            </div>
        </div>
    );
}

function useLauncherVersion() {
    const [version, setVersion] = useState("");
    useEffect(() => {
        let alive = true;
        window.deadsmile?.version?.().then?.((value) => {
            if (alive) setVersion(String(value || ""));
        }).catch?.(() => {});
        return () => { alive = false; };
    }, []);
    return version;
}

function Login({ onAuthenticated }) {
    const { t } = useT();
    const launcherVersion = useLauncherVersion();
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
            {launcherVersion && <span className="launcher-version login-version">v{launcherVersion}</span>}
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
                {isAdmin(user) && (
                    <button
                        className={
                            active === "admin"
                                ? "nav-item active admin-nav manage-2"
                                : "nav-item admin-nav manage-2"
                        }
                        onClick={openAdmin}
                    >
                        <GearSix size={21} />
                        <span>{text(language, "manage")}</span>
                    </button>
                )}
                    <button
                        className="nav-item social-nav"
                        onClick={openLinks}
                    >
                        <LinkSimple size={21} />
                        <span>{text(language, "linksSocials")}</span>
                    </button>
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
            url: "https://instagram.com/deadsmilegames",
            icon: InstagramLogo,
        },
        {
            label: "Itch.io",
            url: "https://deadsml.itch.io",
            icon: GameController,
        },
        {
            label: "GitHub",
            url: "https://github.com/deadsmilegames",
            icon: GithubLogo,
        },
        {
            label: "More",
            url: "https://linktr.ee/deadsmilegames",
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

function CommerceModal({ state, onClose, onConnect, onCheckout, onVerify, onDownload }) {
    const { t } = useT();
    if (!state?.game) return null;
    const content = {
        connect: [t("connectItchTitle"), t("connectItchText")],
        connecting: [t("connectingItch"), t("connectingItchText")],
        checkout: [t("checkoutTitle"), t("checkoutText")],
        owned: [t("purchaseVerified"), t("purchaseVerifiedText")],
        error: [t("error"), state.message || t("itchVerificationFailed")],
    }[state.status] || [t("purchaseTitle"), t("itchVerificationFailed")];
    return (
        <Portal>
            <div className="overlay commerce-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
                <section className="commerce-modal">
                    <button className="modal-close" onClick={onClose} aria-label={t("close")}><X size={18} /></button>
                    <SmartImage src={imageOf(state.game)} fallback={FALLBACK_COVER} alt="" />
                    <div className="commerce-modal__copy">
                        <span>{state.game.title}</span>
                        <h2>{content[0]}</h2>
                        <p>{content[1]}</p>
                    </div>
                    <div className="commerce-modal__actions">
                        {state.status === "connect" && <button className="primary-button" onClick={onConnect}>{t("connectItchAction")}</button>}
                        {state.status === "checkout" && <button className="primary-button" onClick={onVerify}>{t("verifyPurchase")}</button>}
                        {state.status === "checkout" && <button className="soft-button" onClick={onCheckout}>{t("openCheckout")}</button>}
                        {state.status === "owned" && <button className="primary-button" onClick={onDownload}><DownloadSimple size={16} /> {t("download")}</button>}
                        {state.status === "error" && <button className="soft-button" onClick={onVerify}>{t("retry")}</button>}
                    </div>
                </section>
            </div>
        </Portal>
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

const gameUpdateCache = new Map();
const GAME_UPDATE_CACHE_TTL_MS = 5 * 60_000;
const GAME_UPDATE_ERROR_CACHE_TTL_MS = 30_000;

function invalidateGameUpdateCache(gameId = null) {
    for (const key of [...gameUpdateCache.keys()]) {
        if (!gameId || key.startsWith(`${gameId}:`)) gameUpdateCache.delete(key);
    }
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("deadsmile:game-update-invalidated", { detail: { gameId } }));
    }
}

function versionFromLocalFilename(filename) {
  const base = String(filename || "").trim();

  const matches = [...base.matchAll(/v(\d{3})(?!\d)/gi)];

  if (!matches.length) {
    return null;
  }

  return String(Number.parseInt(
    matches[matches.length - 1][1],
    10
  ));
}
function useGameUpdateStatus(game, installedEntry) {
    const [state, setState] = useState({ available: false, checking: false });
    const [retryToken, setRetryToken] = useState(0);
    const cacheKey = installedEntry?.path
        ? `${game?.id}:${installedEntry.path}:${installedEntry.filename || ""}:${installedEntry.downloadedAt || ""}`
        : "";

    useEffect(() => {
        let alive = true;
        if (!installedEntry?.path || (!game?.downloadUrl && !game?.commerceEnabled) || !window.deadsmile?.checkGameUpdate) {
            setState({ available: false, checking: false });
            return () => { alive = false; };
        }

        const cached = gameUpdateCache.get(cacheKey);
        if (cached) {
            const age = Date.now() - Number(cached.checkedAt || 0);
            const ttl = Number(cached.ttlMs || GAME_UPDATE_CACHE_TTL_MS);
            if (age >= 0 && age < ttl) {
                setState({
                    available: Boolean(cached.available),
                    checking: false,
                    latestVersion: cached.latestVersion || null,
                });
                return () => { alive = false; };
            }
            gameUpdateCache.delete(cacheKey);
        }

        setState({ available: false, checking: true });
        window.deadsmile.checkGameUpdate({
            id: game.id,
            slug: game.slug,
            url: game.downloadUrl,
            currentVersion:
                installedEntry.version ||
                versionFromLocalFilename(installedEntry.filename),

            filename: installedEntry.filename,
            path: installedEntry.path,
            commerceEnabled: Boolean(game.commerceEnabled),
            itchGameId: game.itchGameId || null,
        }).then((result) => {
            if (!alive) return;
            const next = {
                available: Boolean(result?.available),
                checking: false,
                latestVersion: result?.latestVersion || null,
            };
            gameUpdateCache.set(cacheKey, {
                ...next,
                checkedAt: Date.now(),
                ttlMs: result?.reason ? GAME_UPDATE_ERROR_CACHE_TTL_MS : GAME_UPDATE_CACHE_TTL_MS,
            });
            setState(next);
        }).catch(() => {
            if (!alive) return;
            const next = { available: false, checking: false, latestVersion: null };
            gameUpdateCache.set(cacheKey, {
                ...next,
                checkedAt: Date.now(),
                ttlMs: GAME_UPDATE_ERROR_CACHE_TTL_MS,
            });
            setState(next);
        });

        return () => { alive = false; };
    }, [cacheKey, game?.id, game?.downloadUrl, game?.slug, installedEntry?.path, retryToken]);

    useEffect(() => {
        const handleOnline = () => {
            gameUpdateCache.delete(cacheKey);
            setRetryToken((value) => value + 1);
        };
        const handleInvalidated = (event) => {
            const gameId = event?.detail?.gameId;
            if (gameId && String(gameId) !== String(game?.id || "")) return;
            gameUpdateCache.delete(cacheKey);
            setRetryToken((value) => value + 1);
        };
        window.addEventListener("online", handleOnline);
        window.addEventListener("deadsmile:game-update-invalidated", handleInvalidated);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("deadsmile:game-update-invalidated", handleInvalidated);
        };
    }, [cacheKey, game?.id]);

    return state;
}

function GameCard({
    game,
    wishlisted,
    onWishlist,
    onOpen,
    onInstall,
    installed,
    installedEntry,
    downloading,
    entitled,
}) {
    const { t } = useT();
    const running = useRunningGames().has(game.id);
    const progress = downloading?.percent;
    const gameUpdate = useGameUpdateStatus(game, installedEntry);
    const isUpdating = downloading?.mode === "update" || downloading?.status === "updating";
    const owned = game?.commerceEnabled ? Boolean(entitled) : Boolean(entitled || installed);
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
                    {(game.downloadUrl || game.commerceEnabled) && (
                        <button
                            className={`install-button ${running ? "is-playing" : ""}`}
                            onClick={() => onInstall(game, installed, gameUpdate.available)}
                            disabled={Boolean(downloading) || running}
                        >
                            {running ? (
                                <>
                                    <Play size={14} weight="fill" /> {t("playing")}
                                </>
                            ) : isUpdating ? (
                                t("updating")
                            ) : downloading ? (
                                `${progress || 0}%`
                            ) : gameUpdate.available ? (
                                <>
                                    <DownloadSimple size={14} />{" "}
                                    {t("update")}
                                </>
                            ) : installed && owned ? (
                                <>
                                    <Play size={14} weight="fill" />{" "}
                                    {t("play")}
                                </>
                            ) : owned ? (
                                <>
                                    <DownloadSimple size={14} />{" "}
                                    {t("download")}
                                </>
                            ) : game.commerceEnabled ? (
                                <>
                                    <CurrencyDollarIcon size={14} />{" "}
                                    {t("buy")}
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
                            progress?.status === "installing" || progress?.status === "updating"
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

function UpdateWelcomeModal({ info, onClose }) {
    const { t } = useT();
    if (!info) return null;
    return (
        <div
            className="overlay update-welcome-overlay"
            onMouseDown={(e) =>
                e.target === e.currentTarget && onClose()
            }
        >
            <section className="update-welcome-card">
                <div className="update-welcome-head">
                    <div className="update-welcome-icon">
                        <CheckCircle size={28} weight="fill" />
                    </div>
                    <div>
                        <small>{t("launcherUpdatedEyebrow")}</small>
                        <h2>{t("launcherUpdatedTitle")}</h2>
                        <p>
                            {t("launcherUpdatedDescription", {
                                version: info.version,
                            })}
                        </p>
                    </div>
                </div>

                {info.notes && (
                    <div className="update-welcome-notes">
                        <span>{t("whatsNew")}</span>
                        <div className="update-welcome-notes-body">
                            {info.notes}
                        </div>
                    </div>
                )}

                <div className="update-welcome-actions">
                    <button
                        type="button"
                        className="soft-button"
                        onClick={onClose}
                    >
                        {t("dismiss")}
                    </button>
                    <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                            openExternal(info.htmlUrl);
                            onClose();
                        }}
                    >
                        {t("viewOnGithub")}
                        <ArrowUpRight size={16} />
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
    entitlements,
    playtime,
    openGame,
    openVideo,
    setView,
}) {
    const { t } = useT();
    const runningGames = useRunningGames();
    const hero = games.find((g) => g.featured) || games[0];
    const heroUpdate = useGameUpdateStatus(hero, hero ? installed?.[hero.id] : null);
    const heroOwned = hero && (entitlements?.has(hero.id) || Boolean(installed?.[hero.id]));
    const heroRunning = Boolean(hero && runningGames.has(hero.id));
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
                            {(hero.downloadUrl || hero.commerceEnabled) && (
                                <button
                                    className={`soft-button ${heroRunning ? "is-playing" : ""}`}
                                    onClick={() =>
                                        onInstall(
                                            hero,
                                            Boolean(installed?.[hero.id]),
                                            heroUpdate.available,
                                        )
                                    }
                                    disabled={Boolean(downloading[hero.id]) || heroRunning}
                                >
                                    {heroRunning ? (<> <Play size={17} weight="fill" /> {t("playing")} </>) : downloading[hero.id]?.mode === "update" || downloading[hero.id]?.status === "updating" ? (
                                        t("updating")
                                    ) : downloading[hero.id] ? (
                                        <>
                                            <DownloadSimple size={17} />{" "}
                                            {t("downloading")}
                                        </>
                                    ) : heroUpdate.available ? (
                                        <>
                                            <DownloadSimple size={17} />{" "}
                                            {t("update")}
                                        </>
                                    ) : installed?.[hero.id] ? (
                                        <>
                                            <Play size={17} weight="fill" />{" "}
                                            {t("play")}
                                        </>
                                    ) : heroOwned ? (
                                        <>
                                            <DownloadSimple size={17} />{" "}
                                            {t("download")}
                                        </>
                                    ) : hero.commerceEnabled ? (
                                        <>
                                            <CurrencyDollarIcon size={17} />{" "}
                                            {t("buy")}
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
                                className={`continue-card ${runningGames.has(game.id) ? "is-playing" : ""}`}
                                onClick={() => onInstall(game, true)}
                                disabled={runningGames.has(game.id)}
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
                                installedEntry={installed?.[g.id]}
                                downloading={downloading[g.id]}
                                entitled={entitlements?.has(g.id)}
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
    entitlements,
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
                        installedEntry={installed?.[g.id]}
                        downloading={downloading[g.id]}
                        entitled={entitlements?.has(g.id)}
                    />
                ))}
            </div>
        </div>
    );
}
function LibraryGameRow({ game: g, played, lastPlayed, installedEntry, downloading, onInstall, onDelete, openGame }) {
    const { t } = useT();
    const running = useRunningGames().has(g.id);
    const gameUpdate = useGameUpdateStatus(g, installedEntry);
    const isUpdating = downloading?.mode === "update" || downloading?.status === "updating";
    return (
        <article className="library-row">
            <SmartImage src={imageOf(g)} fallback={FALLBACK_COVER} alt="" />
            <div>
                <h3>{g.title}</h3>
                <span><CheckCircle size={15} /> {installedEntry ? t("installed") : t("purchased")}</span>
                {(played > 0 || lastPlayed > 0) && (
                    <div className="library-playtime">
                        {played > 0 && <span>{formatPlaytime(played)} {t("played")}</span>}
                        {lastPlayed > 0 && <span>· {formatRelative(lastPlayed, t)}</span>}
                    </div>
                )}
            </div>
            <div className="library-meta">
                <small>{installedEntry?.filename || t("owned")}</small>
                <button
                    className={`soft-button ${running ? "is-playing" : ""}`}
                    onClick={() => onInstall(g, Boolean(installedEntry) && !gameUpdate.available, gameUpdate.available)}
                    disabled={Boolean(downloading) || running}
                >
                    {running ? <Play size={16} weight="fill" /> : isUpdating ? t("updating") : gameUpdate.available || !installedEntry ? <DownloadSimple size={16} /> : <Play size={16} weight="fill" />}{" "}
                    {running ? t("playing") : isUpdating ? t("updating") : gameUpdate.available ? t("update") : installedEntry ? t("play") : t("download")}
                </button>
                <CloudSaveMenu game={g} compact />
                <button className="round-action" onClick={() => openGame(g)}>
                    <ArrowUpRight size={17} />
                </button>
                {installedEntry && <button className="round-action delete-local" onClick={() => onDelete(g)} aria-label={`${t("delete")} ${g.title}`}><Trash size={17} /></button>}
            </div>
        </article>
    );
}

function Library({
    games,
    entitlements,
    installed,
    onInstall,
    onDelete,
    playtime,
    downloading,
    openGame,
    setView,
    setActive,
}) {
    const [sort, setSort] = useState("recent");
    const { t } = useT();
    const items = useMemo(() => {
        const list = games.filter((g) => g.commerceEnabled ? entitlements.has(g.id) : installed[g.id] || entitlements.has(g.id));
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
    }, [games, installed, entitlements, playtime, sort]);

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
                        <LibraryGameRow
                            key={g.id}
                            game={g}
                            played={played}
                            lastPlayed={lastPlayed}
                            installedEntry={installed[g.id]}
                            downloading={downloading?.[g.id]}
                            onInstall={onInstall}
                            onDelete={onDelete}
                            openGame={openGame}
                        />
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
    entitlements,
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
                            installedEntry={installed?.[g.id]}
                            downloading={downloading[g.id]}
                            entitled={entitlements?.has(g.id)}
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


function CloudSaveMenu({ game, compact = false }) {
    const { t, language } = useT();
    const [open, setOpen] = useState(false);
    const [saves, setSaves] = useState([]);
    const [loadingSaves, setLoadingSaves] = useState(false);
    const [deletingSlot, setDeletingSlot] = useState("");
    const [message, setMessage] = useState("");
    const [pendingDeleteSlot, setPendingDeleteSlot] = useState("");
    const deleteConfirmTimerRef = useRef(null);
    const loadRequestRef = useRef(0);

    useEffect(() => {
        loadRequestRef.current += 1;
        setOpen(false);
        setSaves([]);
        setMessage("");
        setDeletingSlot("");
        setPendingDeleteSlot("");
        if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
    }, [game?.id]);

    useEffect(() => () => {
        if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    if (!game?.cloudSavesEnabled) return null;

    async function load() {
        const requestId = ++loadRequestRef.current;
        setLoadingSaves(true);
        setMessage("");
        try {
            const result = await api.get(`/platform/saves/${encodeURIComponent(game.id)}`);
            if (loadRequestRef.current !== requestId) return;
            setSaves(Array.isArray(result) ? result : []);
        } catch (error) {
            if (loadRequestRef.current !== requestId) return;
            setSaves([]);
            setMessage(error?.message || t("error"));
        } finally {
            if (loadRequestRef.current === requestId) setLoadingSaves(false);
        }
    }

    async function openPopup() {
        setOpen(true);
        await load();
    }

    async function remove(slot) {
        if (deletingSlot) return;
        const normalizedSlot = String(slot);
        if (pendingDeleteSlot !== normalizedSlot) {
            setPendingDeleteSlot(normalizedSlot);
            setMessage(t("deleteCloudSaveConfirm"));
            if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
            deleteConfirmTimerRef.current = setTimeout(() => {
                setPendingDeleteSlot("");
                deleteConfirmTimerRef.current = null;
                setMessage((current) =>
                    current === t("deleteCloudSaveConfirm") ? "" : current,
                );
            }, 4500);
            return;
        }
        setPendingDeleteSlot("");
        if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
        deleteConfirmTimerRef.current = null;
        setDeletingSlot(normalizedSlot);
        setMessage("");
        try {
            await api.delete(`/platform/saves/${encodeURIComponent(game.id)}/${encodeURIComponent(slot)}`);
            setSaves((current) => current.filter((save) => String(save.slot) !== normalizedSlot));
            setMessage(t("cloudSaveDeleted"));
        } catch (error) {
            setMessage(error?.message || t("error"));
        } finally {
            setDeletingSlot("");
        }
    }

    return <>
        <button
            type="button"
            className={`soft-button ${compact ? "compact" : ""}`}
            onClick={openPopup}
            aria-haspopup="dialog"
            aria-expanded={open}
            title={compact ? t("cloudSaves") : undefined}
        >
            <FloppyDisk size={16} weight="bold"/>
            {!compact && <span>{t("cloudSaves")}</span>}
        </button>
        {open && <Portal>
            <div
                className="cloud-save-overlay"
                onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
            >
                <section
                    className="cloud-save-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${t("cloudSaves")} — ${game.title || ""}`}
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <header className="cloud-save-dialog__head">
                        <div>
                            <small>{game.title}</small>
                            <h3><FloppyDisk size={19}/>{t("cloudSaves")}</h3>
                        </div>
                        <button
                            type="button"
                            className="modal-close"
                            onClick={() => setOpen(false)}
                            aria-label={t("close")}
                        >
                            <X size={18}/>
                        </button>
                    </header>
                    <div className="cloud-save-dialog__body">
                        {loadingSaves ? (
                            <div className="cloud-save-empty">{t("loading") || "Loading…"}</div>
                        ) : saves.length ? saves.map((save) => (
                            <div className="cloud-save-row" key={save.slot}>
                                <div>
                                    <strong>{save.slot}</strong>
                                    <small>{save.updatedAt || save.updated_at ? new Date(save.updatedAt || save.updated_at).toLocaleString(language) : ""}</small>
                                </div>
                                <button
                                    type="button"
                                    className="round-action delete-local"
                                    disabled={Boolean(deletingSlot)}
                                    onClick={() => remove(save.slot)}
                                    aria-label={pendingDeleteSlot === String(save.slot) ? t("deleteCloudSaveConfirm") : t("deleteCloudSave")}
                                    title={pendingDeleteSlot === String(save.slot) ? t("deleteCloudSaveConfirm") : t("deleteCloudSave")}
                                >
                                    {deletingSlot === String(save.slot) ? <span className="cloud-save-spinner" aria-hidden="true"/> : <Trash size={15}/>}
                                </button>
                            </div>
                        )) : (
                            <div className="cloud-save-empty">{t("noCloudSaves")}</div>
                        )}
                    </div>
                    {message && <div className="cloud-save-message">{message}</div>}
                </section>
            </div>
        </Portal>}
    </>;
}

function GameDetails({
    game,
    onBack,
    wishlisted,
    onWishlist,
    onInstall,
    installed,
    installedEntry,
    downloading,
    entitled,
    games = [],
    videos = [],
    openGame,
    openVideo,
}) {
    const { t, language } = useT();
    const running = useRunningGames().has(game.id);
    const [detail, setDetail] = useState(game);
    const [selected, setSelected] = useState(null);
    const gameUpdate = useGameUpdateStatus(detail, installedEntry);
    const owned = detail?.commerceEnabled ? Boolean(entitled) : Boolean(entitled || installed);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [manualUpdateCheck, setManualUpdateCheck] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [achievementsLoading, setAchievementsLoading] = useState(false);
    useEffect(() => {
        let alive = true;
        api.get(`/games/${encodeURIComponent(slugOf(game))}`)
            .then((data) => alive && setDetail(data))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [game]);

    useEffect(() => {
        const gameId = detail?.id || game?.id;
        if (!gameId) {
            setAchievements([]);
            return undefined;
        }
        let alive = true;
        setAchievementsLoading(true);
        api.get(`/platform/achievements/${encodeURIComponent(gameId)}`)
            .then((data) => {
                if (alive) setAchievements(listFrom(data, "achievements"));
            })
            .catch(() => {
                if (alive) setAchievements([]);
            })
            .finally(() => {
                if (alive) setAchievementsLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [detail?.id, game?.id]);

    async function checkForGameUpdates() {
        if (checkingUpdate) return;

        setCheckingUpdate(true);
        setManualUpdateCheck(null);

        try {
            const result = await window.deadsmile.checkGameUpdate({
            id: game.id,
            slug: game.slug,
            url: game.downloadUrl,
            currentVersion:
                installedEntry?.version ||
                versionFromLocalFilename(installedEntry?.filename),
            filename: installedEntry?.filename,
            path: installedEntry?.path,
            commerceEnabled: Boolean(game.commerceEnabled),
            itchGameId: game.itchGameId || null,
            });

            setManualUpdateCheck(result);
        } catch {
            setManualUpdateCheck({
            error: t("updateCheckFailed"),
            });
        } finally {
            setCheckingUpdate(false);
        }
        }
    const screenshots = detail?.screenshots?.length
        ? detail.screenshots
        : Array.from(
              { length: 6 },
              (_, i) =>
                  `${SITE_URL}/assets/games/screenshots/${detail?.slug || slugOf(detail)}/${i + 1}.png`,
          );
    const unlockedAchievements = achievements.filter(
        (item) => item.unlocked_at || item.unlockedAt,
    ).length;
    const currentGameId = String(detail?.id || game?.id || "");
    const relatedVideos = videos
        .filter((video) => {
            const videoGameId =
                video?.gameId || video?.game_id || video?.game?.id || "";
            return currentGameId && String(videoGameId) === currentGameId;
        })
        .slice(0, 3);
    const detailGenres = new Set(
        (detail?.genres || [])
            .map((genre) => String(genre || "").trim().toLowerCase())
            .filter(Boolean),
    );
    const relatedGames = games
        .filter((candidate) => String(candidate?.id || "") !== currentGameId)
        .map((candidate) => {
            const sharedGenres = (candidate?.genres || []).reduce(
                (count, genre) =>
                    count +
                    (detailGenres.has(String(genre || "").trim().toLowerCase())
                        ? 1
                        : 0),
                0,
            );
            return { candidate, sharedGenres };
        })
        .filter((item) => item.sharedGenres > 0)
        .sort(
            (a, b) =>
                b.sharedGenres - a.sharedGenres ||
                String(a.candidate?.title || "").localeCompare(
                    String(b.candidate?.title || ""),
                ),
        )
        .slice(0, 4)
        .map((item) => item.candidate);
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
                        {(detail?.downloadUrl || detail?.commerceEnabled) && (
                            <button
                                className={`primary-button ${running ? "is-playing" : ""}`}
                                onClick={() => onInstall(detail, installed, gameUpdate.available)}
                                disabled={Boolean(downloading) || running}
                            >

                                {running ? (<> <Play size={17} weight="fill" /> {t("playing")} </>) : downloading?.mode === "update" || downloading?.status === "updating" ? (
                                    t("updating")
                                ) : downloading ? (
                                    t("downloading")
                                ) : gameUpdate.available ? (
                                    <>
                                        <DownloadSimple size={17} />{" "}
                                        {t("update")}
                                    </>
                                ) : installed && owned ? (
                                    <>
                                        <Play size={17} weight="fill" />{" "}
                                        {t("play")}
                                    </>
                                ) : owned ? (
                                    <>
                                        <DownloadSimple size={17} />{" "}
                                        {t("download")}
                                    </>
                                ) : detail?.commerceEnabled ? (
                                    <>
                                        <CurrencyDollarIcon size={17} />{" "}
                                        {t("buy")}
                                    </>
                                ) : (
                                    <>
                                        <DownloadSimple size={17} />{" "}
                                        {t("download")}
                                    </>
                                )}
                            </button>

                        )}
                        <CloudSaveMenu game={detail} />
                        {!installed && (
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
                        )}
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
                        {(detail?.downloadUrl && installed) && (
                        <button
                            type="button"
                            onClick={checkForGameUpdates}
                            className="soft-button"
                            disabled={checkingUpdate}
                        >
                            <ArrowClockwise size={16} />
                            {checkingUpdate ? t("checkingUpdate") : t("checkForUpdates")}
                        </button>
                        )}
                        {manualUpdateCheck?.error && (
                            <div>
                                {manualUpdateCheck.error}
                            </div>
                            )}

                            {manualUpdateCheck && !manualUpdateCheck.error && (
                            <div
                                className="soft-button-2"
                                style={{
                                    color: manualUpdateCheck.available
                                    ? "#f4f4f5"
                                    : "#858894",
                                }}
                            >
                                {manualUpdateCheck.available
                                ? `${t("updateAvailable")}: v${manualUpdateCheck.latestVersion}`
                                : t("youAreUpToDate")}
                            </div>
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
                    <section className="detail-section">
                        <div className="detail-section-heading">
                            <h2>{t("achievements")}</h2>
                            {!achievementsLoading && achievements.length > 0 && (
                                <span className="detail-section-count">
                                    {unlockedAchievements}/{achievements.length}
                                </span>
                            )}
                        </div>
                        {achievementsLoading ? (
                            <div className="detail-empty-state">{t("loading")}</div>
                        ) : achievements.length ? (
                            <div className="detail-achievements-grid">
                                {achievements.map((item) => {
                                    const unlocked = Boolean(
                                        item.unlocked_at || item.unlockedAt,
                                    );
                                    const hidden = Boolean(item.hidden && !unlocked);
                                    const icon = item.icon_url || item.iconUrl;
                                    return (
                                        <article
                                            key={item.id || item.key}
                                            className={`detail-achievement ${unlocked ? "unlocked" : "locked"}`}
                                        >
                                            <div className="detail-achievement-icon">
                                                {icon && !hidden ? (
                                                    <SmartImage
                                                        src={icon}
                                                        fallback={FALLBACK_COVER}
                                                        alt=""
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <CheckCircle
                                                        size={22}
                                                        weight={unlocked ? "fill" : "regular"}
                                                    />
                                                )}
                                            </div>
                                            <div className="detail-achievement-copy">
                                                <strong>{hidden ? "???" : item.title}</strong>
                                                <small>
                                                    {hidden ? "???" : item.description || ""}
                                                </small>
                                            </div>
                                            {Number.isFinite(Number(item.points)) && (
                                                <span className="detail-achievement-points">
                                                    {Number(item.points)} pts
                                                </span>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="detail-empty-state">{t("noAchievements")}</div>
                        )}
                    </section>
                    {relatedVideos.length > 0 && (
                        <section className="detail-section">
                            <h2>{t("relatedVideos")}</h2>
                            <div className="media-grid detail-related-videos">
                                {relatedVideos.map((video) => (
                                    <button
                                        type="button"
                                        className="media-card"
                                        key={video.id}
                                        onClick={() => openVideo?.(video)}
                                    >
                                        <div className="media-image">
                                            <SmartImage
                                                src={video.thumbnail}
                                                fallback={FALLBACK_COVER}
                                                alt=""
                                                loading="lazy"
                                            />
                                            <span>
                                                <Play size={21} weight="fill" />
                                            </span>
                                        </div>
                                        <div>
                                            <small>{video.category || t("video")}</small>
                                            <strong>{video.title}</strong>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                    {relatedGames.length > 0 && (
                        <section className="detail-section">
                            <h2>{t("relatedGames")}</h2>
                            <div className="detail-related-games">
                                {relatedGames.map((relatedGame) => (
                                    <button
                                        type="button"
                                        className="detail-related-game"
                                        key={relatedGame.id || relatedGame.slug}
                                        onClick={() => openGame?.(relatedGame)}
                                    >
                                        <div className="detail-related-game-image">
                                            <SmartImage
                                                src={imageOf(relatedGame)}
                                                fallback={FALLBACK_COVER}
                                                alt=""
                                                loading="lazy"
                                            />
                                        </div>
                                        <span>
                                            <strong>{relatedGame.title}</strong>
                                            <small>
                                                {(relatedGame.genres || []).slice(0, 2).join(" · ") ||
                                                    relatedGame.status ||
                                                    t("game")}
                                            </small>
                                        </span>
                                        <CaretRight size={17} />
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
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
                            <strong>{formatCalendarDate(detail.releaseDate, language)}</strong>
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
        let id = "";
        if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0];
        else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)) id = u.searchParams.get("v") || "";
        else if (["youtube-nocookie.com", "www.youtube-nocookie.com"].includes(u.hostname) && u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] || "";
        if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
        return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
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
                        <strong>
                            {new Date(video.published_at).toLocaleDateString(
                                "en-US",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    timeZone: "UTC",
                                }
                            )}
                        </strong>
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
        api.get(`/news/${encodeURIComponent(item.slug)}`)
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
                            ? new Date(detail.published_at).toLocaleDateString(
                                  "en-US",
                                  {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      timeZone: "UTC",
                                  }
                              )
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
    itchGameId: "",
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
    itchAccount,
    onConnectItch,
    onSyncItch,
    onDisconnectItch,
}) {
    const { t } = useT();
    const launcherVersion = useLauncherVersion();
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
    const [telemetryEnabled, setTelemetryEnabled] = useState(() => {
        try { return localStorage.getItem("deadsmile.telemetry") === "true"; } catch { return false; }
    });
    const [gameViewSettings, setGameViewSettingsState] = useState({
        enabled: true,
        shortcut: "Control+D",
        label: "Ctrl + D",
    });
    const [recordingGameViewShortcut, setRecordingGameViewShortcut] = useState(false);
    const gameViewShortcutRef = useRef(null);
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

    useEffect(() => {
        let alive = true;
        window.deadsmile?.getGameViewSettings?.()
            .then((result) => {
                if (alive && result?.settings) {
                    setGameViewSettingsState(result.settings);
                }
            })
            .catch(() => {});
        const off = window.deadsmile?.onGameViewSettingsChanged?.((settings) => {
            if (alive && settings) setGameViewSettingsState(settings);
        });
        return () => {
            alive = false;
            off?.();
            window.deadsmile?.cancelGameViewShortcutCapture?.().catch?.(() => {});
        };
    }, []);

    useEffect(() => {
        if (tab === "launcher" || !recordingGameViewShortcut) return;
        setRecordingGameViewShortcut(false);
        window.deadsmile?.cancelGameViewShortcutCapture?.().catch?.(() => {});
    }, [tab, recordingGameViewShortcut]);

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
        } catch {
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
        } catch {
            setMessage(t("unableToSaveChanges"));
        } finally {
            setSaving(false);
        }
    }
    async function setup2fa() {
        setTotpLoading(true);
        try {
            await openExternal(`${SITE_URL}/account#security`);
        } finally {
            setTotpLoading(false);
        }
    }
    async function updateTelemetry(enabled) {
        try {
            await api.patch("/platform/telemetry-consent", { enabled });
            setTelemetryEnabled(enabled);
            localStorage.setItem("deadsmile.telemetry", String(enabled));
            setMessage(t(enabled ? "telemetryEnabled" : "telemetryDisabled"));
            setTimeout(() => setMessage(""), 1800);
        } catch {
            setMessage(t("unableToSaveChanges"));
        }
    }

    async function saveGameViewSettings(patch) {
        try {
            const result = await window.deadsmile?.setGameViewSettings?.(patch);
            if (!result?.ok) {
                if (result?.settings) setGameViewSettingsState(result.settings);
                setMessage(
                    t(
                        result?.error === "SHORTCUT_UNAVAILABLE"
                            ? "gameViewShortcutUnavailable"
                            : "gameViewShortcutInvalid",
                    ),
                );
                return false;
            }
            if (result.settings) setGameViewSettingsState(result.settings);
            return true;
        } catch {
            setMessage(t("unableToSaveChanges"));
            return false;
        }
    }

    function shortcutFromEvent(event) {
        const key = String(event.key || "");
        if (["Control", "Shift", "Alt", "Meta"].includes(key)) return null;

        let finalKey = null;
        if (/^[a-z0-9]$/i.test(key)) finalKey = key.toUpperCase();
        else if (/^F([1-9]|1[0-2])$/i.test(key)) finalKey = key.toUpperCase();
        if (!finalKey) return null;

        const modifiers = [];
        if (event.ctrlKey) modifiers.push("Control");
        if (event.altKey) modifiers.push("Alt");
        if (event.shiftKey) modifiers.push("Shift");
        if (event.metaKey) modifiers.push("Super");
        if (!modifiers.length) return null;
        return [...modifiers, finalKey].join("+");
    }

    async function startShortcutCapture() {
        try {
            await window.deadsmile?.beginGameViewShortcutCapture?.();
            setRecordingGameViewShortcut(true);
            requestAnimationFrame(() => gameViewShortcutRef.current?.focus());
        } catch {
            setMessage(t("unableToSaveChanges"));
        }
    }

    async function cancelShortcutCapture() {
        if (!recordingGameViewShortcut) return;
        setRecordingGameViewShortcut(false);
        try {
            await window.deadsmile?.cancelGameViewShortcutCapture?.();
        } catch {}
    }

    async function handleShortcutKeyDown(event) {
        if (!recordingGameViewShortcut) return;
        event.preventDefault();
        event.stopPropagation();

        if (event.key === "Escape") {
            await cancelShortcutCapture();
            return;
        }

        const shortcut = shortcutFromEvent(event);
        if (!shortcut) return;

        const ok = await saveGameViewSettings({ shortcut });
        setRecordingGameViewShortcut(false);
        if (ok) {
            setMessage(t("gameViewShortcutUpdated"));
            setTimeout(() => setMessage(""), 1800);
        }
    }

    async function toggleGameViewEnabled() {
        if (recordingGameViewShortcut) {
            setRecordingGameViewShortcut(false);
            await window.deadsmile?.cancelGameViewShortcutCapture?.();
        }
        await saveGameViewSettings({ enabled: !gameViewSettings.enabled });
    }

    const tabs = [
        { id: "profile", label: text(language, "profile"), icon: User },
        { id: "account", label: text(language, "account"), icon: GearSix },
        {
            id: "security",
            label: text(language, "security"),
            icon: ShieldCheck,
        },
        {
            id: "connections",
            label: text(language, "itchAccount"),
            icon: GameController,
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
                            <div className="launcher-settings">
                                <div className="launcher-setting-copy">
                                    <strong>{t("gameViewSetting")}</strong>
                                    <span>{t("gameViewSettingDescription")}</span>
                                </div>
                                <button
                                    type="button"
                                    className={`status-pill${gameViewSettings.enabled ? " on" : ""}`}
                                    role="switch"
                                    aria-checked={gameViewSettings.enabled}
                                    onClick={toggleGameViewEnabled}
                                >
                                    {t(gameViewSettings.enabled ? "gameViewEnabled" : "gameViewDisabled")}
                                </button>
                            </div>
                            <div
                                className={`launcher-settings${
                                    !gameViewSettings.enabled ? " gameview-setting-disabled" : ""
                                }`}
                            >
                                <div className="launcher-setting-copy">
                                    <strong>{t("gameViewShortcut")}</strong>
                                    <span>{t("gameViewShortcutDescription")}</span>
                                </div>
                                <button
                                    ref={gameViewShortcutRef}
                                    type="button"
                                    disabled={!gameViewSettings.enabled}
                                    className={`gameview-shortcut-button${
                                        recordingGameViewShortcut ? " recording" : ""
                                    }`}
                                    onClick={startShortcutCapture}
                                    onKeyDown={handleShortcutKeyDown}
                                    onBlur={cancelShortcutCapture}
                                    title={t("changeGameViewShortcut")}
                                >
                                    {recordingGameViewShortcut
                                        ? t("pressGameViewShortcut")
                                        : gameViewSettings.label}
                                </button>
                            </div>
                            <div className="launcher-settings">
                                <div className="launcher-setting-copy">
                                    <strong>{t("telemetry")}</strong>
                                    <span>{t("telemetryDescription")}</span>
                                </div>
                                <button
                                    type="button"
                                    className={`status-pill${telemetryEnabled ? " on" : ""}`}
                                    role="switch"
                                    aria-checked={telemetryEnabled}
                                    onClick={() => updateTelemetry(!telemetryEnabled)}
                                >
                                    {t(telemetryEnabled ? "telemetryEnabled" : "telemetryDisabled")}
                                </button>
                            </div>
                            {message && <span className="success-text">{message}</span>}
                        </section>
                    )}
                    {tab === "connections" && (
                        <section className="account-block">
                            <div className="account-block-head">
                                <h2>{t("itchAccount")}</h2>
                                <p>{t("itchAccountDescription")}</p>
                            </div>
                            <div className="itch-account-row">
                                <div className="itch-account-mark">
                                    <GameController size={24} weight="fill" />
                                </div>
                                <div className="itch-account-copy">
                                    <h3>{itchAccount?.connected ? t("connectedAs") : t("notConnected")}</h3>
                                    <p>{itchAccount?.connected ? itchAccount.username : t("connectItchText")}</p>
                                </div>
                                <span className={itchAccount?.connected ? "status-pill on" : "status-pill"}>
                                    {itchAccount?.connected ? t("connected") : t("notConnected")}
                                </span>
                                <div className="itch-account-actions">
                                    {itchAccount?.connected ? (
                                        <>
                                            <button className="soft-button" onClick={onSyncItch}>{t("refreshLibrary")}</button>
                                            <button className="soft-button danger-button" onClick={onDisconnectItch}>{t("disconnect")}</button>
                                        </>
                                    ) : (
                                        <button className="primary-button" onClick={onConnectItch} disabled={itchAccount?.connecting}>
                                            {itchAccount?.connecting ? t("connectingItch") : t("connectItchAction")}
                                        </button>
                                    )}
                                </div>
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
                                                installedEntry={installed?.[g.id]}
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
        {launcherVersion && <span className="launcher-version account-version">v{launcherVersion}</span>}
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
        } catch {
            setMessage(t("unableToLoadContent"));
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
                    itchGameId: form.itchGameId ? Number(form.itchGameId) : null,
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
        } catch {
            setMessage(t("unableToPublish"));
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
            await api.delete(`/admin/${encodeURIComponent(endpoint)}/${encodeURIComponent(id)}`);
            setItems((x) => ({
                ...x,
                [kind]: x[kind].filter((i) => i.id !== id),
            }));
            setSelected(null);
        } catch {
            setMessage(t("unableToDelete"));
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
                                    label={t("purchaseURLItch")}
                                    value={form.purchaseUrl}
                                    onChange={set("purchaseUrl")}
                                    placeholder="https://deadsml.itch.io/game/purchase"
                                />
                                <Field
                                    label={t("itchGameId")}
                                    type="number"
                                    min="1"
                                    value={form.itchGameId}
                                    onChange={set("itchGameId")}
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


function GameOverlay({ user, games, shortcutLabel = "Ctrl + D" }) {
    const { t } = useT();
    const [running, setRunning] = useState([]);
    const [selectedGameId, setSelectedGameId] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [cloudSaves, setCloudSaves] = useState([]);
    const [cloudLoading, setCloudLoading] = useState(false);
    const [deletingSlot, setDeletingSlot] = useState("");
    const [pendingDeleteSlot, setPendingDeleteSlot] = useState("");
    const [screenshotState, setScreenshotState] = useState(null);
    const screenshotTimerRef = useRef(null);
    const deleteConfirmTimerRef = useRef(null);
    const cloudLoadRef = useRef(0);
    const [tutorialOpen, setTutorialOpen] = useState(() => {
        try {
            return localStorage.getItem("deadsmile.gameView.tutorial.v1") !== "seen";
        } catch {
            return true;
        }
    });

    useEffect(() => {
        document.documentElement.classList.add("game-view-document");
        document.body.classList.add("game-view-document-body");
        return () => {
            document.documentElement.classList.remove("game-view-document");
            document.body.classList.remove("game-view-document-body");
        };
    }, []);

    useEffect(() => {
        window.deadsmile?.getRunningGames?.().then((items) => setRunning(Array.isArray(items) ? items : [])).catch(() => {});
        return window.deadsmile?.onGameState?.((state) => setRunning((current) =>
            state.running
                ? [...current.filter((item) => String(item.id) !== String(state.id)), state]
                : current.filter((item) => String(item.id) !== String(state.id)),
        ));
    }, []);

    const current = running[0];
    const currentGame = games.find((item) => String(item.id) === String(current?.id));
    const selectedGame = games.find((item) => String(item.id) === String(selectedGameId)) || currentGame || games[0] || null;

    useEffect(() => {
        if (selectedGameId && games.some((item) => String(item.id) === String(selectedGameId))) return;
        if (current?.id && games.some((item) => String(item.id) === String(current.id))) {
            setSelectedGameId(current.id);
            return;
        }
        if (games[0]?.id) setSelectedGameId(games[0].id);
    }, [games, current?.id, selectedGameId]);

    useEffect(() => {
        let alive = true;
        setAchievements([]);
        if (!selectedGame?.id) return undefined;
        api.get(`/platform/achievements/${encodeURIComponent(selectedGame.id)}`)
            .then((items) => alive && setAchievements(Array.isArray(items) ? items : []))
            .catch(() => alive && setAchievements([]));
        return () => { alive = false; };
    }, [selectedGame?.id]);

    const loadCloudSaves = useCallback(async () => {
        const requestId = ++cloudLoadRef.current;
        if (!selectedGame?.id || !selectedGame?.cloudSavesEnabled) {
            setCloudSaves([]);
            setCloudLoading(false);
            return;
        }
        setCloudLoading(true);
        try {
            const items = await api.get(`/platform/saves/${encodeURIComponent(selectedGame.id)}`);
            if (cloudLoadRef.current !== requestId) return;
            setCloudSaves(Array.isArray(items) ? items : []);
        } catch {
            if (cloudLoadRef.current === requestId) setCloudSaves([]);
        } finally {
            if (cloudLoadRef.current === requestId) setCloudLoading(false);
        }
    }, [selectedGame?.id, selectedGame?.cloudSavesEnabled]);

    useEffect(() => {
        loadCloudSaves();
    }, [loadCloudSaves]);

    useEffect(() => {
        setPendingDeleteSlot("");
        if (deleteConfirmTimerRef.current) {
            clearTimeout(deleteConfirmTimerRef.current);
            deleteConfirmTimerRef.current = null;
        }
    }, [selectedGame?.id]);

    useEffect(() => () => {
        if (screenshotTimerRef.current) clearTimeout(screenshotTimerRef.current);
        if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
    }, []);

    function dismissTutorial() {
        try { localStorage.setItem("deadsmile.gameView.tutorial.v1", "seen"); } catch {}
        setTutorialOpen(false);
    }

    async function removeCloudSave(slot) {
        if (!selectedGame?.id || deletingSlot) return;
        const normalizedSlot = String(slot);
        if (pendingDeleteSlot !== normalizedSlot) {
            setPendingDeleteSlot(normalizedSlot);
            setScreenshotState({ saving: false, message: t("deleteCloudSaveConfirm") });
            if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
            deleteConfirmTimerRef.current = setTimeout(() => {
                setPendingDeleteSlot("");
                deleteConfirmTimerRef.current = null;
                setScreenshotState((state) => state?.message === t("deleteCloudSaveConfirm") ? null : state);
            }, 4500);
            return;
        }
        setPendingDeleteSlot("");
        if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
        deleteConfirmTimerRef.current = null;
        setScreenshotState(null);
        setDeletingSlot(normalizedSlot);
        try {
            await api.delete(`/platform/saves/${encodeURIComponent(selectedGame.id)}/${encodeURIComponent(slot)}`);
            setCloudSaves((items) => items.filter((item) => String(item.slot) !== normalizedSlot));
        } catch {
        } finally {
            setDeletingSlot("");
        }
    }

    async function takeScreenshot() {
        if (screenshotState?.saving) return;
        setScreenshotState({ saving: true, message: t("takeScreenshot") });
        try {
            const result = await window.deadsmile?.takeScreenshot?.();
            if (!result?.ok) throw new Error(result?.error || t("screenshotFailed"));
            setScreenshotState({ saving: false, ok: true, message: t("screenshotSaved"), folder: result.folder, path: result.path });
        } catch (error) {
            setScreenshotState({ saving: false, ok: false, message: error?.message || t("screenshotFailed") });
        }
        if (screenshotTimerRef.current) clearTimeout(screenshotTimerRef.current);
        screenshotTimerRef.current = setTimeout(() => setScreenshotState(null), 5000);
    }

    const unlockedCount = achievements.filter((item) => item.unlocked_at || item.unlockedAt).length;

    return (
        <div className="game-view-shell">
            <div className="game-view-toolbar" role="toolbar" aria-label={t("gameView")}>
                <div className="game-view-brand">
                    <GameController size={18} weight="fill" />
                    <strong>{t("gameView")}</strong>
                    <kbd>{shortcutLabel}</kbd>
                </div>
                <span className="game-view-toolbar-separator" />
                <button type="button" onClick={takeScreenshot} title={t("takeScreenshot")} aria-label={t("takeScreenshot")}>
                    <ImageSquare size={19} />
                </button>
                <button type="button" onClick={() => setTutorialOpen(true)} title={t("gameViewTutorialTitle")} aria-label={t("gameViewTutorialTitle")}>
                    <span className="game-view-help">?</span>
                </button>
                <button type="button" onClick={() => window.deadsmile?.closeOverlay?.()} title={t("close")} aria-label={t("close")}>
                    <X size={19} />
                </button>
            </div>

            <main className="game-view-layout">
                <section className="game-view-card game-view-profile-card">
                    <div className="game-view-card-title"><UserCircle size={17} /><span>{t("profile")}</span></div>
                    <div className="game-view-profile-row">
                        <div className="game-view-avatar">
                            {user?.avatarUrl ? <SmartImage src={user.avatarUrl} fallback="" alt="" /> : initials(user)}
                        </div>
                        <div>
                            <strong>{user?.username || "Player"}</strong>
                            <span>{currentGame?.title ? `${t("playing")}: ${currentGame.title}` : t("gameViewSubtitle")}</span>
                        </div>
                    </div>
                </section>

                <section className="game-view-card game-view-library-card">
                    <div className="game-view-card-heading">
                        <div className="game-view-card-title"><GameController size={17} /><span>{t("library")}</span></div>
                        <small>{games.length}</small>
                    </div>
                    <div className="game-view-library-list">
                        {games.length ? games.slice(0, 12).map((item) => {
                            const active = String(item.id) === String(selectedGame?.id);
                            const runningNow = running.some((state) => String(state.id) === String(item.id));
                            return (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={`game-view-game ${active ? "active" : ""}`}
                                    onClick={() => setSelectedGameId(item.id)}
                                >
                                    <SmartImage src={imageOf(item)} fallback={FALLBACK_COVER} alt="" />
                                    <span><strong>{item.title}</strong><small>{runningNow ? t("playing") : item.cloudSavesEnabled ? t("cloudSaves") : t("game")}</small></span>
                                    {runningNow && <i className="game-view-running-dot" aria-label={t("playing")} />}
                                </button>
                            );
                        }) : <div className="game-view-empty">{t("noResults")}</div>}
                    </div>
                </section>

                <section className="game-view-card game-view-cloud-card">
                    <div className="game-view-card-heading">
                        <div className="game-view-card-title"><FloppyDisk size={17} /><span>{t("cloudSaves")}</span></div>
                        {selectedGame && <small title={selectedGame.title}>{selectedGame.title}</small>}
                    </div>
                    {!selectedGame ? (
                        <div className="game-view-empty">{t("selectGame")}</div>
                    ) : !selectedGame.cloudSavesEnabled ? (
                        <div className="game-view-empty">{t("cloudSavesUnavailable")}</div>
                    ) : cloudLoading ? (
                        <div className="game-view-empty">{t("loading")}</div>
                    ) : cloudSaves.length ? (
                        <div className="game-view-save-list">
                            {cloudSaves.slice(0, 8).map((save) => (
                                <div className="game-view-save" key={save.slot}>
                                    <span>
                                        <strong>{save.slot}</strong>
                                        <small>{save.updatedAt || save.updated_at ? new Date(save.updatedAt || save.updated_at).toLocaleString() : ""}</small>
                                    </span>
                                    <button type="button" disabled={Boolean(deletingSlot)} onClick={() => removeCloudSave(save.slot)} aria-label={pendingDeleteSlot === String(save.slot) ? t("deleteCloudSaveConfirm") : t("deleteCloudSave")} title={pendingDeleteSlot === String(save.slot) ? t("deleteCloudSaveConfirm") : t("deleteCloudSave")}>
                                        {deletingSlot === String(save.slot) ? <span className="cloud-save-spinner" aria-hidden="true" /> : <Trash size={15} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : <div className="game-view-empty">{t("noCloudSaves")}</div>}
                </section>

                <section className="game-view-card game-view-achievements-card">
                    <div className="game-view-card-heading">
                        <div className="game-view-card-title"><CheckCircle size={17} /><span>{t("achievements")}</span></div>
                        <small>{unlockedCount}/{achievements.length}</small>
                    </div>
                    {achievements.length ? (
                        <div className="game-view-achievements-list">
                            {achievements.slice(0, 6).map((item) => {
                                const unlocked = item.unlocked_at || item.unlockedAt;
                                return (
                                    <div key={item.id || item.key} className={`game-view-achievement ${unlocked ? "unlocked" : "locked"}`}>
                                        <CheckCircle size={17} weight={unlocked ? "fill" : "regular"} />
                                        <span><strong>{item.hidden && !unlocked ? "???" : item.title}</strong><small>{item.description}</small></span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <div className="game-view-empty">{t("noAchievements")}</div>}
                </section>
            </main>

            {screenshotState && (
                <div className={`game-view-status ${screenshotState.ok === false ? "error" : ""}`}>
                    <ImageSquare size={18} />
                    <span>{screenshotState.saving ? t("loading") : screenshotState.message}</span>
                    {screenshotState.ok && screenshotState.folder && (
                        <button type="button" onClick={() => window.deadsmile?.openScreenshotFolder?.()}>{t("openScreenshotFolder")}</button>
                    )}
                </div>
            )}

            {tutorialOpen && (
                <div className="game-view-tutorial-layer">
                    <section className="game-view-tutorial" role="dialog" aria-modal="true" aria-label={t("gameViewTutorialTitle")}>
                        <header>
                            <div><GameController size={22} weight="fill" /><strong>{t("gameViewTutorialTitle")}</strong></div>
                            <kbd>{shortcutLabel}</kbd>
                        </header>
                        <p>{t("gameViewTutorialDescription", { shortcut: shortcutLabel })}</p>
                        <div className="game-view-tutorial-grid">
                            <div><UserCircle size={21} /><span><strong>{t("profile")}</strong><small>{t("gameViewTutorialProfile")}</small></span></div>
                            <div><GameController size={21} /><span><strong>{t("library")}</strong><small>{t("gameViewTutorialLibrary")}</small></span></div>
                            <div><FloppyDisk size={21} /><span><strong>{t("cloudSaves")}</strong><small>{t("gameViewTutorialCloud")}</small></span></div>
                            <div><ImageSquare size={21} /><span><strong>{t("takeScreenshot")}</strong><small>{t("gameViewTutorialScreenshot")}</small></span></div>
                        </div>
                        <button type="button" className="game-view-tutorial-done" onClick={dismissTutorial}>{t("gotIt")}</button>
                    </section>
                </div>
            )}
        </div>
    );
}

function AchievementToast({ item, game }) {
    const { t } = useT();
    if (!item) return null;
    return <div className="achievement-toast"><CheckCircle size={28} weight="fill"/><div><small>{t("achievementUnlocked")}</small><strong>{item.title || item.key}</strong>{game?.title && <span>{game.title}</span>}</div></div>;
}

function AchievementToastWindow() {
    const [payload, setPayload] = useState(null);
    useEffect(() => window.deadsmile?.onAchievementUnlocked?.((data) => setPayload(data)), []);
    return <div className="achievement-toast-window"><AchievementToast item={payload?.achievement} /></div>;
}

export default function App() {
    const [status, setStatus] = useState("booting");
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const [language, setLanguageState] = useState(() => {
        try {
            return localStorage.getItem("deadsmile.language") || "en";
        } catch {
            return "en";
        }
    });
    const [user, setUser] = useState(null);
    const [runningGames, setRunningGames] = useState(new Set());
    const [gameViewShortcutLabel, setGameViewShortcutLabel] = useState("Ctrl + D");
    const [achievementToast, setAchievementToast] = useState(null);
    const achievementToastTimer = useRef(null);
    const [active, setActive] = useState("explore");
    const [view, setViewState] = useState(null);
    const [games, setGames] = useState([]);
    const [news, setNews] = useState([]);
    const [videos, setVideos] = useState([]);
    const [wishlist, setWishlist] = useState(new Set());
    const [entitlements, setEntitlements] = useState(new Set());
    const [itchAccount, setItchAccount] = useState({ connected: false, loading: true });
    const [commerceModal, setCommerceModal] = useState(null);
    const [installed, setInstalled] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("deadsmile.library") || "{}",
            );
        } catch {
            return {};
        }
    });
    const shortcutEnsuredRef = useRef(new Set());
    const [pendingExternalLaunchId, setPendingExternalLaunchId] = useState(null);
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
            window.deadsmile
                ?.syncGameViewLanguage?.({
                    language,
                    strings: COPY[language] || COPY.en,
                })
                ?.catch?.(() => {});
        }, [language]);

    useEffect(() => {
        let alive = true;
        window.deadsmile?.getGameViewSettings?.()
            .then((result) => {
                if (alive && result?.settings?.label) {
                    setGameViewShortcutLabel(result.settings.label);
                }
            })
            .catch(() => {});
        const off = window.deadsmile?.onGameViewSettingsChanged?.((settings) => {
            if (alive && settings?.label) setGameViewShortcutLabel(settings.label);
        });
        return () => {
            alive = false;
            off?.();
        };
    }, []);

    useEffect(() => {
        window.deadsmile?.getRunningGames?.().then(items => setRunningGames(new Set((items || []).map(x => x.id)))).catch(() => {});
        const offState = window.deadsmile?.onGameState?.((state) => setRunningGames(current => { const next = new Set(current); state.running ? next.add(state.id) : next.delete(state.id); return next; }));
        const offAchievement = window.deadsmile?.onAchievementUnlocked?.((payload) => {
            setAchievementToast(payload);
            if (achievementToastTimer.current) clearTimeout(achievementToastTimer.current);
            achievementToastTimer.current = setTimeout(() => {
                achievementToastTimer.current = null;
                setAchievementToast(null);
            }, 5500);
        });
        const offCloudConflict = window.deadsmile?.onCloudSaveConflict?.(() => {
            setNotice(t("cloudSaveConflict"));
        });
        return () => {
            offState?.();
            offAchievement?.();
            offCloudConflict?.();
            if (achievementToastTimer.current) clearTimeout(achievementToastTimer.current);
        };
    }, [t]);

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
        const ids = Object.keys(installed || {});
        window.deadsmile?.syncGameViewLibrary?.(ids)?.catch?.(() => {});
    }, [installed]);

    useEffect(() => {
        if (window.deadsmile?.platform !== "win32" || !window.deadsmile?.ensureGameShortcut) return;
        if (!Array.isArray(games) || games.length === 0) return;
        const gamesById = new Map(games.map((game) => [String(game?.id || ""), game]));

        for (const [gameId, entry] of Object.entries(installed || {})) {
            if (!entry?.path) continue;
            const key = `${gameId}:${entry.path}`;
            if (shortcutEnsuredRef.current.has(key)) continue;
            shortcutEnsuredRef.current.add(key);
            const game = gamesById.get(String(gameId));
            window.deadsmile.ensureGameShortcut({
                id: gameId,
                title: game?.title || game?.name || gameId,
                exePath: entry.path,
            }).then((result) => {
                if (!result?.created) shortcutEnsuredRef.current.delete(key);
            }).catch(() => {
                shortcutEnsuredRef.current.delete(key);
            });
        }
    }, [games, installed]);

    useEffect(() => {
        if (status !== "ready") return undefined;
        let alive = true;
        window.deadsmile?.consumePendingUpdate?.()
            .then((data) => {
                if (alive && data) setPendingUpdate(data);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [status]);

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
            const utilityMode = new URLSearchParams(window.location.search).has("overlay") || new URLSearchParams(window.location.search).has("toast");
            const minBoot = new Promise((r) => setTimeout(r, utilityMode ? 0 : 1400));
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
    const userId = validUserId(user?.id) ? String(user.id) : null;
    setLoading(true);
    const publicCached = readPublicContentCache();
    const userCached = readUserContentCache(userId);

    if (publicCached) {
        setGames(publicCached.games || []);
        setNews(publicCached.news || []);
        setVideos(publicCached.videos || []);
    }
    setWishlist(new Set(Array.isArray(userCached?.wishlistIds) ? userCached.wishlistIds : []));
    setEntitlements(new Set());
    setItchAccount({ connected: false, loading: true });

    Promise.allSettled([
        api.get("/games?page=1&limit=48"),
        api.get("/news?limit=48"),
        api.get("/videos?limit=48"),
        api.get("/wishlist"),
        api.get("/library"),
        api.get("/integrations/itch"),
    ]).then((results) => {
        if (!alive) return;
        const [gamesResult, newsResult, videosResult, wishlistResult, libraryResult, itchResult] = results;
        let gs = publicCached?.games || [];
        let ns = publicCached?.news || [];
        let vs = publicCached?.videos || [];

        if (gamesResult.status === "fulfilled") {
            gs = listFrom(gamesResult.value, "games");
            setGames(gs);
        }
        if (newsResult.status === "fulfilled") {
            ns = listFrom(newsResult.value, "news");
            setNews(ns);
        }
        if (videosResult.status === "fulfilled") {
            vs = listFrom(videosResult.value, "videos");
            setVideos(vs);
        }
        if (gamesResult.status === "fulfilled" || newsResult.status === "fulfilled" || videosResult.status === "fulfilled") {
            writePublicContentCache({ games: gs, news: ns, videos: vs });
        }

        if (wishlistResult.status === "fulfilled") {
            const ids = listFrom(wishlistResult.value, "games").map((item) => item.id).filter(Boolean);
            setWishlist(new Set(ids));
            writeUserContentCache(userId, { wishlistIds: ids });
        }
        if (libraryResult.status === "fulfilled") {
            setEntitlements(new Set(listFrom(libraryResult.value, "items").map((item) => item.id).filter(Boolean)));
        }
        if (itchResult.status === "fulfilled") {
            setItchAccount({ ...itchResult.value, loading: false });
        } else {
            setItchAccount({ connected: false, loading: false });
        }

        const publicFailures = [gamesResult, newsResult, videosResult].filter((result) => result.status === "rejected").length;
        if (publicFailures === 3) {
            setNotice(
                publicCached
                    ? COPY[language]?.offlineCacheNotice || "Sem conexão — mostrando conteúdo em cache."
                    : t("unableToLoadContent"),
            );
        }
    }).finally(() => {
        if (alive) setLoading(false);
    });

    return () => {
        alive = false;
    };
}, [status, user?.id]);
    useEffect(() => {
        if (status !== "ready") return undefined;
        const userId = validUserId(user?.id) ? String(user.id) : null;
        if (!userId) return undefined;
        let active = true;
        let socket = null;
        let reconnectTimer = null;
        let reconnectAttempt = 0;
        let pollTimer = null;
        let pollInFlight = null;
        let pollAgain = false;
        let processingChain = Promise.resolve();
        let recoveryNeeded = false;
        const checkpointKey = `deadsmile.live.after:${userId}`;
        let after = Number(localStorage.getItem(checkpointKey) || 0);
        if (!Number.isSafeInteger(after) || after < 0) after = 0;
        let initialized = after > 0;

        const remember = (event) => {
            const id = Number(event?.id || 0);
            if (!Number.isSafeInteger(id) || id <= after) return false;
            after = id;
            try { localStorage.setItem(checkpointKey, String(after)); } catch {}
            return true;
        };

        const refreshType = async (event) => {
            const type = event?.event_type;
            if (type === "wishlist.updated") {
                const gameId = event.payload?.gameId;
                if (!gameId) return;
                setWishlist((current) => {
                    const next = new Set(current);
                    if (event.payload?.inWishlist) next.add(gameId);
                    else next.delete(gameId);
                    writeUserContentCache(userId, { wishlistIds: [...next] });
                    return next;
                });
                return;
            }
            if (type === "game.published") {
                const data = await api.get("/games?page=1&limit=48");
                if (!active) return;
                const items = listFrom(data, "games");
                setGames(items);
                const cached = readPublicContentCache() || {};
                writePublicContentCache({ games: items, news: cached.news || [], videos: cached.videos || [] });
                invalidateGameUpdateCache(event.payload?.id || event.entity_id || null);
            } else if (type === "news.published") {
                const data = await api.get("/news?limit=48");
                if (!active) return;
                const items = listFrom(data, "news");
                setNews(items);
                const cached = readPublicContentCache() || {};
                writePublicContentCache({ games: cached.games || [], news: items, videos: cached.videos || [] });
            } else if (type === "video.published") {
                const data = await api.get("/videos?limit=48");
                if (!active) return;
                const items = listFrom(data, "videos");
                setVideos(items);
                const cached = readPublicContentCache() || {};
                writePublicContentCache({ games: cached.games || [], news: cached.news || [], videos: items });
            } else {
                return;
            }
            if (!active) return;
            setNotifications((current) => {
                const notification = {
                    id: `content-${event.id}`,
                    title: event.payload?.title || "Deadsmile Games",
                    message: event.payload?.preview || t("newContentAvailable"),
                    time: Date.parse(event.created_at || 0) || Date.now(),
                    unread: true,
                };
                return current.some((item) => item.id === notification.id) ? current : [notification, ...current];
            });
        };

        const processEvents = async (events, { recovery = false } = {}) => {
            const ordered = [...events]
                .filter((event) => Number.isSafeInteger(Number(event?.id || 0)))
                .sort((a, b) => Number(a.id) - Number(b.id));
            if (!initialized) {
                for (const event of ordered) remember(event);
                initialized = true;
                recoveryNeeded = false;
                return;
            }
            if (recoveryNeeded && !recovery) return;
            for (const event of ordered) {
                const id = Number(event.id || 0);
                if (id <= after) continue;
                try {
                    await refreshType(event);
                    remember(event);
                } catch (error) {
                    recoveryNeeded = true;
                    throw error;
                }
            }
            if (recovery) recoveryNeeded = false;
        };

        const queueEvents = (events, options = {}) => {
            const task = processingChain.then(() => processEvents(events, options));
            processingChain = task.catch(() => {});
            return task;
        };

        const poll = async () => {
            if (pollInFlight) {
                pollAgain = true;
                return pollInFlight;
            }
            const baseline = !initialized;
            pollInFlight = (async () => {
                try {
                    for (let page = 0; page < 20 && active; page += 1) {
                        const events = await api.get(`/platform/events?after=${after}&limit=100`);
                        if (!active || !Array.isArray(events)) return;
                        await queueEvents(events, { recovery: true });
                        if (baseline || events.length < 100) break;
                    }
                } catch {}
            })().finally(() => {
                pollInFlight = null;
                if (pollAgain && active) {
                    pollAgain = false;
                    queueMicrotask(() => poll());
                }
            });
            return pollInFlight;
        };

        const scheduleReconnect = () => {
            if (!active || reconnectTimer) return;
            const base = Math.min(30_000, 1_000 * (2 ** Math.min(reconnectAttempt, 5)));
            const delay = base + Math.floor(Math.random() * 750);
            reconnectAttempt += 1;
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connect();
            }, delay);
        };

        const connect = async () => {
            let ticket;
            try {
                const result = await api.get("/platform/live-ticket");
                ticket = typeof result?.ticket === "string" ? result.ticket : "";
            } catch {
                scheduleReconnect();
                return;
            }
            if (!active || !ticket) {
                if (active) scheduleReconnect();
                return;
            }

            try {
                socket = new WebSocket(`wss://deadsmile.vercel.app/api/live?ticket=${encodeURIComponent(ticket)}`);
            } catch {
                scheduleReconnect();
                return;
            }

            let authenticated = false;
            let handshakeTimer = null;
            socket.onopen = () => {
                handshakeTimer = setTimeout(() => {
                    if (!authenticated && socket?.readyState === WebSocket.OPEN) socket.close(4001, "Authentication timeout");
                }, 8_000);
            };
            socket.onmessage = (message) => {
                try {
                    const event = JSON.parse(message.data);
                    if (event.type === "connected") {
                        if (event.authenticated === true) {
                            authenticated = true;
                            reconnectAttempt = 0;
                            clearTimeout(handshakeTimer);
                        } else {
                            socket?.close(4001, "Authentication required");
                        }
                        return;
                    }
                    if (!authenticated) {
                        socket?.close(4001, "Authentication required");
                        return;
                    }
                    poll();
                } catch {}
            };
            socket.onclose = () => {
                clearTimeout(handshakeTimer);
                socket = null;
                scheduleReconnect();
            };
            socket.onerror = () => socket?.close();
        };

        poll().finally(() => {
            if (active) connect();
        });
        pollTimer = setInterval(poll, 15_000);
        return () => {
            active = false;
            socket?.close();
            clearTimeout(reconnectTimer);
            clearInterval(pollTimer);
        };
    }, [status, user?.id, t]);
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
                await api.delete(`/wishlist/${encodeURIComponent(game.id)}`);
                setWishlist((current) => {
                    const next = new Set(current);
                    next.delete(game.id);
                    writeUserContentCache(user?.id, { wishlistIds: [...next] });
                    return next;
                });
            } else {
                await api.post("/wishlist", { gameId: game.id });
                setWishlist((current) => {
                    const next = new Set(current);
                    next.add(game.id);
                    writeUserContentCache(user?.id, { wishlistIds: [...next] });
                    return next;
                });
            }
        } catch {
            setNotice(t("unableToUpdateWishlist"));
        }
    }
    async function verifyCommerce(game, openCheckout = true) {
        try {
            const result = await api.post(`/library/${encodeURIComponent(game.id)}/verify`);
            if (result?.owned) {
                setEntitlements((current) => new Set(current).add(game.id));
                setCommerceModal({ game, status: "owned", message: "" });
                return true;
            }
            setEntitlements((current) => {
                const next = new Set(current);
                next.delete(game.id);
                return next;
            });
            setCommerceModal({ game, status: "checkout", message: "" });
            if (openCheckout && result?.purchaseUrl) openExternal(result.purchaseUrl);
            return false;
        } catch (error) {
            if (error?.code === "ITCH_NOT_CONNECTED") {
                setCommerceModal({ game, status: "connect", message: "" });
            } else {
                setCommerceModal({ game, status: "error", message: t("itchVerificationFailed") });
            }
            return false;
        }
    }
    async function connectItchFromLauncher() {
        if (!commerceModal?.game) return;
        try {
            const result = await api.post("/integrations/itch/connect", {
                client: "launcher",
                locale: language,
                returnPath: null,
            });
            setCommerceModal((current) => ({ ...current, status: "connecting", message: "" }));
            openExternal(result.authorizeUrl);
        } catch {
            setCommerceModal((current) => ({ ...current, status: "error", message: t("itchConnectionFailed") }));
        }
    }
    async function connectItchAccount() {
        try {
            const result = await api.post("/integrations/itch/connect", {
                client: "launcher",
                locale: language,
                returnPath: null,
            });
            setItchAccount((current) => ({ ...current, connecting: true, loading: false }));
            openExternal(result.authorizeUrl);
        } catch {
            setNotice(t("itchConnectionFailed"));
        }
    }
    async function refreshItchLibrary(showMessage = false) {
        try {
            await api.post("/library/sync");
            const [libraryData, statusData] = await Promise.all([
                api.get("/library"),
                api.get("/integrations/itch"),
            ]);
            setEntitlements(new Set(listFrom(libraryData, "items").map((item) => item.id)));
            setItchAccount({ ...statusData, loading: false });
            if (showMessage) setNotice(t("libraryUpdated"));
            return true;
        } catch {
            if (showMessage) setNotice(t("itchVerificationFailed"));
            return false;
        }
    }
    async function disconnectItchFromLauncher() {
        try {
            await api.delete("/integrations/itch");
            setItchAccount({ connected: false, loading: false, configured: true });
            setEntitlements(new Set());
            setNotice(t("accountDisconnected"));
        } catch {
            setNotice(t("itchConnectionFailed"));
        }
    }
    useEffect(() => {
        if (!window.deadsmile?.onAppFocus) return undefined;
        return window.deadsmile.onAppFocus(async () => {
            if (!commerceModal?.game) return;
            if (commerceModal.status === "connecting") {
                try {
                    const statusData = await api.get("/integrations/itch");
                    setItchAccount({ ...statusData, loading: false });
                    if (statusData.connected) await verifyCommerce(commerceModal.game, false);
                } catch {
                    setCommerceModal((current) => ({ ...current, status: "error", message: t("itchConnectionFailed") }));
                }
            } else if (commerceModal.status === "checkout") {
                await verifyCommerce(commerceModal.game, false);
            }
        });
    }, [commerceModal, language]);
    useEffect(() => {
        if (!itchAccount.connecting || !window.deadsmile?.onAppFocus) return undefined;
        return window.deadsmile.onAppFocus(async () => {
            try {
                const statusData = await api.get("/integrations/itch");
                setItchAccount({ ...statusData, loading: false, connecting: !statusData.connected });
                if (statusData.connected) await refreshItchLibrary(true);
            } catch {
                setNotice(t("itchConnectionFailed"));
            }
        });
    }, [itchAccount.connecting, language]);
    async function installGame(game, play = false, forceUpdate = false) {
        if (game.commerceEnabled && !entitlements.has(game.id)) {
            if (!online) {
                setNotice(t("unableToPlayGame"));
                return;
            }
            const owned = await verifyCommerce(game, true);
            if (!owned) return;
            setCommerceModal(null);
        }

        if (play && !forceUpdate && installed[game.id]?.path) {
            if (!online || !window.deadsmile?.playGame) {
                setNotice(t("unableToPlayGame"));
                return;
            }
            const result = await window.deadsmile.playGame({
                id: game.id,
                slug: game.slug || null,
                title: game.title || null,
                coverImage: game.coverImage || game.cover_image || null,
                exePath: installed[game.id].path,
                gameVersion: installed[game.id].version || null,
            });
            if (result?.error) {
                if (game.commerceEnabled && result?.code === "GAME_ACCESS_REQUIRED") {
                    setEntitlements((current) => {
                        const next = new Set(current);
                        next.delete(game.id);
                        return next;
                    });
                    await verifyCommerce(game, false);
                }
                setNotice(t("unableToPlayGame"));
            }
            return;
        }

        if (!online) {
            setNotice(t("offlineNoDownload"));
            return;
        }

    if (!game.downloadUrl && !game.commerceEnabled) {
        setNotice(t("downloadUnavailable"));
        return;
    }

    try {
        const currentEntry = installed[game.id];
        const mode = forceUpdate && currentEntry?.path ? "update" : "download";
        const result = await window.deadsmile.downloadGame({
            id: game.id,
            slug: game.slug,
            title: game.title,
            url: game.downloadUrl,
            mode,
            currentVersion: currentEntry?.version,
            filename: currentEntry?.filename,
            path: currentEntry?.path,
            commerceEnabled: Boolean(game.commerceEnabled),
            itchGameId: game.itchGameId || null,
        });

        invalidateGameUpdateCache(game.id);
        setInstalled((x) => {
            const n = {
                ...x,
                [game.id]: {
                    path: result.path,
                    folderPath: result.folderPath,
                    filename: result.filename,
                    downloadedAt: Date.now(),
                    version: result.version || versionFromLocalFilename(result.filename),
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
        try {
            if (localStorage.getItem("deadsmile.telemetry") === "true") {
                await api.post("/platform/telemetry", {
                    gameId: game.id,
                    eventType: forceUpdate ? "update_failed" : "install_failed",
                    appVersion: null,
                    payload: { stage: forceUpdate ? "update" : "install" },
                });
            }
        } catch {}
        setNotifications((n) => [
            {
                id: `error-${Date.now()}`,
                title: t("downloadFailed"),
                message: t("downloadFailed"),
                time: Date.now(),
                unread: true,
            },
            ...n,
        ]);
        setNotice(t("downloadFailed"));
    }
}
    useEffect(() => {
        if (!window.deadsmile?.onLaunchGame) return undefined;
        const off = window.deadsmile.onLaunchGame((gameId) => {
            setPendingExternalLaunchId(String(gameId || ""));
        });
        window.deadsmile.readyForLaunchRequests?.().catch(() => {});
        return off;
    }, []);

    useEffect(() => {
        if (!pendingExternalLaunchId) return;
        const entry = installed[pendingExternalLaunchId];
        if (!entry?.path || !online || !window.deadsmile?.playGame) {
            setPendingExternalLaunchId(null);
            setNotice(t("unableToPlayGame"));
            return;
        }

        const gameId = pendingExternalLaunchId;
        setPendingExternalLaunchId(null);
        window.deadsmile.playGame({
            id: gameId,
            slug: null,
            title: null,
            coverImage: null,
            exePath: entry.path,
            gameVersion: entry.version || null,
        }).then((result) => {
            if (result?.error) setNotice(t("unableToPlayGame"));
        }).catch(() => setNotice(t("unableToPlayGame")));
    }, [pendingExternalLaunchId, installed, online, t]);

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
                game.id,
            );
            if (error) throw new Error(error);
            setInstalled((x) => {
                const next = { ...x };
                delete next[game.id];
                localStorage.setItem("deadsmile.library", JSON.stringify(next));
                return next;
            });
            setNotice(`${game.title} ${t("wasRemovedFromYourLibrary")}`);
        } catch {
            setNotice(t("unableToDeleteLocalGame"));
        }
    }
    async function startUpdate() {
        if (!updateInfo || !window.deadsmile?.updateLauncher) return;
        setUpdating(true);
        try {
            await window.deadsmile.updateLauncher();
        } catch {
            setUpdating(false);
            setNotice(t("downloadFailed"));
        }
    }
    function clearNotifications() {
        setNotifications([]);
    }
    async function logout() {
        const userId = validUserId(user?.id) ? String(user.id) : null;
        try {
            await api.post("/auth/logout");
        } catch {}
        try {
            await window.deadsmile?.clearAuthSession?.();
        } catch {}
        api.resetSecurity?.();
        clearUserContentCache(userId);
        gameUpdateCache.clear();
        setWishlist(new Set());
        setEntitlements(new Set());
        setItchAccount({ connected: false, loading: false });
        setCommerceModal(null);
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
            const nextGames = listFrom(g, "games");
            const nextNews = listFrom(n, "news");
            const nextVideos = listFrom(v, "videos");
            setGames(nextGames);
            setNews(nextNews);
            setVideos(nextVideos);
            writePublicContentCache({ games: nextGames, news: nextNews, videos: nextVideos });
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
    const utilityParams = new URLSearchParams(window.location.search);
    const isGameView = utilityParams.get("overlay") === "1";
    if (utilityParams.get("toast") === "1") return (
        <LanguageContext.Provider value={languageCtx}><AchievementToast item={achievementToast?.achievement} /></LanguageContext.Provider>
    );
    if (isGameView) {
        if (status === "booting") return null;
        if (status === "login") return (
            <LanguageContext.Provider value={languageCtx}>
                <div className="game-view-shell game-view-auth-message">
                    <div className="game-view-auth-card"><GameController size={22} weight="fill"/><strong>{t("gameView")}</strong><span>{t("signIn")}</span><kbd>{gameViewShortcutLabel}</kbd></div>
                </div>
            </LanguageContext.Provider>
        );
        return (
            <LanguageContext.Provider value={languageCtx}><RunningGamesContext.Provider value={runningGames}><GameOverlay user={user} games={games.filter(g => g.commerceEnabled ? entitlements.has(g.id) : installed[g.id] || entitlements.has(g.id))} shortcutLabel={gameViewShortcutLabel}/></RunningGamesContext.Provider></LanguageContext.Provider>
        );
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
                installedEntry={installed[selectedGame.id]}
                downloading={downloadsById[selectedGame.id]}
                entitled={entitlements.has(selectedGame.id)}
                games={games}
                videos={videos}
                openGame={openGame}
                openVideo={openVideo}
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
                entitlements={entitlements}
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
                installedEntry={installed[view.item.id]}
                downloading={downloadsById[view.item.id]}
                entitled={entitlements.has(view.item.id)}
                games={games}
                videos={videos}
                openGame={openGame}
                openVideo={openVideo}
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
                entitlements={entitlements}
                openGame={openGame}
                openVideo={openVideo}
                setView={setView}
            />
        );
    else if (active === "library")
        current = (
            <Library
                games={games}
                entitlements={entitlements}
                playtime={playtime}
                installed={installed}
                onInstall={installGame}
                onDelete={deleteInstalledGame}
                downloading={downloadsById}
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
                entitlements={entitlements}
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
                itchAccount={itchAccount}
                onConnectItch={connectItchAccount}
                onSyncItch={() => refreshItchLibrary(true)}
                onDisconnectItch={disconnectItchFromLauncher}
            />
        );
    else if (active === "admin" && isAdmin(user))
        current = <Admin onPublished={refreshContent} setView={setView} />;
    else current = null;
    return (
        <>
            <LanguageContext.Provider value={languageCtx}>
            <RunningGamesContext.Provider value={runningGames}>
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
            {commerceModal && (
                <CommerceModal
                    state={commerceModal}
                    onClose={() => setCommerceModal(null)}
                    onConnect={connectItchFromLauncher}
                    onCheckout={() => commerceModal.game.purchaseUrl && openExternal(commerceModal.game.purchaseUrl)}
                    onVerify={() => verifyCommerce(commerceModal.game, false)}
                    onDownload={() => {
                        const game = commerceModal.game;
                        setCommerceModal(null);
                        installGame(game);
                    }}
                />
            )}
            {selectedVideo && (
                <Portal>
                    <VideoPlayer video={selectedVideo} onClose={goBack} />
                </Portal>
            )}
            {pendingUpdate && (
                <Portal>
                    <UpdateWelcomeModal
                        info={pendingUpdate}
                        onClose={() => setPendingUpdate(null)}
                    />
                </Portal>
            )}
                <AchievementToast item={achievementToast?.achievement} game={games.find(g => g.id === achievementToast?.gameId)} />
                </RunningGamesContext.Provider>
                </LanguageContext.Provider>
        </>
    );
}
