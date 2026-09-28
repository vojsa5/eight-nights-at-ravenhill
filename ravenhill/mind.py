"""Private knowledge of one character and the beliefs it derives from it."""
from .rules import PRIOR_BAD, is_bad, registers_bad


class Mind:
    def __init__(self, c, role):
        self.c = c
        self.role = role
        self.known = {}     # char -> looks bad (bool), from Sleuth/Thug/Constable checks and tips
        self.roles = {}     # char -> exact role, from Reporter/Mole (and the Confidants and Lovers)
        self.counts = []    # (chars, number that look bad), from the Housekeeper
        self.sames = []     # (a, b, same team), from the Photographer
        self.victim = None  # the Framer's target
        self.following = None       # the Eavesdropper's target tonight
        self.following_knew = None  # what that target knew before tonight (a snapshot)

    def snapshot(self):
        """What this character knows now, to compare with later: (known, roles, number of counts, number of sames)."""
        return dict(self.known), dict(self.roles), len(self.counts), len(self.sames)

    def beliefs(self, others, public):
        """P(bad) of each living other, as this character sees it."""
        facts = {x: registers_bad(r, self.role) for x, r in public.items()}
        for x, r in self.roles.items():
            facts[x] = is_bad(r)
        facts.update(self.known)
        changed = True
        while changed:
            changed = False
            for chars, k in self.counts:
                unknown = [x for x in chars if x not in facts]
                if not unknown:
                    continue
                left = k - sum(facts[x] for x in chars if x in facts)
                if left <= 0 or left >= len(unknown):
                    for x in unknown:
                        facts[x] = left > 0
                    changed = True
            for a, b, same in self.sames:
                if (a in facts) != (b in facts):
                    src, dst = (a, b) if a in facts else (b, a)
                    facts[dst] = facts[src] == same
                    changed = True
        soft = {}
        for chars, k in self.counts:
            unknown = [x for x in chars if x not in facts]
            if unknown:
                left = k - sum(facts[x] for x in chars if x in facts)
                for x in unknown:
                    soft[x] = left / len(unknown)
        return {x: float(facts[x]) if x in facts else soft.get(x, PRIOR_BAD) for x in others}
