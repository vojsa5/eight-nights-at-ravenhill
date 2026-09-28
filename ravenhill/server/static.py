"""Serving the files in web/ and listing the player's own art in web/art/custom/."""
from pathlib import Path
from urllib.parse import unquote

WEB_DIR = (Path(__file__).resolve().parents[2] / "web").resolve()
CUSTOM_ART = WEB_DIR / "art" / "custom"
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
               ".svg": "image/svg+xml"}
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "text/javascript; charset=utf-8", ".json": "application/json", **IMAGE_TYPES}


def static_file(url_path):
    """(bytes, content type) for a file under web/, or None. Never serves anything outside web/."""
    rel = unquote(url_path).lstrip("/") or "index.html"
    f = (WEB_DIR / rel).resolve()
    if not f.is_relative_to(WEB_DIR) or not f.is_file() or f.suffix.lower() not in TYPES:
        return None
    return f.read_bytes(), TYPES[f.suffix.lower()]


def custom_art():
    """role (lower case) -> file name of a picture in web/art/custom/ that replaces the built-in one."""
    if not CUSTOM_ART.is_dir():
        return {}
    return {f.stem.lower(): f.name for f in sorted(CUSTOM_ART.iterdir()) if f.suffix.lower() in IMAGE_TYPES}
