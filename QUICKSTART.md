# VoxMod - Quick Start Guide

Get your voice cloning website running in 5 minutes!

## Prerequisites

✅ Node.js installed (v16+)
✅ Fish Audio API key ([Get one here](https://fish.audio))

## Setup Steps

### 1. Get Your Fish Audio API Key

1. Visit [https://fish.audio](https://fish.audio)
2. Sign up or log in
3. Go to Settings → API Keys
4. Create a new API key
5. Copy the key (you'll need it in step 3)

### 2. Install Dependencies

Dependencies are already installed! If you need to reinstall:

```bash
npm install
```

### 3. Configure Your API Key

Create a `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` and add your API key:

```
FISH_AUDIO_API_KEY=your_actual_api_key_here
PORT=3000
```

**On Mac/Linux:**
```bash
nano .env
```

**On Windows:**
```bash
notepad .env
```

### 4. Start the Server

```bash
npm start
```

You should see:
```
🚀 VoxMod server running on http://localhost:3000
📁 Serving static files from: /Users/paulbridges/Downloads/cloned voices
🎤 Fish Audio API configured
```

### 5. Open the Website

Open your browser and go to:
```
http://localhost:3000
```

## Using VoxMod

### Clone Your Voice

1. Click the **"Clone My Voice"** button
2. Upload an audio file (MP3, WAV, or M4A)
   - Minimum 30 seconds recommended
   - Clear speech, minimal background noise
3. Wait for upload to complete
4. You'll receive a Model ID

### Generate Speech

1. Type your script in the text area
2. Click **"Generate Voice"**
3. Wait 10-30 seconds for processing
4. Listen to the preview
5. Download the MP3 file

## Troubleshooting

### "API key not configured"
- Make sure you created a `.env` file
- Check that your API key is correct
- Restart the server after adding the key

### Can't access localhost:3000
- Check if the server is running
- Try a different port in `.env`:
  ```
  PORT=8080
  ```
- Make sure no other app is using port 3000

### Upload fails
- Check file size (must be under 10MB)
- Verify it's an audio file (MP3, WAV, M4A)
- Check server logs for errors

### Generation fails
- Verify you have Fish Audio credits
- Check if Model ID is correct
- Make sure text isn't too long (max ~5000 chars)

## File Locations

- **Uploaded audio**: `uploads/` folder (temporary)
- **Generated audio**: `generated/` folder
- **Waitlist data**: `waitlist.json`

## Development Mode

For auto-reload during development:

```bash
npm run dev
```

This uses nodemon to restart the server when files change.

## Testing the API Directly

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Upload Voice (using curl)
```bash
curl -X POST http://localhost:3000/api/voice/upload \
  -F "audio=@/path/to/your/audio.mp3" \
  -F "name=My Voice"
```

### Generate Speech
```bash
curl -X POST http://localhost:3000/api/voice/generate \
  -H "Content-Type: application/json" \
  -d '{"modelId":"your-model-id","text":"Hello world"}' \
  --output test.mp3
```

## Next Steps

- [ ] Get your Fish Audio API key
- [ ] Configure `.env` file
- [ ] Start the server
- [ ] Test voice cloning
- [ ] Customize the design (edit `index.html` and `app.js`)
- [ ] Deploy to production (see README.md)

## Common Commands

```bash
# Start server
npm start

# Start with auto-reload
npm run dev

# Install dependencies
npm install

# Check server is running
curl http://localhost:3000/api/health

# Stop server
# Press Ctrl+C in the terminal
```

## Need Help?

1. Check the full [README.md](README.md)
2. Review [Fish Audio integration guide](FISH_AUDIO_GUIDE.md)
3. Check Fish Audio docs: https://docs.fish.audio
4. Review server logs in the terminal

## Production Deployment

Before deploying:

1. ✅ Add `.gitignore` (already done)
2. ✅ Never commit `.env` file
3. ⚠️ Configure CORS for your domain
4. ⚠️ Add rate limiting
5. ⚠️ Use a real database (not JSON files)
6. ⚠️ Use cloud storage for audio files
7. ⚠️ Add user authentication

See [README.md](README.md) for detailed production deployment instructions.

---

**Ready to clone some voices?** 🎤

Run `npm start` and visit http://localhost:3000!
