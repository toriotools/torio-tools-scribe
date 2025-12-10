"""
Torio Tools Scribe - Build Engine Script
Compila o backend Python para executável standalone.
"""

import subprocess
import sys
import shutil
from pathlib import Path

def main():
    print("\n[Build Engine] Iniciando...")
    
    project_root = Path(__file__).parent
    engine_dir = project_root / "engine"
    output_dir = project_root / "engine_dist"
    
    # Limpar build anterior
    if output_dir.exists():
        print("[Build Engine] Limpando build anterior...")
        shutil.rmtree(output_dir)
    
    # Arquivos para incluir
    main_script = engine_dir / "main.py"
    
    # Comando PyInstaller otimizado
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--name", "torio_scribe_engine",
        "--console",  # Para debug, mudar para --noconsole em produção
        "--distpath", str(project_root),
        "--workpath", str(engine_dir / "build"),
        "--specpath", str(engine_dir),
        # Adicionar arquivos Python necessários
        "--add-data", f"{engine_dir / 'transcriber.py'};.",
        "--add-data", f"{engine_dir / 'text_generator.py'};.",
        # Hidden imports importantes
        "--hidden-import", "flask",
        "--hidden-import", "flask_cors",
        "--hidden-import", "faster_whisper",
        "--hidden-import", "ctranslate2",
        # Excluir pacotes desnecessários para reduzir tamanho
        "--exclude-module", "matplotlib",
        "--exclude-module", "scipy",
        "--exclude-module", "pandas",
        "--exclude-module", "PIL",
        "--exclude-module", "tkinter",
        "--exclude-module", "PyQt5",
        "--exclude-module", "PyQt6",
        str(main_script)
    ]
    
    print(f"[Build Engine] Executando PyInstaller...")
    print(f"[Build Engine] Comando: {' '.join(cmd[:10])}...")
    
    result = subprocess.run(cmd, cwd=str(project_root))
    
    if result.returncode != 0:
        print("[Build Engine] ERRO: PyInstaller falhou!")
        return 1
    
    # Renomear pasta de saída
    pyinstaller_output = project_root / "torio_scribe_engine"
    if pyinstaller_output.exists():
        if output_dir.exists():
            shutil.rmtree(output_dir)
        pyinstaller_output.rename(output_dir)
        print(f"[Build Engine] Output: {output_dir}")
    
    # Calcular tamanho
    total_size = sum(f.stat().st_size for f in output_dir.rglob('*') if f.is_file())
    print(f"[Build Engine] Tamanho: {total_size / 1024 / 1024:.1f} MB")
    print("[Build Engine] Concluído!")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
