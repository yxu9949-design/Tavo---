from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
out = root / 'dist' / 'tavo-fourthwall-v1.1.0.tpg'
out.parent.mkdir(parents=True, exist_ok=True)

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ('manifest.json', 'ui/panel.html', 'ui/panel.js'):
        z.write(root / name, name)
print(out)
