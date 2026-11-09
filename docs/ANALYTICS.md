# Analitika

MVP'da hodisalar telefonda saqlanadi (`state.events`, oxirgi 500 tasi; [`src/lib/store.tsx`](../src/lib/store.tsx)). Server qo'shilganda shu nomlar bilan analitika xizmatiga (masalan, PostHog yoki Amplitude) yuboriladi.

## Hodisalar

| Hodisa | Qachon | Xususiyatlar |
|---|---|---|
| `onboarding_completed` | Daraja natijasi ekranida «Boshlash» | `level`, `dailyNew`, `deckId` |
| `group_completed` | 5 so'zlik guruh tugadi | `words`, `writtenCorrect` |
| `card_reviewed` | Takrorlashda baho berildi | `grade`, `stage` |
| `relearning_completed` | Qayta yodlash tugadi | `words` |
| `words_saved` | Qo'lda yoki matndan so'z saqlandi | `count` |
| `deck_added` / `deck_removed` | To'plam qo'shildi / olib tashlandi | `deckId` |
| `daily_goal_changed` | Kunlik maqsad o'zgardi | `dailyNew` |
| `game_finished` | O'yin tugadi | `game`, `score`, `rounds` |

Kunlik yig'indilar `state.log[kun]` da: `newLearned`, `reviewed`, `correct`, `total`.

## Asosiy ko'rsatkichlar

| Ko'rsatkich | Hisoblash |
|---|---|
| D1 / D7 / D30 qaytish | `onboarding_completed` dan keyin 1/7/30-kunda `log` da faollik bormi |
| Kunlik reja bajarilishi | `newLearned ≥ dailyNew` va vaqti kelgan takrorlashlar 0 ga tushgan kunlar ulushi |
| To'g'ri eslash | `card_reviewed` da `good` + `easy` / jami |
| Yozish aniqligi | `group_completed.writtenCorrect / words` |
| Unutish darajasi | `card_reviewed` da `again` / jami, bosqichlar kesimida |
| Matndan saqlash | haftasiga `words_saved.count` |
| Streak taqsimoti | ketma-ket faol kunlar |

## Birinchi sinovda javob topiladigan savollar

1. Foydalanuvchilar yozish bosqichini tugatadimi yoki o'rtada chiqib ketadimi?
2. Assotsiatsiyali so'zlar assotsiatsiyasizlarga qaraganda yaxshiroq eslanadimi? (`card_reviewed` ni so'zda `association` borligi bo'yicha solishtirish)
3. Kunlik 10 / 20 / 30 maqsadlardan qaysi biri eng yaxshi qaytishni beradi?
4. Matndan so'z saqlaganlar ko'proq qaytadimi?
