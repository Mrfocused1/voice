# Fish Audio API Integration Guide

This document explains how the Fish Audio API is integrated into VoxMod.

## Overview

Fish Audio provides state-of-the-art voice cloning and text-to-speech capabilities. This project uses their API to:

1. Create custom voice models from audio samples
2. Generate speech using cloned voices
3. Export audio in various formats

## API Endpoints Used

### Base URL
```
https://api.fish.audio/v1
```

### Authentication
All requests require an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Workflow

### 1. Create Voice Model

**Endpoint**: `POST /v1/models`

Creates a new voice model that will store your voice characteristics.

```javascript
POST https://api.fish.audio/v1/models
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "title": "My Voice Clone",
  "description": "Voice clone created via VoxMod",
  "tags": ["voxmod", "clone"],
  "visibility": "private"
}

Response:
{
  "id": "model_abc123",
  "title": "My Voice Clone",
  "created_at": "2024-01-01T00:00:00Z",
  ...
}
```

### 2. Upload Audio Sample

**Endpoint**: `POST /v1/models/{model_id}/samples`

Upload audio files to train the voice model.

```javascript
POST https://api.fish.audio/v1/models/model_abc123/samples
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: multipart/form-data

Form Data:
  audio: [audio file]
  text: [optional transcription]

Response:
{
  "id": "sample_xyz789",
  "model_id": "model_abc123",
  "duration": 30.5,
  ...
}
```

**Requirements**:
- Audio format: MP3, WAV, M4A, FLAC
- Recommended duration: 30+ seconds
- Clear speech, minimal background noise
- Sample rate: 16kHz or higher recommended

### 3. Generate Speech (TTS)

**Endpoint**: `POST /v1/tts`

Generate speech using the cloned voice.

```javascript
POST https://api.fish.audio/v1/tts
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "reference_id": "model_abc123",
  "text": "Hello, this is my cloned voice!",
  "format": "mp3",
  "normalize": true,
  "mp3_bitrate": 128
}

Response:
[Binary audio data]
```

**Parameters**:
- `reference_id`: Your voice model ID
- `text`: Text to convert to speech (max ~5000 characters)
- `format`: Output format (`mp3`, `wav`, `flac`)
- `normalize`: Normalize audio volume (recommended: `true`)
- `mp3_bitrate`: Bitrate for MP3 (64, 128, 192, 256, 320)

### 4. List Voice Models

**Endpoint**: `GET /v1/models`

Get all your voice models.

```javascript
GET https://api.fish.audio/v1/models
Headers:
  Authorization: Bearer YOUR_API_KEY

Response:
{
  "models": [
    {
      "id": "model_abc123",
      "title": "My Voice Clone",
      ...
    }
  ]
}
```

### 5. Delete Voice Model

**Endpoint**: `DELETE /v1/models/{model_id}`

Delete a voice model.

```javascript
DELETE https://api.fish.audio/v1/models/model_abc123
Headers:
  Authorization: Bearer YOUR_API_KEY

Response:
{
  "success": true
}
```

## Code Examples

### Server-side (Node.js)

#### Upload Voice Sample
```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function uploadVoice(audioPath, modelName) {
  // Create model
  const createResponse = await axios.post(
    'https://api.fish.audio/v1/models',
    {
      title: modelName,
      visibility: 'private'
    },
    {
      headers: {
        'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const modelId = createResponse.data.id;

  // Upload sample
  const formData = new FormData();
  formData.append('audio', fs.createReadStream(audioPath));

  await axios.post(
    `https://api.fish.audio/v1/models/${modelId}/samples`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
        ...formData.getHeaders()
      }
    }
  );

  return modelId;
}
```

#### Generate Speech
```javascript
async function generateSpeech(modelId, text) {
  const response = await axios({
    method: 'POST',
    url: 'https://api.fish.audio/v1/tts',
    headers: {
      'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    data: {
      reference_id: modelId,
      text: text,
      format: 'mp3',
      normalize: true
    },
    responseType: 'arraybuffer'
  });

  // Save to file
  fs.writeFileSync('output.mp3', response.data);
  return 'output.mp3';
}
```

## Best Practices

### Audio Quality
1. **Duration**: Upload at least 30 seconds of clear speech
2. **Quality**: Use high-quality recordings (16kHz+ sample rate)
3. **Noise**: Minimize background noise
4. **Variety**: Include different tones and emotions
5. **Consistency**: Use consistent recording conditions

### Text Input
1. **Length**: Keep individual generations under 5000 characters
2. **Format**: Use proper punctuation for natural pauses
3. **Special characters**: Test with your specific use case
4. **Line breaks**: Use `\n` for paragraph breaks

### Error Handling
```javascript
try {
  const result = await generateSpeech(modelId, text);
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Invalid API key');
  } else if (error.response?.status === 429) {
    console.error('Rate limit exceeded');
  } else if (error.response?.status === 400) {
    console.error('Invalid request:', error.response.data);
  } else {
    console.error('Unknown error:', error.message);
  }
}
```

### Rate Limits
- Check Fish Audio documentation for current limits
- Implement retry logic with exponential backoff
- Consider caching generated audio

## Pricing

Fish Audio uses a credit-based system:
- Voice model creation: ~10 credits
- TTS generation: ~1 credit per 10 seconds of audio
- Check [Fish Audio pricing](https://fish.audio/pricing) for details

## Advanced Features

### Voice Mixing
Blend multiple voice models for unique voices:
```javascript
{
  "reference_id": ["model1", "model2"],
  "reference_weights": [0.7, 0.3],
  "text": "Mixed voice output"
}
```

### Emotion Control
Some models support emotion parameters:
```javascript
{
  "reference_id": "model_abc123",
  "text": "Excited announcement!",
  "emotion": "happy",
  "emotion_strength": 0.8
}
```

### Speed Control
Adjust speaking rate:
```javascript
{
  "reference_id": "model_abc123",
  "text": "Speed adjusted speech",
  "speed": 1.2  // 1.0 = normal, 0.5 = slower, 2.0 = faster
}
```

## Troubleshooting

### Common Errors

**401 Unauthorized**
- Check API key is correct
- Verify key hasn't expired
- Ensure key is in Authorization header

**400 Bad Request**
- Verify all required parameters
- Check audio file format
- Validate text length

**413 Payload Too Large**
- Reduce audio file size
- Compress audio file
- Use shorter text

**429 Too Many Requests**
- Implement rate limiting
- Add delays between requests
- Consider upgrading plan

### Quality Issues

**Robotic Voice**
- Upload more training audio
- Use higher quality source audio
- Ensure varied speech patterns

**Background Noise**
- Clean source audio
- Use noise reduction tools
- Re-record in quiet environment

**Incorrect Pronunciation**
- Add phonetic spelling in training
- Include similar words in training data
- Use SSML tags (if supported)

## Resources

- [Fish Audio Documentation](https://docs.fish.audio)
- [API Reference](https://docs.fish.audio/api)
- [Community Forum](https://community.fish.audio)
- [Status Page](https://status.fish.audio)

## Support

For Fish Audio API issues:
- Email: support@fish.audio
- Discord: [Fish Audio Discord](https://discord.gg/fishauudio)
- GitHub: Issues related to this integration

---

Last updated: January 2024
