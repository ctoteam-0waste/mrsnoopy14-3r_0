# Catalogue Redesign — Backend Spec (what backend must add first)

The user app sends `{ category: <backendName>, subCategory: <string>, condition?, quantity }`
in the booking payload. **The backend validates these against its catalogue enum**, so any
NEW sub-category below must be added to the backend catalogue **before** the frontend can
ship it — otherwise bookings for that item are rejected.

Please add the following to the backend catalogue (`GET /api/v1/catalogue` + the booking
validator enum). Once confirmed, the frontend will wire each item (with images/logos) using
the **exact** `category` + `subCategory` strings you finalise.

Legend: `unit` = kg | piece · `condition` = items sold as Working / Not Working (2 prices).
Reward values below are the requested targets — **confirm final KC with 3R ZeroWaste/CEO**.

---

## 1. E-Waste — Printer split (currently one "Printer" @ 6000)
| category (backendName) | subCategory | unit | condition | Working KC | Not-Working KC |
|---|---|---|---|---|---|
| Phones & Computers | Printer (Inkjet) | piece | yes | (confirm) | (confirm) |
| Phones & Computers | Printer (LaserJet) | piece | yes | **10000** | (confirm) |

Also (frontend-only, no backend change): Apple / Google / OnePlus **brand logos** on the
branded-smartphone item — need the logo image assets from design to add these.

## 2. Smartwatch — NEW, four reward tiers
| category | subCategory | unit | condition | Working KC | Not-Working KC |
|---|---|---|---|---|---|
| (confirm category name) | Branded Smartwatch | piece | yes | (confirm) | (confirm) |
| (confirm category name) | Non-Branded Smartwatch | piece | yes | (confirm) | (confirm) |
| (confirm category name) | Fitness Band | piece | yes | (confirm) | (confirm) |
| (confirm category name) | Other Wearable | piece | yes | (confirm) | (confirm) |
> Confirm whether Smartwatch is its own category or lives under E-Waste, + the 4 exact tiers/rewards.

## 3. Plastic — Premium Plastics (NEW)
| category | subCategory | unit | KC/kg |
|---|---|---|---|
| Plastic | ABS | kg | (confirm) |
| Plastic | Nylon | kg | (confirm) |
| Plastic | TPU | kg | (confirm) |
> (Spec wrote "TUP" — assumed **TPU**; confirm.) Also confirm any reward changes to existing
> PET / HDPE-PP / LDPE / Thermocol values.

## 4. Metal — add Brass
| category | subCategory | unit | KC/kg |
|---|---|---|---|
| Metals | Brass | kg | (confirm) |

## 5. Glass — add Window Glass (+ confirm)
| category | subCategory | unit | KC/kg |
|---|---|---|---|
| Glass | Window Glass | kg | (confirm) |
> Glass Jars & Other Glass already exist. Confirm if "Other Glass" covers the rest or more are needed.

## 6. Battery — split into categories (currently one "Battery" @ 200/kg)
Confirm the battery sub-categories + rewards, e.g.:
| category | subCategory | unit | KC |
|---|---|---|---|
| Batteries | Lithium-ion Battery | (confirm) | (confirm) |
| Batteries | Lead-Acid Battery | (confirm) | (confirm) |
| Batteries | Dry Cell / Household Battery | (confirm) | (confirm) |
> Provide the real sub-categories + reward values you want.

## 7. Others — Mixed Items (NEW)
| category | subCategory | unit | KC/kg |
|---|---|---|---|
| (confirm category) | Mixed Items | kg | (confirm) |
> Shoes, Textile (Usable/Non-Usable split) and Carton-removal are already done on the frontend.

## 8. Rewards / Redeem partners (NEW — Store screen)
Store screen is currently "Coming soon". To list partner rewards we need, per partner:
**name, logo image, reward description, KC cost, redemption terms** — for:
- Lifestyle360
- OTR Hotels
- Nojas Chai
- Cashify
> Confirm whether these are served by a backend rewards/partners API or hardcoded on the frontend.

---

## Already DONE on the frontend (no backend action)
- Air Conditioner → **Branded Air Conditioner** (rename)
- Textile split → **Usable / Non-Usable**, **Carton removed**
- Single PET-bottle image; real CEO-approved category photos
- **Glass tab → Red** (official-bin colour); Textile label softened ("Textiles")
- **Knowledge Hub — Indian & International sustainability leaders** (2 new articles)

## Pending 3R ZeroWaste inputs (design/brand, not code)
- Full **official bin-colour mapping** for every category (only Glass=Red is applied so far)
- Apple / Google / OnePlus **logo assets** for E-Waste
- Partner **logos + reward terms** for the Store
