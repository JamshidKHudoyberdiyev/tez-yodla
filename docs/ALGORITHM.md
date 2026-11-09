# Takrorlash algoritmi

Kod: [`src/lib/srs.ts`](../src/lib/srs.ts) · Testlar: [`src/lib/srs.test.ts`](../src/lib/srs.test.ts)

## Holatlar

```
new ──(guruh tugadi)──▶ review ──(30 kunlikdan o'tdi)──▶ mastered
                          ▲   │                              │
                          │   └──(unutildi)──▶ relearning ◀──┘
                          └──(qayta yodlash tugadi)──┘
```

| Holat | Ma'nosi |
|---|---|
| `new` | Hali o'rganilmagan |
| `review` | Takrorlash rejasida, `stage` bosqichida |
| `relearning` | Unutildi, shu kuni qayta yodlanishi kerak |
| `mastered` | Yodlangan, 90 kunda bir nazorat |

## Oraliqlar

`INTERVALS = [1, 3, 7, 14, 30]` kun. `stage` — joriy oraliq indeksi.

| Bosqich | Keyingi takrorlash | Takrorlash shakli |
|---|---|---|
| 0 | 1 kun | Kartochka: ko'rib eslash |
| 1 | 3 kun | Yozma: tarjimadan yozish |
| 2 | 7 kun | Gap ichida: bo'sh joyni to'ldirish (misol gap bo'lmasa — yozma) |
| 3 | 14 kun | Eshitib yozish |
| 4 | 30 kun | Kartochka: tez eslash |
| mastered | 90 kun | Kartochka |

## Baholar

| Baho | Qachon | Natija |
|---|---|---|
| `again` | «Qayta» yoki yozishda 2+ harf xato | `relearning`, `stage − 1`, `lapses + 1`, bugun qayta yodlanadi |
| `hard` | «Qiyin», yozishda 1 harf xato yoki yordam ishlatildi | `stage` o'zgarmaydi, oraliq × 0.5 (kamida 1 kun) |
| `good` | «Yaxshi» yoki to'g'ri yozildi | `stage + 1` |
| `easy` | «Oson» | `stage + 2` |

Yozma javob avtomatik baholanadi (`gradeTyped`): to'liq mos → `good`, Levenshtein masofasi 1 → `hard`, aks holda → `again`.

## Yangi so'zlar

- Kunlik limit (`dailyNew`: 10 / 20 / 30) gacha so'z olinadi, foydalanuvchi o'zi saqlagan so'zlar birinchi.
- So'zlar **5 tadan guruhga** bo'linadi (`GROUP_SIZE`).
- Har bir guruh 5 bosqich: Tanishish (flesh-karta) → Eslash (bilmaganlari navbat oxiriga qaytadi) → Test (so'z tepada, 4 ta tarjima varianti; 2 tasi guruhdagi boshqa so'zlardan, qolgani shu to'plamdan; xato topilgani guruh oxirida yana bir marta so'raladi) → Moslash (5 so'z ↔ 5 aralash tarjima; noto'g'ri juft xato hisoblanadi; 3 tadan kam so'zli guruhda o'tkazib yuboriladi) → Yozish (xato yozilgani guruh oxirida yana bir marta so'raladi).
- Test, Moslash yoki Yozishda birinchi urinishda xato qilingan so'z guruh natijasida «qiyinroq» deb ko'rsatiladi.
- Guruh natijasi: har bir so'zning keyingi takrorlash sanasi (ertaga) va butun yo'li: +1 → +3 → +7 → +14 → +30 kun (masalan 8-noyabrda o'rganilsa: 9-noy, 12-noy, 19-noy, 3-dek, 2-yan).
- Guruh tugagach har bir so'z `review`, `stage 0`, ertaga takrorlanadi.

## Mashg'ulot tartibi

1. Vaqti kelgan takrorlashlar (eng muhimi — ular unutilish arafasida).
2. Unutilgan so'zlarni qayta yodlash (qisqa Tanishish → Eslash → Test → [Moslash] → Yozish), keyin ertaga tekshiriladi.
3. Yangi so'zlar guruhlari.

Foydalanuvchi istalgan guruhdan keyin to'xtashi mumkin; natija har bir guruh va takrorlashdan keyin darhol saqlanadi.

## Qiyin so'zlar

`lapses ≥ 4` bo'lgan so'z «qiyin» deb belgilanadi va statistikada ko'rsatiladi. Keyingi versiyada bunday so'zga AI yangi assotsiatsiya taklif qiladi.

## Kelajak: FSRS

Hozirgi aniq jadval tushunarli va MVP uchun yetarli. Foydalanuvchilar ma'lumoti to'plangach, har bir foydalanuvchining xotirasiga moslashadigan FSRS algoritmiga o'tish rejalashtirilgan.


## Yozishni baholash (yangilangan)

- Aynan to'g'ri → «good». To'g'ri javobda alohida oyna yo'q: shu ekranda yashil belgi va so'z ovozi; keyingisiga foydalanuvchi o'zi «Davom etish» bilan o'tadi (Testda ham).
- Levenshtein masofasi ≤ 1 (9+ harfli so'zlarda ≤ 2) → «hard» («Deyarli to'g'ri»), aks holda «again».
- Harf kataklari eng uzun so'zga qarab o'lchanadi (katak 26–40 px); bitta so'z ikki qatorga bo'linmaydi,
  iboralar so'z-so'z guruhlanadi; kataklar 26 px dan kichrayadigan so'zlarda ixcham ko'rinish (pastki chiziqlar).
