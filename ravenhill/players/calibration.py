"""How each role behaves, measured from simulated games. The smart player uses this table as its
model of every role. Rebuild it after any rule change: python3 -m tools.calibrate

Keys (all per role, round and that round's event):
  "<role>|<round>|<event>"    advice: (P(eliminate target is bad), P(save target is good),
                              P(save repeats a Copycat source's save), P(eliminate repeats one))
  "I|<role>|<round>|<event>"  the same for Interviews
  "N|<role>|<round>|<event>"  what the Notebook would show: {fact kinds: probability}
  "A|<role>"                  how often the facts a role learns are true: (P(true),)
"""
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

from .. import advice as advice_rules
from ..advice import copy_flags
from ..game import Game
from ..notebook import fact_true, signature
from ..rules import PAIRS, STANDARD, is_bad

CALIB_PATH = Path(__file__).resolve().parents[2] / "data" / "calibration.json"
CALIB_GAMES = 4000


def calib_key(role, rnd, paired, event=None):
    return f"{role}{'*' if paired else ''}|{rnd}|{event or '-'}"


def calibrate(n_games=CALIB_GAMES, seed=777, rules=STANDARD):
    stats = defaultdict(lambda: [1, 2, 1, 2, 1, 2, 1, 2])  # Laplace-smoothed hit / total counts
    sigs = defaultdict(Counter)
    facts_ok = defaultdict(lambda: [1, 2])
    for g in range(n_games):
        game = Game(random.Random(seed + g), rules)
        rng = random.Random(-seed - g)
        while not game.finished:
            if game.phase == "save":
                _measure_round(game, stats, sigs, facts_ok)
            game.act(rng.choice(sorted(game.alive)))
    calib = {k: tuple(v[i] / v[i + 1] for i in range(0, 8, 2)) for k, v in stats.items()}
    for k, counts in sigs.items():
        total = sum(counts.values()) + 0.5 * len(counts)
        calib[k] = {sig: (n + 0.5) / total for sig, n in counts.items()}
    calib.update({k: (v[0] / v[1],) for k, v in facts_ok.items()})
    return calib


def _measure_round(game, stats, sigs, facts_ok):
    t, event = game.round, game.events.get(game.round)
    record, last = game.public_record(), game.last_advice()

    bribed = game.bribes.get(t, (None, None))[1]

    def count(prefix, a, own_save=True):
        role = game.roles[a.speaker]
        paired = role in PAIRS and sum(game.roles[x] == role for x in game.alive) == 2
        s = stats[prefix + calib_key(role, t, paired, event)]
        copies_save, copies_elim = copy_flags(a, last, record)
        hits = (a.eliminate is not None and is_bad(game.roles[a.eliminate]),
                a.save is not None and not is_bad(game.roles[a.save]), copies_save, copies_elim)
        saves = a.save is not None and own_save
        present = (a.eliminate is not None, saves, saves, a.eliminate is not None)
        for i, (hit, seen) in enumerate(zip(hits, present)):
            if seen:
                s[2 * i] += hit
                s[2 * i + 1] += 1

    for a in game.advice:  # not the Hypnotist's words from a hypnotised guest, nor a save bought by the Paymaster
        if a.round == t and game.hypnotised.get(t) != a.speaker:
            count("", a, own_save=a.speaker != bribed)
    if len(game.alive) >= 3:  # what an Interview would say (uses the game's dice, changes nothing else)
        for c in sorted(game.alive):
            count("I|", advice_rules.interview(game, c))
    for c, facts in game.night_log.get(t, {}).items():
        role = game.roles[c]
        sigs[f"N|{calib_key(role, t, False, event)}"][signature(facts)] += 1
        for f in facts:
            ok = facts_ok[f"A|{role}"]
            ok[0] += fact_true(f, role, game.roles)
            ok[1] += 1


def save_calibration(calib):
    CALIB_PATH.parent.mkdir(parents=True, exist_ok=True)
    CALIB_PATH.write_text(json.dumps(calib, indent=1, sort_keys=True))


_CALIB = None


def load_calibration():
    global _CALIB
    if _CALIB is None:
        if CALIB_PATH.exists():
            _CALIB = {k: v if isinstance(v, dict) else tuple(v) for k, v in json.loads(CALIB_PATH.read_text()).items()}
        else:
            _CALIB = calibrate()
            save_calibration(_CALIB)
    return _CALIB
