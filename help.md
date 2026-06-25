# === CREAR Y PUSHEAR UN TAG ===
git tag v1.0.0
git push origin v1.0.0

# === BORRAR TAG LOCAL ===
git tag -d v1.0.0

# === BORRAR TAG REMOTO (GitHub) ===
git push origin --delete v1.0.0

# === BORRAR AMBOS DE UN TIRO ===
git tag -d v1.0.0 && git push origin --delete v1.0.0

# === RECREAR UN TAG (borrar + crear + pushear) ===
git tag -d v1.0.0
git push origin --delete v1.0.0
git tag v1.0.0
git push origin v1.0.0

# === LISTAR TAGS EXISTENTES ===
git tag -l

# === VER TAGS REMOTOS ===
git ls-remote --tags origin

# === FLUJO TÍPICO DE RELEASE ===
# 1. Commitear cambios
git add -A && git commit -m "release: v1.0.0"

# 2. Crear tag y pushear todo
git push origin main
git tag v1.0.0
git push origin v1.0.0