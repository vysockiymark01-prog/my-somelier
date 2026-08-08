# Мой сомелье 🍸

PWA-приложение с рецептами напитков, голосом бариста (озвучка рецепта мягким
баритоном через Web Speech API) и социальными функциями — друзья и
приглашения на вечеринки.

## Стек

- React + TypeScript + Vite
- `vite-plugin-pwa` — манифест, service worker, офлайн-кэш
- `react-router-dom` — навигация
- `zustand` — состояние авторизации
- `@supabase/supabase-js` — бэкенд для друзей и вечеринок (auth, база данных)
- Web Speech API (`speechSynthesis`) — озвучка рецептов

## Быстрый старт

```bash
npm install
npm run dev
```

Каталог рецептов и озвучка работают сразу, без какой-либо настройки.
Друзья и вечеринки требуют подключения Supabase (см. ниже) — без него
соответствующие вкладки покажут понятное сообщение вместо ошибки.

## Настройка Supabase (друзья, вечеринки)

1. Зарегистрируйтесь на [supabase.com](https://supabase.com) и создайте
   новый проект (бесплатного тарифа достаточно).
2. В Project Settings → API скопируйте **Project URL** и **anon public key**.
3. Создайте файл `.env` на основе `.env.example` и вставьте туда эти значения:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxx
   ```
4. В Supabase Dashboard откройте SQL Editor → New query, вставьте содержимое
   файла [`supabase/schema.sql`](./supabase/schema.sql) и выполните — это
   создаст таблицы `profiles`, `friendships`, `parties`, `party_guests` и
   политики Row Level Security.
5. В Authentication → Providers включите Email (Magic Link/OTP уже включён
   по умолчанию) — вход в приложении происходит по ссылке на почту, без
   пароля.
6. Перезапустите `npm run dev` — вкладки «Друзья» и «Вечеринки» заработают.

## Голос бариста

Используется браузерный `speechSynthesis`. Приложение автоматически
пытается выбрать самый подходящий «мужской баритон» из голосов, доступных в
операционной системе пользователя, и дополнительно понижает pitch. Список
голосов и их качество зависят от устройства и ОС — на Windows/Android
голоса обычно богаче, чем в headless-браузерах.

Если хочется гарантированно качественного голоса «мягкий баритон» —
рекомендуем позже подключить AI-TTS (например, ElevenLabs): достаточно
заменить реализацию `src/lib/voice.ts` на вызов API, который возвращает
аудио-файл, и воспроизводить его через `<audio>`.

## Сборка

```bash
npm run build
npm run preview   # локальный просмотр production-сборки
```

Собранные файлы попадают в `dist/`.

## Публикация как приложение через PWABuilder

1. Задеплойте `dist/` на любой хостинг с HTTPS: [Vercel](https://vercel.com),
   [Netlify](https://netlify.com), [Cloudflare Pages](https://pages.cloudflare.com)
   или GitHub Pages. Проще всего — подключить этот GitHub-репозиторий к
   Vercel/Netlify: они сами соберут проект по команде `npm run build` и
   опубликуют `dist/`.
2. Откройте [pwabuilder.com](https://www.pwabuilder.com), вставьте адрес
   вашего задеплоенного сайта и нажмите Start.
3. PWABuilder проверит манифест и service worker (они уже настроены в этом
   проекте через `vite-plugin-pwa`) и предложит скачать пакеты для:
   - **Android** (Trusted Web Activity, .aab для Google Play)
   - **iOS** (проект для Xcode / App Store)
   - **Windows** (.msix для Microsoft Store)
4. Для публикации в Google Play/App Store/Microsoft Store далее нужны
   аккаунты разработчика в соответствующих магазинах — это делается уже
   вручную через кабинеты разработчика.

## Структура проекта

```
src/
  data/recipes.ts       — каталог рецептов
  lib/voice.ts           — озвучка рецепта (Web Speech API)
  lib/supabase.ts        — клиент Supabase
  lib/social.ts           — друзья и вечеринки (запросы к БД)
  store/auth.ts           — авторизация (zustand)
  pages/                   — экраны приложения
  components/              — переиспользуемые UI-компоненты
supabase/schema.sql        — SQL-схема базы данных и RLS-политики
scripts/gen_icons.py       — генератор иконок для PWA-манифеста
```
