# Deadsmile Games Launcher — WinUI 3

Implementação nativa em C# e XAML para Windows, com .NET 10 e Windows App SDK. O único formato de distribuição desta linha é MSIX: o pipeline não cria instalador EXE, MSI, NSIS ou outro pacote de instalação.

## Desenvolvimento e validação

Em um computador Windows x64 com o SDK .NET 10 instalado:

    dotnet run --project src/Deadsmile.Launcher/Deadsmile.Launcher.csproj
    dotnet run --project tests/Deadsmile.Core.Tests -c Release
    python scripts/validate-source.py

O build de empacotamento é feito com o Windows SDK:

    .\scripts\build-windows.ps1

O script publica o launcher autocontido, prepara o manifesto MSIX e usa `MakeAppx.exe` para gerar um único arquivo de distribuição `.msix`. Os EXEs e DLLs produzidos pelo .NET são componentes internos necessários ao pacote, não instaladores independentes nem artefatos publicados. O teste no Windows instala esse MSIX, confirma a abertura da janela WinUI e desinstala o pacote, verificando que os dados do usuário foram preservados.

## Pacote de desenvolvimento

O workflow do GitHub Actions assina temporariamente o MSIX de teste com um certificado de desenvolvimento, instala esse pacote no runner, testa a inicialização e publica somente o arquivo `.msix` como artefato. O certificado fica restrito ao runner de CI e não é publicado junto ao pacote.

Esse MSIX de desenvolvimento usa identidade diferente da versão da Store e serve para validar build e instalação; não é o pacote de produção. Não confie em certificados de teste desconhecidos nem use esse artefato como distribuição pública.

## Identidade da Microsoft Store

- Name: `DeadsmileGames.DeadsmileGamesLauncher`
- Publisher: `CN=A4BCCCEE-CD9B-459A-A0BC-BFDD3D7DBDFE`
- PublisherDisplayName: `Deadsmile Games`

Por padrão, o build usa a identidade oficial e produz o MSIX sem assinatura local para envio ao Partner Center. A Microsoft Store assina o pacote depois da certificação. O arquivo pré-submissão não é diretamente instalável em um computador de usuário até ser assinado por uma cadeia confiável. Para um pacote assinado de desenvolvimento, passe explicitamente `-DevelopmentCertificate` e uma identidade de teste cujo Publisher coincida com o Subject do certificado.

A versão pública e a identidade do pacote MSIX para o primeiro lançamento são `1.0.0` e `1.0.0.0`, respectivamente.

## Publicação

Após integração à `main`, a publicação `v1.0.0-winui` só deve ocorrer uma vez após todas as verificações de código e do pacote. A tag de produção é imutável e a release contém somente o MSIX de produção para o Partner Center.

O workflow não envia nem aprova uma submissão da Store; essa etapa continua sendo feita no Partner Center.

## Referências oficiais

- [Opções de empacotamento e distribuição de aplicativos Windows](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/)
- [Gerar manualmente os componentes de um pacote MSIX](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion)
- [Implantação do Windows App SDK para aplicativos autocontidos](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/self-contained-deploy/deploy-self-contained-apps)
