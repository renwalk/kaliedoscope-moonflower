let data;

// Simplified lunar orbit constants (mean elements) used to approximate the
// Moon's current distance and angular diameter. This is a first-order Kepler
// approximation (mean anomaly used in place of true anomaly) -- accurate to
// roughly 1-2%, good enough for a dashboard readout, not for navigation.
const MOON_SEMI_MAJOR_AXIS_KM = 384400;
const MOON_ECCENTRICITY = 0.0549;
const MOON_ANOMALISTIC_MONTH_DAYS = 27.55455;
const MOON_PERIGEE_EPOCH = new Date('2000-01-06T05:00:00Z');
const MOON_DIAMETER_KM = 3474.8;
const KM_TO_MILES = 0.621371;

let useCurrentCheckbox, playButton, statusDot;
let titleSubtitle, telPhase, telIllum, telDistance, telAngular;
let moonThumb, thumbGfx;

let moonPhaseSlider, moonPhaseGroup;
let reflectionsSlider, ringsSlider, sizeSlider, angleSlider, distanceSlider, opacitySlider, speedSlider;
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
  wireStaticControls();
  buildSliders();

  let canvasContainer = select('#canvas-container');
  let cnv = createCanvas(700, 700);
  cnv.parent(canvasContainer);

  moonThumb = select('#moon-thumb');
  thumbGfx = createGraphics(moonThumb.width, moonThumb.height);
  thumbGfx.parent(moonThumb);

  angleMode(DEGREES);
  noStroke();
}

function wireStaticControls() {
  statusDot = select('#status-dot');
  titleSubtitle = select('#title-subtitle');
  telPhase = select('#tel-phase');
  telIllum = select('#tel-illum');
  telDistance = select('#tel-distance');
  telAngular = select('#tel-angular');

  useCurrentCheckbox = checkboxRow(select('#checkbox-slot'), 'Use current moon phase', true);
  useCurrentCheckbox.changed(() => {
    moonPhaseSlider.elt.disabled = useCurrentCheckbox.elt.checked;
  });

  playButton = select('#play-button');
  playButton.mousePressed(togglePlay);
}

function buildSliders() {
  let container = select('#sliders');

  moonPhaseGroup = sliderRow(container, 'Moon phase', 0, 1, 0.22, 0.001);
  moonPhaseSlider = moonPhaseGroup.slider;
  moonPhaseSlider.elt.disabled = true; // matches checkbox default (checked)

  reflectionsSlider = sliderRow(container, 'Reflections', 2, 24, 8, 1).slider;
  angleSlider = sliderRow(container, 'Angle', 0, 360, 0, 1).slider;
  ringsSlider = sliderRow(container, 'Rings', 1, 8, 3, 1).slider;
  sizeSlider = sliderRow(container, 'Size', 10, 120, 50, 1).slider;
  opacitySlider = sliderRow(container, 'Opacity', 0, 255, 255, 1).slider;
  speedSlider = sliderRow(container, 'Speed', 0.0005, 0.02, 0.0025, 0.0005).slider;
  distanceSlider = sliderRow(container, 'Distance', 10, 100, 60, 1).slider;
}

// Custom checkbox (Figma dashboard style): a plain <label> wrapping a fully
// transparent native checkbox for real interaction, plus decorative
// box/text spans that react to it purely via CSS sibling selectors.
function checkboxRow(parent, label, checked) {
  let row = createElement('label');
  row.parent(parent);
  row.class('checkbox-row');

  let input = createElement('input');
  input.parent(row);
  input.attribute('type', 'checkbox');
  input.elt.checked = checked;

  let box = createDiv();
  box.parent(row);
  box.class('checkbox-box');

  let text = createSpan(label);
  text.parent(row);
  text.class('checkbox-text');

  return input;
}

function togglePlay() {
  isPlaying = !isPlaying;
  playButton.html('<span class="play-icon">' + (isPlaying ? '❚❚' : '▶') + '</span> ' + (isPlaying ? 'Pause' : 'Play'));
  statusDot.class(isPlaying ? 'status-dot active' : 'status-dot');

  if (isPlaying) {
    // Animating the phase only makes sense against the manual slider.
    useCurrentCheckbox.elt.checked = false;
    useCurrentCheckbox.elt.disabled = true;
    moonPhaseSlider.elt.disabled = false;
  } else {
    useCurrentCheckbox.elt.disabled = false;
  }
}

// Builds the thin-line "sci-fi" slider look (Figma dashboard style): a
// background line, a filled portion, and a tick mark, all driven from a
// fully transparent native range input layered on top to keep real
// drag/keyboard accessibility.
function sliderRow(parent, label, min, max, val, step) {
  let row = createDiv();
  row.parent(parent);
  row.class('control-row');

  let labelSpan = createSpan(label);
  labelSpan.parent(row);
  labelSpan.class('control-label');

  let track = createDiv();
  track.parent(row);
  track.class('slider-track');

  let trackBg = createDiv();
  trackBg.parent(track);
  trackBg.class('slider-track-bg');

  let fill = createDiv();
  fill.parent(trackBg);
  fill.class('slider-track-fill');

  let tick = createDiv();
  tick.parent(trackBg);
  tick.class('slider-thumb-tick');

  let slider = createSlider(min, max, val, step);
  slider.parent(track);

  let valueSpan = createSpan(String(val));
  valueSpan.parent(row);
  valueSpan.class('control-value');

  function refresh() {
    let pct = ((slider.value() - min) / (max - min)) * 100;
    fill.style('width', pct + '%');
    tick.style('left', pct + '%');
    valueSpan.html(slider.value());
  }

  slider.input(refresh);
  refresh();

  return { row, slider, valueSpan, refresh };
}

function draw() {
  background(10);

  if (isPlaying) {
    let next = moonPhaseSlider.value() + speedSlider.value();
    if (next >= 1) next -= 1;
    moonPhaseSlider.value(next);
    moonPhaseGroup.refresh(); // updates the track fill/tick position too, not just the number
  }

  let usingCurrent = useCurrentCheckbox.elt.checked && data;
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
      drawMoonOn(window, 0, 0, size, moonPhase, opacity);
      pop();
    }
  }
  pop();

  drawThumbnail(moonPhase);
  updateTelemetry(usingCurrent, moonPhase);
}

function drawThumbnail(moonPhase) {
  thumbGfx.background(0);
  thumbGfx.noStroke();
  let d = min(thumbGfx.width, thumbGfx.height) * 0.8;
  let cx = thumbGfx.width / 2;
  let cy = thumbGfx.height / 2;

  // Unlike the main flower (which needs the night side fully transparent so
  // overlapping petals blend), the thumbnail is a single icon: it needs a
  // visible disc behind the crescent (fill + outline) so thin phases still
  // read clearly instead of nearly disappearing against a plain black square.
  thumbGfx.stroke(255, 220);
  thumbGfx.strokeWeight(2);
  thumbGfx.fill(110);
  thumbGfx.ellipse(cx, cy, d, d);
  thumbGfx.noStroke();

  drawMoonOn(thumbGfx, cx, cy, d, moonPhase, 255);
}

function updateTelemetry(usingCurrent, moonPhase) {
  let name = phaseLabel(moonPhase);
  let illumPct = round(((1 - cos(moonPhase * 360)) / 2) * 100);

  let distanceKm = moonDistanceKm(new Date());
  let distanceMiles = distanceKm * KM_TO_MILES;
  let angularArcsec = angularDiameterArcsec(distanceKm);

  titleSubtitle.html('Kaleidoscope · ' + name);
  telPhase.html(name);
  telIllum.html(illumPct + '%');
  telDistance.html(Math.round(distanceMiles).toLocaleString() + ' mi');
  telAngular.html(angularArcsec.toFixed(1) + ' arcsec');
}

// First-order Kepler approximation of the Moon's distance from Earth (km),
// using mean anomaly since a known perigee in place of true anomaly.
function moonDistanceKm(date) {
  let daysSincePerigee = (date - MOON_PERIGEE_EPOCH) / 86400000;
  let meanAnomalyDeg = (360 * (daysSincePerigee / MOON_ANOMALISTIC_MONTH_DAYS)) % 360;
  return MOON_SEMI_MAJOR_AXIS_KM * (1 - MOON_ECCENTRICITY * cos(meanAnomalyDeg));
}

function angularDiameterArcsec(distanceKm) {
  let angleRad = 2 * Math.atan((MOON_DIAMETER_KM / 2) / distanceKm);
  return angleRad * (180 / Math.PI) * 3600;
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
// `g` is either `window` (the global p5 instance, for the main canvas) or a
// p5.Graphics buffer (for the sidebar thumbnail) -- both expose the same
// fill/beginShape/vertex/endShape API.
function drawMoonOn(g, cx, cy, moonSize, moonPhase, opacity) {
  let r = moonSize / 2;
  let fixedSign = moonPhase <= 0.5 ? 1 : -1; // which side stays lit (right/left)
  // Signed horizontal reach of the terminator: same side as fixedSign and
  // near +r for a thin crescent hugging the edge; opposite side and near
  // -r for a nearly-full moon bulging into the other half.
  let termX = fixedSign * r * Math.cos(moonPhase * 2 * Math.PI);

  g.fill(255, opacity);
  g.beginShape();
  for (let thetaDeg = 0; thetaDeg <= 180; thetaDeg += 6) {
    let t = thetaDeg * Math.PI / 180;
    g.vertex(cx + fixedSign * r * Math.sin(t), cy - r * Math.cos(t));
  }
  for (let thetaDeg = 180; thetaDeg >= 0; thetaDeg -= 6) {
    let t = thetaDeg * Math.PI / 180;
    g.vertex(cx + termX * Math.sin(t), cy - r * Math.cos(t));
  }
  g.endShape('close');
}
