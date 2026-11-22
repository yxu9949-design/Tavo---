from pathlib import Path
import json
import zipfile
root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
assert manifest['localization']['defaultLocale'] == 'zh-CN'
assert manifest['version'] == '1.3.1'
files = ['manifest.json','ui/panel.html','ui/panel.js','locales/en.json','locales/zh-CN.json']
out = root / 'dist' / 'tavo-fourthwall-v1.3.1.tpg'
out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        assert (root/f).is_file(), f
        z.write(root/f, f)
with zipfile.ZipFile(out) as z:
    assert set(z.namelist()) == set(files)
print(out)
