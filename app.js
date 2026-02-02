// Force scroll to top immediately - BEFORE anything else
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;
document.body.scrollTop = 0;

// Configuration - Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

// Global state
let currentModelId = null;
let currentAudioUrl = null;
let selectedFile = null;
let autoTranscribedText = null; // Store auto-transcribed text
let transcriptionInProgress = false;

// --- GSAP ANIMATIONS ---
gsap.registerPlugin(ScrollTrigger, TextPlugin);

// Clear any cached scroll positions from ScrollTrigger
ScrollTrigger.clearScrollMemory();

// Ensure scroll is at top after plugins load
window.scrollTo(0, 0);

// --- HERO ANIMATIONS WITH TEXT EFFECTS ---
const tl = gsap.timeline();

// Split text into words for animation
function splitTextToWords(element) {
    const text = element.textContent;
    const words = text.split(' ');
    element.innerHTML = words.map(word =>
        `<span class="inline-block" style="opacity: 0;">${word}</span>`
    ).join(' ');
    return element.querySelectorAll('span');
}

// Reveal Hero Badge
tl.from(".hero-badge", {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: "power2.out"
});

// Animate first line with blur + slide effect
const line1 = document.querySelector('.hero-text-line');
if (line1) {
    const words1 = splitTextToWords(line1);
    tl.fromTo(words1,
        {
            opacity: 0,
            filter: 'blur(12px)',
            y: 20
        },
        {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out"
        },
        "-=0.3"
    );
}

// Rotating headlines animation
const line2Element = document.querySelector('.hero-text-line-2');
if (line2Element) {
    const headlines = JSON.parse(line2Element.getAttribute('data-headlines'));
    let currentIndex = 0;

    // Function to animate headline change
    function animateHeadline(text) {
        line2Element.textContent = text;
        const words = splitTextToWords(line2Element);

        gsap.fromTo(words,
            {
                opacity: 0,
                filter: 'blur(10px)',
                y: 15
            },
            {
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                duration: 0.6,
                stagger: 0.06,
                ease: "power2.out"
            }
        );
    }

    // Initial animation
    tl.add(() => animateHeadline(headlines[0]), "-=0.2");

    // Rotate headlines every 3 seconds
    setInterval(() => {
        currentIndex = (currentIndex + 1) % headlines.length;

        // Fade out current
        gsap.to(line2Element.querySelectorAll('span'), {
            opacity: 0,
            filter: 'blur(8px)',
            y: -10,
            duration: 0.4,
            stagger: 0.03,
            ease: "power2.in",
            onComplete: () => {
                // Fade in new headline
                animateHeadline(headlines[currentIndex]);
            }
        });
    }, 3000);
}

// --- SECTION 2: CARDS STAGGER ---
// Using batch to ensure all feature cards animate properly
gsap.set(".feature-card", { opacity: 1 }); // Ensure cards are visible by default

ScrollTrigger.batch(".feature-card", {
    onEnter: (elements) => {
        gsap.fromTo(elements,
            {
                y: 60,
                autoAlpha: 0
            },
            {
                y: 0,
                autoAlpha: 1,
                duration: 0.6,
                stagger: 0.15,
                ease: "power2.out"
            }
        );
    },
    start: "top 85%",
    once: true
});

// --- SECTION 3: TEXT TYPING ---
gsap.to("#typewriter-text", {
    scrollTrigger: {
        trigger: ".how-it-works-section",
        start: "top 60%",
    },
    text: {
        value: "What's up guys!",
        delimiter: ""
    },
    duration: 1.5,
    ease: "none"
});

gsap.from(".step-item", {
    scrollTrigger: {
        trigger: ".how-it-works-section",
        start: "top 70%",
    },
    y: 30,
    opacity: 0,
    stagger: 0.2,
    duration: 0.5
});

// --- SECTION 3.5: DEMO CARDS ---
gsap.from(".demo-card", {
    scrollTrigger: {
        trigger: ".demo-card",
        start: "top 80%",
    },
    y: 40,
    opacity: 0,
    stagger: 0.15,
    duration: 0.6,
    ease: "power2.out"
});

// Play button functionality for demo cards
document.querySelectorAll('.play-btn').forEach((btn, index) => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        const card = this.closest('.demo-card');
        const input = card.querySelector('input');
        const icon = this.querySelector('i');

        // Simulate playing
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        this.classList.add('bg-black', 'text-white');

        // Reset after 3 seconds
        setTimeout(() => {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
            this.classList.remove('bg-black', 'text-white');
        }, 3000);

        // Show visual feedback
        gsap.to(card, {
            scale: 1.02,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });
    });
});

// --- SECTION 4: DEMO TOGGLE LOGIC ---
const toggleBtn = document.getElementById('voice-toggle');
const toggleKnob = document.getElementById('toggle-knob');
const labelOrig = document.getElementById('label-orig');
const labelClone = document.getElementById('label-clone');
const demoBg = document.getElementById('demo-bg');
const demoBarsContainer = document.getElementById('demo-bars');
let isCloned = false;

// Generate Demo Bars
for(let i=0; i<20; i++) {
    let bar = document.createElement("div");
    bar.className = "w-2 bg-black rounded-full demo-bar transition-all duration-300";
    bar.style.height = "20%";
    demoBarsContainer.appendChild(bar);
}

// Animate Demo Bars (Idle)
const demoAnim = gsap.to(".demo-bar", {
    height: "random(20, 60)%",
    duration: 0.2,
    repeat: -1,
    yoyo: true,
    stagger: 0.05,
    paused: false
});

toggleBtn.addEventListener('click', () => {
    isCloned = !isCloned;

    if(isCloned) {
        // Switch to Cloned
        toggleKnob.style.transform = "scale(0.9) translateX(100%)";
        labelOrig.classList.add('text-gray-400');
        labelOrig.classList.remove('text-black');
        labelClone.classList.remove('text-gray-400');
        labelClone.classList.add('text-black');
        demoBg.classList.add('bg-purple-100');
        demoBg.classList.remove('bg-gray-50');

        // Intense Bars
        gsap.to(".demo-bar", {
            backgroundColor: "#a855f7",
            duration: 0.3
        });
        demoAnim.timeScale(2);
    } else {
        // Switch to Original
        toggleKnob.style.transform = "scale(0.9) translateX(2px)";
        labelOrig.classList.remove('text-gray-400');
        labelOrig.classList.add('text-black');
        labelClone.classList.add('text-gray-400');
        labelClone.classList.remove('text-black');
        demoBg.classList.remove('bg-purple-100');
        demoBg.classList.add('bg-gray-50');

        // Normal Bars
        gsap.to(".demo-bar", {
            backgroundColor: "#000000",
            duration: 0.3
        });
        demoAnim.timeScale(1);
    }
});

// --- STICKY PILL VISIBILITY ---
const stickyPill = document.getElementById('sticky-pill');
if (stickyPill) {
    // Hide when at top, show when scrolling down
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            // Show the pill
            stickyPill.style.opacity = '1';
            stickyPill.style.transform = 'translateX(-50%) translateY(0)';
            stickyPill.style.pointerEvents = 'auto';
        } else {
            // Hide the pill
            stickyPill.style.opacity = '0';
            stickyPill.style.transform = 'translateX(-50%) translateY(100px)';
            stickyPill.style.pointerEvents = 'none';
        }
    });

    // Set initial state based on current scroll position
    if (window.scrollY <= 500) {
        stickyPill.style.opacity = '0';
        stickyPill.style.transform = 'translateX(-50%) translateY(100px)';
        stickyPill.style.pointerEvents = 'none';
    } else {
        stickyPill.style.pointerEvents = 'auto';
    }

    // Add click event listener as backup to inline onclick
    const stickyPillButton = stickyPill.querySelector('button');
    if (stickyPillButton) {
        stickyPillButton.addEventListener('click', (e) => {
            console.log('[StickyPill] Button clicked');
            e.preventDefault();
            e.stopPropagation();
            openCloneModal();
        });
    }
} else {
    console.warn('Sticky pill element not found');
}

// --- CUSTOM CURSOR (Minimal Border Style) ---
const cursor = document.querySelector('.cursor-follow');
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    gsap.to(cursor, {
        x: mouseX - 7.5,
        y: mouseY - 7.5,
        opacity: 1,
        duration: 0.15,
        ease: "power2.out"
    });
});

document.addEventListener('mouseleave', () => {
    gsap.to(cursor, { opacity: 0, duration: 0.2 });
});

// --- VOICE CLONING FUNCTIONALITY ---

// Modal Management
function openCloneModal() {
    console.log('[openCloneModal] Opening clone modal...');
    const modal = document.getElementById('clone-modal');
    if (!modal) {
        console.error('[openCloneModal] Clone modal element not found!');
        return;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    console.log('[openCloneModal] Modal opened successfully');

    // Ensure file upload listeners are attached when modal opens
    setTimeout(() => {
        setupFileUpload();
    }, 100);
}

function closeCloneModal() {
    document.getElementById('clone-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// --- SIGNUP MODAL FUNCTIONS ---
function openSignupModal() {
    document.getElementById('signup-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset to step 1
    document.getElementById('signup-step-1').classList.remove('hidden');
    document.getElementById('signup-step-2').classList.add('hidden');
}

function closeSignupModal() {
    document.getElementById('signup-modal').classList.remove('active');
    document.body.style.overflow = 'auto';

    // Reset form
    const form = document.querySelector('#signup-step-1 form');
    if (form) form.reset();
}

function openLoginModal(event) {
    if (event) event.preventDefault();
    // For now, just show an alert - you can implement a login modal later
    alert('Login functionality coming soon! For now, please create a new account.');
}

async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const type = document.getElementById('signup-type').value;
    const terms = document.getElementById('signup-terms').checked;

    if (!terms) {
        alert('Please accept the Terms of Service and Privacy Policy');
        return;
    }

    // Disable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Creating Account...';

    try {
        // Send to backend
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, type })
        });

        if (!response.ok) {
            throw new Error('Signup failed');
        }

        const data = await response.json();

        // Move to welcome step
        document.getElementById('signup-step-1').classList.add('hidden');
        document.getElementById('signup-step-2').classList.remove('hidden');

    } catch (error) {
        console.error('Signup error:', error);
        alert('Failed to create account. Please try again or use a different email.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function startCloning() {
    // Close signup modal and open clone modal
    closeSignupModal();
    setTimeout(() => {
        openCloneModal();
    }, 300);
}

function resetCloneModal() {
    document.getElementById('clone-step-1').classList.remove('hidden');
    document.getElementById('clone-step-2').classList.add('hidden');
    document.getElementById('clone-step-3').classList.add('hidden');
    document.getElementById('voice-file').value = '';
    document.getElementById('script-text').value = '';
    document.getElementById('upload-btn').disabled = true;
    document.getElementById('upload-progress').classList.add('hidden');

    // Reset transcription text field
    const transcriptionTextEl = document.getElementById('transcription-text');
    if (transcriptionTextEl) {
        transcriptionTextEl.value = '';
    }
    const transcriptionCharCountEl = document.getElementById('transcription-char-count');
    if (transcriptionCharCountEl) {
        transcriptionCharCountEl.textContent = '0/500';
    }

    // Reset upload zone
    const uploadZone = document.getElementById('upload-zone');
    // Clear existing handler reference since we're replacing content
    if (uploadZone) {
        uploadZone._clickHandler = null;
    }
    uploadZone.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up text-5xl text-gray-300 mb-4 pointer-events-none"></i>
        <p class="font-heading font-medium mb-2 pointer-events-none">Drop audio file here or click to upload</p>
        <p class="text-sm text-gray-500 font-light pointer-events-none">MP3, WAV, M4A (max 10MB)</p>
        <input type="file" id="voice-file" accept="audio/*" class="hidden">
    `;

    // Reset recording UI
    document.getElementById('record-idle').classList.remove('hidden');
    document.getElementById('record-active').classList.add('hidden');
    document.getElementById('record-complete').classList.add('hidden');
    document.getElementById('record-btn').innerHTML = '<i class="fa-solid fa-circle mr-2"></i> Start Recording';
    document.getElementById('record-btn').classList.add('bg-red-500', 'hover:bg-red-600');
    document.getElementById('record-btn').classList.remove('bg-black', 'hover:bg-gray-800');
    document.getElementById('record-timer').textContent = '00:30';

    // Clean up audio player
    const audioPlayer = document.getElementById('recorded-audio-playback');
    if (audioPlayer.src) {
        URL.revokeObjectURL(audioPlayer.src);
        audioPlayer.src = '';
    }

    // Stop any ongoing recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        clearInterval(recordingTimer);
    }

    // Switch back to upload tab
    switchToUpload();

    // Re-attach event listeners (use setTimeout to ensure DOM is ready after innerHTML replacement)
    setTimeout(() => {
        setupFileUpload();
    }, 0);

    selectedFile = null;
    currentModelId = null;
    currentAudioUrl = null;
    autoTranscribedText = null;
    transcriptionInProgress = false;

    // Remove any transcription status messages
    const statusEl = document.getElementById('transcription-status');
    if (statusEl) {
        statusEl.remove();
    }

    // Reset transcription badge
    updateTranscriptionBadgeAvailability();

    // Reset transcription textarea styling (reuse transcriptionTextEl from above)
    if (transcriptionTextEl) {
        transcriptionTextEl.classList.remove('border-blue-400', 'bg-blue-50', 'border-green-400');
        transcriptionTextEl.placeholder = 'Upload audio or record to auto-transcribe... or type what you said manually';
    }
}

// File Upload Handler
function setupFileUpload() {
    console.log('[setupFileUpload] Setting up file upload handlers...');

    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('voice-file');

    if (!uploadZone) {
        console.warn('[setupFileUpload] Upload zone not found');
        return;
    }

    if (!fileInput) {
        console.warn('[setupFileUpload] File input not found');
        return;
    }

    console.log('[setupFileUpload] Found upload zone and file input');

    // Remove any existing click handler by using a named function approach
    // Store the handler reference on the element to allow removal
    if (uploadZone._clickHandler) {
        uploadZone.removeEventListener('click', uploadZone._clickHandler);
        console.log('[setupFileUpload] Removed existing click handler');
    }
    if (fileInput._changeHandler) {
        fileInput.removeEventListener('change', fileInput._changeHandler);
        console.log('[setupFileUpload] Removed existing change handler');
    }

    // Create click handler for upload zone
    uploadZone._clickHandler = function(e) {
        console.log('[setupFileUpload] Upload zone clicked, event target:', e.target.tagName);

        // Don't trigger if clicking directly on the file input (prevents double-trigger)
        if (e.target === fileInput) {
            console.log('[setupFileUpload] Click was on file input itself, ignoring');
            return;
        }

        // Prevent any default behavior
        e.preventDefault();
        e.stopPropagation();

        // Get fresh reference to file input (in case DOM was modified)
        const currentFileInput = document.getElementById('voice-file');
        if (currentFileInput) {
            console.log('[setupFileUpload] Triggering file input click...');
            currentFileInput.click();
        } else {
            console.error('[setupFileUpload] File input not found when trying to click');
        }
    };

    // Create change handler for file input
    fileInput._changeHandler = async function(e) {
        console.log('[setupFileUpload] File input changed');
        selectedFile = e.target.files[0];
        if (selectedFile) {
            console.log('[setupFileUpload] File selected:', selectedFile.name, 'Size:', selectedFile.size);
            document.getElementById('upload-btn').disabled = false;

            // Update upload zone UI to show selected file
            const currentUploadZone = document.getElementById('upload-zone');
            if (currentUploadZone) {
                // Clear existing handler reference since we're replacing content
                currentUploadZone._clickHandler = null;

                // Preserve the file input when updating innerHTML
                // Use pointer-events-none on child elements to ensure clicks propagate to parent
                currentUploadZone.innerHTML = `
                    <i class="fa-solid fa-check-circle text-5xl text-slime-green mb-4 pointer-events-none"></i>
                    <p class="font-heading font-medium mb-2 pointer-events-none">${selectedFile.name}</p>
                    <p class="text-sm text-gray-500 font-light pointer-events-none">${(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <input type="file" id="voice-file" accept="audio/*" class="hidden">
                `;

                // Re-attach handlers after innerHTML change
                setTimeout(() => {
                    setupFileUpload();
                }, 0);
            }

            // Reset any previous auto-transcription
            autoTranscribedText = null;

            // Trigger automatic transcription in the background
            // This runs while user can still interact with the form
            if (window.serverCapabilities?.transcription?.whisperAvailable) {
                console.log('[setupFileUpload] Starting automatic transcription...');
                transcribeAudioFile(selectedFile);
            }
        }
    };

    // Attach the handlers
    uploadZone.addEventListener('click', uploadZone._clickHandler);
    fileInput.addEventListener('change', fileInput._changeHandler);

    console.log('[setupFileUpload] Event handlers attached successfully');
}

// Initialize file upload
setupFileUpload();

// --- VOICE RECORDING FUNCTIONALITY ---
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingTimeLeft = 30;

// Switch to Upload Mode
function switchToUpload() {
    document.getElementById('upload-section').classList.remove('hidden');
    document.getElementById('record-section').classList.add('hidden');
    document.getElementById('upload-tab-btn').classList.add('bg-black', 'text-white');
    document.getElementById('upload-tab-btn').classList.remove('bg-white', 'text-black');
    document.getElementById('record-tab-btn').classList.remove('bg-black', 'text-white');
    document.getElementById('record-tab-btn').classList.add('bg-white', 'text-black');

    // Re-attach file upload listeners when switching to upload tab
    setTimeout(() => {
        setupFileUpload();
    }, 50);
}

// Switch to Record Mode
function switchToRecord() {
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('record-section').classList.remove('hidden');
    document.getElementById('record-tab-btn').classList.add('bg-black', 'text-white');
    document.getElementById('record-tab-btn').classList.remove('bg-white', 'text-black');
    document.getElementById('upload-tab-btn').classList.remove('bg-black', 'text-white');
    document.getElementById('upload-tab-btn').classList.add('bg-white', 'text-black');
}

// Toggle Recording
async function toggleRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        await startRecording();
    } else {
        stopRecording();
    }
}

// --- CROSS-BROWSER AUDIO FORMAT DETECTION ---
// Detects browser capabilities and selects the best audio format for recording
// that is both playable locally AND compatible with Fish Audio API (WAV, MP3, FLAC)

// Detect browser type for optimized format selection
function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Chrome') || ua.includes('Chromium')) return 'chrome';
    if (ua.includes('Edg')) return 'edge';
    return 'unknown';
}

// Get supported MIME type for MediaRecorder with cross-browser compatibility
// Priority: Formats that work for both local playback AND Fish Audio API
function getSupportedMimeType() {
    const browser = detectBrowser();
    console.log('Detected browser:', browser);

    // Define MIME types in order of preference for each browser
    // Fish Audio API accepts: WAV, MP3, FLAC, M4A
    // Safari: Prefers MP4/M4A (AAC), also supports WebM with Opus (Safari 18.4+)
    // Chrome/Firefox: Prefer WebM with Opus, also support MP4

    let mimeTypes;

    if (browser === 'safari') {
        // Safari: MP4/M4A is native and most reliable
        // Safari 18.4+ also supports WebM with Opus
        mimeTypes = [
            'audio/mp4',                    // Safari's native format (AAC in MP4/M4A)
            'audio/mp4;codecs=aac',         // Explicit AAC codec
            'audio/webm;codecs=opus',       // Safari 18.4+ supports this
            'audio/aac',                    // Raw AAC (some Safari versions)
            ''                              // Browser default fallback
        ];
    } else if (browser === 'firefox') {
        // Firefox: WebM with Opus is most reliable
        // Firefox also supports OGG natively
        mimeTypes = [
            'audio/webm;codecs=opus',       // Firefox's preferred format
            'audio/webm',                   // WebM without explicit codec
            'audio/ogg;codecs=opus',        // OGG with Opus (Firefox native)
            'audio/ogg',                    // OGG without explicit codec
            ''                              // Browser default fallback
        ];
    } else {
        // Chrome, Edge, and others: WebM with Opus is well-supported
        mimeTypes = [
            'audio/webm;codecs=opus',       // Chrome's preferred format
            'audio/webm',                   // WebM without explicit codec
            'audio/mp4',                    // MP4/M4A fallback
            'audio/ogg;codecs=opus',        // OGG fallback
            ''                              // Browser default fallback
        ];
    }

    // Test each MIME type for support
    for (const mimeType of mimeTypes) {
        if (mimeType === '') {
            console.log('Using browser default MIME type');
            return '';
        }

        try {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                console.log('Selected MIME type:', mimeType, '(browser:', browser, ')');
                return mimeType;
            }
        } catch (e) {
            console.warn('Error checking MIME type support:', mimeType, e);
        }
    }

    console.warn('No preferred MIME type supported, using browser default');
    return ''; // Fallback to browser default
}

// Get file extension based on MIME type for proper file naming
function getFileExtension(mimeType) {
    const mimeTypeLower = mimeType.toLowerCase();

    if (mimeTypeLower.includes('mp4') || mimeTypeLower.includes('m4a') || mimeTypeLower.includes('aac')) {
        return 'm4a';  // M4A is widely compatible and accepted by Fish Audio
    } else if (mimeTypeLower.includes('ogg')) {
        return 'ogg';
    } else if (mimeTypeLower.includes('webm')) {
        return 'webm';
    } else if (mimeTypeLower.includes('wav')) {
        return 'wav';
    }
    // Default extension - M4A is safe for Fish Audio
    return 'm4a';
}

// Check if the current browser supports audio recording
function checkRecordingSupport() {
    const issues = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        issues.push('Your browser does not support audio recording (getUserMedia not available)');
    }

    if (typeof MediaRecorder === 'undefined') {
        issues.push('Your browser does not support the MediaRecorder API');
    }

    // Check if running on HTTPS or localhost (required for getUserMedia)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        issues.push('Audio recording requires HTTPS or localhost');
    }

    return {
        supported: issues.length === 0,
        issues: issues
    };
}

// Log browser audio capabilities for debugging
function logAudioCapabilities() {
    const browser = detectBrowser();
    console.log('=== Audio Recording Capabilities ===');
    console.log('Browser:', browser);
    console.log('User Agent:', navigator.userAgent);

    const testTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/webm;codecs=pcm',
        'audio/mp4',
        'audio/mp4;codecs=aac',
        'audio/mp4;codecs=opus',
        'audio/ogg',
        'audio/ogg;codecs=opus',
        'audio/wav',
        'audio/aac'
    ];

    console.log('MIME Type Support:');
    testTypes.forEach(type => {
        try {
            const supported = MediaRecorder.isTypeSupported(type);
            console.log(`  ${type}: ${supported ? 'YES' : 'no'}`);
        } catch (e) {
            console.log(`  ${type}: error - ${e.message}`);
        }
    });
    console.log('====================================');
}

// Run capability check on load
logAudioCapabilities();

// Check server capabilities and warn about potential issues
async function checkServerCapabilities() {
    try {
        const response = await fetch(`${API_URL}/capabilities`);
        if (response.ok) {
            const caps = await response.json();
            console.log('=== Server Capabilities ===');
            console.log('FFmpeg available:', caps.audio.ffmpegAvailable);
            console.log('Conversion enabled:', caps.audio.conversionEnabled);
            console.log('Fish Audio configured:', caps.api.fishAudioConfigured);
            console.log('Recommendation:', caps.audio.recommendation);

            // Log transcription capabilities
            if (caps.transcription) {
                console.log('=== Transcription Capabilities ===');
                console.log('Whisper available:', caps.transcription.whisperAvailable);
                console.log('Service:', caps.transcription.service);
                console.log('Max file size:', caps.transcription.maxFileSize);
                console.log('Recommendation:', caps.transcription.recommendation);
            }
            console.log('===========================');

            // Store for later use
            window.serverCapabilities = caps;

            // Update transcription badge based on availability
            updateTranscriptionBadgeAvailability();

            // Warn if FFmpeg is not available and user is on Firefox
            const browser = detectBrowser();
            if (!caps.audio.ffmpegAvailable && browser === 'firefox') {
                console.warn('Warning: Firefox recordings (OGG/WebM) may not upload without FFmpeg on server');
            }
        }
    } catch (e) {
        console.log('Could not fetch server capabilities (server may not be running)');
    }
}

// Check capabilities when page loads
checkServerCapabilities();

// --- AUTOMATIC TRANSCRIPTION ---
// Transcribe audio file using the server's Whisper API integration
async function transcribeAudioFile(file) {
    if (transcriptionInProgress) {
        console.log('Transcription already in progress...');
        return null;
    }

    // Check if transcription is available
    if (!window.serverCapabilities?.transcription?.whisperAvailable) {
        console.log('Automatic transcription not available on server');
        return null;
    }

    transcriptionInProgress = true;
    console.log('Starting automatic transcription...');

    // Update UI to show transcription in progress
    const transcriptionTextEl = document.getElementById('transcription-text');
    const uploadBtn = document.getElementById('upload-btn');

    if (transcriptionTextEl) {
        transcriptionTextEl.placeholder = 'Transcribing audio... please wait...';
        transcriptionTextEl.disabled = true;
    }

    // Show transcription status
    showTranscriptionStatus('transcribing');

    try {
        const formData = new FormData();
        formData.append('audio', file);

        const response = await fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success && data.text) {
            console.log('Transcription successful:', data.text.length, 'characters');
            autoTranscribedText = data.text;

            // Update the transcription text field
            if (transcriptionTextEl) {
                transcriptionTextEl.value = data.text;
                transcriptionTextEl.placeholder = 'What did you say in the recording? Type the exact words here to improve clone accuracy...';
                transcriptionTextEl.disabled = false;

                // Update character count
                const charCountEl = document.getElementById('transcription-char-count');
                if (charCountEl) {
                    charCountEl.textContent = `${data.text.length}/500`;
                }
            }

            // Show success status
            showTranscriptionStatus('success', data.text.length);

            return data.text;
        } else {
            console.log('Transcription failed:', data.error);
            showTranscriptionStatus('failed', 0, data.error);

            // Reset placeholder
            if (transcriptionTextEl) {
                transcriptionTextEl.placeholder = 'Automatic transcription failed. You can type the words manually to improve accuracy...';
                transcriptionTextEl.disabled = false;
            }

            return null;
        }

    } catch (error) {
        console.error('Transcription error:', error);
        showTranscriptionStatus('error', 0, error.message);

        // Reset placeholder
        if (transcriptionTextEl) {
            transcriptionTextEl.placeholder = 'Could not transcribe audio. You can type the words manually...';
            transcriptionTextEl.disabled = false;
        }

        return null;
    } finally {
        transcriptionInProgress = false;
    }
}

// Show transcription status in the UI
function showTranscriptionStatus(status, charCount = 0, errorMessage = '') {
    // Find or create status element
    let statusEl = document.getElementById('transcription-status');
    const transcriptionContainer = document.getElementById('transcription-container');
    const transcriptionBadge = document.getElementById('transcription-badge');
    const transcriptionTextEl = document.getElementById('transcription-text');

    if (!transcriptionContainer) return;

    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'transcription-status';
        statusEl.className = 'flex items-center gap-2 mt-2 text-sm transition-all';
        // Insert after the existing help text
        const existingHelp = transcriptionContainer.querySelector('.flex.justify-between');
        if (existingHelp) {
            existingHelp.insertAdjacentElement('afterend', statusEl);
        } else {
            transcriptionContainer.appendChild(statusEl);
        }
    }

    switch (status) {
        case 'transcribing':
            statusEl.className = 'flex items-center gap-2 mt-2 text-sm text-blue-600';
            statusEl.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Transcribing audio with AI...</span>
            `;
            // Update badge
            if (transcriptionBadge) {
                transcriptionBadge.className = 'text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium animate-pulse';
                transcriptionBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Transcribing...';
            }
            // Add visual feedback to textarea
            if (transcriptionTextEl) {
                transcriptionTextEl.classList.add('border-blue-400', 'bg-blue-50');
            }
            break;
        case 'success':
            statusEl.className = 'flex items-center gap-2 mt-2 text-sm text-green-600';
            statusEl.innerHTML = `
                <i class="fa-solid fa-check-circle"></i>
                <span>Transcription complete (${charCount} characters). Review and edit if needed.</span>
            `;
            // Update badge
            if (transcriptionBadge) {
                transcriptionBadge.className = 'text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium';
                transcriptionBadge.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Auto-Transcribed';
            }
            // Remove visual feedback
            if (transcriptionTextEl) {
                transcriptionTextEl.classList.remove('border-blue-400', 'bg-blue-50');
                transcriptionTextEl.classList.add('border-green-400');
                setTimeout(() => {
                    transcriptionTextEl.classList.remove('border-green-400');
                }, 3000);
            }
            // Auto-hide status after 5 seconds
            setTimeout(() => {
                statusEl.style.opacity = '0';
                setTimeout(() => statusEl.remove(), 300);
            }, 5000);
            break;
        case 'failed':
            statusEl.className = 'flex items-center gap-2 mt-2 text-sm text-yellow-600';
            statusEl.innerHTML = `
                <i class="fa-solid fa-exclamation-triangle"></i>
                <span>Auto-transcription unavailable. You can type manually.</span>
            `;
            // Update badge
            if (transcriptionBadge) {
                transcriptionBadge.className = 'text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium';
                transcriptionBadge.innerHTML = '<i class="fa-solid fa-pencil mr-1"></i>Manual Entry';
            }
            // Remove visual feedback
            if (transcriptionTextEl) {
                transcriptionTextEl.classList.remove('border-blue-400', 'bg-blue-50');
            }
            break;
        case 'error':
            statusEl.className = 'flex items-center gap-2 mt-2 text-sm text-red-600';
            statusEl.innerHTML = `
                <i class="fa-solid fa-times-circle"></i>
                <span>Transcription error: ${errorMessage || 'Unknown error'}</span>
            `;
            // Update badge
            if (transcriptionBadge) {
                transcriptionBadge.className = 'text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium';
                transcriptionBadge.innerHTML = '<i class="fa-solid fa-exclamation mr-1"></i>Error';
            }
            // Remove visual feedback
            if (transcriptionTextEl) {
                transcriptionTextEl.classList.remove('border-blue-400', 'bg-blue-50');
            }
            break;
        default:
            statusEl.remove();
            // Reset badge
            if (transcriptionBadge) {
                transcriptionBadge.className = 'text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium';
                transcriptionBadge.innerHTML = '<i class="fa-solid fa-magic-wand-sparkles mr-1"></i>AI Transcription';
            }
    }
}

// Update transcription badge based on server capabilities
function updateTranscriptionBadgeAvailability() {
    const transcriptionBadge = document.getElementById('transcription-badge');
    const labelHint = document.getElementById('transcription-label-hint');

    if (!transcriptionBadge) return;

    if (window.serverCapabilities?.transcription?.whisperAvailable) {
        transcriptionBadge.className = 'text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium';
        transcriptionBadge.innerHTML = '<i class="fa-solid fa-magic-wand-sparkles mr-1"></i>AI Transcription';
        if (labelHint) {
            labelHint.textContent = '(Auto-detected or enter manually)';
        }
    } else {
        transcriptionBadge.className = 'text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium';
        transcriptionBadge.innerHTML = '<i class="fa-solid fa-pencil mr-1"></i>Manual Entry';
        if (labelHint) {
            labelHint.textContent = '(Enter manually)';
        }
    }
}

// Provide format recommendation based on browser
function getFormatRecommendation() {
    const browser = detectBrowser();
    const hasServerConversion = window.serverCapabilities?.audio?.ffmpegAvailable;

    if (browser === 'safari') {
        return {
            canRecord: true,
            format: 'M4A/AAC',
            notes: 'Safari records in M4A format which is natively supported by Fish Audio.',
            recommendation: 'Recording is fully supported.'
        };
    } else if (browser === 'chrome' || browser === 'edge') {
        return {
            canRecord: true,
            format: 'WebM/Opus',
            notes: hasServerConversion
                ? 'Chrome records in WebM format. Server will convert to WAV for Fish Audio.'
                : 'Chrome records in WebM format. Server conversion not available - upload may fail.',
            recommendation: hasServerConversion
                ? 'Recording is fully supported with server-side conversion.'
                : 'For best results, upload an MP3 or WAV file instead of recording.'
        };
    } else if (browser === 'firefox') {
        return {
            canRecord: true,
            format: 'WebM/Opus or OGG',
            notes: hasServerConversion
                ? 'Firefox records in WebM/OGG format. Server will convert to WAV for Fish Audio.'
                : 'Firefox records in WebM/OGG format. Server conversion not available - upload may fail.',
            recommendation: hasServerConversion
                ? 'Recording is fully supported with server-side conversion.'
                : 'For best results, upload an MP3 or WAV file instead of recording.'
        };
    }

    return {
        canRecord: true,
        format: 'Unknown',
        notes: 'Your browser may have limited recording support.',
        recommendation: 'For best results, use Chrome, Firefox, or Safari, or upload an MP3/WAV file.'
    };
}

// Start Recording with enhanced cross-browser support
async function startRecording() {
    // First, check if recording is supported
    const support = checkRecordingSupport();
    if (!support.supported) {
        alert('Recording not supported:\n\n' + support.issues.join('\n'));
        return;
    }

    try {
        // Request microphone access with optimized audio constraints
        // These settings help ensure consistent audio quality across browsers
        const audioConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000,  // 48kHz is standard for Opus codec
                channelCount: 1     // Mono is sufficient for voice and reduces file size
            }
        };

        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        console.log('Microphone access granted');

        // Get supported MIME type for cross-browser compatibility
        const mimeType = getSupportedMimeType();

        // Initialize MediaRecorder with supported MIME type and quality settings
        const recorderOptions = {};
        if (mimeType) {
            recorderOptions.mimeType = mimeType;
        }

        // Set audio bitrate for good quality voice recording
        // Note: audioBitsPerSecond may not work in all browsers, but it's harmless to set
        // Avoid setting very high bitrates (like 510kbps) as it can cause Safari compatibility issues
        recorderOptions.audioBitsPerSecond = 128000; // 128 kbps - good balance of quality and size

        try {
            mediaRecorder = new MediaRecorder(stream, recorderOptions);
        } catch (e) {
            console.warn('Failed to create MediaRecorder with options, trying without:', e);
            // Fallback: try without specific options
            mediaRecorder = new MediaRecorder(stream);
        }

        // Store the actual MIME type being used (may differ from requested)
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/mp4';
        const fileExtension = getFileExtension(actualMimeType);

        console.log('MediaRecorder initialized:');
        console.log('  Requested MIME type:', mimeType || '(browser default)');
        console.log('  Actual MIME type:', actualMimeType);
        console.log('  File extension:', fileExtension);

        audioChunks = [];
        recordingTimeLeft = 30;

        // Collect audio data in chunks
        // Using timeslice (1000ms) ensures we get regular data chunks for progress tracking
        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            alert('Recording error: ' + (event.error?.message || 'Unknown error'));
            stopRecording();
        };

        mediaRecorder.onstop = async () => {
            console.log('Recording stopped, processing audio...');
            console.log('Audio chunks collected:', audioChunks.length);

            // Create audio blob with the actual MIME type used by MediaRecorder
            const audioBlob = new Blob(audioChunks, { type: actualMimeType });
            console.log('Audio blob created:', audioBlob.size, 'bytes');

            // Convert to File object with appropriate extension
            const fileName = `voice-recording-${Date.now()}.${fileExtension}`;
            selectedFile = new File([audioBlob], fileName, {
                type: actualMimeType
            });

            console.log('File created:', fileName, 'Type:', actualMimeType);

            // Create audio URL for playback
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioPlayer = document.getElementById('recorded-audio-playback');

            // Handle potential playback errors (especially for WebM in older Safari)
            audioPlayer.onerror = (e) => {
                console.warn('Audio playback error:', e);
                // The file may still be uploadable even if not playable locally
                const playbackWarning = document.createElement('p');
                playbackWarning.className = 'text-yellow-600 text-sm mt-2';
                playbackWarning.textContent = 'Preview not available in this browser, but the recording can still be uploaded.';
                audioPlayer.parentNode.appendChild(playbackWarning);
            };

            audioPlayer.src = audioUrl;

            // Enable upload button
            document.getElementById('upload-btn').disabled = false;

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            // Show complete state
            document.getElementById('record-idle').classList.add('hidden');
            document.getElementById('record-active').classList.add('hidden');
            document.getElementById('record-complete').classList.remove('hidden');

            const duration = 30 - recordingTimeLeft;
            document.getElementById('record-duration').textContent = `${duration} seconds recorded`;

            // Show format info for debugging
            console.log('Recording complete:');
            console.log('  Duration:', duration, 'seconds');
            console.log('  File size:', (selectedFile.size / 1024).toFixed(2), 'KB');
            console.log('  Format:', actualMimeType);

            // Reset any previous auto-transcription
            autoTranscribedText = null;

            // Trigger automatic transcription in the background
            if (window.serverCapabilities?.transcription?.whisperAvailable) {
                console.log('Starting automatic transcription of recording...');
                transcribeAudioFile(selectedFile);
            }
        };

        // Start recording with timeslice to get regular data chunks
        // This helps with progress feedback and reduces memory usage for long recordings
        mediaRecorder.start(1000); // Get data every 1 second

        // Update UI
        document.getElementById('record-idle').classList.add('hidden');
        document.getElementById('record-active').classList.remove('hidden');
        document.getElementById('record-complete').classList.add('hidden');
        document.getElementById('record-btn').innerHTML = '<i class="fa-solid fa-stop mr-2"></i> Stop Recording';
        document.getElementById('record-btn').classList.remove('bg-red-500', 'hover:bg-red-600');
        document.getElementById('record-btn').classList.add('bg-black', 'hover:bg-gray-800');

        // Start countdown timer
        recordingTimer = setInterval(() => {
            recordingTimeLeft--;
            const minutes = Math.floor(recordingTimeLeft / 60);
            const seconds = recordingTimeLeft % 60;
            document.getElementById('record-timer').textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (recordingTimeLeft <= 0) {
                stopRecording();
            }
        }, 1000);

    } catch (error) {
        console.error('Error accessing microphone:', error);

        // Provide specific error messages for common issues
        let errorMessage = 'Could not access microphone.';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings and try again.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = 'Microphone is in use by another application. Please close other apps using the microphone and try again.';
        } else if (error.name === 'OverconstrainedError') {
            // Try again without constraints
            console.log('Retrying with basic audio constraints...');
            try {
                const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Recursively call with basic stream would be complex, so just inform user
                basicStream.getTracks().forEach(track => track.stop());
                errorMessage = 'Your microphone may not support all audio settings. Please try again.';
            } catch (e2) {
                errorMessage = 'Could not access microphone with any settings.';
            }
        } else {
            errorMessage = `Could not access microphone: ${error.message || error.name || 'Unknown error'}`;
        }

        alert(errorMessage);
    }
}

// Stop Recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        clearInterval(recordingTimer);

        // Reset button
        document.getElementById('record-btn').innerHTML = '<i class="fa-solid fa-circle mr-2"></i> Record Again';
        document.getElementById('record-btn').classList.add('bg-red-500', 'hover:bg-red-600');
        document.getElementById('record-btn').classList.remove('bg-black', 'hover:bg-gray-800');
    }
}

// Upload Voice to Fish Audio API with cross-browser format handling
async function uploadVoice() {
    if (!selectedFile) {
        alert('Please select an audio file first');
        return;
    }

    const uploadBtn = document.getElementById('upload-btn');
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    uploadBtn.disabled = true;
    progressDiv.classList.remove('hidden');

    // Log file details for debugging
    console.log('=== Starting Upload ===');
    console.log('File name:', selectedFile.name);
    console.log('File type:', selectedFile.type);
    console.log('File size:', (selectedFile.size / 1024).toFixed(2), 'KB');
    console.log('Browser:', detectBrowser());

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('audio', selectedFile);
        formData.append('name', `Voice Clone ${Date.now()}`);

        // Get transcription text if provided (improves clone quality)
        const transcriptionTextEl = document.getElementById('transcription-text');
        const transcriptionText = transcriptionTextEl ? transcriptionTextEl.value.trim() : '';
        if (transcriptionText) {
            formData.append('text', transcriptionText);
            console.log('Transcription text included:', transcriptionText.length, 'characters');
            console.log('Transcription preview:', transcriptionText.substring(0, 50) + (transcriptionText.length > 50 ? '...' : ''));
        } else {
            console.log('No transcription text provided (optional but recommended for better quality)');
        }

        // Check if transcription is available and if user has provided text
        const hasUserTranscription = transcriptionText && transcriptionText.length > 0;
        const willAutoTranscribe = window.serverCapabilities?.transcription?.whisperAvailable && !hasUserTranscription;

        // Simulate progress (since fetch doesn't support progress events for uploads easily)
        let progress = 0;
        progressText.textContent = 'Preparing upload...';

        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress <= 25) {
                progressBar.style.width = progress + '%';
                progressText.textContent = `Uploading audio... ${progress}%`;
            } else if (progress <= 50) {
                progressBar.style.width = progress + '%';
                if (willAutoTranscribe) {
                    progressText.textContent = `Transcribing audio with AI... ${progress}%`;
                } else {
                    progressText.textContent = `Processing audio format... ${progress}%`;
                }
            } else if (progress <= 75) {
                progressBar.style.width = progress + '%';
                progressText.textContent = `Analyzing voice patterns... ${progress}%`;
            } else if (progress <= 90) {
                progressBar.style.width = progress + '%';
                progressText.textContent = `Creating voice model... ${progress}%`;
            }
        }, 300);

        // Upload to backend
        const response = await fetch(`${API_URL}/voice/upload`, {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);

        // Parse response
        const data = await response.json();

        if (!response.ok) {
            // Handle specific error cases
            console.error('Upload failed:', data);

            let errorMessage = data.error || 'Upload failed';

            // Check for format-specific errors
            if (data.details && typeof data.details === 'string') {
                if (data.details.includes('format') || data.details.includes('mime')) {
                    const browser = detectBrowser();
                    if (browser === 'safari') {
                        errorMessage += '\n\nSafari recording format issue detected. Try:\n' +
                            '1. Recording with Chrome or Firefox instead\n' +
                            '2. Uploading an MP3 or WAV file directly';
                    } else if (browser === 'firefox') {
                        errorMessage += '\n\nFirefox recording format issue detected. Try:\n' +
                            '1. Recording with Chrome instead\n' +
                            '2. Uploading an MP3 or WAV file directly';
                    }
                }
            }

            if (data.suggestion) {
                errorMessage += '\n\nSuggestion: ' + data.suggestion;
            }

            throw new Error(errorMessage);
        }

        currentModelId = data.modelId;

        // Log success info
        console.log('Upload successful!');
        console.log('Model ID:', currentModelId);
        if (data.formatInfo) {
            console.log('Format info:', data.formatInfo);
        }
        if (data.transcription) {
            console.log('Transcription info:', data.transcription);
        }

        // Complete progress
        progressBar.style.width = '100%';

        // Show transcription result in progress text
        if (data.transcription && data.transcription.source === 'auto') {
            progressText.textContent = `Upload complete! Auto-transcribed ${data.transcription.characterCount} characters.`;
        } else if (data.transcription && data.transcription.source === 'user') {
            progressText.textContent = 'Upload complete with your transcription!';
        } else {
            progressText.textContent = 'Upload complete!';
        }

        // Show format conversion info if applicable
        if (data.formatInfo && data.formatInfo.converted) {
            console.log(`Audio was converted from ${data.formatInfo.originalFormat} to ${data.formatInfo.uploadedFormat}`);
        }

        // Store server transcription if available (for reference)
        if (data.transcription && data.transcription.text) {
            autoTranscribedText = data.transcription.text;
        }

        setTimeout(() => {
            // Move to step 2
            document.getElementById('clone-step-1').classList.add('hidden');
            document.getElementById('clone-step-2').classList.remove('hidden');
            document.getElementById('model-id').value = currentModelId;
        }, 1000);

    } catch (error) {
        console.error('Upload error:', error);

        // Reset UI
        progressBar.style.width = '0%';
        uploadBtn.disabled = false;
        progressDiv.classList.add('hidden');

        // Show user-friendly error
        alert(error.message || 'Failed to upload voice. Please try again.');
    }
}

// Character count for script text
document.getElementById('script-text').addEventListener('input', (e) => {
    document.getElementById('char-count').textContent = e.target.value.length;
});

// Character count for transcription text (if element exists)
const transcriptionTextArea = document.getElementById('transcription-text');
if (transcriptionTextArea) {
    transcriptionTextArea.addEventListener('input', (e) => {
        const charCountEl = document.getElementById('transcription-char-count');
        if (charCountEl) {
            charCountEl.textContent = `${e.target.value.length}/500`;
        }
    });
}

// Generate Speech
async function generateSpeech() {
    const scriptText = document.getElementById('script-text').value.trim();

    if (!scriptText) {
        alert('Please enter some text to generate');
        return;
    }

    if (!currentModelId) {
        alert('No voice model found. Please upload your voice first.');
        return;
    }

    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Generating...';

    try {
        const response = await fetch(`${API_URL}/voice/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modelId: currentModelId,
                text: scriptText
            })
        });

        if (!response.ok) {
            throw new Error('Generation failed');
        }

        const data = await response.json();
        currentAudioUrl = data.audioUrl;

        // Move to step 3
        document.getElementById('clone-step-2').classList.add('hidden');
        document.getElementById('clone-step-3').classList.remove('hidden');

        // Set audio source
        const audioElement = document.getElementById('generated-audio');
        audioElement.src = currentAudioUrl;

    } catch (error) {
        console.error('Generation error:', error);
        alert('Failed to generate speech. Please try again.');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fa-solid fa-microphone mr-2"></i> Generate Voice';
    }
}

// Download Audio
function downloadAudio() {
    if (!currentAudioUrl) {
        alert('No audio available to download');
        return;
    }

    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = `voice-clone-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Waitlist Form
function handleWaitlistSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('waitlist-email').value;
    const type = document.getElementById('waitlist-type').value;

    // Send to backend
    fetch(`${API_URL}/waitlist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, type })
    })
    .then(response => response.json())
    .then(data => {
        alert('Thanks for joining the waitlist! We\'ll be in touch soon.');
        event.target.reset();
    })
    .catch(error => {
        console.error('Waitlist error:', error);
        alert('Failed to join waitlist. Please try again.');
    });
}

// Close clone modal on outside click
document.getElementById('clone-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCloneModal();
    }
});

// Close signup modal on outside click
document.getElementById('signup-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeSignupModal();
    }
});

// Close modals on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close whichever modal is open
        if (document.getElementById('clone-modal').classList.contains('active')) {
            closeCloneModal();
        }
        if (document.getElementById('signup-modal').classList.contains('active')) {
            closeSignupModal();
        }
    }
});
