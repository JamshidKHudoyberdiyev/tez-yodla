# Yodla — mahsulot talablari (PRD)

Versiya: 0.1 (MVP) · Holat: ishlab chiqilmoqda

## 1. Muammo

Til o'rganuvchilar uchun so'z yodlash eng qiyin qism. Odatiy usul — ro'yxatni qayta-qayta o'qish — samarasiz: yangi so'zning katta qismi 1–2 kunda unutiladi. O'zbek tilida bu muammoni ilmiy usullar bilan hal qiladigan, so'z yodlashga ixtisoslashgan ilova yo'q.

## 2. Maqsadli foydalanuvchi

- Ingliz tilini o'rganayotgan 15–35 yoshli o'zbek tilida so'zlashuvchilar (maktab, universitet, IELTS/CEFR tayyorgarligi, ish uchun).
- Kitob, maqola yoki darslik o'qib, notanish so'zlarga duch keladigan va ularni yodda saqlamoqchi bo'lganlar.

## 3. Qiymat taklifi

**Boshqalar takrorlatadi. Yodla eslab qolishni o'rgatadi.**

| Raqobatchi | Turi | Yodlaning farqi |
|---|---|---|
| Wordy.uz | So'z ilovasi: takrorlash, o'yinlar, motivatsiya | O'zbekcha tovush assotsiatsiyasi, majburiy yozish, matndan saqlash |
| Ibrat Academy | To'liq til kursi | Kursdan tashqari vosita: o'qiganingizdagi so'zni yodlatadi |
| Anki | Universal kartochka tizimi | Tayyor o'zbekcha kontent, oddiy interfeys, yozish bosqichi |

## 4. Asosiy jarayon (bitta so'zning yo'li)

1. **Tanishish** — so'z, talaffuz, tarjima, o'zbekcha assotsiatsiya, misol gap; 3 marta ovoz chiqarib aytish.
2. **Eslash** — faqat so'z ko'rinadi; foydalanuvchi o'zi eslaydi, keyin baholaydi.
3. **Test va Moslash** — so'z tepada 4 ta variantdan tarjimani tanlaydi, keyin 5 ta so'zni aralash tarjimalari bilan juftlaydi.
   **Yozish** — har 5 ta yangi so'zdan keyin har birini xotiradan yozadi; xato bo'lsa harf-ma-harf ko'rsatiladi va to'g'risi qayta yoziladi.
4. **Takrorlash** — 1 → 3 → 7 → 14 → 30 kun, har safar boshqa shaklda.
5. **Unutilsa** — shu kuniyoq qayta yodlash (1–3 bosqichlar), bir bosqich orqaga.
6. **Yodlangan** — har 3 oyda nazorat.

Batafsil: [ALGORITHM.md](ALGORITHM.md).

## 5. Qo'llanilgan metodikalar

Oraliqli takrorlash · faol eslash · kalit so'z (assotsiatsiya) usuli · kontekstda o'rganish · ovoz chiqarib aytish · yozish orqali mustahkamlash · darhol xatoni tuzatish · kichik guruhlar (5 ta) · chastota bo'yicha to'plamlar · o'xshash so'zlarni ajratish · har xil shaklda takrorlash · kunlik odat (streak) · uyqudan oldin takrorlash · xotira saroyi (keyingi versiya).

## 6. MVP doirasi (0.1)

| Kiradi | Holat |
|---|---|
| Onboarding: til, daraja testi (12 savol), kunlik maqsad | ✅ |
| Mashg'ulot: takrorlash → qayta yodlash → tanishish → eslash → yozish | ✅ |
| Takrorlash algoritmi, 4 xil takrorlash shakli | ✅ |
| «1000 asosiy so'z» to'plami (1004 so'z, chastota tartibida, har birida ikki tildagi misol gap) + CEFR B1, IELTS, Oshxona to'plamlari; 40 ta o'zbekcha assotsiatsiya | ✅ |
| So'z qo'shish: qo'lda (asl gap, manba, o'z assotsiatsiyasi) | ✅ |
| Matndan notanish so'zlarni topib saqlash («Bilaman» bilan) | ✅ |
| Statistika: streak, 7 kun, so'zlar holati, qiyin so'zlar | ✅ |
| "Gap tuzish" o'yini | ✅ |
| So'zning yodlanish yo'li ekrani | ✅ |
| Talaffuz (qurilma ovoz sintezatori) | ✅ |
| Ma'lumotlar faqat telefonda (AsyncStorage) | ✅ |

**MVP'ga kirmaydi:** to'lov (Yodla Pro), server va hisob, eslatmalar, rasmdan so'z olish (OCR), AI assotsiatsiya va rasm, talaffuzni tekshirish, qolgan 4 ta o'yin, xotira saroyi, tungi rejim, boshqa tillar. Qarang: [ROADMAP.md](ROADMAP.md).

## 7. Muvaffaqiyat ko'rsatkichlari

- **D1 / D7 / D30 qaytish** — maqsad: 40% / 20% / 10% (sinov bosqichida aniqlashtiriladi).
- **Kunlik reja bajarilishi** — faol foydalanuvchilarning ≥ 50% i.
- **Takrorlashda to'g'ri eslash** — ≥ 80%.
- **Yozish aniqligi (birinchi urinish)** — ≥ 70%.
- **Matndan saqlangan so'zlar** — faol foydalanuvchiga haftasiga ≥ 5 ta.

Hodisalar ro'yxati: [ANALYTICS.md](ANALYTICS.md).

## 8. Xavflar

| Xavf | Chora |
|---|---|
| Assotsiatsiyalar sifati past bo'lsa, ishonch yo'qoladi | Tayyor to'plamlardagi har bir assotsiatsiyani til mutaxassisi tekshiradi; yaxshi o'xshash topilmasa, assotsiatsiya qo'yilmaydi va foydalanuvchi o'zinikini yozadi |
| CEFR B1 va IELTS to'plamlari hali kichik (12 tadan) | Keyingi bosqich: har biri 500+ so'zgacha kengaytirish |
| Matn tahlili oddiy qoidalarga asoslangan | 5000 so'zlik chastota ro'yxati va lug'at API'si (ROADMAP) |
| Raqobatchilarning o'yin va motivatsiya tizimi kuchli | Streak va reyting; asosiy farq — eslab qolish usullari |
