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
