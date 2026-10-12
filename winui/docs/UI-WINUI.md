# Interface nativa WinUI 3 — versão 2.0.1

A UI segue as três imagens de referência fornecidas: WinUI 3 Gallery, página de um jogo da Microsoft Store e página inicial da Store. O launcher conserva sua identidade e seus contratos de API; conteúdo de outros produtos da Store não é adicionado ao catálogo.

| Elemento | Implementação |
|---|---|
| Sidebar | NavigationView nativo, LeftCompact; #202020. |
| Corpo | #272727; cards com brushes de tema WinUI. |
| Barra superior | TitleBar nativo, AutoSuggestBox central e PersonPicture com MenuFlyout. |
| Tipografia | Estilos Body, Caption, Subtitle e Title do WinUI; fonte padrão do sistema. |
| Login | TextBox, PasswordBox, AccentButton, HyperlinkButton, ComboBox e InfoBar padrão. |
| Catálogo/biblioteca | GridView com teclado, foco, seleção e rolagem nativos; imagens vindas do catálogo existente. |
| Produto | Cabeçalho, ação principal, MenuFlyout para atualizar/desinstalar, screenshots, descrição e metadados. |
| Downloads | ProgressBar, botões padrão e InfoBadge na navegação. |
| Configurações | Linhas/cards com ComboBox, ToggleSwitch e botões padrão. |
| Game View/conquistas | Janelas XAML e tipografia/brushes nativos, mantendo a integração Win32 necessária ao overlay. |

Os templates de Button, NavigationView, TextBox, ComboBox e ContentDialog continuam sendo os do WinUI. Acento, estados de foco/hover/pressionado e acessibilidade vêm da biblioteca. O tema HighContrast usa as cores do sistema. A largura mínima é 640 e os layouts refluem conforme o espaço disponível.

A ação adicional “Verificar instalação” foi removida da UI. “Verificar compra” foi mantida segundo o fluxo original. Os serviços de autenticação, downloads, instalações, processos, saves e conquistas permanecem no Core. Os testes adicionais conferem os nomes alternativos de campos da API usados por capas e conquistas.

## Validação

O pipeline compila primeiro o aplicativo de distribuição e produz os instaladores. Uma compilação separada com `ValidateNativeUi=true` ativa fixtures e captura a própria árvore XAML por RenderTargetBitmap. Esse código de validação é excluído dos binários de distribuição pelo pré-processador; o pipeline verifica essa exclusão.

O teste de UI verifica login, navegação, busca, retorno dos detalhes, redimensionamento, posicionamento dos controles e as cores dos pixels renderizados. As capturas usam dados e imagens locais de teste, por isso não representam uma conta ou biblioteca real. Os testes integrados com jogos e contas reais continuam separados da validação de layout.

## Documentação consultada

- [NavigationView](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/navigationview)
- [TitleBar](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/title-bar)
- [Tipografia](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography)
- [Cor](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/color)
- [Layouts responsivos](https://learn.microsoft.com/en-us/windows/apps/design/layout/responsive-design)
- [Acessibilidade](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-overview)

As decisões usam navegação consistente, hierarquia tipográfica, espaçamento regular e adaptação à largura da janela, conforme a documentação da Microsoft.
