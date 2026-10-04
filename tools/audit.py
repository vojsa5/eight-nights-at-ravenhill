"""Count illogical actions: advice or night actions that go against a character's own
knowledge or team interest.

    python3 -m tools.audit --games 2000
"""
import argparse
import random
from collections import Counter

from ravenhill.advice import seance_held
from ravenhill.game import Game
from ravenhill.rules import STANDARD, is_bad

NO_ABILITY = {"Witness", "Confidant", "Colonel", "Recluse", "Novelist", "Guest", "Grifter", "Lunatic", "Possessed", "Hypnotist"}


class AuditGame(Game):
    def __init__(self, rng, rules, stats):
        self.stats = stats
        super().__init__(rng, rules)

    def use_ability(self, c, forged):
        role, s = self.roles[c], self.stats
        before = {x: dict(self.minds[x].known) for x in self.alive}
        old_victim = self.minds[c].victim
        super().use_ability(c, forged)
        m = self.minds[c]
        if forged:
            s["forgery: total"] += 1
            if role in NO_ABILITY or role == "Framer" and old_victim in self.alive:
                s["forgery: wasted on a character with no ability to spoil"] += 1
            if is_bad(role):
                s["forgery: hit a bad teammate"] += 1
        if role == "Constable":
            for x in self.alive:
                if x != c and len(self.minds[x].known) > len(before[x]):
                    s["constable: shares"] += 1
                    if is_bad(self.roles[x]):
                        s["constable: shared with a bad character"] += 1
        if role in ("Reporter", "Mole") and any(r not in self.rules.roster for r in m.roles.values()):
            s[f"{role.lower()}: believes someone holds a role not in this game"] += 1
            m.roles = {x: r for x, r in m.roles.items() if r in self.rules.roster}  # count once
        if role == "Framer" and m.victim != old_victim and m.victim is not None:
            s["framer: new victims"] += 1
            if is_bad(self.roles[m.victim]):
                s["framer: framed a bad teammate"] += 1

    def advice_of(self, c, others, public, last):
        a = super().advice_of(c, others, public, last)
        m, role, s = self.minds[c], self.roles[c], self.stats
        if role == "Possessed" and seance_held(self):
            s["possessed: upside-down advice after the Séance (by design)"] += 1
            return a
        if role == "Witness":  # too frightened to accuse a suspect: its arrests name guests it trusts, by design
            s["witness: advice"] += 1
            if m.beliefs(others, public)[a.save] == 1 and any(v < 1 for v in m.beliefs(others, public).values()):
                s["witness: advised saving someone they believe is bad"] += 1
            return a
        p = m.beliefs(others, public)
        honest = not is_bad(role) or (role == "Mole" and self.round < self.rules.mole_betrays_from)
        group = "good" if not is_bad(role) else ("mole (honest phase)" if honest else "bad")
        s[f"advice: {group}"] += 1
        if honest:
            if p[a.eliminate] == 0 and any(p[x] > 0 for x in others):
                s[f"{group}: advised eliminating someone they believe is good"] += 1
            if p[a.save] == 1 and any(p[x] < 1 for x in others if x != a.eliminate):
                s[f"{group}: advised saving someone they believe is bad"] += 1
            if not is_bad(role) and is_bad(self.roles[a.save]):
                s[f"{group}: saves that help the bad team (truth)"] += 1
        else:
            if p[a.eliminate] == 1 and m.known.get(a.eliminate) is not None:
                s["bad: advised eliminating a known teammate"] += 1
            if p[a.save] == 0 and any(p[x] > 0 for x in others if x != a.eliminate):
                s["bad: advised saving someone they know is good"] += 1
        if role == "Mole" and honest and m.known.get(a.eliminate, None) is None and a.eliminate in m.roles and is_bad(m.roles[a.eliminate]):
            s["mole (honest phase): sold out a known teammate"] += 1
        if role == "Novelist":
            s["novelist: advice"] += 1
            if is_bad(self.roles[a.save]):
                s["novelist: advised saving a bad character"] += 1
        if role in ("Thug", "Mastermind") and self.roles[a.save] == "Recluse":
            s["thugs: protected the Recluse, thinking it is a teammate"] += 1
        return a


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=2000)
    args = ap.parse_args()
    stats = Counter()
    for g in range(args.games):
        game = AuditGame(random.Random(g), STANDARD, stats)
        rng = random.Random(-g)
        while not game.finished:
            game.act(rng.choice(sorted(game.alive)))
    for k in sorted(stats):
        print(f"{stats[k]:7d}  {k}")


if __name__ == "__main__":
    main()
