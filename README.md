# Лабораторная работа 6

React-интерфейс сервиса «Проценты по вкладам», ветка `redux`.
Услуга — расчётный месяц. Реализация уточнена 16 ноября 2026 года:
**9 методов API: 7 через кодогенерацию и thunk, 2 обычным Axios**.
Регистрация и обновление JWT во фронтенде ЛР6 не реализуются.

## Какие методы вызывает приложение

| Способ | Метод и путь | Функция |
| --- | --- | --- |
| Сгенерированный Axios внутри thunk | `GET /api/deposit-months` | `getDepositMonths` |
| Сгенерированный Axios внутри thunk | `GET /api/deposit-months/feed` | `getDepositMonthFeed` |
| Сгенерированный Axios внутри thunk | `GET /api/deposit-months/draft` | `getDepositMonthDraft` |
| Сгенерированный Axios внутри thunk | `POST /api/deposit-months` | `createDepositMonthDraft` |
| Сгенерированный Axios внутри thunk | `PUT /api/deposit-months/draft` | `publishDepositMonthDraft` |
| Сгенерированный Axios внутри thunk | `DELETE /api/deposit-months/{id}` | `deleteDepositMonth` |
| Сгенерированный Axios внутри thunk | `POST /api/deposit-months/{id}/like` | `setDepositMonthLike` |
| Обычный Axios в компоненте, без thunk | `POST /api/users/authentication` | Вход |
| Обычный Axios в компоненте, без thunk | `POST /api/users/deauthentication` | Выход |

Это 9 разных методов, а не ограничение общего количества HTTP-запросов:
список, лента и остальные методы могут вызываться повторно.
Изображения и видео загружаются браузером через S3 proxy отдельно от этих
девяти методов веб-сервиса. Собственных вызовов `fetch` в приложении нет.

## Кодогенерация по документации ЛР4

Библиотеки `axios` и `swagger-typescript-api` записаны в `package.json`.
`openapi/swagger.json` — исходный файл документации Go из ЛР4. Он сохраняется
целиком: регистрация и refresh на бэкенде ЛР4 продолжают существовать.
Скрипт выбирает из него только 7 операций `deposit-months` и необходимые
для них модели; промежуточный Swagger-файл не создаётся.

```powershell
Copy-Item ..\web_backend_percentage\docs\swagger.json .\openapi\swagger.json
npm.cmd run generate-backend-types
```

Команда запускает `scripts/generate-backend-types.mjs` с
`httpClientType: 'axios'` и `generateClient: true`. Получаются **методы и
интерфейсы**, а не только типы. Результат — `src/api/generated/Api.ts`.
Он не редактируется вручную. В нём нет группы `users` и методов входа,
выхода, регистрации или refresh. Вход и выход написаны вручную в `App.tsx`;
тип используемых полей ответа входа также описан вручную в `api/tokens.ts`.

Путь вызова услуг:
компонент → `dispatch` → `createAsyncThunk` → сгенерированный Axios-метод →
`extraReducers` → обновление интерфейса через `useSelector`.

## Состояния Redux

- `auth.isAuthenticated`: **0 — гость, 1 — пользователь**. Данные пользователя,
  состояние запроса входа/выхода и ошибки находятся в `authSlice.ts`.
- `is_liked` и `is_creator` карточек также хранятся в Redux как `0 | 1`.
- `filters.selected` и `filters.applied` содержат выбранный и применённый
  диапазоны дней. Переходы страниц сохраняют фильтр; выход сбрасывает 28–31.
- `depositMonths` хранит плитку, запись ленты, черновик, загрузку и ошибки.
  Запросы обрабатываются через `pending`, `fulfilled`, `rejected`.

В localStorage сохраняются только JWT. После F5 Redux начинается с гостя,
а токены остаются в Application. Автовхода и автоматического refresh нет.
Публичные запросы гостя идут без Authorization даже при сохранённом JWT.
При входе и выходе компонент вручную передаёт обычное действие в Redux.
При явном выходе удаляются JWT; сервер отзывает сессию через Redis.

## Интерфейс и proxy

Четыре страницы: плитка `/deposit_month/list`, лента `/deposit_month`,
добавление `/deposit_month/draft`, вход `/login`. Фильтр 28–31 отправляется
на сервер как `min_days_count` и `max_days_count`. Добавление состоит из
создания черновика с изображением/видео и публикации с полями месяца.
Предусмотрены предпросмотр медиа, удаление своих карточек и лайки.

Во время запросов анимация блокирует кнопки, поля и навигацию. При
недоступности API mock применяется только для гостевого чтения плитки/ленты.
Ошибки входа, прав, отсутствующей записи и изменения данных не маскируются.

В `vite.config.ts` два маршрута: `/api` к Go и `/s3` к MinIO.
`api/media.ts` сохраняет bucket и имя файла при преобразовании URL в `/s3`.
У изображений и видео есть локальные заглушки при ошибке загрузки.

Дополнение для текущего окружения: новые медиа находятся в закрытом bucket
MinIO. Локальный Vite proxy подписывает GET/HEAD для генерируемых имён
изображений и видео. Для этого используются серверные настройки `MINIO_*`
из `.env` соседнего Go-проекта. Ключи не передаются в браузер или сборку;
политика bucket не меняется. Это техническая настройка S3 proxy, отсутствующая
в простом примере методички. Обычный анонимный proxy к этому bucket даёт 403.
Настройки несекретных адресов и пути к Go-проекту — в `.env.example`.

## Структура

```text
openapi/swagger.json                 исходная документация ЛР4
scripts/generate-backend-types.mjs   генерация семи методов и моделей
src/
  api/generated/Api.ts              сгенерированный Axios-клиент
  api/index.ts                      экземпляры Axios и обработка ошибок
  api/tokens.ts                     ручной тип ответа входа и JWT
  api/media.ts                      преобразование адресов MinIO
  state/authSlice.ts                состояние 0/1 и пользователь
  state/filtersSlice.ts             фильтр
  state/depositMonthsSlice.ts       семь thunk и данные месяцев
  state/store.ts                   хранилище и middleware
  state/hooks.ts                   типизированные Redux-хуки
  data/deposit_months.ts            mock из ЛР5
  App.tsx                          страницы и меню
  main.tsx                         Provider и точка входа
  deposit_month.css                оформление ЛР5 и ЛР6
  vite-env.d.ts                    типы окружения Vite
tests/lab6.test.ts                  проверки, не код приложения
```

`node_modules` и `dist` — зависимости и результат сборки, они исключены из
Git. `.idea` — существующие настройки GoLand из ЛР5, приложение их не
использует. Дублирующий CSS и старая команда генерации удалены.

## Запуск и проверка

В Go-проекте запустить `.\scripts\start-lab4.ps1`, затем во фронтенде:

```powershell
npm.cmd ci
npm.cmd run generate-backend-types
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Открыть `http://127.0.0.1:3000/deposit_month/list`.
16 ноября: генерация семи методов, 18 тестов и сборка прошли успешно.
Отдельно проверены отсутствие группы `users` в generated-клиенте и числовые
переходы состояния Redux 0 → 1 → 0. Диаграмма прецедентов и полный набор
скриншотов защиты остаются следующими этапами ЛР6.

Методички: [Redux Toolkit](https://github.com/iu5git/Web/blob/main/tutorials/redux/redux_toolkit.md),
[кодогенерация и Axios](https://github.com/iu5git/Web/blob/main/tutorials/lab7/README.md).
Для входа/выхода применяется уточнение преподавателя: два ручных
Axios-запроса, хотя в связанном примере методички показан thunk.
