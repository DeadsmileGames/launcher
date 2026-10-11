(() => {
  const bridge = window.deadsmile;
  const copy = {
    en: { profile: 'Profile', library: 'Library', cloud: 'Cloud saves', achievements: 'Achievements', refresh: 'Refresh', close: 'Close', loading: 'Loading…', empty: 'Your library is empty.', noSaves: 'No cloud saves found.', noAchievements: 'No achievements yet.', disabled: 'Cloud saves are not enabled for this game.', hidden: 'Hidden achievement', locked: 'Locked', unlocked: 'Unlocked', playing: 'Playing', none: 'No game running.', select: 'Select a game', retry: 'Try again', revision: 'Revision' },
    'pt-BR': { profile: 'Perfil', library: 'Biblioteca', cloud: 'Saves na nuvem', achievements: 'Conquistas', refresh: 'Atualizar', close: 'Fechar', loading: 'Carregando…', empty: 'Sua biblioteca está vazia.', noSaves: 'Nenhum save na nuvem.', noAchievements: 'Nenhuma conquista ainda.', disabled: 'Os saves na nuvem não estão ativados para este jogo.', hidden: 'Conquista oculta', locked: 'Bloqueada', unlocked: 'Desbloqueada', playing: 'Jogando', none: 'Nenhum jogo em execução.', select: 'Selecione um jogo', retry: 'Tentar novamente', revision: 'Revisão' },
    es: { profile: 'Perfil', library: 'Biblioteca', cloud: 'Guardados en la nube', achievements: 'Logros', refresh: 'Actualizar', close: 'Cerrar', loading: 'Cargando…', empty: 'Tu biblioteca está vacía.', noSaves: 'No hay guardados en la nube.', noAchievements: 'Aún no hay logros.', disabled: 'Los guardados en la nube no están habilitados para este juego.', hidden: 'Logro oculto', locked: 'Bloqueado', unlocked: 'Desbloqueado', playing: 'Jugando', none: 'Ningún juego en ejecución.', select: 'Selecciona un juego', retry: 'Intentar de nuevo', revision: 'Revisión' }
  };
  const get = (id) => document.getElementById(id);
  const validId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  let language = 'en', user = null, games = [], running = [], selected = null;
  let generation = 0, bootGeneration = 0, interactive = null, disposed = false;
  const cleanups = [];
  const t = (key) => copy[language][key];

  function failure(error) {
    if (typeof error?.code === 'string' && typeof error?.message === 'string') return error.message;
    const code = error?.code || String(error?.message || '').match(/\b[A-Z][A-Z_]{2,}\b/)?.[0] || 'NETWORK_ERROR';
    const catalog = window.deadsmileErrors?.[language];
    return catalog?.[code] || catalog?.INTERNAL_ERROR || window.deadsmileErrors?.en?.INTERNAL_ERROR || '';
  }

  function imageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const raw = value.trim();
    if (raw.startsWith('/') && (raw.startsWith('//') || raw.includes('\\') || /[\u0000-\u001f]/.test(raw))) return null;
    try {
      const url = new URL(raw, 'https://deadsmilegames.vercel.app');
      return (raw.startsWith('/') || /^https:\/\//i.test(raw)) && url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }

  async function request(path) {
    const result = await bridge.api({ path, method: 'GET', headers: { 'Accept-Language': language } });
    if (!result?.ok) throw result?.data?.error || { code: 'NETWORK_ERROR' };
    if (result.data?.success !== true || !Object.hasOwn(result.data, 'data')) throw { code: 'INVALID_RESPONSE' };
    return result.data.data;
  }

  function empty(root, key) {
    const node = document.createElement(root.tagName === 'UL' ? 'li' : 'p');
    node.className = 'game-view__empty';
    node.textContent = t(key);
    root.replaceChildren(node);
  }

  function loading(root) {
    root.setAttribute('aria-busy', 'true');
    const node = document.createElement(root.tagName === 'UL' ? 'li' : 'div');
    node.className = 'skeleton game-view__loading';
    node.setAttribute('aria-label', t('loading'));
    root.replaceChildren(node);
  }

  function errorRow(root, error, retry) {
    const node = document.createElement(root.tagName === 'UL' ? 'li' : 'div');
    node.className = 'game-view__row';
    const message = document.createElement('p');
    message.className = 'launcher-error';
    message.setAttribute('role', 'alert');
    message.textContent = failure(error);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn--secondary'; button.textContent = t('retry');
    button.addEventListener('click', retry);
    node.append(message, button); root.replaceChildren(node);
  }

  function row(title, description, state) {
    const node = document.createElement('div'); node.className = 'game-view__row';
    const strong = document.createElement('strong'); strong.textContent = title; node.append(strong);
    if (description) { const p = document.createElement('p'); p.textContent = description; node.append(p); }
    if (state) { const small = document.createElement('small'); small.textContent = state; node.append(small); }
    return node;
  }

  function renderProfile() {
    get('username').textContent = user?.username || '';
    const avatar = get('avatar');
    avatar.textContent = (user?.username || '').slice(0, 1).toUpperCase();
    const url = imageUrl(user?.avatarUrl);
    if (url) {
      const image = document.createElement('img'); image.src = url; image.alt = '';
      image.addEventListener('error', () => { if (avatar.contains(image)) avatar.textContent = (user?.username || '').slice(0, 1).toUpperCase(); }, { once: true });
      avatar.replaceChildren(image);
    }
    get('playing').textContent = running.length ? `${t('playing')}: ${running.map((item) => item.title || '').join(', ')}` : t('none');
  }

  function renderLibrary() {
    const merged = new Map(games.map((game) => [game.id, game]));
    for (const game of running) merged.set(game.id, { ...merged.get(game.id), ...game });
    games = [...merged.values()].filter((game) => validId(game?.id));
    if (!games.some((game) => game.id === selected)) selected = running[0]?.id || games[0]?.id || null;
    get('library-count').textContent = String(games.length);
    const root = get('games');
    root.setAttribute('aria-busy', 'false');
    if (!games.length) { empty(root, 'empty'); return; }
    root.replaceChildren(...games.map((game) => {
      const node = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button'; button.className = 'game-view__game';
      button.setAttribute('aria-pressed', String(game.id === selected));
      const url = imageUrl(game.coverImage);
      if (url) {
        const image = document.createElement('img'); image.src = url; image.alt = ''; image.loading = 'lazy';
        image.addEventListener('error', () => image.remove(), { once: true }); button.append(image);
      }
      const text = document.createElement('span');
      const strong = document.createElement('strong'); strong.textContent = game.title || ''; text.append(strong);
      if (running.some((item) => item.id === game.id)) { const small = document.createElement('small'); small.textContent = t('playing'); text.append(small); }
      button.append(text);
      button.addEventListener('click', () => { if (selected === game.id) return; selected = game.id; renderLibrary(); loadSelection(); });
      node.append(button); return node;
    }));
  }

  async function loadSelection() {
    const version = ++generation;
    const game = games.find((item) => item.id === selected);
    get('achievement-game').textContent = game?.title || '';
    get('cloud-game').textContent = game?.title || '';
    get('achievement-count').textContent = '';
    const achievements = get('items'), saves = get('cloud-list');
    if (!game) {
      empty(achievements, 'select'); empty(saves, 'select');
      achievements.setAttribute('aria-busy', 'false'); saves.setAttribute('aria-busy', 'false'); return;
    }
    const valid = () => !disposed && version === generation && selected === game.id;
    loading(achievements);
    const jobs = [request(`/platform/achievements/${game.id}`).then((items) => {
      if (!valid()) return;
      if (!Array.isArray(items)) throw { code: 'INVALID_RESPONSE' };
      get('achievement-count').textContent = `${items.filter((item) => item.unlocked_at || item.unlockedAt).length} / ${items.length}`;
      if (!items.length) { empty(achievements, 'noAchievements'); return; }
      achievements.replaceChildren(...items.map((item) => {
        const unlocked = Boolean(item.unlocked_at || item.unlockedAt), hidden = item.hidden && !unlocked;
        const node = document.createElement('li');
        const content = row(hidden ? t('hidden') : item.title || item.key, hidden ? '' : item.description, t(unlocked ? 'unlocked' : 'locked'));
        if (unlocked) content.classList.add('unlocked'); node.append(content); return node;
      }));
    }).catch((error) => { if (valid()) errorRow(achievements, error, loadSelection); }).finally(() => { if (valid()) achievements.setAttribute('aria-busy', 'false'); })];
    if (!game.cloudSavesEnabled) { empty(saves, 'disabled'); saves.setAttribute('aria-busy', 'false'); }
    else {
      loading(saves);
      jobs.push(request(`/platform/saves/${game.id}`).then((items) => {
        if (!valid()) return;
        if (!Array.isArray(items)) throw { code: 'INVALID_RESPONSE' };
        if (!items.length) { empty(saves, 'noSaves'); return; }
        saves.replaceChildren(...items.map((item) => {
          const date = Date.parse(item.updated_at || item.updatedAt || '');
          return row(item.slot || '', Number.isFinite(date) ? new Date(date).toLocaleString(language) : '', Number.isSafeInteger(item.revision) ? `${t('revision')}: ${item.revision}` : '');
        }));
      }).catch((error) => { if (valid()) errorRow(saves, error, loadSelection); }).finally(() => { if (valid()) saves.setAttribute('aria-busy', 'false'); }));
    }
    await Promise.all(jobs);
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  }

  async function bootstrap() {
    const version = ++bootGeneration;
    get('refresh').disabled = true;
    get('status').hidden = true;
    if (!games.length) loading(get('games'));
    try {
      const snapshot = await bridge.getOverlayBootstrap();
      if (disposed || version !== bootGeneration) return;
      language = copy[snapshot.language] ? snapshot.language : 'en';
      applyLanguage();
      running = Array.isArray(snapshot.running) ? snapshot.running.filter((game) => validId(game?.id)) : [];
      get('shortcut').textContent = snapshot.gameViewSettings?.label || 'Ctrl + D';
      const results = await Promise.allSettled([request('/auth/me'), request('/library')]);
      if (disposed || version !== bootGeneration) return;
      const [profile, library] = results;
      get('profile-error').hidden = profile.status === 'fulfilled';
      get('library-error').hidden = library.status === 'fulfilled';
      if (profile.status === 'fulfilled') user = profile.value;
      else { user = null; get('profile-error').textContent = failure(profile.reason); }
      if (library.status === 'fulfilled' && Array.isArray(library.value?.items)) games = library.value.items;
      else {
        get('library-error').hidden = false;
        get('library-error').textContent = failure(library.status === 'rejected' ? library.reason : { code: 'INVALID_RESPONSE' });
        if (library.status === 'rejected' && library.reason?.code === 'UNAUTHENTICATED') games = [];
      }
      renderProfile(); renderLibrary(); await loadSelection();
    } catch (error) {
      if (disposed || version !== bootGeneration) return;
      get('status').textContent = failure(error); get('status').hidden = false;
      renderLibrary(); await loadSelection();
    } finally { if (!disposed && version === bootGeneration) get('refresh').disabled = false; }
  }

  function setInteractive(value) {
    if (interactive === value || disposed) return;
    interactive = value;
    Promise.resolve(bridge?.setOverlayInteractive?.(value)).catch(() => {});
  }

  function subscribe(name, callback) {
    const off = bridge?.[name]?.(callback);
    if (typeof off === 'function') cleanups.push(off);
  }

  get('close').addEventListener('click', () => { Promise.resolve(bridge.closeOverlay()).catch((error) => { get('status').textContent = failure(error); get('status').hidden = false; }); });
  get('refresh').addEventListener('click', bootstrap);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') Promise.resolve(bridge.closeOverlay()).catch(() => {}); });
  document.addEventListener('mousemove', (event) => setInteractive(Boolean(event.target instanceof Element && event.target.closest('[data-interactive]'))));
  document.documentElement.addEventListener('mouseleave', () => setInteractive(false));
  subscribe('onGameState', (item) => {
    if (!validId(item?.id)) return;
    running = item.running ? [...running.filter((game) => game.id !== item.id), item] : running.filter((game) => game.id !== item.id);
    renderProfile(); renderLibrary(); loadSelection();
  });
  subscribe('onAchievementUnlocked', (item) => { if (item?.gameId === selected) loadSelection(); });
  subscribe('onGameViewLanguageChanged', (item) => {
    if (!copy[item?.language]) return;
    ++generation; language = item.language; applyLanguage(); bootstrap();
  });
  subscribe('onOverlayShown', () => { document.documentElement.classList.remove('overlay-hiding'); interactive = null; setInteractive(false); bootstrap(); });
  subscribe('onOverlayHiding', () => { document.documentElement.classList.add('overlay-hiding'); setInteractive(false); });
  window.addEventListener('beforeunload', () => { disposed = true; ++generation; ++bootGeneration; cleanups.forEach((off) => off()); });
  applyLanguage();
  if (bridge?.api && bridge?.getOverlayBootstrap) bootstrap();
  else { get('status').textContent = failure({ code: 'SERVICE_UNAVAILABLE' }); get('status').hidden = false; }
})();
