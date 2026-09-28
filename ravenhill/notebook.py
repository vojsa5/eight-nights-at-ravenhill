"""The facts a character learns at night: what a Notebook shows the player, and what the smart
player checks against every world it considers (players/likelihood.py). In a Notebook round the game
opens one guest's notebook for the player (open_notebook)."""
from .rules import registers_bad


def facts_learned(before, mind):
    """What a character learned since `before` (a Mind.snapshot() taken at nightfall), as a list of facts:
    ("role", x, role), ("side", x, looks_bad), ("count", chars, k), ("same", a, b, same_side)."""
    known, roles, n_counts, n_sames = before
    facts = [("role", x, r) for x, r in mind.roles.items() if roles.get(x) != r]
    facts += [("side", x, v) for x, v in mind.known.items() if known.get(x) != v and x not in mind.roles]
    facts += [("count", chars, k) for chars, k in mind.counts[n_counts:]]
    facts += [("same", a, b, s) for a, b, s in mind.sames[n_sames:]]
    return facts


def open_notebook(game):
    """The Notebook event: a notebook left open, always with something worth reading. The owner is picked at
    random among the guests who learned something last night about another guest still in the house, and it
    shows just that; if nobody did, older pages that still concern someone in the house. None if there are none."""
    def relevant(facts, owner):
        return [f for f in facts if fact_targets(f) & (game.alive - {owner})]

    for older, pages in ((False, game.night_log.get(game.round, {})),
                         (True, {c: facts_learned(({}, {}, 0, 0), game.minds[c]) for c in game.alive})):
        clues = {c: relevant(facts, c) for c, facts in pages.items()}
        owners = [c for c in sorted(clues) if clues[c]]
        if owners:
            c = game.rng.choice(owners)
            return {"round": game.round, "char": c, "facts": clues[c], "older": older}
    return None


def fact_targets(fact):
    kind = fact[0]
    if kind == "count":
        return set(fact[1])
    if kind == "same":
        return {fact[1], fact[2]}
    return {fact[1]}


def fact_true(fact, viewer, roles):
    """Is the fact true in a world `roles`, as seen by a character whose role is `viewer`?"""
    kind = fact[0]
    if kind == "side":
        return registers_bad(roles[fact[1]], viewer) == fact[2]
    if kind == "role":
        return fact[2] == roles[fact[1]]
    if kind == "count":
        return sum(registers_bad(roles[x], viewer) for x in fact[1]) == fact[2]
    return (registers_bad(roles[fact[1]], viewer) == registers_bad(roles[fact[2]], viewer)) == fact[3]


def signature(facts):
    """The kinds of facts learned, e.g. "role+side" or "none" (what the fact list says about the role)."""
    return "+".join(sorted({f[0] for f in facts})) or "none"
