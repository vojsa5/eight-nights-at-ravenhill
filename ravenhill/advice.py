"""Day advice: whom each character tells the player to save and to eliminate.

Every policy is a function (ctx) -> (save, eliminate), chosen by `policy_for`. The patterns at the
end (the public advice record, whom the Colonel repays, whom the Copycat copies) are shared with
the smart player (players/likelihood.py), so both sides use one definition.
"""
from collections import Counter
from dataclasses import dataclass

from . import events
from .rules import GRUDGE, is_bad
from .view import Advice


@dataclass
class Context:
    game: object
    mind: object
    others: list    # living characters except the speaker
    p: dict         # the speaker's P(bad) for each of them
    accusers: set   # who advised eliminating the speaker last round
    jitter: dict    # tiny random tie-breakers
    last: list      # last round's advice

    @property
    def rng(self):
        return self.game.rng


def advise_round(game):
    """Every living character who is not silenced advises, as far as the round's event allows (events.py).
    The guest the Paymaster bribed last night advises clearing the Paymaster; the guest under hypnosis
    repeats, word for word, what the Hypnotist advised the day before (game.suggestions, kept before any event
    trimmed it). Nothing of either is public."""
    event = game.events.get(game.round)
    public = game.public_roles()
    last = game.last_advice()
    hypnotist, subject = game.hypnosis.get(game.round, (None, None))
    paymaster, bribed = game.bribes.get(game.round, (None, None))
    speakers = [c for c in sorted(game.alive) if len(game.alive) >= 3 and game.silenced.get(game.round) != c]
    today = {}
    for c in speakers:
        others = [x for x in sorted(game.alive) if x != c]
        if c == subject:
            save, eliminate = game.suggestions[game.round - 1]
            today[c] = Advice(game.round, c, save, eliminate)
            game.hypnotised[game.round] = c
        elif c == bribed and paymaster in game.alive:
            today[c] = bribed_advice(game, c, paymaster, public, last)
        else:
            today[c] = game.advice_of(c, others, public, last)
        if game.roles[c] == "Hypnotist":
            game.suggestions[game.round] = (today[c].save, today[c].eliminate)
    lovers = [c for c in sorted(today) if game.roles[c] == "Lover" and c != subject and not (c == bribed and paymaster in game.alive)]
    if game.rules.lovers_agree and len(lovers) == 2 and not events.single_tip(event):
        agree(today[lovers[0]], today[lovers[1]])
    for c in sorted(today):
        events.trim_advice(event, today[c])
        game.advice.append(today[c])


def agree(first, second):
    """The Lovers tell each other everything, and their stories match: when their tips share nothing, the second
    takes up one of the first's, the arrest if it can, else the clear. (The first never names the second, nor
    itself, so the second still never names the other Lover.) A hypnotised or bribed Lover says what it must."""
    if first.save == second.save or first.eliminate == second.eliminate:
        return
    if first.eliminate != second.save:
        second.eliminate = first.eliminate
    elif first.save != second.eliminate:
        second.save = first.save
    else:
        second.save, second.eliminate = first.save, first.eliminate


def bribed_advice(game, c, paymaster, public, last):
    """Bought testimony: advises clearing the Paymaster, and otherwise as usual (a Lunatic names the Paymaster twice)."""
    others = [x for x in sorted(game.alive) if x not in (c, paymaster)]
    if len(others) < 2:
        return Advice(game.round, c, paymaster, others[0])
    a = game.advice_of(c, others, public, last)
    a.save = paymaster
    if game.roles[c] == "Lunatic":
        a.eliminate = paymaster
    return a


def interview(game, c):
    """An Interview: another tip, the speaker's best save and eliminate among the characters they have not named today."""
    first = next((a for a in game.advice if a.round == game.round and a.speaker == c), None)
    named = {x for x in (first.save, first.eliminate) if x is not None} if first else set()
    others = [x for x in sorted(game.alive) if x != c]
    pool = [x for x in others if x not in named]
    return game.advice_of(c, pool if len(pool) >= 3 else others, game.public_roles(), game.last_advice())


def advice_of(game, c, others, public, last):
    m = game.minds[c]
    ctx = Context(game, m, others, m.beliefs(others, public), {a.speaker for a in last if a.eliminate == c},
                  {x: game.rng.random() * 1e-3 for x in others}, last)
    save, eliminate = policy_for(ctx)(ctx)
    return Advice(game.round, c, save, eliminate)


def policy_for(ctx):
    role = ctx.mind.role
    if role == "Novelist":
        return novelist
    if role == "Possessed":
        return possessed
    if role == "Witness":
        return witness
    if role == "Framer" and ctx.mind.victim in ctx.others:
        return framer
    if role == "Lunatic":
        return lunatic
    if role == "Copycat":
        return copycat
    if role == "Colonel":
        return colonel
    if role == "Lover":
        return lover
    if is_bad(role) and not (role == "Mole" and ctx.game.round < ctx.game.rules.mole_betrays_from):
        return deceive
    return honest


def honest(ctx):
    """Good characters (and the Mole while building trust): eliminate the most suspected,
    save the most trusted. Confidants always save each other; the Mole never gives away a teammate."""
    m, p = ctx.mind, ctx.p
    susp = {x: p[x] + GRUDGE * (x in ctx.accusers) + ctx.jitter[x] for x in ctx.others}
    confidant = None
    if m.role == "Confidant":
        confidant = next((x for x, r in m.roles.items() if r == "Confidant" and x in ctx.others), None)
    pool = [x for x in ctx.others if x != confidant]
    if m.role == "Mole":
        pool = [x for x in ctx.others if p[x] < 1] or ctx.others
    elim = max(pool, key=susp.get)
    save = confidant if confidant is not None else min((x for x in ctx.others if x != elim), key=susp.get)
    return save, elim


def deceive(ctx):
    """Bad characters: eliminate whoever looks good (above all their accusers), save teammates."""
    p = ctx.p
    elim = max(ctx.others, key=lambda x: (1 - p[x]) + 2 * GRUDGE * (x in ctx.accusers) + ctx.jitter[x])
    save = max((x for x in ctx.others if x != elim), key=lambda x: p[x] + ctx.jitter[x])
    return save, elim


def seance_held(game):
    """Has the Séance been held yet (tonight's included)? From then on the Possessed advises upside down."""
    return any(e == "Séance" and r <= game.round for r, e in game.events.items())


def possessed(ctx):
    """Honest until the Séance. From the Séance on, Lord Edmund's restless spirit speaks through them, and the dead
    speak backwards: save whoever they suspect most, eliminate whoever they trust most."""
    save, elim = honest(ctx)
    return (elim, save) if seance_held(ctx.game) else (save, elim)


def witness(ctx):
    """Too frightened of the guilty to accuse anyone they suspect: saves whoever they trust most and, for
    the elimination, names the next guest they trust most, someone they believe is harmless."""
    p = ctx.p
    trust = {x: p[x] + GRUDGE * (x in ctx.accusers) + ctx.jitter[x] for x in ctx.others}
    save = min(ctx.others, key=trust.get)
    return save, min((x for x in ctx.others if x != save), key=trust.get)


def novelist(ctx):
    """Hungry for drama: saves whoever was most accused last round, eliminates at random."""
    votes = Counter(a.eliminate for a in ctx.last)
    save = max(ctx.others, key=lambda x: votes[x] + ctx.jitter[x])
    elim = ctx.rng.choice([x for x in ctx.others if x != save])
    return save, elim


def framer(ctx):
    """Always advises eliminating the framed victim; saves someone at random."""
    elim = ctx.mind.victim
    save = ctx.rng.choice([x for x in ctx.others if x != elim])
    return save, elim


def copycat(ctx):
    """Repeats last round's advice of the most reliable-looking advisor, but saves a known
    teammate instead and never accuses one. Nothing to repeat in round 1: lies like the others."""
    game, m, p = ctx.game, ctx.mind, ctx.p
    idols = copycat_sources(ctx.last, game.public_record(), m.c)
    if not idols:
        return deceive(ctx)
    idol = ctx.rng.choice(idols)
    mates = [x for x in ctx.others if p[x] == 1]
    save = ctx.rng.choice(mates) if mates else idol.save
    if save not in ctx.others:
        save = max((x for x in ctx.others if x != idol.eliminate), key=lambda x: p[x] + ctx.jitter[x])
    elim = idol.eliminate
    if elim not in ctx.others or elim == save or p[elim] == 1:
        elim = max((x for x in ctx.others if x != save), key=lambda x: (1 - p[x]) + ctx.jitter[x])
    return save, elim


def lover(ctx):
    """Lies like other bad characters, but never advises saving (or eliminating) their Lover. The two Lovers'
    tips are then made to agree on one (advise_round, agree)."""
    p = ctx.p
    partner = next((x for x, r in ctx.mind.roles.items() if r == "Lover"), None)
    elim = max((x for x in ctx.others if x != partner),
               key=lambda x: (1 - p[x]) + 2 * GRUDGE * (x in ctx.accusers) + ctx.jitter[x])
    pool = [x for x in ctx.others if x not in (elim, partner)] or [x for x in ctx.others if x != elim]
    save = max(pool, key=lambda x: p[x] + ctx.jitter[x])
    return save, elim


def colonel(ctx):
    """Repays favours and slights from last round: saves whoever advised saving them and
    eliminates whoever advised eliminating them. With nothing to repay, advises honestly."""
    savers, accusers = colonel_debts(ctx.last, ctx.mind.c, ctx.others)
    honest_save, honest_elim = honest(ctx)
    save = ctx.rng.choice(savers) if savers else honest_save
    pool = [x for x in accusers if x != save]
    if pool:
        elim = ctx.rng.choice(pool)
    elif honest_elim != save:
        elim = honest_elim
    else:
        elim = max((x for x in ctx.others if x != save), key=lambda x: ctx.p[x] + ctx.jitter[x])
    return save, elim


def lunatic(ctx):
    """Advises saving and eliminating the same character."""
    target = ctx.rng.choice(ctx.others)
    return target, target


# Patterns the smart player reads too (players/likelihood.py)

def advice_record(advice, revealed):
    """Per advisor: advice that proved right minus advice that proved wrong, given the roles
    revealed so far (char -> role)."""
    record = Counter()
    for a in advice:
        for target, wants_bad in ((a.eliminate, True), (a.save, False)):
            if target in revealed:
                record[a.speaker] += 1 if is_bad(revealed[target]) == wants_bad else -1
    return record


def colonel_debts(last_advice, c, present):
    """Whom the Colonel `c` owes: those still `present` who last round advised saving `c`, and those
    who advised eliminating `c`."""
    savers = [a.speaker for a in last_advice if a.save == c and a.speaker in present]
    accusers = [a.speaker for a in last_advice if a.eliminate == c and a.speaker in present]
    return savers, accusers


def copycat_sources(last_advice, record, speaker):
    """Last round's advice of the most reliable-looking other advisor(s), ignoring Lunatic-style
    advice (the same character twice). A list, because several advisors can tie."""
    pool = [a for a in last_advice if a.speaker != speaker and a.save != a.eliminate]
    if not pool:
        return []
    best = max(record[a.speaker] for a in pool)
    return [a for a in pool if record[a.speaker] == best]


def copy_flags(advice, last_advice, record):
    """Does this advice repeat a possible Copycat source's save / eliminate target?"""
    idols = copycat_sources(last_advice, record, advice.speaker)
    return (advice.save is not None and any(advice.save == b.save for b in idols),
            advice.eliminate is not None and any(advice.eliminate == b.eliminate for b in idols))
