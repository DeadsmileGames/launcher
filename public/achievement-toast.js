(() => {
      'use strict';
      const bridge = window.deadsmile;
      const fallback = {
        en: 'Achievement unlocked',
        'pt-BR': 'Conquista desbloqueada',
        es: 'Logro desbloqueado',
      };
      let lang = 'en';
      let strings = {};
      const $ = (id) => document.getElementById(id);
      const text = (key) => strings?.[key] || (key === 'achievementUnlocked' ? fallback[lang] || fallback.en : key);
      const applyLanguage = () => {
        document.documentElement.lang = lang;
        $('label').textContent = text('achievementUnlocked');
      };
      const render = (payload) => {
        const achievement = payload?.achievement || {};
        $('title').textContent = achievement.title || achievement.key || '';
        const gameTitle = payload?.gameTitle || '';
        $('game').textContent = gameTitle;
        $('game').hidden = !gameTitle;
        const toast = $('toast');
        toast.classList.remove('visible');
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('visible')));
      };
      bridge?.onAchievementUnlocked?.(render);
      bridge?.onGameViewLanguageChanged?.((payload) => {
        if (payload && ['en','pt-BR','es'].includes(payload.language)) lang = payload.language;
        strings = payload?.strings && typeof payload.strings === 'object' ? payload.strings : strings;
        applyLanguage();
      });
      bridge?.getOverlayBootstrap?.().then((bootstrap) => {
        const i18n = bootstrap?.i18n || {};
        if (['en','pt-BR','es'].includes(i18n.language)) lang = i18n.language;
        else if (['en','pt-BR','es'].includes(bootstrap?.language)) lang = bootstrap.language;
        if (i18n.strings && typeof i18n.strings === 'object') strings = i18n.strings;
        applyLanguage();
      }).catch(() => applyLanguage());
      applyLanguage();
    })();
