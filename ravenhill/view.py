"""What the player can see: the advice given and the public state of the game."""
from dataclasses import dataclass, field


@dataclass
class Advice:
    round: int
    speaker: int
    save: int       # None in an Inquest round
    eliminate: int  # None in a Dinner Party round


@dataclass
class View:
    round: int
    phase: str
    alive: list
    advice: list
    revealed: dict  # char -> (role, round, how)
    silenced: dict  # round -> char who gave no advice that round
    events: dict = field(default_factory=dict)         # round -> event name, for rounds so far
    notebooks: list = field(default_factory=list)   # {"round", "char", "facts"} from the Notebook
    interviews: list = field(default_factory=list)  # extra Advice from the Interview tool
    footprints: dict = field(default_factory=dict)  # round -> (a, b) from the Footprints: at least one of them is guilty
