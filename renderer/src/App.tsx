import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Upload,
    FileVideo,
    Wand2,
    Download,
    Settings,
    Zap,
    Star,
    Play,
    RotateCcw,
    Copy,
    CheckCircle,
    AlertCircle,
    Volume2,
    Type,
    X,
    Code,
    Heart,
    Shield,
    Globe,
    Users,
    Coffee,
    ExternalLink,
    Sliders,
    Cog,
    Save,
    ShoppingCart,
    Trash2
} from 'lucide-react'
import { openExternalLink, isElectron, electronAPI } from './lib/electron'
import { cn } from './lib/utils'

// Tipos
interface SubtitleSettings {
    maxCharsPerLine: number
    maxLines: number
    minDuration: number
    maxDuration: number
    pauseBetweenSubtitles: number
    maxCPS: number  // Caracteres por segundo
    autoSplit: boolean
    mergeShortLines: boolean
}

interface Preset {
    id: string
    name: string
    settings: SubtitleSettings
}

interface Banner {
    id: number
    title: string
    description: string
    image: string
    link: string
}

// Telas disponíveis (removido 'styles')
type Screen = 'create' | 'presets' | 'settings'

// Presets padrão
const defaultPresets: Preset[] = [
    {
        id: 'youtube',
        name: '📺 YouTube Padrão',
        settings: {
            maxCharsPerLine: 42,
            maxLines: 2,
            minDuration: 1.5,
            maxDuration: 7,
            pauseBetweenSubtitles: 0.2,
            maxCPS: 17,
            autoSplit: true,
            mergeShortLines: true
        }
    },
    {
        id: 'shorts',
        name: '📱 Shorts/Reels',
        settings: {
            maxCharsPerLine: 30,
            maxLines: 2,
            minDuration: 1.0,
            maxDuration: 4,
            pauseBetweenSubtitles: 0.1,
            maxCPS: 20,
            autoSplit: true,
            mergeShortLines: true
        }
    },
    {
        id: 'podcast',
        name: '🎙️ Podcast/Longo',
        settings: {
            maxCharsPerLine: 50,
            maxLines: 2,
            minDuration: 2.0,
            maxDuration: 10,
            pauseBetweenSubtitles: 0.3,
            maxCPS: 15,
            autoSplit: true,
            mergeShortLines: false
        }
    }
]

// Dados dos produtos
const sidebarProduct = {
    title: 'VIDEO-ZIZ Pro',
    subtitle: 'Automação de Vídeos Dark',
    description: 'Crie centenas de vídeos com IA, legendas Whisper e render em lote. Licença vitalícia.',
    link: 'https://pay.kiwify.com.br/jXNk3EL',
    image: '/assets/banners/video_ziz.jpg'
}

const carouselBanners: Banner[] = [
    {
        id: 1,
        title: 'Torio Tools TTS',
        description: '+500 vozes realistas em 50 idiomas. Converta roteiros em áudio ilimitado no seu PC.',
        image: '/assets/banners/tts.jpg',
        link: 'https://pay.kiwify.com.br/tKClZ43'
    },
    {
        id: 2,
        title: 'Whisk Automation',
        description: 'Automatize a geração de imagens e ganhe tempo. O fim da dor de cabeça criativa.',
        image: '/assets/banners/whisk.jpg',
        link: 'https://pay.kiwify.com.br/m3NoniG'
    },
    {
        id: 3,
        title: 'Gerenciador de APIs',
        description: 'Centralize suas chaves, controle expiração e faça backups seguros.',
        image: '/assets/banners/api_manager.jpg',
        link: 'https://pay.kiwify.com.br/5vvjuQL'
    }
]

export default function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('create')
    const [mode, setMode] = useState<'audio' | 'text'>('audio')
    const [currentFile, setCurrentFile] = useState<File | null>(null)
    const [currentFilePath, setCurrentFilePath] = useState<string>('')
    const [fileObjectUrl, setFileObjectUrl] = useState<string>('')
    const [scriptText, setScriptText] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isDragOver, setIsDragOver] = useState(false)
    const [copiedText, setCopiedText] = useState(false)
    const [generatedSubtitles, setGeneratedSubtitles] = useState('')
    const [isDevModalOpen, setIsDevModalOpen] = useState(false)
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(true) // Modal de apoio abre automaticamente
    const [copiedPix, setCopiedPix] = useState(false)
    const [engineReady, setEngineReady] = useState(false)
    const [selectedLanguage, setSelectedLanguage] = useState('auto') // MUDADO: padrão "auto"
    const [outputFormat, setOutputFormat] = useState('srt')
    const [presets, setPresets] = useState<Preset[]>(defaultPresets)
    const [selectedPreset, setSelectedPreset] = useState<string>('youtube')

    const fileInputRef = useRef<HTMLInputElement>(null)

    const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
        maxCharsPerLine: 42,
        maxLines: 2,
        minDuration: 1.5,
        maxDuration: 7,
        pauseBetweenSubtitles: 0.2,
        maxCPS: 17,
        autoSplit: true,
        mergeShortLines: true
    })

    // Verificar status do engine
    useEffect(() => {
        const checkEngine = async () => {
            if (isElectron() && electronAPI) {
                try {
                    const status = await electronAPI.getEngineStatus()
                    setEngineReady(status.ready)
                } catch {
                    setEngineReady(false)
                }
            } else {
                // Em modo web/dev, simular engine pronto após 2s
                setTimeout(() => setEngineReady(true), 2000)
            }
        }

        checkEngine()
        const interval = setInterval(checkEngine, 3000)
        return () => clearInterval(interval)
    }, [])

    // Carrossel automático
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % carouselBanners.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    // Aplicar preset selecionado
    const applyPreset = useCallback((presetId: string) => {
        const preset = presets.find(p => p.id === presetId)
        if (preset) {
            setSubtitleSettings(preset.settings)
            setSelectedPreset(presetId)
        }
    }, [presets])

    // Handler para arquivo selecionado (input ou drag)
    const handleFileSelected = useCallback((file: File) => {
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'audio/mpeg', 'audio/wav', 'audio/webm', 'video/webm', 'audio/x-wav']
        const validExtensions = ['.mp4', '.mov', '.mkv', '.mp3', '.wav', '.webm']

        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

        if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
            alert('Formato inválido. Use MP4, MOV, MKV, MP3, WAV ou WebM.')
            return
        }

        if (file.size > 2 * 1024 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo 2GB.')
            return
        }

        // Limpar URL anterior se existir
        if (fileObjectUrl) {
            URL.revokeObjectURL(fileObjectUrl)
        }

        // Criar Object URL para o arquivo (funciona tanto web quanto Electron)
        const objectUrl = URL.createObjectURL(file)
        setFileObjectUrl(objectUrl)
        setCurrentFile(file)
        setCurrentFilePath(file.name)
    }, [fileObjectUrl])

    // Click para abrir seletor de arquivo
    const handleUploadClick = useCallback(() => {
        if (isElectron() && electronAPI) {
            // Usar diálogo nativo do Electron
            electronAPI.selectFile({
                filters: [{ name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'mp3', 'wav', 'webm'] }]
            }).then((filePath) => {
                if (filePath) {
                    setCurrentFilePath(filePath)
                    // Criar um File mock para manter compatibilidade
                    const fileName = filePath.split(/[/\\]/).pop() || 'arquivo'
                    setCurrentFile(new File([], fileName))
                }
            })
        } else {
            // Usar input file nativo
            fileInputRef.current?.click()
        }
    }, [])

    // Handler do input file
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelected(file)
        }
    }, [handleFileSelected])

    // Drag handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)

        const file = e.dataTransfer.files[0]
        if (file) {
            handleFileSelected(file)
        }
    }, [handleFileSelected])

    // Colar texto
    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText()
            setScriptText(text)
            setCopiedText(true)
            setTimeout(() => setCopiedText(false), 2000)
        } catch (err) {
            console.error('Erro ao colar:', err)
        }
    }, [])

    // Gerar legendas
    const generateSubtitles = async () => {
        if (mode === 'audio' && !currentFile) {
            alert('Selecione um arquivo de áudio/vídeo')
            return
        }

        if (mode === 'text' && !scriptText.trim()) {
            alert('Cole ou digite seu roteiro')
            return
        }

        setIsProcessing(true)
        setProgress(0)

        try {
            if (mode === 'audio' && isElectron() && electronAPI && currentFilePath) {
                // Simular progresso
                const progressInterval = setInterval(() => {
                    setProgress(prev => Math.min(prev + 5, 90))
                }, 500)

                const result = await electronAPI.transcribeAudio(currentFilePath, {
                    language: selectedLanguage,
                    format: outputFormat as 'srt' | 'vtt',
                    max_chars_per_line: subtitleSettings.maxCharsPerLine,
                    max_lines: subtitleSettings.maxLines,
                    min_duration: subtitleSettings.minDuration,
                    max_duration: subtitleSettings.maxDuration
                })

                clearInterval(progressInterval)
                setProgress(100)

                if (result.success && result.subtitles) {
                    setGeneratedSubtitles(result.subtitles)
                } else {
                    throw new Error(result.error || 'Erro ao transcrever')
                }
            } else if (mode === 'text') {
                // Modo texto - usar endpoint de geração profissional
                const progressInterval = setInterval(() => {
                    setProgress(prev => Math.min(prev + 10, 90))
                }, 200)

                try {
                    const response = await fetch('http://127.0.0.1:5123/generate-from-text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: scriptText,
                            format: outputFormat,
                            max_chars_per_line: subtitleSettings.maxCharsPerLine,
                            max_lines: subtitleSettings.maxLines,
                            max_chars_per_cue: subtitleSettings.maxCharsPerLine * subtitleSettings.maxLines,
                            min_duration: subtitleSettings.minDuration,
                            max_duration: subtitleSettings.maxDuration,
                            gap: subtitleSettings.pauseBetweenSubtitles,
                            max_cps: subtitleSettings.maxCPS,
                            wpm: 150
                        })
                    })

                    const result = await response.json()
                    clearInterval(progressInterval)
                    setProgress(100)

                    if (result.success && result.subtitles) {
                        setGeneratedSubtitles(result.subtitles)
                    } else {
                        throw new Error(result.error || 'Erro ao gerar legendas')
                    }
                } catch (fetchError: any) {
                    clearInterval(progressInterval)
                    // Fallback: geração local se backend não disponível
                    console.warn('Backend não disponível, usando geração local:', fetchError.message)

                    const lines = scriptText.split('\n').filter(l => l.trim())
                    let srt = ''
                    let index = 1
                    let currentTime = 0

                    for (const line of lines) {
                        const duration = Math.max(subtitleSettings.minDuration, Math.min(line.length * 0.08, subtitleSettings.maxDuration))
                        const startTime = formatSRTTime(currentTime)
                        currentTime += duration
                        const endTime = formatSRTTime(currentTime)

                        srt += `${index}\n${startTime} --> ${endTime}\n${line}\n\n`
                        index++
                        currentTime += subtitleSettings.pauseBetweenSubtitles
                    }

                    setGeneratedSubtitles(srt.trim())
                    setProgress(100)
                }
            } else {
                // Modo web sem Electron
                alert('Para transcrição de áudio, use o aplicativo desktop.')
                setProgress(0)
            }
        } catch (error: any) {
            alert(error.message || 'Erro ao gerar legendas')
        } finally {
            setIsProcessing(false)
        }
    }

    // Formatar tempo SRT
    const formatSRTTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 1000)
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
    }

    // Download legendas
    const downloadSubtitles = async () => {
        if (!generatedSubtitles) return

        const blob = new Blob([generatedSubtitles], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `legendas.${outputFormat}`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Copiar PIX
    const copyPixKey = async () => {
        const pixKey = 'toriotools@gmail.com'
        try {
            await navigator.clipboard.writeText(pixKey)
            setCopiedPix(true)
            setTimeout(() => setCopiedPix(false), 2000)
        } catch (err) {
            console.error('Erro ao copiar:', err)
        }
    }

    // Reset
    const resetFile = () => {
        if (fileObjectUrl) {
            URL.revokeObjectURL(fileObjectUrl)
        }
        setCurrentFile(null)
        setCurrentFilePath('')
        setFileObjectUrl('')
        setGeneratedSubtitles('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Salvar preset customizado
    const saveCustomPreset = () => {
        const name = prompt('Nome do preset:')
        if (!name) return

        const newPreset: Preset = {
            id: `custom_${Date.now()}`,
            name: `⭐ ${name}`,
            settings: { ...subtitleSettings }
        }

        setPresets(prev => [...prev, newPreset])
        setSelectedPreset(newPreset.id)
    }

    // Deletar preset
    const deletePreset = (presetId: string) => {
        if (!presetId.startsWith('custom_')) return
        setPresets(prev => prev.filter(p => p.id !== presetId))
        if (selectedPreset === presetId) {
            setSelectedPreset('youtube')
            applyPreset('youtube')
        }
    }

    // Renderizar tela de Presets
    const renderPresetsScreen = () => (
        <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Presets de Legenda</h2>
                    <p className="text-zinc-400">Configure ajustes finos para gerar legendas perfeitas</p>
                </div>

                {/* Lista de Presets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {presets.map((preset) => (
                        <div
                            key={preset.id}
                            className={cn(
                                "card cursor-pointer transition-all hover:border-orange-500/50",
                                selectedPreset === preset.id && "border-orange-500 bg-orange-500/5"
                            )}
                            onClick={() => applyPreset(preset.id)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-white">{preset.name}</h3>
                                {preset.id.startsWith('custom_') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deletePreset(preset.id); }}
                                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="text-sm text-zinc-400 space-y-1">
                                <p>Caracteres/linha: {preset.settings.maxCharsPerLine}</p>
                                <p>Duração: {preset.settings.minDuration}s - {preset.settings.maxDuration}s</p>
                                <p>Pausa: {preset.settings.pauseBetweenSubtitles}s</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Editor de configurações */}
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-orange-500" />
                            Ajustes Finos
                        </h3>
                        <button
                            onClick={saveCustomPreset}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Preset
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">
                                Máximo caracteres/linha: {subtitleSettings.maxCharsPerLine}
                            </label>
                            <input
                                type="range"
                                min="20"
                                max="60"
                                value={subtitleSettings.maxCharsPerLine}
                                onChange={(e) => setSubtitleSettings(prev => ({ ...prev, maxCharsPerLine: Number(e.target.value) }))}
                                className="w-full accent-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">
                                Máximo de linhas: {subtitleSettings.maxLines}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="4"
                                value={subtitleSettings.maxLines}
                                onChange={(e) => setSubtitleSettings(prev => ({ ...prev, maxLines: Number(e.target.value) }))}
                                className="w-full accent-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">
                                Duração mínima: {subtitleSettings.minDuration}s
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="5"
                                step="0.1"
                                value={subtitleSettings.minDuration}
                                onChange={(e) => setSubtitleSettings(prev => ({ ...prev, minDuration: Number(e.target.value) }))}
                                className="w-full accent-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">
                                Duração máxima: {subtitleSettings.maxDuration}s
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="15"
                                step="0.5"
                                value={subtitleSettings.maxDuration}
                                onChange={(e) => setSubtitleSettings(prev => ({ ...prev, maxDuration: Number(e.target.value) }))}
                                className="w-full accent-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">
                                Pausa entre legendas: {subtitleSettings.pauseBetweenSubtitles}s
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={subtitleSettings.pauseBetweenSubtitles}
                                onChange={(e) => setSubtitleSettings(prev => ({ ...prev, pauseBetweenSubtitles: Number(e.target.value) }))}
                                className="w-full accent-orange-500"
                            />
                        </div>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={subtitleSettings.autoSplit}
                                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, autoSplit: e.target.checked }))}
                                    className="w-5 h-5 accent-orange-500 rounded"
                                />
                                <span className="text-zinc-300">Auto-split linhas</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={subtitleSettings.mergeShortLines}
                                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, mergeShortLines: e.target.checked }))}
                                    className="w-5 h-5 accent-orange-500 rounded"
                                />
                                <span className="text-zinc-300">Unir linhas curtas</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    // Renderizar tela de Configurações
    const renderSettingsScreen = () => (
        <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Configurações</h2>
                    <p className="text-zinc-400">Preferências gerais do aplicativo</p>
                </div>

                <div className="space-y-6">
                    <div className="card">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <Cog className="w-5 h-5 text-orange-500" />
                            Whisper Engine
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                                <span className="text-zinc-300">Modelo</span>
                                <span className="text-orange-400 font-medium">base (~500MB)</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                                <span className="text-zinc-300">Status</span>
                                <span className={engineReady ? "text-green-400" : "text-yellow-400"}>
                                    {engineReady ? '✓ Pronto' : '⏳ Carregando...'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-zinc-300">Detecção de idioma</span>
                                <span className="text-zinc-400">Automática (recomendado)</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-semibold text-white mb-4">Sobre</h3>
                        <div className="space-y-2 text-sm text-zinc-400">
                            <p><strong className="text-white">Torio Tools Scribe</strong> v1.0.0</p>
                            <p>Transcrição de áudio offline com Whisper</p>
                            <p>© 2024 Torio Tools</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    // Tela principal de criação
    const renderCreateScreen = () => (
        <>
            {/* Header */}
            <div className="p-8 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Novo Projeto</h2>
                        <p className="text-zinc-400">Gere legendas automáticas com Whisper local ou sincronize roteiros</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => openExternalLink('https://www.youtube.com/@toriotools')}
                            className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Play className="w-4 h-4" />
                            Inscreva-se no Canal
                        </button>
                        {/* BOTÃO DEV PISCANDO */}
                        <button
                            onClick={() => setIsDevModalOpen(true)}
                            className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-orange-500 flex items-center justify-center transition-all animate-pulse shadow-lg shadow-orange-500/30"
                            style={{ animation: 'pulse-orange 2s ease-in-out infinite' }}
                        >
                            <Code className="w-5 h-5 text-orange-400" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setMode('audio')}
                        className={cn(
                            "px-4 py-2 rounded-md flex items-center gap-2 transition-colors",
                            mode === 'audio' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        <Volume2 className="w-4 h-4" />
                        Transcrição IA
                    </button>
                    <button
                        onClick={() => setMode('text')}
                        className={cn(
                            "px-4 py-2 rounded-md flex items-center gap-2 transition-colors",
                            mode === 'text' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        <Type className="w-4 h-4" />
                        Texto para Legenda
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Upload ou Text Input */}
                    {mode === 'audio' ? (
                        <div className="card">
                            <div className="flex items-center gap-2 mb-4">
                                <FileVideo className="w-5 h-5 text-orange-500" />
                                <h3 className="font-semibold text-lg">Upload de Mídia</h3>
                            </div>

                            {/* Input file oculto */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".mp4,.mov,.mkv,.mp3,.wav,.webm,video/*,audio/*"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer",
                                    isDragOver ? "border-orange-500 bg-orange-500/10" : "border-zinc-700",
                                    currentFile ? "border-green-500 bg-green-500/5" : "hover:border-zinc-500 hover:bg-zinc-800/50"
                                )}
                                onClick={handleUploadClick}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {currentFile ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                            <CheckCircle className="w-8 h-8 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{currentFilePath}</p>
                                            <p className="text-zinc-400 text-sm">
                                                {currentFile.size > 0 ? `${(currentFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Arquivo selecionado'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); resetFile(); }}
                                            className="px-4 py-2 border border-zinc-600 rounded-lg hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Trocar Arquivo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className={cn(
                                            "w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors",
                                            isDragOver ? "bg-orange-500/20" : "bg-zinc-800"
                                        )}>
                                            <Upload className={cn(
                                                "w-8 h-8 transition-colors",
                                                isDragOver ? "text-orange-400" : "text-zinc-400"
                                            )} />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">
                                                {isDragOver ? "Solte o arquivo aqui" : "Arraste um arquivo ou clique para selecionar"}
                                            </p>
                                            <p className="text-zinc-400 text-sm">MP4, MOV, MKV, MP3, WAV, WebM (Máx 2GB)</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Type className="w-5 h-5 text-orange-500" />
                                    <h3 className="font-semibold text-lg">Roteiro Original</h3>
                                </div>
                                <button
                                    onClick={handlePaste}
                                    className="px-3 py-1.5 border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                >
                                    {copiedText ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copiedText ? 'Colado!' : 'Colar'}
                                </button>
                            </div>
                            <textarea
                                placeholder="Cole aqui o texto exato do vídeo...

A IA usará este texto para gerar timing baseado no ritmo de fala."
                                value={scriptText}
                                onChange={(e) => setScriptText(e.target.value)}
                                className="w-full min-h-40 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-zinc-100 placeholder-zinc-600 resize-y focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    )}

                    {/* Configurações Rápidas */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-orange-500" />
                                <h3 className="font-semibold text-lg">Configurações</h3>
                            </div>
                            <select
                                value={selectedPreset}
                                onChange={(e) => applyPreset(e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                {presets.map((preset) => (
                                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Idioma do Áudio</label>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="auto">✨ Automático (Recomendado)</option>
                                    <option value="pt">🇧🇷 Português (Brasil)</option>
                                    <option value="en">🇺🇸 Inglês (US)</option>
                                    <option value="es">🇪🇸 Espanhol</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Formato de Saída</label>
                                <select
                                    value={outputFormat}
                                    onChange={(e) => setOutputFormat(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="srt">SRT (Padrão)</option>
                                    <option value="vtt">WebVTT</option>
                                    <option value="ass">ASS (Premiere/DaVinci)</option>
                                    <option value="json">JSON</option>
                                    <option value="txt">Texto Puro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Pausa entre legendas</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={subtitleSettings.pauseBetweenSubtitles}
                                        onChange={(e) => setSubtitleSettings(prev => ({ ...prev, pauseBetweenSubtitles: Number(e.target.value) }))}
                                        className="flex-1 accent-orange-500"
                                    />
                                    <span className="text-zinc-400 text-sm w-10">{subtitleSettings.pauseBetweenSubtitles}s</span>
                                </div>
                            </div>
                        </div>

                        {/* Configurações Avançadas */}
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            <div className="flex items-center gap-2 mb-4">
                                <Sliders className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-medium text-zinc-300">Configurações Avançadas</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Chars/Linha</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="25"
                                            max="60"
                                            step="1"
                                            value={subtitleSettings.maxCharsPerLine}
                                            onChange={(e) => setSubtitleSettings(prev => ({ ...prev, maxCharsPerLine: Number(e.target.value) }))}
                                            className="flex-1 accent-orange-500"
                                        />
                                        <span className="text-zinc-400 text-xs w-6">{subtitleSettings.maxCharsPerLine}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">CPS (Velocidade)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="10"
                                            max="25"
                                            step="1"
                                            value={subtitleSettings.maxCPS}
                                            onChange={(e) => setSubtitleSettings(prev => ({ ...prev, maxCPS: Number(e.target.value) }))}
                                            className="flex-1 accent-orange-500"
                                        />
                                        <span className="text-zinc-400 text-xs w-6">{subtitleSettings.maxCPS}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Duração Mín</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="3"
                                            step="0.1"
                                            value={subtitleSettings.minDuration}
                                            onChange={(e) => setSubtitleSettings(prev => ({ ...prev, minDuration: Number(e.target.value) }))}
                                            className="flex-1 accent-orange-500"
                                        />
                                        <span className="text-zinc-400 text-xs w-8">{subtitleSettings.minDuration}s</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Duração Máx</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="3"
                                            max="15"
                                            step="0.5"
                                            value={subtitleSettings.maxDuration}
                                            onChange={(e) => setSubtitleSettings(prev => ({ ...prev, maxDuration: Number(e.target.value) }))}
                                            className="flex-1 accent-orange-500"
                                        />
                                        <span className="text-zinc-400 text-xs w-8">{subtitleSettings.maxDuration}s</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={generateSubtitles}
                            disabled={isProcessing}
                            className={cn(
                                "flex-1 btn-primary py-4 flex items-center justify-center gap-3 text-lg",
                                isProcessing && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processando... {progress}%
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-5 h-5" />
                                    Gerar Legendas
                                </>
                            )}
                        </button>

                        {generatedSubtitles && (
                            <button
                                onClick={downloadSubtitles}
                                className="px-6 py-4 border border-green-500/30 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Download
                            </button>
                        )}
                    </div>

                    {/* Generated Subtitles Preview */}
                    {generatedSubtitles && (
                        <div className="card animate-slide-up">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <h3 className="font-semibold text-lg">Legendas Geradas</h3>
                            </div>
                            <pre className="bg-zinc-950 p-4 rounded-lg text-sm text-zinc-300 font-mono overflow-x-auto max-h-80 overflow-y-auto">
                                {generatedSubtitles}
                            </pre>
                        </div>
                    )}

                    {/* Processing State */}
                    {isProcessing && (
                        <div className="card animate-fade-in">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 border-4 border-zinc-700 border-t-orange-500 rounded-full animate-spin mx-auto" />
                                <div>
                                    <h3 className="text-xl font-semibold text-white">Gerando Legendas...</h3>
                                    <p className="text-zinc-400">Processando com Whisper local</p>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-sm text-zinc-500">{progress}%</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )

    // Renderizar conteúdo baseado na tela atual
    const renderContent = () => {
        switch (currentScreen) {
            case 'presets':
                return renderPresetsScreen()
            case 'settings':
                return renderSettingsScreen()
            default:
                return renderCreateScreen()
        }
    }

    return (
        <div className="flex h-screen bg-[#09090b] text-zinc-100 relative font-sans">
            {/* CSS para animação do botão dev */}
            <style>{`
        @keyframes pulse-orange {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
            border-color: rgba(249, 115, 22, 1);
          }
          50% { 
            box-shadow: 0 0 0 10px rgba(249, 115, 22, 0);
            border-color: rgba(249, 115, 22, 0.5);
          }
        }
      `}</style>

            {/* Support Modal - Abre automaticamente */}
            {isSupportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full mx-4 animate-fade-in">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Heart className="w-6 h-6 text-red-400" />
                                    <h2 className="text-xl font-bold text-white">Apoie a Torio Tools</h2>
                                </div>
                                <button
                                    onClick={() => setIsSupportModalOpen(false)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-zinc-300 mb-4">
                                Se você gostou do Scribe, considere apoiar nosso trabalho para desenvolver mais ferramentas gratuitas!
                            </p>

                            <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="font-semibold text-white">Contribuição via PIX</h4>
                                        <p className="text-zinc-400 text-sm">Qualquer valor ajuda muito!</p>
                                    </div>
                                    <Coffee className="w-6 h-6 text-orange-500" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <code className="flex-1 bg-zinc-900 px-3 py-2 rounded text-zinc-300 text-sm">
                                        toriotools@gmail.com
                                    </code>
                                    <button
                                        onClick={copyPixKey}
                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2 text-white"
                                    >
                                        {copiedPix ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copiedPix ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800">
                                <button
                                    onClick={() => openExternalLink('https://www.youtube.com/@toriotools')}
                                    className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
                                >
                                    <Play className="w-4 h-4" />
                                    Inscreva-se no YouTube
                                </button>
                                <button
                                    onClick={() => setIsSupportModalOpen(false)}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Developer Modal */}
            {isDevModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto mx-4 animate-fade-in">
                        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Code className="w-6 h-6 text-orange-500" />
                                <h2 className="text-xl font-bold">Torio Tools - Desenvolvedor</h2>
                            </div>
                            <button
                                onClick={() => setIsDevModalOpen(false)}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Sobre */}
                            <div className="card">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-5 h-5 text-orange-500" />
                                    <h3 className="font-semibold text-lg">Sobre o Torio Tools</h3>
                                </div>
                                <p className="text-zinc-300 mb-4">
                                    Torio Tools desenvolve ferramentas profissionais para criadores de conteúdo.
                                    Torio Tools Scribe é nossa solução gratuita para geração de legendas automáticas com Whisper.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['Torio Tools Scribe', 'VIDEO ZIZ Pro', 'AI Powered', 'Whisper Local'].map((tag) => (
                                        <span key={tag} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm border border-orange-500/30">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Direitos */}
                            <div className="card">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="w-5 h-5 text-orange-500" />
                                    <h3 className="font-semibold text-lg">Direitos Autorais & Licença</h3>
                                </div>
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <h4 className="font-semibold text-white mb-1">📜 Termos de Uso</h4>
                                        <p className="text-zinc-400">
                                            Torio Tools Scribe é distribuído gratuitamente para uso pessoal e comercial.
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                                            <h4 className="font-semibold text-white">Combate à Pirataria</h4>
                                        </div>
                                        <p className="text-zinc-400">
                                            A venda ou distribuição não autorizada de nossos produtos constitui violação dos direitos autorais.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Apoie */}
                            <div className="card">
                                <div className="flex items-center gap-2 mb-3">
                                    <Heart className="w-5 h-5 text-red-400" />
                                    <h3 className="font-semibold text-lg">Apoie a Torio Tools</h3>
                                </div>
                                <p className="text-zinc-300 mb-4">
                                    Se você gostou do Scribe, considere apoiar nosso trabalho:
                                </p>
                                <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-white">Contribuição via PIX</h4>
                                            <p className="text-zinc-400 text-sm">Ajude a desenvolver mais ferramentas</p>
                                        </div>
                                        <Coffee className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <code className="flex-1 bg-zinc-900 px-3 py-2 rounded text-zinc-300 text-sm">
                                            toriotools@gmail.com
                                        </code>
                                        <button
                                            onClick={copyPixKey}
                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2 text-white"
                                        >
                                            {copiedPix ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copiedPix ? 'Copiado!' : 'Copiar'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Produtos com carrinho de compras */}
                            <div className="card">
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-5 h-5 text-orange-500" />
                                    <h3 className="font-semibold text-lg">Nossos Produtos</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-zinc-300 text-sm">Torio Tools Scribe</span>
                                        </div>
                                        <span className="text-green-400 text-xs font-bold">GRÁTIS</span>
                                    </div>
                                    <button onClick={() => openExternalLink('https://pay.kiwify.com.br/jXNk3EL')} className="flex items-center justify-between py-2 border-b border-zinc-800 w-full hover:bg-zinc-800/50 rounded transition-colors">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-zinc-300 text-sm">VIDEO ZIZ Pro</span>
                                        </div>
                                        <ShoppingCart className="w-4 h-4 text-orange-400" />
                                    </button>
                                    <button onClick={() => openExternalLink('https://pay.kiwify.com.br/tKClZ43')} className="flex items-center justify-between py-2 border-b border-zinc-800 w-full hover:bg-zinc-800/50 rounded transition-colors">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-zinc-300 text-sm">Torio TTS - Vozes IA</span>
                                        </div>
                                        <ShoppingCart className="w-4 h-4 text-orange-400" />
                                    </button>
                                    <button onClick={() => openExternalLink('https://pay.kiwify.com.br/m3NoniG')} className="flex items-center justify-between py-2 w-full hover:bg-zinc-800/50 rounded transition-colors">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-zinc-300 text-sm">Whisk Automation</span>
                                        </div>
                                        <ShoppingCart className="w-4 h-4 text-orange-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center pt-4 border-t border-zinc-800">
                                <p className="text-zinc-400 text-sm flex items-center justify-center gap-1">
                                    Desenvolvido com <Heart className="w-4 h-4 text-red-400" /> por Torio Tools
                                </p>
                                <div className="flex items-center justify-center gap-4 mt-2">
                                    <button
                                        onClick={() => openExternalLink('https://www.youtube.com/@toriotools')}
                                        className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
                                    >
                                        <Play className="w-3 h-3" />
                                        YouTube
                                    </button>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-zinc-500 text-xs">
                                        v12-2025 • © 2025 Torio Tools
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="Torio Tools Scribe"
                            className="w-14 h-14 rounded-lg shadow-lg shadow-orange-500/20 object-contain bg-zinc-900"
                        />
                        <div>
                            <h1 className="text-xl font-bold text-white">Torio Tools</h1>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 text-sm font-semibold">Scribe</span>
                        </div>
                    </div>
                </div>

                {/* Engine Status */}
                <div className="px-4 py-2">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        engineReady ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            engineReady ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse"
                        )} />
                        {engineReady ? 'Whisper Pronto' : 'Carregando Whisper...'}
                    </div>
                </div>

                {/* Menu (sem Estilos) */}
                <div className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setCurrentScreen('create')}
                        className={cn(
                            "w-full px-3 py-2 rounded-lg font-medium text-left transition-colors",
                            currentScreen === 'create'
                                ? "bg-orange-500/10 border-l-4 border-orange-500 text-orange-400"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        )}
                    >
                        🎬 Criar Legenda
                    </button>
                    <button
                        onClick={() => setCurrentScreen('presets')}
                        className={cn(
                            "w-full px-3 py-2 rounded-lg text-left transition-colors",
                            currentScreen === 'presets'
                                ? "bg-orange-500/10 border-l-4 border-orange-500 text-orange-400"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        )}
                    >
                        ⚡ Presets de Legenda
                    </button>
                    <button
                        onClick={() => setCurrentScreen('settings')}
                        className={cn(
                            "w-full px-3 py-2 rounded-lg text-left transition-colors",
                            currentScreen === 'settings'
                                ? "bg-orange-500/10 border-l-4 border-orange-500 text-orange-400"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        )}
                    >
                        ⚙️ Configurações
                    </button>
                </div>

                {/* Sidebar Product - VIDEO-ZIZ */}
                <div className="p-4 border-t border-zinc-800">
                    <div className="bg-gradient-to-br from-orange-500/15 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">MAIS VENDIDO</span>
                            <div className="flex gap-0.5">
                                {[1, 2, 3].map((i) => (
                                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                ))}
                            </div>
                        </div>
                        <h3 className="text-white text-lg font-bold">{sidebarProduct.title}</h3>
                        <p className="text-orange-400 text-sm font-medium mb-2">{sidebarProduct.subtitle}</p>
                        <p className="text-zinc-400 text-sm mb-4">{sidebarProduct.description}</p>
                        <div className="space-y-2 mb-4">
                            {['Criação em lote de vídeos', 'Legendas automáticas com Whisper', 'Overlays profissionais', 'Renderização em batch'].map((feature) => (
                                <div key={feature} className="flex items-center gap-2 text-zinc-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    {feature}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => openExternalLink(sidebarProduct.link)}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                        >
                            Garantir Acesso
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {renderContent()}

                {/* Banner Carousel - só mostra na tela de criação */}
                {currentScreen === 'create' && (
                    <div className="p-4 border-t border-zinc-800">
                        <div className="max-w-4xl mx-auto">
                            <div className="relative overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
                                <div
                                    className="flex transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                                >
                                    {carouselBanners.map((banner) => (
                                        <div key={banner.id} className="w-full flex-shrink-0 p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                                                        <Zap className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-white">{banner.title}</h4>
                                                        <p className="text-sm text-zinc-400">{banner.description}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => openExternalLink(banner.link)}
                                                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                                                >
                                                    Ver Detalhes
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Dots */}
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                                    {carouselBanners.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentSlide(index)}
                                            className={cn(
                                                "h-1 rounded-full transition-all",
                                                index === currentSlide ? "w-6 bg-orange-500" : "w-1 bg-zinc-600"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
