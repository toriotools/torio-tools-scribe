# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['H:\\dev\\torio-tools-scribe\\engine\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('H:\\dev\\torio-tools-scribe\\engine\\transcriber.py', '.'), ('H:\\dev\\torio-tools-scribe\\engine\\text_generator.py', '.')],
    hiddenimports=['flask', 'flask_cors', 'faster_whisper', 'ctranslate2'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'scipy', 'pandas', 'PIL', 'tkinter', 'PyQt5', 'PyQt6'],
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
