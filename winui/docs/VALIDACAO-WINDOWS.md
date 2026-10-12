# Validação obrigatória no Windows

Execute em ambiente de teste, com cópia dos saves e dos dados relevantes. Esta lista registra cenários de aceite. O build, os 22 testes Core e os smoke tests de instalação/desinstalação EXE/MSIX passaram no runner Windows Server 2025; a abertura da janela foi conferida para o aplicativo instalado pelo EXE. Consulte STATUS.md para a execução e o commit testados. Os cenários completos abaixo continuam pendentes de homologação em Windows 10/11.

## Build e instalação

- Executar os 22 testes Core; todos devem passar.
- Publicar x64 e conferir ausência de erros do compilador C# e do compilador XAML.
- Confirmar que o app abre em Windows 10 22H2 e Windows 11 sem SDK de desenvolvimento instalado.
- Gerar MSIX com MakeAppx e verificar assinatura com SignTool.
- Instalar MSIX em computador que confie no certificado apropriado.
- Gerar e executar Setup.exe; conferir atalhos, protocolo e desinstalação.
- Verificar atualização com launcher fechado, arquivos em uso, falta de espaço e interrupção.
- Confirmar que jogos e saves não são apagados ao remover o launcher.
- Não instalar MSIX e EXE juntos antes de verificar as prioridades do protocolo.

## Interface

- Comparar com as referências WinUI Gallery, Microsoft Store e Xbox Game Bar em 1280 × 800.
- Conferir mínimo de janela, maximização, restauração e arraste da barra de título.
- Testar 100%, 125%, 150% e 200%, inclusive em monitores com escalas diferentes.
- Conferir fontes, ícones, login, lateral, capas, descrição, galeria, ações e dados da Store.
- Conferir português, inglês e espanhol, incluindo textos longos.
- Conferir navegação por teclado, foco, leitor de tela e alto contraste.
- Conferir ausência de corte de texto, áreas sem rolagem e controles fora da janela.
- Abrir screenshots muito largas e verticais; redimensionar com a galeria aberta e verificar a imagem inteira.
- Testar todos os temas, alto contraste, navegação compacta/expandida e persistência das preferências.
- Desativar animações no app e no Windows; conferir ausência de transições e rotação automática.
- Conferir o ícone em tarefa, Iniciar, busca e Explorer nas escalas 100–400%, incluindo atualização da instalação existente.

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

- O atualizador EXE seleciona apenas o artefato WinUI x64.
- Falta de hash, hash inválido, assinatura ausente, revogada ou de outra chave são rejeitados.
- Validar instalador assinado com certificado de produção confiável.
- Configurar identidade, assinatura e canal de atualização reais antes de distribuir.
- Se houver publicação na Store, revisar as regras de catálogo/classificação e realizar o fluxo de certificação.

