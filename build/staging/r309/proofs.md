| Proof (on the :8150 copy, `r309_proofs.sh`) | What was broken | Problems found |
|---|---|---|
| OLDTRACE | r299's trace, stations, rows and `deckM` in the new record | 4: the trace steps 4.96 rows at column 790; the stations at u 0.55, 0.80 and 0.85 stand 2.40, 2.68 and 2.49 px off the trace |
| SILENCE | `sheerRead.trace` deleted | 1: a deck line read with no trace |
| HOUSE | `deckM` 3.4 | 1: the boat deck derives to 19.8 m over the water against the record's 19 |
| FINAL | none: every after file | 0 |
