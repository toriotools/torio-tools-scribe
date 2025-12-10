"""
Torio Tools Scribe - Build Engine OTIMIZADO
Gera executável menor excluindo CUDA e dependências desnecessárias.
"""

import subprocess
import sys
import shutil
from pathlib import Path

def main():
    print("\n" + "="*50)
    print("  TORIO SCRIBE ENGINE - Build Otimizado")
    print("="*50 + "\n")
    
    project_root = Path(__file__).parent
    engine_dir = project_root / "engine"
    output_dir = project_root / "engine_dist"
    
    # Limpar build anterior
    for path in [output_dir, project_root / "torio_scribe_engine"]:
        if path.exists():
            print(f"[Build] Removendo {path.name}...")
            shutil.rmtree(path)
    
    build_dir = engine_dir / "build"
    if build_dir.exists():
        shutil.rmtree(build_dir)
    
    main_script = engine_dir / "main.py"
    
    # PyInstaller OTIMIZADO - exclui MUITOS módulos
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--name", "torio_scribe_engine",
        "--console",
        "--distpath", str(project_root),
        "--workpath", str(build_dir),
        "--specpath", str(engine_dir),
        # Arquivos necessários
        "--add-data", f"{engine_dir / 'transcriber.py'};.",
        "--add-data", f"{engine_dir / 'text_generator.py'};.",
        # Hidden imports ESSENCIAIS
        "--hidden-import", "flask",
        "--hidden-import", "flask_cors", 
        "--hidden-import", "faster_whisper",
        "--hidden-import", "ctranslate2",
        "--hidden-import", "tokenizers",
        "--hidden-import", "huggingface_hub",
        # EXCLUIR módulos grandes desnecessários
        "--exclude-module", "torch.cuda",
        "--exclude-module", "torch.distributed",
        "--exclude-module", "torch.testing",
        "--exclude-module", "torch.utils.tensorboard",
        "--exclude-module", "torchaudio",
        "--exclude-module", "torchvision",
        "--exclude-module", "matplotlib",
        "--exclude-module", "scipy",
        "--exclude-module", "pandas",
        "--exclude-module", "PIL",
        "--exclude-module", "Pillow",
        "--exclude-module", "tkinter",
        "--exclude-module", "PyQt5",
        "--exclude-module", "PyQt6",
        "--exclude-module", "PySide6",
        "--exclude-module", "wx",
        "--exclude-module", "cv2",
        "--exclude-module", "opencv-python",
        "--exclude-module", "IPython",
        "--exclude-module", "jupyter",
        "--exclude-module", "notebook",
        "--exclude-module", "pytest",
        "--exclude-module", "unittest",
        "--exclude-module", "doctest",
        "--exclude-module", "sphinx",
        "--exclude-module", "setuptools", # Mantendo setuptools pode ser necessario, mas vou testar sem excluir primeiro

        str(main_script)
    ]
    
    print("[Build] Executando PyInstaller (otimizado)...")
    result = subprocess.run(cmd, cwd=str(project_root))
    
    if result.returncode != 0:
        print("[Build] ERRO: PyInstaller falhou!")
        return 1
    
    # Mover para engine_dist
    pyinstaller_output = project_root / "torio_scribe_engine"
    if pyinstaller_output.exists():
        pyinstaller_output.rename(output_dir)
        print(f"[Build] Output: {output_dir}")
    
    # Calcular e mostrar tamanho
    total_size = sum(f.stat().st_size for f in output_dir.rglob('*') if f.is_file())
    size_mb = total_size / 1024 / 1024
    size_gb = total_size / 1024 / 1024 / 1024
    
    print(f"\n[Build] Tamanho: {size_mb:.1f} MB ({size_gb:.2f} GB)")
    
    if size_gb > 2:
        print("[Build] ⚠️ AVISO: Engine ainda > 2GB, NSIS pode falhar!")
    else:
        print("[Build] ✅ Engine < 2GB - OK para NSIS!")
    
    print("[Build] Concluído!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
