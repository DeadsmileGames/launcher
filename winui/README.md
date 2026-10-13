# Deadsmile Games Launcher — WinUI 3

Implementação nativa em C# e XAML para Windows, com .NET 10 e Windows App SDK. Este repositório não inclui o website nem a API.

## Desenvolvimento e validação

Em um computador Windows x64 com o SDK .NET 10 instalado:

    dotnet run --project src/Deadsmile.Launcher/Deadsmile.Launcher.csproj
    dotnet run --project tests/Deadsmile.Core.Tests -c Release
    python scripts/validate-source.py

O build de produção usa Windows SDK e NSIS 3:

    .\scripts\build-windows.ps1 -Target All

O build gera o app autocontido, o MSIX com a identidade oficial e um EXE de backup. O EXE abre um assistente de instalação feito em WinUI 3, com arte da Deadsmile Games, seleção de pasta, progresso, atalhos e desinstalador. O pequeno contêiner NSIS não mostra uma UI própria; a experiência visível é o assistente WinUI 3.

O EXE é intencionalmente não assinado e pode mostrar um aviso do SmartScreen ou ser bloqueado por políticas locais. A Microsoft Store é a forma recomendada de obter o launcher. O MSIX de produção sai sem assinatura local para ser enviado ao Partner Center; a Store assina o pacote após a certificação. Para testar o MSIX localmente, use apenas a variante de desenvolvimento assinada pelo certificado de teste, gerada explicitamente com `-DevelopmentCertificate`.

## Identidade da Microsoft Store

- Name: `DeadsmileGames.DeadsmileGamesLauncher`
- Publisher: `CN=A4BCCCEE-CD9B-459A-A0BC-BFDD3D7DBDFE`
- PublisherDisplayName: `Deadsmile Games`

A versão pública/GitHub permanece `1.0.0`. A versão interna do MSIX usa quatro campos e avança nas publicações de produção para permitir atualizações válidas na Microsoft Store.

## Publicação

Após a integração à `main`, o workflow **Build Deadsmile WinUI** valida a fonte, roda os testes C#, compila no Windows, testa instalação/desinstalação e executa a validação visual. Só um build bem-sucedido aciona a atualização automática da release `v1.0.0`, incluindo o ZIP do código nativo `winui/`, o EXE de backup, o MSIX destinado ao Partner Center e os SHA-256.

O workflow não envia nem aprova uma submissão da Store; essa etapa continua sendo feita no Partner Center. O número público permanece `1.0.0`, enquanto o número interno do pacote é incrementado.
