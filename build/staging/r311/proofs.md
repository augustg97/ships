| Proof (on the :8150 copy, `r311_proofs.sh`, `r311_variant.py`) | What was broken | Problems found |
|---|---|---|
| OLDTRACE | r303's after-well read as it stood (rows, top, rms, column range), with its full trace stored | 1: the trace steps 3.00 rows in 3 columns at column 757 |
| SILENCE | the forecastle's trace deleted | 1: a read fitted over columns 3135–3615 with no trace |
| ROWS | the poop's forward end row moved 0.5 px off its fit | 1: row 673.2 at column 556.5, the fit gives 672.66 |
| JUMP | the forward well's last 8 trace points moved 4 rows | 3: a 4.5-row step at column 2956; a point 4.28 px off the fit; rms 1.54 against the recorded 0.24 |
| FINAL | none: every after file | 0 |
