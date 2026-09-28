"""Player strategies.

- random:   picks uniformly.
- majority: follows this round's advice, one vote per character.
- trust:    weights each advisor by how often their past advice checked out against reveals.
- bayes:    knows the roster and how accurate each role's advice tends to be (calibration.py),
            samples role assignments consistent with all advice, silences and reveals, and
            acts on the posterior P(bad).
"""
import random

from ..rules import STANDARD
from .bayes import BayesPlayer
from .simple import MajorityPlayer, RandomPlayer, TrustPlayer

PLAYERS = {"random": RandomPlayer, "majority": MajorityPlayer, "trust": TrustPlayer, "bayes": BayesPlayer}


def make_player(name, seed, rules=STANDARD, calib=None):
    if name == "bayes":
        return BayesPlayer(random.Random(seed), rules, calib)
    return PLAYERS[name](random.Random(seed))
