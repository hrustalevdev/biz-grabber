# biz-grabber

## Описание

Утилита пробегается по колонке `ИНН`, предоставленного `.xlsx` файла, и по каждому ИНН обращается в сервис  `dadata` за сведениями об организации. На данный момент - это сведения о статусе организации - `активна`, `ликвидирована` и т.п. Полученные данные сохраняются в отдельный `.xlsx` файл.

## Установка

```shell
npm i
```

## Использование

1. Установите [node.js](https://nodejs.org/en).
2. Добавьте папку `input` на одном уровне (т.е. рядом) с папкой `dist`.
3. Разместите исходный `.xlsx` файл в папке `input`.
   * Файл **строго** должен содержать в 4-й колонке (`D`) ИНН организаций.
4. Находясь в папке с программой запустить скрипт:

   ```shell
   npm run grab
   ```
   либо
   
   ```shell
   node dist
   ```

   По умолчанию данный скрипт делает одновременно 30 запросов к сервису. При возникновении ошибок, связанных с количеством единовременных обращений к серверу (`HTTP 429 Too Many Requests`), можно попробовать запустить скрипт понизив количество одновременных запросов. За это отвечает переменная `GRAB_SIZE`, т.е. запустить скрипт таким образом:

   ```shell
   GRAB_SIZE=15 npm run grab
   ```

   Диапазон значений переменной `GRAB_SIZE` от 1 до 1000. Значения вне данного диапазона не будут восприняты и скрипт запуститься со значением по умолчанию.
5. После выполнения скрипта, рядом с папкой `dist` появится папка `output`, в данной папке будет находиться `.xlsx` файл с результатом.
