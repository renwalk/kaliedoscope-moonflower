let data;

let useCurrentCheckbox;
let moonPhaseSlider;
let reflectionsSlider, ringsSlider, sizeSlider, angleSlider, distanceSlider;

function preload() {
  let today = new Date();
  let month = ('0' + (today.getMonth() + 1)).slice(-2);
  let day = ('0' + today.getDate()).slice(-2);
  let dateStr = today.getFullYear() + '-' + month + '-' + day;
  const url = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/Philadelphia,PA/' + dateStr + '?unitGroup=us&key=9MXXYW449LTYGB7EEG4Q8HBK2&include=days&elements=datetime,moonphase&contentType=json';
  data = loadJSON(url);
}

function setup() {
  createCanvas(700, 700);
  angleMode(DEGREES);
  noStroke();
  createControls();
}

function createControls() {
  let panel = createDiv();
  panel.id('controls');
  panel.style('display', 'flex');
  panel.style('flex-wrap', 'wrap');
  panel.style('gap', '18px');
  panel.style('padding', '14px');
  panel.style('font-family', 'sans-serif');
  panel.style('color', '#eee');
  panel.style('background', '#181818');

  let phaseBlock = createDiv();
  phaseBlock.parent(panel);
  phaseBlock.style('display', 'flex');
  phaseBlock.style('flex-direction', 'column');
  phaseBlock.style('align-items', 'center');

  useCurrentCheckbox = createCheckbox('Use current moon phase', true);
  useCurrentCheckbox.parent(phaseBlock);
  useCurrentCheckbox.style('font-size', '12px');
  useCurrentCheckbox.changed(() => {
    moonPhaseSlider.elt.disabled = useCurrentCheckbox.checked();
  });

  moonPhaseSlider = sliderGroup(panel, 'Moon phase', 0, 1, 0.22, 0.001).slider;
  moonPhaseSlider.elt.disabled = true; // matches checkbox default (checked)

  reflectionsSlider = sliderGroup(panel, 'Reflections', 2, 24, 8, 1).slider;
  ringsSlider = sliderGroup(panel, 'Rings', 1, 8, 3, 1).slider;
  sizeSlider = sliderGroup(panel, 'Size', 10, 120, 50, 1).slider;
  angleSlider = sliderGroup(panel, 'Angle', 0, 360, 0, 1).slider;
  distanceSlider = sliderGroup(panel, 'Distance', 10, 100, 60, 1).slider;
}

function sliderGroup(parent, label, min, max, val, step) {
  let group = createDiv();
  group.parent(parent);
  group.style('display', 'flex');
  group.style('flex-direction', 'column');
  group.style('align-items', 'center');

  let labelSpan = createSpan(label);
  labelSpan.parent(group);
  labelSpan.style('font-size', '12px');

  let slider = createSlider(min, max, val, step);
  slider.parent(group);
  slider.style('width', '120px');

  let valueSpan = createSpan(String(val));
  valueSpan.parent(group);
  valueSpan.style('font-size', '11px');
  valueSpan.style('color', '#999');
  slider.input(() => valueSpan.html(slider.value()));

  return { group, slider, valueSpan };
}

function draw() {
  background(10);

  let moonPhase = (useCurrentCheckbox.checked() && data)
    ? data.days[0].moonphase
    : moonPhaseSlider.value();

  let reflections = reflectionsSlider.value();
  let rings = ringsSlider.value();
  let size = sizeSlider.value();
  let angle = angleSlider.value();
  let distance = distanceSlider.value();

  let segAngle = 360 / reflections;

  push();
  translate(width / 2, height / 2 - 40); // shift up slightly to leave room for the control panel below

  for (let r = 0; r < rings; r++) {
    let radius = distance * (r + 1);
    // Alternate rings offset by half a segment for a woven, flower-like look.
    let ringOffset = angle + (r % 2 === 1 ? segAngle / 2 : 0);

    for (let i = 0; i < reflections; i++) {
      push();
      rotate(i * segAngle + ringOffset);
      translate(radius, 0);
      // Mirror every other segment for true kaleidoscope symmetry.
      if (i % 2 === 1) scale(-1, 1);
      drawMoon(0, 0, size, moonPhase);
      pop();
    }
  }
  pop();

  fill(200);
  textAlign(CENTER);
  textSize(12);
  text('phase ' + moonPhase.toFixed(3), width / 2, height - 20);
}

function drawMoon(cx, cy, moonSize, moonPhase) {
  let litRight = moonPhase <= 0.5;
  let illumFraction = (1 - cos(moonPhase * 360)) / 2;

  fill(30);
  ellipse(cx, cy, moonSize, moonSize);

  fill(255);
  if (illumFraction > 0.5) {
    // Gibbous/full: fill the lit half solid, then bulge into the other half.
    if (litRight) arc(cx, cy, moonSize, moonSize, -90, 90, PIE);
    else arc(cx, cy, moonSize, moonSize, 90, 270, PIE);
    let bulgeWidth = 2 * (illumFraction - 0.5) * moonSize;
    if (bulgeWidth > 0.01) {
      if (litRight) arc(cx, cy, bulgeWidth, moonSize, 90, 270, PIE);
      else arc(cx, cy, bulgeWidth, moonSize, -90, 90, PIE);
    }
  } else {
    // Crescent: fill the lit half, then punch the dark color back in from
    // the center outward, leaving a thin sliver against the outer edge.
    if (litRight) arc(cx, cy, moonSize, moonSize, -90, 90, PIE);
    else arc(cx, cy, moonSize, moonSize, 90, 270, PIE);
    let punchWidth = moonSize * (1 - 2 * illumFraction);
    if (punchWidth > 0.01) {
      fill(30);
      if (litRight) arc(cx, cy, punchWidth, moonSize, -90, 90, PIE);
      else arc(cx, cy, punchWidth, moonSize, 90, 270, PIE);
    }
  }
}
