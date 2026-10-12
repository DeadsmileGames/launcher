# Estado da implementação — 12/10/2026

A entrega contém uma implementação C#/WinUI 3 e o processo de geração de MSIX e Setup.exe. **Não é uma versão homologada.** A validação está em andamento no [PR #10](https://github.com/DeadsmileGames/launcher/pull/10), com build e testes no GitHub Actions.

| Verificação | Estado |
|---|---|
| XML/XAML e arquivos de projeto | Verificados estruturalmente no Linux. |
| JSON e recursos de idioma | Verificados estruturalmente. |
| Eventos XAML e arquivos referenciados | Verificados estruturalmente. |
| Fontes TTF | Convertidas a partir dos arquivos originais e inspecionadas com fontTools. |
| Testes originais Electron | 40 passaram na análise do ZIP, antes desta implementação. |
| Testes novos em C# | 20 passaram em Linux e Windows no GitHub Actions; nenhum ignorado. |
| Compilação Core/C# | Passou em Linux e Windows. |
| Compilação WinUI/XAML | Em validação no runner Windows; conflito de referência de timer corrigido após o primeiro build. |
| Geração e assinatura MSIX/EXE | Em validação no runner Windows. |
| Instalação e desinstalação | Smoke tests automáticos adicionados para EXE e MSIX no runner isolado. |
| Login/2FA e itch.io reais | Não executados. |
| Downloads e jogos reais | Não executados. |
| Saves/conquistas com backend | Não executados. |
| Layout e escalas de tela | Não verificados em execução. |
| Overlay/avisos transparentes | Implementação de prova de conceito; não verificada em Windows. |
| Workflow remoto | Publicado e executado no PR #10; artefatos de instalador disponibilizados apenas após validação bem-sucedida. |

## O que o código implementa

O Core mantém os contratos identificados no cliente original e separa serviços de API, armazenamento, instalações, downloads, sessões, saves, conquistas e eventos da biblioteca.

O Launcher usa controles WinUI/XAML, recursos visuais originais, idiomas JSON e integração Win32 para atalhos globais e janelas auxiliares. A navegação e o tema seguem o projeto fornecido; a correspondência visual precisa ser medida em Windows.

O instalador EXE prepara uma pasta nova e troca a instalação com backup. O MSIX é produzido com MakeAppx e assinatura opcional. A identidade padrão é de desenvolvimento.

## Limitações que exigem continuidade

1. A validação WinUI e dos instaladores está em andamento. Testes automáticos não substituem a homologação visual e integrada.
2. O overlay não tem garantia de funcionar em fullscreen exclusivo, sobre jogos elevados, com todos os drivers gráficos ou em todas as escalas.
3. Falhas de rede, conflitos de saves e pedidos de autorização dependem do comportamento do backend e de conta de teste.
4. A biblioteca antiga guardada apenas no localStorage do Electron e a pasta de jogos de versões muito antigas em Downloads não são importadas automaticamente. A recuperação usa registros e pastas do layout atual em Documentos.
5. Informações de catálogo, screenshots, classificação e ofertas podem variar conforme a resposta atual da API.
6. Assinatura pública, identidade da Store, hospedagem de atualizações e eventual aprovação da Store não foram fornecidas nem configuradas.
7. Apenas x64 foi configurado. O mínimo declarado é Windows 10 2004/build 19041; a homologação proposta é Windows 10 22H2 e Windows 11. Isso não amplia a política de suporte oficial do .NET em edições antigas do Windows.
8. No instalador EXE, erros ao renomear a instalação antiga ou aplicar a nova preservam a pasta antiga/backup; recuperação após interrupção e teste de rollback ainda precisam de execução.

