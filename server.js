const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const OpenAI = require('openai');
require('dotenv').config();

// --- OPENAI WHISPER TRANSCRIPTION ---
// Initialize OpenAI client for Whisper transcription
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let openai = null;
let whisperAvailable = false;

if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    whisperAvailable = true;
    console.log('OpenAI Whisper transcription is available');
} else {
    console.log('OpenAI API key not configured - automatic transcription disabled');
    console.log('To enable transcription, add OPENAI_API_KEY to your .env file');
}

/**
 * Get file extension from MIME type for transcription
 * @param {string} mimeType - The MIME type of the audio file
 * @returns {string} - File extension with dot (e.g., '.mp3')
 */
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
    return mimeToExt[mimeType] || '.mp3'; // Default to .mp3
}

/**
 * Transcribe audio file using OpenAI Whisper API
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} [mimeType] - Optional MIME type to help determine file extension
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function transcribeAudio(audioFilePath, mimeType = null) {
    if (!whisperAvailable || !openai) {
        return {
            success: false,
            error: 'Transcription service not configured. Add OPENAI_API_KEY to enable.'
        };
    }

    try {
        console.log('Starting transcription with OpenAI Whisper...');
        console.log('Audio file:', audioFilePath);

        // Check if file exists
        if (!fs.existsSync(audioFilePath)) {
            return {
                success: false,
                error: 'Audio file not found'
            };
        }

        // Get file stats for logging
        const stats = fs.statSync(audioFilePath);
        console.log('File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

        // Whisper API has a 25MB file size limit
        if (stats.size > 25 * 1024 * 1024) {
            return {
                success: false,
                error: 'Audio file too large for transcription (max 25MB)'
            };
        }

        // OpenAI Whisper API requires a file with proper extension
        // Multer saves files without extensions, so we need to rename or provide a filename
        // Determine the proper extension based on original filename or mime type
        let fileExtension = path.extname(audioFilePath);

        // If the file has no extension (multer uploads), determine from MIME type
        if (!fileExtension) {
            fileExtension = mimeType ? getExtensionFromMimeType(mimeType) : '.mp3';
            console.log('Determined file extension from MIME type:', fileExtension, '(MIME:', mimeType || 'unknown', ')');
        }

        // Create a temporary copy with the proper extension if needed
        let fileToTranscribe = audioFilePath;
        let tempFileCreated = false;

        if (!path.extname(audioFilePath)) {
            // Rename the file to include extension
            const fileWithExt = audioFilePath + fileExtension;
            fs.copyFileSync(audioFilePath, fileWithExt);
            fileToTranscribe = fileWithExt;
            tempFileCreated = true;
            console.log('Created temp file with extension:', fileWithExt);
        }

        // Create file stream for OpenAI API
        const audioStream = fs.createReadStream(fileToTranscribe);

        // Call OpenAI Whisper API
        let transcription;
        try {
            transcription = await openai.audio.transcriptions.create({
                file: audioStream,
                model: 'whisper-1',
                language: 'en', // Can be made dynamic based on user preference
                response_format: 'text'
            });
        } finally {
            // Clean up temp file if we created one
            if (tempFileCreated && fs.existsSync(fileToTranscribe)) {
                fs.unlinkSync(fileToTranscribe);
                console.log('Cleaned up temp transcription file:', fileToTranscribe);
            }
        }

        console.log('Transcription successful!');
        console.log('Transcribed text length:', transcription.length, 'characters');
        console.log('Transcription preview:', transcription.substring(0, 100) + (transcription.length > 100 ? '...' : ''));

        return {
            success: true,
            text: transcription
        };

    } catch (error) {
        console.error('Transcription error:', error.message);

        // Handle specific OpenAI errors
        if (error.code === 'invalid_api_key') {
            return {
                success: false,
                error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY.'
            };
        } else if (error.code === 'insufficient_quota') {
            return {
                success: false,
                error: 'OpenAI API quota exceeded. Please check your billing.'
            };
        } else if (error.message?.includes('audio')) {
            return {
                success: false,
                error: 'Audio format not supported for transcription. Try converting to WAV or MP3.'
            };
        }

        return {
            success: false,
            error: error.message || 'Transcription failed'
        };
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from root

// --- AUDIO FORMAT COMPATIBILITY ---
// Fish Audio API accepts: WAV, MP3, FLAC, M4A
// Browser recordings may produce: WebM, OGG, M4A, MP4
// This section handles format detection and conversion

// Supported audio MIME types for upload (browser recordings)
const SUPPORTED_BROWSER_TYPES = [
    'audio/mpeg',           // MP3
    'audio/mp3',            // MP3 (alternative)
    'audio/wav',            // WAV
    'audio/wave',           // WAV (alternative)
    'audio/x-wav',          // WAV (alternative)
    'audio/x-m4a',          // M4A
    'audio/mp4',            // M4A/MP4 (Safari recording format)
    'audio/aac',            // AAC
    'audio/webm',           // WebM (Chrome/Firefox recording format)
    'audio/ogg',            // OGG (Firefox)
    'audio/flac',           // FLAC
    'audio/x-flac'          // FLAC (alternative)
];

// Formats that Fish Audio API accepts directly (no conversion needed)
const FISH_AUDIO_NATIVE_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/flac', 'audio/x-flac', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];

// Formats that need conversion before sending to Fish Audio
const FORMATS_NEEDING_CONVERSION = ['audio/webm', 'audio/ogg'];

// Check if FFmpeg is available for audio conversion
let ffmpegAvailable = false;
async function checkFFmpeg() {
    try {
        await execPromise('ffmpeg -version');
        ffmpegAvailable = true;
        console.log('FFmpeg is available for audio conversion');
    } catch (e) {
        ffmpegAvailable = false;
        console.log('FFmpeg not found - audio conversion disabled');
        console.log('To enable WebM/OGG conversion, install FFmpeg:');
        console.log('  macOS: brew install ffmpeg');
        console.log('  Ubuntu: sudo apt install ffmpeg');
        console.log('  Windows: Download from https://ffmpeg.org/download.html');
    }
}
checkFFmpeg();

// Convert audio file to WAV format (for Fish Audio API compatibility)
async function convertToWav(inputPath, originalMimeType) {
    if (!ffmpegAvailable) {
        console.log('FFmpeg not available, skipping conversion');
        return null;
    }

    const outputPath = inputPath + '.wav';

    try {
        console.log(`Converting ${originalMimeType} to WAV...`);

        // FFmpeg command for audio conversion with enhanced quality
        // -y: overwrite output file
        // -i: input file
        // -vn: no video
        // -acodec pcm_s24le: 24-bit PCM WAV (higher quality than 16-bit)
        // -ar 48000: 48kHz sample rate (Fish Audio best practice)
        // -ac 1: mono channel (sufficient for voice cloning)
        // -af filters: highpass (remove rumble <80Hz), lowpass (remove noise >12kHz), noise reduction
        const command = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s24le -ar 48000 -ac 1 -af "highpass=f=80,lowpass=f=12000,afftdn=nf=-25" "${outputPath}"`;
        console.log('FFmpeg command with quality filters:', command);

        await execPromise(command);

        // Verify the output file exists
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`Conversion successful: ${outputPath} (${(stats.size / 1024).toFixed(2)} KB)`);
            return outputPath;
        } else {
            console.error('Conversion failed: output file not created');
            return null;
        }
    } catch (error) {
        console.error('Audio conversion error:', error.message);
        return null;
    }
}

// Determine the best file extension based on MIME type
function getFileExtension(mimeType) {
    const mimeToExt = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/wave': 'wav',
        'audio/x-wav': 'wav',
        'audio/mp4': 'm4a',
        'audio/x-m4a': 'm4a',
        'audio/aac': 'aac',
        'audio/webm': 'webm',
        'audio/ogg': 'ogg',
        'audio/flac': 'flac',
        'audio/x-flac': 'flac'
    };
    return mimeToExt[mimeType] || 'audio';
}

// Configure multer for file uploads with enhanced format support
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log('Received file upload:');
        console.log('  Original name:', file.originalname);
        console.log('  MIME type:', file.mimetype);

        // Check if the MIME type is supported
        const isTypeSupported = SUPPORTED_BROWSER_TYPES.includes(file.mimetype);

        // Also check file extension as a fallback (some browsers may send incorrect MIME types)
        const extMatch = file.originalname.match(/\.(mp3|wav|m4a|mp4|webm|ogg|flac|aac)$/i);

        if (isTypeSupported || extMatch) {
            console.log('  Status: Accepted');
            cb(null, true);
        } else {
            console.log('  Status: Rejected (unsupported format)');
            cb(new Error(`Unsupported audio format: ${file.mimetype}. Supported formats: MP3, WAV, M4A, WebM, OGG, FLAC`));
        }
    }
});

// Fish Audio API Configuration
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || 'f0187c88fab24e60bfe3bb6aa4002083';
const FISH_AUDIO_BASE_URL = 'https://api.fish.audio';
// Note: Different endpoints use different base paths:
// - Model creation: POST https://api.fish.audio/model (no /v1)
// - TTS: POST https://api.fish.audio/v1/tts (with /v1)

// Helper function to make Fish Audio API requests
// Note: Fish Audio API uses different base paths for different endpoints
async function fishAudioRequest(endpoint, method = 'GET', data = null, isFormData = false) {
    // Determine the full URL - some endpoints don't use /v1 prefix
    let fullUrl;
    if (endpoint.startsWith('/model') && !endpoint.startsWith('/models')) {
        // Model creation/update endpoints don't use /v1 prefix
        fullUrl = `${FISH_AUDIO_BASE_URL}${endpoint}`;
    } else if (endpoint === '/tts') {
        // TTS endpoint uses /v1 prefix
        fullUrl = `${FISH_AUDIO_BASE_URL}/v1${endpoint}`;
    } else {
        // Other endpoints - try with /v1 first
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
            config.headers = {
                ...config.headers,
                ...data.getHeaders()
            };
        } else {
            config.data = data;
        }
    }

    console.log(`Fish Audio API Request: ${method} ${fullUrl}`);

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error('Fish Audio API Error:', error.response?.status, error.response?.data || error.message);
        throw error;
    }
}

// Routes

// Health check with capability info
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Culture Voices API is running',
        capabilities: {
            ffmpegAvailable,
            whisperAvailable,
            supportedFormats: SUPPORTED_BROWSER_TYPES,
            nativeFormats: FISH_AUDIO_NATIVE_FORMATS,
            conversionFormats: FORMATS_NEEDING_CONVERSION
        }
    });
});

// Endpoint to check server capabilities (useful for debugging)
app.get('/api/capabilities', (req, res) => {
    res.json({
        server: {
            version: '1.0.0',
            platform: process.platform,
            nodeVersion: process.version
        },
        audio: {
            ffmpegAvailable,
            supportedBrowserFormats: SUPPORTED_BROWSER_TYPES,
            fishAudioNativeFormats: FISH_AUDIO_NATIVE_FORMATS,
            formatsNeedingConversion: FORMATS_NEEDING_CONVERSION,
            conversionEnabled: ffmpegAvailable,
            recommendation: ffmpegAvailable
                ? 'All audio formats supported with automatic conversion'
                : 'Install FFmpeg for WebM/OGG conversion support. Safari and Chrome recordings work best.'
        },
        transcription: {
            whisperAvailable,
            service: 'OpenAI Whisper',
            maxFileSize: '25MB',
            supportedFormats: ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac'],
            recommendation: whisperAvailable
                ? 'Automatic transcription enabled - improves voice cloning quality'
                : 'Add OPENAI_API_KEY to .env to enable automatic transcription'
        },
        api: {
            fishAudioConfigured: !!FISH_AUDIO_API_KEY,
            fishAudioBaseUrl: FISH_AUDIO_BASE_URL,
            openaiConfigured: whisperAvailable,
            endpoints: {
                modelCreate: `${FISH_AUDIO_BASE_URL}/model`,
                modelList: `${FISH_AUDIO_BASE_URL}/model`,
                tts: `${FISH_AUDIO_BASE_URL}/v1/tts`,
                transcribe: '/api/transcribe'
            }
        }
    });
});

// Standalone transcription endpoint
// POST /api/transcribe - Transcribe an audio file without creating a voice model
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    let filesToCleanup = [];

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('=== Transcription Request ===');
        console.log('File:', req.file.originalname);
        console.log('MIME type:', req.file.mimetype);
        console.log('Size:', (req.file.size / 1024).toFixed(2), 'KB');

        filesToCleanup.push(req.file.path);

        // Check if transcription is available
        if (!whisperAvailable) {
            return res.status(503).json({
                success: false,
                error: 'Transcription service not available',
                message: 'Add OPENAI_API_KEY to .env to enable automatic transcription'
            });
        }

        let audioFilePath = req.file.path;

        // Convert audio if needed (Whisper supports most formats but WAV is reliable)
        const needsConversion = FORMATS_NEEDING_CONVERSION.includes(req.file.mimetype);
        if (needsConversion && ffmpegAvailable) {
            console.log('Converting audio format for transcription...');
            const convertedPath = await convertToWav(req.file.path, req.file.mimetype);
            if (convertedPath) {
                audioFilePath = convertedPath;
                filesToCleanup.push(convertedPath);
            }
        }

        // Transcribe the audio - pass MIME type for proper file extension detection
        // If audio was converted, it's now WAV; otherwise use original MIME type
        const transcribeMimeType = needsConversion && audioFilePath.endsWith('.wav') ? 'audio/wav' : req.file.mimetype;
        const transcriptionResult = await transcribeAudio(audioFilePath, transcribeMimeType);

        // Clean up temporary files
        filesToCleanup.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Cleaned up:', filePath);
            }
        });

        if (transcriptionResult.success) {
            console.log('=== Transcription Complete ===');
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
        console.error('Transcription endpoint error:', error);

        // Clean up files on error
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

// Upload voice sample and create voice model
// Handles cross-browser audio formats and converts if necessary for Fish Audio API
app.post('/api/voice/upload', upload.single('audio'), async (req, res) => {
    let filesToCleanup = [];

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('=== Voice Upload Request ===');
        console.log('Original file:', req.file.originalname);
        console.log('MIME type:', req.file.mimetype);
        console.log('Size:', (req.file.size / 1024).toFixed(2), 'KB');
        console.log('Temp path:', req.file.path);

        filesToCleanup.push(req.file.path);

        const voiceName = req.body.name || `Voice Clone ${Date.now()}`;

        // Determine if we need to convert the audio format
        let audioFilePath = req.file.path;
        let audioMimeType = req.file.mimetype;
        let audioFilename = req.file.originalname;

        // Check if the format needs conversion for Fish Audio API
        const needsConversion = FORMATS_NEEDING_CONVERSION.includes(req.file.mimetype);

        if (needsConversion) {
            console.log('Audio format needs conversion for Fish Audio API compatibility');

            if (ffmpegAvailable) {
                // Convert WebM/OGG to WAV
                const convertedPath = await convertToWav(req.file.path, req.file.mimetype);

                if (convertedPath) {
                    audioFilePath = convertedPath;
                    audioMimeType = 'audio/wav';
                    audioFilename = audioFilename.replace(/\.(webm|ogg)$/i, '.wav');
                    filesToCleanup.push(convertedPath);
                    console.log('Using converted WAV file');
                } else {
                    console.log('Conversion failed, attempting upload with original format');
                    // Fish Audio might still accept it - let's try
                }
            } else {
                console.log('FFmpeg not available, attempting upload with original format');
                console.log('Note: Install FFmpeg for automatic format conversion');
                // Fish Audio API may still accept the file - some formats work
            }
        }

        // Create voice model with audio in a single request
        // Fish Audio API endpoint: POST https://api.fish.audio/model
        // Requires multipart/form-data with: type, title, train_mode, voices (audio files)
        console.log('Creating voice model with audio sample...');

        const formData = new FormData();

        // Required fields for model creation
        formData.append('type', 'tts');  // Required: must be 'tts'
        formData.append('title', voiceName);  // Required: model title
        formData.append('train_mode', 'fast');  // Required: must be 'fast' (only accepted value)
        formData.append('visibility', 'private');  // Optional: 'public', 'unlist', or 'private'
        formData.append('description', 'Voice clone created via Culture Voices');
        formData.append('enhance_audio_quality', 'true');  // Optional: enhance audio quality

        // Add tags as separate form fields (Fish Audio expects array format)
        formData.append('tags', 'voxmod');
        formData.append('tags', 'clone');

        // Add the voice audio file - this is the key field for voice cloning
        formData.append('voices', fs.createReadStream(audioFilePath), {
            filename: audioFilename,
            contentType: audioMimeType
        });

        // --- TRANSCRIPTION HANDLING ---
        // This is a key quality improvement - transcription helps the model understand speech patterns
        let transcriptionText = req.body.text || '';
        let transcriptionSource = 'none';
        let autoTranscriptionResult = null;

        // If no transcription provided by user, try automatic transcription
        if (!transcriptionText && whisperAvailable && req.body.autoTranscribe !== 'false') {
            console.log('No user transcription provided, attempting automatic transcription...');
            // Pass the MIME type to help determine file extension for OpenAI API
            autoTranscriptionResult = await transcribeAudio(audioFilePath, audioMimeType);

            if (autoTranscriptionResult.success) {
                transcriptionText = autoTranscriptionResult.text;
                transcriptionSource = 'auto';
                console.log('Automatic transcription successful!');
            } else {
                console.log('Automatic transcription failed:', autoTranscriptionResult.error);
                console.log('Continuing without transcription...');
                transcriptionSource = 'failed';
            }
        } else if (transcriptionText) {
            transcriptionSource = 'user';
        }

        // Add transcription to FormData if we have it
        if (transcriptionText) {
            // Fish Audio has a character limit for transcription - truncate if necessary
            const MAX_TRANSCRIPTION_LENGTH = 500;
            if (transcriptionText.length > MAX_TRANSCRIPTION_LENGTH) {
                console.log(`Transcription too long (${transcriptionText.length} chars), truncating to ${MAX_TRANSCRIPTION_LENGTH} chars`);
                transcriptionText = transcriptionText.substring(0, MAX_TRANSCRIPTION_LENGTH);
            }

            formData.append('texts', transcriptionText);
            console.log(`Transcription (${transcriptionSource}) included for improved training accuracy`);
            console.log('Transcription length:', transcriptionText.length, 'characters');
            console.log('Preview:', transcriptionText.substring(0, 100) + (transcriptionText.length > 100 ? '...' : ''));
        } else {
            console.log('No transcription available (optional but recommended for better quality)');
        }

        const createModelResponse = await fishAudioRequest('/model', 'POST', formData, true);

        // Fish Audio returns _id for the model ID
        const modelId = createModelResponse._id || createModelResponse.id;
        console.log('Voice model created successfully:', modelId);
        console.log('Model state:', createModelResponse.state || 'unknown');
        console.log('=== Upload Complete ===');

        // Clean up all temporary files
        filesToCleanup.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Cleaned up:', filePath);
            }
        });

        res.json({
            success: true,
            modelId: modelId,
            message: 'Voice uploaded and model created successfully',
            formatInfo: {
                originalFormat: req.file.mimetype,
                uploadedFormat: audioMimeType,
                converted: needsConversion && audioMimeType !== req.file.mimetype
            },
            transcription: {
                source: transcriptionSource,
                text: transcriptionText || null,
                characterCount: transcriptionText ? transcriptionText.length : 0,
                autoTranscriptionAvailable: whisperAvailable,
                error: autoTranscriptionResult?.error || null
            }
        });

    } catch (error) {
        console.error('Upload error:', error);

        // Clean up all temporary files
        filesToCleanup.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (e) {
                    console.error('Cleanup error:', e);
                }
            }
        });

        // Provide helpful error messages for format issues
        let errorMessage = 'Failed to upload voice';
        let errorDetails = error.response?.data || error.message;

        if (error.response?.status === 400 || error.response?.status === 415) {
            errorMessage = 'Audio format not accepted by Fish Audio';
            errorDetails = `The audio format (${req.file?.mimetype}) may not be supported. Try recording in a different browser or uploading an MP3/WAV file.`;

            if (!ffmpegAvailable) {
                errorDetails += ' Install FFmpeg on the server to enable automatic format conversion.';
            }
        }

        res.status(500).json({
            error: errorMessage,
            details: errorDetails,
            suggestion: 'Try uploading an MP3 or WAV file, or record using Chrome browser.'
        });
    }
});

// Generate speech from cloned voice
app.post('/api/voice/generate', async (req, res) => {
    try {
        const { modelId, text } = req.body;

        if (!modelId || !text) {
            return res.status(400).json({ error: 'Missing modelId or text' });
        }

        console.log('Generating speech...');
        console.log('Model ID:', modelId);
        console.log('Text:', text);

        // Generate speech using Fish Audio TTS API
        // Endpoint: POST https://api.fish.audio/v1/tts
        // IMPROVED: Using Fish Audio best practices for higher quality output
        console.log('TTS generation with quality parameters:');
        console.log('  temperature: 0.5 (lower for better consistency)');
        console.log('  top_p: 0.6 (focused sampling)');
        console.log('  chunk_length: 250');
        console.log('  normalize: true');
        console.log('  repetition_penalty: 1.2');
        console.log('  mp3_bitrate: 192');

        const response = await axios({
            method: 'POST',
            url: `${FISH_AUDIO_BASE_URL}/v1/tts`,
            headers: {
                'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
                'Content-Type': 'application/json',
                'model': 's1'  // Recommended model: s1, speech-1.6, or speech-1.5
            },
            data: {
                reference_id: modelId,
                text: text,
                format: 'mp3',

                // IMPROVED: Lower temperature for better consistency with original voice
                temperature: 0.5,  // Changed from 0.7 - more consistent output
                top_p: 0.6,       // Changed from 0.7 - more focused sampling

                // ADDED: New quality parameters for Fish Audio best practices
                chunk_length: 250,       // Optimal chunk size for natural speech
                normalize: true,         // Normalize audio levels
                latency: 'normal',       // Normal latency for best quality
                repetition_penalty: 1.2, // Reduce repetitive patterns
                mp3_bitrate: 192,        // Higher bitrate for better audio quality

                // Existing parameters
                speed: 1.0,  // Range: 0.5-2.0
                volume: 0    // Range: -20 to 20
            },
            responseType: 'arraybuffer'
        });

        // Save audio file
        const outputDir = path.join(__dirname, 'generated');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const filename = `voice-${Date.now()}.mp3`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, response.data);

        console.log('Speech generated successfully:', filename);

        res.json({
            success: true,
            audioUrl: `/generated/${filename}`,
            message: 'Speech generated successfully'
        });

    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({
            error: 'Failed to generate speech',
            details: error.response?.data || error.message
        });
    }
});

// Serve generated audio files
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// Get list of available voices (user's models)
// Endpoint: GET https://api.fish.audio/model
app.get('/api/voices', async (req, res) => {
    try {
        // Fish Audio uses /model (singular) for listing user's models
        const response = await axios({
            method: 'GET',
            url: `${FISH_AUDIO_BASE_URL}/model`,
            headers: {
                'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`
            },
            params: {
                page_size: 100,  // Number of models to fetch
                self: true  // Only fetch user's own models
            }
        });
        res.json({ success: true, voices: response.data.items || response.data });
    } catch (error) {
        console.error('Error fetching voices:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch voices', details: error.response?.data });
    }
});

// Delete a voice model
// Endpoint: DELETE https://api.fish.audio/model/{model_id}
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
        console.error('Error deleting voice:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to delete voice model', details: error.response?.data });
    }
});

// Quality presets and recording guidelines endpoint
// Returns recommended settings for different use cases
app.get('/api/voice/presets', (req, res) => {
    console.log('Quality presets requested');
    res.json({
        presets: {
            consistent: {
                temperature: 0.4,
                top_p: 0.5,
                description: 'Most consistent with original voice'
            },
            balanced: {
                temperature: 0.6,
                top_p: 0.7,
                description: 'Balance of consistency and variation'
            },
            expressive: {
                temperature: 0.8,
                top_p: 0.85,
                description: 'More expressive and natural'
            }
        },
        recordingGuidelines: {
            duration: '30-45 seconds per sample',
            sampleRate: '44.1kHz or 48kHz',
            environment: 'Quiet room, no echo or background noise',
            content: 'Natural speech with varied intonation',
            tips: [
                'Speak at your natural pace',
                'Include varied emotions and expressions',
                'Avoid background music or noise',
                'Use a quality microphone if available',
                'Multiple samples improve quality (future feature)'
            ]
        },
        currentDefaults: {
            temperature: 0.5,
            top_p: 0.6,
            chunk_length: 250,
            normalize: true,
            latency: 'normal',
            repetition_penalty: 1.2,
            mp3_bitrate: 192
        }
    });
});

// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, type } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // In production, you would:
        // 1. Hash the password (use bcrypt)
        // 2. Check if email already exists
        // 3. Save to database
        // 4. Send verification email
        // 5. Create session/JWT token

        console.log('New user signup:', {
            name,
            email,
            type,
            timestamp: new Date()
        });

        // For now, return success with mock user data
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
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Waitlist endpoint
app.post('/api/waitlist', async (req, res) => {
    try {
        const { email, type } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // In production, save to database
        console.log('New waitlist signup:', { email, type, timestamp: new Date() });

        // For now, just log it
        const waitlistEntry = {
            email,
            type,
            timestamp: new Date().toISOString()
        };

        // Save to file (in production, use a database)
        const waitlistFile = path.join(__dirname, 'waitlist.json');
        let waitlist = [];

        if (fs.existsSync(waitlistFile)) {
            waitlist = JSON.parse(fs.readFileSync(waitlistFile, 'utf8'));
        }

        waitlist.push(waitlistEntry);
        fs.writeFileSync(waitlistFile, JSON.stringify(waitlist, null, 2));

        res.json({
            success: true,
            message: 'Successfully joined waitlist'
        });

    } catch (error) {
        console.error('Waitlist error:', error);
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

// Create necessary directories
const dirs = ['uploads', 'generated'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Culture Voices server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${__dirname}`);
    console.log(`🎤 Fish Audio API ${FISH_AUDIO_API_KEY ? 'configured' : 'NOT configured'}`);

    if (!FISH_AUDIO_API_KEY) {
        console.warn('⚠️  WARNING: FISH_AUDIO_API_KEY not found in environment variables');
        console.warn('   Please create a .env file with your Fish Audio API key');
    }
});
