let data;

// Styling for the caption drawn on the canvas itself (name/date/phase text).
// This lives here rather than in style.css because it's rendered as pixels
// inside the <canvas>, not as HTML text, so CSS can't reach it.
const CAPTION_COLOR = 200;
const CAPTION_SIZE = 12;

let useCurrentCheckbox;
let moonPhaseSlider, moonPhaseGroup;
let reflectionsSlider, ringsSlider, sizeSlider, angleSlider, distanceSlider, opacitySlider;
let playButton, speedSlider;
let isPlaying = false;

function preload() {
  let today = new Date();
  let month = ('0' + (today.getMonth() + 1)).slice(-2);
  let day = ('0' + today.getDate()).slice(-2);
  let dateStr = today.getFullYear() + '-' + month + '-' + day;
  const url = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/Philadelphia,PA/' + dateStr + '?unitGroup=us&key=9MXXYW449LTYGB7EEG4Q8HBK2&include=days&elements=datetime,moonphase&contentType=json';
  data = loadJSON(url);
}

function setup() {
  createControls();

  let canvasContainer = createDiv();
  canvasContainer.id('canvas-container');
  let cnv = createCanvas(700, 700);
  cnv.parent(canvasContainer);

  angleMode(DEGREES);
  noStroke();
}

function createControls() {
  let panel = createDiv();
  panel.id('controls');

  let title = createElement('h1', 'Moonflower');
  title.parent(panel);
  title.class('sidebar-title');

  let intro = createP('A kaleidoscope built from the current — or any — moon phase. Adjust the shape with the controls below.');
  intro.parent(panel);
  intro.class('sidebar-intro');

  useCurrentCheckbox = createCheckbox('Use current moon phase', true);
  useCurrentCheckbox.parent(panel);
  useCurrentCheckbox.class('use-current-checkbox');
  useCurrentCheckbox.changed(() => {
    moonPhaseSlider.elt.disabled = useCurrentCheckbox.checked();
  });

  moonPhaseGroup = sliderGroup(panel, 'Moon phase', 0, 1, 0.22, 0.001);
  moonPhaseSlider = moonPhaseGroup.slider;
  moonPhaseSlider.elt.disabled = true; // matches checkbox default (checked)

  playButton = createButton('Play');
  playButton.parent(panel);
  playButton.id('play-button');
  playButton.mousePressed(togglePlay);

  speedSlider = sliderGroup(panel, 'Speed', 0.0005, 0.02, 0.0025, 0.0005).slider;

  reflectionsSlider = sliderGroup(panel, 'Reflections', 2, 24, 8, 1).slider;
  ringsSlider = sliderGroup(panel, 'Rings', 1, 8, 3, 1).slider;
  sizeSlider = sliderGroup(panel, 'Size', 10, 120, 50, 1).slider;
  angleSlider = sliderGroup(panel, 'Angle', 0, 360, 0, 1).slider;
  distanceSlider = sliderGroup(panel, 'Distance', 10, 100, 60, 1).slider;
  opacitySlider = sliderGroup(panel, 'Opacity', 0, 255, 255, 1).slider;
}

function togglePlay() {
  isPlaying = !isPlaying;
  playButton.html(isPlaying ? 'Pause' : 'Play');

  if (isPlaying) {
    // Animating the phase only makes sense against the manual slider.
    useCurrentCheckbox.checked(false);
    useCurrentCheckbox.elt.disabled = true;
    moonPhaseSlider.elt.disabled = false;
  } else {
    useCurrentCheckbox.elt.disabled = false;
  }
}

function sliderGroup(parent, label, min, max, val, step) {
  let group = createDiv();
  group.parent(parent);
  group.class('control-group');

  let labelSpan = createSpan(label);
  labelSpan.parent(group);
  labelSpan.class('control-label');

  let slider = createSlider(min, max, val, step);
  slider.parent(group);

  let valueSpan = createSpan(String(val));
  valueSpan.parent(group);
  valueSpan.class('control-value');
  slider.input(() => valueSpan.html(slider.value()));

  return { group, slider, valueSpan };
}

function draw() {
  background(10);

  if (isPlaying) {
    let next = moonPhaseSlider.value() + speedSlider.value();
    if (next >= 1) next -= 1;
    moonPhaseSlider.value(next);
    moonPhaseGroup.valueSpan.html(next.toFixed(3));
  }

  let usingCurrent = useCurrentCheckbox.checked() && data;
  let moonPhase = usingCurrent ? data.days[0].moonphase : moonPhaseSlider.value();

  let reflections = reflectionsSlider.value();
  let rings = ringsSlider.value();
  let size = sizeSlider.value();
  let angle = angleSlider.value();
  let distance = distanceSlider.value();
  let opacity = opacitySlider.value();

  let segAngle = 360 / reflections;

  push();
  translate(width / 2, height / 2 - 20);

  for (let r = 0; r < rings; r++) {
    let radius = distance * (r + 1);
    // Alternate rings offset by half a segment for a woven, flower-like look.
    let weaveOffset = r % 2 === 1 ? segAngle / 2 : 0;

    for (let i = 0; i < reflections; i++) {
      push();
      rotate(i * segAngle + weaveOffset); // fixes each motif's position around the ring
      translate(radius, 0);
      // Mirror every other segment for true kaleidoscope symmetry.
      if (i % 2 === 1) scale(-1, 1);
      rotate(angle); // spins the motif in place, independent of its position
      drawMoon(0, 0, size, moonPhase, opacity);
      pop();
    }
  }
  pop();

  fill(CAPTION_COLOR);
  textAlign(CENTER);
  textSize(CAPTION_SIZE);
  if (usingCurrent) {
    text(
      phaseLabel(moonPhase) + '  ·  ' + data.days[0].datetime + '  ·  phase ' + moonPhase.toFixed(3),
      width / 2, height - 20
    );
  } else {
    text(phaseLabel(moonPhase) + '  ·  phase ' + moonPhase.toFixed(3), width / 2, height - 20);
  }
}

function phaseLabel(p) {
  if (p < 0.01 || p > 0.99) return 'New Moon';
  if (p < 0.25) return 'Waxing Crescent';
  if (p < 0.26) return 'First Quarter';
  if (p < 0.49) return 'Waxing Gibbous';
  if (p < 0.51) return 'Full Moon';
  if (p < 0.74) return 'Waning Gibbous';
  if (p < 0.76) return 'Last Quarter';
  return 'Waning Crescent';
}

// Draws only the illuminated sliver as a single closed shape (no dark disc
// underneath), so overlapping petals in the kaleidoscope blend instead of
// one moon's night side opaquely covering the moons behind it.
function drawMoon(cx, cy, moonSize, moonPhase, opacity) {
  let r = moonSize / 2;
  let fixedSign = moonPhase <= 0.5 ? 1 : -1; // which side stays lit (right/left)
  // Signed horizontal reach of the terminator: same side as fixedSign and
  // near +r for a thin crescent hugging the edge; opposite side and near
  // -r for a nearly-full moon bulging into the other half.
  let termX = fixedSign * r * cos(moonPhase * 360);

  fill(255, opacity);
  beginShape();
  for (let theta = 0; theta <= 180; theta += 6) {
    vertex(cx + fixedSign * r * sin(theta), cy - r * cos(theta));
  }
  for (let theta = 180; theta >= 0; theta -= 6) {
    vertex(cx + termX * sin(theta), cy - r * cos(theta));
  }
  endShape(CLOSE);
}
