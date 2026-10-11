# Deadsmile Games Launcher 1.7.1

Electron e React para Windows. Requer Node.js 24 ou superior. A interface oferece login, catálogo de jogos, biblioteca, busca, início rápido, detalhes, instalação, atualização, desinstalação, conquistas e configurações de idioma e conexão itch.io. Administração, notícias e edição da conta ficam no website.

Execute `npm ci` e `npm run dev`. `npm run build` compila o renderer; `npm run package:update` prepara a aplicação; `npm run build:windows` gera o instalador; `npm run build:store` gera o pacote da Microsoft Store. Builds Windows exigem ferramentas compatíveis, identidade de publicação e assinatura apropriadas.

## Biblioteca e jogos

A aba Explorar consulta `/api/library/catalog` e mostra todos os jogos cadastrados, com posse e presença na biblioteca separadas. Somente `access_type` determina gratuito ou pago; links e preços da Microsoft Store não alteram esse campo. Um pago sem posse mostra compra no itch.io e verificação da compra, sem download ou execução autorizados. Vincule itch.io para verificar e sincronizar compras. Comprar na Microsoft Store não comprova posse no itch.io.

A aba Biblioteca mostra somente jogos adicionados à conta. `POST /api/library/:gameId` registra um gratuito imediatamente com `source=free`, sem consultar itch.io; um pago exige validação e registra `source=itch`. O registro ocorre antes do download e persiste após falha de download ou desinstalação. O processo nativo verifica novamente a autorização antes de instalar e executar. Instalações locais não concedem posse a outra conta.

O botão de instalação só aparece quando o cadastro possui `download_url` e o jogo está publicado. A API resolve um build Windows publicado somente quando sua URL corresponde exatamente ao `download_url` do cadastro, com tamanho e SHA-256, ou uma versão GitHub válida da configuração existente. Sem link de download, o jogo permanece visível com o botão Indisponível. Uma página itch.io ou um badge Microsoft não cria uma instalação local. Sem build compatível, a API retorna um erro de configuração. Instalações e compras da Microsoft continuam geridas pela Store.

Downloads validam HTTPS, DNS público, redirecionamentos, tamanho, hash e extração. Falhas preservam a instalação anterior. A fila só confirma conclusão quando o worker termina a limpeza e libera imediatamente o próximo download. O renderer envia identidade do jogo, nunca uma URL que substitua a autorização da API. A execução verifica o diretório gerenciado e a identidade do jogo. Atalhos usam `deadsmile://launch?gameId=...`.

Novas instalações usam o ID fixo como nome da pasta. Instalações antigas são migradas quando pasta e slug correspondem aos metadados autenticados. Jogos em execução ou com download ativo não são movidos; destinos existentes e symlinks não são substituídos. Alterar o slug não muda a identidade de novas instalações. Se o processo for interrompido entre mover a pasta e salvar o registro, o launcher recupera o caminho pelo ID. Instalações novas guardam ID, executável relativo e versão em um registro local dentro da pasta do jogo, criado antes do commit; uma instalação concluída pode ser redescoberta mesmo se o renderer não receber o resultado. Esse registro não comprova posse e não contém dados da conta. Backups órfãos são restaurados apenas quando a pasta atual não existe, sem sobrescrever instalações ou aceitar symlinks. Migração, abertura, remoção e commit da instalação são serializados por jogo.

Os detalhes reutilizam os componentes de produto, paleta, fontes, botões e painéis do website. Imagens dos cards mantêm proporção 16:9; hero, screenshots, classificação e lightbox possuem limites de tamanho. Colunas se adaptam à largura disponível. A barra da janela mantém arraste e controles sem título visível. Falhas de verificação itch.io aparecem em um aviso amarelo compacto no topo da área de conteúdo e não impedem o carregamento do catálogo. O ícone do produto aparece apenas quando encontrado na Microsoft Store; sem ícone ou se a imagem falhar, o espaço é omitido. Descrição e screenshots cadastrados permanecem intactos. Preços pertencem à loja que os forneceu; preço ausente não é estimado.

O overlay abre com o atalho existente, padrão Ctrl+D, e usa a organização de quatro painéis da primeira versão: perfil, biblioteca, metadados dos saves e conquistas. O CSS é gerado a partir dos estilos atuais do launcher por scripts/sync-overlay-ui.cjs antes do desenvolvimento e do build. Ao minimizar e restaurar o launcher, o foco não solicita uma nova sincronização da biblioteca; eventos reais da API e atualização manual continuam ativos. Conquistas ocultas mantêm título e descrição escondidos até serem desbloqueadas. Saves, sincronização de conquistas e atualização verificada continuam no processo nativo. A atualização do launcher aguarda abertura de jogos e operações de arquivos; falhas ao iniciar o atualizador retornam erro localizado sem encerrar o launcher.

## Segurança e idioma

O renderer usa isolamento, IPC restrito, CSP e cookies criptografados. A janela principal não pode chamar administração ou edição da conta; o overlay só pode ler o perfil, a biblioteca, as conquistas e os metadados dos saves, sem acesso a escrita ou ao payload dos saves. Dados de biblioteca não são persistidos entre contas; o registro local contém apenas instalações físicas. Respostas antigas são descartadas na troca de conta.

Configurações reúne o idioma e a conexão itch.io. A desconexão revoga os registros pagos do itch.io e conserva os gratuitos; durante execução ou download, ela fica bloqueada no renderer e no processo nativo. Inglês, português brasileiro e espanhol mudam interface, badges Microsoft no tema dark e idioma das chamadas imediatamente. O login utiliza as classes e o CSS da página de autenticação do website. Mensagens de erro vêm da API ou de fallbacks gerados pelo catálogo mestre. `npm run errors:sync` na API atualiza os clientes e o overlay.

ASAR, integridade e ausência de source maps ajudam a proteger a distribuição, mas não tornam os arquivos impossíveis de extrair. Não publique `.env`, chaves, certificados, logs, backups ou artefatos privados.

## Validação e publicação

`npm test` verifica fila, atualização de download concluído, recuperação de instalação, diretórios, symlinks, destinos de rede e limites de acesso do renderer/overlay. `node scripts/validate-auth-bridge.cjs` e `node scripts/validate-game-shortcuts.cjs` verificam contratos de autenticação e atalhos.

Publique com API e website 1.7.1 e banco migrado até `013_game_download_links.sql`. O backend configurado é `https://api-ust8.onrender.com/api`; o website é `https://deadsmilegames.vercel.app`. Alterações de domínio precisam atualizar URLs, CSP e origens nos três projetos.

Builds e testes automatizados foram executados. Instalador Windows, assinatura, atualização real, protocolo do sistema e OAuth com contas reais precisam de validação no Windows antes da liberação.

Copyright 2026 Deadsmile Games. Todos os direitos reservados, conforme LICENSE.
