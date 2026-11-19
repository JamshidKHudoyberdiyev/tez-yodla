# So'z to'plamlari — qanday qo'shiladi

Bu papkadagi har bir `.tsv` fayl — bitta to'plam (mavzu). Fayllarni Gemini, Antigravity yoki o'qituvchi
tayyorlaydi, keyin ular avtomatik tekshiriladi va ilovaga o'tkaziladi.

> **Antigravity / AI agent uchun:** shu faylni to'liq o'qing va pastdagi «Ish tartibi»ga aniq amal qiling.
> `src/` ichidagi boshqa fayllarga tegmang. `src/data/generated/` ni qo'lda tahrirlamang — u skript bilan yaratiladi.

## Fayl tuzilishi

```
# title: Sog'liq va shifoxona
# subtitle: A2–B1
# group: daily
# icon: hospital-box
word	translation	pos	ipa	example	exampleUz	association	plural	level
doctor	shifokor, vrach	ot	/ˈdɒktə/	The doctor is very kind.	Shifokor juda mehribon.			A1
```

- Ustunlar **Tab** bilan ajratiladi (bo'sh joy yoki «|» emas).
- `#` bilan boshlangan qatorlar — sozlamalar yoki izoh.
- Fayl nomi = to'plam id: kichik lotin harf, raqam va `-` (masalan `health.tsv`, `ielts-2.tsv`).
- Namuna: `_namuna.tsv` (`_` bilan boshlangan fayllar ilovaga kirmaydi).

### Sozlamalar

| Qator | Ma'nosi |
|---|---|
| `# title:` | To'plam nomi (majburiy, yangi to'plam uchun) |
| `# subtitle:` | Kichik yozuv, masalan `A2–B1`. Yozilmasa — darajalardan o'zi chiqadi |
| `# group:` | `daily` (Kundalik hayot), `study` (Ish va o'qish), `travel` (Sayohat va hordiq), `level` (Daraja bo'yicha) |
| `# icon:` | MaterialCommunityIcons nomi: `pot-steam`, `hospital-box`, `cart`, `home`, `soccer`, `briefcase`, `airplane`, `school`, `paw`, `weather-sunny`, `tshirt-crew`, `laptop`, `bank`, `book-open-variant` |
| `# mode: add` | Yangi to'plam emas — **ilovada bor to'plamga** so'z qo'shish. Fayl nomi shu to'plam id bo'lishi kerak: `core`, `b1`, `ielts`, `kitchen`, `school`, `work`, `travel`, `family` |
| `# tekshirdi:` | O'qituvchi ismi va sana (masalan `# tekshirdi: Dilnoza opa, 2026-11-20`) |

### Ustunlar

| Ustun | Qoida |
|---|---|
| `word` | Inglizcha so'z yoki ibora, kichik harfda |
| `translation` | O'zbekcha, **lotin** yozuvida, 1–3 ma'no vergul bilan. Imlo: o', g', sh, ch |
| `pos` | `ot`, `fe'l`, `sifat`, `ravish`, `olmosh`, `son`, `ko'makchi`, `bog'lovchi`, `undov`, `ibora` (bir nechtasi bo'lsa: `ot, fe'l`) |
| `ipa` | Britaniya talaffuzi, `/.../` ichida, nuqtalarsiz va oxirgi `r`siz: `/ˈbʌtə/` (`/ˈbʌt.ər/` emas) |
| `example` | Oddiy inglizcha gap, 5–10 so'z. **So'zning o'zi** gapda bo'lishi shart (aks holda «Gap ichida» mashqi ishlamaydi) |
| `exampleUz` | Shu gapning tabiiy o'zbekcha tarjimasi |
| `association` | Eslab qolish uchun qisqa o'zbekcha bog'lanish — inglizcha so'zga **o'xshab eshitiladigan** o'zbekcha so'z orqali. Yaxshisi topilmasa — bo'sh. Ma'nosiz bog'lanishdan bo'sh yaxshi |
| `plural` | Faqat noto'g'ri ko'plik (`child` → `children`, `knife` → `knives`). Sanalmaydigan ot (`rice`, `milk`) — `-`. Oddiy so'z yoki `fish`/`sheep` — bo'sh |
| `level` | `A1`, `A2`, `B1`, `B2`, `C1` |

## Ish tartibi

1. `content/<id>.tsv` faylini yozing (yoki tayyorini shu yerga qo'ying).
2. Tekshiring: `npx jest content`
   — xato bo'lsa, qaysi fayl, qaysi qator va nima noto'g'riligi yoziladi. Hammasini tuzating.
   — «N ta so'z boshqa to'plamlarda ham bor» degan yozuv xato emas: bunday so'z bir marta o'rgatiladi.
     Lekin yangi mavzuda kamida **yarmi** «1000 asosiy so'z»da yo'q so'zlar bo'lsin — aks holda to'plam foydasiz.
3. Ilovaga o'tkazing: `node scripts/content-to-ts.mjs`
4. Yana tekshiring: `npx jest && npx tsc --noEmit` — hammasi yashil bo'lishi kerak.
5. Git: `git add -A && git commit -m "So'zlar: <mavzu>"` va `git push`.
6. Telefonga: `npx eas-cli@latest update --channel preview --environment preview --message "So'zlar: <mavzu>"`
   (yangi build kerak emas).

## Sifat qoidalari

- Tayyor kitob yoki lug'atdan (4000 Essential Words, Oxford, Wisdom va h.k.) misol gaplarni **ko'chirmang** — mualliflik huquqi. O'zingiz yozing.
- Bitta faylda 30–60 ta so'z. Juda oddiy so'zlar (`the`, `is`, `go`, `good`) kerak emas.
- O'zbekcha tarjima — tabiiy, kundalik tilda («qizartirilgan non», «qovurilgan nonimga» emas).
- AI yozgan har bir fayl o'qituvchi tekshiruvidan o'tishi kerak — keyin `# tekshirdi:` qatorini qo'shing.

## Antigravity uchun tayyor topshiriq

```
content/README.md faylini o'qi va unga to'liq amal qil.
Yangi to'plam tayyorla: content/health.tsv
Mavzu: Sog'liq va shifoxona, daraja A2–B1, 40 ta so'z, group: daily, icon: hospital-box.
So'zlarning kamida yarmi «1000 asosiy so'z» to'plamida bo'lmasin (src/data/core/ dagi so'zlarga qara).
Keyin «Ish tartibi»dagi 2–4-qadamlarni bajar va barcha xatolarni tuzat.
Oxirida qisqa hisobot ber: nechta so'z, nechtasi yangi, nimalarni tuzatding.
Git commit va eas update qilma — buni men o'zim qilaman.
```
