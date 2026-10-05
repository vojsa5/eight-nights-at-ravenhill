"""What the browser receives: the public state of a game as JSON-ready data."""
from collections import Counter

from ..events import TOOLS, allows_investigations
from ..rules import N_CHARS, NAMES, PAIRS, PROFESSIONS, is_bad


def sealed(g):
    """Guests whose clear or arrest was a mistake: until the case is closed the player learns only their
    side (which the mistake gives away anyway), not their role."""
    return set() if g.finished else {h["char"] for h in g.history if not h["ok"]}


def art_keys(g, hidden):
    """Portrait per guest, as a path under web/art/ without the extension: their own sepia portrait
    (guests/) until their role is revealed, then the role's (roles/). Each of the two Confidants (and Lovers)
    gets one figure, in reveal order, so the picture never hints at where the partner sits."""
    known = [c for c in g.revealed if c not in hidden] + ([c for c in range(N_CHARS) if c not in g.revealed] if g.finished else [])
    keys, seen = {c: "guests/" + NAMES[c].split(" ", 1)[-1].lower() for c in range(N_CHARS)}, Counter()
    for c in known:
        role = g.roles[c]
        if role in PAIRS:
            keys[c] = f"roles/{role.lower()}-{'ab'[seen[role]]}"
            seen[role] += 1
        else:
            keys[c] = f"roles/{role.lower()}"
    return keys


def fact_json(f):
    kind = f[0]
    if kind == "side":
        return {"kind": kind, "target": f[1], "bad": f[2]}
    if kind == "role":
        return {"kind": kind, "target": f[1], "role": f[2]}
    if kind == "count":
        return {"kind": kind, "chars": list(f[1]), "k": f[2]}
    return {"kind": kind, "a": f[1], "b": f[2], "same": f[3]}


def advice_json(a):
    return {"round": a.round, "speaker": a.speaker, "save": a.save, "eliminate": a.eliminate}


# The conspirators whose night's work leaves traces the whole house sees next morning (web/js/night.js has the texts).
TRACES = ("Forger", "Eavesdropper", "Hypnotist", "Mole", "Paymaster", "Lover")  # the roles whose night work has an effect


def night_traces(g, r):
    """Which of TRACES were at work in the house on night r: the roles only, never who holds them. A trace
    shows whenever its conspirator is in the house, even on a night they happen to skip (the Hypnotist and the
    Paymaster on night I, the Paymaster with two guests left), so it stops only once they are gone. The Lovers
    leave a trace only while both are in the house (they meet at night); nobody works in a Blackout."""
    if not allows_investigations(g.events.get(r)):
        return []
    present = [g.roles[c] for c in range(N_CHARS) if not (c in g.revealed and g.revealed[c][1] < r)]
    return [role for role in TRACES if (present.count(role) == 2 if role == "Lover" else role in present)]


def game_state(gid, g):
    hidden = sealed(g)
    art = art_keys(g, hidden)
    chars = []
    for c in range(N_CHARS):
        info = {"id": c, "name": NAMES[c], "short": NAMES[c].split(" ", 1)[-1], "profession": PROFESSIONS[c],
                "alive": c in g.alive, "art": art[c], "portrait": "guests/" + NAMES[c].split(" ", 1)[-1].lower()}
        if c in g.revealed:
            role, rnd, how = g.revealed[c]
            info.update(bad=is_bad(role), how=how, removedRound=rnd, **({} if c in hidden else {"role": role}))
        elif g.finished:
            info.update(role=g.roles[c], bad=is_bad(g.roles[c]))
        chars.append(info)
    return {
        "id": gid, "round": g.round, "rounds": g.rules.rounds, "phase": g.phase,
        "roster": list(g.rules.roster), "finished": g.finished, "score": g.score, "chars": chars,
        "history": [{k: v for k, v in h.items() if not (k == "role" and h["char"] in hidden)} for h in g.history],
        "silenced": {str(r): c for r, c in g.silenced.items()},
        "advice": [advice_json(a) for a in g.advice],
        "events": {str(r): e for r, e in g.events.items() if r <= g.round},  # so far; the page knows the fixed schedule (web/js/events.js)
        "toolReady": {tool: g.tool_ready(tool) for tool in TOOLS},
        "notebooks": [{"round": s["round"], "char": s["char"], "facts": [fact_json(f) for f in s["facts"]], "older": s.get("older", False)}
                      for s in g.notebooks],
        "interviews": [advice_json(a) for a in g.interviews],
        "footprints": {str(r): list(pair) for r, pair in g.footprints.items()},
        "traces": {str(r): night_traces(g, r) for r in range(1, g.round + 1)},
    }
