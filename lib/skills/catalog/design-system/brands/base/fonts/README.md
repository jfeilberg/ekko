# Base fonts — self-hosted

Variable woff2, all **SIL OFL 1.1** (free to use, embed and redistribute — safe for
open-source). Shipped here so `validate`/`bundle` produce fully offline artifacts:

- `inter-var.woff2`         Inter           normal  wght 100-900 (used 300-700)
- `inter-italic-var.woff2`  Inter           italic  wght 100-900 (used 300-700)
- `jetbrains-mono-var.woff2` JetBrains Mono  normal  wght 400-500

Wired via `@font-face` at the top of `../brand.css`.

Sources:
- Inter — https://rsms.me/inter/ (Rasmus Andersson, SIL OFL 1.1)
- JetBrains Mono — https://www.jetbrains.com/lp/mono/ (SIL OFL 1.1)

To refresh Inter, re-download `InterVariable.woff2` and `InterVariable-Italic.woff2`
from rsms.me/inter/font-files/ and drop them in here under the names above.
