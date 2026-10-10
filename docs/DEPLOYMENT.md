# Публикация и развёртывание

## 1. Где живёт сайт

Продакшн: **https://andrey1904-dev.github.io/HavalGarage/**
(GitHub Pages, ветка-источник — сборка из Actions, а не `gh-pages`).

Приложение — статическая SPA. Сборка: Vite, `base: '/HavalGarage/'` только для
`build` (в dev — `/`), см. `vite.config.ts`.

## 2. Workflows

| Файл | Триггер | Что делает |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push в любую ветку, PR | guard на секреты → typecheck → lint → тесты → smoke → сверка с прайс-листами → sitemap → build → артефакт `dist` → проверка размера JS (≤ 3 MiB) |
| `.github/workflows/deploy.yml` | push в `main`, ручной запуск | сборка с `VITE_SITE_URL` → `actions/configure-pages` → `upload-pages-artifact` → `deploy-pages` |
| `.github/workflows/prices.yml` | расписание (пн 06:00 UTC), ручной запуск | проверка доступности официальных прайс-листов, сверка тизеров; при изменении истории — ветка и PR на проверку человеку |

`deploy.yml` использует `enablement: true` — Pages включается при первом
прогоне без ручных настроек репозитория.

## 3. Как попадает в прод

```
ветка → PR → CI (зелёный) → merge в main → deploy.yml → GitHub Pages
```

Публикуется только `main`. Рабочая ветка этой сессии —
`arena/de7fd33e-havalgarage`; чтобы выкатить её, нужен merge (PR) в `main`.

## 4. Сборка локально

```bash
npm ci
npm run build      # tsc -b && vite build → dist/
npm run preview    # локальный просмотр продакшн-сборки
```

Проверить прод-сборку перед публикацией:

```bash
npm run check      # типы, линтер, тесты, smoke, сборка
```

## 5. Переменные окружения

| Переменная | Обязательна | Зачем |
| --- | --- | --- |
| `VITE_SITE_URL` | нет | origin для sitemap/robots; по умолчанию `https://andrey1904-dev.github.io` |
| `VITE_SUPABASE_URL` | нет | БД для заявок на кредит |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | нет | публичный ключ, доступ ограничен RLS |

Без Supabase-переменных приложение работает полностью: формы заявки просто
сообщают, что серверная часть не настроена.

**Секретный ключ (`service_role` / `sb_secret_…`) в репозитории запрещён** —
это проверяет первый шаг CI.

## 6. SPA на Pages: что уже сделано

- `public/404.html` — копия `index.html`; прямой переход на
  `/models/h9` или `/compare` не даёт 404 от GitHub.
- Все внутренние ссылки относительные; `basename` роутера задаётся из `base`.
- `public/robots.txt` и `public/sitemap.xml` генерируются
  `scripts/generate-seo.mjs` (`npm run seo`) по данным каталога; CI падает,
  если `sitemap.xml` устарел.

## 7. Размер бандла

`manualChunks` выносит React, Chart.js и Supabase в отдельные файлы; страницы
и pdfmake загружаются лениво (`React.lazy` + динамический `import`).

Контроль: последний шаг CI суммирует `dist/assets/*.js` и падает при
превышении 3 MiB. pdfmake (~997 kB) и шрифты (~855 kB) — отдельные chunk'и,
которые грузятся только при нажатии «PDF».

## 8. Проверка после публикации

1. Откройте https://andrey1904-dev.github.io/HavalGarage/ — главная.
2. Обновите `/models/jolion` — должна открыться страница модели (SPA-fallback).
3. Откройте `/advisor`, `/sources`, `/trims`.
4. В `docs/REPORT.md` зафиксирован результат предыдущей публикации.

## 9. Откат

GitHub Pages хранит историю деплоев: Actions → «Deploy to GitHub Pages» →
нужный запуск → Re-deploy. Либо откатите коммит в `main` и дождитесь
`deploy.yml`.
