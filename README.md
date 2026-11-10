# Tez Yodla — so'z yodlash ilovasi

O'zbek tilida so'zlashuvchilar uchun ingliz so'zlarini ilmiy usullar bilan yodlatadigan mobil ilova (Expo / React Native).
Har bir so'z urug'dan mevagacha o'sadi: tanishish → eslash → test → moslash → yozish, so'ng oraliqli takrorlash (1 → 3 → 7 → 14 → 30 kun).

## Yangi kompyuterda ishga tushirish

1. [Node.js](https://nodejs.org) LTS va [Git](https://git-scm.com) o'rnating.
2. Loyihani yuklab oling va kutubxonalarni o'rnating:

   ```bash
   git clone https://github.com/JamshidKHudoyberdiyev/tez-yodla.git
   cd tez-yodla
   npm install
   ```

3. (Ixtiyoriy) `.env.example` dan nusxa olib `.env` yarating. Hozir rasm qidirish o'chirilgan, shuning uchun kalit shart emas.
4. Ishga tushiring va QR-kodni telefondagi **Expo Go** bilan skanerlang (kompyuter va telefon bitta Wi-Fi'da):

   ```bash
   npx expo start -c
   ```

   Brauzerda ko'rish: `npx expo start --web`.

## Ishni davom ettirish (uy ↔ ishxona)

```bash
git pull            # boshlashdan oldin — oxirgi o'zgarishlarni olish
# ... ishlash ...
git add -A
git commit -m "Nima o'zgardi"
git push            # tugatgach — GitHub'ga yuborish
```

## Testerlarga yuborish

APK yasash, tez tuzatish (OTA) va Google Play — [docs/RELEASE.md](docs/RELEASE.md).

## Tekshiruvlar

```bash
npm test            # algoritm, streak, eslatmalar, o'yinlar va kontent testlari
npx tsc --noEmit    # TypeScript tekshiruvi
```

## Loyiha tuzilmasi

```
src/
  app/                    ekranlar (Expo Router: har bir fayl — bitta ekran)
    onboarding/           xush kelibsiz, daraja testi, natija
    (tabs)/               bosh sahifa, to'plamlar, bog', statistika
    session.tsx           mashg'ulot: takrorlash, tanishish, eslash, test, moslash, yozish
    add.tsx               so'z qo'shish: qo'lda va matndan
    word/[id].tsx         so'zning yodlanish yo'li
    games.tsx, game-*.tsx o'yinlar: gap tuzish, 60 soniya, eshit va yoz, juftlik, noto'g'ri fe'llar
    settings/             profil, maqsad, mashq bosqichlari, ovoz, eslatma, ko'rinish, ma'lumotlar
    streak*.tsx, weekly.tsx  streak, kalendar, hafta yakuni
  components/             umumiy UI: ui, Art (logo, o'simliklar, ikonlar), Motion (animatsiyalar), Streak, GameKit…
  lib/                    mantiq: srs (algoritm), plan, streak, reminders, notify, store, theme…
  data/                   so'z bazasi (1000+ asosiy so'z), noto'g'ri fe'llar
docs/                     PRD, algoritm, analitika, yo'l xaritasi
```

Barcha ma'lumot telefonda saqlanadi (AsyncStorage) — hisob yoki server kerak emas.
