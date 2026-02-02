# Culture Voices - Voice Cloning Website

A modern voice cloning platform for creators, streamers, and podcasters using the Fish Audio API.

## Features

- 🎤 **Voice Cloning**: Upload 30 seconds of audio to create your voice model
- 🎯 **Text-to-Speech**: Generate speech with your cloned voice
- 💾 **Audio Export**: Download generated audio in MP3 format
- 🎨 **Modern UI**: Beautiful, responsive design with animations
- ⚡ **Fast Processing**: Powered by Fish Audio's advanced AI

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Fish Audio API key ([Get one here](https://fish.audio))

## Installation

1. **Clone or navigate to the project directory**

```bash
cd "/Users/paulbridges/Downloads/cloned voices"
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your Fish Audio API key:

```
FISH_AUDIO_API_KEY=your_actual_api_key_here
PORT=3000
```

## Getting a Fish Audio API Key

1. Go to [https://fish.audio](https://fish.audio)
2. Sign up for an account
3. Navigate to your API settings
4. Generate an API key
5. Copy the key to your `.env` file

## Running the Application

### Development Mode

Start the server with auto-reload:

```bash
npm run dev
```

### Production Mode

Start the server:

```bash
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3000/api

## Project Structure

```
.
├── index.html          # Main HTML file with UI
├── app.js             # Frontend JavaScript (animations & API calls)
├── server.js          # Backend server with Fish Audio integration
├── package.json       # Node.js dependencies
├── .env              # Environment variables (create from .env.example)
├── .env.example      # Environment variables template
├── uploads/          # Temporary storage for uploaded audio (auto-created)
├── generated/        # Generated audio files (auto-created)
└── README.md         # This file
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Upload Voice
```
POST /api/voice/upload
Content-Type: multipart/form-data

Form Data:
- audio: audio file (MP3, WAV, M4A)
- name: voice model name (optional)
```

### Generate Speech
```
POST /api/voice/generate
Content-Type: application/json

Body:
{
  "modelId": "your-model-id",
  "text": "Text to convert to speech"
}
```

### Get Voices
```
GET /api/voices
```

### Delete Voice
```
DELETE /api/voice/:modelId
```

### Join Waitlist
```
POST /api/waitlist
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "type": "TikTok Creator"
}
```

## Usage

1. **Open the website** in your browser at `http://localhost:3000`

2. **Click "Clone My Voice"** button

3. **Upload audio**:
   - Click the upload zone or drag and drop an audio file
   - Minimum 30 seconds of clear audio recommended
   - Supported formats: MP3, WAV, M4A

4. **Generate speech**:
   - Once uploaded, type your script
   - Click "Generate Voice"
   - Wait for processing (usually 10-30 seconds)

5. **Download**:
   - Listen to the preview
   - Click "Download MP3" to save the file

## Fish Audio API Integration

This project uses the Fish Audio API for voice cloning and text-to-speech. The integration includes:

- **Voice Model Creation**: Creates a private voice model from uploaded audio
- **Sample Upload**: Uploads audio samples to train the model
- **TTS Generation**: Converts text to speech using the cloned voice
- **Audio Export**: Returns MP3 files for download

### API Documentation

For detailed Fish Audio API documentation, visit:
- [Fish Audio Documentation](https://docs.fish.audio)
- [API Reference](https://docs.fish.audio/api)

## Troubleshooting

### "FISH_AUDIO_API_KEY not configured"
- Make sure you created a `.env` file
- Verify your API key is correct
- Restart the server after adding the key

### Upload fails
- Check file size (max 10MB)
- Ensure file is a valid audio format
- Check server logs for detailed errors

### Generation fails
- Verify the model ID is correct
- Check if you have API credits remaining
- Ensure text is not too long

### Port already in use
- Change the PORT in `.env` file
- Or stop the process using port 3000:
  ```bash
  lsof -ti:3000 | xargs kill
  ```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Tech Stack

### Frontend
- HTML5
- Tailwind CSS
- GSAP (animations)
- Font Awesome (icons)
- Google Fonts (Inter, Outfit)

### Backend
- Node.js
- Express.js
- Multer (file uploads)
- Axios (HTTP client)
- Fish Audio API

## Security Notes

- API keys are stored in `.env` and not committed to git
- File uploads are validated and size-limited
- Temporary files are cleaned up after processing
- CORS is enabled for development (configure for production)

## Production Deployment

Before deploying to production:

1. **Add `.gitignore`**:
```
node_modules/
.env
uploads/
generated/
waitlist.json
```

2. **Configure CORS**:
   - Update CORS settings in `server.js` to allow only your domain

3. **Use a database**:
   - Replace file-based waitlist with a proper database
   - Consider MongoDB, PostgreSQL, or Firebase

4. **Add authentication**:
   - Implement user accounts
   - Add rate limiting
   - Secure API endpoints

5. **Environment variables**:
   - Set environment variables on your hosting platform
   - Never commit `.env` to version control

6. **File storage**:
   - Use cloud storage (AWS S3, Google Cloud Storage)
   - Clean up old generated files regularly

## License

MIT License - feel free to use for personal or commercial projects

## Support

For issues or questions:
- Check Fish Audio documentation
- Review server logs for detailed errors
- Open an issue on the project repository

## Credits

- Voice cloning powered by [Fish Audio](https://fish.audio)
- UI design: Modern neobrutalism style
- Animations: GSAP

---

Built with ❤️ for creators
