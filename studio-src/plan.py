"""Génère le plan du studio (format de layout pixel-agents) : 4 étages, départements, bureaux séparés, couloirs,
salles de réunion, cage d'escalier. Sortie : studio-layout.json."""
import json
COLS, BH, NB = 50, 11, 4
ROWS = BH * NB + 1
T = [255] * (COLS * ROWS); C = [None] * (COLS * ROWS); A = [None] * (COLS * ROWS); F = []
MUR = {"h": 214, "s": 30, "b": -100, "c": -55}
SOL = {"bois": (7, {"h": 25, "s": 48, "b": -43, "c": -88}), "bleu": (1, {"h": 209, "s": 39, "b": -25, "c": -80}),
       "gris": (9, {"h": 209, "s": 0, "b": -16, "c": -8})}
TEINTE = {"rd": 150, "prod": 28, "veille": 220, "art": 270, "acc": 48, "mgmt": 350}
def put(x, y, t, c): T[y * COLS + x] = t; C[y * COLS + x] = c
def sol(x, y, dep):
    if dep in TEINTE: put(x, y, 1, {"h": TEINTE[dep], "s": 35, "b": -25, "c": -80})
    elif dep == "reu": put(x, y, *SOL["bois"])
    else: put(x, y, *SOL["gris"])
def meuble(t, x, y): F.append({"uid": f"f-{len(F)}", "type": t, "col": x, "row": y})
AREAS = {}
def zone(label, color, x0, y0, x1, y1):
    AREAS[label] = color
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1): A[y * COLS + x] = label
ETAGES = [  # du haut (étage 3) vers le bas (étage 0) : (x0, x1, id, nom)
    [(1, 30, "rd", "R&D"), (32, 42, "reunion-3", "Réunion R&D")],
    [(1, 30, "prod", "Production"), (32, 42, "reunion-2", "Réunion production")],
    [(1, 15, "veille", "Veille"), (17, 22, "reunion-1-veille", "Réunion veille"), (24, 33, "art", "Artistique"), (35, 42, "reunion-1-art", "Réunion artistique")],
    [(1, 8, "acc", "Accueil"), (10, 30, "mgmt", "Management général"), (32, 42, "reunion-0", "Réunion générale")],
]
POSTES = {"rd": [(11, 3), (12, 12)], "prod": [(4, 3), (5, 13), (8, 23)], "veille": [(1, 2), (2, 7), (13, 12)],
          "art": [(6, 25), (7, 30)], "acc": [(0, 3)], "mgmt": [(15, 11), (14, 15), (9, 19), (10, 23), (3, 27)]}
NOMS = {0: "Secrétaire", 1: "Veille actu", 2: "Tendances Instagram", 3: "Chiffres", 4: "Concept", 5: "Scénario", 6: "Direction artistique",
        7: "Critique", 8: "Générateur", 9: "Community manager", 10: "Stratégie", 11: "Veille IA", 12: "Rétro-ingénierie",
        13: "Tendances TikTok", 14: "Coordinateur", 15: "Manager"}
COUL = {"rd": "#41c98b", "prod": "#ffa24c", "veille": "#5b7cfa", "art": "#a77bff", "acc": "#ffd23f", "mgmt": "#e85d75"}
mapping = {}
for k, pieces in enumerate(ETAGES):
    r0 = k * BH
    for y in range(r0 + 1, r0 + BH):  # murs extérieurs de l'étage
        for x in range(0, 44): put(x, y, 0, MUR)
    for (x0, x1, pid, nom) in pieces:
        dep = "reu" if pid.startswith("reunion") else pid
        for x in range(x0, x1 + 1):
            for y in range(r0 + 2, r0 + BH - 1): sol(x, y, dep)
        for y in (r0 + 6, r0 + 7):  # portes vers le couloir intérieur
            if x0 > 1: sol(x0 - 1, y, "couloir")
            if x1 < 42: sol(x1 + 1, y, "couloir")
        if dep == "reu":
            tx = (x0 + x1) // 2 - 1; ty = r0 + 3
            meuble("TABLE_FRONT", tx, ty)
            for (cx, cy, t) in ((tx - 1, ty, "WOODEN_CHAIR_SIDE"), (tx - 1, ty + 2, "WOODEN_CHAIR_SIDE"),
                                (tx + 3, ty, "WOODEN_CHAIR_SIDE:left"), (tx + 3, ty + 2, "WOODEN_CHAIR_SIDE:left")):
                meuble(t, cx, cy)
            meuble("WHITEBOARD" if x1 - x0 > 7 else "SMALL_PAINTING", tx + 1 if x1 - x0 > 7 else tx + 1, r0)
            meuble("PLANT", x1, r0 + 8)
            zone(f"Salle · {nom}", "#c8b49a", x0, r0 + 2, x1, r0 + BH - 2)
            mapping[pid] = [f"Salle · {nom}"]
        else:
            for (n, c) in POSTES[pid]:
                meuble("DESK_FRONT", c, r0 + 3); meuble("PC_FRONT_OFF", c + 1, r0 + 3); meuble("CUSHIONED_BENCH", c + 1, r0 + 5)
                zone(f"{n} · {NOMS[n]}", COUL[pid], c - 1, r0 + 2, c + 3, r0 + 6)
                mapping[f"agent-{n}"] = [f"{n} · {NOMS[n]}"]
            meuble("DOUBLE_BOOKSHELF", x0 + 1, r0); meuble("CLOCK", x1 - 2, r0); meuble("HANGING_PLANT", x0, r0)
            meuble("PLANT_2", x0, r0 + 8); meuble("LARGE_PAINTING" if x1 - x0 > 12 else "SMALL_PAINTING_2", (x0 + x1) // 2, r0)
            if pid in ("mgmt", "acc"):
                meuble("SOFA_FRONT", x1 - 3, r0 + 7); meuble("COFFEE", x1 - 1, r0 + 8)
            if pid == "prod":  # tapis de la chaîne : bancs alignés de gauche à droite
                for x in range(x0 + 2, x1 - 1, 3): meuble("WOODEN_BENCH", x, r0 + 8)
    for x in range(1, 43): sol(x, r0 + 8, "couloir") if T[(r0 + 8) * COLS + x] == 0 else None
# cage d'escalier / ascenseur à droite, reliant les 4 étages
for y in range(2, ROWS - 1):
    for x in range(44, 48): sol(x, y, "couloir")
    put(43, y, 0, MUR) if T[y * COLS + 43] == 255 else None
    put(48, y, 0, MUR)
for k in range(NB):
    for y in (k * BH + 6, k * BH + 7): sol(43, y, "couloir")
    meuble("PLANT", 45, k * BH + 2)
layout = {"version": 1, "cols": COLS, "rows": ROWS, "layoutRevision": 7, "tiles": T, "tileColors": C, "furniture": F,
          "areas": [{"label": l, "color": c} for l, c in AREAS.items()], "areaTiles": A}
json.dump(layout, open("studio-layout.json", "w"), ensure_ascii=False)
json.dump(mapping, open("studio-areas.json", "w"), ensure_ascii=False, indent=1)
print(COLS, ROWS, len(F), "meubles", len(AREAS), "zones")
