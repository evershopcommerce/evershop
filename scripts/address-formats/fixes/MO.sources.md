# Macau — language data

Google's `data/MO` record carries `fmt` and `lfmt` but no `languages` or `lang`, so the layout
selector could never pick the Latin layout for anyone. Macau's official languages are Chinese and
Portuguese (Basic Law of the Macao SAR, art. 9), and its native layout is Chinese like Hong Kong's.
`MO.format.json` adds `languages: ["zh-Hant", "pt"]` and `lang: "zh"`; everything else stays
upstream. Added 2026-10-02 with the `lang`-based layout rule.
