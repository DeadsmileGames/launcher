# Revisão de segurança e integração — 13/10/2026

Escopo: launcher WinUI, contratos dos ZIPs API(5)/Website(6), endpoints públicos em produção e esquema do banco em uma transação somente leitura. Os ZIPs mais recentes têm o mesmo conteúdo dos anexos API(4)/Website(5). O launcher acessa dados pela API; nenhuma credencial PostgreSQL ou conexão direta ao banco foi incluída no aplicativo.

## Evidências

- 51 testes do backend anexado passaram, sem testes ignorados. Incluem CSRF, autorização, isolamento de contas, 2FA, sessão, saves, criptografia, ownership pago, metadados da Store e HTML sanitizado.
- 12 testes do website passaram; o build Vite também passou.
- Consultas GET em produção: catálogo, newswire, vídeos, launcher e eventos públicos retornaram dados. Conta, wishlist e biblioteca privadas retornaram 401 sem sessão. Limite de catálogo inválido e slug inválido retornaram 400.
- Esquema PostgreSQL conferido por HTTPS com o driver oficial Neon, em transação `readOnly`/`RepeatableRead`: 252 colunas. Somente nomes/tipos de colunas e contagens públicas de jogos/notícias/vídeos foram consultados. Nenhum dado de usuário, senha, sessão ou save foi lido; nenhum esquema ou registro foi alterado.
- O inventário de código/configuração cobre os arquivos C#, XAML, projetos, scripts, manifesto MSIX, catálogo de idiomas e workflows. A verificação estrutural é complementada pelos testes C#/XAML e pelo smoke test de instalação/inicialização/desinstalação do MSIX no Windows.

## Correções e controles do launcher

| Área | Controle |
|---|---|
| Sessão | Cookies protegidos com DPAPI, persistência por usuário do Windows; respostas 401 antigas não invalidam um login mais recente. |
| Requisições | Origem de API fixa, allowlist de rotas, HTTPS, limite de tamanho/timeout e respostas limitadas. Os logs normalizam IDs/rotas privadas, removem queries e não armazenam corpos de requisição/resposta. |
| Conta | Biblioteca, wishlist, download e execução continuam sujeitos a autenticação/autorização do servidor. O modo visitante não concede ownership. |
| HTML de notícias | Convertido para texto WinUI; nunca executado como HTML, JavaScript ou XAML. |
| Avatar | URL HTTPS ou data URI de imagem limitada; dimensões limitadas para o conteúdo embutido. |
| Arquivos | IDs/slug validados, paths protegidos, links/reparse points bloqueados e ZIPs com traversal/nomes reservados rejeitados. |
| Downloads | Autorização de instalação no backend, tamanho/hash verificados, redirects controlados e destinos privados bloqueados após validação de DNS/IP. |
| Atualização | O launcher não baixa nem executa instaladores próprios. Atualizações são instaladas pelo mesmo canal de distribuição do MSIX; para a Store, o gerenciamento de versão é da própria Microsoft Store. |
| Mídia | URLs de imagem/vídeo precisam passar pela validação HTTPS; URLs com credenciais embutidas, portas não padrão, hosts locais ou IPs privados explícitos são rejeitadas. |
| Logs | `launcher.log` central, limitado a 8 MiB, com corte controlado e redaction para senhas/tokens/tickets/cookies/credenciais. IDs de sessão e GUIDs não são gravados como parte de rota, nem valores de query. |
| Banco | Credencial fora do repositório, binários, logs do app e artefatos. |

## Limitações observadas

A resposta **HTTP 402 / DEPLOYMENT_DISABLED** anotada nesta auditoria refere-se somente ao domínio legado `https://deadsmilegames.vercel.app`, observado na verificação histórica de 13/10/2026; não é o status do site atual. O endereço canônico configurado nesta revisão é `https://deadsmilegames.onrender.com`. A migração dos links no launcher não equivale, por si só, a uma verificação de disponibilidade ao vivo do novo domínio.

Os testes de segurança do backend rodaram contra o ambiente isolado do próprio projeto. Em produção foram usados somente GETs de leitura/validação. Fluxos privados com uma conta real, compra no itch.io e jogos reais não foram executados com as credenciais de um usuário. A DeadBar e seu subsistema de captura/compartilhamento de jogo foram removidos; os avisos nativos de conquista foram preservados. A verificação automática no Windows Server 2025 não substitui testes manuais em desktops Windows 10/11, diferentes GPUs/DPI e HDR.

O certificado de desenvolvimento é criado temporariamente para o smoke test do MSIX no runner e não é publicado. O pacote de produção usa a identidade oficial e a versão de projeto de `winui/Directory.Build.props` (atualmente `1.0.3` nesta revisão); o workflow publica um único MSIX para submissão ao Partner Center, intencionalmente sem assinatura local. No fluxo da Microsoft Store, a Microsoft assina o MSIX após a certificação; credenciais de login do Partner Center não são um certificado de assinatura de código. O workflow do GitHub não submete o pacote automaticamente à Store. Para distribuição direta fora da Store seria necessário um certificado de assinatura confiável separado.

## Achados da revisão integral (corrigidos no código; confira o CI do commit atual)

- **Integridade de saves:** qualquer `sha256` não vazio precisa ter 64 dígitos hexadecimais; um valor malformado não é tratado como se não houvesse hash.
- **Extração de arquivos:** o limite de 40 GiB é aplicado também à contagem real de bytes descompactados e o tamanho escrito precisa coincidir com o tamanho declarado pelo ZIP.
- **Recuperação de atualizações:** uma instalação válida não é bloqueada por um backup válido que sobrou de uma interrupção; o backup só é removido quando ambos os registros identificam a instalação esperada.
- **Autorização local:** um payload de catálogo público não pode tornar um visitante proprietário de um jogo marcando `owned` ou `inLibrary`; registros de instalação malformados são rejeitados sem abortar a varredura.
- **Resiliência:** falhas de escrita do log não devem mascarar a exceção original; falhas opcionais ao registrar o protocolo ou remover atalhos não interrompem abertura do app nem uma remoção já efetivada.
- **Localização:** mensagens de erro no boot e títulos/descrições das conquistas conhecidas possuem entradas explícitas para os três idiomas.

Os testes de regressão foram ampliados. Essas correções só devem ser consideradas aprovadas após os testes Core, o build MSIX, o teste de instalação/abertura/desinstalação e a validação visual nativa passarem no mesmo commit.

