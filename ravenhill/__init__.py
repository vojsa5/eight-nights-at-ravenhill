"""Eight Nights at Ravenhill: a single-player detective deduction game (a take on Werewolf).

Sixteen guests at Ravenhill Manor, half of them in a conspiracy. In the code the innocent are
"good" and the conspirators "bad"; to clear a guest is to "save" them, to arrest is to "eliminate"."""
from .game import Game, new_game
from .rules import STANDARD, Rules, is_bad
