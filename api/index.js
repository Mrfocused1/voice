const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Initialize Express app
const app = express();

// Serverless environment configuration
const UPLOAD_DIR = '/tmp/uploads';
const GENERATED_DIR = '/tmp/generated';

// Ensure directories exist
[UPLOAD_DIR, GENERATED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// --- OPENAI WHISPER TRANSCRIPTION ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let openai = null;
let whisperAvailable = false;

if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    whisperAvailable = true;
}

// Get file extension from MIME type
function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
        'audio/mpeg': '.mp3',
        'audio/mp3': '.mp3',
        'audio/wav': '.wav',
        'audio/wave': '.wav',
        'audio/x-wav': '.wav',
        'audio/mp4': '.m4a',
        'audio/x-m4a': '.m4a',
        'audio/aac': '.m4a',
        'audio/webm': '.webm',
        'audio/ogg': '.ogg',
        'audio/flac': '.flac',
        'audio/x-flac': '.flac'
    };
    return mimeToExt[mimeType] || '.mp3';
}

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(audioFilePath, mimeType = null) {
    if (!whisperAvailable || !openai) {
        return {
            success: false,
            error: 'Transcription service not configured.'
        };
    }

    try {
        if (!fs.existsSync(audioFilePath)) {
            return { success: false, error: 'Audio file not found' };
        }

        const stats = fs.statSync(audioFilePath);
        if (stats.size > 25 * 1024 * 1024) {
            return { success: false, error: 'Audio file too large (max 25MB)' };
        }

        let fileExtension = path.extname(audioFilePath);
        if (!fileExtension) {
            fileExtension = mimeType ? getExtensionFromMimeType(mimeType) : '.mp3';
        }

        let fileToTranscribe = audioFilePath;
        let tempFileCreated = false;

        if (!path.extname(audioFilePath)) {
            const fileWithExt = audioFilePath + fileExtension;
            fs.copyFileSync(audioFilePath, fileWithExt);
            fileToTranscribe = fileWithExt;
            tempFileCreated = true;
        }

        const audioStream = fs.createReadStream(fileToTranscribe);
        let transcription;

        try {
            transcription = await openai.audio.transcriptions.create({
                file: audioStream,
                model: 'whisper-1',
                language: 'en',
                response_format: 'text'
            });
        } finally {
            if (tempFileCreated && fs.existsSync(fileToTranscribe)) {
                fs.unlinkSync(fileToTranscribe);
            }
        }

        return { success: true, text: transcription };
    } catch (error) {
        return { success: false, error: error.message || 'Transcription failed' };
    }
}

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// Supported audio types
const SUPPORTED_BROWSER_TYPES = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/ogg',
    'audio/flac', 'audio/x-flac'
];

const FISH_AUDIO_NATIVE_FORMATS = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/flac', 'audio/x-flac', 'audio/mp4', 'audio/x-m4a', 'audio/aac'
];

// Configure multer
const upload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isTypeSupported = SUPPORTED_BROWSER_TYPES.includes(file.mimetype);
        const extMatch = file.originalname.match(/\.(mp3|wav|m4a|mp4|webm|ogg|flac|aac)$/i);
        if (isTypeSupported || extMatch) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported audio format: ${file.mimetype}`));
        }
    }
});

// Fish Audio API Configuration
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_BASE_URL = 'https://api.fish.audio';

// Helper function for Fish Audio API requests
async function fishAudioRequest(endpoint, method = 'GET', data = null, isFormData = false) {
    let fullUrl;
    if (endpoint.startsWith('/model') && !endpoint.startsWith('/models')) {
        fullUrl = `${FISH_AUDIO_BASE_URL}${endpoint}`;
    } else if (endpoint === '/tts') {
        fullUrl = `${FISH_AUDIO_BASE_URL}/v1${endpoint}`;
    } else {
        fullUrl = `${FISH_AUDIO_BASE_URL}/v1${endpoint}`;
    }

    const config = {
        method,
        url: fullUrl,
        headers: {
            'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' })
        }
    };

    if (data) {
        if (isFormData) {
            config.data = data;
            config.headers = { ...config.headers, ...data.getHeaders() };
        } else {
            config.data = data;
        }
    }

    const response = await axios(config);
    return response.data;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Culture Voices API is running',
        environment: 'serverless',
        capabilities: {
            whisperAvailable,
            supportedFormats: SUPPORTED_BROWSER_TYPES
        }
    });
});

// Capabilities endpoint
app.get('/api/capabilities', (req, res) => {
    res.json({
        server: {
            version: '1.0.0',
            platform: 'vercel-serverless',
            nodeVersion: process.version
        },
        audio: {
            ffmpegAvailable: false,
            supportedBrowserFormats: SUPPORTED_BROWSER_TYPES,
            fishAudioNativeFormats: FISH_AUDIO_NATIVE_FORMATS,
            conversionEnabled: false,
            recommendation: 'Use MP3 or WAV format for best compatibility'
        },
        transcription: {
            whisperAvailable,
            service: 'OpenAI Whisper',
            maxFileSize: '25MB'
        },
        api: {
            fishAudioConfigured: !!FISH_AUDIO_API_KEY,
            openaiConfigured: whisperAvailable
        }
    });
});

// Transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    let filesToCleanup = [];

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        filesToCleanup.push(req.file.path);

        if (!whisperAvailable) {
            return res.status(503).json({
                success: false,
                error: 'Transcription service not available'
            });
        }

        const transcriptionResult = await transcribeAudio(req.file.path, req.file.mimetype);

        // Cleanup
        filesToCleanup.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        if (transcriptionResult.success) {
            res.json({
                success: true,
                text: transcriptionResult.text,
                characterCount: transcriptionResult.text.length
            });
        } else {
            res.status(400).json({
                success: false,
                error: transcriptionResult.error
            });
        }
    } catch (error) {
        filesToCleanup.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
            }
        });
        res.status(500).json({
            success: false,
            error: 'Transcription failed',
            details: error.message
        });
    }
});

// Upload voice sample
app.post('/api/voice/upload', upload.single('audio'), async (req, res) => {
    let filesToCleanup = [];

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        filesToCleanup.push(req.file.path);

        const voiceName = req.body.name || `Voice Clone ${Date.now()}`;
        let audioFilePath = req.file.path;
        let audioMimeType = req.file.mimetype;
        let audioFilename = req.file.originalname;

        const formData = new FormData();
        formData.append('type', 'tts');
        formData.append('title', voiceName);
        formData.append('train_mode', 'fast');
        formData.append('visibility', 'private');
        formData.append('description', 'Voice clone created via Culture Voices');
        formData.append('enhance_audio_quality', 'true');
        formData.append('tags', 'voxmod');
        formData.append('tags', 'clone');

        formData.append('voices', fs.createReadStream(audioFilePath), {
            filename: audioFilename,
            contentType: audioMimeType
        });

        // Handle transcription
        let transcriptionText = req.body.text || '';
        let transcriptionSource = 'none';

        if (!transcriptionText && whisperAvailable && req.body.autoTranscribe !== 'false') {
            const autoResult = await transcribeAudio(audioFilePath, audioMimeType);
            if (autoResult.success) {
                transcriptionText = autoResult.text;
                transcriptionSource = 'auto';
            }
        } else if (transcriptionText) {
            transcriptionSource = 'user';
        }

        if (transcriptionText) {
            const MAX_LENGTH = 500;
            if (transcriptionText.length > MAX_LENGTH) {
                transcriptionText = transcriptionText.substring(0, MAX_LENGTH);
            }
            formData.append('texts', transcriptionText);
        }

        const createModelResponse = await fishAudioRequest('/model', 'POST', formData, true);
        const modelId = createModelResponse._id || createModelResponse.id;

        // Cleanup
        filesToCleanup.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        res.json({
            success: true,
            modelId: modelId,
            message: 'Voice uploaded and model created successfully',
            transcription: {
                source: transcriptionSource,
                text: transcriptionText || null
            }
        });

    } catch (error) {
        filesToCleanup.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
            }
        });

        res.status(500).json({
            error: 'Failed to upload voice',
            details: error.response?.data || error.message
        });
    }
});

// Generate speech
app.post('/api/voice/generate', async (req, res) => {
    try {
        const { modelId, text } = req.body;

        if (!modelId || !text) {
            return res.status(400).json({ error: 'Missing modelId or text' });
        }

        const response = await axios({
            method: 'POST',
            url: `${FISH_AUDIO_BASE_URL}/v1/tts`,
            headers: {
                'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
                'Content-Type': 'application/json',
                'model': 's1'
            },
            data: {
                reference_id: modelId,
                text: text,
                format: 'mp3',
                temperature: 0.5,
                top_p: 0.6,
                chunk_length: 250,
                normalize: true,
                latency: 'normal',
                repetition_penalty: 1.2,
                mp3_bitrate: 192,
                speed: 1.0,
                volume: 0
            },
            responseType: 'arraybuffer'
        });

        // Return audio directly as base64 (serverless can't serve static files)
        const audioBase64 = Buffer.from(response.data).toString('base64');

        res.json({
            success: true,
            audio: audioBase64,
            audioUrl: `data:audio/mp3;base64,${audioBase64}`,
            message: 'Speech generated successfully'
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate speech',
            details: error.response?.data || error.message
        });
    }
});

// Get voices list
app.get('/api/voices', async (req, res) => {
    try {
        const response = await axios({
            method: 'GET',
            url: `${FISH_AUDIO_BASE_URL}/model`,
            headers: {
                'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`
            },
            params: {
                page_size: 100,
                self: true
            }
        });
        res.json({ success: true, voices: response.data.items || response.data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch voices', details: error.response?.data });
    }
});

// Delete voice
app.delete('/api/voice/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        await axios({
            method: 'DELETE',
            url: `${FISH_AUDIO_BASE_URL}/model/${modelId}`,
            headers: {
                'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`
            }
        });
        res.json({ success: true, message: 'Voice model deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete voice model', details: error.response?.data });
    }
});

// Quality presets
app.get('/api/voice/presets', (req, res) => {
    res.json({
        presets: {
            consistent: { temperature: 0.4, top_p: 0.5 },
            balanced: { temperature: 0.6, top_p: 0.7 },
            expressive: { temperature: 0.8, top_p: 0.85 }
        },
        currentDefaults: {
            temperature: 0.5,
            top_p: 0.6,
            chunk_length: 250,
            normalize: true
        }
    });
});

// Auth signup (placeholder)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, type } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        res.json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: Date.now().toString(),
                name,
                email,
                type,
                createdAt: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Waitlist
app.post('/api/waitlist', async (req, res) => {
    try {
        const { email, type } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // In serverless, we can't write to the filesystem persistently
        // This should be stored in a database in production
        console.log('Waitlist signup:', { email, type, timestamp: new Date().toISOString() });

        res.json({
            success: true,
            message: 'Successfully joined waitlist'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to join waitlist' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Export the Express app for Vercel
module.exports = app;
