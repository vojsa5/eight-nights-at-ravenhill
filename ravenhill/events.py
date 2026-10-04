"""Round events: which round gets which event, and what each event allows.

Every night belongs to one of the four GROUPS, as Rules.night_groups sets, and each group's nights take its
events in the order they are listed there. So the standard game always runs: I First Impressions, II the
Notebook, III the Footprints, IV the Blackout, V the Séance, VI the Dinner Party, VII the Inquest, and VIII
the last night, which belongs to the last group and has no event. Only nights in Rules.event_rounds (and
night I for First Impressions) get an event; with Rules.shuffle_groups a group's events come in random
order, and with Rules.grouped_events off, the events drawn from Rules.event_pool come in any order on any
night. In a Notebook round the game opens one guest's
notebook for the player; Footprints name two guests, at least one of them guilty.
(The Interview, where the player questions one guest again, is kept for rule variants.)
The game (game.py) and the advice (advice.py) ask this module what the round's event allows.
"""
from .rules import is_bad, registers_bad

# events marked for a planned change; only a marker (the GUI stamps them in web/js/events.js PLANNED)
PLANNED_CHANGES = {}

EVENTS = {
    "First Impressions": "on the first evening everyone learns whether the guest in the previous seat looks innocent or guilty",
    "Blackout": "the lights fail: nobody can investigate tonight",
    "Dinner Party": "advice names only whom to clear",
    "Inquest": "advice names only whom to arrest",
    "Séance": "everyone joins hands and learns how many of the two guests seated beside them look guilty",
    "Notebook": "a notebook is left open: what one guest learned last night about someone still in the house",
    "Interview": "you may question one guest again for another clear and arrest tip",
    "Footprints": "footprints in the snow match the boots of two guests: at least one of them is guilty",
}


# The kinds of night (keep in step with web/js/events.js GROUPS); Rules.night_groups says which night is which.
# The last night, which has no event, belongs to the last group.
GROUPS = (
    ("The guests learn something", ("First Impressions", "Séance")),
    ("You learn something", ("Notebook", "Footprints", "Interview")),
    ("The testimony changes", ("Dinner Party", "Inquest")),
    ("The house goes quiet", ("Blackout",)),
)

TOOLS = {"interview": "Interview"}  # the player's tool -> the event that allows it (the Notebook opens by itself)


def schedule(rng, rules):
    """round -> event name for this game (see the module docstring)."""
    events = {1: "First Impressions"} if rules.first_impressions else {}
    rounds = [r for r in rules.event_rounds if r <= rules.rounds]
    if not rules.grouped_events:
        for rnd, event in zip(rounds, rng.sample(list(rules.event_pool), min(len(rounds), len(rules.event_pool)))):
            events[rnd] = event
        return events
    open_nights = sorted(set(rounds) - set(events))  # night I may be First Impressions' already
    for g, (_, members) in enumerate(GROUPS):
        pool = [e for e in members if e in rules.event_pool]
        if rules.shuffle_groups:
            rng.shuffle(pool)
        nights = [n for n in open_nights if night_group(rules, n) == g]
        for n, event in zip(nights, pool):
            events[n] = event
    return events


def night_group(rules, night):
    """The group a night belongs to, an index into GROUPS."""
    return rules.night_groups[(night - 1) % len(rules.night_groups)]


def first_impressions(game):
    """Everyone learns whether the character in the previous seat looks good or bad (as their abilities would see it)."""
    circle = sorted(game.alive)
    for i, c in enumerate(circle):
        left = circle[i - 1]
        m = game.minds[c]
        if left != c and left not in m.roles:
            m.known[left] = registers_bad(game.roles[left], m.role)



def seance(game):
    """Everyone learns how many of their two living neighbours look bad (as their abilities would see it),
    like a Housekeeper; with First Impressions that is often enough to work out both."""
    circle = sorted(game.alive)
    for i, c in enumerate(circle):
        nb = tuple(sorted({circle[i - 1], circle[(i + 1) % len(circle)]} - {c}))
        if nb:
            m = game.minds[c]
            m.counts.append((nb, sum(registers_bad(game.roles[x], m.role) for x in nb)))


def footprints(game):
    """Two living guests whose boots match the footprints under the library window: one conspirator for
    certain, the other any guest, in seat order so the order gives nothing away. None if nobody is guilty."""
    alive = sorted(game.alive)
    guilty = [c for c in alive if is_bad(game.roles[c])]
    if not guilty or len(alive) < 2:
        return None
    culprit = game.rng.choice(guilty)
    return tuple(sorted((culprit, game.rng.choice([c for c in alive if c != culprit]))))


def before_night(game, event):
    """What happens at nightfall, before anyone investigates: First Impressions, the Séance, the Footprints."""
    if event == "First Impressions":
        first_impressions(game)
    elif event == "Séance":
        seance(game)
    elif event == "Footprints":
        pair = footprints(game)
        if pair:
            game.footprints[game.round] = pair


def allows_investigations(event):
    """In a Blackout nobody investigates."""
    return event != "Blackout"


def single_tip(event):
    """Does the day's advice name only one side (whom to clear, or whom to arrest)?"""
    return event in ("Dinner Party", "Inquest")


def trim_advice(event, a):
    """A Dinner Party keeps only whom to save (clear), an Inquest only whom to eliminate (arrest)."""
    if event == "Dinner Party":
        a.eliminate = None
    elif event == "Inquest":
        a.save = None
