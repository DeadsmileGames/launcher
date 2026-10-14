# Interface nativa WinUI 3 — versão 2.1.0

A UI segue as quatro imagens de referência fornecidas: WinUI 3 Gallery, página de um jogo da Microsoft Store página inicial da Store e Xbox Game Bar. O launcher conserva sua identidade e seus contratos de API; conteúdo de outros produtos da Store não é adicionado ao catálogo.

| Elemento | Implementação |
|---|---|
| Sidebar | NavigationView nativo, LeftCompact; #202020. Itens no topo; recolher/expandir no PaneFooter. Voltar sempre visível na TitleBar. |
| Corpo | #272727; cards com brushes de tema WinUI. |
| Barra superior | TitleBar nativo, AutoSuggestBox central e PersonPicture com MenuFlyout. O botão da foto abre Configurações; o menu separa Configurações de Minha conta. |
| Tipografia | Estilos Body, Caption, Subtitle e Title do WinUI; fonte padrão do sistema. |
| Entrada | Boot de pelo menos três segundos e verificação do catálogo público; visitante entra direto. Login/2FA em ContentDialog com controles padrão. |
| Conta | PersonPicture recebe URL ou imagem embutida validada. O editor de foto tem preview circular, zoom centrado e arraste para reposicionar. Download/executar/wishlist solicitam login por diálogo. Desativar 2FA pede e envia o código atual. |
| Catálogo/biblioteca | GridView com capa 180×270 DIPs; Poster/BoxArt da Store, depois cover do banco. Tipografia, teclado, foco e rolagem nativos. |
| Busca | AutoSuggestBox apresenta jogos no popup; se não há jogo correspondente, oferece Configurações. |
| Newswire | Cards na Home e página própria; ContentDialog com conteúdo e ScrollViewer centralizados, largura limitada à janela e rolagem vertical. |
| Produto | Banner de 360 DIPs; MediaPlayerElement com trailer direto/DASH da Store ou mídia direta do jogo. Capa do banco como fallback. Ícone apenas se existe na Store, com cantos de 16 DIPs. |
| Galeria | ContentDialog com largura adaptável, Stretch.Uniform, navegação anterior/próxima e controles de zoom com ajuste e redefinição; imagens panorâmicas e verticais podem ser ampliadas e reposicionadas por rolagem sem cortar os botões. |
| Downloads | ProgressBar, botões padrão e InfoBadge na navegação. |
| Configurações | Tema escuro/claro/sistema, navegação compacta/expandida, animações, rotação do banner, efeitos do Windows e avisos de conquistas; controles padrão. |
| Tray/notificações | Shell notification icon; menu de abrir/sair desenhado pelo menu nativo do Windows. App notifications com fallback de notificações do Shell. Preferências e aviso inicial único. Toasts flutuantes usam região HWND arredondada para evitar cantos pretos. |
| Conquistas | Aviso XAML com fundo sólido no Windows 10; Mica opaco e cantos do DWM no Windows 11 quando disponíveis. O fallback do Mica continua opaco. |
| Ícone | ICO com 15 tamanhos e assets MSIX targetsize com variantes unplated/lightunplated; sem margem extra adicionada no build. |
| Movimento | EntranceThemeTransition, ContentThemeTransition, RepositionThemeTransition e FadeInThemeAnimation do WinUI; opção do app e preferência de animações do Windows respeitadas. |

Os templates de Button, NavigationView, TextBox, ComboBox e ContentDialog continuam sendo os do WinUI. Acento, estados de foco/hover/pressionado e acessibilidade vêm da biblioteca. O tema HighContrast usa as cores do sistema. A janela principal usa o mínimo nativo de 960 × 640 DIPs; não existe uma janela de assistente de instalação: instalação e desinstalação são controladas pelo Windows por meio do MSIX. A Newswire recalcula as colunas com base em `PageLayout.ActualWidth`: o CI validou 3 colunas na janela larga, 2 após o redimensionamento e o retorno a 3 colunas ao restaurar. Os demais layouts refluem conforme o espaço disponível.

A ação adicional “Verificar instalação” foi removida da UI. “Verificar compra” foi mantida segundo o fluxo original. Os serviços de autenticação, downloads, instalações, processos, saves e conquistas permanecem no Core. Os testes adicionais conferem os nomes alternativos de campos da API usados por capas e conquistas.

## Validação

O pipeline compila o aplicativo e produz um único pacote de distribuição MSIX. Uma compilação separada com `ValidateNativeUi=true` ativa fixtures e captura a própria árvore XAML por RenderTargetBitmap. Esse código de validação é excluído dos binários de distribuição pelo pré-processador; o pipeline verifica essa exclusão.

O teste visual nativo no workflow atual verifica login, navegação, busca, detalhes, redimensionamento, posicionamento dos controles, cores, limites da galeria, tema claro, persistência de preferências, localização em português/espanhol, colunas adaptáveis da Newswire e o fundo sólido do toast de conquista. Consulte a execução atual do Actions antes de considerar esses checks aprovados. As capturas usam dados e imagens locais de teste; não representam uma conta ou biblioteca real. Testes com jogos/contas reais permanecem fora da validação automática de layout.


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
- [Compartilhamento WinRT com HWND](https://learn.microsoft.com/en-us/windows/apps/develop/ui/display-ui-objects)
- [App notifications](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/app-notifications-quickstart)
- [Segoe Fluent Icons / Windows 10](https://learn.microsoft.com/en-us/windows/apps/design/iconography/segoe-fluent-icons-font)
