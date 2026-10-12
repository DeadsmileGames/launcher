# Interface nativa WinUI 3 — versão 2.0.2

A UI segue as quatro imagens de referência fornecidas: WinUI 3 Gallery, página de um jogo da Microsoft Store página inicial da Store e Xbox Game Bar. O launcher conserva sua identidade e seus contratos de API; conteúdo de outros produtos da Store não é adicionado ao catálogo.

| Elemento | Implementação |
|---|---|
| Sidebar | NavigationView nativo, LeftCompact; #202020. |
| Corpo | #272727; cards com brushes de tema WinUI. |
| Barra superior | TitleBar nativo, AutoSuggestBox central e PersonPicture com MenuFlyout. |
| Tipografia | Estilos Body, Caption, Subtitle e Title do WinUI; fonte padrão do sistema. |
| Login | TextBox, PasswordBox, AccentButton, HyperlinkButton, ComboBox e InfoBar padrão. |
| Catálogo/biblioteca | GridView com teclado, foco, seleção e rolagem nativos; imagens vindas do catálogo existente. |
| Produto | Banner de 360 DIPs, imagem limitada e recortada dentro da faixa; ações, screenshots, descrição e metadados. |
| Galeria | ContentDialog com largura sincronizada à imagem, Stretch.Uniform e altura limitada à janela; imagens panorâmicas e verticais aparecem inteiras. |
| Downloads | ProgressBar, botões padrão e InfoBadge na navegação. |
| Configurações | Tema escuro/claro/sistema, navegação compacta/expandida, animações, rotação do banner, efeitos do Windows e avisos de conquistas; controles padrão. |
| Ctrl+D | Barra compacta com relógio real e widgets flutuantes de perfil, biblioteca, conquistas e saves; títulos curtos, arraste, fixação e fechamento. Fundo fora dos widgets transparente; widgets opacos. |
| Conquistas | Aviso XAML com fundo sólido no Windows 10; Mica opaco e cantos do DWM no Windows 11 quando disponíveis. O fallback do Mica continua opaco. |
| Ícone | ICO com 15 tamanhos e assets MSIX targetsize com variantes unplated/lightunplated; sem margem extra adicionada no build. |
| Movimento | EntranceThemeTransition, ContentThemeTransition, RepositionThemeTransition e FadeInThemeAnimation do WinUI; opção do app e preferência de animações do Windows respeitadas. |

Os templates de Button, NavigationView, TextBox, ComboBox e ContentDialog continuam sendo os do WinUI. Acento, estados de foco/hover/pressionado e acessibilidade vêm da biblioteca. O tema HighContrast usa as cores do sistema. A largura mínima é 640 e os layouts refluem conforme o espaço disponível.

A ação adicional “Verificar instalação” foi removida da UI. “Verificar compra” foi mantida segundo o fluxo original. Os serviços de autenticação, downloads, instalações, processos, saves e conquistas permanecem no Core. Os testes adicionais conferem os nomes alternativos de campos da API usados por capas e conquistas.

## Validação

O pipeline compila primeiro o aplicativo de distribuição e produz os instaladores. Uma compilação separada com `ValidateNativeUi=true` ativa fixtures e captura a própria árvore XAML por RenderTargetBitmap. Esse código de validação é excluído dos binários de distribuição pelo pré-processador; o pipeline verifica essa exclusão.

O teste de UI verifica login, navegação, busca, retorno dos detalhes, redimensionamento, posicionamento dos controles, cores dos pixels, limites da galeria, tema claro, persistência de preferências, widgets fixados e fundo sólido do toast. As capturas usam dados e imagens locais de teste, por isso não representam uma conta ou biblioteca real. Os testes integrados com jogos e contas reais continuam separados da validação de layout.

Os widgets reproduzem a organização da referência da Game Bar usando controles WinUI. Seus botões apresentam apenas as funções já existentes do launcher; não há métricas fictícias de desempenho ou ações de captura sem implementação. Fixar mantém o widget sobre o jogo quando Ctrl+D fecha a barra; fechar o jogo ou desativar o Game View oculta todos os widgets.

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
