# Known Issues

## v0.3.0 — Rename: mini-kode → Sara

- **Status**: ✅ Resolved
- **Changes**: package.json (name, bin, repo), env vars (`SARA_*`), config dir (`~/.sara`), project dir (`.sara`), all 59 files renamed
- **CLI**: `sara` вместо `mini-kode`

## [Fixed] Bug 5: Resize терминала дублирует поле ввода

**Root cause:** `useTerminalWidth` подписывался на `stdout.on("resize", ...)` через Ink-контекст — это **второй** resize-обработчик поверх встроенного в Ink 6. При resize:

1. Ink вызывает `resized()` → `onRender()` (первый рендер)
2. Наш хук → `setWidth()` → React state update → reconciler → `onRender()` (второй рендер)

Два вывода через `log-update` в одном цикле событий приводили к рассинхронизации курсора. При смене ширины `eraseLines(previousHeight)` не совпадал с актуальной высотой → оставался «хвост» от первого вывода.

**Fix:** Переписан `src/ui/hooks/useTerminalWidth.ts`:

- Полностью убран отдельный resize-слушатель. Ink уже вызывает полный React-рендер при resize (через `onRender`).
- Теперь это просто: `const { stdout } = useStdout(); return stdout?.columns ?? 80;`
- Никаких модульных переменных, подписок, `useSyncExternalStore` или `queueMicrotask`.

## [Fixed] Bug 4: UPDATE_STREAMING_MESSAGE: Cannot update message with terminal status 'complete'

**Root cause:** `streamChatCompletion()` в `client.ts` после первого `finishReason` продолжал yield-ить чанки (`content || finishReason !== null || parsedToolCalls.length > 0`). Каждый последующий чанк с `finishReason` шёл с `isComplete: true`. Редуктор аппендил дубликат, а на следующем стриминг-обновлении падал.

**Fix:** Добавлен флаг `hasYieldedComplete` — `isComplete: true` выдаётся только один раз. После complete генератор тихо дренирует оставшиеся чанки без yield.

**Изменённый файл:** `src/llm/client.ts`

## [Fixed] Bug 3: "Message validation failed: missing tool messages"

**Root cause:** При ошибке выполнения инструмента `toOpenAIMessages()` генерировал assistant с `tool_calls`, но без соответствующих `tool` сообщений. Валидация падала.

**Fix:** Санитизация в `toOpenAIMessages()` — orphan tool messages удаляются, assistant с tool_calls заполняются placeholder-ами.

**Изменённый файл:** `src/sessions/types.ts`

## [Fixed] Bug 2: Resize терминала дублирует UI (первая версия фикса)

Был пофиксен через `useSyncExternalStore`, затем переписан в Bug 5.

## [Fixed] Bug 1: Дубликат сообщений (● появлялся дважды)

**Root cause:** Условие `content || finishReason !== null || parsedToolCalls.length > 0` в стриминге.

**Fix:** `hasYieldedComplete` флаг + защита в редукторе `COMPLETE_LLM_MESSAGE`.

---

## Fixed: Конфигурация OpenCode Zen

**Проблема:** `OPENCODE_API_KEY` не авто-детектился в `loadFromEnvironment()`, в отличие от `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `GLM_API_KEY`.

**Fix:** Добавлен `API_PRESETS.opencode` и проверка `OPENCODE_API_KEY` в `loadFromEnvironment()`.

**Файл:** `src/config/manager.ts`

---

## Fixed: Цвета diff (фон вместо текста)

**Проблема:** Добавленные/удалённые строки в diff имели `backgroundColor` вместо `color`.

**Fix:** Заменено на `color` (зелёный/красный текст без фона).

**Файл:** `src/ui/components/tool-views/FileEditResultView.tsx`

---

## Fixed: Тяжёлая точка ● заменена на •

**Замена:** `●` (U+25CF) → `•` (U+2022) во всех UI-компонентах (TextMessage, ToolMessage, CommandMessage, MCPDetailView, HelpBar).

---

## Новые фичи (эта сессия)

| Фича              | Описание                                                   | Файлы                                                                                  |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Error Boundary    | Защита от крашей UI                                        | `src/ui/components/ErrorBoundary.tsx`, `Layout.tsx`                                    |
| `/help` команда   | Список всех команд в чате                                  | `src/ui/commands/helpCommand.ts`, `command.types.ts`, `index.ts`, `CommandMessage.tsx` |
| Маскировка ключей | API ключи скрыты `*` при вводе                             | `src/ui/components/KeyInput.tsx`                                                       |
| SIGINT handler    | Graceful shutdown MCP при Ctrl+C                           | `src/cli.ts`                                                                           |
| Models fallback   | Встроенный список провайдеров при недоступности models.dev | `src/models/registry.ts`                                                               |
| PromptInput test  | Починены 3 падающих теста                                  | `src/ui/components/PromptInput.test.tsx`                                               |
