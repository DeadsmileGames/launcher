# Deadsmile Games Launcher — WinUI 3

Implementação nativa de desktop em C# e XAML para Windows, com .NET 10 e Windows App SDK. O código do launcher fica neste diretório; o website e a API não fazem parte deste repositório de produção.

## Desenvolvimento e validação

Em um computador Windows x64 com o SDK .NET 10 instalado:

    dotnet run --project src/Deadsmile.Launcher/Deadsmile.Launcher.csproj

Testes do núcleo:

    dotnet run --project tests/Deadsmile.Core.Tests -c Release

Validação estrutural multiplataforma:

    python scripts/validate-source.py

Build dos artefatos Windows (exige Windows SDK e NSIS 3):

    .\scripts\build-windows.ps1 -Target All

Por padrão, o build gera o app autocontido, o MSIX com identidade oficial e o instalador EXE de backup. O MSIX sai sem assinatura local para envio ao Partner Center; a Microsoft Store assina o pacote depois da certificação. O EXE é intencionalmente não assinado e pode disparar aviso do SmartScreen. Para testar instalação de MSIX localmente, use somente a variante de desenvolvimento assinada pelo certificado de teste, gerada explicitamente com -DevelopmentCertificate.

## Identidade da Store

- Name: DeadsmileGames.DeadsmileGamesLauncher
- Publisher: CN=A4BCCCEE-CD9B-459A-A0BC-BFDD3D7DBDFE
- PublisherDisplayName: Deadsmile Games

O nome público da versão/release permanece 1.0.0. A versão interna do pacote MSIX usa quatro campos, com o último em zero, e o terceiro campo avança nas publicações de produção para permitir atualizações na Microsoft Store.

## Publicação

Depois que uma mudança chega à main e o workflow Build Deadsmile WinUI passa, o workflow de release gera o ZIP apenas de winui/, o EXE, o MSIX e hashes SHA-256. Ele atualiza a release v1.0.0 existente. O pacote MSIX deve ser submetido no Partner Center para certificação e publicação; este workflow não envia nem aprova automaticamente uma submissão na Store.

A publicação do EXE sem assinatura foi uma decisão intencional de distribuição como backup. A Store continua sendo a opção recomendada para usuários finais.
