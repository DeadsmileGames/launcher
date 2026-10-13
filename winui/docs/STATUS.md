# Status da implementação — launcher nativo WinUI 3

A implementação nativa está na [PR #10](https://github.com/DeadsmileGames/launcher/pull/10), branch `codex/winui-native-20261012`. A PR ainda não foi integrada à `main`; o Electron legado não faz parte desta branch de produção.

## Última validação automática aprovada

- **Commit validado:** [`a9270fd`](https://github.com/DeadsmileGames/launcher/commit/a9270fdc1ec5412ee09ab10825973b6e7eada8f5).
- **GitHub Actions — run #74:** [resultado completo](https://github.com/DeadsmileGames/launcher/actions/runs/38397849520).
- **Resultado:** todos os jobs concluídos com sucesso em 13/10/2026 no runner Windows Server 2025.

| Verificação | Resultado confirmado |
|---|---|
| Validação estrutural | Passou: XAML/XML/JSON, handlers declarados, recursos, manifestos e delimitadores C#. |
| C#/Core | 30/30 testes passaram, sem falhas nem testes ignorados. |
| Build Windows x64 | Publicação nativa, MSIX de desenvolvimento e EXE de instalação passaram. |
| Instaladores | Testes automatizados de instalação, inicialização e desinstalação passaram. |
| UI WinUI | Navegação, busca, detalhes/galeria, preferências, temas, localização PT/ES, notificações e Newswire passaram. |
| Layout Newswire | Passou a verificação 3 colunas → 2 colunas ao reduzir a janela → 3 ao restaurar. |
| Capturas e pacotes | Capturas nativas, Setup EXE e MSIX de desenvolvimento foram enviados ao Actions. |

## Artefatos temporários do run #74

- [Setup EXE x64](https://github.com/DeadsmileGames/launcher/actions/runs/38397849520/artifacts/11813302329)
- [MSIX de desenvolvimento x64 + certificado de teste](https://github.com/DeadsmileGames/launcher/actions/runs/38397849520/artifacts/11813227344)
- [Capturas da validação nativa](https://github.com/DeadsmileGames/launcher/actions/runs/38397849520/artifacts/11813102456)

Os artefatos de CI são temporários (retenção configurada de 30 dias). O MSIX usa um certificado de desenvolvimento e só serve para máquinas que confiam nesse certificado; o EXE não possui assinatura de produção. Não distribuir esses artefatos como release pública.

## Homologação ainda pendente

O CI não substitui a homologação interativa em PCs Windows 10/11. Ainda precisam de teste controlado com uma conta e jogos reais: login/2FA e itch.io; download, instalação e execução de jogos autorizados; sincronização real de saves/conquistas; escalas de DPI distintas, múltiplos monitores, GPU, fullscreen exclusivo e HDR na DeadBar; leitor de tela e alto contraste em máquina física.

A release pública WinUI `v1.0.0` continua pendente de merge e de uma execução bem-sucedida do workflow em `main`. O MSIX de produção deve seguir o fluxo de identidade/certificação no Partner Center; os testes locais não fazem uma submissão à Microsoft Store.

Consulte [REVISAO-SEGURANCA.md](REVISAO-SEGURANCA.md), [UI-WINUI.md](UI-WINUI.md) e [VALIDACAO-WINDOWS.md](VALIDACAO-WINDOWS.md) para escopo de segurança, interface e cenários manuais restantes.
