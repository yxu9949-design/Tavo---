from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
out = root / 'dist' / 'tavo-fourthwall-v1.1.1.tpg'
out.parent.mkdir(parents=True, exist_ok=True)
files = ['manifest.json','ui/panel.html','ui/panel.js','locales/en.json','locales/zh-CN.json']
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for path in files:
        z.write(root / path, path)
print(out)
