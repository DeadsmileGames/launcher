# Build e publicação do launcher nativo

Este repositório contém a implementação nativa WinUI 3 em C# e XAML, no diretório `winui/`.

## Workflows

- **Build Deadsmile WinUI MSIX**: valida a estrutura do código, executa os testes C#, compila o launcher, gera um único MSIX de desenvolvimento e testa instalação, abertura da janela principal e desinstalação. O certificado criado pelo workflow é temporário e não é publicado.
- **Publish Deadsmile WinUI MSIX Release**: só é acionado quando o workflow de build termina com sucesso na branch `main`. Gera e publica somente o MSIX com identidade oficial do Partner Center; não produz nem distribui instalador EXE, MSI, NSIS, ZIP de fonte ou outros pacotes.

## Identidade de produção

- Package/Identity/Name: `DeadsmileGames.DeadsmileGamesLauncher`
- Package/Identity/Publisher: `CN=A4BCCCEE-CD9B-459A-A0BC-BFDD3D7DBDFE`
- PublisherDisplayName: `Deadsmile Games`

O MSIX de produção fica sem assinatura local e é destinado à submissão no Partner Center; a Store faz a assinatura durante a publicação. Não são necessários PFX nem secrets de certificado para esse fluxo. O pacote de desenvolvimento é assinado apenas para testar instalação em CI.
