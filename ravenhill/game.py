"""Game flow.

16 characters sit in a circle; everyone knows only their own role (the Confidants know each
other, and so do the Lovers). Each round:
  1. night: abilities are used in secret (abilities.py); some rounds have an event (events.py),
  2. every living, unsilenced character advises whom to save and whom to eliminate (advice.py),
  3. the player saves one character (+1 if not bad), who leaves and is revealed,
  4. the player eliminates one character (+1 if bad), who is revealed.
In a Notebook round the game opens one guest's notebook (what they learned last night), and
Footprints name two guests, at least one of them guilty. The Interview (question one guest again,
once) is a tool kept for rule variants.
The standard game lasts 8 rounds, so every character is resolved. In the last round only
two characters remain and nobody can advise.
"""
import random

from . import abilities, advice, events, notebook
from .mind import Mind
from .rules import N_CHARS, PAIRS, STANDARD, is_bad, registers_bad
from .view import View


class Game:
    def __init__(self, rng, rules=STANDARD):
        self.rng = rng
        self.rules = rules
        roles = list(rules.roster)
        rng.shuffle(roles)
        self.roles = roles
        self.alive = set(range(N_CHARS))
        self.revealed = {}  # char -> (role, round, how)
        self.silenced = {}  # round -> char
        self.hypnosis = {}  # round -> (Hypnotist, the guest who repeats its advice that day); secret
        self.bribes = {}    # round -> (Paymaster, the guest who advises clearing it that day); secret
        self.hypnotised = {}  # round -> the guest who did repeat the Hypnotist's advice; secret too
        self.suggestions = {}  # round -> the Hypnotist's own advice that day, before an event trimmed it
        self.advice = []
        self.history = []  # dicts: round, action, char, role, ok
        self.score = 0
        self.round = 0
        self.phase = None
        self.events = events.schedule(rng, rules)  # round -> event name
        self.night_log = {}  # round -> char -> facts learned that night
        self.tools_used = set()  # rounds in which the round's tool was used
        self.notebooks = []   # the notebooks the player read: {"round", "char", "facts"}
        self.interviews = []  # the extra Advice from Interviews
        self.footprints = {}  # round -> the two guests the Footprints could belong to (public): at least one is guilty
        self.minds = [Mind(c, r) for c, r in enumerate(roles)]
        for pair_role in PAIRS:
            pair = [c for c, r in enumerate(roles) if r == pair_role]
            if len(pair) == 2:
                self.minds[pair[0]].roles[pair[1]] = pair_role
                self.minds[pair[1]].roles[pair[0]] = pair_role
        for c, r in enumerate(roles):  # the Witness saw one conspirator leave the library (never the Grifter, who looks innocent)
            seen = [x for x, rx in enumerate(roles) if r == "Witness" and registers_bad(rx, r)]
            if seen:
                self.minds[c].known[rng.choice(seen)] = True
        self._start_round()

    @property
    def finished(self):
        return self.phase == "over"

    def view(self):
        return View(self.round, self.phase, sorted(self.alive), list(self.advice), dict(self.revealed),
                    dict(self.silenced), {r: e for r, e in self.events.items() if r <= self.round},
                    list(self.notebooks), list(self.interviews), dict(self.footprints))

    # the player's tools, each allowed once in the round of its event
    def tool_ready(self, tool):
        return (not self.finished and tool in events.TOOLS and self.events.get(self.round) == events.TOOLS[tool]
                and self.round not in self.tools_used and len(self.alive) >= 3)

    def can_use(self, tool, c):
        return self.tool_ready(tool) and c in self.alive

    def interview(self, c):
        """Interview: `c` names another save and another eliminate."""
        if not self.can_use("interview", c):
            raise ValueError("cannot hold an interview now")
        self.tools_used.add(self.round)
        a = advice.interview(self, c)
        self.interviews.append(a)
        return a

    def act(self, c):
        """Save or eliminate `c` depending on the phase; returns whether it scored."""
        if self.finished or c not in self.alive:
            raise ValueError("invalid choice")
        role = self.roles[c]
        ok = not is_bad(role) if self.phase == "save" else is_bad(role)
        self.score += ok
        self.history.append({"round": self.round, "action": self.phase, "char": c, "role": role, "ok": ok})
        self.alive.discard(c)
        self.revealed[c] = (role, self.round, self.phase)
        if self.phase == "save":
            self.phase = "eliminate"
        elif self.round < self.rules.rounds and len(self.alive) >= 2:
            self._start_round()
        else:
            self.phase = "over"
        return ok

    def _start_round(self):
        self.round += 1
        event = self.events.get(self.round)
        before = {c: self.minds[c].snapshot() for c in self.alive}
        events.before_night(self, event)
        if events.allows_investigations(event):
            abilities.run_night(self)
        self.night_log[self.round] = {c: notebook.facts_learned(before[c], self.minds[c]) for c in self.alive}
        if event == "Notebook":
            opened = notebook.open_notebook(self)
            if opened:
                self.notebooks.append(opened)
        advice.advise_round(self)
        self.phase = "save"

    # hooks, so tools/audit.py can observe every action
    def use_ability(self, c, forged):
        abilities.use_ability(self, c, forged)

    def advice_of(self, c, others, public, last):
        return advice.advice_of(self, c, others, public, last)

    # helpers used by abilities and advice
    def find_alive(self, role):
        return next((c for c in self.alive if self.roles[c] == role), None)

    def public_roles(self):
        return {c: r for c, (r, _, _) in self.revealed.items()}

    def last_advice(self):
        return [a for a in self.advice if a.round == self.round - 1]

    def accusers(self, c):
        """Who advised eliminating `c` last round and is still alive."""
        return [a.speaker for a in self.last_advice() if a.eliminate == c and a.speaker in self.alive]

    def public_record(self):
        """Per advisor: advice that proved right minus advice that proved wrong, from public reveals."""
        return advice.advice_record(self.advice, self.public_roles())


def new_game(seed, rules=STANDARD):
    return Game(random.Random(seed), rules)
