let shapes = [];
let bgColor = "#111111";
let neonColors = ["#FF0055", "#00FF66", "#00DDFF", "#FFD700", "#FF00FF"];

// https://p5js.org/reference/p5.sound/p5.PolySynth/
// Define polysynth
let polySynth;

// Game Vars
let score = 0;
let combo = 0;
let lastKeyTime = 0;


function setup() {
  createCanvas(600, 400);
  noStroke();
  rectMode(CENTER);
  
  // create the synth
  polySynth = new p5.PolySynth();
}

function draw() {
  background(bgColor);
  
  // Combo Timer
  if (millis() - lastKeyTime > 1500) {
    combo = 0;
  }
  
  // Draw Scoreboard
  fill(255, 255, 255, 50);
  textSize(32);
  text("SCORE: " + score, width/2, 50);
  
  // Draw combo pulsing effect if active
  if (combo > 1) {
    let pulse = sin(frameCount * 0.2) * 10;
    fill(255, 215, 0, 150);
    textSize(48 + pulse);
    text(combo + "x COMBO!", width / 2, 100);
  }
  
  // loop backwards through shapes to remove dead shapes and trigger animation changes
  for (let i = shapes.length - 1; i >= 0; i--) {
    let s = shapes[i];
    s.update();
    s.display();
    
    // delete the shape when isDead returns true (not visible)
    if (s.isDead()) {
      shapes.splice(i, 1);
    }
  }
}

// Triggered when user presses keyboard
function keyPressed() {
  // Requires user interaction before starting audio
  userStartAudio();
  
  // update game scores
  combo++;
  score += (1 * combo);
  lastKeyTime = millis();
  
  if (key === ' ') {
    // Spacebar - change color, maybe theme later;
    bgColor = color(random(10,50), random(10,50), random(10,50));
    // Note, Velocity, Seconds from now, Duration  
    polySynth.play('C2', 0.8, 0, 0.5);
  } else if (keyCode >= 48 && keyCode <= 57) {
    let key = map(keyCode, 48, 57, 0, 9);
    let notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
    let noteIndex = int(key);
    polySynth.play(notes[noteIndex], 0.5, 0, 0.2)
    
    shapes.push(new Shape(random(width), random(height), 'number'));
  } else if (keyCode >= 65 && keyCode <= 90) {
    let notes = ['C3', 'D3', 'F3', 'G3', 'A3', 'C4'];
    let randomNote = random(notes);
    polySynth.play(randomNote, 0.5, 0, 0.2)
    
    shapes.push(new Shape(random(width), random(height), 'alpha'));
  }
}

class Shape {
  // Initial shape properties
  // not visible upon creation (due to size, intentional)
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = 0;
    this.c = color(random(neonColors));
    this.alpha = 255;
  }
  
  // increase size and reduce visibility every frame
  update() {
    this.size += 20;
    this.alpha -= 8;
  }
  
  // create the actual shape
  display() {
    // apply alpha from properties to the actual color
    this.c.setAlpha(this.alpha);
    fill(this.c);
    
    if (this.type === 'alpha') {
      circle(this.x, this.y, this.size);
    } else if (this.type === 'number') {
      push();
      translate(this.x, this.y);
      rotate(frameCount * 0.1);
      square(0, 0, this.size);
      pop();
    }
  }
  
  isDead() {
    return this.alpha <= 0;
  }
}