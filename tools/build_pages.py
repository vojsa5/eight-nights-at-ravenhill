"""Build the static site for GitHub Pages: the page from web/ plus the ravenhill package, which the browser
runs with Pyodide (web/js/pyengine.js) since Pages has no Python server.

    python3 -m tools.build_pages [out_dir]      # default _site; serve it with `python3 -m http.server -d _site`
"""
import hashlib
import io
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = re.compile(r'^import\b[^\n]*?\bfrom "\./([\w-]+\.js)";', re.M)


def modules(js, entry="main.js"):
    """Every module the entry point imports, directly or through others (static imports only), in the order found."""
    found, todo = [], [entry]
    while todo:
        name = todo.pop(0)
        if name not in found:
            found.append(name)
            todo += IMPORT.findall((js / name).read_text())
    return found[1:]


def preload_modules(out):
    """The page asks for all its modules at once, rather than one level of imports at a time, a round trip each
    (on a phone's network, seconds before the opening screen shows)."""
    page = out / "index.html"
    links = "".join(f'<link rel="modulepreload" href="js/{m}">\n' for m in modules(out / "js"))
    page.write_text(page.read_text().replace("</head>", links + "</head>", 1))


def build(out):
    if out.exists():
        shutil.rmtree(out)
    # the page, without the player's own pictures (only their README)
    shutil.copytree(ROOT / "web", out, ignore=lambda d, names: [n for n in names if Path(d).name == "custom" and n != "README.md"])
    preload_modules(out)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted((ROOT / "ravenhill").rglob("*.py")):
            z.write(f, f.relative_to(ROOT).as_posix())
    data = buf.getvalue()
    name = f"ravenhill-{hashlib.sha256(data).hexdigest()[:12]}.zip"  # a new name for every change, so no stale cache
    (out / "py").mkdir()
    (out / "py" / name).write_bytes(data)
    (out / "py" / "manifest.json").write_text(json.dumps({"zip": name}))
    print(f"built {out} ({name}, {len(data) // 1024} KB of Python)")


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "_site").resolve())
