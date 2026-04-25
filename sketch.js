let video;
let prevPixels = null;
let asciiSets = [
  '@#&+929',
  '929929+#@&',
  '@&#929+29'
];
let setIndex = 0;
let colored = false;
let fontSize = 15;
let motionThreshold = 30;
let edgeThreshold = 300;
let updateInterval = 7;
let frameCount_ = 0;
let cachedPixels = null;

const chars = () => asciiSets[setIndex];

function preload() {
  video = createVideo('assets/untitled.mp4');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New');
  video.hide();
  video.loop();
  video.volume(0);
}

function isWarm(r, g, b) {
  const max_ = max(r, g, b);
  const min_ = min(r, g, b);
  const delta = max_ - min_;
  if (delta < 20) return false;
  let hue;
  if (max_ === r) hue = ((g - b) / delta) % 6;
  else if (max_ === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return hue <= 70 || hue >= 330;
}

function getBrightness(pixels, x, y, w, h) {
  if (x < 0 || x >= w || y < 0 || y >= h) return 0;
  const idx = (y * w + x) * 4;
  return pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
}

function draw() {
  background(0);

  fontSize = map(mouseX, 0, width, 6, 20);
  textSize(fontSize);

  const vw = video.width;
  const vh = video.height;
  if (vw === 0 || vh === 0) return;

  const scale = min(width / vw, height / vh);
  const drawW = vw * scale;
  const drawH = vh * scale;
  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;

  image(video, offsetX, offsetY, drawW, drawH);

  video.loadPixels();
  if (video.pixels.length === 0) return;

  frameCount_++;
  if (frameCount_ % updateInterval === 0 || !cachedPixels) {
    cachedPixels = video.pixels.slice();
  }

  const currPixels = cachedPixels;
  const cols = floor(drawW / fontSize);
  const rows = floor(drawH / (fontSize * 1.6));
  const cellW = drawW / cols;
  const cellH = drawH / rows;
  const charset = chars();

  // Render ASCII
  noStroke();
  textAlign(CENTER, CENTER);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = floor((col / cols) * vw);
      const py = floor((row / rows) * vh);
      const idx = (py * vw + px) * 4;

      const r = currPixels[idx];
      const g = currPixels[idx + 1];
      const b = currPixels[idx + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      // Motion detection
      let motionScore = 0;
      if (prevPixels && prevPixels.length === currPixels.length) {
        const dr = currPixels[idx]     - prevPixels[idx];
        const dg = currPixels[idx + 1] - prevPixels[idx + 1];
        const db = currPixels[idx + 2] - prevPixels[idx + 2];
        motionScore = sqrt(dr * dr + dg * dg + db * db);
      }

      // Edge detection (Sobel)
      const b00 = getBrightness(currPixels, px - 1, py - 1, vw, vh);
      const b10 = getBrightness(currPixels, px,     py - 1, vw, vh);
      const b20 = getBrightness(currPixels, px + 1, py - 1, vw, vh);
      const b01 = getBrightness(currPixels, px - 1, py,     vw, vh);
      const b21 = getBrightness(currPixels, px + 1, py,     vw, vh);
      const b02 = getBrightness(currPixels, px - 1, py + 1, vw, vh);
      const b12 = getBrightness(currPixels, px,     py + 1, vw, vh);
      const b22 = getBrightness(currPixels, px + 1, py + 1, vw, vh);

      const gx = -b00 + b20 - 2 * b01 + 2 * b21 - b02 + b22;
      const gy = -b00 - 2 * b10 - b20 + b02 + 2 * b12 + b22;
      const edgeScore = sqrt(gx * gx + gy * gy);

      const hasMotion = motionScore > motionThreshold;
      const hasEdge = edgeScore > edgeThreshold;

      if (!hasMotion && !hasEdge) continue;
      if (brightness < 0.2) continue;
      if (!isWarm(r, g, b)) continue;

      const charIdx = floor(brightness * (charset.length - 1));
      const ch = charset[charIdx];
      const x = offsetX + col * cellW + cellW / 2;
      const y = offsetY + row * cellH + cellH / 2;

      const strength = max(
        map(motionScore, motionThreshold, 200, 0, 1, true),
        map(edgeScore, edgeThreshold, 600, 0, 1, true)
      );
      const alpha = map(strength, 0, 1, 120, 255);

      if (colored) {
        fill(r, g, b, alpha);
      } else {
        fill(255, alpha);
      }

      text(ch, x, y);
    }
  }

  if (frameCount_ % updateInterval === 0) {
    prevPixels = currPixels.slice();
  }


}

function keyPressed() {
  if (key === '1') setIndex = 0;
  if (key === '2') setIndex = 1;
  if (key === '3') setIndex = 2;
  if (key === ' ') {
    if (video.elt.paused) video.play();
    else video.pause();
  }
  if (key === 'q') motionThreshold = max(5, motionThreshold - 5);
  if (key === 'a') motionThreshold += 5;
  if (key === 'w') edgeThreshold = max(10, edgeThreshold - 10);
  if (key === 's') edgeThreshold += 10;
  if (key === 'e') updateInterval = max(1, updateInterval - 1);
  if (key === 'd') updateInterval += 1;
  if (key === 'c') colored = !colored;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

