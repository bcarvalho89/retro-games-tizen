"""Gera catalog/<console>.json e covers/<console>/ a partir das ROMs em roms/<console>/.

uso: python3 catalog.py <raiz> <console> <libretro-database>
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import zipfile
import zlib

CONSOLES = {
    "snes": {"exts": [".sfc", ".smc", ".fig"], "system": "Nintendo - Super Nintendo Entertainment System"},
}
DATS = ["no-intro", "releaseyear", "genre", "maxusers"]
THUMBS = "https://raw.githubusercontent.com/libretro-thumbnails/%s/master/Named_Boxarts/%s.png"


def normalize_id(filename):
    stem = os.path.splitext(filename)[0]
    return re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")


def rom_crc(data):
    if len(data) % 1024 == 512:
        data = data[512:]
    return "%08X" % (zlib.crc32(data) & 0xFFFFFFFF)


def parse_dat(text):
    games = {}
    for block in re.findall(r"^game \((.*?)^\)", text, re.S | re.M):
        crc = re.search(r"\bcrc ([0-9A-Fa-f]{8})", block)
        if not crc:
            continue
        top = re.sub(r"rom \(.*?\)", "", block, flags=re.S)
        fields = {}
        for key, quoted, bare in re.findall(r'^\s*(\w+) (?:"(.*)"|(\S+))\s*$', top, re.M):
            fields["name" if key == "comment" else key] = quoted if quoted else bare
        fields.pop("region", None)
        games[crc.group(1).upper()] = fields
    return games


def display_title(name):
    return re.split(r" [(\[]", name, maxsplit=1)[0].replace("_ ", ": ").strip()


def title_key(name):
    return " ".join(re.sub(r"[^a-z0-9]+", " ", display_title(name).lower()).split())


def cover_name(name):
    return re.sub(r'[&*/:`<>?\\|"]', "_", name)


def extract_zips(directory, exts):
    for zname in sorted(os.listdir(directory)):
        if not zname.lower().endswith(".zip"):
            continue
        with zipfile.ZipFile(os.path.join(directory, zname)) as z:
            member = next((m for m in z.namelist() if os.path.splitext(m)[1].lower() in exts), None)
            if not member:
                continue
            target = os.path.join(directory, os.path.splitext(zname)[0] + os.path.splitext(member)[1].lower())
            if not os.path.exists(target):
                with open(target + ".tmp", "wb") as out:
                    out.write(z.read(member))
                os.replace(target + ".tmp", target)


def _by_title(meta):
    index = {}
    for info in meta.values():
        if "name" not in info:
            continue
        key = title_key(info["name"])
        best = index.get(key)
        if best is None or ("(USA)" in info["name"] and "(USA)" not in best["name"]):
            index[key] = info
    return index


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def build_entries(files, meta, has_cover, console):
    titles = _by_title(meta)
    entries = []
    for filename, crc in files.items():
        info = meta.get(crc) or titles.get(title_key(os.path.splitext(filename)[0])) or {}
        name = info.get("name")
        entry = {
            "id": normalize_id(filename),
            "file": filename,
            "title": display_title(name or os.path.splitext(filename)[0]),
            "year": _int(info.get("releaseyear")),
            "genre": info.get("genre"),
            "players": _int(info.get("users")),
            "cover": None,
            "match": name,
        }
        if has_cover(entry):
            entry["cover"] = "covers/%s/%s.png" % (console, entry["id"])
        entries.append(entry)
    return sorted(entries, key=lambda e: (e["title"].lower(), e["file"]))


def load_meta(database, system):
    meta = {}
    for dat in DATS:
        path = os.path.join(database, "metadat", dat, system + ".dat")
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8", errors="replace") as f:
            for crc, fields in parse_dat(f.read()).items():
                meta.setdefault(crc, {}).update(fields)
    return meta


def fetch_cover(system, match, target):
    if os.path.exists(target):
        return True
    if not match:
        return False
    url = THUMBS % (system.replace(" ", "_"), urllib.parse.quote(cover_name(match)))
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            data = r.read()
    except Exception as e:
        print("sem capa:", match, "-", e)
        return False
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target + ".tmp", "wb") as f:
        f.write(data)
    os.replace(target + ".tmp", target)
    return True


def main(root, console, database):
    conf = CONSOLES[console]
    rom_dir = os.path.join(root, "roms", console)
    extract_zips(rom_dir, conf["exts"])
    files = {}
    for name in sorted(os.listdir(rom_dir)):
        if os.path.splitext(name)[1].lower() in conf["exts"]:
            with open(os.path.join(rom_dir, name), "rb") as f:
                files[name] = rom_crc(f.read())
    meta = load_meta(database, conf["system"])
    cover_dir = os.path.join(root, "covers", console)
    entries = build_entries(files, meta, console=console, has_cover=lambda e: fetch_cover(
        conf["system"], e["match"], os.path.join(cover_dir, e["id"] + ".png")))
    out = os.path.join(root, "catalog", console + ".json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out + ".tmp", "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    os.replace(out + ".tmp", out)
    for e in entries:
        print("%-45s %s" % (e["title"][:45], "ok" if e["match"] else "SEM DADOS"))
    print(len(entries), "jogos em", out)


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[2] not in CONSOLES:
        sys.exit(__doc__)
    main(*sys.argv[1:])
