# Ilovani yig'ish va testerlarga yuborish

## Bir martalik tayyorgarlik

1. [expo.dev](https://expo.dev) da bepul hisob oching.
2. Loyiha papkasida:

   ```
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest init
   npx eas-cli@latest update:configure
   ```

   `init` loyihani Expo hisobingizga bog'laydi (app.json ga `projectId` yoziladi),
   `update:configure` esa tez tuzatishlarni (OTA) yoqadi.

3. (Ixtiyoriy) Xatolarni kuzatish — [sentry.io](https://sentry.io) da bepul hisob → yangi **React Native** loyiha →
   **Client Keys (DSN)** ni nusxalab, `eas.json` dagi har ikkala profilning `env` qismiga qo'shing:

   ```json
   "EXPO_PUBLIC_SENTRY_DSN": "https://...@....ingest.sentry.io/..."
   ```

## Testerlar uchun APK

```
npx eas-cli@latest build -p android --profile preview
```

Yig'ish Expo serverida bo'ladi (10–20 daqiqa). Oxirida havola va QR-kod chiqadi — shuni testerlarga yuboring.
Ular havolani telefonda ochib, APK ni o'rnatadi («Noma'lum manbalardan o'rnatish»ga ruxsat so'rasa — beriladi).

## Kichik tuzatishni qayta yig'masdan yuborish (OTA)

Faqat JavaScript/TypeScript kodi o'zgargan bo'lsa (yangi kutubxona qo'shilmagan bo'lsa):

```
npx eas-cli@latest update --channel preview --message "Nima tuzatildi"
```

Testerlar ilovani qayta ochganda yangilanish o'zi tushadi.
Yangi kutubxona qo'shilsa yoki `app.json` o'zgarsa — APK ni qaytadan yig'ish kerak.

## Google Play uchun

```
npx eas-cli@latest build -p android --profile production
```

Bu `.aab` fayl yaratadi — uni Play Console → **Testing → Closed testing** ga yuklaysiz.
Yangi shaxsiy hisoblar uchun: kamida **12 tester, ketma-ket 14 kun** yopiq testda bo'lishi kerak,
shundan keyingina «Production» ochiladi.

## Versiya

`app.json` dagi `version` (masalan `1.0.0`) — foydalanuvchiga ko'rinadigan versiya.
Katta o'zgarishda oshiring: `1.0.0 → 1.1.0`, tuzatishda: `1.0.0 → 1.0.1`.
Play uchun ichki raqam (versionCode) EAS da avtomatik oshadi.

## ⚠️ Ovozlar: Azure S0 (Production'dan OLDIN, majburiy)

Hozirgi ovozlar (assets/audio/us, uk, uz) Azure **Free F0** tarifida yaratilgan — bu faqat sinov uchun.
Microsoft qoidasi: tijoriy foydalanish huquqi faqat **pullik (S0)** tarifda yaratilgan ovozga beriladi.

Reja (22-noyabr kelishuvi):
1. Hozircha F0 ovozlar bilan yopiq sinov (o'qituvchilar 2–3 kishi).
2. O'qituvchilar ovozni ma'qul topsa → Azure portal → tez-yodla-speech → Pricing tier → **Standard S0**.
3. Hammasini qayta yaratish (Antigravity):
   `python scripts/gen-audio-en.py --all --force` va `python scripts/gen-audio-uz.py --all --force`,
   keyin `python scripts/verify-audio.py`.
4. `python scripts/gen-audio-pack.py` → OTA (`eas update --channel <kanal> --environment <muhit>`).
5. Tayyor bo'lgach tarifni yana F0 ga qaytarish yoki resursni o'chirish. Taxminiy narx: ~1–1.5 $ bir martalik.
6. Ma'qul kelmasa — boshqa ovoz xizmatini tanlaymiz (Production'ga F0 ovoz bilan CHIQMAYMIZ).

