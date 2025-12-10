# Torio Tools Scribe

🎬 **Gerador de Legendas Automáticas com Whisper Local**

Aplicação desktop gratuita para transcrição de áudio/vídeo usando IA (Whisper) offline.

## ✨ Recursos

- 🎤 **Transcrição Offline** - Whisper rodando localmente, sem internet
- 🌍 **Multi-idioma** - PT-BR, EN, ES, FR, DE, e mais
- 📝 **Formatos de Saída** - SRT, WebVTT
- ⚙️ **Configurável** - Controle de caracteres, linhas, duração
- 🎨 **Interface Premium** - Design dark moderno com Space Grotesk

## 🚀 Como Rodar

### Pré-requisitos

- Node.js 18+
- Python 3.10+
- pip

### Instalação

```bash
# 1. Instalar dependências Electron
npm install

# 2. Instalar dependências do renderer
cd renderer
npm install
cd ..

# 3. Instalar dependências Python
cd engine
pip install -r requirements.txt
cd ..

# 4. Rodar em modo desenvolvimento
npm run dev
```

### Build para Distribuição

```bash
# Gerar .exe Windows
npm run dist:win
```

## 📁 Estrutura

```
torio-tools-scribe/
├── main.js              # Electron main process
├── preload.js           # IPC bridge
├── package.json         # Electron config
├── renderer/            # React UI
│   ├── src/
│   │   ├── App.tsx      # Componente principal
│   │   └── styles/      # CSS global
├── engine/              # Python backend
│   ├── main.py          # Flask server
│   └── transcriber.py   # Whisper integration
├── models/              # Whisper models
└── assets/              # Icons e banners
```

## 🛠️ Tecnologias

- **Electron** - Desktop framework
- **React** + TypeScript + Vite
- **Tailwind CSS** - Estilização
- **Python** + Flask - Backend
- **Faster-Whisper** - Transcrição IA

## 🎨 Paleta de Cores

- **Lajanta (Magenta)**: `#E10098`
- **Background**: `#09090b`
- **Card**: `#18181b`
- **Border**: `#27272a`

## 👨‍💻 Desenvolvido por

**Torio Tools** - Ferramentas profissionais para criadores de conteúdo

- 🎥 [YouTube](https://www.youtube.com/@toriotools)
- 📧 toriotools@gmail.com

---

© 2024 Torio Tools. Todos os direitos reservados.
