#!/usr/bin/env bash
# Construit le Studio en direct à partir du moteur open source pixel-agents (MIT, github.com/pablodelucca/pixel-agents) :
# 1 ligne de correctif (expose l'état du bureau à notre adaptateur), notre plan d'étages, notre adaptateur studio.js.
set -euo pipefail
ICI=$(cd "$(dirname "$0")" && pwd); DEPOT=$(dirname "$ICI"); PA=${PA:-/tmp/pixel-agents}
[ -d "$PA/.git" ] || git clone -q --depth 1 https://github.com/pablodelucca/pixel-agents "$PA"
grep -q "__studio" "$PA/webview-ui/src/App.tsx" || sed -i 's#^if (isE2E) installTestHooks(officeStateRef);#if (isE2E) installTestHooks(officeStateRef);\n(window as unknown as { __studio: unknown }).__studio = officeStateRef;#' "$PA/webview-ui/src/App.tsx"
(cd "$PA" && npm install --ignore-scripts --no-audit --no-fund >/dev/null)
(cd "$PA/webview-ui" && NODE_ENV=development npx vite build --mode development --base ./ >/dev/null)
OUT="$PA/dist/webview"
(cd "$ICI" && python3 plan.py)
cp "$ICI/studio-layout.json" "$OUT/assets/default-layout-1.json"; cp "$ICI/studio-areas.json" "$OUT/assets/"; cp "$ICI/studio.js" "$OUT/"
sed -i 's#</body>#<script src="studio.js"></script></body>#' "$OUT/index.html"
sed -i 's#<title>[^<]*</title>#<title>Décodé Studio · en direct</title>#' "$OUT/index.html"
rm -rf "$DEPOT/docs/studio"; mkdir -p "$DEPOT/docs/studio"; cp -r "$OUT/." "$DEPOT/docs/studio/"
cp "$PA/LICENSE" "$DEPOT/docs/studio/LICENSE-pixel-agents.txt"
printf "Moteur et graphismes : pixel-agents (Pablo De Lucca, MIT). Personnages : Metro City free pack (JIK-A-4).\n" > "$DEPOT/docs/studio/CREDITS.txt"
echo "Studio construit dans docs/studio"
