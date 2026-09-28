"""Rebuild data/calibration.json, the smart player's model of every role. Run it after any rule change.

    python3 -m tools.calibrate
"""
import time

from ravenhill.players.calibration import CALIB_PATH, calibrate, save_calibration


def main():
    t0 = time.time()
    save_calibration(calibrate())
    print(f"calibration written to {CALIB_PATH} ({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
