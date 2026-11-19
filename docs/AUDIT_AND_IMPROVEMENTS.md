# Yodla (Tez-Yodla) — Loyiha tahlili, kamchiliklar va rivojlantirish takliflari

Ushbu hujjat **«Yodla»** mobil ilovasi arxitekturasi, maqsadi, amaldagi holati, aniqlangan kamchiliklari hamda loyihani muvaffaqiyatli rivojlantirish bo'yicha amaliy takliflarni o'z ichiga oladi.

---

## 1. Loyiha haqida umumiy ma'lumot

**«Yodla»** — o'zbek tilida so'zlashuvchi foydalanuvchilar uchun ingliz tili so'z boyligini ilmiy metodikalar asosida, mustahkam va tez yodlashga mo'ljallangan mobil ta'lim platformasi.

### Texnologik steki:
- **Framework:** React Native (0.88.1) + Expo SDK 58 (React 19).
- **Arxitektura & Navigatsiya:** Expo Router (File-based navigation: tabs, dynamic routes `[id]`, modallar).
- **Dasturlash tili:** TypeScript (`strict: true`).
- **Offline ma'lumotlar ombori:** `@react-native-async-storage/async-storage`.
- **Audio & Ovoz:** `expo-speech` (qurilmaning tizimli ovoz sintezatori).
- **Xatolar monitoringi:** `@sentry/react-native`.
- **Avtomatlashtirilgan testlar:** Jest + ts-jest (19 ta test suite, 116 ta to'liq o'tuvchi testlar).
- **Kontent infratuzilmasi:** `content/*.tsv` lug'at to'plamlari ➔ `scripts/content-to-ts.mjs` avtomatlashtirilgan generatori orqali ilovaga o'tkaziladi.

---

## 2. Loyiha nima uchun kerak? (Yechilayotgan muammo)

### Asosiy muammo:
An'anaviy so'z yodlash usuli (so'zlar ro'yxatini shunchaki qayta-qayta yod olish) samarasiz. Nemis psixologi German Ebbinghaus kashf etgan **«Unutilish egri chizig'i»**ga ko'ra, inson yangi o'rgangan ma'lumotining 70–80% qismini dastlabki 1–2 kun ichida unutadi. O'zbek tilida esa bu muammoni to'liq ilmiy asosda hal etuvchi ilovalar deyarli yo'q.

### Yodlaning asosiy afzalliklari va metodologiyasi:
1. **Oraliqli takrorlash (Spaced Repetition System — SRS):**
   So'zlar unutilish arafasidagi aniq vaqtlarda avtomatik takrorlashga chiqariladi:  
   `1-kun ➔ 3-kun ➔ 7-kun ➔ 14-kun ➔ 30-kun ➔ 90-kun (Mastered)`.
2. **Mnemonika (Tovush assotsiatsiyasi):**
   Inglizcha so'zning o'zbek tilidagi ohangdosh, jarangdor so'zlar bilan assotsiatsiyasi orqali xotiraga mixlash (masalan: *iron* ➔ *ayron*, *thunder* ➔ *tandir*, *curious* ➔ *kuryer*).
3. **5 bosqichli faol o'rganish (Active Recall):**
   - *Tanishish:* Ovoz, tarjima, assotsiatsiya va misol gap bilan tanishuv.
   - *Faol eslash:* Xotiradan chaqirish (o'zini sinash).
   - *Test:* 4 ta variantdan to'g'risini tanlash.
   - *Moslash:* 5 ta so'z va 5 ta tarjimani o'zaro juftlash.
   - *Yozish (Typing):* So'zni harfma-harf klaviaturada terish. Levenshtein masofasi algoritmi orqali xatolar tahlil qilinadi.
4. **Matndan notanish so'zlarni ajratish (Text Extractor):**
   Foydalanuvchi istalgan inglizcha matnni (maqola, kitob) nusxalab tashlasa, ilova u bilmaydigan so'zlarni ajratib, shaxsiy lug'atga qo'shadi.
5. **Gamifikatsiya:**
   - *Streak:* Kunlik odat zanjiri.
   - *So'zlar bog'i (Garden):* O'rganilgan har bir so'z urug'dan niholga, so'ngra mevali daraxtga aylanadi.

---

## 3. Loyihadagi mavjud kamchiliklar va zaif nuqtalar

Loyiha metodik va arxitekturaviy jihatdan a'lo darajada qurilgan, ammo quyidagi jiddiy kamchiliklar mavjud:

### 🔴 1. Bulutli sinxronizatsiya va Akkaunt tizimi yo'qligi (Eng jiddiy xavf)
- **Kamchilik:** Foydalanuvchi ma'lumotlari, oylik streaki, xotira statistikasi faqatgina telefondagi `AsyncStorage`da saqlanadi.
- **Oqibat:** Telefon buzilsa, ilova o'chirib qayta o'rnatilsa yoki kesh tozalansa, foydalanuvchining oylik mehnati butunlay o'chib ketadi.
- **Yechim:** Firebase yoki Supabase orqali Google/Apple login va bulutli sinxronizatsiya qo'shish shart.

### 🟡 2. Expo Router tiplari keshlanishi (TypeScript xatoliklari)
- **Kamchilik:** `npm run typecheck` bajarilganda 6 ta marshrut bo'yicha xato chiqadi (`/evening`, `/mistakes`, `/deck/[id]` kabilar topilmadi deyiladi).
- **Sabab:** Sahifalar mavjud, lekin `.expo/types/router.d.ts` kesh fayli yangilanmagan. Marshrutlarni xavfsiz shaklga keltirish kerak.

### 🟡 3. Ovoz sifati va cheklovlar (expo-speech)
- **Kamchilik:** Ovoz berish qurilmaning o'z TTS tizimiga tayanadi.
- **Oqibat:** Ba'zi Android qurilmalarda ingliz tili ovoz paketi bo'lmasa, talaffuz robotdek qo'pol chiqadi yoki umuman ishlamaydi.
- **Yechim:** Real audio bazasini (masalan, Oxford yoki sifatli AI ovozlarini) keshlab qo'yish tizimiga o'tish lozim.

### 🟡 4. Talaffuzni tekshirish (Speech-to-Text) yo'qligi
- **Kamchilik:** Foydalanuvchi so'zni tinglaydi va takrorlaydi, biroq ilova uning talaffuzini eshitib xatolarini tekshirib bermaydi.

### 🟡 5. Rasmdan so'z olish (OCR) yo'qligi
- **Kamchilik:** Qog'oz kitob yoki darslik o'qiyotgan talaba matnni qo'lda kiritishga majbur. Kameradan rasmga olib, matnni tanib olish (ML Kit OCR) hali ulanmagan.

### 🟡 6. Monetizatsiya va to'lov tizimi mavjud emasligi
- **Kamchilik:** Loyihada tijorat mexanizmi (Pro obuna, Click/Payme yoki Google Play Billing integratsiyasi) yo'q. Hozircha loyihani monetizatsiya qilib bo'lmaydi.

---

## 4. Rivojlantirish bo'yicha bosqichma-bosqich reja (Roadmap)

### 📌 1-bosqich: Texnik tozalash va joriy barqarorlik (Darhol)
1. Navigatsiya yo'llarini to'g'rilab, `npm run typecheck` ni 100% toza holatga keltirish.
2. Yangi qo'shilgan 10 ta to'plamni (280+ ta yangi so'z) git orqali saqlash va `eas update` bilan foydalanuvchilarga yetkazish.
3. ESLint qoidalarini to'g'rilash.

### 📌 2-bosqich: Backend va xavfsizlik (0.2 – 0.3)
1. **Supabase / Firebase integratsiyasi:**
   - Google / Apple orqali kirish.
   - Foydalanuvchining SRS kartochkalarini bulutga sinxronlash.
2. **Eslatmalar (expo-notifications):**
   - Ertalabki va kechki eslatmalarni sozlash.
3. **Ofline audio kesh:** Eng ko'p ishlatiladigan 1000 ta so'zning haqiqiy inson ovozidagi talaffuzini keshga yuklash.

### 📌 3-bosqich: Sun'iy intellekt va qo'shimcha imkoniyatlar (0.3 – 0.4)
1. **Kitobdan so'z olish (OCR):** Telefon kamerasi orqali kitob sahifasini rasmga olib, notanish so'zlarni belgilash.
2. **Mikrofon orqali talaffuzni tekshirish.**
3. **Do'stlar va reyting (Leaderboard):** Foydalanuvchilar o'rtasida haftalik musobaqalar o'tkazish.

### 📌 4-bosqich: Monetizatsiya va Do'konlarga chiqish (1.0)
1. **Yodla Pro obunasi:** Kengaytirilgan imkoniyatlar (OCR, AI assotsiatsiya) uchun oylik/yillik obuna.
2. **Google Play Store va Apple App Store** rasmiy relizlari.
3. Boshqa tillarni qo'shish (ruscha, koreyscha, turkcha).

---
*Ushbu hisobot Antigravity AI tomonidan 2026-yil 19-noyabrda loyiha chuqur tahlili asosida tayyorlandi.*
