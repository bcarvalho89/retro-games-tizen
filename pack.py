import pathlib, zipfile

out = pathlib.Path('dist/retro-games.wgt')
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(pathlib.Path('app').rglob('*')):
        if f.is_file():
            z.write(f, f.relative_to('app'))
print(out, out.stat().st_size, 'bytes')
