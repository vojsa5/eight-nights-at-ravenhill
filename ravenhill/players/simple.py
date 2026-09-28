"""Simple strategies used as baselines."""
import math
from collections import defaultdict

from ..rules import is_bad


def pick_best(rng, cands, key):
    """The candidate with the highest key; ties broken at random."""
    return max(cands, key=lambda c: (key(c), rng.random()))


class RandomPlayer:
    """Picks uniformly."""

    def __init__(self, rng):
        self.rng = rng

    def choose(self, view, tools=None):
        return self.rng.choice(view.alive)


class MajorityPlayer:
    """Follows this round's advice, one vote per character."""

    def __init__(self, rng):
        self.rng = rng

    def choose(self, view, tools=None):
        score = defaultdict(int)
        for a in view.advice:
            if a.round == view.round:
                score[a.eliminate] += 1
                score[a.save] -= 1
        sign = 1 if view.phase == "eliminate" else -1
        return pick_best(self.rng, view.alive, lambda c: sign * score[c])


class TrustPlayer:
    """Weights each advisor by how often their past advice checked out against reveals."""

    def __init__(self, rng):
        self.rng = rng

    def choose(self, view, tools=None):
        right, wrong = defaultdict(int), defaultdict(int)
        for a in view.advice:
            for target, wants_bad in ((a.eliminate, True), (a.save, False)):
                if target in view.revealed:
                    if is_bad(view.revealed[target][0]) == wants_bad:
                        right[a.speaker] += 1
                    else:
                        wrong[a.speaker] += 1

        def weight(c):
            if c in view.revealed:
                return -1.5 if is_bad(view.revealed[c][0]) else 1.5
            return math.log((right[c] + 1) / (wrong[c] + 1))

        score = defaultdict(float)
        for a in view.advice:
            w = weight(a.speaker)
            score[a.eliminate] += w
            score[a.save] -= w
        sign = 1 if view.phase == "eliminate" else -1
        return pick_best(self.rng, view.alive, lambda c: sign * score[c])
