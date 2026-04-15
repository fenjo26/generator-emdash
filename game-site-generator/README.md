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
└── text/
    ├── brend.txt        # (необязательно) партнёрский бренд
    ├── main.txt         # главная страница (обязательно)
    ├── cs2-weapons.txt  # статья-гайд
    ├── bf6-classes.txt  # ещё статья
    ├── ...              # любое количество статей
    ├── authors/
    │   ├── nikos.txt    # страница автора
    │   └── nikos.webp   # фото автора
    └── service/
        ├── about-us.txt
        ├── contacts.txt
        └── privacy-policy.txt
```

> Папка `text/seo/` игнорируется генератором — туда можно складывать файлы для ключевых слов.

---

## Формат .txt файлов

Каждый файл состоит из двух блоков:

```
META-ТЕГИ:
Title: CS2 Οδηγός Όπλων 2026 | CS2 Greece
Description: Πλήρης οδηγός για όλα τα όπλα στο Counter-Strike 2
Slug: cs2-weapons-guide

текст:
<h1>Οδηγός Όπλων CS2</h1>
<p>Πλήρης ανάλυση κάθε όπλου...</p>
...
```

- `Title` — title тег страницы и мета-заголовок
- `Description` — meta description
- `Slug` — URL страницы (`/cs2-weapons-guide/`)
- Всё после `текст:` — HTML-контент страницы. `<h1>` из него автоматически поднимается в hero-секцию.

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

Если файл отсутствует или пустой — все партнёрские блоки скрываются автоматически.

---

## Что делает генератор

1. Парсит все `.txt` файлы из папки `text/`
2. Собирает `seed.json` с коллекциями EmDash (`pages`, `service_pages`, `authors`)
3. Копирует шаблон сайта
4. Копирует ассеты (`banner`, `logo`, `favicon`, фото авторов) в `public/`
5. Записывает `src/brand.json` с данными партнёрского бренда

---

## Запуск нескольких сайтов

В папке `sites/` есть скрипт для запуска нескольких сайтов одновременно:

```bash
cd sites
./start-sites.sh
```

Скрипт убивает порты 4321/4322 и запускает каждый сайт на своём порту.

---

## Коллекции EmDash

| Коллекция | Что хранит | URL |
|-----------|-----------|-----|
| `pages` | Главная + все статьи | `/`, `/{slug}/` |
| `service_pages` | Служебные страницы | `/{slug}/` |
| `authors` | Авторы | `/authors/{slug}/` |

---

## Шаблон сайта

```
template/
├── astro.config.mjs        # Astro + EmDash, output: server, trailingSlash: ignore
├── package.json
├── src/
│   ├── brand.json          # генерируется автоматически
│   ├── middleware.ts        # подключает EmDash middleware
│   ├── live.config.ts       # регистрация коллекций EmDash
│   ├── layouts/
│   │   └── Base.astro       # шапка, футер, мета-теги, SEO
│   ├── pages/
│   │   ├── index.astro      # главная: hero + SEO-контент + сетка статей
│   │   ├── [slug].astro     # страница статьи с сайдбаром
│   │   └── authors/
│   │       └── [slug].astro # страница автора
│   └── styles/
│       └── theme.css        # тёмная игровая тема
└── public/                  # сюда копируются ассеты при генерации
```

---

## Настройка админки (первый запуск)

При первом открытии `/_emdash/admin` сайт автоматически перенаправит на мастер настройки. Создашь аккаунт через Passkey (Touch ID / Face ID).

Добавь `.env` в папку сайта чтобы токены оставались валидными после перезапуска:

```bash
# Сгенерировать секрет
node_modules/.bin/emdash auth secret

# Добавить в .env
echo "EMDASH_AUTH_SECRET=<твой-секрет>" > .env
```

---

## CLI управление контентом

После входа через `emdash login` можно управлять контентом из терминала:

```bash
# Авторизация
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
