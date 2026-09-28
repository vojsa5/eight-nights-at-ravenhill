"""Roster, constants and alignment helpers."""
from dataclasses import dataclass

GOOD_ROLES = ["Sleuth", "Witness", "Reporter", "Constable", "Colonel", "Confidant", "Confidant", "Possessed"]
BAD_ROLES = ["Lover", "Lover", "Eavesdropper", "Paymaster", "Grifter", "Forger", "Hypnotist", "Lunatic"]
ROSTER = GOOD_ROLES + BAD_ROLES
# roles marked for a planned change; only a marker (the GUI stamps them in web/js/roles.js PLANNED)
PLANNED_CHANGES = {}
# implemented but not in the standard roster; rule variants can bring them back
SPARE_GOOD = ["Housekeeper", "Novelist", "Photographer", "Guest", "Recluse", "Amateur"]
SPARE_BAD = ["Mole", "Copycat", "Thug", "Mastermind", "Framer", "Blackmailer"]
SPARE_ROLES = SPARE_GOOD + SPARE_BAD
BAD_SET = set(BAD_ROLES + SPARE_BAD)
PAIRS = ("Confidant", "Lover")  # roles held by two characters who know each other from the start

NAMES = ["Lady Ashby", "Mr Blake", "Dr Crane", "Miss Dane", "Mrs Ellery", "Sir Finch", "Lord Gault", "Prof Hale",
         "Miss Ives", "Mr Jarvis", "Mrs Kemp", "Dr Lowe", "Lady Marsh", "Mr Nash", "Miss Orme", "Sir Pryce"]
# who each guest is in the story; says nothing about their secret role (seats get roles at random)
PROFESSIONS = ["heiress", "banker", "surgeon", "actress", "botanist", "explorer", "art collector", "archaeologist",
               "violinist", "butler", "cook", "chemist", "spirit medium", "jockey", "aviator", "barrister"]

N_CHARS = 16
N_ROUNDS = 8
MOLE_BETRAYS_FROM = 5
PRIOR_BAD = 1 / 3
GRUDGE = 0.15  # extra suspicion of whoever advised eliminating me last round


@dataclass(frozen=True)
class Rules:
    """A rule set; the defaults are the standard game, variants are used by tools/experiments.py."""
    name: str = "standard"
    roster: tuple = tuple(ROSTER)
    rounds: int = N_ROUNDS
    mole_betrays_from: int = MOLE_BETRAYS_FROM
    guest_hunch: bool = False  # each night a Guest learns one character who is not bad
    first_impressions: bool = True  # round 1 opens with the First Impressions event
    event_rounds: tuple = (2, 3, 4, 5, 6, 7)
    event_pool: tuple = ("Blackout", "Dinner Party", "Inquest", "Séance", "Notebook", "Footprints")
    grouped_events: bool = True  # events come group by group (events.GROUPS); False: in any order

    @property
    def n_bad(self):
        return sum(r in BAD_SET for r in self.roster)


STANDARD = Rules()


def is_bad(role):
    return role in BAD_SET


def registers_bad(role, viewer):
    """Alignment as an ability sees it: the Recluse looks bad, the Mastermind looks good to the Sleuth,
    and the Grifter looks like a teammate to everyone."""
    if role == "Grifter":
        return viewer in BAD_SET
    if role == "Recluse":
        return True
    if role == "Mastermind" and viewer == "Sleuth":
        return False
    return role in BAD_SET
