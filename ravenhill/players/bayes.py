"""The smart player: samples worlds consistent with everything observed (parallel-tempering
MCMC over role assignments) and acts on the posterior P(bad). In an Interview round (a rule variant)
it questions the advisor it trusts most at the round's first decision; the Notebook and the Footprints
need no action, they are simply part of what it sees."""
import math

from ..rules import N_CHARS, PAIRS, STANDARD, is_bad
from .calibration import load_calibration
from .likelihood import WorldModel
from .simple import pick_best


def sample_bad_counts(model, rng, burn, steps, temps):
    """How often each character is bad in the T=1 chain after burn-in."""
    chains = []
    for _ in temps:
        roles = model.random_world(rng)
        ll = [model.item_ll(i, roles) for i in range(model.n_items)]
        chains.append([roles, ll, sum(ll) + model.tables_of(roles)])
    counts = [0] * N_CHARS
    if len(model.free) < 2:
        return counts
    for it in range(burn + steps):
        for ch, temp in zip(chains, temps):
            _step(model, rng, ch, temp)
        if it % 5 == 0:
            k = rng.randrange(len(temps) - 1)
            a, b = chains[k], chains[k + 1]
            d = (1 / temps[k] - 1 / temps[k + 1]) * (b[2] - a[2])
            if d >= 0 or rng.random() < math.exp(d):
                chains[k], chains[k + 1] = b, a
        if it >= burn:
            roles = chains[0][0]
            for c in model.free:
                if is_bad(roles[c]):
                    counts[c] += 1
    return counts


def _step(model, rng, ch, temp):
    """Propose swapping two characters' roles; accept by the Metropolis rule."""
    roles, ll, _ = ch
    a, b = rng.sample(model.free, 2)
    if roles[a] == roles[b]:
        return
    affected = model.touching[a] | model.touching[b]
    pair_moved = [r for r in (roles[a], roles[b]) if r in PAIRS]  # a pair's advice depends on the partner
    table_delta = model.table_delta(roles, a, b)
    roles[a], roles[b] = roles[b], roles[a]
    if pair_moved:
        for x in range(N_CHARS):
            if roles[x] in pair_moved:
                affected = affected | model.spoken[x]
    new = {i: model.item_ll(i, roles) for i in affected}
    delta = sum(v - ll[i] for i, v in new.items()) + table_delta
    if delta >= 0 or rng.random() < math.exp(delta / temp):
        for i, v in new.items():
            ll[i] = v
        ch[2] += delta
    else:
        roles[a], roles[b] = roles[b], roles[a]


class BayesPlayer:
    def __init__(self, rng, rules=STANDARD, calib=None, burn=1000, steps=6000, temps=(1.0, 1.6, 2.5, 4.0, 6.5)):
        self.rng = rng
        self.rules = rules
        self.burn = burn
        self.steps = steps
        self.temps = temps
        self.calib = calib if calib is not None else load_calibration()
        self.last_p = None

    def p_bad(self, view):
        model = WorldModel(view, self.calib, self.rules)
        counts = sample_bad_counts(model, self.rng, self.burn, self.steps, self.temps)
        p = [n / self.steps for n in counts]
        if len(model.free) == 1:  # the last hidden character holds whatever role is left
            left = list(model.roster)
            for r in model.fixed.values():
                left.remove(r)
            p[model.free[0]] = float(is_bad(left[0]))
        for c, (r, _, _) in view.revealed.items():
            p[c] = float(is_bad(r))
        return p

    def choose(self, view, tools=None):
        """`tools` is the game (for an interview); without it no tools are used."""
        p = self.p_bad(view)
        if tools is not None:
            view, p = self._use_a_tool(view, p, tools)
        self.last_p = p
        sign = 1 if view.phase == "eliminate" else -1
        return pick_best(self.rng, view.alive, lambda c: sign * p[c])

    def _use_a_tool(self, view, p, tools):
        trusted = min(view.alive, key=lambda c: (p[c], self.rng.random()))
        if not tools.can_use("interview", trusted):
            return view, p
        tools.interview(trusted)
        view = tools.view()
        return view, self.p_bad(view)
