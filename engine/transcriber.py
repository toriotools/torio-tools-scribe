"""
Torio Tools Scribe - Whisper Transcriber
Transcrição de áudio usando faster-whisper (local, offline).
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any
from faster_whisper import WhisperModel

def get_ffmpeg_path():
    """Obter caminho do FFmpeg (local ou sistema)."""
    if getattr(sys, 'frozen', False):
        # Executável PyInstaller - FFmpeg está em resources
        base_path = Path(sys.executable).parent.parent
        ffmpeg_exe = base_path / 'ffmpeg-win-x86_64-v7.1.exe'
        if ffmpeg_exe.exists():
            return str(ffmpeg_exe)
    else:
        # Desenvolvimento - FFmpeg na raiz do projeto
        project_root = Path(__file__).parent.parent
        ffmpeg_exe = project_root / 'ffmpeg-win-x86_64-v7.1.exe'
        if ffmpeg_exe.exists():
            return str(ffmpeg_exe)
    
    # Fallback: tentar ffmpeg do sistema
    return 'ffmpeg'

class WhisperTranscriber:
    """Transcritor de áudio usando faster-whisper."""
    
    def __init__(self, model_size: str = 'base', models_path: Optional[Path] = None):
        """
        Inicializar transcritor.
        
        Args:
            model_size: Tamanho do modelo (tiny, base, small, medium, large-v3)
            models_path: Caminho para a pasta de modelos
        """
        self.model_name = model_size
        self.models_path = models_path
        self.model = None
        self.is_ready = False
        self.ffmpeg_path = get_ffmpeg_path()
        
        print(f"[Transcriber] FFmpeg: {self.ffmpeg_path}")
        self._load_model()
    
    def _load_model(self):
        """Carregar modelo Whisper."""
        try:
            # Verificar se há modelo local
            local_model_path = None
            if self.models_path:
                local_model_path = self.models_path / f'faster-whisper-{self.model_name}'
                if local_model_path.exists():
                    print(f"[Transcriber] Usando modelo local: {local_model_path}")
                    model_path = str(local_model_path)
                else:
                    print(f"[Transcriber] Modelo local não encontrado, baixando: {self.model_name}")
                    model_path = self.model_name
            else:
                model_path = self.model_name
            
            # Carregar modelo
            self.model = WhisperModel(
                model_path,
                device='cpu',
                compute_type='int8'
            )
            
            self.is_ready = True
            print(f"[Transcriber] Modelo {self.model_name} carregado com sucesso!")
            
        except Exception as e:
            print(f"[Transcriber] Erro ao carregar modelo: {e}")
            self.is_ready = False
            raise
    
    def _extract_audio(self, video_path: str) -> str:
        """Extrair áudio de vídeo usando FFmpeg local."""
        # Criar arquivo temporário para o áudio
        temp_audio = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        temp_audio.close()
        
        try:
            # Usar FFmpeg local
            cmd = [
                self.ffmpeg_path, '-y',
                '-i', video_path,
                '-vn',  # Sem vídeo
                '-acodec', 'pcm_s16le',  # PCM 16-bit
                '-ar', '16000',  # 16kHz (ótimo para Whisper)
                '-ac', '1',  # Mono
                temp_audio.name
            ]
            
            print(f"[Transcriber] Extraindo áudio: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 min timeout
            )
            
            if result.returncode != 0:
                raise Exception(f"FFmpeg error: {result.stderr}")
            
            print(f"[Transcriber] Áudio extraído: {temp_audio.name}")
            return temp_audio.name
            
        except FileNotFoundError:
            # FFmpeg não encontrado
            os.unlink(temp_audio.name)
            raise Exception(f"FFmpeg não encontrado em: {self.ffmpeg_path}")
        except Exception as e:
            if os.path.exists(temp_audio.name):
                os.unlink(temp_audio.name)
            raise Exception(f"Erro ao extrair áudio: {str(e)}")
    
    def transcribe(
        self,
        audio_path: str,
        language: str = 'pt',
        output_format: str = 'srt',
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Transcrever arquivo de áudio.
        
        Args:
            audio_path: Caminho do arquivo de áudio/vídeo
            language: Código do idioma (pt, en, es, etc.) ou 'auto'
            output_format: Formato de saída (srt, vtt, ass, json, txt)
            settings: Configurações de legenda
        
        Returns:
            Dict com subtitles, duration, detected_language
        """
        if not self.is_ready:
            raise RuntimeError("Modelo não está pronto")
        
        # Verificar se arquivo existe
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Arquivo não encontrado: {audio_path}")
        
        settings = settings or {}
        max_chars = settings.get('max_chars_per_line', 42)
        max_lines = settings.get('max_lines', 2)
        min_duration = settings.get('min_duration', 1.5)
        max_duration = settings.get('max_duration', 7.0)
        
        # Verificar se é vídeo e extrair áudio
        temp_audio = None
        file_ext = os.path.splitext(audio_path)[1].lower()
        video_extensions = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.wmv']
        
        transcribe_path = audio_path
        
        if file_ext in video_extensions:
            print(f"[Transcriber] Detectado vídeo, extraindo áudio...")
            temp_audio = self._extract_audio(audio_path)
            transcribe_path = temp_audio
        
        try:
            # Transcrever
            lang = None if language == 'auto' else language
            print(f"[Transcriber] Transcrevendo: {transcribe_path} (idioma: {lang or 'auto'})")
            
            segments, info = self.model.transcribe(
                transcribe_path,
                language=lang,
                beam_size=5,
                word_timestamps=True,
                vad_filter=True
            )
            
            # Processar segmentos
            segments_list = list(segments)
            print(f"[Transcriber] {len(segments_list)} segmentos encontrados")
            
            # Formatar saída
            if output_format == 'srt':
                subtitles = self._format_srt(segments_list, max_chars, max_lines, min_duration, max_duration)
            elif output_format == 'vtt':
                subtitles = self._format_vtt(segments_list, max_chars, max_lines, min_duration, max_duration)
            elif output_format == 'ass':
                subtitles = self._format_ass(segments_list, max_chars, max_lines, min_duration, max_duration)
            elif output_format == 'json':
                subtitles = self._format_json(segments_list, max_chars, max_lines, min_duration, max_duration)
            elif output_format == 'txt':
                subtitles = self._format_txt(segments_list)
            else:
                subtitles = self._format_srt(segments_list, max_chars, max_lines, min_duration, max_duration)
            
            return {
                'subtitles': subtitles,
                'duration': info.duration,
                'detected_language': info.language
            }
            
        finally:
            # Limpar arquivo temporário
            if temp_audio and os.path.exists(temp_audio):
                os.unlink(temp_audio)
    
    def _format_srt(
        self,
        segments: list,
        max_chars: int,
        max_lines: int,
        min_duration: float,
        max_duration: float
    ) -> str:
        """Formatar segmentos como SRT."""
        srt_parts = []
        index = 1
        
        for segment in segments:
            text = segment.text.strip()
            if not text:
                continue
            
            # Quebrar texto longo
            lines = self._wrap_text(text, max_chars, max_lines)
            formatted_text = '\n'.join(lines)
            
            # Ajustar duração
            start = segment.start
            end = segment.end
            duration = end - start
            
            if duration < min_duration:
                end = start + min_duration
            elif duration > max_duration:
                end = start + max_duration
            
            # Formatar timestamps
            start_ts = self._format_timestamp_srt(start)
            end_ts = self._format_timestamp_srt(end)
            
            srt_parts.append(f"{index}\n{start_ts} --> {end_ts}\n{formatted_text}\n")
            index += 1
        
        return '\n'.join(srt_parts)
    
    def _format_vtt(
        self,
        segments: list,
        max_chars: int,
        max_lines: int,
        min_duration: float,
        max_duration: float
    ) -> str:
        """Formatar segmentos como WebVTT."""
        vtt_parts = ["WEBVTT\n"]
        
        for segment in segments:
            text = segment.text.strip()
            if not text:
                continue
            
            lines = self._wrap_text(text, max_chars, max_lines)
            formatted_text = '\n'.join(lines)
            
            start = segment.start
            end = segment.end
            duration = end - start
            
            if duration < min_duration:
                end = start + min_duration
            elif duration > max_duration:
                end = start + max_duration
            
            start_ts = self._format_timestamp_vtt(start)
            end_ts = self._format_timestamp_vtt(end)
            
            vtt_parts.append(f"{start_ts} --> {end_ts}\n{formatted_text}\n")
        
        return '\n'.join(vtt_parts)
    
    def _format_ass(
        self,
        segments: list,
        max_chars: int,
        max_lines: int,
        min_duration: float,
        max_duration: float
    ) -> str:
        """Formatar segmentos como ASS/SSA (Adobe Premiere, DaVinci, etc)."""
        ass_header = """[Script Info]
Title: Torio Tools Scribe
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        ass_parts = [ass_header]
        
        for segment in segments:
            text = segment.text.strip()
            if not text:
                continue
            
            lines = self._wrap_text(text, max_chars, max_lines)
            formatted_text = '\\N'.join(lines)  # ASS usa \N para quebra de linha
            
            start = segment.start
            end = segment.end
            duration = end - start
            
            if duration < min_duration:
                end = start + min_duration
            elif duration > max_duration:
                end = start + max_duration
            
            start_ts = self._format_timestamp_ass(start)
            end_ts = self._format_timestamp_ass(end)
            
            ass_parts.append(f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{formatted_text}")
        
        return '\n'.join(ass_parts)
    
    def _format_json(
        self,
        segments: list,
        max_chars: int,
        max_lines: int,
        min_duration: float,
        max_duration: float
    ) -> str:
        """Formatar segmentos como JSON."""
        json_segments = []
        
        for i, segment in enumerate(segments):
            text = segment.text.strip()
            if not text:
                continue
            
            start = segment.start
            end = segment.end
            duration = end - start
            
            if duration < min_duration:
                end = start + min_duration
            elif duration > max_duration:
                end = start + max_duration
            
            json_segments.append({
                'id': i + 1,
                'start': round(start, 3),
                'end': round(end, 3),
                'text': text
            })
        
        return json.dumps({'segments': json_segments}, indent=2, ensure_ascii=False)
    
    def _format_txt(self, segments: list) -> str:
        """Formatar segmentos como texto puro (transcrição)."""
        texts = []
        for segment in segments:
            text = segment.text.strip()
            if text:
                texts.append(text)
        return '\n'.join(texts)
    
    def _wrap_text(self, text: str, max_chars: int, max_lines: int) -> list:
        """Quebrar texto em linhas respeitando limites."""
        words = text.split()
        lines = []
        current_line = []
        current_length = 0
        
        for word in words:
            word_len = len(word)
            
            if current_length + word_len + (1 if current_line else 0) <= max_chars:
                current_line.append(word)
                current_length += word_len + (1 if len(current_line) > 1 else 0)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
                current_length = word_len
                
                if len(lines) >= max_lines:
                    break
        
        if current_line and len(lines) < max_lines:
            lines.append(' '.join(current_line))
        
        return lines if lines else [text[:max_chars]]
    
    def _format_timestamp_srt(self, seconds: float) -> str:
        """Formatar timestamp para SRT (HH:MM:SS,mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    def _format_timestamp_vtt(self, seconds: float) -> str:
        """Formatar timestamp para VTT (HH:MM:SS.mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
    
    def _format_timestamp_ass(self, seconds: float) -> str:
        """Formatar timestamp para ASS (H:MM:SS.cc)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centis = int((seconds % 1) * 100)
        return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"
