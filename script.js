// script.js - Professional Video Editor with Aspect Ratio Export

// DOM Elements
const video = document.getElementById('videoPlayer');
const videoWrapper = document.getElementById('videoWrapper');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const previewContainer = document.getElementById('previewContainer');
const uploadHeaderBtn = document.getElementById('uploadBtnHeader');
const uploadPrimaryBtn = document.getElementById('uploadPrimaryBtn');

// Sliders
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const saturationSlider = document.getElementById('saturation');
const volumeSlider = document.getElementById('volume');
const speedSlider = document.getElementById('speed');
const trimStartSlider = document.getElementById('trimStart');
const trimEndSlider = document.getElementById('trimEnd');

// Display elements
const brightnessVal = document.getElementById('brightnessValue');
const contrastVal = document.getElementById('contrastValue');
const saturationVal = document.getElementById('saturationValue');
const volumeVal = document.getElementById('volumeValue');
const speedVal = document.getElementById('speedValue');
const trimStartDisplay = document.getElementById('trimStartDisplay');
const trimEndDisplay = document.getElementById('trimEndDisplay');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');
const selectedRatioLabel = document.getElementById('selectedRatioLabel');
const resolutionLabel = document.getElementById('resolutionLabel');

// State
let videoFile = null;
let currentFilter = 'none';
let textOverlay = '';
let currentRatio = '16/9';
let ffmpeg = null;

// Canvas for text
const textCanvas = document.getElementById('textOverlayCanvas');
let ctx = textCanvas?.getContext('2d');

// ========== ASPECT RATIO HANDLING ==========
const ratioConfig = {
    '16/9': { class: 'ratio-16-9', width: 1920, height: 1080, label: '16:9' },
    '9/16': { class: 'ratio-9-16', width: 1080, height: 1920, label: '9:16' },
    '1/1': { class: 'ratio-1-1', width: 1080, height: 1080, label: '1:1' },
    '4/5': { class: 'ratio-4-5', width: 1080, height: 1350, label: '4:5' },
    '21/9': { class: 'ratio-21-9', width: 2520, height: 1080, label: '21:9' }
};

function setAspectRatio(ratioKey) {
    currentRatio = ratioKey;
    const config = ratioConfig[ratioKey];
    
    // Remove all ratio classes
    Object.keys(ratioConfig).forEach(key => {
        previewContainer.classList.remove(ratioConfig[key].class);
    });
    
    // Add new ratio class
    previewContainer.classList.add(config.class);
    
    // Update UI
    document.querySelectorAll('.ratio-btn').forEach(btn => {
        if (btn.dataset.ratio === ratioKey) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    if (selectedRatioLabel) {
        selectedRatioLabel.textContent = config.label;
    }
    if (resolutionLabel) {
        resolutionLabel.textContent = `${config.width}x${config.height}`;
    }
    
    // Reset canvas size after ratio change
    setTimeout(resizeCanvas, 100);
}

// Add ratio button listeners
document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setAspectRatio(btn.dataset.ratio);
    });
});

// ========== VIDEO UPLOAD ==========
function triggerUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/quicktime,video/webm';
    input.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            loadVideo(e.target.files[0]);
        }
    };
    input.click();
}

function loadVideo(file) {
    videoFile = file;
    const url = URL.createObjectURL(file);
    video.src = url;
    
    videoWrapper.style.display = 'flex';
    uploadPlaceholder.style.display = 'none';
    
    video.onloadedmetadata = () => {
        durationSpan.textContent = video.duration.toFixed(1);
        trimEndSlider.max = 100;
        trimStartSlider.max = 100;
        trimEndSlider.value = 100;
        trimStartSlider.value = 0;
        trimStartDisplay.textContent = '0.0s';
        trimEndDisplay.textContent = video.duration.toFixed(1) + 's';
        resizeCanvas();
    };
}

uploadHeaderBtn?.addEventListener('click', triggerUpload);
uploadPrimaryBtn?.addEventListener('click', triggerUpload);
uploadPlaceholder?.addEventListener('click', triggerUpload);

// ========== VIDEO FILTERS ==========
function updateVideoFilters() {
    const brightness = brightnessSlider.value / 100;
    const contrast = contrastSlider.value / 100;
    const saturation = saturationSlider.value / 100;
    
    let filterString = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
    if (currentFilter !== 'none') {
        filterString += ` ${currentFilter}`;
    }
    video.style.filter = filterString;
}

brightnessSlider?.addEventListener('input', () => {
    brightnessVal.textContent = brightnessSlider.value + '%';
    updateVideoFilters();
});

contrastSlider?.addEventListener('input', () => {
    contrastVal.textContent = contrastSlider.value + '%';
    updateVideoFilters();
});

saturationSlider?.addEventListener('input', () => {
    saturationVal.textContent = saturationSlider.value + '%';
    updateVideoFilters();
});

// ========== VOLUME & SPEED ==========
volumeSlider?.addEventListener('input', () => {
    video.volume = volumeSlider.value / 100;
    volumeVal.textContent = volumeSlider.value + '%';
});

speedSlider?.addEventListener('input', () => {
    video.playbackRate = parseFloat(speedSlider.value);
    speedVal.textContent = speedSlider.value + 'x';
});

// ========== TRIM FUNCTIONALITY ==========
function updateTrim() {
    if (!video.duration) return;
    const start = (trimStartSlider.value / 100) * video.duration;
    const end = (trimEndSlider.value / 100) * video.duration;
    
    trimStartDisplay.textContent = start.toFixed(1) + 's';
    trimEndDisplay.textContent = end.toFixed(1) + 's';
    
    if (video.currentTime < start || video.currentTime > end) {
        video.currentTime = start;
    }
}

trimStartSlider?.addEventListener('input', updateTrim);
trimEndSlider?.addEventListener('input', updateTrim);

video?.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const start = (trimStartSlider.value / 100) * video.duration;
    const end = (trimEndSlider.value / 100) * video.duration;
    
    if (video.currentTime >= end) {
        video.currentTime = start;
    }
    currentTimeSpan.textContent = video.currentTime.toFixed(1);
});

// ========== TEXT OVERLAY ==========
function resizeCanvas() {
    if (video.videoWidth && textCanvas && videoWrapper) {
        const rect = video.getBoundingClientRect();
        textCanvas.width = rect.width;
        textCanvas.height = rect.height;
        textCanvas.style.width = rect.width + 'px';
        textCanvas.style.height = rect.height + 'px';
        drawTextOnCanvas();
    }
}

function drawTextOnCanvas() {
    if (!ctx || !textCanvas) return;
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    
    if (textOverlay) {
        const fontSize = Math.min(28, textCanvas.width / 15);
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI'`;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText(textOverlay, 20, fontSize + 20);
        ctx.shadowColor = 'transparent';
    }
}

video?.addEventListener('loadeddata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

document.getElementById('applyTextBtn')?.addEventListener('click', () => {
    const input = document.getElementById('textInput');
    textOverlay = input?.value || '';
    drawTextOnCanvas();
});

document.getElementById('removeTextBtn')?.addEventListener('click', () => {
    textOverlay = '';
    drawTextOnCanvas();
});

// ========== FILTERS ==========
const filters = [
    { name: 'None', value: 'none' },
    { name: 'Grayscale', value: 'grayscale(1)' },
    { name: 'Sepia', value: 'sepia(1)' },
    { name: 'Blur', value: 'blur(3px)' },
    { name: 'Vintage', value: 'sepia(0.5) contrast(1.2) brightness(0.9)' },
    { name: 'Cool', value: 'brightness(1.05) saturate(1.1) hue-rotate(10deg)' },
    { name: 'Warm', value: 'brightness(1.02) saturate(1.2) hue-rotate(-10deg)' }
];

function loadFiltersUI() {
    const grid = document.getElementById('filterGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    filters.forEach(filter => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = filter.name;
        btn.onclick = () => {
            currentFilter = filter.value;
            updateVideoFilters();
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        grid.appendChild(btn);
    });
}

// ========== BOTTOM NAVIGATION ==========
const panels = {
    edit: document.getElementById('editPanel'),
    filters: document.getElementById('filtersPanel'),
    text: document.getElementById('textPanel'),
    export: document.getElementById('exportPanel')
};

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const panelName = btn.dataset.panel;
        Object.keys(panels).forEach(key => {
            if (panels[key]) {
                panels[key].style.display = key === panelName ? 'block' : 'none';
            }
        });
        
        if (panelName === 'filters') {
            loadFiltersUI();
        }
    });
});

// ========== EXPORT WITH CROPPING/PADDING FOR ASPECT RATIO ==========
const exportBtn = document.getElementById('exportBtn');
const exportStatus = document.getElementById('exportStatus');

async function getVideoDimensions(videoFile) {
    return new Promise((resolve) => {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = URL.createObjectURL(videoFile);
        tempVideo.onloadedmetadata = () => {
            URL.revokeObjectURL(tempVideo.src);
            resolve({ width: tempVideo.videoWidth, height: tempVideo.videoHeight });
        };
    });
}

exportBtn?.addEventListener('click', async () => {
    if (!videoFile) {
        if (exportStatus) exportStatus.textContent = '⚠️ No video loaded!';
        return;
    }
    
    if (exportStatus) exportStatus.textContent = '📦 Loading FFmpeg (~25MB)...';
    
    if (!ffmpeg) {
        try {
            const { FFmpeg } = FFmpegWASM;
            ffmpeg = new FFmpeg();
            await ffmpeg.load();
        } catch (err) {
            if (exportStatus) exportStatus.textContent = '❌ Failed to load FFmpeg';
            console.error(err);
            return;
        }
    }
    
    if (exportStatus) exportStatus.textContent = '🎬 Processing video with ratio crop...';
    
    try {
        const fileName = 'input.mp4';
        const outputName = 'output.mp4';
        
        const data = new Uint8Array(await videoFile.arrayBuffer());
        await ffmpeg.writeFile(fileName, data);
        
        // Get target dimensions from selected ratio
        const target = ratioConfig[currentRatio];
        const targetWidth = target.width;
        const targetHeight = target.height;
        
        // Get original video dimensions
        const originalDims = await getVideoDimensions(videoFile);
        const originalWidth = originalDims.width;
        const originalHeight = originalDims.height;
        
        // Calculate scale and crop to fit target ratio
        const targetAspect = targetWidth / targetHeight;
        const originalAspect = originalWidth / originalHeight;
        
        let scale, cropWidth, cropHeight, cropX, cropY;
        
        if (originalAspect > targetAspect) {
            // Video is wider - crop width
            scale = targetHeight / originalHeight;
            cropWidth = targetWidth / scale;
            cropHeight = originalHeight;
            cropX = (originalWidth - cropWidth) / 2;
            cropY = 0;
        } else {
            // Video is taller - crop height
            scale = targetWidth / originalWidth;
            cropWidth = originalWidth;
            cropHeight = targetHeight / scale;
            cropX = 0;
            cropY = (originalHeight - cropHeight) / 2;
        }
        
        // FFmpeg crop and scale filter
        const cropFilter = `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},scale=${targetWidth}:${targetHeight}`;
        
        // Build adjustment filter
        const b = (brightnessSlider.value - 100) / 100;
        const c = (contrastSlider.value - 100) / 100;
        const s = (saturationSlider.value - 100) / 100;
        let eqFilter = `eq=brightness=${b}:contrast=${1 + c}:saturation=${1 + s}`;
        
        // Combine filters
        let filterChain = `${cropFilter},${eqFilter}`;
        
        // Add text if present
        if (textOverlay) {
            const safeText = textOverlay.replace(/'/g, "\\'");
            filterChain += `,drawtext=text='${safeText}':fontcolor=white:fontsize=48:x=40:y=60`;
        }
        
        // Apply current filter preset
        let filterValue = '';
        if (currentFilter !== 'none') {
            if (currentFilter === 'grayscale(1)') filterValue = 'hue=s=0';
            else if (currentFilter === 'sepia(1)') filterValue = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
            else if (currentFilter === 'blur(3px)') filterValue = 'boxblur=5:1';
            else filterValue = '';
            
            if (filterValue) {
                filterChain += `,${filterValue}`;
            }
        }
        
        // Trim values
        const startTrim = (trimStartSlider.value / 100) * video.duration;
        const endTrim = (trimEndSlider.value / 100) * video.duration;
        const durationTrim = endTrim - startTrim;
        
        // Execute FFmpeg
        await ffmpeg.exec([
            '-i', fileName,
            '-vf', filterChain,
            '-ss', startTrim.toString(),
            '-t', durationTrim.toString(),
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            outputName
        ]);
        
        const outputData = await ffmpeg.readFile(outputName);
        const blob = new Blob([outputData.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_${target.label}.mp4`;
        a.click();
        
        if (exportStatus) exportStatus.textContent = '✅ Export complete!';
        URL.revokeObjectURL(url);
        
    } catch (err) {
        if (exportStatus) exportStatus.textContent = '❌ Export failed: ' + err.message;
        console.error(err);
    }
});

// Initialize
loadFiltersUI();
setAspectRatio('16/9');

// Set initial panel visibility
if (panels.filters) panels.filters.style.display = 'none';
if (panels.text) panels.text.style.display = 'none';
if (panels.export) panels.export.style.display = 'none';