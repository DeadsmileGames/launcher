# Deadsmile Games Launcher

Launcher de desktop **nativo em WinUI 3**, feito em C# e XAML para Windows. Esta linha de produção distribui **somente o pacote MSIX**; não cria instalador EXE, MSI ou outro contêiner de instalação.

- **Microsoft Store:** distribuição recomendada. O MSIX de produção usa a identidade oficial do produto e é enviado pelo Partner Center para certificação e assinatura da Store.
- **GitHub Actions:** valida o código, instala o MSIX de desenvolvimento em um runner Windows, confirma que o app abre sua janela principal e remove o pacote preservando dados do usuário. O artefato de validação publicado no Actions é apenas o arquivo `.msix`.
- **Release do GitHub:** a release WinUI v1.0.0 contém somente o MSIX de produção destinado ao Partner Center. Antes de a Store certificar e assinar o pacote, esse arquivo não deve ser tratado como instalador pronto para o usuário final.

## Projeto

O projeto .NET está em [winui/](winui/). Consulte [winui/README.md](winui/README.md) para instruções de build, validação, identidade MSIX e diferenças entre o pacote de desenvolvimento e o de produção.

A página [Releases](https://github.com/DeadsmileGames/launcher/releases/latest) lista as versões públicas. Os artefatos temporários da branch ficam nos GitHub Actions por tempo limitado e não substituem uma release pública assinada pela Store. O código-fonte planejado para a release contém apenas `winui/`, sem website ou API.

## Identidade Microsoft Store

O pacote de produção usa a identidade oficial configurada no Partner Center. A Microsoft Store assina o MSIX depois que ele passa pela certificação. Não é necessário armazenar certificado privado da Store no repositório ou nos GitHub Actions.

A versão pública WinUI pretendida é `1.0.0`; o workflow incrementa a versão interna do pacote MSIX para cumprir o versionamento da Microsoft Store.
