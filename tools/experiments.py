"""Rule experiments: how much of the score is skill vs luck, and what each role adds.

    python3 -m tools.experiments --games 150 --workers 12
    python3 -m tools.experiments --variants standard no-paymaster --games 300

Each variant changes one thing relative to the standard rules. For every variant we play
the same seeds with all players and report the smart player's score, the skill gap over
random play, and how many decisions were coin flips (smart player < 60% sure).
"""
import argparse
import json
import statistics
import time
from collections import Counter
from multiprocessing import Pool
from pathlib import Path

from ravenhill import players
from ravenhill.game import new_game
from ravenhill.players.calibration import calibrate
from ravenhill.rules import N_ROUNDS
from tools.variants import VARIANTS


PLAYER_NAMES = ["random", "majority", "trust", "bayes"]


def play(rules, calib, player_name, seed):
    game = new_game(seed, rules)
    player = players.make_player(player_name, seed + 10_000, rules, calib)
    decisions = []
    while not game.finished:
        view = game.view()
        c = player.choose(view, game)
        p = getattr(player, "last_p", None)
        conf = None if p is None else (p[c] if view.phase == "eliminate" else 1 - p[c])
        ok = game.act(c)
        decisions.append({"action": view.phase, "role": game.roles[c], "ok": ok, "conf": conf,
                          "event": game.events.get(view.round, "none")})
    return {"score": game.score, "decisions": decisions,
            "tools": len(game.notebooks) + len(game.interviews)}


def _task(args):
    return play(*args)


def summarize(name, results, calib):
    out = {"variant": name}
    for pn, res in results.items():
        scores = [r["score"] for r in res]
        out[pn] = {"mean": statistics.mean(scores), "sd": statistics.pstdev(scores)}
    bayes = results["bayes"]
    decs = [d for r in bayes for d in r["decisions"]]
    out["skill_gap"] = out["bayes"]["mean"] - out["random"]["mean"]
    out["coin_flips"] = sum(d["conf"] < 0.6 for d in decs) / len(bayes)
    out["per_decision"] = []
    for i in range(2 * N_ROUNDS):
        ds = [r["decisions"][i] for r in bayes if len(r["decisions"]) > i]
        if not ds:
            break
        out["per_decision"].append({
            "label": f"{'SE'[i % 2]}{i // 2 + 1}",
            "acc": sum(d["ok"] for d in ds) / len(ds),
            "conf": statistics.mean(d["conf"] for d in ds),
        })
    by_event = {}
    for d in decs:
        by_event.setdefault(d["event"], []).append(d)
    out["by_event"] = {e: {"acc": sum(d["ok"] for d in ds) / len(ds), "conf": statistics.mean(d["conf"] for d in ds),
                           "n": len(ds)} for e, ds in sorted(by_event.items())}
    out["tools_used"] = statistics.mean(r["tools"] for r in bayes)
    out["perfect"] = sum(r["score"] == len(r["decisions"]) for r in bayes) / len(bayes)
    out["wrong_elim"] = Counter(d["role"] for d in decs if d["action"] == "eliminate" and not d["ok"])
    out["wrong_save"] = Counter(d["role"] for d in decs if d["action"] == "save" and not d["ok"])
    out["saved"] = Counter(d["role"] for d in decs if d["action"] == "save")
    out["calib"] = calib
    return out


def report(s, games):
    print(f"\n=== {s['variant']} ({games} games) ===")
    print("  " + "  ".join(f"{pn} {s[pn]['mean']:.2f}" for pn in PLAYER_NAMES)
          + f"   | bayes sd {s['bayes']['sd']:.2f}  skill gap {s['skill_gap']:.2f}  coin flips/game {s['coin_flips']:.1f}")
    print("  bayes acc  " + " ".join(f"{d['label']}:{100 * d['acc']:3.0f}%" for d in s["per_decision"]))
    print("  bayes conf " + " ".join(f"{d['label']}:{100 * d['conf']:3.0f}%" for d in s["per_decision"]))
    print(f"  perfect games {100 * s['perfect']:.0f}%, notebooks + interviews used per game {s['tools_used']:.1f}")
    print("  by event   " + ", ".join(f"{e}: {100 * v['acc']:.0f}% right, {100 * v['conf']:.0f}% sure"
                                      for e, v in s["by_event"].items()))
    total = sum(s["saved"].values())
    print("  saved      " + ", ".join(f"{k} {100 * v / total:.0f}%" for k, v in s["saved"].most_common(5)))
    print("  wrong elim " + ", ".join(f"{k} {v}" for k, v in s["wrong_elim"].most_common(5)))
    print("  wrong save " + ", ".join(f"{k} {v}" for k, v in s["wrong_save"].most_common(5)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=150)
    ap.add_argument("--workers", type=int, default=None)
    ap.add_argument("--variants", nargs="+", default=list(VARIANTS))
    ap.add_argument("--seed", type=int, default=5000)
    ap.add_argument("--out", default="results/experiments.json")
    args = ap.parse_args()

    summaries = []
    with Pool(args.workers) as pool:
        for name in args.variants:
            rules = VARIANTS[name]
            t0 = time.time()
            calib = calibrate(rules=rules)
            results = {}
            for pn in PLAYER_NAMES:
                tasks = [(rules, calib, pn, args.seed + i) for i in range(args.games)]
                results[pn] = pool.map(_task, tasks, chunksize=1)
            s = summarize(name, results, calib)
            summaries.append(s)
            report(s, args.games)
            print(f"  ({time.time() - t0:.0f}s)", flush=True)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(summaries, f, indent=1, default=dict)
    print(f"\nwritten {args.out}")


if __name__ == "__main__":
    main()
