# Interface nativa WinUI 3 — versão 2.1.0

A UI segue as quatro imagens de referência fornecidas: WinUI 3 Gallery, página de um jogo da Microsoft Store página inicial da Store e Xbox Game Bar. O launcher conserva sua identidade e seus contratos de API; conteúdo de outros produtos da Store não é adicionado ao catálogo.

| Elemento | Implementação |
|---|---|
| Sidebar | NavigationView nativo, LeftCompact; #202020. Itens no topo; recolher/expandir no PaneFooter. Voltar sempre visível na TitleBar. |
| Corpo | #272727; cards com brushes de tema WinUI. |
| Barra superior | TitleBar nativo, AutoSuggestBox central e PersonPicture com MenuFlyout. |
| Tipografia | Estilos Body, Caption, Subtitle e Title do WinUI; fonte padrão do sistema. |
| Entrada | Boot de pelo menos três segundos e verificação do catálogo público; visitante entra direto. Login/2FA em ContentDialog com controles padrão. |
| Conta | PersonPicture recebe URL ou imagem embutida validada. Download/executar/wishlist solicitam login por diálogo com benefícios e screenshot do launcher. |
| Catálogo/biblioteca | GridView com capa 180×270 DIPs; Poster/BoxArt da Store, depois cover do banco. Tipografia, teclado, foco e rolagem nativos. |
| Busca | AutoSuggestBox apresenta jogos no popup; se não há jogo correspondente, oferece Configurações. |
| Newswire | Cards na Home e página própria; ContentDialog com título, resumo, imagem, texto e jogo relacionado, altura limitada e ScrollViewer. |
| Produto | Banner de 360 DIPs; MediaPlayerElement com trailer direto/DASH da Store ou mídia direta do jogo. Capa do banco como fallback. Ícone apenas se existe na Store, com cantos de 16 DIPs. |
| Galeria | ContentDialog com largura sincronizada à imagem, Stretch.Uniform e altura limitada à janela; imagens panorâmicas e verticais aparecem inteiras. |
| Downloads | ProgressBar, botões padrão e InfoBadge na navegação. |
| Configurações | Tema escuro/claro/sistema, navegação compacta/expandida, animações, rotação do banner, efeitos do Windows e avisos de conquistas; controles padrão. |
| DeadBar/Ctrl+D | Barra compacta com relógio real e widgets flutuantes de perfil, biblioteca, conquistas, saves e captura; arraste, fixação, fechamento e restauração. Widgets opacos. |
| Captura | Windows.Graphics.Capture de uma janela; PNG local, formatos story/post sem distorção e compartilhamento nativo. |
| Tray/notificações | Shell notification icon; menu XAML de abrir/sair. App notifications com fallback de notificações do Shell. Preferências e aviso inicial único. |
| Conquistas | Aviso XAML com fundo sólido no Windows 10; Mica opaco e cantos do DWM no Windows 11 quando disponíveis. O fallback do Mica continua opaco. |
| Ícone | ICO com 15 tamanhos e assets MSIX targetsize com variantes unplated/lightunplated; sem margem extra adicionada no build. |
| Movimento | EntranceThemeTransition, ContentThemeTransition, RepositionThemeTransition e FadeInThemeAnimation do WinUI; opção do app e preferência de animações do Windows respeitadas. |

Os templates de Button, NavigationView, TextBox, ComboBox e ContentDialog continuam sendo os do WinUI. Acento, estados de foco/hover/pressionado e acessibilidade vêm da biblioteca. O tema HighContrast usa as cores do sistema. A janela principal usa o mínimo nativo de 960 × 640 DIPs; não existe uma janela de assistente de instalação: instalação e desinstalação são controladas pelo Windows por meio do MSIX. A Newswire recalcula as colunas com base em `PageLayout.ActualWidth`: o CI validou 3 colunas na janela larga, 2 após o redimensionamento e o retorno a 3 colunas ao restaurar. Os demais layouts refluem conforme o espaço disponível.

A ação adicional “Verificar instalação” foi removida da UI. “Verificar compra” foi mantida segundo o fluxo original. Os serviços de autenticação, downloads, instalações, processos, saves e conquistas permanecem no Core. Os testes adicionais conferem os nomes alternativos de campos da API usados por capas e conquistas.

## Validação

O pipeline compila o aplicativo e produz um único pacote de distribuição MSIX. Uma compilação separada com `ValidateNativeUi=true` ativa fixtures e captura a própria árvore XAML por RenderTargetBitmap. Esse código de validação é excluído dos binários de distribuição pelo pré-processador; o pipeline verifica essa exclusão.

O teste visual nativo no workflow atual verifica login, navegação, busca, detalhes, redimensionamento, posicionamento dos controles, cores, limites da galeria, tema claro, persistência de preferências, localização em português/espanhol, colunas adaptáveis da Newswire, widgets fixados e fundo sólido do toast. Consulte a execução atual do Actions antes de considerar esses checks aprovados. As capturas usam dados e imagens locais de teste; não representam uma conta ou biblioteca real. Testes com jogos/contas reais permanecem fora da validação automática de layout.

Os widgets reproduzem a organização da referência da Game Bar usando controles WinUI. Seus botões apresentam apenas as funções já existentes do launcher; não há métricas fictícias de desempenho. A captura usa Windows.Graphics.Capture e é iniciada pelo usuário. Fixar mantém o widget sobre o jogo quando Ctrl+D fecha a barra; fechar o jogo ou desativar o Game View oculta todos os widgets.

O ícone é derivado da arte quadrada existente. A falta de variantes targetsize/unplated fazia o Windows escolher a representação de tile com placa e redução. Gerar os tamanhos adequados também evita reutilizar apenas o ICO antigo de 256 pixels.

## Documentação consultada

- [NavigationView](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/navigationview)
- [TitleBar](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/title-bar)
- [Tipografia](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography)
- [Cor](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/color)
- [Layouts responsivos](https://learn.microsoft.com/en-us/windows/apps/design/layout/responsive-design)
- [Acessibilidade](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-overview)

As decisões usam navegação consistente, hierarquia tipográfica, espaçamento regular e adaptação à largura da janela, conforme a documentação da Microsoft.

- [Animações XAML](https://learn.microsoft.com/en-us/windows/apps/develop/motion/xaml-animation)
- [Transições de conteúdo](https://learn.microsoft.com/en-us/windows/apps/design/motion/content-transition-animations)
- [Materiais e fallback](https://learn.microsoft.com/en-us/windows/apps/develop/ui/materials)
- [System backdrops](https://learn.microsoft.com/en-us/windows/apps/develop/ui/system-backdrops)
- [Construção do ícone Windows](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-construction)

- [MediaPlayerElement e transporte](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/media-playback)
- [Captura de janela](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture)
- [Compartilhamento WinRT com HWND](https://learn.microsoft.com/en-us/windows/apps/develop/ui/display-ui-objects)
- [App notifications](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/app-notifications-quickstart)
- [Segoe Fluent Icons / Windows 10](https://learn.microsoft.com/en-us/windows/apps/design/iconography/segoe-fluent-icons-font)
