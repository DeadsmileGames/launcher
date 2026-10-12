# Estado da implementação — WinUI 2.1.0

O launcher nativo está no [PR #10](https://github.com/DeadsmileGames/launcher/pull/10), na branch `codex/winui-native-20261012`. O código Electron original foi preservado.

A versão abre no catálogo como visitante, apresenta login em diálogo quando necessário e mantém os serviços originais de jogos, downloads, saves, conquistas e itch.io. As páginas novas usam os contratos reais da API: newswire, vídeos, wishlist, conta e suporte.

| Verificação | Resultado |
|---|---|
| C#/Core | 28 testes, incluindo catálogo público, ownership, arte separada da Store e corrida de sessão. |
| API anexada | 51 testes passaram. |
| Website anexado | 12 testes e build passaram. |
| Integração pública | GETs de catálogo, newswire, vídeos, launcher/eventos; acessos privados rejeitados sem sessão. |
| Banco | Esquema conferido em transação somente leitura via HTTPS. |
| Windows | Build x64, EXE/MSIX, instalação, abertura e desinstalação testados no runner Windows Server 2025. |
| Interface | Capturas da própria árvore WinUI, navegação, visitante/login, galeria, temas, newswire, conta, tray e erro de boot. |
| Captura | Captura real de uma janela do teste e exportação PNG 1080×1920 passaram. |
| Produção | Fixtures de UI excluídas dos binários do instalador. |

O README registra a execução final e os links de download correspondentes. As capturas de UI usam dados locais de teste; não representam uma biblioteca ou conta real.

Ainda precisam de homologação: uma sessão real com 2FA/itch.io, download/execução de jogos reais, saves/conquistas integrados e comportamento da DeadBar em múltiplos monitores/GPU/fullscreen/HDR. O alvo é Windows 10 2004/build 19041 ou posterior e Windows 11, x64.

O site está desativado na Vercel (HTTP 402). Seus links externos precisam da reativação do deployment. Compartilhar no Instagram/X/WhatsApp prepara o arquivo e abre o destino ou a tela de compartilhamento do Windows; a anexação/publicação é confirmada pelo usuário no aplicativo escolhido.

Leia [REVISAO-SEGURANCA.md](REVISAO-SEGURANCA.md), [UI-WINUI.md](UI-WINUI.md) e [VALIDACAO-WINDOWS.md](VALIDACAO-WINDOWS.md) para a cobertura e os cenários restantes.
