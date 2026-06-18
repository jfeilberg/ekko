# Base fonts — self-hosted

All **SIL OFL 1.1** (free to use, embed and redistribute — safe for open-source).
Shipped here so `validate`/`bundle` produce fully offline artifacts:

- `space-grotesk-var.woff2`   Space Grotesk  normal  wght 300-700 (display; no italic)
- `figtree-var.woff2`         Figtree        normal  wght 300-900 (body / UI)
- `figtree-italic-var.woff2`  Figtree        italic  wght 300-900 (carries every italic accent)
- `space-mono-400.woff2`      Space Mono     normal  wght 400 (trackers / eyebrows / code)
- `space-mono-700.woff2`      Space Mono     normal  wght 700

Wired via `@font-face` at the top of `../brand.css`. Space Grotesk is upright only,
so display italics intentionally fall to Figtree italic (`--font-sans`).

Sources (all SIL OFL 1.1):
- Space Grotesk — https://github.com/floriankarsten/space-grotesk (Florian Karsten)
- Figtree — https://github.com/erikdkennedy/figtree (Erik D. Kennedy)
- Space Mono — https://github.com/googlefonts/spacemono (Colophon Foundry)

The bundled woff2 are the latin variable/static subsets from the Fontsource mirrors
(`@fontsource-variable/space-grotesk`, `@fontsource-variable/figtree`,
`@fontsource/space-mono`). To refresh, re-pull those files and drop them in here
under the names above.
