# Vietnam (VN) region fix — sources and decision trail

**Date:** 2026-10-02. **Branch:** `feat/address-format-registry`.
**Produces:** `scripts/address-formats/fixes/VN.regions.json`, applied by the address generator on top of
Google's libaddressinput data (spec § 3.3 "Default provider", § 10 Q6; implementation plan § 1.4).

## 1. Ruling implemented

Vietnam's 34 post-2025 provincial-level units are the only selectable regions. Keys are ISO 3166-2 codes
only, never invented:

1. If ISO had published post-merger codes for the 34 units, those would be used verbatim. **It has not**
   (§ 2 below), so
2. each unit reuses the existing ISO 3166-2:VN code of the constituent whose name it carries
   (Tuyên Quang keeps `VN-07`, Hồ Chí Minh keeps `VN-SG`). Every one of the 23 merged units carries the
   name of exactly one of its constituents, so the rule is deterministic (checked by script, § 8).
3. Every pre-merger code that is not reused is a `retired` entry with `mergedInto` pointing at the surviving
   key. Statistics-office codes (Decision 19/2025/QĐ-TTg, § 7 h) are not used anywhere. No backfill.

Result: **34 active + 29 retired = 63 entries**, exactly the ISO 3166-2:VN code set as it stands today.

## 2. ISO 3166-2:VN status — finding

**No ISO 3166-2:VN change dated after 2025-07-01 could be found; the latest verifiable change is
2020-11-24** (Online Browsing Platform: "Change of spelling of VN-CT, VN-DN, VN-HN, VN-HP, VN-SG").
ISO still lists 58 provinces + 5 municipalities (63 codes), with `VN-26` still named "Thừa Thiên-Huế".

Evidence, in order of weight:

| Check | What it showed | Date of evidence |
|---|---|---|
| Unicode CLDR `common/validity/subdivision.xml` (main branch). CLDR imports ISO 3166-2 subdivisions from the OBP each release. | `regular` ids for VN: `vn01~7 vn09 vn13~4 vn18 vn20~9 vn30~7 vn39 vn40~1 vn43~7 vn49 vn50~9 vn61 vn63 vn66~9 vn70~3 vnct vndn vnhn vnhp vnsg` = exactly the 63 pre-merger codes (expanded and diffed by script, identical). No `vn` id in the `deprecated` list, no new ids. | fetched 2026-10-02 |
| en.wikipedia "ISO 3166-2:VN" (raw wikitext + revision history). The page tracks ISO newsletters and OBP changes. | "Changes" table ends at 2020-11-24. Latest revision 2025-10-08 (revid 1315819819) only added the sentence: *"However, those definition and assignment have become obsoleted in practice and are subjects to be updated, following the Plan to arrange and merge administrative units in Vietnam 2024–2025."* No code row was added. January 2025 edits that changed VN-26 to "Huế" were reverted as "contradicting the ISO standard". | fetched 2026-10-02; page last edited 2025-10-08 |
| iso3166-updates (amckenna41) API `https://iso3166-updates.vercel.app/api/alpha/VN`, a tracker of ISO newsletters + OBP changes. | Most recent VN entry 2020-11-24. Project README says its list was last refreshed August 2025 (911 updates). | fetched 2026-10-02; data as of 2025-08 |
| ISO Online Browsing Platform `https://www.iso.org/obp/ui/#iso:code:3166:VN` | **Not readable**: HTTP 403 for both the fetch tool and `curl` (bot block). Could not be checked directly. | 2026-10-02 |

Residual risk: an OBP change issued after the trackers' last refresh and not yet picked up by CLDR main or
Wikipedia. If ISO later publishes codes for the 34 units, adoption is one retire-and-add under the
append-only rule (spec § 3.3 rule 2), exactly as § 10 Q6 anticipates.

Do not confuse with ISO: GeoNames (`geonames.org/VN/administrative-division-vietnam.html`) shows 34
units under an "ISO-3166-2" column heading but the values (01 Hà Nội, 31 Hải Phòng, 48 Đà Nẵng, 79 Hồ
Chí Minh, 92 Cần Thơ, ...) are Vietnam's two-digit administrative/statistics codes from Decision
19/2025/QĐ-TTg, not ISO codes.

## 3. Sources

| # | Source | Used for | Date |
|---|---|---|---|
| S1 | Resolution 202/2025/QH15 of the National Assembly "về việc sắp xếp đơn vị hành chính cấp tỉnh" — full text reprint: https://luatvietnam.vn/hanh-chinh/nghi-quyet-202-2025-qh15-cua-quoc-hoi-ve-viec-sap-xep-don-vi-hanh-chinh-cap-tinh-402728-d1.html | Article 1 clauses 1–23 (constituents, new names, verbatim spelling), clause 24 (11 units not reorganized; totals 28 provinces + 6 cities) | signed 2025-06-12 by NA Chairman Trần Thanh Mẫn; new governments operate from 2025-07-01 |
| S2 | Same resolution, reprint in Báo Lào Cai: https://baolaocai.vn/nghi-quyet-cua-quoc-hoi-ve-sap-xep-don-vi-hanh-chinh-cap-tinh-post403219.html | Cross-check of clauses 1, 4, 16, 23, 24 | 2025-06 |
| S3 | Same resolution on the Cần Thơ government legal-dissemination portal: https://pbgdpl.cantho.gov.vn/nghi-quyet-so-2022025qh15-cua-quoc-hoi-ve-viec-sap-xep-don-vi-hanh-chinh-cap-tinh | Government-portal confirmation of clause 24 and totals | 2025-06 |
| S4 | Same resolution — official document stores (not readable by the fetch tool: 403 / .doc): https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Nghi-quyet-202-2025-QH15-660927.aspx ; https://vbpl.vn/TW/Lists/vbpq/Attachments/179501/202_2025_QH15_648951.doc | Reference only | — |
| S5 | Resolution 60-NQ/TW (Party Central Committee, 2025-04-12), annex "Danh sách dự kiến tên gọi các tỉnh, thành phố và trung tâm chính trị - hành chính" — reprints: https://www.sggp.org.vn/danh-sach-du-kien-ten-goi-cac-tinh-thanh-pho-va-trung-tam-chinh-tri-hanh-chinh-tinh-ly-cua-34-don-vi-hanh-chinh-cap-tinh-post790508.html ; https://tapchicongthuong.vn/du-kien-cu-the-34-don-vi-hanh-chinh-cap-tinh-sau-sap-nhap--hop-nhat-139371.htm | Political-administrative centre of each merged unit (§ 6). Names and constituents agree with S1 in all 23 cases. | articles 2025-04-14 |
| S6 | Resolution 175/2024/QH15 "về việc thành lập thành phố Huế trực thuộc trung ương": https://luatvietnam.vn/co-cau-to-chuc/nghi-quyet-175-2024-qh15-cua-quoc-hoi-ve-viec-thanh-lap-thanh-pho-hue-truc-thuoc-trung-uong-377830-d1.html | Huế: former "tỉnh Thừa Thiên Huế" became "thành phố Huế" (§ 7 b) | adopted 2024-11-30, effective 2025-01-01 |
| S7 | en.wikipedia "ISO 3166-2:VN" — https://en.wikipedia.org/wiki/ISO_3166-2:VN (raw: `?title=ISO_3166-2:VN&action=raw`; history; diff 1286697551→1315819819) | The 63 pre-merger codes with ISO spelling; ISO change log (§ 2) | fetched 2026-10-02 |
| S8 | Unicode CLDR validity data — https://raw.githubusercontent.com/unicode-org/cldr/main/common/validity/subdivision.xml | Independent confirmation of the 63-code set and of no ISO change (§ 2) | fetched 2026-10-02 |
| S9 | iso3166-updates — https://github.com/amckenna41/iso3166-updates ; https://iso3166-updates.vercel.app/api/alpha/VN | ISO change log cross-check (§ 2) | fetched 2026-10-02; data as of 2025-08 |
| S10 | en.wikipedia "Provinces of Vietnam" https://en.wikipedia.org/wiki/Provinces_of_Vietnam and "2025 Vietnamese administrative reform" https://en.wikipedia.org/wiki/2025_Vietnamese_administrative_reform ; vi.wikipedia "Tỉnh thành Việt Nam" https://vi.wikipedia.org/wiki/T%E1%BB%89nh_th%C3%A0nh_Vi%E1%BB%87t_Nam | Cross-check of the 34-name list only. The fetch tool's summary of the English "Provinces of Vietnam" page mis-stated the split as "25 provinces + 9 municipalities"; the resolution (S1–S3) says 28 + 6, which is what this fix follows. | fetched 2026-10-02 |
| S11 | Decision 19/2025/QĐ-TTg "Bảng danh mục và mã số các đơn vị hành chính Việt Nam" (replaces Decision 124/2004/QĐ-TTg; two-digit province codes 01–99; effective 2025-07-01) — https://www.sggp.org.vn/ban-hanh-bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-post802486.html ; draft reported by VietnamNet 2025-06-21 https://vietnamnet.vn/en/new-administrative-codes-proposed-after-merger-of-34-provinces-2413614.html | Identifies the statistics-office codes that the ruling excludes (§ 7 h) | 2025-07-04 |
| S12 | GeoNames — https://www.geonames.org/VN/administrative-division-vietnam.html | Example of a third party labelling Decision-19 codes as "ISO-3166-2" (§ 2, § 7 h) | fetched 2026-10-02 |
| S13 | `packages/evershop/src/lib/locale/provinces.ts` (this repo) | The 59 VN rows the dataset holds today (§ 4) | working tree, 2026-10-02 |

## 4. Dataset reconciliation (`lib/locale/provinces.ts`)

- The dataset has **59** VN rows; ISO 3166-2:VN has **63**. Scripted diff (§ 8): the four codes missing
  from the dataset are **`VN-28` Kon Tum, `VN-43` Bà Rịa - Vũng Tàu, `VN-72` Đắk Nông, `VN-73` Hậu
  Giang** — the four the spec expected. The dataset has no non-ISO code and no duplicate.
- All **34** surviving keys are present in the dataset, so no stored address, zone or tax rate on a
  surviving code changes key.
- Of the **29** absorbed codes, **25** are in the dataset and **4** are the missing ones above. All four
  missing codes are absorbed units, so they enter the data as `retired` entries only, never as active.
- **Count correction for the spec text.** Spec § 10 Q6 and plan § 1.4 say "the 29 in today's data plus
  the four the dataset never had". The arithmetic is 59 − 34 = **25** absorbed codes in today's data
  **+ 4 missing = 29 absorbed in total** (34 + 29 = 63). The total of 29 retired entries is right; the
  "29 in today's data" wording double-counts the four.
- The 58 latin names other than `VN-26` are byte-identical to the dataset's current English names, so
  display text for existing keys does not move. `VN-26` changes from "Thua Thien-Hue" to "Hue" (§ 7 b).

## 5. Mapping table — 63 pre-merger codes → 34 units

Grouped by surviving unit in the order of Article 1 of Resolution 202/2025/QH15 (clauses 1–23 merged,
clause 24 the 11 units not reorganized). "Old name" is the ISO 3166-2:VN spelling. Bold old codes in
"In dataset today" = **no** are the four the dataset never had.

| Old code | Old name (ISO 3166-2:VN) | In dataset today | New key | New name (post-2025) | Status | Clause |
|---|---|---|---|---|---|---|
| VN-07 | Tuyên Quang | yes | **VN-07** | Tuyên Quang (province) | kept (name-bearing constituent) | 1 |
| VN-03 | Hà Giang | yes | VN-07 | Tuyên Quang (province) | retired → mergedInto VN-07 | 1 |
| VN-02 | Lào Cai | yes | **VN-02** | Lào Cai (province) | kept (name-bearing constituent) | 2 |
| VN-06 | Yên Bái | yes | VN-02 | Lào Cai (province) | retired → mergedInto VN-02 | 2 |
| VN-69 | Thái Nguyên | yes | **VN-69** | Thái Nguyên (province) | kept (name-bearing constituent) | 3 |
| VN-53 | Bắc Kạn | yes | VN-69 | Thái Nguyên (province) | retired → mergedInto VN-69 | 3 |
| VN-68 | Phú Thọ | yes | **VN-68** | Phú Thọ (province) | kept (name-bearing constituent) | 4 |
| VN-70 | Vĩnh Phúc | yes | VN-68 | Phú Thọ (province) | retired → mergedInto VN-68 | 4 |
| VN-14 | Hòa Bình | yes | VN-68 | Phú Thọ (province) | retired → mergedInto VN-68 | 4 |
| VN-56 | Bắc Ninh | yes | **VN-56** | Bắc Ninh (province) | kept (name-bearing constituent) | 5 |
| VN-54 | Bắc Giang | yes | VN-56 | Bắc Ninh (province) | retired → mergedInto VN-56 | 5 |
| VN-66 | Hưng Yên | yes | **VN-66** | Hưng Yên (province) | kept (name-bearing constituent) | 6 |
| VN-20 | Thái Bình | yes | VN-66 | Hưng Yên (province) | retired → mergedInto VN-66 | 6 |
| VN-HP | Hải Phòng | yes | **VN-HP** | Hải Phòng (city) | kept (name-bearing constituent) | 7 |
| VN-61 | Hải Dương | yes | VN-HP | Hải Phòng (city) | retired → mergedInto VN-HP | 7 |
| VN-18 | Ninh Bình | yes | **VN-18** | Ninh Bình (province) | kept (name-bearing constituent) | 8 |
| VN-63 | Hà Nam | yes | VN-18 | Ninh Bình (province) | retired → mergedInto VN-18 | 8 |
| VN-67 | Nam Định | yes | VN-18 | Ninh Bình (province) | retired → mergedInto VN-18 | 8 |
| VN-25 | Quảng Trị | yes | **VN-25** | Quảng Trị (province) | kept (name-bearing constituent) | 9 |
| VN-24 | Quảng Bình | yes | VN-25 | Quảng Trị (province) | retired → mergedInto VN-25 | 9 |
| VN-DN | Đà Nẵng | yes | **VN-DN** | Đà Nẵng (city) | kept (name-bearing constituent) | 10 |
| VN-27 | Quảng Nam | yes | VN-DN | Đà Nẵng (city) | retired → mergedInto VN-DN | 10 |
| VN-29 | Quảng Ngãi | yes | **VN-29** | Quảng Ngãi (province) | kept (name-bearing constituent) | 11 |
| VN-28 | Kon Tum | **no** | VN-29 | Quảng Ngãi (province) | retired → mergedInto VN-29 | 11 |
| VN-30 | Gia Lai | yes | **VN-30** | Gia Lai (province) | kept (name-bearing constituent) | 12 |
| VN-31 | Bình Định | yes | VN-30 | Gia Lai (province) | retired → mergedInto VN-30 | 12 |
| VN-34 | Khánh Hòa | yes | **VN-34** | Khánh Hòa (province) | kept (name-bearing constituent) | 13 |
| VN-36 | Ninh Thuận | yes | VN-34 | Khánh Hòa (province) | retired → mergedInto VN-34 | 13 |
| VN-35 | Lâm Đồng | yes | **VN-35** | Lâm Đồng (province) | kept (name-bearing constituent) | 14 |
| VN-72 | Đắk Nông | **no** | VN-35 | Lâm Đồng (province) | retired → mergedInto VN-35 | 14 |
| VN-40 | Bình Thuận | yes | VN-35 | Lâm Đồng (province) | retired → mergedInto VN-35 | 14 |
| VN-33 | Đắk Lắk | yes | **VN-33** | Đắk Lắk (province) | kept (name-bearing constituent) | 15 |
| VN-32 | Phú Yên | yes | VN-33 | Đắk Lắk (province) | retired → mergedInto VN-33 | 15 |
| VN-SG | Hồ Chí Minh | yes | **VN-SG** | Hồ Chí Minh (city) | kept (name-bearing constituent) | 16 |
| VN-43 | Bà Rịa - Vũng Tàu | **no** | VN-SG | Hồ Chí Minh (city) | retired → mergedInto VN-SG | 16 |
| VN-57 | Bình Dương | yes | VN-SG | Hồ Chí Minh (city) | retired → mergedInto VN-SG | 16 |
| VN-39 | Đồng Nai | yes | **VN-39** | Đồng Nai (province) | kept (name-bearing constituent) | 17 |
| VN-58 | Bình Phước | yes | VN-39 | Đồng Nai (province) | retired → mergedInto VN-39 | 17 |
| VN-37 | Tây Ninh | yes | **VN-37** | Tây Ninh (province) | kept (name-bearing constituent) | 18 |
| VN-41 | Long An | yes | VN-37 | Tây Ninh (province) | retired → mergedInto VN-37 | 18 |
| VN-CT | Cần Thơ | yes | **VN-CT** | Cần Thơ (city) | kept (name-bearing constituent) | 19 |
| VN-52 | Sóc Trăng | yes | VN-CT | Cần Thơ (city) | retired → mergedInto VN-CT | 19 |
| VN-73 | Hậu Giang | **no** | VN-CT | Cần Thơ (city) | retired → mergedInto VN-CT | 19 |
| VN-49 | Vĩnh Long | yes | **VN-49** | Vĩnh Long (province) | kept (name-bearing constituent) | 20 |
| VN-50 | Bến Tre | yes | VN-49 | Vĩnh Long (province) | retired → mergedInto VN-49 | 20 |
| VN-51 | Trà Vinh | yes | VN-49 | Vĩnh Long (province) | retired → mergedInto VN-49 | 20 |
| VN-45 | Đồng Tháp | yes | **VN-45** | Đồng Tháp (province) | kept (name-bearing constituent) | 21 |
| VN-46 | Tiền Giang | yes | VN-45 | Đồng Tháp (province) | retired → mergedInto VN-45 | 21 |
| VN-59 | Cà Mau | yes | **VN-59** | Cà Mau (province) | kept (name-bearing constituent) | 22 |
| VN-55 | Bạc Liêu | yes | VN-59 | Cà Mau (province) | retired → mergedInto VN-59 | 22 |
| VN-44 | An Giang | yes | **VN-44** | An Giang (province) | kept (name-bearing constituent) | 23 |
| VN-47 | Kiên Giang | yes | VN-44 | An Giang (province) | retired → mergedInto VN-44 | 23 |
| VN-HN | Hà Nội | yes | **VN-HN** | Hà Nội (city) | unchanged | 24 |
| VN-26 | Thừa Thiên-Huế | yes | **VN-26** | Huế (city) | unchanged by Res. 202; renamed Huế since 2025-01-01 | 24 |
| VN-01 | Lai Châu | yes | **VN-01** | Lai Châu (province) | unchanged | 24 |
| VN-71 | Điện Biên | yes | **VN-71** | Điện Biên (province) | unchanged | 24 |
| VN-05 | Sơn La | yes | **VN-05** | Sơn La (province) | unchanged | 24 |
| VN-09 | Lạng Sơn | yes | **VN-09** | Lạng Sơn (province) | unchanged | 24 |
| VN-13 | Quảng Ninh | yes | **VN-13** | Quảng Ninh (province) | unchanged | 24 |
| VN-21 | Thanh Hóa | yes | **VN-21** | Thanh Hóa (province) | unchanged | 24 |
| VN-22 | Nghệ An | yes | **VN-22** | Nghệ An (province) | unchanged | 24 |
| VN-23 | Hà Tĩnh | yes | **VN-23** | Hà Tĩnh (province) | unchanged | 24 |
| VN-04 | Cao Bằng | yes | **VN-04** | Cao Bằng (province) | unchanged | 24 |

Totals: 34 rows with Status "kept"/"unchanged" (active), 29 rows "retired" — 63 rows.

## 6. Administrative centres versus names (why the ruling is name-based, not centre-based)

Resolution 60-NQ/TW (S5) places the political-administrative centre of seven merged units in a constituent
other than the one whose name survives. The ruling keys on the **name**, so these seven cases are not
ambiguous — but they are exactly where a "centre-based" or "largest-constituent" scheme would have
produced different keys, so they are recorded here.

| New unit | Key kept | Constituents | Political-administrative centre (Res. 60-NQ/TW) | Centre lies in name-bearing constituent? |
|---|---|---|---|---|
| Tuyên Quang | VN-07 | Tuyên Quang (VN-07), Hà Giang (VN-03) | Tuyên Quang | yes |
| Lào Cai | VN-02 | Lào Cai (VN-02), Yên Bái (VN-06) | Yên Bái (former Yên Bái province) | **no** |
| Thái Nguyên | VN-69 | Thái Nguyên (VN-69), Bắc Kạn (VN-53) | Thái Nguyên | yes |
| Phú Thọ | VN-68 | Phú Thọ (VN-68), Vĩnh Phúc (VN-70), Hòa Bình (VN-14) | Phú Thọ (Việt Trì) | yes |
| Bắc Ninh | VN-56 | Bắc Ninh (VN-56), Bắc Giang (VN-54) | Bắc Giang (former Bắc Giang province) | **no** |
| Hưng Yên | VN-66 | Hưng Yên (VN-66), Thái Bình (VN-20) | Hưng Yên | yes |
| Hải Phòng | VN-HP | Hải Phòng (VN-HP), Hải Dương (VN-61) | Hải Phòng | yes |
| Ninh Bình | VN-18 | Ninh Bình (VN-18), Hà Nam (VN-63), Nam Định (VN-67) | Ninh Bình (Hoa Lư) | yes |
| Quảng Trị | VN-25 | Quảng Trị (VN-25), Quảng Bình (VN-24) | Đồng Hới (former Quảng Bình province) | **no** |
| Đà Nẵng | VN-DN | Đà Nẵng (VN-DN), Quảng Nam (VN-27) | Đà Nẵng | yes |
| Quảng Ngãi | VN-29 | Quảng Ngãi (VN-29), Kon Tum (VN-28) | Quảng Ngãi | yes |
| Gia Lai | VN-30 | Gia Lai (VN-30), Bình Định (VN-31) | Quy Nhơn (former Bình Định province) | **no** |
| Khánh Hòa | VN-34 | Khánh Hòa (VN-34), Ninh Thuận (VN-36) | Nha Trang (Khánh Hòa) | yes |
| Lâm Đồng | VN-35 | Lâm Đồng (VN-35), Đắk Nông (VN-72), Bình Thuận (VN-40) | Đà Lạt (Lâm Đồng) | yes |
| Đắk Lắk | VN-33 | Đắk Lắk (VN-33), Phú Yên (VN-32) | Buôn Ma Thuột (Đắk Lắk) | yes |
| Hồ Chí Minh | VN-SG | Hồ Chí Minh (VN-SG), Bà Rịa - Vũng Tàu (VN-43), Bình Dương (VN-57) | Hồ Chí Minh City | yes |
| Đồng Nai | VN-39 | Đồng Nai (VN-39), Bình Phước (VN-58) | Biên Hòa (Đồng Nai) | yes |
| Tây Ninh | VN-37 | Tây Ninh (VN-37), Long An (VN-41) | Tân An (former Long An province) | **no** |
| Cần Thơ | VN-CT | Cần Thơ (VN-CT), Sóc Trăng (VN-52), Hậu Giang (VN-73) | Cần Thơ | yes |
| Vĩnh Long | VN-49 | Vĩnh Long (VN-49), Bến Tre (VN-50), Trà Vinh (VN-51) | Vĩnh Long | yes |
| Đồng Tháp | VN-45 | Đồng Tháp (VN-45), Tiền Giang (VN-46) | Mỹ Tho (former Tiền Giang province) | **no** |
| Cà Mau | VN-59 | Cà Mau (VN-59), Bạc Liêu (VN-55) | Cà Mau | yes |
| An Giang | VN-44 | An Giang (VN-44), Kiên Giang (VN-47) | Rạch Giá (former Kiên Giang province) | **no** |

## 7. Decision trail

a. **ISO has not published post-merger codes → reuse the name-bearing constituent's code** (§ 2, § 1).
   Every one of the 23 merged units has exactly one constituent whose ISO name equals the new name
   (asserted by script, § 8), so no merged unit needed a judgement call about *which* code it keeps.

b. **Huế (`VN-26`).** Not touched by Resolution 202 (clause 24 lists "thành phố Huế"), but the unit was
   renamed and upgraded from "tỉnh Thừa Thiên Huế" to "thành phố Huế" by Resolution 175/2024/QH15,
   effective 2025-01-01 (S6). ISO still names `VN-26` "Thừa Thiên-Huế" (province) and Wikipedia editors
   reverted attempts to rename it ahead of ISO (S7). Decision taken here: keep the key `VN-26` (the only
   ISO code for the territory; nothing is retired) and set the **display name to the current official
   name "Huế" / "Hue"**, because the dropdown must show the name a customer or merchant looks for today.
   This is a display-name change on an existing key, which the append-only rule allows (it protects keys,
   not names); orders stored with `VN-26` will print "Huế" instead of "Thua Thien-Hue". Alternative, if
   the reviewer prefers to track ISO literally: name it "Thừa Thiên-Huế" until ISO renames — the key
   does not change either way. Not marked `todo` because the key mapping itself is unambiguous.

c. **Type (province vs municipality) is not carried** in the fix — the `Region` shape has no field for
   it, and `levels` is `['administrative_area']` for every country in the default set. For the record:
   6 municipalities (Hà Nội `VN-HN`, Huế `VN-26`, Hải Phòng `VN-HP`, Đà Nẵng `VN-DN`, Hồ Chí Minh
   `VN-SG`, Cần Thơ `VN-CT`) and 28 provinces. No merged unit changed type.

d. **Bare names, no type prefix.** `name` is "Hồ Chí Minh", not "Thành phố Hồ Chí Minh"; "Tuyên Quang",
   not "tỉnh Tuyên Quang" — consistent with ISO 3166-2:VN and with the existing dataset.

e. **Spelling / orthography.** Vietnamese names follow the resolution text (S1 verbatim clauses), which
   agrees with ISO on every name in play: "Hòa Bình", "Khánh Hòa", "Thanh Hóa" (tone mark on the *o*, not
   the "Hoà/Hoá" variant), "Đắk Lắk", "Đắk Nông", "Bà Rịa - Vũng Tàu" (spaces around the hyphen, as in
   both ISO and the resolution; latin "Ba Ria - Vung Tau"). One fetch-tool rendering of the Wikipedia
   table showed "Kiến Giang"; the resolution (clause 23, "tỉnh Kiên Giang") and ISO spell it "Kiên
   Giang", which is what the data carries. `latinName` is produced mechanically (NFD, strip combining
   marks, Đ→D) and matches the dataset's current English names for all 58 shared keys.

f. **Historic ISO codes deleted before 2025 are out of scope.** `VN-15` Hà Tây (deleted by ISO
   2014-11-03, merged into Hà Nội 2008) and the pre-2011 province codes replaced by the municipality
   codes are not in the dataset, have not been valid for over a decade, and are not added as retired
   entries. The retired set is exactly the 29 absorbed codes of the 2025 reform.

g. **`mergedInto` is omitted on active entries** rather than written as `null`, because the target type
   is `mergedInto?: string` and a JSON `null` would not be assignable if the generator spreads fix
   entries into the TypeScript data file. All 29 retired entries carry it. `isoCode` equals `key` on
   every entry (every key is an ISO code by construction).

h. **Statistics-office codes ruled out, as decided.** Decision 19/2025/QĐ-TTg (S11) assigns two-digit
   codes 01–99 to the 34 units (Hà Nội 01, Hải Phòng 31, Đà Nẵng 48, Hồ Chí Minh 79, Cần Thơ 92, ...).
   GeoNames already publishes them under an "ISO-3166-2" heading (S12); they are not ISO codes and
   nothing here uses them. Any dataset that shows "VN-01 = Hà Nội" has adopted Decision 19 codes, not
   ISO (in ISO, `VN-01` is Lai Châu).

i. **No `todo` entries.** Every mapping is backed by the resolution text and cross-checked against the
   Resolution 60-NQ/TW annex; no entry was guessed.

j. **If ISO publishes codes later**: add the new codes as active entries, flip the 34 current keys to
   `retired` with `mergedInto` → the new code (one retire-and-add, spec § 3.3 rule 2). Nothing in this
   fix prevents that.

## 8. Verification performed (2026-10-02)

- `comm` diff of the 63 ISO codes (S7) against the 59 dataset codes (S13): 4 missing (`VN-28`, `VN-43`,
  `VN-72`, `VN-73`), 0 extra, 0 duplicates.
- CLDR `vn` validity ranges (S8) expanded by script and diffed against the 63: identical.
- Generator/validator script over the fix data asserted: 34 active, 29 retired, 63 unique keys equal to
  the ISO set; every `mergedInto` target is an active key and no key is both; `isoCode === key`;
  `latinName` is printable ASCII; for each merged unit exactly one constituent's ISO name equals the new
  name and it is the kept key; all 34 active keys exist in the dataset; all 4 missing codes are retired;
  array order is active-by-key then retired-by-key (ASCII order: `VN-01` … `VN-73`, `VN-CT`, `VN-DN`,
  `VN-HN`, `VN-HP`, `VN-SG`).
- Resolution 202 constituents (S1) agree with the Resolution 60-NQ/TW annex (S5) for all 23 merged units
  and with the clause-24 list for the 11 unchanged units.

## 9. Items for the reviewer

1. Huế display name "Huế"/"Hue" on `VN-26` (§ 7 b) — confirm, or switch to ISO's "Thừa Thiên-Huế".
2. `mergedInto` omitted (not `null`) on active entries (§ 7 g) — confirm the generator expects that.
3. Spec § 10 Q6 / plan § 1.4 wording "the 29 in today's data plus the four" → "25 in today's data plus
   the four = 29" (§ 4).
