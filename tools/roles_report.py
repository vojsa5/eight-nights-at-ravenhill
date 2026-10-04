"""Per-role report: how informative each role's advice is, how long it stays hidden from the
smart player, how often it causes a wrong decision, and whom the targeting roles hit.

    python3 -m tools.roles_report --games 150 --workers 12
"""
import argparse
import random
import statistics
from collections import Counter, defaultdict
from multiprocessing import Pool

from ravenhill.game import Game
from ravenhill.players import make_player
from ravenhill.players.calibration import load_calibration
from ravenhill.rules import N_CHARS, STANDARD, is_bad

ABILITY_ROLES = {"Sleuth", "Housekeeper", "Reporter", "Photographer", "Constable", "Thug", "Mastermind", "Mole", "Framer", "Eavesdropper", "Copycat"}
SURE = 0.1  # "read": the smart player's chance of misjudging the character is at most 10%


class ReportGame(Game):
    def __init__(self, rng, rules=STANDARD):
        self.forged_roles = []
        self.tips = []
        self.followed = []
        super().__init__(rng, rules)

    def use_ability(self, c, forged):
        if forged:
            self.forged_roles.append(self.roles[c])
        before = {x: len(self.minds[x].known) for x in self.alive}
        super().use_ability(c, forged)
        if self.roles[c] == "Eavesdropper" and not forged and self.minds[c].following is not None:
            self.followed.append(self.roles[self.minds[c].following])
        if self.roles[c] == "Constable":
            self.tips += [self.roles[x] for x in self.alive if x != c and len(self.minds[x].known) > before[x]]


def play(seed):
    game = ReportGame(random.Random(seed))
    player = make_player("bayes", seed + 10_000)
    misjudge = defaultdict(list)  # role -> P(wrong alignment) at each decision while alive
    first_read = {}               # char -> round when first read
    r1_read = set()
    while not game.finished:
        view = game.view()
        c = player.choose(view, game)
        p = player.last_p
        for x in view.alive:
            wrong = 1 - p[x] if is_bad(game.roles[x]) else p[x]
            misjudge[game.roles[x]].append(wrong)
            if wrong <= SURE:
                first_read.setdefault(x, view.round)
                if view.round == 1 and view.phase == "save":
                    r1_read.add(x)
        game.act(c)
    return {
        "roles": game.roles,
        "misjudge": dict(misjudge),
        "first_read": first_read,
        "r1_read": r1_read,
        "history": game.history,
        "silenced": [game.roles[x] for x in game.silenced.values()],
        "forged": game.forged_roles,
        "tips": game.tips,
        "followed": game.followed,
    }


def advice_quality(calib, role):
    """Average over rounds 1-7 of P(eliminate target is bad) and P(save target is good)."""
    keys = [k for k in calib if k.split("|")[0] in (role, role + "*") and int(k.split("|")[1]) <= 7]
    if not keys:
        return None, None
    return statistics.mean(calib[k][0] for k in keys), statistics.mean(calib[k][1] for k in keys)


def report(results, calib):
    n_games = len(results)
    roles = sorted(set(STANDARD.roster), key=lambda r: (is_bad(r), STANDARD.roster.index(r)))
    scores = [sum(h["ok"] for h in r["history"]) for r in results]
    print(f"\n{n_games} games with the smart player: mean score {statistics.mean(scores):.2f} / 16, "
          f"perfect games {100 * sum(x == 16 for x in scores) / n_games:.0f}%\n")
    print(f"{'role':13} {'elim→bad':>8} {'save→good':>9} | {'misjudged':>9} {'read R1':>7} {'read by':>7} | {'wrong calls /100 games':>22}")
    print(f"{'(chance)':13} {'53%/47%':>8} {'47%/53%':>9} |")
    for role in roles:
        e, s = advice_quality(calib, role)
        mis = statistics.mean(w for r in results for w in r["misjudge"].get(role, []))
        chars = [(r, x) for r in results for x in range(N_CHARS) if r["roles"][x] == role]
        r1 = sum(x in r["r1_read"] for r, x in chars) / len(chars)
        reads = [r["first_read"].get(x, 9) for r, x in chars]
        wrong = sum(1 for r in results for h in r["history"] if h["role"] == role and not h["ok"])
        read_by = f"R{statistics.median(reads):.0f}" if statistics.median(reads) < 9 else "never"
        print(f"{role:13} {100 * e:7.0f}% {100 * s:8.0f}% | {100 * mis:8.0f}% {100 * r1:6.0f}% {read_by:>7} | {100 * wrong / n_games:22.0f}")
    for label, key in (("Silenced", "silenced"), ("Forged", "forged"), ("Constable tips went to", "tips"),
                       ("Eavesdropper followed", "followed")):
        hits = Counter(role for r in results for role in r[key])
        total = sum(hits.values())
        if not total:
            continue
        good = sum(v for k, v in hits.items() if not is_bad(k))
        extra = ""
        if key in ("forged", "followed"):
            extra = f", {100 * sum(v for k, v in hits.items() if k in ABILITY_ROLES and not is_bad(k)) / total:.0f}% a good ability role"
        print(f"\n{label}: {100 * good / total:.0f}% good{extra} — " + ", ".join(f"{k} {100 * v / total:.0f}%" for k, v in hits.most_common(8)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=150)
    ap.add_argument("--workers", type=int, default=None)
    ap.add_argument("--seed", type=int, default=9000)
    args = ap.parse_args()
    with Pool(args.workers) as pool:
        results = pool.map(play, range(args.seed, args.seed + args.games), chunksize=1)
    report(results, load_calibration())


if __name__ == "__main__":
    main()
