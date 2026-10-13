# Deadsmile Games Launcher

Launcher de desktop **nativo em WinUI 3**, feito em C# e XAML para Windows. Este repositório mantém apenas a implementação nativa do launcher; o código Electron legado foi removido desta linha de produção.

- **Microsoft Store:** distribuição recomendada. O MSIX usa a identidade oficial do produto e deve ser enviado pelo Partner Center para certificação e assinatura da Store.
- **EXE de backup:** instalador autônomo, sem assinatura de produção. O Windows pode exibir um aviso do SmartScreen; a Store é a opção recomendada.
- **Release do GitHub:** a atualização da release WinUI v1.0.0 depende da integração da PR #10 e de uma execução bem-sucedida do workflow de produção. Os artefatos criados na branch são temporários, de desenvolvimento e não substituem a release pública.
- **Builds:** GitHub Actions valida o código e os fluxos nativos antes de o workflow de produção atualizar a release.

## Projeto

O projeto .NET está em [winui/](winui/). Consulte [winui/README.md](winui/README.md) para instruções de build, validação, identidade MSIX e diferenças entre artefatos de desenvolvimento e produção.

A página [Releases](https://github.com/DeadsmileGames/launcher/releases/latest) lista as versões públicas atuais. Os artefatos de validação da branch ficam nos GitHub Actions por tempo limitado e não são builds de produção. O código-fonte planejado para a release WinUI contém apenas `winui/`, sem website ou API.

## Identidade Microsoft Store

O pacote de produção usa a identidade oficial configurada no Partner Center. A Store reassina o pacote MSIX depois de ele passar pela certificação. Não é necessário armazenar certificado privado da Store no repositório ou nos GitHub Actions.

A versão pública WinUI pretendida é `1.0.0`; ela ainda não foi publicada como release validada a partir desta PR. Depois da integração, o workflow de produção incrementa o número interno do MSIX para cumprir o versionamento da Microsoft Store.
