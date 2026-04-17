# EmDash Game Site Generator

Генератор игровых гайд-сайтов на базе [EmDash CMS](https://github.com/emdash-cms/emdash) + Astro.

Ты готовишь папку с SEO-текстами и изображениями → скрипт собирает готовый сайт со всем необходимым.

---

## Быстрый старт

```bash
# 1. Подготовь папку с контентом (см. структуру ниже)

# 2. Запусти генератор
node generate.js --input ./testseo/my-site.gr --output ./sites/my-site.gr

# 3. Перейди в папку сайта и запусти
cd sites/my-site.gr
npm install
npx emdash dev
```

Сайт: `http://localhost:4321`  
Админка: `http://localhost:4321/_emdash/admin`

---

## Структура входной папки

```
my-site.gr/
├── banner.webp          # фон hero-секции (также .jpg / .png)
├── logo.webp            # логотип в шапке (также .jpg / .png)
├── favicon.svg          # иконка вкладки (также .png / .ico)
├── game-bg.webp         # (необязательно) фон для Game Hero блока
├── slide1.webp          # (необязательно) первый промо-баннер
├── slide2.webp          # (необязательно) второй промо-баннер
└── text/
    ├── brend.txt        # (необязательно) партнёрский бренд
    ├── game.txt         # (необязательно) настройки Game Hero блока
    ├── main.txt         # главная страница (обязательно)
    ├── cs2-weapons.txt  # статья-гайд
    ├── bf6-classes.txt  # ещё статья
    ├── ...              # любое количество статей
    ├── seo/             # игнорируется — только для ключевых слов
    ├── authors/
    │   ├── nikos.txt    # страница автора
    │   └── nikos.webp   # фото автора
    └── service/
        ├── about-us.txt
        ├── contacts.txt
        └── privacy-policy.txt
```

---

## Формат .txt файлов

Каждый файл состоит из двух блоков:

```
META-ТЕГИ:
Title: CS2 Οδηγός Όπλων 2026 | CS2 Greece
Description: Πλήρης οδηγός για όλα τα όπλα στο Counter-Strike 2

текст:
<h1>Οδηγός Όπλων CS2</h1>
<p>Πλήρης ανάλυση κάθε όπλου...</p>
```

- `Title` — title тег и мета-заголовок
- `Description` — meta description
- Всё после `текст:` — HTML-контент. `<h1>` автоматически поднимается в hero-секцию страницы.

> **URL страницы определяется именем файла**, а не содержимым. Файл `cs2-weapons.txt` → URL `/cs2-weapons/`. Поле `Slug:` внутри файла игнорируется. Это гарантирует что автоматически сгенерированный контент никогда не создаст неожиданных URL.

Зарезервированные имена (не создают страниц):
- `main.txt` — контент главной страницы
- `brend.txt` — партнёрский бренд
- `game.txt` — настройки Game Hero блока

---

## Формат brend.txt

```
Name: Casino Name
Link: https://casino-affiliate-link.com
```

Или в две строки:
```
Casino Name
https://link.com
```

Если файл отсутствует или пустой — все партнёрские блоки (CTA-баннер, промо-слайды, сайдбар, иконки платёжных методов, compliance-логотипы) скрываются автоматически.

---

## Формат game.txt (Game Hero блок)

Добавь `game.txt` в папку `text/` чтобы включить анимированный hero-блок игры на всех страницах сайта:

```
Game: Aviator
Subtitle: Fly High, Bet Smart, Cash Out at the Perfect Moment
RTP: 97%
MaxWin: 10,000×
Volatility: High
PlayUrl: https://casino-link.com
DemoUrl: https://casino-link.com
PlayLabel: Play Now
DemoLabel: Try Demo Free
AccentColor: #4f8ef7
Multiplier: 1.00
```

Все эти поля редактируются и через админку — без перегенерации сайта.

Для кастомного фона блока положи `game-bg.webp` (или `.jpg` / `.png`) в корень папки сайта.

Если `game.txt` нет — блок отключён (`enabled: false`) и не отображается.

---

## Что делает генератор

1. Парсит все `.txt` файлы из `text/`
2. Собирает `seed.json` со всеми коллекциями EmDash
3. Копирует шаблон сайта
4. Копирует ассеты (`banner`, `logo`, `favicon`, фото авторов, промо-слайды, `game-bg`) в `public/`
5. Записывает `src/brand.json` с данными бренда
6. Патчит `package.json` (имя пакета = имя домена)

---

## Коллекции EmDash

| Коллекция | Что хранит | URL |
|-----------|-----------|-----|
| `pages` | Главная + все статьи | `/`, `/{slug}/` |
| `service_pages` | Служебные страницы | `/{slug}/` |
| `authors` | Авторы | `/authors/{slug}/` |
| `game_hero` | Настройки Game Hero блока | только в админке |

Все коллекции редактируются из `/_emdash/admin`.

---

## Game Hero блок

Анимированный интерактивный блок для игровых страниц — показывается на главной и всех статьях.

**Что отображается:**
- Летящий самолёт по анимированной кривой множителя
- Счётчик множителя (анимируется от 1.00 вверх при каждой загрузке)
- Карточки статистики: RTP, Max Win, Volatility
- Кнопки Play Now и Try Demo Free
- Кастомный фон (загружается через админку или из `game-bg.webp`)
- Акцентный цвет меняет кнопки, glow-эффекты и значения статистики

**Редактирование через админку** (`Game Hero Block`):

| Поле | Описание |
|------|----------|
| Show Hero Block | Вкл/выкл блок без пересборки сайта |
| Game Name | Название игры (большой заголовок) |
| Subtitle | Подпись под названием |
| RTP / Max Win / Volatility | Значения в карточках статистики |
| Play Now URL / Try Demo URL | Ссылки на кнопках (если пусто — берётся ссылка из `brend.txt`) |
| Play Button Text / Demo Button Text | Текст кнопок на любом языке |
| Accent Color | HEX-цвет акцента |
| Background Image URL | Путь к картинке в `public/`, например `/game-bg.webp` |
| Background Image | Загрузи картинку прямо через медиабиблиотеку AdminUI |

Кнопки Play / Demo никогда не покажут 404: если URL не задан явно, используется ссылка из `brend.txt`.

**Фон блока** — три способа (в порядке приоритета):
1. Картинка загружена через Admin → поле `Background Image`
2. Путь прописан вручную → поле `Background Image URL`
3. Файл `game-bg.webp` в корне папки сайта → заполняется автоматически при генерации

---

## Футер

Футер состоит из трёх колонок (название сайта, статьи, служебные страницы) и нескольких дополнительных блоков, которые появляются только когда задан `brend.txt`:

**Иконки платёжных методов** — Visa, Mastercard, BTC, ETH, USDT, SOL, TRX  
**Дисклеймер** — ΠΑΙΞΕ ΥΠΕΥΘΥΝΑ с текстом об ответственной игре  
**Compliance-логотипы** — MGA, BeGambleAware, GamCare, 18+, DMCA Protected

Все SVG-иконки хранятся в `public/icons/` шаблона и копируются в каждый сайт при генерации.

---

## Шаблон сайта

```
template/
├── astro.config.mjs        # Astro + EmDash, output: server, trailingSlash: ignore
├── package.json            # emdash ^0.5.0
├── public/
│   └── icons/              # SVG иконки платёжных методов и compliance-логотипы
└── src/
    ├── brand.json          # генерируется автоматически
    ├── middleware.ts        # подключает EmDash middleware
    ├── live.config.ts      # регистрация коллекций EmDash
    ├── components/
    │   └── GameHero.astro  # анимированный Game Hero блок
    ├── layouts/
    │   └── Base.astro      # шапка, футер, мета-теги, SEO, WebSite schema
    ├── pages/
    │   ├── index.astro     # главная: hero + Game Hero + промо-слайды + статьи
    │   ├── [slug].astro    # страница статьи: TOC + сайдбар + structured data
    │   └── authors/
    │       └── [slug].astro # страница автора с Person schema
    └── styles/
        └── theme.css       # тёмная игровая тема
```

---

## URL и canonical

Все URL генерируются с trailing slash: `cs2-weapons.txt` → `/cs2-weapons/`.

Canonical тег всегда нормализован: даже если браузер зайдёт на `/cs2-weapons` без слэша, canonical в `<head>` будет `/cs2-weapons/`. Это исключает дублирование страниц в индексе Google.

---

## SEO и structured data

На каждой странице автоматически генерируются:

- `WebSite` schema с `SearchAction` (в Base.astro на всех страницах)
- `Article` schema с автором и издателем (на страницах статей)
- `BreadcrumbList` schema (на страницах статей и авторов)
- `Person` schema (на страницах авторов)
- Таблица содержания (TOC) из H2-заголовков — показывается если заголовков 3 и больше

---

## Настройка админки (первый запуск)

При первом открытии `/_emdash/admin` сайт перенаправит на мастер настройки. Создашь аккаунт через Passkey (Touch ID / Face ID).

Добавь `.env` в папку сайта чтобы токены оставались валидными после перезапуска:

```bash
# Сгенерировать секрет
node_modules/.bin/emdash auth secret

# Добавить в .env
echo "EMDASH_AUTH_SECRET=<твой-секрет>" > .env
```

---

## CLI управление контентом

```bash
# Авторизация (device code через браузер)
node_modules/.bin/emdash login --url http://localhost:4321

# Просмотр контента
node_modules/.bin/emdash content list pages
node_modules/.bin/emdash content get pages cs2-weapons-guide

# Изменение статуса
node_modules/.bin/emdash content publish pages cs2-weapons-guide
node_modules/.bin/emdash content unpublish pages cs2-weapons-guide

# Поиск
node_modules/.bin/emdash search "οδηγός"
```

---

## Запуск нескольких сайтов

```bash
cd sites
./start-sites.sh
```

Скрипт убивает порты 4321/4322 и запускает каждый сайт на своём порту.

---

## Тестовые сайты

| Папка | Порт | Домен |
|-------|------|-------|
| `sites/battlefild6.gr` | 4321 | battlefild6.gr |
| `sites/conter-strike2.gr` | 4322 | conter-strike2.gr |

Входные данные: `testseo/battlefild6.gr/` и `testseo/conter-strike2.gr/`

Перегенерация:
```bash
node generate.js --input ./testseo/battlefild6.gr --output ./sites/battlefild6.gr
node generate.js --input ./testseo/conter-strike2.gr --output ./sites/conter-strike2.gr
```
