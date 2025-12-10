"""
Torio Tools Scribe - Text Subtitle Generator
Gera legendas a partir de texto com segmentação profissional.
"""

import re
import math
from typing import Dict, Any, List, Optional

class TextSubtitleGenerator:
    """Gera legendas SRT a partir de texto com timing calculado."""
    
    def __init__(self):
        self.default_settings = {
            'max_chars_per_line': 42,       # Máximo de caracteres por linha (37-42 recomendado)
            'max_lines_per_cue': 2,         # Máximo de linhas por bloco (padrão: 2)
            'max_chars_per_cue': 84,        # Máximo de caracteres por bloco (2 * 42)
            'min_duration_ms': 1000,        # Duração mínima em ms (1 segundo)
            'max_duration_ms': 7000,        # Duração máxima em ms (7 segundos)
            'gap_ms': 150,                  # Gap mínimo entre legendas (100-250ms)
            'max_cps': 17,                  # Caracteres por segundo máximo (17-20)
            'words_per_minute': 150,        # Velocidade de leitura padrão
        }
    
    def generate_subtitles(
        self,
        text: str,
        output_format: str = 'srt',
        settings: Optional[Dict[str, Any]] = None,
        start_time: float = 0.0
    ) -> Dict[str, Any]:
        """
        Gerar legendas a partir de texto.
        
        Args:
            text: Texto para converter em legendas
            output_format: Formato de saída (srt, vtt, ass, json, txt)
            settings: Configurações de legenda
            start_time: Tempo inicial em segundos
        
        Returns:
            Dict com subtitles e estatísticas
        """
        # Mesclar settings
        cfg = {**self.default_settings}
        if settings:
            cfg.update(settings)
        
        # Limpar texto
        text = self._clean_text(text)
        
        # Segmentar em blocos
        segments = self._segment_text(text, cfg)
        
        # Calcular timing para cada segmento
        timed_segments = self._calculate_timing(segments, cfg, start_time)
        
        # Normalizar timing (remover overlaps)
        normalized_segments = self._normalize_timing(timed_segments, cfg)
        
        # Formatar saída
        if output_format == 'srt':
            subtitles = self._format_srt(normalized_segments)
        elif output_format == 'vtt':
            subtitles = self._format_vtt(normalized_segments)
        elif output_format == 'ass':
            subtitles = self._format_ass(normalized_segments)
        elif output_format == 'json':
            subtitles = self._format_json(normalized_segments)
        elif output_format == 'txt':
            subtitles = '\n'.join([s['text'] for s in normalized_segments])
        else:
            subtitles = self._format_srt(normalized_segments)
        
        # Calcular duração total
        total_duration = normalized_segments[-1]['end'] if normalized_segments else 0
        
        return {
            'subtitles': subtitles,
            'duration': total_duration,
            'segment_count': len(normalized_segments),
            'detected_language': 'pt'  # Placeholder
        }
    
    def _clean_text(self, text: str) -> str:
        """Limpar e normalizar texto."""
        # Remover quebras de linha excessivas
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Normalizar espaços
        text = re.sub(r' {2,}', ' ', text)
        # Remover espaços no início/fim das linhas
        lines = [line.strip() for line in text.split('\n')]
        return '\n'.join(lines)
    
    def _segment_text(self, text: str, cfg: Dict) -> List[Dict]:
        """Segmentar texto em blocos respeitando limites."""
        max_chars = cfg['max_chars_per_cue']
        max_line_chars = cfg['max_chars_per_line']
        max_lines = cfg['max_lines_per_cue']
        
        segments = []
        
        # Dividir por parágrafos primeiro
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        for paragraph in paragraphs:
            # Dividir parágrafo em sentenças
            sentences = self._split_sentences(paragraph)
            
            current_segment = []
            current_chars = 0
            
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                
                sentence_len = len(sentence)
                
                # Se a sentença sozinha é maior que o limite, dividir
                if sentence_len > max_chars:
                    # Finalizar segmento atual se houver
                    if current_segment:
                        segments.append(self._create_segment(' '.join(current_segment), max_line_chars, max_lines))
                        current_segment = []
                        current_chars = 0
                    
                    # Dividir sentença longa
                    sub_segments = self._split_long_text(sentence, max_chars, max_line_chars, max_lines)
                    segments.extend(sub_segments)
                    
                elif current_chars + sentence_len + 1 > max_chars:
                    # Segmento atual + nova sentença excede limite
                    if current_segment:
                        segments.append(self._create_segment(' '.join(current_segment), max_line_chars, max_lines))
                    current_segment = [sentence]
                    current_chars = sentence_len
                    
                else:
                    # Adicionar sentença ao segmento atual
                    current_segment.append(sentence)
                    current_chars += sentence_len + 1
            
            # Finalizar último segmento do parágrafo
            if current_segment:
                segments.append(self._create_segment(' '.join(current_segment), max_line_chars, max_lines))
        
        return segments
    
    def _split_sentences(self, text: str) -> List[str]:
        """Dividir texto em sentenças."""
        # Padrão: pontuação seguida de espaço e maiúscula
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])', text)
        return sentences
    
    def _split_long_text(self, text: str, max_chars: int, max_line_chars: int, max_lines: int) -> List[Dict]:
        """Dividir texto longo em múltiplos segmentos."""
        segments = []
        words = text.split()
        current_words = []
        current_chars = 0
        
        for word in words:
            word_len = len(word)
            
            if current_chars + word_len + 1 > max_chars:
                if current_words:
                    segments.append(self._create_segment(' '.join(current_words), max_line_chars, max_lines))
                current_words = [word]
                current_chars = word_len
            else:
                current_words.append(word)
                current_chars += word_len + (1 if current_words else 0)
        
        if current_words:
            segments.append(self._create_segment(' '.join(current_words), max_line_chars, max_lines))
        
        return segments
    
    def _create_segment(self, text: str, max_line_chars: int, max_lines: int) -> Dict:
        """Criar segmento com texto quebrado em linhas."""
        lines = self._wrap_text(text, max_line_chars, max_lines)
        return {
            'text': '\n'.join(lines),
            'raw_text': text,
            'char_count': len(text)
        }
    
    def _wrap_text(self, text: str, max_chars: int, max_lines: int) -> List[str]:
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
    
    def _calculate_timing(self, segments: List[Dict], cfg: Dict, start_time: float) -> List[Dict]:
        """Calcular timing para cada segmento."""
        wpm = cfg['words_per_minute']
        max_cps = cfg['max_cps']
        min_duration = cfg['min_duration_ms'] / 1000
        max_duration = cfg['max_duration_ms'] / 1000
        gap = cfg['gap_ms'] / 1000
        
        current_time = start_time
        timed = []
        
        for segment in segments:
            text = segment['raw_text']
            char_count = len(text)
            word_count = len(text.split())
            
            # Calcular duração baseada em CPS (caracteres por segundo)
            duration_by_cps = char_count / max_cps
            
            # Calcular duração baseada em WPM
            duration_by_wpm = (word_count / wpm) * 60
            
            # Usar o maior valor para garantir leitura confortável
            duration = max(duration_by_cps, duration_by_wpm)
            
            # Aplicar limites
            duration = max(min_duration, min(duration, max_duration))
            
            timed.append({
                'text': segment['text'],
                'start': current_time,
                'end': current_time + duration,
                'duration': duration
            })
            
            current_time += duration + gap
        
        return timed
    
    def _normalize_timing(self, segments: List[Dict], cfg: Dict) -> List[Dict]:
        """Normalizar timing para remover overlaps."""
        if not segments:
            return segments
        
        gap = cfg['gap_ms'] / 1000
        min_duration = cfg['min_duration_ms'] / 1000
        
        normalized = []
        
        for i, segment in enumerate(segments):
            seg = segment.copy()
            
            # Verificar overlap com segmento anterior
            if normalized:
                prev = normalized[-1]
                if seg['start'] < prev['end'] + gap:
                    seg['start'] = prev['end'] + gap
                    # Recalcular end mantendo duração mínima
                    seg['end'] = max(seg['start'] + min_duration, seg['end'])
            
            normalized.append(seg)
        
        return normalized
    
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
    
    def _format_srt(self, segments: List[Dict]) -> str:
        """Formatar como SRT."""
        srt_parts = []
        for i, seg in enumerate(segments, 1):
            start_ts = self._format_timestamp_srt(seg['start'])
            end_ts = self._format_timestamp_srt(seg['end'])
            srt_parts.append(f"{i}\n{start_ts} --> {end_ts}\n{seg['text']}\n")
        return '\n'.join(srt_parts)
    
    def _format_vtt(self, segments: List[Dict]) -> str:
        """Formatar como WebVTT."""
        vtt_parts = ["WEBVTT\n"]
        for seg in segments:
            start_ts = self._format_timestamp_vtt(seg['start'])
            end_ts = self._format_timestamp_vtt(seg['end'])
            vtt_parts.append(f"{start_ts} --> {end_ts}\n{seg['text']}\n")
        return '\n'.join(vtt_parts)
    
    def _format_ass(self, segments: List[Dict]) -> str:
        """Formatar como ASS/SSA."""
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
        for seg in segments:
            start_ts = self._format_timestamp_ass(seg['start'])
            end_ts = self._format_timestamp_ass(seg['end'])
            # Substituir \n por \\N para ASS
            text = seg['text'].replace('\n', '\\N')
            ass_parts.append(f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{text}")
        return '\n'.join(ass_parts)
    
    def _format_json(self, segments: List[Dict]) -> str:
        """Formatar como JSON."""
        import json
        json_segments = [{
            'id': i + 1,
            'start': round(seg['start'], 3),
            'end': round(seg['end'], 3),
            'text': seg['text']
        } for i, seg in enumerate(segments)]
        return json.dumps({'segments': json_segments}, indent=2, ensure_ascii=False)
