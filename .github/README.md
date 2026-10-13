# Build e publicação do launcher nativo

Este repositório contém apenas a implementação nativa WinUI 3 em C# e XAML, no diretório winui/.

## Workflows

- **Build Deadsmile WinUI**: executa validação estrutural, testes C#, build Windows, testes de instalação e validação da interface. O certificado que ele gera é exclusivo para teste, não é publicado como certificado de produção.
- **Publish Deadsmile WinUI Release**: só é acionado quando o workflow de build termina com sucesso na branch main. Gera o pacote MSIX com a identidade oficial do Partner Center, o EXE de backup sem assinatura de produção, o ZIP do projeto winui/ e os hashes SHA-256. A release pública v1.0.0 é atualizada automaticamente após as verificações.

## Identidade de produção

- Package/Identity/Name: DeadsmileGames.DeadsmileGamesLauncher
- Package/Identity/Publisher: CN=A4BCCCEE-CD9B-459A-A0BC-BFDD3D7DBDFE
- PublisherDisplayName: Deadsmile Games

O MSIX de produção fica sem assinatura local e é destinado à submissão no Partner Center; a Store faz a assinatura durante a publicação. Não são necessários PFX nem secrets de certificado para esse fluxo.

O EXE é intencionalmente não assinado e deve ser apresentado como instalador de backup. O Windows pode mostrar um aviso do SmartScreen ou bloqueá-lo por política local; a Microsoft Store é a opção recomendada.
