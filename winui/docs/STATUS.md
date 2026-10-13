# Status da implementação — launcher nativo WinUI 3

A implementação nativa está na [PR #10](https://github.com/DeadsmileGames/launcher/pull/10), branch `codex/winui-native-20261012`. A PR ainda não foi integrada à `main`; o Electron legado não faz parte desta branch de produção.

## Formato de distribuição atual

O único pacote de distribuição é MSIX. O projeto separado `Deadsmile.Setup`, o contêiner NSIS/EXE e o teste de instalação desse assistente foram removidos. O workflow de validação constrói um MSIX assinado com certificado efêmero de desenvolvimento, instala o pacote no runner Windows, testa a abertura da janela principal, desinstala o pacote e confere a preservação dos dados do usuário. O Actions publica apenas o arquivo `.msix`; o certificado de teste não é publicado.

A release de produção gera um MSIX com a identidade oficial do Partner Center, sem assinatura local, destinado à submissão à Microsoft Store. A Store assina o pacote depois da certificação. O MSIX pré-submissão não é diretamente instalável até ter uma assinatura confiável.

## Histórico e estado da validação

A execução [Actions #107](https://github.com/DeadsmileGames/launcher/actions/runs/38436519747), no commit anterior à migração para MSIX-only, passou na compilação e empacotamento, mas falhou ao tentar abrir a janela do assistente EXE. O fluxo de assistente que causou esse erro foi removido; o resultado #107 não valida nem aprova o novo fluxo MSIX.

A fonte de verdade para o estado atual é o [workflow Build Deadsmile WinUI MSIX](https://github.com/DeadsmileGames/launcher/actions/workflows/build-winui.yml) executado no commit desta revisão. Não marque a mudança como resolvida apenas porque a validação estrutural ou a compilação passou: o smoke test de instalação, inicialização e desinstalação do MSIX também precisa passar.

## Homologação manual pendente

O CI em Windows Server 2025 não substitui testes interativos em desktops Windows 10/11. Ainda devem ser validados com uma conta e jogos reais: login/2FA e itch.io; download, instalação e execução de jogos autorizados; sincronização real de saves/conquistas; escalas de DPI distintas, múltiplos monitores, GPU, fullscreen exclusivo e HDR na DeadBar; leitor de tela e alto contraste em máquina física.

A release pública WinUI `v1.0.0` continua dependente do merge e de uma execução bem-sucedida do workflow em `main`. A submissão/certificação no Partner Center é uma etapa separada e não é executada pelo CI.

Consulte [REVISAO-SEGURANCA.md](REVISAO-SEGURANCA.md), [UI-WINUI.md](UI-WINUI.md) e [VALIDACAO-WINDOWS.md](VALIDACAO-WINDOWS.md) para escopo de segurança, interface e cenários manuais restantes.
