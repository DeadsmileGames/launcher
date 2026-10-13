# Deadsmile Games Launcher

Launcher de desktop **nativo em WinUI 3**, feito em C# e XAML para Windows. Este repositório mantém apenas a implementação nativa do launcher; o código Electron legado foi removido desta linha de produção.

- **Microsoft Store:** distribuição recomendada. O MSIX usa a identidade oficial do produto e deve ser enviado pelo Partner Center para certificação e assinatura da Store.
- **EXE de backup:** instalador autônomo, sem assinatura de produção. O Windows pode exibir um aviso do SmartScreen; a Store é a opção recomendada.
- **Release do GitHub:** versão pública identificada como v1.0.0, contendo fonte nativa WinUI, EXE de backup, MSIX destinado à Store e hashes SHA-256.
- **Builds:** GitHub Actions valida o código e os fluxos nativos antes de o workflow de produção atualizar a release.

## Projeto

O projeto .NET está em [winui/](winui/). Consulte [winui/README.md](winui/README.md) para instruções de build, validação, identidade MSIX e diferenças entre artefatos de desenvolvimento e produção.

Para baixar os artefatos publicados, abra [Releases](https://github.com/DeadsmileGames/launcher/releases/latest). O código-fonte incluído na release é apenas o projeto nativo WinUI, sem arquivos do website ou da API.

## Identidade Microsoft Store

O pacote de produção usa a identidade oficial configurada no Partner Center. A Store reassina o pacote MSIX depois de ele passar pela certificação. Não é necessário armazenar certificado privado da Store no repositório ou nos GitHub Actions.

A versão pública/GitHub permanece v1.0.0. O número interno do pacote MSIX avança a cada publicação de produção para respeitar o versionamento de pacotes da Microsoft Store.
