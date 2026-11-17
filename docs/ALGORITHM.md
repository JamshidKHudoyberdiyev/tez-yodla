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

`INTERVALS = [1, 3, 7, 14, 30]` kun, `MASTERED_INTERVAL = 90`. `stage` — joriy oraliq indeksi.
Haqiqiy oraliq = standart × `ease` (so'zning shaxsiy osonligi) × shaxsiy tuzatish (`lib/retention.ts`).

### So'z yo'li — takrorlash shakllari (`reviewModeFor`)

Har takrorlash tekshiriladi — «esladimmi?» deb o'zini baholash yo'q.

| Qachon | Shakl | Ko'p unutilgan so'z (`lapses ≥ 2`) |
|---|---|---|
| O'rganilgan kuni kechqurun | Kechki mustahkamlash: test (en → uz), `app/evening.tsx` | — |
| 1 kun (stage 0) | Teskari test (uz → en tanlash) | Yozma |
| 3 kun (stage 1) | Gap ichida yozish (misol bo'lmasa — yozma) | — |
| 1 hafta (stage 2) | Yozma: tarjimadan yozish | — |
| 2 hafta (stage 3) | Eshitib topish (ovoz → ma'nosini tanlash) | Eshitib yozish |
| 1 oy (stage 4) | Yozma | — |
| 3 oy (mastered) | Teskari test | — |

### Osonlik (`ease`)

Boshlang'ich 1. `good` +0.1, `easy` +0.15, `hard` −0.15, `again` −0.2; chegara 0.6…1.3.
Masalan, doim to'g'ri topilgan so'z: 3 → 8 → 18 → 39 → 117 kun. Ko'p adashilgan so'z tezroq qaytadi.

### Esda qolish va shaxsiy tuzatish

Har takrorlash `reviewLog`ga yoziladi (`{d, b, ok}`, oxirgi 90 kun). Statistikada oxirgi 30 kunlik
«Esda qolish %» va oraliqlar bo'yicha bo'linma ko'rsatiladi. Biror oraliqda kamida 20 ta javob bo'lib,
esda qolish 80% dan past bo'lsa, shu oraliq × 0.85 qilinadi.

### Kechki mustahkamlash

18:00 dan keyin bosh sahifada chiqadi (bugun o'rganilgan so'z bo'lsa), eslatma 20:30 da.
So'z bosqichi va streak o'zgarmaydi; adashilgan so'zlar «Xatolarim»ga tushadi va ertangi takrorlashda
(qayta yodlanayotganlardan keyin) birinchi chiqadi.

## Baholar

| Baho | Qachon | Natija |
|---|---|---|
| `again` | Testda xato yoki yozishda 2+ harf xato | `relearning`, `stage − 1`, `lapses + 1`, bugun qayta yodlanadi |
| `hard` | Yozishda 1 harf xato yoki yordam ishlatildi | `stage` o'zgarmaydi, oraliq × 0.5 (kamida 1 kun) |
| `good` | Testda to'g'ri yoki to'g'ri yozildi | `stage + 1` |
| `easy` | (hozir ishlatilmaydi) | `stage + 2` |

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
