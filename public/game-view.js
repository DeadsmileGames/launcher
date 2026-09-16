(() => {
      'use strict';
      const bridge = window.deadsmile;
      const SITE = 'https://deadsmilegames.vercel.app';
      const FALLBACK = `${SITE}/assets/placeholders/game-cover.svg`;
      const copy = {
        en: {
          error: 'Error', gameView: 'Game View', profile: 'Profile', library: 'Library',
          cloudSaves: 'Cloud saves', achievements: 'Achievements', loading: 'Loading…',
          selectGame: 'Select a game', playing: 'Playing', game: 'Game',
          noCloudSaves: 'No cloud saves found.',
          cloudSavesUnavailable: 'Cloud saves are not enabled for this game.',
          noAchievements: 'No achievements yet.', deleteCloudSave: 'Delete cloud save', cloudSaveDeleted: 'Cloud save deleted.',
          deleteCloudSaveConfirm: 'Click delete again to confirm.', takeScreenshot: 'Take screenshot',
          screenshotSaved: 'Screenshot saved', screenshotFailed: 'Could not take screenshot',
          openScreenshotFolder: 'Open screenshot folder', gameViewTutorialTitle: 'Meet Game View',
          gameViewTutorialDescription: 'Press {shortcut} to open or close Game View while playing.',
          gameViewTutorialProfile: 'See your profile and the game currently running.',
          gameViewTutorialLibrary: 'Browse the games in your library.',
          gameViewTutorialCloud: 'Check and delete cloud saves for supported games.',
          gameViewTutorialScreenshot: 'Take a clean screenshot of the game without the overlay.',
          gotIt: 'Got it', signIn: 'Sign in to the launcher to use Game View.', close: 'Close',
          shareOnX: 'Share on X', sharePreparing: 'Preparing screenshot…',
          shareFailed: 'Could not share on X.',
          sharePlayingX: "Look what I'm playing on the @DeadsmileGames Launcher: {game}",
          sharePasteScreenshot: 'Screenshot copied. Paste it into X with Ctrl + V.'
        },
        'pt-BR': {
          error: 'Erro', gameView: 'Game View', profile: 'Perfil', library: 'Biblioteca',
          cloudSaves: 'Saves na nuvem', achievements: 'Conquistas', loading: 'Carregando…',
          selectGame: 'Selecione um jogo', playing: 'Jogando', game: 'Jogo',
          noCloudSaves: 'Nenhum save na nuvem encontrado.',
          cloudSavesUnavailable: 'Os saves na nuvem não estão ativados para este jogo.',
          noAchievements: 'Nenhuma conquista ainda.', deleteCloudSave: 'Apagar save da nuvem', cloudSaveDeleted: 'Save da nuvem apagado.',
          deleteCloudSaveConfirm: 'Clique em apagar novamente para confirmar.', takeScreenshot: 'Tirar screenshot',
          screenshotSaved: 'Screenshot salvo', screenshotFailed: 'Não foi possível tirar o screenshot',
          openScreenshotFolder: 'Abrir pasta de screenshots', gameViewTutorialTitle: 'Conheça a Game View',
          gameViewTutorialDescription: 'Pressione {shortcut} para abrir ou fechar a Game View enquanto joga.',
          gameViewTutorialProfile: 'Veja seu perfil e o jogo que está rodando.',
          gameViewTutorialLibrary: 'Navegue pelos jogos da sua biblioteca.',
          gameViewTutorialCloud: 'Veja e apague saves na nuvem dos jogos compatíveis.',
          gameViewTutorialScreenshot: 'Tire uma captura limpa do jogo sem o overlay aparecer.',
          gotIt: 'Entendi', signIn: 'Entre no launcher para usar a Game View.', close: 'Fechar',
          shareOnX: 'Compartilhar no X', sharePreparing: 'Preparando screenshot…',
          shareFailed: 'Não foi possível compartilhar no X.',
          sharePlayingX: 'Olha o que eu estou jogando no @DeadsmileGames Launcher: {game}',
          sharePasteScreenshot: 'Screenshot copiada. Cole no X com Ctrl + V.'
        },
        es: {
          error: 'Error', gameView: 'Game View', profile: 'Perfil', library: 'Biblioteca',
          cloudSaves: 'Guardados en la nube', achievements: 'Logros', loading: 'Cargando…',
          selectGame: 'Selecciona un juego', playing: 'Jugando', game: 'Juego',
          noCloudSaves: 'No hay guardados en la nube.',
          cloudSavesUnavailable: 'Los guardados en la nube no están activados para este juego.',
          noAchievements: 'Todavía no hay logros.', deleteCloudSave: 'Borrar guardado de la nube', cloudSaveDeleted: 'Guardado de la nube eliminado.',
          deleteCloudSaveConfirm: 'Pulsa borrar de nuevo para confirmar.', takeScreenshot: 'Tomar captura',
          screenshotSaved: 'Captura guardada', screenshotFailed: 'No se pudo tomar la captura',
          openScreenshotFolder: 'Abrir carpeta de capturas', gameViewTutorialTitle: 'Conoce Game View',
          gameViewTutorialDescription: 'Pulsa {shortcut} para abrir o cerrar Game View mientras juegas.',
          gameViewTutorialProfile: 'Mira tu perfil y el juego que está en ejecución.',
          gameViewTutorialLibrary: 'Explora los juegos de tu biblioteca.',
          gameViewTutorialCloud: 'Consulta y elimina guardados en la nube de juegos compatibles.',
          gameViewTutorialScreenshot: 'Haz una captura limpia del juego sin mostrar el overlay.',
          gotIt: 'Entendido', signIn: 'Inicia sesión en el launcher para usar Game View.', close: 'Cerrar',
          shareOnX: 'Compartir en X', sharePreparing: 'Preparando captura…',
          shareFailed: 'No se pudo compartir en X.',
          sharePlayingX: 'Mira lo que estoy jugando en el @DeadsmileGames Launcher: {game}',
          sharePasteScreenshot: 'Captura copiada. Pégala en X con Ctrl + V.'
        }
      };
      let lang = 'en', csrfToken = null, user = null, games = [], running = [], selectedId = null, saves = [], achievements = [], statusTimer = null, interactiveState = null;
      let sharedStrings = {};
      let shortcutLabel = 'Ctrl + D';
      let selectedLoadToken = 0;
      let pendingDeleteSlot = null;
      let pendingDeleteTimer = null;
      const $ = (id) => document.getElementById(id);
      const t = (key) => {
        if (sharedStrings?.[key]) {
          return sharedStrings[key];
        }

        return (
          copy[lang]?.[key] ||
          copy.en?.[key] ||
          key
        );
      };
      const formatText = (value, params = {}) => String(value || '').replace(/{(\w+)}/g, (_, key) =>
        params[key] !== undefined ? String(params[key]) : `{${key}}`
      );
      const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
      const idEq = (a, b) => String(a ?? '') === String(b ?? '');
      const listFrom = (data, key) => Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.[key]) ? data[key] : [];
      const asset = (value, fallback = '') => { if (!value) return fallback; const raw = String(value); if (raw.length > 2_000_000) return fallback; if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(raw)) return raw; try { const url = new URL(raw, SITE); return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : fallback } catch { return fallback } };
      const imageOf = (g) => asset(g?.coverImage || g?.cover_image, asset(g?.heroImage || g?.hero_image, FALLBACK));
      const cloudEnabled = (g) => Boolean(g?.cloudSavesEnabled ?? g?.cloud_saves_enabled);
      const initials = (u) => String(u?.username || u?.email || 'P').slice(0, 1).toUpperCase();

      async function request(path, method = 'GET', body, allowRetry = true) {
        const headers = {};
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          if (!csrfToken) {
            const tokenResult = await bridge.api({ path: '/csrf', method: 'GET' });
            csrfToken = tokenResult?.data?.data?.token || null;
          }
          if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
        }
        const result = await bridge.api({ path, method, body, headers });
        const payload = result?.data;
        if (!result?.ok) {
          const code = payload?.error?.code;
          if (result?.status === 403 && code === 'CSRF_VALIDATION_FAILED' && allowRetry) { csrfToken = null; return request(path, method, body, false) }
          throw new Error(payload?.error?.message || 'Request failed');
        }
        return payload?.data;
      }

      function applyShortcut() {
        $('shortcutBadge').textContent = shortcutLabel;
        $('tutorialShortcutBadge').textContent = shortcutLabel;
        $('tutorialTitle').textContent = `${t('gameView')} (${shortcutLabel})`;
        $('tutorialDescription').textContent = formatText(
          t('gameViewTutorialDescription'),
          { shortcut: shortcutLabel },
        );
      }

      function applyLanguage() {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-i18n]').forEach((el) => {
          el.textContent = t(el.dataset.i18n);
        });
        $('shotBtn').title = t('takeScreenshot');
        $('shotBtn').setAttribute('aria-label', t('takeScreenshot'));
        $('shareXBtn').title = t('shareOnX');
        $('shareXBtn').setAttribute('aria-label', t('shareOnX'));
        $('helpBtn').title = t('gameViewTutorialTitle');
        $('helpBtn').setAttribute('aria-label', t('gameViewTutorialTitle'));
        $('closeBtn').title = t('close');
        $('closeBtn').setAttribute('aria-label', t('close'));
        applyShortcut();
      }

      function currentGame() {
        const state = running[0];
        if (!state) return null;
        return games.find((game) => idEq(state.id, game.id)) || {
          id: state.id,
          title: state.title || t('game'),
          coverImage: state.coverImage || null,
          cloudSavesEnabled: Boolean(state.cloudSavesEnabled),
        };
      }

      function selectedGame() {
        return games.find((game) => idEq(game.id, selectedId)) || currentGame() || games[0] || null;
      }

      function renderProfile() {
        $('username').textContent = user?.username || user?.email || 'Player';
        const avatar = $('avatar');
        avatar.textContent = '';
        if (user?.avatarUrl || user?.avatar_url) {
          const img = document.createElement('img');
          img.src = asset(user.avatarUrl || user.avatar_url, '');
          img.alt = '';
          avatar.appendChild(img);
        } else {
          avatar.textContent = initials(user);
        }
        const current = currentGame();
        $('playingText').textContent = current
          ? `${t('playing')}: ${current.title}`
          : t('gameView');
        $('shareXBtn').disabled = !current;
      }

      function renderGames() {
        $('libraryCount').textContent = String(games.length);
        const root = $('gameList');
        if (!games.length) {
          root.innerHTML = `<div class="empty">${esc(t('selectGame'))}</div>`;
          return;
        }
        const selected = selectedGame();
        root.innerHTML = games.slice(0, 20).map((game) => {
          const active = selected && idEq(selected.id, game.id);
          const isRunning = running.some((item) => idEq(item.id, game.id));
          const subtitle = isRunning
            ? t('playing')
            : cloudEnabled(game)
              ? t('cloudSaves')
              : t('game');
          return `<button class="game ${active ? 'active' : ''}" data-game-id="${esc(game.id)}"><img src="${esc(imageOf(game))}" alt=""><span class="copy"><strong>${esc(game.title || t('game'))}</strong><small>${esc(subtitle)}</small></span>${isRunning ? '<i class="running-dot"></i>' : ''}</button>`;
        }).join('');
      }

      async function loadSelected() {
        const game = selectedGame();
        const loadToken = ++selectedLoadToken;

        pendingDeleteSlot = null;
        if (pendingDeleteTimer) {
          clearTimeout(pendingDeleteTimer);
          pendingDeleteTimer = null;
        }
        $('cloudGame').textContent = game?.title || '';
        $('saveList').innerHTML = `<div class="empty">${esc(game ? t('loading') : t('selectGame'))}</div>`;
        $('achievementList').innerHTML = `<div class="empty">${esc(game ? t('loading') : t('selectGame'))}</div>`;
        $('achievementCount').textContent = '0/0';
        if (!game) {
          saves = [];
          achievements = [];
          return;
        }

        const [achievementResult, saveResult] = await Promise.allSettled([
          request(`/platform/achievements/${encodeURIComponent(game.id)}`),
          cloudEnabled(game)
            ? request(`/platform/saves/${encodeURIComponent(game.id)}`)
            : Promise.resolve([]),
        ]);

        if (loadToken !== selectedLoadToken || !idEq(selectedGame()?.id, game.id)) return;

        achievements = achievementResult.status === 'fulfilled' && Array.isArray(achievementResult.value)
          ? achievementResult.value
          : [];
        saves = saveResult.status === 'fulfilled' && Array.isArray(saveResult.value)
          ? saveResult.value
          : [];
        renderAchievements();
        renderSaves();
      }

      function renderAchievements() {
        const root = $('achievementList');
        const unlocked = achievements.filter((item) => item.unlocked_at || item.unlockedAt).length;
        $('achievementCount').textContent = `${unlocked}/${achievements.length}`;
        if (!achievements.length) {
          root.innerHTML = `<div class="empty">${esc(t('noAchievements'))}</div>`;
          return;
        }
        root.innerHTML = achievements.slice(0, 10).map((achievement) => {
          const unlockedNow = achievement.unlocked_at || achievement.unlockedAt;
          const title = achievement.hidden && !unlockedNow
            ? '???'
            : (achievement.title || achievement.key || '');
          return `<div class="achievement ${unlockedNow ? 'unlocked' : 'locked'}"><svg width="17" height="17" viewBox="0 0 24 24" fill="${unlockedNow ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg><span class="copy"><strong>${esc(title)}</strong><small>${esc(achievement.description || '')}</small></span></div>`;
        }).join('');
      }

      function renderSaves() {
        const game = selectedGame();
        const root = $('saveList');
        if (!game) {
          root.innerHTML = `<div class="empty">${esc(t('selectGame'))}</div>`;
          return;
        }
        if (!cloudEnabled(game)) {
          root.innerHTML = `<div class="empty">${esc(t('cloudSavesUnavailable'))}</div>`;
          return;
        }
        if (!saves.length) {
          root.innerHTML = `<div class="empty">${esc(t('noCloudSaves'))}</div>`;
          return;
        }
        root.innerHTML = saves.slice(0, 10).map((save) => {
          const dateValue = save.updatedAt || save.updated_at;
          const date = dateValue ? new Date(dateValue) : null;
          const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleString(lang) : '';
          return `<div class="save"><span class="copy"><strong>${esc(save.slot)}</strong><small>${esc(dateText)}</small></span><button class="delete" data-delete-slot="${esc(save.slot)}" title="${esc(t('deleteCloudSave'))}" aria-label="${esc(t('deleteCloudSave'))}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg></button></div>`;
        }).join('');
      }

      function showStatus(message, { error = false, folder = null, sticky = false } = {}) {
        if (statusTimer) {
          clearTimeout(statusTimer);
          statusTimer = null;
        }
        const box = $('status');
        box.classList.remove('hidden', 'error');
        if (error) box.classList.add('error');
        $('statusText').textContent = message;
        $('statusIcon').textContent = error ? '!' : '●';
        const action = $('statusAction');
        if (folder) {
          action.textContent = t('openScreenshotFolder');
          action.dataset.folder = folder;
          action.classList.remove('hidden');
        } else {
          action.classList.add('hidden');
          action.dataset.folder = '';
        }
        if (!sticky) statusTimer = setTimeout(() => box.classList.add('hidden'), 5000);
      }

      function showTutorial(force = false) {
        let seen = false;
        try {
          seen = localStorage.getItem('deadsmile.gameview.tutorial.v3') === 'seen';
        } catch {}
        if (force || !seen) {
          $('tutorialLayer').classList.remove('hidden');
          setInteractive(true);
        }
      }

      function hideTutorial() {
        try {
          localStorage.setItem('deadsmile.gameview.tutorial.v3', 'seen');
        } catch {}
        $('tutorialLayer').classList.add('hidden');
        setInteractive(false);
      }

      function setInteractive(value) {
        value = Boolean(value);
        if (interactiveState === value) return;
        interactiveState = value;
        bridge?.setOverlayInteractive?.(value).catch?.(() => {});
      }

      async function takeScreenshot() {
        showStatus(`${t('takeScreenshot')}…`, { sticky: true });
        try {
          const result = await bridge.takeScreenshot();
          if (!result?.ok) throw new Error(result?.error || t('screenshotFailed'));
          showStatus(t('screenshotSaved'), { folder: result.folder });
        } catch (error) {
          showStatus(error?.message || t('screenshotFailed'), { error: true });
        }
      }

      function gameHashtag(title) {
        const clean = String(title || 'IndieGame')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '');
        return clean.slice(0, 48) || 'IndieGame';
      }

      function buildXShareText() {
        const game = currentGame();
        if (!game) return '';
        const hashtags = `#DeadsmileGames #${gameHashtag(game.title)} #indiedev`;
        let body = formatText(t('sharePlayingX'), { game: game.title || t('game') });
        const maxBodyLength = Math.max(1, 280 - hashtags.length - 2);
        if (body.length > maxBodyLength) body = `${body.slice(0, Math.max(0, maxBodyLength - 1))}…`;
        return `${body}\n\n${hashtags}`;
      }

      async function shareOnX() {
        if (!currentGame()) return;
        showStatus(t('sharePreparing'), { sticky: true });
        try {
          const result = await bridge.shareOnX({ text: buildXShareText() });
          if (!result?.ok) throw new Error(result?.error || t('shareFailed'));
          showStatus(t('sharePasteScreenshot'), { folder: result.folder, sticky: true });
        } catch (error) {
          showStatus(error?.message || t('shareFailed'), { error: true });
        }
      }

      async function removeSave(slot) {
        const game = selectedGame();
        if (!game) return;
        const normalizedSlot = String(slot);

        if (pendingDeleteSlot !== normalizedSlot) {
          pendingDeleteSlot = normalizedSlot;
          if (pendingDeleteTimer) clearTimeout(pendingDeleteTimer);
          pendingDeleteTimer = setTimeout(() => {
            pendingDeleteSlot = null;
            pendingDeleteTimer = null;
          }, 4500);
          showStatus(t('deleteCloudSaveConfirm'));
          return;
        }

        pendingDeleteSlot = null;
        if (pendingDeleteTimer) clearTimeout(pendingDeleteTimer);
        pendingDeleteTimer = null;

        const button = document.querySelector(`[data-delete-slot="${CSS.escape(normalizedSlot)}"]`);
        if (button) {
          button.disabled = true;
          button.innerHTML = '<span class="spinner"></span>';
        }
        try {
          await request(
            `/platform/saves/${encodeURIComponent(game.id)}/${encodeURIComponent(normalizedSlot)}`,
            'DELETE',
          );
          saves = saves.filter((save) => String(save.slot) !== normalizedSlot);
          renderSaves();
          showStatus(t('cloudSaveDeleted'));
        } catch (error) {
          showStatus(error?.message || t('error'), { error: true });
          renderSaves();
        }
      }

      async function init() {
        try {
          const bootstrap = await bridge.getOverlayBootstrap?.();
          const initialI18n = bootstrap?.i18n || {};
          const initialStrings = initialI18n.strings && typeof initialI18n.strings === 'object'
            ? initialI18n.strings
            : {};
          const hasSharedStrings = Object.keys(initialStrings).length > 0;

          lang = hasSharedStrings && ['en', 'pt-BR', 'es'].includes(initialI18n.language)
            ? initialI18n.language
            : (['en', 'pt-BR', 'es'].includes(bootstrap?.language) ? bootstrap.language : 'en');
          sharedStrings = initialStrings;
          running = Array.isArray(bootstrap?.running) ? bootstrap.running : [];
          shortcutLabel = bootstrap?.gameViewSettings?.label || 'Ctrl + D';
          applyLanguage();

          const results = await Promise.allSettled([
            request('/auth/me'),
            request('/games?page=1&limit=100'),
            request('/library'),
          ]);
          user = results[0].status === 'fulfilled' ? results[0].value : null;
          const catalog = results[1].status === 'fulfilled'
            ? listFrom(results[1].value, 'games')
            : [];
          const libraryItems = results[2].status === 'fulfilled'
            ? listFrom(results[2].value, 'items')
            : [];
          const ids = new Set([
            ...libraryItems.map((item) => String(item.id)),
            ...(bootstrap?.installedIds || []).map(String),
          ]);
          games = catalog.filter((game) => ids.has(String(game.id)));
          if (!games.length && libraryItems.length && libraryItems.some((item) => item.title)) {
            games = libraryItems;
          }
          for (const state of running) {
            if (!games.some((game) => idEq(game.id, state.id)) && state.title) {
              games.unshift({
                id: state.id,
                title: state.title,
                coverImage: state.coverImage || null,
                cloudSavesEnabled: Boolean(state.cloudSavesEnabled),
              });
            }
          }
          const current = currentGame();
          selectedId = current?.id || games[0]?.id || null;
          renderProfile();
          renderGames();
          await loadSelected();
          showTutorial(false);
        } catch (error) {
          applyLanguage();
          showStatus(error?.message || 'Unable to load Game View', {
            error: true,
            sticky: true,
          });
        }
      }

      $('closeBtn').addEventListener('click', () => bridge.closeOverlay());
      $('shotBtn').addEventListener('click', takeScreenshot);
      $('shareXBtn').addEventListener('click', shareOnX);
      $('helpBtn').addEventListener('click', () => showTutorial(true));
      $('tutorialDone').addEventListener('click', hideTutorial);
      $('statusAction').addEventListener('click', () => {
        const folder = $('statusAction').dataset.folder;
        if (folder) bridge.openScreenshotFolder?.();
      });
      $('gameList').addEventListener('click', async (event) => {
        const button = event.target.closest('[data-game-id]');
        if (!button) return;
        selectedId = button.dataset.gameId;
        renderGames();
        await loadSelected();
      });
      $('saveList').addEventListener('click', (event) => {
        const button = event.target.closest('[data-delete-slot]');
        if (button && !button.disabled) removeSave(button.dataset.deleteSlot);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!$('tutorialLayer').classList.contains('hidden')) hideTutorial();
        else bridge.closeOverlay();
      });
      document.addEventListener('mousemove', (event) => {
        const target = event.target?.closest?.('[data-interactive]');
        setInteractive(Boolean(target));
      }, { passive: true });
      document.addEventListener('mouseleave', () => setInteractive(false));

      bridge.onGameState?.((state) => {
        running = state.running
          ? [...running.filter((item) => !idEq(item.id, state.id)), state]
          : running.filter((item) => !idEq(item.id, state.id));
        const current = currentGame();
        if (current) selectedId = current.id;
        renderProfile();
        renderGames();
        loadSelected().catch(() => {});
      });
      bridge.onAchievementUnlocked?.((payload) => {
        if (selectedGame() && idEq(selectedGame().id, payload?.gameId)) {
          loadSelected().catch(() => {});
        }
      });
      bridge.onGameViewSettingsChanged?.((settings) => {
        if (!settings) return;
        shortcutLabel = settings.label || shortcutLabel;
        applyShortcut();
      });
      bridge.onOverlayShown?.(() => {
        document.documentElement.classList.remove('overlay-hiding');
        interactiveState = null;
        setInteractive(false);
      });
      bridge.onOverlayHiding?.(() => {
        document.documentElement.classList.add('overlay-hiding');
        interactiveState = null;
        setInteractive(false);
      });
      bridge.onGameViewLanguageChanged?.((payload) => {
        if (!payload) return;
        if (['en', 'pt-BR', 'es'].includes(payload.language)) lang = payload.language;
        sharedStrings = payload.strings && typeof payload.strings === 'object'
          ? payload.strings
          : {};
        applyLanguage();
        renderProfile();
        renderGames();
        renderSaves();
        renderAchievements();
      });
      init();
    })();
