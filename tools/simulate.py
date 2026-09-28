"""Simulate many games and print score statistics.

    python3 -m tools.simulate --games 300                      # all players
    python3 -m tools.simulate --games 300 --players bayes trust
    python3 -m tools.simulate --show 7                         # transcript of one game (bayes player)
"""
import argparse
import statistics
import time
from collections import Counter
from multiprocessing import Pool

from ravenhill import players
from ravenhill.game import new_game
from ravenhill.players.calibration import load_calibration
from ravenhill.rules import N_ROUNDS, NAMES


def play(seed, player_name, show=False):
    game = new_game(seed)
    player = players.make_player(player_name, seed + 10_000)
    if show:
        print("Truth:", ", ".join(f"#{c} {NAMES[c]}={r}" for c, r in enumerate(game.roles)))
    while not game.finished:
        view = game.view()
        if show and view.phase == "save":
            event = game.events.get(view.round)
            print(f"\n== Round {view.round}{f' · {event}' if event else ''} advice (save / eliminate) ==")
            for a in view.advice:
                if a.round == view.round:
                    who = lambda x: "  -" if x is None else f"#{x:<2} ({game.roles[x]})"
                    print(f"  #{a.speaker:<2} {game.roles[a.speaker]:9} save {who(a.save):16} elim {who(a.eliminate)}")
            for sc in (x for x in view.notebooks if x["round"] == view.round):
                print(f"  [Notebook] #{sc['char']} ({game.roles[sc['char']]}) learned: {sc['facts']}")
            if view.round in view.footprints:
                print(f"  [Footprints] " + " or ".join(f"#{x} ({game.roles[x]})" for x in view.footprints[view.round]))
        used = len(game.interviews)
        c = player.choose(view, game)
        ok = game.act(c)
        if show:
            if len(game.interviews) > used:
                a = game.interviews[-1]
                print(f"  [Interview] #{a.speaker} ({game.roles[a.speaker]}): save #{a.save}, eliminate #{a.eliminate}")
            p = getattr(player, "last_p", None)
            if p:
                top = sorted(view.alive, key=lambda x: -p[x])
                print("  P(bad):", " ".join(f"#{x}:{p[x]:.2f}" for x in top))
            print(f"  -> {view.phase} #{c}, was {game.roles[c]}: {'+1' if ok else '0'}")
    if show:
        print(f"\nScore {game.score} / {2 * N_ROUNDS}")
    return {"score": game.score, "history": game.history}


def _task(args):
    return play(*args)


def report(name, results, secs):
    scores = [r["score"] for r in results]
    n = len(scores)
    hist = Counter(scores)
    print(f"\n=== {name}: {n} games, {secs:.0f}s ===")
    print(f"score  mean {statistics.mean(scores):.2f}  sd {statistics.pstdev(scores):.2f}  "
          f"median {statistics.median(scores)}  min {min(scores)}  max {max(scores)}  (of {2 * N_ROUNDS})")
    for s in range(2 * N_ROUNDS + 1):
        if hist[s]:
            print(f"  {s:2d} | {'#' * round(60 * hist[s] / n):60s} {100 * hist[s] / n:5.1f}%")
    labels, accs = [], []
    for i in range(2 * N_ROUNDS):
        oks = [r["history"][i]["ok"] for r in results if len(r["history"]) > i]
        labels.append(f"{'SE'[i % 2]}{i // 2 + 1}")
        accs.append(f"{100 * sum(oks) / len(oks):.0f}%" if oks else "-")
    print("accuracy per decision (S=save, E=eliminate):")
    print("  " + " ".join(l.rjust(4) for l in labels))
    print("  " + " ".join(a.rjust(4) for a in accs))
    for action, label in (("save", "saved"), ("eliminate", "eliminated")):
        roles = Counter(h["role"] for r in results for h in r["history"] if h["action"] == action)
        wrong = Counter(h["role"] for r in results for h in r["history"] if h["action"] == action and not h["ok"])
        total = sum(roles.values())
        print(f"{label:10}: " + ", ".join(f"{k} {100 * v / total:.0f}%" for k, v in roles.most_common(8)))
        print(f"  mistakes: " + ", ".join(f"{k} {v}" for k, v in wrong.most_common(6)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=300)
    ap.add_argument("--players", nargs="+", default=list(players.PLAYERS))
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--workers", type=int, default=None)
    ap.add_argument("--show", type=int, default=None, help="print one game transcript (bayes) for this seed")
    args = ap.parse_args()

    load_calibration()  # builds data/calibration.json if it is missing, before the workers need it
    if args.show is not None:
        play(args.show, "bayes", show=True)
        return
    with Pool(args.workers) as pool:
        for name in args.players:
            t0 = time.time()
            results = pool.map(_task, [(args.seed + i, name) for i in range(args.games)], chunksize=1)
            report(name, results, time.time() - t0)


if __name__ == "__main__":
    main()
