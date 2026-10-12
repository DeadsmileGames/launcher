# Revisão de segurança e integração — 12/10/2026

Escopo: launcher WinUI, contratos dos ZIPs API(5)/Website(6), endpoints públicos em produção e esquema do banco em uma transação somente leitura. Os ZIPs mais recentes têm o mesmo conteúdo dos anexos API(4)/Website(5). O launcher acessa dados pela API; nenhuma credencial PostgreSQL ou conexão direta ao banco foi incluída no aplicativo.

## Evidências

- 51 testes do backend anexado passaram, sem testes ignorados. Incluem CSRF, autorização, isolamento de contas, 2FA, sessão, saves, criptografia, ownership pago, metadados da Store e HTML sanitizado.
- 12 testes do website passaram; o build Vite também passou.
- Consultas GET em produção: catálogo, newswire, vídeos, launcher e eventos públicos retornaram dados. Conta, wishlist e biblioteca privadas retornaram 401 sem sessão. Limite de catálogo inválido e slug inválido retornaram 400.
- Esquema PostgreSQL conferido por HTTPS com o driver oficial Neon, em transação `readOnly`/`RepeatableRead`: 252 colunas. Somente nomes/tipos de colunas e contagens públicas de jogos/notícias/vídeos foram consultados. Nenhum dado de usuário, senha, sessão ou save foi lido; nenhum esquema ou registro foi alterado.
- O inventário de código/configuração cobre os arquivos C#, XAML, projetos, scripts, manifestos, catálogo de idiomas e workflow. A verificação estrutural é complementada pelos testes C#/XAML e de instalação no Windows.

## Correções e controles do launcher

| Área | Controle |
|---|---|
| Sessão | Cookies protegidos com DPAPI, persistência por usuário do Windows; respostas 401 antigas não invalidam um login mais recente. |
| Requisições | Origem de API fixa, rotas permitidas explicitamente, queries limitadas, HTTPS e tamanho máximo de respostas/corpos. |
| Conta | Biblioteca, wishlist, download e execução continuam sujeitos a autenticação/autorização do servidor. O modo visitante não concede ownership. |
| HTML de notícias | Convertido para texto WinUI; nunca executado como HTML, JavaScript ou XAML. |
| Avatar | URL HTTPS ou data URI de imagem limitada; dimensões limitadas para o conteúdo embutido. |
| Arquivos | IDs/slug validados, paths protegidos, links/reparse points bloqueados e ZIPs com traversal/nomes reservados rejeitados. |
| Downloads | Autorização de instalação no backend, tamanho/hash verificados, redirects controlados e destinos privados bloqueados. |
| Atualização | Artefato WinUI específico, SHA-256 e assinatura Authenticode com a chave do publicador atual. |
| Captura | Uma janela de jogo escolhida pelo clique do usuário; sem gravação de áudio, captura contínua ou upload automático. |
| Compartilhamento | Arquivo local/clipboard/tela nativa do Windows. A postagem exige confirmação na rede social escolhida. |
| Banco | Credencial fora do repositório, binários, logs do app e artefatos. |

## Limitações observadas

O website `https://deadsmilegames.vercel.app` respondeu **HTTP 402 / DEPLOYMENT_DISABLED** na Vercel. O código anexado compila e seus testes passaram, mas cadastro, recuperação de senha e gerenciamento externo da conta dependem da reativação desse deployment. O launcher não altera a hospedagem do site.

Os testes de segurança do backend rodaram contra o ambiente isolado do próprio projeto. Em produção foram usados somente GETs de leitura/validação. Fluxos privados com uma conta real, compra no itch.io e jogos reais não foram executados com as credenciais de um usuário. A verificação automática no Windows Server 2025 não substitui testes manuais em desktops Windows 10/11, diferentes GPUs/DPI, HDR e fullscreen exclusivo.

O certificado incluído é de desenvolvimento. A identidade e a assinatura pública de produção, publicação na Store e feed de atualização ainda dependem da configuração do publicador.
