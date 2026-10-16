# Status da implementação — launcher nativo WinUI 3

Atualizado em 16/10/2026.

A branch `main` contém a implementação nativa em C# e XAML para Windows, baseada em .NET 10 e Windows App SDK. O formato de distribuição é MSIX; o launcher legado Electron e instaladores EXE/MSI/NSIS não fazem parte desta linha.

## Versão e distribuição

A versão do código é definida em `winui/Directory.Build.props` (atualmente `1.0.3` nesta revisão). O pacote de produção mantém a identidade oficial da Microsoft Store:

- Name: `DeadsmileGames.DeadsmileGamesLauncher`
- Publisher: `CN=A4BCCCEE-CD9B-459A-A0BC-BFDD3D7DBDFE`
- PublisherDisplayName: `Deadsmile Games`

O pacote para envio ao Partner Center é um único MSIX sem assinatura local; a Store assina o pacote destinado aos usuários após certificação. O workflow não envia nem aprova uma submissão automaticamente.

## Validação automatizada

O workflow [Build Deadsmile WinUI MSIX](https://github.com/DeadsmileGames/launcher/actions/workflows/build-winui.yml) valida o código, audita dependências, executa os testes Core, compila no Windows e testa a instalação, abertura e remoção do MSIX de desenvolvimento. O workflow [Publish Deadsmile WinUI MSIX Release](https://github.com/DeadsmileGames/launcher/actions/workflows/release-winui.yml) publica somente depois de uma execução de build bem-sucedida em `main`.

Confira sempre a execução referente ao commit específico desta revisão. Um resultado verde de um commit anterior não aprova automaticamente alterações posteriores.

## Compatibilidade de integração

- O endereço público do site é `https://deadsmilegames.onrender.com`.
- A API permanece em `https://api-ust8.onrender.com/api`; o host não foi alterado por esta revisão.
- O parser de jogos aceita os campos de capa `coverImage`/`cover_image` e trailer `trailerUrl`/`trailer_url` da API.
- Login, biblioteca, sincronização, conquistas, saves e wishlist permanecem usando rotas autorizadas pela API, com cookies, CSRF e allowlist local de endpoints.

## Homologação manual ainda necessária

O CI em Windows Server 2025 não substitui teste interativo em máquinas Windows 10/11. Antes de considerar homologação integral, validar com conta e jogos reais: login/2FA e integração itch.io, download/instalação/execução autorizados, sincronização de saves e conquistas, DPIs diferentes, múltiplos monitores, GPU, leitor de tela e alto contraste.

Consulte [REVISAO-SEGURANCA.md](REVISAO-SEGURANCA.md), [UI-WINUI.md](UI-WINUI.md) e [VALIDACAO-WINDOWS.md](VALIDACAO-WINDOWS.md) para detalhes dos controles e cenários manuais.
