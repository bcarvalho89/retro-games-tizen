import os
import sys
import tempfile
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog as c

DAT = '''clrmamepro (
	name "x"
)

game (
	name "Super Mario World (USA)"
	region "USA"
	rom ( name "Super Mario World (USA).sfc" size 4 crc 1234ABCD md5 00 )
)

game (
	comment "Legend of Zelda, The - A Link to the Past (USA)"
	releaseyear "1992"
	users 1
	rom ( crc 0000FFFF )
)
'''


def test_normalize_id():
    assert c.normalize_id("Super Mario World (U) [T+Por].smc") == "super-mario-world-u-t-por"
    assert c.normalize_id("Super Mario World (USA).sfc") == "super-mario-world-usa"


def test_rom_crc_skips_copier_header():
    data = bytes(range(256)) * 4
    assert c.rom_crc(b"\0" * 512 + data) == c.rom_crc(data)
    assert c.rom_crc(b"") == "00000000"
    assert len(c.rom_crc(data)) == 8 and c.rom_crc(data) == c.rom_crc(data).upper()


def test_parse_dat():
    games = c.parse_dat(DAT)
    assert games["1234ABCD"]["name"] == "Super Mario World (USA)"
    assert games["0000FFFF"] == {"name": "Legend of Zelda, The - A Link to the Past (USA)", "releaseyear": "1992", "users": "1"}


def test_display_title():
    assert c.display_title("Super Mario World (USA)") == "Super Mario World"
    assert c.display_title("Super Mario World (U) [T+Por]") == "Super Mario World"
    assert c.display_title("Donkey Kong Country 2_ Diddy's Kong Quest") == "Donkey Kong Country 2: Diddy's Kong Quest"


def test_cover_name():
    assert c.cover_name('Tom & Jerry: x/y') == "Tom _ Jerry_ x_y"


def test_title_key_matches_goodtools_and_nointro():
    assert c.title_key("Legend of Zelda, The_ A Link to the Past") == c.title_key("Legend of Zelda, The - A Link to the Past (USA)")


def test_symlink_target():
    assert c.symlink_target(b"Donkey Kong Country (USA).png") == "Donkey Kong Country (USA)"
    assert c.symlink_target(b"\x89PNG\r\n\x1a\n....") is None
    assert c.symlink_target(b"<html>not found</html>") is None


def test_extract_zips():
    with tempfile.TemporaryDirectory() as d:
        with zipfile.ZipFile(os.path.join(d, "Top Gear.zip"), "w") as z:
            z.writestr("readme.txt", "x")
            z.writestr("Top Gear (USA).sfc", b"ROM")
        c.extract_zips(d, [".sfc", ".smc", ".fig"])
        assert open(os.path.join(d, "Top Gear.sfc"), "rb").read() == b"ROM"
        c.extract_zips(d, [".sfc", ".smc", ".fig"])
        assert sorted(os.listdir(d)) == ["Top Gear.sfc", "Top Gear.zip"]


def test_build_entries():
    meta = {
        "1234ABCD": {"name": "Super Mario World (USA)", "releaseyear": "1990", "genre": "Platform", "users": "2"},
    }
    files = {
        "Super Mario World (USA).sfc": "1234ABCD",
        "Hack Desconhecido (U).smc": "99999999",
        "Hack Desconhecido (U) [T+Por].smc": "88888888",
    }
    entries = c.build_entries(files, meta, has_cover=lambda e: e["id"] == "super-mario-world-usa", console="snes")
    smw = next(e for e in entries if e["file"] == "Super Mario World (USA).sfc")
    assert smw == {"id": "super-mario-world-usa", "file": "Super Mario World (USA).sfc", "title": "Super Mario World",
                   "year": 1990, "genre": "Platform", "players": 2, "cover": "covers/snes/super-mario-world-usa.png",
                   "match": "Super Mario World (USA)"}
    hacks = [e for e in entries if e["title"] == "Hack Desconhecido"]
    assert len(hacks) == 2 and hacks[0]["id"] != hacks[1]["id"]
    assert hacks[0]["year"] is None and hacks[0]["cover"] is None and hacks[0]["match"] is None
    assert [e["title"] for e in entries] == sorted(e["title"] for e in entries)


def test_build_entries_falls_back_to_title_match():
    meta = {"0000FFFF": {"name": "Legend of Zelda, The - A Link to the Past (USA)", "releaseyear": "1992", "users": "1"}}
    entries = c.build_entries({"Legend of Zelda, The_ A Link to the Past.smc": "77777777"}, meta, has_cover=lambda e: False, console="snes")
    assert entries[0]["year"] == 1992 and entries[0]["match"] == "Legend of Zelda, The - A Link to the Past (USA)"
    assert entries[0]["title"] == "Legend of Zelda, The - A Link to the Past"


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
    print("catalog ok")
