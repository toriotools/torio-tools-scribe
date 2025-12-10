"""
Torio Tools Scribe - Python Engine
Servidor Flask para transcrição de áudio com Whisper local.
"""

import os
import sys
import json
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from transcriber import WhisperTranscriber
from text_generator import TextSubtitleGenerator

app = Flask(__name__)
CORS(app)

# Inicializar transcritor e gerador de texto
transcriber = None
text_generator = TextSubtitleGenerator()

def get_models_path():
    """Obter caminho da pasta de modelos."""
    if getattr(sys, 'frozen', False):
        # Executável PyInstaller
        base_path = Path(sys.executable).parent.parent
        return base_path / 'models'
    else:
        # Desenvolvimento
        return Path(__file__).parent.parent / 'models'

@app.route('/status', methods=['GET'])
def status():
    """Verificar status do engine."""
    return jsonify({
        'ready': transcriber is not None and transcriber.is_ready,
        'model': transcriber.model_name if transcriber else None,
        'version': '12-2025'
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcrever arquivo de áudio para SRT."""
    try:
        data = request.get_json()
        file_path = data.get('file_path')
        language = data.get('language', 'pt')
        output_format = data.get('format', 'srt')
        
        # Configurações de legenda
        settings = {
            'max_chars_per_line': data.get('max_chars_per_line', 42),
            'max_lines': data.get('max_lines', 2),
            'min_duration': data.get('min_duration', 1.0),
            'max_duration': data.get('max_duration', 7.0)
        }
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 400
        
        # Transcrever
        result = transcriber.transcribe(
            file_path,
            language=language,
            output_format=output_format,
            settings=settings
        )
        
        return jsonify({
            'success': True,
            'subtitles': result['subtitles'],
            'duration': result['duration'],
            'language': result['detected_language']
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/generate-from-text', methods=['POST'])
def generate_from_text():
    """Gerar legendas a partir de texto (modo texto)."""
    try:
        data = request.get_json()
        text = data.get('text', '')
        output_format = data.get('format', 'srt')
        
        if not text or not text.strip():
            return jsonify({
                'success': False,
                'error': 'Texto não fornecido'
            }), 400
        
        # Configurações avançadas de legenda
        settings = {
            'max_chars_per_line': data.get('max_chars_per_line', 42),
            'max_lines_per_cue': data.get('max_lines', 2),
            'max_chars_per_cue': data.get('max_chars_per_cue', 84),
            'min_duration_ms': int(data.get('min_duration', 1.0) * 1000),
            'max_duration_ms': int(data.get('max_duration', 7.0) * 1000),
            'gap_ms': int(data.get('gap', 0.15) * 1000),
            'max_cps': data.get('max_cps', 17),
            'words_per_minute': data.get('wpm', 150),
        }
        
        # Gerar legendas
        result = text_generator.generate_subtitles(
            text=text,
            output_format=output_format,
            settings=settings
        )
        
        return jsonify({
            'success': True,
            'subtitles': result['subtitles'],
            'duration': result['duration'],
            'segment_count': result['segment_count'],
            'language': result['detected_language']
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/languages', methods=['GET'])
def get_languages():
    """Listar idiomas suportados."""
    return jsonify({
        'languages': [
            {'code': 'auto', 'name': 'Detectar Automático'},
            {'code': 'pt', 'name': 'Português (Brasil)'},
            {'code': 'en', 'name': 'Inglês'},
            {'code': 'es', 'name': 'Espanhol'},
            {'code': 'fr', 'name': 'Francês'},
            {'code': 'de', 'name': 'Alemão'},
            {'code': 'it', 'name': 'Italiano'},
            {'code': 'ja', 'name': 'Japonês'},
            {'code': 'ko', 'name': 'Coreano'},
            {'code': 'zh', 'name': 'Chinês'}
        ]
    })

def main():
    global transcriber
    
    print("[Torio Scribe Engine] Iniciando...")
    
    # Carregar modelo Whisper
    models_path = get_models_path()
    print(f"[Torio Scribe Engine] Caminho de modelos: {models_path}")
    
    transcriber = WhisperTranscriber(
        model_size='base',
        models_path=models_path
    )
    
    print("[Torio Scribe Engine] Modelo carregado!")
    print("[Torio Scribe Engine] Servidor rodando em http://127.0.0.1:5123")
    
    app.run(host='127.0.0.1', port=5123, debug=False, threaded=True)

if __name__ == '__main__':
    main()
