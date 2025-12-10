# Script para converter PNG para ICO
from PIL import Image
import os

# Caminhos
project_root = r"H:\dev\torio-tools-scribe"
png_path = os.path.join(project_root, "logo-torio-tools-scribe.png")
ico_path = os.path.join(project_root, "assets", "icons", "icon.ico")

# Criar diretório se não existir
os.makedirs(os.path.dirname(ico_path), exist_ok=True)

# Abrir imagem
img = Image.open(png_path)

# Converter para RGBA se necessário
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# Criar ICO com múltiplos tamanhos
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
icons = []

for size in sizes:
    resized = img.resize(size, Image.Resampling.LANCZOS)
    icons.append(resized)

# Salvar como ICO
icons[0].save(
    ico_path,
    format='ICO',
    sizes=[(s.width, s.height) for s in icons],
    append_images=icons[1:]
)

print(f"ICO criado: {ico_path}")

# Também salvar PNG em tamanhos úteis
png_256 = os.path.join(project_root, "assets", "icons", "icon.png")
img.resize((256, 256), Image.Resampling.LANCZOS).save(png_256, "PNG")
print(f"PNG 256x256: {png_256}")

# Copiar para renderer/public
public_logo = os.path.join(project_root, "renderer", "public", "logo.png")
os.makedirs(os.path.dirname(public_logo), exist_ok=True)
img.resize((256, 256), Image.Resampling.LANCZOS).save(public_logo, "PNG")
print(f"Logo public: {public_logo}")

print("Conversão concluída!")
