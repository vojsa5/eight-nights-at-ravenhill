"""Rule variants for tools/experiments.py: each changes one thing relative to the standard game."""
from dataclasses import replace

from ravenhill.rules import STANDARD


def swap(mapping):
    return tuple(mapping.get(r, r) for r in STANDARD.roster)


NO_EXTRAS = {"first_impressions": False, "event_rounds": ()}
QUIET_EVENTS = ("Blackout", "Dinner Party", "Inquest", "Séance")  # the events without a tool
V1_ROSTER = ("Sleuth", "Housekeeper", "Reporter", "Photographer", "Confidant", "Confidant", "Guest", "Guest", "Amateur", "Recluse",
             "Novelist", "Thug", "Thug", "Mastermind", "Forger", "Mole")


VARIANTS = {v.name: v for v in [
    STANDARD,
    replace(STANDARD, name="no-confidants", roster=swap({"Confidant": "Guest"})),
    replace(STANDARD, name="no-possessed", roster=swap({"Possessed": "Guest"})),
    replace(STANDARD, name="no-hypnotist", roster=swap({"Hypnotist": "Thug"})),
    replace(STANDARD, name="no-witness", roster=swap({"Witness": "Guest"})),
    replace(STANDARD, name="mole", roster=swap({"Hypnotist": "Mole"})),
    replace(STANDARD, name="no-reporter", roster=swap({"Reporter": "Guest"})),
    replace(STANDARD, name="no-forger", roster=swap({"Forger": "Thug"})),
    replace(STANDARD, name="mole-no-cover", roster=swap({"Hypnotist": "Mole"}), mole_betrays_from=1),
    replace(STANDARD, name="no-constable", roster=swap({"Constable": "Guest"})),
    replace(STANDARD, name="no-lunatic", roster=swap({"Lunatic": "Thug"})),
    replace(STANDARD, name="no-paymaster", roster=swap({"Paymaster": "Thug"})),
    replace(STANDARD, name="no-eavesdropper", roster=swap({"Eavesdropper": "Thug"})),
    replace(STANDARD, name="no-colonel", roster=swap({"Colonel": "Photographer"})),
    replace(STANDARD, name="no-lovers", roster=swap({"Lover": "Thug"})),
    replace(STANDARD, name="no-grifter", roster=swap({"Grifter": "Framer"})),
    replace(STANDARD, name="blackmailer", roster=swap({"Grifter": "Blackmailer"})),
    replace(STANDARD, name="interview", event_pool=tuple("Interview" if e == "Footprints" else e for e in STANDARD.event_pool)),
    replace(STANDARD, name="events-any-order", grouped_events=False),
    replace(STANDARD, name="no-events", **NO_EXTRAS),
    replace(STANDARD, name="no-tool-events", event_rounds=(3, 5, 7), event_pool=QUIET_EVENTS),
    replace(STANDARD, name="no-first-impressions", first_impressions=False),
    replace(STANDARD, name="first-impressions-only", event_rounds=()),
    replace(STANDARD, name="events-3-5-7", event_rounds=(3, 5, 7)),
    replace(STANDARD, name="5-rounds", rounds=5, mole_betrays_from=4, event_rounds=(2, 3, 4)),
    # the first roster of the advice game: two Guests, a Recluse and an Amateur, 5 bad, 5 rounds
    replace(STANDARD, name="v1", roster=V1_ROSTER, rounds=5, mole_betrays_from=4, **NO_EXTRAS),
    replace(STANDARD, name="v1+hunch", roster=V1_ROSTER, rounds=5, mole_betrays_from=4, guest_hunch=True, **NO_EXTRAS),
]}
