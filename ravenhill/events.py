"""Round events: which round gets which event, and what each event allows.

The nights run in cycles of the four GROUPS, in their order: night I is the first group's, night II
the second's, and so on, and night V starts the next cycle. Each group fills its nights with its events
in cycle order (First Impressions always first, on night I; the others in random order), and the last
group's second night is the last night, which has no event. Only nights in Rules.event_rounds (and
night I for First Impressions) get an event; with Rules.grouped_events off, the events drawn from
Rules.event_pool come in any order. The last round has no event. In a Notebook round
the game opens one guest's notebook for the player; Footprints name two guests, at least one of them guilty.
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


# The kinds of night, in the order they come round in each cycle (keep in step with web/js/events.js GROUPS).
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
    open_nights = set(rounds)
    for g, (_, members) in enumerate(GROUPS):
        pool = [e for e in members if e in rules.event_pool]
        rng.shuffle(pool)
        if g == 0 and rules.first_impressions:  # night I, already set
            nights = [n for n in range(len(GROUPS) + 1, rules.rounds + 1, len(GROUPS)) if n in open_nights]
        else:
            nights = [n for n in range(g + 1, rules.rounds + 1, len(GROUPS)) if n in open_nights]
        for n, event in zip(nights, pool):
            events[n] = event
    return events


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


def trim_advice(event, a):
    """A Dinner Party keeps only whom to save (clear), an Inquest only whom to eliminate (arrest)."""
    if event == "Dinner Party":
        a.eliminate = None
    elif event == "Inquest":
        a.save = None
