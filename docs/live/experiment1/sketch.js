let words = ["Adotonomy", "Ado", "Wish", "Hibana", "Aitakute", "Aishiteru", "Zipangu", "5th Anniversary", "Ao", "Vivarium"];

const canvasSize = 500;
const squaresPerSide = 25;
const squareSize = canvasSize / squaresPerSide;
cliColors = [];

grid = [];
letterStream = [];

bgStartColor = "#000";
bgEndColor = "#2210C9";

modifier = 0.05;
offset = squaresPerSide * 1;
offsetDirection = true;

function setup() {
  createCanvas(canvasSize, canvasSize);
  textAlign(CENTER, CENTER);
  textSize(squareSize * 0.45);
  rectMode(CORNER);
  
  cliColors = [color("#2EFF51"), color("#FAFFFB"), color("#F4F52C"), color("#DB2CF5")];
  
  changerVal = random(0,1);
  
  frameRate(24);
  
  // grid and letter stuff below
  buildLetterStream();
  buildGrid();
}

function calculateModifier() {
  offset += 0.05;
}

function getCellStyle(x, y) {
  // Fixed: The sin wave litterally did all the maths i was trying to do
  // time spent debugging: multiple months. i am truely embarrassed.
  // let mouseWidth = map(mouseX, 0, width, 1, 2);
  // let mouseHeight = map(mouseY, 0, height, 1, 2);
  
  // lets replace this idea because the two directions are overriding each other
  // X = direction, Y = speed?
  let mouseWidth = map(mouseX, 0, width, 1, 2);
  let mouseHeight = map(mouseY, 0, height, 1, 2);
  
  let direction = sin(mouseWidth * 0.5 + offset);
  let speed = sin(mouseHeight * 0.5 + offset);
  
  // 360 - 045 from x = -0 to x = -1
  // 045 - 090 from y = 1 to y = 0
  
  let mouseInteractionVal = x*x*0.1 + y
  let wave = sin(mouseInteractionVal * 0.1 + offset);
  
  let linearGradient = map(wave, -1, 1, 0, 1);
  
  
  bg = lerpColor(color("#1047DF"), color("#070329"), linearGradient);
  fg = random(cliColors);
  
  return {
    bg: bg,
    fg: fg
  }
}

function buildLetterStream() {
  // merge words, scrap spaces, seperate by letter
  let fullText = words.join("").toUpperCase();
  fullText = fullText.replace(" ", "");
  letterStream = fullText.split("");
}

function buildGrid() {
  let letterIndex = 0;
  
  // dont go x to y, go y to x cus thats how you write, horizontally not verticaly
  for (let x = 0; x < squaresPerSide; x++) {
    let row = [];
    
    for (let y = 0; y < squaresPerSide; y++) { 
      let style = getCellStyle(x, y);
      let letter = letterStream[letterIndex % letterStream.length];
      letterIndex++;
      
      row.push({
        letter: letter,
        bg: style.bg,
        fg: style.fg,
        r: 0,
        g: 0,
        b: 0
      });
    }
    
    grid.push(row);
  }
}

function invertColor(color) {
  let invertedVal = 128;
  
  console.log("bgColor: " + color);
  
  let newVal = color + invertedVal;
  
  if (newVal > 255) {
    newVal -= 255;
  }
  
  console.log("inverted text color: " + newVal);
  
  return newVal;
}

function draw() {
  background(220);
  calculateModifier();
  
  
  // maybe a function to override the colors n stuff from here instead of in buildGrid?
  
  for (let x = 0; x < squaresPerSide; x++) {
    for (let y = 0; y < squaresPerSide; y++) {
      // for future reference: any individual calculations between cells should be done here.
      // make sure to define any additional "variables" for a cell in the create grid function first
      // 0,0 - 0,1 - 1,0 - 1,1 (correct coordinate generation)
      
      let sqStyle = getCellStyle(x,y);
      let cell = grid[x][y];
      let px = x * squareSize;
      let py = y * squareSize;
      
      fill(sqStyle.bg);
      noStroke();
      square(px, py, squareSize);
      
      
      // using neighbour color (rgb values), ill create a gradient
      // cell left
      // let cellLeft;
      // let cellRight;
      // let r;
      // let g;
      // let b;
      
      let mouseInteractionVal = x*x*0.1 + y
      let wave = sin(mouseInteractionVal * 0.1 + offset);
      let linearGradient = map(wave, -1, 1, 0, 1);

      
      let textColor = lerpColor(color(bgEndColor), color(bgStartColor), linearGradient);
      
      // filter(INVERT);
      // plan b, using bg color for cell, just add 255/2 each time
      
//       console.log(grid[x][y]);
//       console.log(r);
//       console.log(g);
//       console.log(b);
      
//       let invertedR = invertColor(r);
//       let invertedG = invertColor(g);
//       let invertedB = invertColor(b);
      
      
      fill(sqStyle.fg);
      noStroke();
      text(cell.letter, px + squareSize / 2, py + squareSize /2);
      // fill(sqStyle.fg);
      // noStroke();
      // text(cell.letter, px + squareSize / 2, py + squareSize / 2);
    }
  }
}