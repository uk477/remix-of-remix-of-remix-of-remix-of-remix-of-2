## Что меняется

Убираем мгновенное зачисление баланса при клике «Я оплатил». Вместо этого — реальная авто-проверка транзакции по блокчейну: ждём нужное число подтверждений на каждую монету, потом кредитим баланс сами.

Юзер **не** вводит tx hash. Мы сканируем адрес получения и ищем входящий платёж на нужную сумму (±небольшой допуск) в окне 30 минут с момента создания топапа.

## Поток пополнения (новый UX)

```text
[Amount + Coin] → [Pay screen: адрес + сумма + QR + таймер 30:00]
        │
   [Я оплатил] (кнопка не кредитит баланс)
        │
        ▼
[Screen: На проверке]
  • Индикатор ожидания перевода на адрес
  • После обнаружения tx → "Найден платёж: X/Y подтверждений"
  • Прогресс-бар подтверждений, обновление каждые 15–30с
  • Кнопка "В историю" / автозакрытие по успеху
        │
        ├── Успех: баланс +$, статус success, toast + push
        └── Timeout 30 мин без tx: статус declined
```

## Подтверждения по монетам

| Монета | Сеть | Подтверждений | Источник |
|--------|------|----|----------|
| BTC | Bitcoin | 2 | Blockchair |
| LTC | Litecoin | 2 | Blockchair |
| DOGE | Dogecoin | 6 | Blockchair |
| ETH, USDT, USDC | Ethereum ERC-20 | 12 | Blockchair (erc-20) |
| BNB, USDT, USDC | BSC BEP-20 | 15 | Blockchair (bnb-smart-chain) |
| POL | Polygon | 128 | Blockchair (polygon) |
| BASE | Base | 20 | Blockchair (base) |
| TRX, USDT | Tron TRC-20 | 20 | Trongrid public API |
| TON | TON | 1 | toncenter.com (публичный) |
| SOL, USDC | Solana | 32 (finalized) | Solana public RPC |
| XRP | XRPL | 1 (validated) | XRPL data API |
| XMR | Monero | — | приватность → ручное подтверждение в админке |

## База данных

Расширяем `topups`:
- `user_confirmed_at` — когда юзер нажал «Я оплатил»
- `detected_tx_hash`, `detected_amount`, `detected_at`, `confirmations`, `required_confirmations`
- `verifier_state` — `awaiting_user | scanning | detected | confirming | success | declined | manual_required`
- `last_checked_at`, `check_error`

Добавляем функцию `credit_topup(_topup_id)` (SECURITY DEFINER): атомарно ставит `success`, кредитит `profiles.balance`, пишет `balance_transactions`. Не даёт кредитить дважды.

## Серверная логика

Файлы:
- `src/lib/topup-verify.server.ts` — per-chain checkers: `checkBitcoinLike`, `checkEvmNative`, `checkEvmErc20`, `checkTron`, `checkTon`, `checkSolana`, `checkXrp`. Все возвращают `{ txHash, amount, confirmations } | null`.
- `src/lib/topup-verify.functions.ts` — `pollPendingTopups()` server fn (без auth, дергается кроном).
- `src/routes/api/public/topup/poll.ts` — HTTP-эндпоинт для pg_cron (защищён `apikey`).
- Cron: `SELECT cron.schedule('topup-poll','*/1 * * * *', $$…$$)` — раз в минуту.
- `src/lib/topup-user.functions.ts`:
  - `markUserPaid({ topupId })` — auth, ставит `user_confirmed_at`, форсит скан прямо сейчас.
- `src/components/admin/section-commerce.tsx` — очередь топапов с ручным Approve/Decline (для XMR и краевых случаев).

## Фронтенд

- `src/components/screens/topup-screen.tsx`:
  - `confirmPaid` → вызывает `markUserPaid`, переводит в новый stage `verifying`. Больше не трогает баланс.
  - Новая секция «На проверке»: 3D-иконка сканирования, шаги (Ожидаем tx → Найдена → N/M подтверждений), таймер, кнопка «Свернуть» (уходит в историю).
  - Реалтайм: подписка на `topups` через supabase `channel` + fallback polling каждые 15с.
  - На `success` → success-экран с суммой.
- `src/lib/store.tsx`: `updateTopup` больше не форсит `status: success` из клиента; ловит апдейты из реалтайма.

## Технические детали

- Только публичные API, без ключей: Blockchair (bitcoin/litecoin/dogecoin/ethereum/bnb-smart-chain/polygon/base), Trongrid, toncenter, Solana public RPC (`api.mainnet-beta.solana.com`), XRPL (`s1.ripple.com:51234` JSON-RPC). Рейт-лимиты обрабатываем backoff'ом.
- Допуск по сумме: ищем tx с amount_usd в диапазоне [invoiceUsd·0.98, invoiceUsd·1.05] чтоб покрыть колебания курса; сохраняем реальный `detected_amount` (USD по курсу на момент tx).
- Идемпотентность: `credit_topup` проверяет `status <> 'success'` под FOR UPDATE, чтобы двойной вызов не задвоил баланс.
- XMR: `verifier_state = 'manual_required'` сразу, показываем юзеру «Ожидает ручного подтверждения» + приходит уведомление админу.
- Уведомление юзеру в TG на его языке при success/declined (используем существующий `telegram-notify.server.ts`).

## Что после этого

- Баланс никогда не кредитится «на веру».
- Юзер видит живой прогресс подтверждений.
- Ты в админке видишь только те, что реально требуют внимания (XMR / странные суммы).
