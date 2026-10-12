# Deadsmile Games Launcher — WinUI 3

Implementação nativa em C# e XAML, baseada no projeto Electron anexado. Usa .NET 10, Windows App SDK 2.5.1 e Windows SDK BuildTools 10.0.28000.2705.

**WinUI 2.1.0:** compilação, instaladores e validação nativa no GitHub Actions. Interface com controles C#/XAML padrão WinUI, sidebar escura #202020 e corpo #272727. O runner de validação é Windows Server 2025; homologação com conta/jogos reais em desktops Windows 10/11 ainda é necessária.

## Conteúdo

- Entrada como visitante; boot de três segundos, frases, códigos locais de erro e nova tentativa. Login/2FA em diálogo.
- Explorar, Biblioteca, Wishlist, Newswire, Vídeos, Conta, Suporte, detalhes, galeria, Downloads e Configurações.
- Busca com sugestões de jogos/configurações no popup nativo, capas da Store, trailer no banner e foto de perfil.
- DeadBar com captura PNG e preparação/compartilhamento de imagens para Windows, Instagram, X e WhatsApp.
- Fechar para a área de notificação, aviso inicial único e notificações de atualizações/lançamentos.
- Serviços: API original, cookies protegidos com DPAPI, CSRF, biblioteca ao vivo, itch.io, downloads, instalação, processos, saves PICO-8 e conquistas.
- Game View em widgets flutuantes WinUI, com arraste, fixação e fechamento; avisos de conquistas com superfície opaca no Windows 10 e Mica/fallback no Windows 11.
- Banner de produto limitado a 360 DIPs, galeria que preserva a imagem inteira e animações padrão WinUI.
- Personalização: tema escuro/claro/sistema, navegação compacta/expandida, animações, rotação de banners, materiais do Windows e notificações.
- Ícone multiresolução e variantes de barra de tarefas MSIX sem a placa/margem acrescentada pelo sistema.
- Controles e tipografia padrão WinUI. Os recursos antigos de login e as fontes personalizadas foram removidos da versão nativa.
- Projetos Core e Launcher, solução Visual Studio, testes de invariantes e documentação.
- Empacotamento MSIX e instalador EXE/NSIS, com opção de assinatura de desenvolvimento.
- Workflow de build Windows no GitHub Actions, com instaladores disponíveis como artefatos após uma execução bem-sucedida.

## Baixar sem instalar Visual Studio

Abra [Actions do projeto](https://github.com/DeadsmileGames/launcher/actions), selecione uma execução bem-sucedida de **Build Deadsmile WinUI** e baixe um dos artefatos no fim da página. É necessário estar conectado ao GitHub para baixar artefatos.

Primeiro build validado, versão 2.0.0: [execução e testes](https://github.com/DeadsmileGames/launcher/actions/runs/38286833115), [EXE de teste](https://github.com/DeadsmileGames/launcher/actions/runs/38286833115/artifacts/11763313167) e [MSIX de desenvolvimento](https://github.com/DeadsmileGames/launcher/actions/runs/38286833115/artifacts/11763581834). Estes downloads expiram em 11/11/2026; consulte Actions para builds posteriores.

- **Deadsmile-WinUI-Setup-x64**: extraia o ZIP e execute o arquivo Setup.exe. O instalador inclui o .NET e o runtime WinUI; não exige Visual Studio, SDK ou NSIS no computador do usuário.
- **Deadsmile-WinUI-MSIX-Development-x64**: contém o MSIX, seu hash e o certificado público de desenvolvimento. Siga a seção de certificados abaixo antes de instalar este pacote de teste.

Os artefatos ficam disponíveis por 30 dias. O workflow executa testes Core, gera os pacotes e verifica instalação, abertura da janela e desinstalação no runner Windows. Após integrar o workflow à branch principal, também é possível iniciar um novo build pelo botão **Run workflow**. Não é necessário compilar localmente.

## Gerar o app e os instaladores no Windows

Requisitos recomendados: Windows x64, Visual Studio 2026 com a carga WinUI, SDK .NET 10, Windows SDK e NSIS 3. O projeto restaura os pacotes NuGet oficiais declarados; não usa Node ou Electron.

Abra PowerShell na pasta extraída e execute:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1 -Target All -DevelopmentCertificate

O processo executa os testes C#, compila o app e gera, se todas as etapas passarem:

- artifacts/app-x64/Deadsmile.Launcher.exe, acompanhado dos arquivos do aplicativo.
- artifacts/Deadsmile-Games-Launcher-WinUI-2.1.0-x64.msix
- artifacts/Deadsmile-Games-Launcher-WinUI-Setup-2.1.0-x64.exe
- artifacts/Deadsmile-Development.cer e hashes SHA-256.

O certificado de desenvolvimento é criado no armazenamento pessoal do usuário que executa o build. Sua chave privada não é exportada. Esse certificado serve para testes; não equivale a assinatura pública de produção.

Para testar o MSIX, importe conscientemente o certificado .cer público em **Computador Local → Pessoas Confiáveis / Trusted People** no computador de teste, usando o assistente de certificados do Windows, e então instale o MSIX. A importação exige as permissões do dispositivo. A geração não instala automaticamente o certificado, o MSIX ou o launcher.

Alternativas de build:

    .\scripts\build-windows.ps1 -Target App
    .\scripts\build-windows.ps1 -Target Installer
    .\scripts\build-windows.ps1 -Target Msix -DevelopmentCertificate

Um MSIX gerado sem assinatura é destinado a uma etapa posterior de assinatura/ingestão; não será instalável por duplo clique.

Para produção ou Store, informe a identidade e o publicador reais. Não use a identidade de desenvolvimento em uma publicação final:

    .\scripts\build-windows.ps1 -Target All -IdentityName "IDENTIDADE_REAL" -Publisher "CN=PUBLICADOR_REAL" -PublisherDisplayName "Deadsmile Games" -CertificateThumbprint "THUMBPRINT_REAL"

O certificado deve existir em Cert:\CurrentUser\My e seu Subject deve corresponder ao Publisher. Para uma submissão à Store sem certificado local, gere o MSIX sem assinatura com a identidade correta; a aprovação/publicação na Store é uma etapa separada.

## Abrir e testar

Abra Deadsmile.sln, selecione a configuração x64 e execute Deadsmile.Launcher. Também é possível iniciar o EXE na pasta app-x64 depois de publicar. O EXE depende dos demais arquivos dessa pasta.

Os testes Core não dependem da UI e podem rodar onde houver SDK .NET 10:

    dotnet run --project tests/Deadsmile.Core.Tests -c Release

A verificação estrutural portátil usa apenas Python:

    python scripts/validate-source.py

Ela verifica XML, JSON, referências, recursos, eventos XAML e delimitadores; **não compila C# nem substitui testes funcionais**.

## Dados e integrações

A API continua sendo https://api-ust8.onrender.com/api. É necessário acesso ao serviço e login com uma conta autorizada para testes integrados.

A pasta de dados segue o projeto atual:

    Documentos\Deadsmile Games Launcher\Games
    Documentos\Deadsmile Games Launcher\settings

O launcher identifica instalações válidas por .deadsmile-install.json, recupera backups reconhecidos e migra pastas por slug para IDs quando aplicável. Não é necessário baixar novamente uma instalação válida que seja reconhecida.

É esperado novo login na primeira execução: o banco de cookies do Chromium não é convertido para o cliente HTTP nativo. O idioma começa em português quando ainda não há configuração nativa. O atalho Game View já salvo é conservado para combinações de Ctrl/Alt/Shift/Win com letras, números e teclas F1–F24.

Feche o launcher Electron e os jogos antes de instalar/testar esta versão. Use uma modalidade de instalação por vez durante a homologação para evitar disputa pelo protocolo deadsmile://.

A desinstalação do launcher preserva jogos, configurações e saves fora da pasta do aplicativo. Os scripts de instalação nunca publicam releases automaticamente.

## Validação e pendências

Leia docs/STATUS.md, docs/REVISAO-SEGURANCA.md e docs/VALIDACAO-WINDOWS.md antes de considerar esta versão pronta para distribuição.

A validação nativa usa capturas da árvore XAML e uma conta de teste isolada. O overlay conserva a integração de DWM/Win32: passagem de cliques, foco, fullscreen e múltiplos monitores continuam exigindo testes com jogos reais em Windows 10/11. Consulte docs/UI-WINUI.md para os padrões de design e a documentação usada.

O site externo está retornando HTTP 402 / DEPLOYMENT_DISABLED. Cadastro, recuperação e gerenciamento no website dependem de sua reativação. O catálogo público e os serviços da API foram verificados separadamente.

O compartilhamento social salva/copia a imagem e abre o destino; a postagem exige confirmação/anexação no aplicativo da rede. A tela de compartilhamento do Windows depende dos apps instalados.

O caminho de atualização EXE aceita apenas o artefato WinUI correspondente, exige digest SHA-256 e valida assinatura Authenticode e a chave pública do publicador atual. Um app sem assinatura confiável não consegue aplicar atualização automática por esse caminho. A rotação de chave precisa ser planejada antes da distribuição. A modalidade MSIX remete a atualização para App Installer/Store; o feed .appinstaller e a publicação não foram configurados.

## Documentação

- [WinUI 3](https://learn.microsoft.com/en-us/windows/apps/winui/winui3/)
- [Windows App SDK estável](https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/release-channels)
- [Pacote Windows App SDK 2.5.1](https://www.nuget.org/packages/Microsoft.WindowsAppSDK/2.5.1)
- [BuildTools](https://www.nuget.org/packages/Microsoft.Windows.SDK.BuildTools/10.0.28000.2705)
- [Build e ferramentas WinUI](https://learn.microsoft.com/en-us/windows/apps/get-started/start-here)
- [Distribuição autocontida](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/self-contained-deploy/deploy-self-contained-apps)
- [Instância única](https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/applifecycle/applifecycle-single-instance)
- [Customização da barra de título](https://learn.microsoft.com/en-us/windows/apps/develop/title-bar)
- [SystemBackdrop](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.systembackdrop)
- [CoWaitForMultipleHandles](https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-cowaitformultiplehandles)
- [WinVerifyTrust](https://learn.microsoft.com/en-us/windows/win32/api/wintrust/nf-wintrust-winverifytrust)
- [Assinatura MSIX](https://learn.microsoft.com/en-us/windows/msix/package/signing-package-overview)

Os recursos de marca vieram do ZIP fornecido. A tipografia é a padrão WinUI. O arquivo LICENSE original foi preservado; ele não é uma declaração adicional de direitos sobre recursos.

