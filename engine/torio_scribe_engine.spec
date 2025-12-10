# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['H:\\dev\\torio-tools-scribe\\engine\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('H:\\dev\\torio-tools-scribe\\engine\\transcriber.py', '.'), ('H:\\dev\\torio-tools-scribe\\engine\\text_generator.py', '.')],
    hiddenimports=['flask', 'flask_cors', 'faster_whisper', 'ctranslate2', 'tokenizers', 'huggingface_hub'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['torch.cuda', 'torch.distributed', 'torch.testing', 'torch.utils.tensorboard', 'torchaudio', 'torchvision', 'matplotlib', 'scipy', 'pandas', 'PIL', 'Pillow', 'tkinter', 'PyQt5', 'PyQt6', 'PySide6', 'wx', 'cv2', 'opencv-python', 'IPython', 'jupyter', 'notebook', 'pytest', 'unittest', 'doctest', 'sphinx', 'setuptools'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='torio_scribe_engine',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='torio_scribe_engine',
)
