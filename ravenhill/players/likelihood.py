"""The smart player's model of the game: how likely everything it observed is under a
hypothetical assignment of roles ("world").

Observations are numbered items: first the day advice, then Interviews, then Notebook
results, then Footprints. item_ll(i, roles) scores one item; touching[c] lists the items that depend on character c.
What depends only on who holds a role (the Blackmailer's silences, the Hypnotist's and the Paymaster's
nights) is a table per role: tables[role][c] is the log-likelihood if c holds it."""
import math

from .. import events
from ..advice import advice_record, colonel_debts, copy_flags
from ..notebook import fact_targets, fact_true, signature
from ..rules import N_CHARS, PAIRS, STANDARD, is_bad
from .calibration import calib_key

LOG_TINY = -20.0  # "practically impossible"
LOG_RARE = math.log(0.03)  # happens, but rarely (a hypnosis or a bribe that did not come off)


class WorldModel:
    def __init__(self, view, calib, rules=STANDARD):
        self.calib = calib
        self.roster = rules.roster
        self.fixed = {c: r for c, (r, _, _) in view.revealed.items()}
        self.free = [c for c in range(N_CHARS) if c not in self.fixed]
        self.removed_round = {c: rnd for c, (_, rnd, _) in view.revealed.items()}
        self.base = view.advice                            # the day advice
        self.advice = view.advice + view.interviews  # advice-shaped items
        self.n_first = len(view.advice)
        self.notebooks = view.notebooks
        self.footprints = sorted(view.footprints.items())  # (round, (a, b))
        self.events = view.events
        self._records, self._pools = {}, {}
        self.n_items = len(self.advice) + len(self.notebooks) + len(self.footprints)
        rounds = range(1, view.round + 1)
        before = {t: [r for c, (r, rnd, _) in view.revealed.items() if rnd < t] for t in rounds}
        self.n_alive = {t: N_CHARS - len(before[t]) for t in rounds}
        self.bad_alive = {t: rules.n_bad - sum(map(is_bad, before[t])) for t in rounds}
        self.touching = [set() for _ in range(N_CHARS)]  # items that depend on each character
        self.spoken = [set() for _ in range(N_CHARS)]    # advice given by each character
        for i, a in enumerate(self.advice):
            for c in (a.speaker, a.save, a.eliminate):
                if c is not None:
                    self.touching[c].add(i)
            self.spoken[a.speaker].add(i)
        for j, sc in enumerate(self.notebooks):
            for c in {sc["char"]}.union(*(fact_targets(f) for f in sc["facts"])):
                self.touching[c].add(len(self.advice) + j)
        for k, (_, pair) in enumerate(self.footprints):
            for c in pair:
                self.touching[c].add(len(self.advice) + len(self.notebooks) + k)
        # a hypnotised guest's advice is explained by whoever said the same the day before, if that one is the Hypnotist
        self.echo = [self._echo(a) if i < self.n_first else set() for i, a in enumerate(self.advice)]
        for i, echo in enumerate(self.echo):
            for y in echo:
                self.touching[y].add(i)
        # a save that a Paymaster (the character saved) could have bought
        self.bribable = [i < self.n_first and self._bribable(a) for i, a in enumerate(self.advice)]
        self.tables = {}
        if "Blackmailer" in self.roster:
            self.tables["Blackmailer"] = self._silence_table(view)
        if "Hypnotist" in self.roster:
            self.tables["Hypnotist"] = self._hypnosis_table(view)
        if "Paymaster" in self.roster:
            self.tables["Paymaster"] = self._bribe_table(view)
        self.copies = [copy_flags(a, self._round_advice(a.round - 1), self._record_at(a.round)) for a in self.advice]
        self.repay = [self._repay_targets(a) for a in self.advice]

    def _round_advice(self, t):
        return [a for a in self.base if a.round == t]

    def _record_at(self, t):
        """Public advice record at the start of round t (what game.public_record() returned then)."""
        if t not in self._records:
            revealed = {c: r for c, r in self.fixed.items() if self.removed_round[c] < t}
            self._records[t] = advice_record([a for a in self.base if a.round < t], revealed)
        return self._records[t]

    def _alive_at(self, t):
        return {x for x in range(N_CHARS) if self.removed_round.get(x, t) >= t}

    def _echo(self, a):
        """The speakers whose advice the day before a could be repeating word for word (after a night when the
        Hypnotist could act)."""
        if a.round < 2 or not events.allows_investigations(self.events.get(a.round)):
            return set()
        return {b.speaker for b in self._round_advice(a.round - 1) if b.speaker != a.speaker and _repeats(a, b)}

    def _bribe_pool(self, y, t):
        """Whom y would bribe on night t if y were the Paymaster (abilities.menace_target): whoever accused y
        last round, else whoever had the best public advice record."""
        if (y, t) not in self._pools:
            alive = self._alive_at(t)
            pool = sorted({a.speaker for a in self._round_advice(t - 1) if a.eliminate == y and a.speaker in alive})
            if not pool:
                record = self._record_at(t)
                others = [x for x in alive if x != y]
                best = max(record[x] for x in others)
                pool = [x for x in others if record[x] == best]
            self._pools[(y, t)] = pool
        return self._pools[(y, t)]

    def _bribable(self, a):
        return (a.save is not None and events.allows_investigations(self.events.get(a.round))
                and a.speaker in self._bribe_pool(a.save, a.round))

    def _repay_targets(self, a):
        """Whom a Colonel speaker would repay: last round's savers and accusers who are still alive."""
        t = a.round
        present = {x for x in range(N_CHARS) if self.removed_round.get(x, t) >= t}
        return colonel_debts(self._round_advice(t - 1), a.speaker, present)

    def random_world(self, rng):
        pool = list(self.roster)
        for r in self.fixed.values():
            pool.remove(r)
        rng.shuffle(pool)
        roles = [None] * N_CHARS
        for c, r in self.fixed.items():
            roles[c] = r
        for c, r in zip(self.free, pool):
            roles[c] = r
        return roles

    def item_ll(self, i, roles):
        if i < len(self.advice):
            return self.advice_ll(i, roles)
        j = i - len(self.advice)
        if j < len(self.notebooks):
            return self.notebook_ll(self.notebooks[j], roles)
        return self.footprints_ll(self.footprints[j - len(self.notebooks)][1], roles)

    def footprints_ll(self, pair, roles):
        """Footprints: one of the two is a conspirator picked at random, the other any guest; so neither being
        guilty is impossible, and both being guilty is twice as likely as one."""
        k = sum(is_bad(roles[c]) for c in pair)
        return math.log(k) if k else LOG_TINY

    def advice_ll(self, i, roles):
        """Log-likelihood of advice i if the speaker holds roles[speaker]. In a Dinner Party the eliminate
        is missing and in an Inquest the save; an Interview uses its own calibration and skips
        the patterns (Confidant, Colonel, Copycat) that only hold for first advice."""
        a = self.advice[i]
        if self.echo[i] and any(roles[y] == "Hypnotist" for y in self.echo[i]):
            return 0.0  # under hypnosis: the Hypnotist's advice, word for word
        t = a.round
        second = i >= self.n_first
        role = roles[a.speaker]
        full = a.save is not None and a.eliminate is not None
        same = full and a.save == a.eliminate
        if full and (role == "Lunatic") != same:
            return LOG_TINY  # only the Lunatic names the same character twice
        if same:
            return -math.log(max(self.n_alive[t] - 1, 1))
        nb = self.bad_alive[t] - is_bad(role)
        ng = self.n_alive[t] - 1 - nb
        partner = None
        if role in PAIRS:
            partner = next(x for x in range(N_CHARS) if x != a.speaker and roles[x] == role)
            if self.removed_round.get(partner, t) < t:
                partner = None
        if role == "Lover" and partner in (a.save, a.eliminate):
            return LOG_TINY  # a Lover never names their partner
        key = calib_key(role, t, partner is not None, self.events.get(t))
        pe, ps, qs, qe = self.calib.get("I|" + key if second else key) or self.calib.get(key, (0.5, 0.5, 0.1, 0.1))
        le = ls = 1.0
        if a.eliminate is not None:
            le = pe / max(nb, 1) if is_bad(roles[a.eliminate]) else (1 - pe) / max(ng, 1)
        if a.save is None:
            pass
        elif role == "Confidant" and partner is not None and not second:
            ls = 0.98 if a.save == partner else 0.02 / max(self.n_alive[t] - 2, 1)
        else:
            ls = ps / max(ng, 1) if not is_bad(roles[a.save]) else (1 - ps) / max(nb, 1)
        if second:
            return math.log(le) + math.log(ls)
        if role == "Colonel":
            ls, le = self._colonel(i, ls, le)
        bought = self.bribable[i] and roles[a.save] == "Paymaster"
        if bought:
            ls = 1.0  # the Paymaster's bought save (see _bribe_table)
        copies_save, copies_elim = self.copies[i]
        copy = (qs if copies_save else 1 - qs) if a.save is not None and not bought else 1.0
        copy *= (qe if copies_elim else 1 - qe) if a.eliminate is not None else 1.0
        return math.log(le) + math.log(ls) + math.log(copy)

    def notebook_ll(self, sc, roles):
        """A Notebook result: the kinds of facts say what the role could be, and each fact is
        usually true (as the character's own abilities see the world)."""
        c, t = sc["char"], sc["round"]
        role = roles[c]
        sigs = self.calib.get(f"N|{calib_key(role, t, False, self.events.get(t))}", {})
        # the game only opens a notebook with something in it, so this is P(kinds of facts | some facts)
        ll = math.log(sigs.get(signature(sc["facts"]), 1e-3)) - math.log(max(1 - sigs.get("none", 0.0), 1e-3))
        acc = self.calib.get(f"A|{role}", (0.85,))[0]
        for f in sc["facts"]:
            ll += math.log(acc) if fact_true(f, role, roles) else math.log((1 - acc) * _chance_false(f, self.roster))
        return ll

    def _colonel(self, i, ls, le):
        """A Colonel saves one of last round's savers and eliminates one of its accusers, when it has them."""
        a = self.advice[i]
        savers, accusers = self.repay[i]
        others = self.n_alive[a.round] - 1
        if savers and a.save is not None:
            ls = 0.97 / len(savers) if a.save in savers else 0.03 / max(others - len(savers), 1)
        pool = [x for x in accusers if x != a.save]
        if pool and a.eliminate is not None:
            le = 0.97 / len(pool) if a.eliminate in pool else 0.03 / max(others - len(pool), 1)
        return ls, le

    def tables_of(self, roles):
        """Log-likelihood of everything that depends only on who holds a role (see self.tables)."""
        return sum(table[roles.index(r)] for r, table in self.tables.items() if r in roles)

    def table_delta(self, roles, a, b):
        """How tables_of changes if characters a and b swap roles."""
        d = 0.0
        for r, table in self.tables.items():
            if roles[a] == r:
                d += table[b] - table[a]
            elif roles[b] == r:
                d += table[a] - table[b]
        return d

    def _hypnosis_table(self, view):
        """Log-likelihood of the day's advice if character y were the Hypnotist. Every night it can act (both guests
        it named the day before still in the house), it hypnotises someone who then repeats that advice word for
        word; so some speaker must repeat it, or rarely nobody (the subject silenced, a hidden half's guest gone)."""
        table = [0.0] * N_CHARS
        for t in range(2, view.round + 1):
            alive = self._alive_at(t)
            if not events.allows_investigations(self.events.get(t)) or len(alive) < 4:
                continue
            yesterday = {a.speaker: a for a in self._round_advice(t - 1)}
            today = self._round_advice(t)
            for y in alive:
                b = yesterday.get(y)
                if b is None or not {b.save, b.eliminate} - {None} <= alive:
                    continue
                if not any(a.speaker != y and _repeats(a, b) for a in today):
                    table[y] += LOG_RARE
        return table

    def _bribe_table(self, view):
        """Log-likelihood of who advised clearing whom, if character y were the Paymaster. Every night it can act
        it bribes one of _bribe_pool(y, t), who then advises clearing y; the bought save itself scores 1 in advice_ll."""
        table = [0.0] * N_CHARS
        for t in range(1, view.round + 1):
            alive = self._alive_at(t)
            if not events.allows_investigations(self.events.get(t)) or len(alive) < 3 or self.events.get(t) == "Inquest":
                continue
            saves = {a.speaker: a.save for a in self._round_advice(t)}
            for y in alive:
                pool = [x for x in self._bribe_pool(y, t) if x in saves]
                if pool:
                    k = sum(saves[x] == y for x in pool)
                    table[y] += math.log(k / len(pool)) if k else LOG_RARE
        return table

    def _silence_table(self, view):
        """Log-likelihood of the observed silences if character y were the Blackmailer, for every y.
        The Blackmailer targets whoever accused it last round, else the best public advice record."""
        table = [0.0] * N_CHARS
        for t in range(1, view.round + 1):
            alive = {c for c in range(N_CHARS) if self.removed_round.get(c, t) >= t}
            s = view.silenced.get(t)
            record = self._record_at(t)
            for y in range(N_CHARS):
                if y not in alive or len(alive) < 2:
                    table[y] += 0.0 if s is None else LOG_TINY
                    continue
                if s is None:
                    table[y] += LOG_TINY
                    continue
                accusers = [a.speaker for a in self.base if a.round == t - 1 and a.eliminate == y and a.speaker in alive]
                if accusers:
                    pool = accusers
                else:
                    others = [x for x in alive if x != y]
                    best = max(record[x] for x in others)
                    pool = [x for x in others if record[x] == best]
                table[y] += math.log(pool.count(s) / len(pool)) if s in pool else LOG_TINY
        return table


def _repeats(a, b):
    """Could advice a be advice b (the day before) repeated word for word? Compares the halves both show, since
    a Dinner Party or an Inquest hides one; the guest repeating it cannot be one b named."""
    shown = [(x, y) for x, y in ((a.save, b.save), (a.eliminate, b.eliminate)) if x is not None and y is not None]
    return bool(shown) and all(x == y for x, y in shown) and a.speaker not in (b.save, b.eliminate)


def _chance_false(fact, roster):
    """How many different false versions a fact has, as a probability of one of them."""
    kind = fact[0]
    if kind == "role":
        return 1 / max(len(set(roster)) - 1, 1)
    if kind == "count":
        return 1 / max(len(fact[1]), 1)
    return 1.0
