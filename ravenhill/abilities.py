"""Night abilities: what each role learns or does at night.

Each ability is a function (game, mind, others, unknown, forged) registered in ABILITIES.
`others` are the living characters except the actor, `unknown` those the actor knows nothing about.
A forged actor gets a false result.
"""
from .rules import is_bad, registers_bad


def run_night(game):
    """The Forger, Blackmailer, Paymaster, Hypnotist and Eavesdropper pick their targets first, then everyone
    acts; the Eavesdropper acts last, so it can copy what its target learned tonight, and last of all the
    hypnotised guest tells the Hypnotist everything they know."""
    forged = None
    forger = game.find_alive("Forger")
    if forger is not None:
        forged = menace_target(game, forger)
    blackmailer = game.find_alive("Blackmailer")
    if blackmailer is not None and len(game.alive) > 1:
        game.silenced[game.round] = menace_target(game, blackmailer)
    paymaster = game.find_alive("Paymaster")
    if paymaster is not None and len(game.alive) > 2 and game.round > 1:  # from night II, as the Hypnotist
        game.bribes[game.round] = (paymaster, menace_target(game, paymaster))
    hypnotist = game.find_alive("Hypnotist")
    said = game.suggestions.get(game.round - 1)
    if hypnotist is not None and said and set(said) <= game.alive and len(game.alive) > 3:
        # tomorrow the subject repeats what the Hypnotist said today, so it cannot be one of the two it named
        game.hypnosis[game.round] = (hypnotist, menace_target(game, hypnotist, exclude=set(said)))
    eavesdropper = game.find_alive("Eavesdropper")
    if eavesdropper is not None:
        m = game.minds[eavesdropper]
        m.following = most_reliable(game, eavesdropper)
        m.following_knew = game.minds[m.following].snapshot()
    for c in sorted(game.alive):
        if c != eavesdropper:
            game.use_ability(c, c == forged)
    if eavesdropper is not None:
        game.use_ability(eavesdropper, eavesdropper == forged)
    share_between_lovers(game)
    if game.round in game.hypnosis:
        hypnotist, subject = game.hypnosis[game.round]
        tell(game.minds[subject], game.minds[hypnotist])


def share_between_lovers(game):
    """The Lovers tell each other everything they know, every night."""
    lovers = [game.minds[c] for c in sorted(game.alive) if game.roles[c] == "Lover"]
    if len(lovers) != 2:
        return
    for src, dst in (lovers, lovers[::-1]):
        tell(src, dst)


def tell(src, dst):
    """src tells dst everything it knows (without overriding what dst already knows)."""
    for x, r in src.roles.items():
        if x != dst.c:
            dst.roles.setdefault(x, r)
    for x, v in src.known.items():
        if x != dst.c and x not in dst.roles:
            dst.known.setdefault(x, v)
    dst.counts += [item for item in src.counts if item not in dst.counts]
    dst.sames += [item for item in src.sames if item not in dst.sames]


def use_ability(game, c, forged):
    m = game.minds[c]
    ability = ABILITIES.get(m.role)
    if ability is None:
        return
    others = [x for x in sorted(game.alive) if x != c]
    unknown = [x for x in others if x not in m.known and x not in m.roles]
    ability(game, m, others, unknown, forged)


def menace_target(game, attacker, exclude=()):
    """Forger / Blackmailer / Paymaster / Hypnotist target: whoever accused the attacker last round, else the
    character whose public advice record looks most reliable; never anyone in `exclude`."""
    accusers = [x for x in game.accusers(attacker) if x not in exclude]
    if accusers:
        return game.rng.choice(accusers)
    return most_reliable(game, attacker, exclude)


def most_reliable(game, actor, exclude=()):
    """The living character (other than the actor) whose public advice record looks best."""
    record = game.public_record()
    others = [x for x in sorted(game.alive) if x != actor and x not in exclude]
    return max(others, key=lambda x: (record[x], game.rng.random()))


def check_alignment(game, m, others, unknown, forged):
    """Sleuth and Amateur: check one character, preferring whoever accused them. The Amateur's result is random."""
    pool = [x for x in game.accusers(m.c) if x in unknown] or unknown
    if pool:
        t = game.rng.choice(pool)
        if m.role == "Amateur":
            m.known[t] = game.rng.random() < 0.5
        else:
            m.known[t] = registers_bad(game.roles[t], m.role) != forged


def sniff(game, m, others, unknown, forged):
    """Thug, Mastermind, Copycat and Lover: learn one character's alignment, which is how conspirators find each other."""
    if unknown:
        t = game.rng.choice(unknown)
        m.known[t] = registers_bad(game.roles[t], m.role) != forged


def learn_role(game, m, others, unknown, forged):
    """Reporter and Mole: learn one character's exact role (the Grifter's disguise does not fool them)."""
    if unknown:
        t = game.rng.choice(unknown)
        r = game.roles[t]
        m.roles[t] = game.rng.choice(_in_roster_order(game, set(game.rules.roster) - {r})) if forged else r


def _in_roster_order(game, roles):
    """A fixed order that does not depend on how roles are named."""
    return sorted(roles, key=list(game.rules.roster).index)


def housekeeper(game, m, others, unknown, forged):
    """How many of the two living neighbours look bad."""
    circle = sorted(game.alive)
    i = circle.index(m.c)
    nb = tuple(sorted({circle[i - 1], circle[(i + 1) % len(circle)]} - {m.c}))
    k = sum(registers_bad(game.roles[x], m.role) for x in nb)
    if forged:
        k = game.rng.choice([v for v in range(len(nb) + 1) if v != k])
    m.counts.append((nb, k))


def constable(game, m, others, unknown, forged):
    """Investigate one character and share the result with the most trusted other."""
    if not unknown:
        return
    t = game.rng.choice(unknown)
    result = registers_bad(game.roles[t], m.role) != forged
    m.known[t] = result
    friends = [x for x in others if x != t]
    if friends:
        trust = m.beliefs(friends, game.public_roles())
        ally = min(friends, key=lambda x: (trust[x], game.rng.random()))
        if t not in game.minds[ally].roles:  # a tip never overrides certain knowledge
            game.minds[ally].known.setdefault(t, result)


def eavesdropper(game, m, others, unknown, forged):
    """Learn whatever the followed character learned tonight (nothing if the Eavesdropper is forged)."""
    if forged or m.following is None:
        return
    known, roles, n_counts, n_sames = m.following_knew
    target = game.minds[m.following]
    for x, v in target.known.items():
        if x != m.c and known.get(x) != v and x not in m.roles:
            m.known[x] = v
    for x, r in target.roles.items():
        if x != m.c and roles.get(x) != r:
            m.roles[x] = r
    m.counts += target.counts[n_counts:]
    m.sames += target.sames[n_sames:]


def framer(game, m, others, unknown, forged):
    """Learn one good character to frame; pick a new one once the victim is gone."""
    if m.victim not in game.alive:
        pool = others if forged else [x for x in others if not is_bad(game.roles[x])]
        if pool:
            m.victim = game.rng.choice(pool)
            m.known[m.victim] = False


def guest(game, m, others, unknown, forged):
    """Only with the guest_hunch rule: learn one character who is not bad."""
    if not game.rules.guest_hunch:
        return
    pool = unknown if forged else [x for x in unknown if not is_bad(game.roles[x])]
    if pool:
        m.known[game.rng.choice(pool)] = False


def photographer(game, m, others, unknown, forged):
    """Whether two characters are on the same team."""
    if len(others) >= 2:
        a, b = game.rng.sample(others, 2)
        same = registers_bad(game.roles[a], m.role) == registers_bad(game.roles[b], m.role)
        m.sames.append((a, b, same != forged))


# Roles without an entry (Witness, Confidant, Colonel, Possessed, Novelist, Recluse, Grifter, Lunatic, and the Forger,
# Blackmailer, Paymaster and Hypnotist, who pick their targets in run_night) have no night ability of their own.
ABILITIES = {
    "Sleuth": check_alignment,
    "Amateur": check_alignment,
    "Thug": sniff,
    "Mastermind": sniff,
    "Copycat": sniff,
    "Lover": sniff,
    "Eavesdropper": eavesdropper,
    "Reporter": learn_role,
    "Mole": learn_role,
    "Housekeeper": housekeeper,
    "Constable": constable,
    "Framer": framer,
    "Guest": guest,
    "Photographer": photographer,
}
