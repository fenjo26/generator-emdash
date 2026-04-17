# Game Site Generator

Генератор игровых гайд-сайтов. Читает папку с SEO-текстами и изображениями → собирает готовый **статический Astro-сайт**.

Никакой БД. Никакого CMS-сервера. Просто JSON + Astro → HTML.

---

## Структура входной папки

```
my-site.gr/
├── banner.webp          # фон hero-секции (также .jpg / .png)
├── logo.webp            # логотип в шапке (также .jpg / .png)
├── favicon.svg          # иконка вкладки (также .png / .ico)
├── game-bg.webp         # (необязательно) фон Game Hero блока
├── slide1.webp          # (необязательно) первый промо-баннер
├── slide2.webp          # (необязательно) второй промо-баннер
└── text/
    ├── brend.txt        # (необязательно) партнёрский бренд
    ├── game.txt         # (необязательно) настройки Game Hero блока
    ├── main.txt         # главная страница (обязательно)
    ├── cs2-weapons.txt  # статья → /cs2-weapons/
    ├── bf6-classes.txt  # статья → /bf6-classes/
    ├── ...
    ├── seo/             # игнорируется — только для ключевых слов
    ├── authors/
    │   ├── nikos.txt    # страница автора → /authors/nikos/
    │   └── nikos.webp   # фото автора
    └── service/
        ├── about-us.txt       # → /about-us/
        ├── contacts.txt       # → /contacts/
        └── privacy-policy.txt # → /privacy-policy/
```

---

## Формат .txt файлов

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
- `текст:` — HTML-контент. `<h1>` автоматически поднимается в hero-секцию.

> **URL определяется именем файла**, а не содержимым. `cs2-weapons.txt` → `/cs2-weapons/`. Поле `Slug:` внутри файла игнорируется.

Зарезервированные имена (не создают страниц): `main.txt`, `brend.txt`, `game.txt`

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

Если файла нет — все партнёрские блоки (CTA-баннер, промо-слайды, сайдбар, платёжные иконки, compliance-логотипы) скрываются автоматически.

---

## Формат game.txt

Добавь `game.txt` в папку `text/` чтобы включить анимированный Game Hero блок:

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
```

Если `game.txt` нет — блок не отображается. Если нет `PlayUrl`/`DemoUrl` — используется ссылка из `brend.txt`.

Для кастомного фона положи `game-bg.webp` (или `.jpg` / `.png`) в корень папки.

---

## Что делает генератор

1. Парсит все `.txt` файлы из `text/`
2. Записывает `src/data/*.json` — данные сайта (страницы, авторы, настройки)
3. Копирует шаблон Astro
4. Копирует ассеты в `public/` (banner, logo, favicon, фото авторов, слайды, game-bg)
5. Записывает `robots.txt` с ссылкой на sitemap
6. Прописывает реальный домен в `astro.config.mjs`

---

## Шаблон сайта

```
template/
├── astro.config.mjs         # static output, trailingSlash: always
├── package.json             # только astro (~5 MB node_modules)
├── public/
│   └── icons/               # SVG иконки (платёжные методы, compliance)
└── src/
    ├── brand.json           # генерируется (бренд + название сайта)
    ├── data/                # генерируется (JSON данные контента)
    │   ├── pages.json
    │   ├── service_pages.json
    │   ├── authors.json
    │   └── game_hero.json
    ├── components/
    │   └── GameHero.astro   # анимированный Game Hero блок
    ├── layouts/
    │   └── Base.astro       # шапка, футер, мета-теги, SEO
    ├── pages/
    │   ├── index.astro      # главная
    │   ├── [slug].astro     # статьи и служебные страницы
    │   ├── sitemap.xml.js   # автогенерация sitemap
    │   └── authors/
    │       └── [slug].astro # страницы авторов
    └── styles/
        └── theme.css        # тёмная игровая тема
```

---

## Game Hero блок

Анимированный блок — летящий самолёт, счётчик множителя, статистика игры.

| Поле в game.txt | Описание |
|-----------------|----------|
| `Game` | Название игры |
| `Subtitle` | Подпись под названием |
| `RTP` / `MaxWin` / `Volatility` | Статистика в карточках |
| `PlayUrl` / `DemoUrl` | Ссылки на кнопках (fallback: `brend.txt`) |
| `PlayLabel` / `DemoLabel` | Текст кнопок |
| `AccentColor` | HEX акцентного цвета |
| `game-bg.webp` (файл) | Фон секции |

---

## Футер

Футер содержит три колонки (сайт, статьи, служебные страницы). Блоки ниже появляются только когда задан `brend.txt`:

- Иконки платёжных методов — Visa, Mastercard, BTC, ETH, USDT, SOL, TRX
- Дисклеймер — ΠΑΙΞΕ ΥΠΕΥΘΥΝΑ
- Compliance-логотипы — MGA, BeGambleAware, GamCare, 18+, DMCA

SVG-иконки в `public/icons/`, автоматически копируются в каждый сайт.

---

## SEO

Каждая страница генерирует:

- `<title>`, `<meta description>`, canonical с trailing slash
- `WebSite` schema с `SearchAction` (все страницы)
- `Article` + `BreadcrumbList` schema (статьи)
- `Person` + `BreadcrumbList` schema (авторы)
- TOC из H2-заголовков (если ≥ 3 заголовков)
- `/sitemap.xml` — автоматически из всех страниц
- `/robots.txt` — с ссылкой на sitemap

---

## Деплой на VPS (Hestia CP)

Генератор живёт прямо на сервере. Контент сайта лежит в подпапке `public_html/DOMAIN/`, а собранный сайт выходит в `public_html/`:

```
/home/work/web/topo-mole.gr/
└── public_html/
    ├── topo-mole.gr/        ← сюда кладёшь txt + картинки (входные данные)
    │   ├── banner.webp
    │   ├── slide1.webp
    │   └── text/
    │       ├── main.txt
    │       ├── brend.txt
    │       └── ...
    ├── index.html           ← это генерируется автоматически (dist/)
    ├── banner.webp
    └── assets/
```

**Установка генератора на сервер (один раз):**

```bash
# Клонируй репо или закинь папку generator/ на сервер
cd /home/work/generator
npm install   # устанавливает только node зависимости генератора
```

**Сборка одного сайта:**

```bash
bash /home/work/generator/server-build.sh topo-mole.gr
```

Скрипт сам:
1. Читает `/home/work/web/topo-mole.gr/public_html/topo-mole.gr/`
2. Генерирует Astro-сайт во временную папку `/tmp/site-build/topo-mole.gr/`
3. Запускает `npm install` + `npm run build`
4. Кладёт содержимое `dist/` в `public_html/`, не трогая исходную подпапку

**Сборка всех сайтов сразу:**

```bash
# Все домены в /home/work/web/ у которых есть text/main.txt
bash /home/work/generator/server-build-all.sh

# Конкретные домены
bash /home/work/generator/server-build-all.sh topo-mole.gr avia-master.gr avia-fly2.gr
```

**Автоматическая пересборка по расписанию (cron):**

```bash
crontab -e
# Пересобирать все сайты каждую ночь в 3:00
0 3 * * * bash /home/work/generator/server-build-all.sh >> /home/work/build.log 2>&1
```

---

## Тестовые сайты

| Папка | Порт |
|-------|------|
| `sites/battlefild6.gr` | 4321 |
| `sites/conter-strike2.gr` | 4322 |

Перегенерация:
```bash
node generate.js --input ./testseo/battlefild6.gr --output ./sites/battlefild6.gr
node generate.js --input ./testseo/conter-strike2.gr --output ./sites/conter-strike2.gr
```
