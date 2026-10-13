# Validação obrigatória no Windows

Execute os cenários manuais em ambiente de teste, com cópia dos saves e dos dados relevantes. Consulte o [workflow Build Deadsmile WinUI MSIX](https://github.com/DeadsmileGames/launcher/actions/workflows/build-winui.yml) para o resultado da revisão atual. A execução #107 (pré-migração) compilou o antigo instalador EXE, mas falhou ao abrir sua janela WinUI; o assistente EXE foi removido e essa execução não conta como validação do fluxo MSIX-only. O novo fluxo só deve ser considerado aprovado quando o CI confirmar instalação, abertura da janela principal, desinstalação e preservação de dados. Isso não substitui homologação manual em desktops Windows 10/11 nem testes com conta/jogos reais.

## Build e instalação

- [ ] Executar os testes Core no commit atual; repetir após qualquer mudança de código.
- [ ] Publicar x64 e compilar XAML/C# sem erros no Actions do commit atual.
- [ ] Gerar somente o MSIX de desenvolvimento; smoke tests de instalação, inicialização e desinstalação precisam passar no runner.
- [ ] Confirmar que o app abre em Windows 10 22H2 e Windows 11 em desktops físicos sem SDK de desenvolvimento instalado.
- [ ] Verificar identidade e versão do MSIX de produção antes do envio ao Partner Center; a assinatura de produção/certificação ocorre no fluxo da Store. Não confundir o certificado de desenvolvimento com assinatura de produção.
- [ ] Verificar atualização com launcher fechado, arquivos em uso, falta de espaço e interrupção.
- [ ] Confirmar que jogos e saves não são apagados ao remover o launcher.
- [ ] Confirmar que o registro do protocolo `deadsmile://` funciona quando o MSIX é o único pacote instalado.

## Interface

- [ ] CI deve conferir navegação, busca, detalhes, galeria, cores, preferências, localização PT/ES e responsividade da Newswire (3→2→3 colunas) na execução atual.
- [ ] Comparar com as referências WinUI Gallery, Microsoft Store e Xbox Game Bar em 1280 × 800.
- [ ] Conferir mínimo de janela, maximização, restauração e arraste da barra de título.
- [ ] Testar 100%, 125%, 150% e 200%, inclusive em monitores com escalas diferentes.
- [ ] Conferir fontes, ícones, login, lateral, capas, descrição, galeria, ações e dados da Store em Windows 10/11.
- [ ] Conferir português, inglês e espanhol, incluindo textos longos.
- [ ] Conferir navegação por teclado, foco, leitor de tela e alto contraste.
- [ ] Conferir ausência de corte de texto, áreas sem rolagem e controles fora da janela.
- [ ] Abrir screenshots muito largas e verticais; redimensionar com a galeria aberta e verificar a imagem inteira.
- [ ] Testar todos os temas, alto contraste, navegação compacta/expandida e persistência das preferências.
- [ ] Desativar animações no app e no Windows; conferir ausência de transições e rotação automática.
- [ ] Conferir o ícone em tarefa, Iniciar, busca e Explorer nas escalas 100–400%, incluindo atualização da instalação existente.

## Conta e biblioteca

- Login válido/inválido, sessão expirada, 2FA e retorno para senha.
- Reenvio de confirmação, criação de conta e recuperação no navegador.
- Cookies preservados por DPAPI, novo login e logout.
- Conexão itch.io, sincronização, cancelamento/expiração e desconexão.
- Bloqueio de logout/desconexão enquanto houver jogos ou operações incompatíveis.
- Atualizações por WebSocket e fallback por polling, com queda e retorno da rede.

## Instalações e jogos

- Jogo gratuito fora da biblioteca, jogo adquirido e jogo não autorizado.
- Download simultâneo, pausa/retomada, cancelamento e nova tentativa.
- URL expirada, redirect, resposta a Range, tamanho incorreto e hash incorreto.
- Arquivo ZIP inválido, path traversal, links, nomes reservados e limite de extração.
- Atualização com versão anterior, instalação incompleta e backup órfão.
- Reconhecimento das instalações atuais por ID e migração de pasta por slug.
- Atalho deadsmile:// com launcher aberto, fechado e deslogado.
- Execução que termina imediatamente, execução prolongada e falha ao iniciar.
- Registro de tempo de jogo e fechamento da sessão no backend.

## Saves, conquistas e overlay

- Save PICO-8 válido, inválido, ausente, remoto mais novo e local mais novo.
- Conflito de revisão, cópias preservadas e troca de usuário.
- Conquistas por flags de save e arquivo de eventos do jogo.
- Falha/retry de sincronização e respeito à fila por usuário.
- Aviso de conquista sem roubar foco, inclusive com launcher minimizado.
- Atalho Game View livre e ocupado por outro programa.
- Overlay em janela, sem bordas, fullscreen exclusivo e jogo minimizado.
- Clique nos widgets, arraste, fixação, fechamento, restauração das posições, passagem de cliques fora deles, foco e ocultação.
- Fixar um widget, fechar Ctrl+D e depois fechar/minimizar o jogo; não pode sobrar widget na tela.
- Toast: fundo sólido no Windows 10; no Windows 11 testar Mica e fallback com efeitos/transparência desativados.
- Monitor do jogo, troca de monitor e escalas distintas.

## Atualização e publicação

- Confirmar que o fluxo de distribuição e a release oferecem apenas um arquivo MSIX, sem instalador EXE, MSI, NSIS, ZIP ou bundle alternativo.
- Validar identidade oficial, versão de quatro campos e manifesto antes do envio ao Partner Center.
- Confirmar instalação, inicialização e desinstalação com MSIX assinado por certificado confiável; não usar certificado de desenvolvimento como assinatura de produção.
- Configurar identidade, assinatura e canal de atualização reais antes de distribuir.
- Se houver publicação na Store, revisar as regras de catálogo/classificação e realizar o fluxo de certificação.
