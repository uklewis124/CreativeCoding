/*
  Invisible Trap Maze - Procedural Grid Version
  ---------------------------------------------

  Concept:
  - The maze is procedurally generated each time.
  - Press R to regenerate a new maze.
  - The real cursor is hidden.
  - The player controls a fake cursor.
  - The fake cursor follows the real mouse smoothly using lerp().
  - Some paths contain invisible trap walls.
  - If the fake cursor hits a wall, it freezes.
  - A transparent real-mouse overlay appears.
  - The fake cursor unlocks only when the real mouse returns to it.

  Maze logic:
  - The maze is a grid of cells.
  - Each cell has top/right/bottom/left edges.
  - Each edge can be:
      OPEN    = passable
      VISIBLE = visible wall
      TRAP    = invisible wall
*/

const OPEN = "open";
const VISIBLE = "visible";
const TRAP = "trap";

let maze;
let player;

let startArea;
let finishArea;

let hasWon = false;
let gameStarted = false;

let mazeSeed;

let radarActive = 0;
let timeLeft = 20 * 60;
let cooldownTimer = 0;

// Keep this true while testing.
// Set it to false for final submission.
let DEBUG_SHOW_INVISIBLE_WALLS = false;

function setup() {
  createCanvas(900, 600);
  noCursor();

  resetGame();
}

function keyPressed() {
  if (key === "r" || key === "R") {
    resetGame();
  }
}

function resetGame() {
  hasWon = false;
  gameStarted = false;
  timeLeft = 20 * 60;
  radarActive = 0;
  cooldownTimer = 0;
  DEBUG_SHOW_INVISIBLE_WALLS = false;

  /*
    Generate a fresh seed each time.
    Date.now() makes the maze different on each page load.
    Math.random() adds extra variation when regenerating quickly.
  */
  mazeSeed = floor((Date.now() + Math.random() * 1000000) % 1000000000);
  randomSeed(mazeSeed);

  maze = new Maze(13, 8, 95, 80, 54, 7, 3, 3);

  maze.generate();

  startArea = maze.getStartArea();
  finishArea = maze.getFinishArea();

  player = new Player(
    startArea.x + startArea.w / 2,
    startArea.y + startArea.h / 2,
    6
  );

  console.log("Maze seed:", mazeSeed);
}

/*
  Main draw loop
*/

function draw() {
  background(246, 243, 232);
  
  if (radarActive > 0) {
    radarActive--;
    
    // flashes between frames 40-30 and again between 20-10
    if ((radarActive > 30) || (radarActive > 10 && radarActive <= 20)) {
      DEBUG_SHOW_INVISIBLE_WALLS = true;
    } else {
      DEBUG_SHOW_INVISIBLE_WALLS = false;
    }
  }
  
  if (cooldownTimer > 0) {
    cooldownTimer--;
  }

  drawPaperTexture();
  drawTitleText();
  drawStartAndFinish();

  maze.draw();
  
  

  if (!gameStarted) {
    drawStartPrompt();

    player.draw();
    player.drawRealMouseOverlay();

    if (pointInsideRect(mouseX, mouseY, startArea)) {
      gameStarted = true;
      player.syncToMouse();
    }
    
    drawSpotlight();

    return;
  }
  
  if (gameStarted && !hasWon) {
    drawSpotlight();
    push();
    fill(255, 50, 50);
    textSize(24);
    textAlign(CENTER, TOP);
    text("TIME: " + ceil(timeLeft / 60), width / 2, 20);
  }

  if (!hasWon) {
    player.update(maze.walls);
    
    timeLeft--;
    // Brutal Restart
    if (timeLeft <- 0) {
      resetGame();
    }

    if (pointInsideRect(player.x, player.y, finishArea)) {
      hasWon = true;
    }
  }

  player.draw();

  if (hasWon) {
    drawWinScreen();
  }
}

/*
  Cell class
  ----------

  Each cell stores the state of its four surrounding edges.

  This is the grid/graph structure.
*/

class Cell {
  constructor(col, row) {
    this.col = col;
    this.row = row;

    this.visited = false;

    this.edges = {
      top: VISIBLE,
      right: VISIBLE,
      bottom: VISIBLE,
      left: VISIBLE
    };
  }
}

/*
  Maze class
  ----------

  Responsible for:
  - creating the grid
  - generating the maze
  - creating controlled extra routes
  - avoiding big open rooms
  - adding invisible traps
  - converting grid edges into Wall objects
*/

class Maze {
  constructor(cols, rows, x, y, cellSize, wallThickness, startRow, finishRow) {
    this.cols = cols;
    this.rows = rows;

    this.x = x;
    this.y = y;

    this.cellSize = cellSize;
    this.wallThickness = wallThickness;

    this.startRow = startRow;
    this.finishRow = finishRow;

    this.grid = [];
    this.walls = [];

    this.invisibleTrapCount = 0;
  }

  generate() {
    this.createGrid();

    /*
      Step 1:
      Generate a proper connected maze.

      This is a "perfect maze":
      every cell is reachable, but there is only one route between cells.
    */
    this.generateBaseMaze();

    /*
      Step 2:
      Add some controlled loops.

      This creates multiple possible routes without opening the maze
      into giant blank rooms.
    */
    this.braidDeadEnds(0.35);
    this.addMazeLikeLoops(10);

    /*
      Step 3:
      Open the entrance and exit.
    */
    this.grid[this.startRow][0].edges.left = OPEN;
    this.grid[this.finishRow][this.cols - 1].edges.right = OPEN;

    /*
      Step 4:
      Add invisible traps.

      These are placed only if pathfinding confirms:
      - the maze remains solvable
      - a nearby alternative route exists
    */
    this.addInvisibleTrapWalls(6);

    console.log(
      "Maze solvable:",
      this.pathExists(
        this.grid[this.startRow][0],
        this.grid[this.finishRow][this.cols - 1]
      )
    );

    /*
      Step 5:
      Convert the logical cell edges into actual rectangle collision walls.
    */
    this.buildWallObjectsFromGrid();
  }

  createGrid() {
    this.grid = [];

    for (let row = 0; row < this.rows; row++) {
      let currentRow = [];

      for (let col = 0; col < this.cols; col++) {
        currentRow.push(new Cell(col, row));
      }

      this.grid.push(currentRow);
    }
  }

  generateBaseMaze() {
    /*
      Depth-first search maze generation.

      Starts with all walls closed.
      Then carves passages until every cell has been visited.
    */

    let stack = [];

    let current = this.grid[this.startRow][0];
    current.visited = true;

    let visitedCount = 1;
    let totalCells = this.cols * this.rows;

    while (visitedCount < totalCells) {
      let neighbours = this.getUnvisitedNeighbours(current);

      if (neighbours.length > 0) {
        let chosen = random(neighbours);

        this.setEdgeBetween(current, chosen.cell, chosen.direction, OPEN);

        stack.push(current);

        current = chosen.cell;
        current.visited = true;

        visitedCount++;
      } else {
        current = stack.pop();
      }
    }
  }

  getUnvisitedNeighbours(cell) {
    let results = [];
    let directions = ["top", "right", "bottom", "left"];

    for (let direction of directions) {
      let neighbour = this.getNeighbour(cell, direction);

      if (neighbour !== null && !neighbour.visited) {
        results.push({
          cell: neighbour,
          direction: direction
        });
      }
    }

    return results;
  }

  /*
    Controlled maze opening
    -----------------------

    These methods add extra routes while preventing large open spaces.
  */

  countOpenEdges(cell) {
    let count = 0;
    let directions = ["top", "right", "bottom", "left"];

    for (let direction of directions) {
      if (cell.edges[direction] === OPEN) {
        count++;
      }
    }

    return count;
  }

  getClosedInternalEdges() {
    /*
      Returns closed edges between cells.

      Only right and bottom are checked to avoid checking the same wall twice.
    */

    let edges = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        let cell = this.grid[row][col];

        let directions = ["right", "bottom"];

        for (let direction of directions) {
          let neighbour = this.getNeighbour(cell, direction);

          if (neighbour !== null && cell.edges[direction] !== OPEN) {
            edges.push({
              cellA: cell,
              cellB: neighbour,
              direction: direction
            });
          }
        }
      }
    }

    return edges;
  }

  wouldCreateOpenSquare(cellA, cellB, direction) {
    /*
      Prevents ugly 2x2 open rooms.

      A maze should have corridors, turns, junctions and dead ends.
      It should not have large blank areas.
    */

    let opposite = this.getOppositeDirection(direction);

    let oldA = cellA.edges[direction];
    let oldB = cellB.edges[opposite];

    // Temporarily open the edge.
    this.setEdgeBetween(cellA, cellB, direction, OPEN);

    let createsOpenSquare = false;

    for (let row = 0; row < this.rows - 1; row++) {
      for (let col = 0; col < this.cols - 1; col++) {
        let topLeft = this.grid[row][col];
        let topRight = this.grid[row][col + 1];
        let bottomLeft = this.grid[row + 1][col];

        /*
          These are the four internal connections inside a 2x2 cell block.

          If all four are open, the block becomes a room.
        */

        let topOpen = topLeft.edges.right === OPEN;
        let leftOpen = topLeft.edges.bottom === OPEN;
        let rightOpen = topRight.edges.bottom === OPEN;
        let bottomOpen = bottomLeft.edges.right === OPEN;

        if (topOpen && leftOpen && rightOpen && bottomOpen) {
          createsOpenSquare = true;
        }
      }
    }

    // Restore the original edge.
    cellA.edges[direction] = oldA;
    cellB.edges[opposite] = oldB;

    return createsOpenSquare;
  }

  canOpenEdgeWithoutMakingRoom(cellA, cellB, direction) {
    /*
      Decides whether an extra route can be opened.

      Rules:
      - Do not open an already open edge.
      - Avoid making cells too open.
      - Avoid creating 2x2 blank spaces.
    */

    if (cellA.edges[direction] === OPEN) {
      return false;
    }

    let degreeA = this.countOpenEdges(cellA);
    let degreeB = this.countOpenEdges(cellB);

    /*
      Prevent cells from becoming too open.
      This keeps the maze looking like corridors instead of rooms.
    */
    if (degreeA >= 3 || degreeB >= 3) {
      return false;
    }

    if (this.wouldCreateOpenSquare(cellA, cellB, direction)) {
      return false;
    }

    return true;
  }

  addMazeLikeLoops(amount) {
    /*
      Adds a limited number of extra routes.

      This gives the user more than one possible path without destroying
      the internal wall structure.
    */

    let candidates = this.getClosedInternalEdges();

    shuffle(candidates, true);

    let opened = 0;

    for (let candidate of candidates) {
      if (opened >= amount) {
        break;
      }

      if (
        this.canOpenEdgeWithoutMakingRoom(
          candidate.cellA,
          candidate.cellB,
          candidate.direction
        )
      ) {
        this.setEdgeBetween(
          candidate.cellA,
          candidate.cellB,
          candidate.direction,
          OPEN
        );

        opened++;
      }
    }
  }

  braidDeadEnds(probability) {
    /*
      Perfect mazes have many dead ends.

      This opens some of those dead ends into loops, creating route choice
      while still keeping the maze narrow and maze-like.
    */

    let deadEnds = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        let cell = this.grid[row][col];

        if (this.countOpenEdges(cell) === 1) {
          deadEnds.push(cell);
        }
      }
    }

    shuffle(deadEnds, true);

    for (let cell of deadEnds) {
      if (random(1) > probability) {
        continue;
      }

      let candidates = [];
      let directions = ["top", "right", "bottom", "left"];

      for (let direction of directions) {
        let neighbour = this.getNeighbour(cell, direction);

        if (
          neighbour !== null &&
          this.canOpenEdgeWithoutMakingRoom(cell, neighbour, direction)
        ) {
          candidates.push({
            neighbour: neighbour,
            direction: direction
          });
        }
      }

      if (candidates.length > 0) {
        let chosen = random(candidates);

        this.setEdgeBetween(
          cell,
          chosen.neighbour,
          chosen.direction,
          OPEN
        );
      }
    }
  }

  /*
    Invisible trap placement
    ------------------------

    A trap is an invisible wall placed on an edge that previously looked open.
  */

  addInvisibleTrapWalls(targetAmount) {
    let candidates = this.findTrapCandidates();

    shuffle(candidates, true);

    /*
      Sort slightly toward the start row and central area.
      This makes traps more likely to appear on routes players actually try.
    */

    candidates.sort((a, b) => {
      return a.score - b.score;
    });

    this.invisibleTrapCount = 0;

    for (let candidate of candidates) {
      if (this.invisibleTrapCount >= targetAmount) {
        break;
      }

      let cellA = candidate.cellA;
      let cellB = candidate.cellB;
      let direction = candidate.direction;

      if (this.canPlaceTrapBetween(cellA, cellB, direction)) {
        this.setEdgeBetween(cellA, cellB, direction, TRAP);
        this.invisibleTrapCount++;
      }
    }
  }

  findTrapCandidates() {
    let candidates = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        let cell = this.grid[row][col];

        /*
          Only right and bottom are checked to avoid duplicate edges.
        */

        let directions = ["right", "bottom"];

        for (let direction of directions) {
          let neighbour = this.getNeighbour(cell, direction);

          if (neighbour !== null && cell.edges[direction] === OPEN) {
            let midCol = (cell.col + neighbour.col) / 2;
            let midRow = (cell.row + neighbour.row) / 2;

            let score =
              abs(midRow - this.startRow) * 2 +
              abs(midCol - this.cols / 2) * 0.3 +
              random(0, 1);

            candidates.push({
              cellA: cell,
              cellB: neighbour,
              direction: direction,
              score: score
            });
          }
        }
      }
    }

    return candidates;
  }

  canPlaceTrapBetween(cellA, cellB, direction) {
    /*
      Temporarily place a trap.
      Then test whether it is fair.

      A fair trap:
      - does not make the maze impossible
      - has a nearby alternative route
    */

    this.setEdgeBetween(cellA, cellB, direction, TRAP);

    let fullMazeStillSolvable = this.pathExists(
      this.grid[this.startRow][0],
      this.grid[this.finishRow][this.cols - 1]
    );

    let localAlternativeExists = this.pathExists(cellA, cellB, 8);

    // Undo temporary trap.
    this.setEdgeBetween(cellA, cellB, direction, OPEN);

    return fullMazeStillSolvable && localAlternativeExists;
  }

  pathExists(startCell, targetCell, maxDepth = Infinity) {
    /*
      Breadth-first search.

      Only OPEN edges are passable.
      VISIBLE and TRAP are both blocked.
    */

    let queue = [
      {
        cell: startCell,
        distance: 0
      }
    ];

    let visited = new Set();
    visited.add(this.cellKey(startCell));

    while (queue.length > 0) {
      let current = queue.shift();

      if (current.cell === targetCell) {
        return true;
      }

      if (current.distance >= maxDepth) {
        continue;
      }

      let directions = ["top", "right", "bottom", "left"];

      for (let direction of directions) {
        if (current.cell.edges[direction] !== OPEN) {
          continue;
        }

        let neighbour = this.getNeighbour(current.cell, direction);

        if (neighbour === null) {
          continue;
        }

        let key = this.cellKey(neighbour);

        if (!visited.has(key)) {
          visited.add(key);

          queue.push({
            cell: neighbour,
            distance: current.distance + 1
          });
        }
      }
    }

    return false;
  }

  /*
    Wall construction
    -----------------

    Converts the logical cell grid into visible/collidable rectangle walls.
  */

  buildWallObjectsFromGrid() {
    this.walls = [];

    let half = this.wallThickness / 2;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        let cell = this.grid[row][col];

        let cellX = this.x + col * this.cellSize;
        let cellY = this.y + row * this.cellSize;

        // Top edge.
        if (cell.edges.top !== OPEN) {
          this.walls.push(
            new Wall(
              cellX - half,
              cellY - half,
              this.cellSize + this.wallThickness,
              this.wallThickness,
              cell.edges.top === VISIBLE
            )
          );
        }

        // Left edge.
        if (cell.edges.left !== OPEN) {
          this.walls.push(
            new Wall(
              cellX - half,
              cellY - half,
              this.wallThickness,
              this.cellSize + this.wallThickness,
              cell.edges.left === VISIBLE
            )
          );
        }

        // Right outer border only.
        if (col === this.cols - 1 && cell.edges.right !== OPEN) {
          this.walls.push(
            new Wall(
              cellX + this.cellSize - half,
              cellY - half,
              this.wallThickness,
              this.cellSize + this.wallThickness,
              cell.edges.right === VISIBLE
            )
          );
        }

        // Bottom outer border only.
        if (row === this.rows - 1 && cell.edges.bottom !== OPEN) {
          this.walls.push(
            new Wall(
              cellX - half,
              cellY + this.cellSize - half,
              this.cellSize + this.wallThickness,
              this.wallThickness,
              cell.edges.bottom === VISIBLE
            )
          );
        }
      }
    }
  }

  draw() {
    for (let wall of this.walls) {
      wall.draw();
    }
  }

  /*
    Grid helpers
  */

  getCell(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return null;
    }

    return this.grid[row][col];
  }

  getNeighbour(cell, direction) {
    if (direction === "top") {
      return this.getCell(cell.col, cell.row - 1);
    }

    if (direction === "right") {
      return this.getCell(cell.col + 1, cell.row);
    }

    if (direction === "bottom") {
      return this.getCell(cell.col, cell.row + 1);
    }

    if (direction === "left") {
      return this.getCell(cell.col - 1, cell.row);
    }

    return null;
  }

  getOppositeDirection(direction) {
    if (direction === "top") return "bottom";
    if (direction === "right") return "left";
    if (direction === "bottom") return "top";

    return "right";
  }

  setEdgeBetween(cellA, cellB, directionFromA, value) {
    let opposite = this.getOppositeDirection(directionFromA);

    cellA.edges[directionFromA] = value;
    cellB.edges[opposite] = value;
  }

  cellKey(cell) {
    return cell.col + "," + cell.row;
  }

  getStartArea() {
    return {
      x: this.x - 72,
      y: this.y + this.startRow * this.cellSize + 12,
      w: 58,
      h: this.cellSize - 24
    };
  }

  getFinishArea() {
    return {
      x: this.x + this.cols * this.cellSize + 14,
      y: this.y + this.finishRow * this.cellSize + 12,
      w: 58,
      h: this.cellSize - 24
    };
  }
}

/*
  Wall class
  ----------

  A wall is a rectangle.
  It can be visible or invisible.

  Invisible walls still exist as collision objects.
*/

class Wall {
  constructor(x, y, w, h, isVisible) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.isVisible = isVisible;
  }

  draw() {
    if (this.isVisible) {
      noStroke();
      fill(15);
      rect(this.x, this.y, this.w, this.h);
    } else if (DEBUG_SHOW_INVISIBLE_WALLS) {
      noStroke();
      fill(255, 0, 0, 120);
      rect(this.x, this.y, this.w, this.h);
    }
  }

  collidesWithCircle(circleX, circleY, circleRadius) {
    /*
      AABB-to-circle collision.

      The wall is a rectangle.
      The player is a circle.

      Find the closest point on the rectangle to the circle centre.
      If that point is inside the circle radius, collision happens.
    */

    let closestX = constrain(circleX, this.x, this.x + this.w);
    let closestY = constrain(circleY, this.y, this.y + this.h);

    let distanceX = circleX - closestX;
    let distanceY = circleY - closestY;

    let distanceSquared = distanceX * distanceX + distanceY * distanceY;
    let radiusSquared = circleRadius * circleRadius;

    return distanceSquared <= radiusSquared;
  }
}

/*
  Player class
  ------------

  This is the fake cursor.
*/

class Player {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;

    this.previousX = x;
    this.previousY = y;

    this.radius = radius;
    this.followSpeed = 0.22;

    this.isLocked = false;

    this.lockX = x;
    this.lockY = y;

    this.unlockDistance = 15;
    this.flashTimer = 0;
  }

  syncToMouse() {
    this.x = mouseX;
    this.y = mouseY;

    this.previousX = mouseX;
    this.previousY = mouseY;

    this.lockX = mouseX;
    this.lockY = mouseY;
  }

  update(walls) {
    if (this.isLocked) {
      let distanceToLock = dist(mouseX, mouseY, this.lockX, this.lockY);

      if (distanceToLock < this.unlockDistance) {
        this.isLocked = false;

        this.x = this.lockX;
        this.y = this.lockY;

        this.previousX = this.x;
        this.previousY = this.y;
      }

      return;
    }

    /*
      Save the previous fake-cursor location before movement.
      This is essential for freezing at the last safe point.
    */

    this.previousX = this.x;
    this.previousY = this.y;

    let nextX = lerp(this.x, mouseX, this.followSpeed);
    let nextY = lerp(this.y, mouseY, this.followSpeed);

    /*
      Swept collision check.

      This samples between the current and next position.
      It stops the fake cursor from skipping through thin walls.
    */

    let movementDistance = dist(this.previousX, this.previousY, nextX, nextY);
    let steps = max(1, ceil(movementDistance / 3));

    let lastSafeX = this.previousX;
    let lastSafeY = this.previousY;

    for (let i = 1; i <= steps; i++) {
      let amount = i / steps;

      let testX = lerp(this.previousX, nextX, amount);
      let testY = lerp(this.previousY, nextY, amount);

      if (this.collidesWithAnyWall(testX, testY, walls)) {
        this.lockAt(lastSafeX, lastSafeY);
        return;
      }

      lastSafeX = testX;
      lastSafeY = testY;
    }

    this.x = nextX;
    this.y = nextY;
  }

  collidesWithAnyWall(testX, testY, walls) {
    for (let wall of walls) {
      if (wall.collidesWithCircle(testX, testY, this.radius)) {
        return true;
      }
    }

    return false;
  }

  lockAt(x, y) {
    this.isLocked = true;

    this.lockX = x;
    this.lockY = y;

    this.x = x;
    this.y = y;

    this.flashTimer = 14;
  }

  draw() {
    push();

    noStroke();
    fill(0);
    circle(this.x, this.y, this.radius * 2);

    stroke(255);
    strokeWeight(1.5);
    line(this.x - 10, this.y, this.x + 10, this.y);
    line(this.x, this.y - 10, this.x, this.y + 10);

    if (this.flashTimer > 0) {
      noFill();
      stroke(190, 0, 0, 180);
      strokeWeight(2);
      circle(this.x, this.y, 28 + this.flashTimer);
      this.flashTimer--;
    }

    pop();

    if (this.isLocked) {
      this.drawRealMouseOverlay();
      this.drawLockedHint();
    }
  }

  drawRealMouseOverlay() {
    push();

    noFill();
    stroke(0, 85);
    strokeWeight(2);
    circle(mouseX, mouseY, 25);

    stroke(0, 60);
    line(mouseX - 16, mouseY, mouseX + 16, mouseY);
    line(mouseX, mouseY - 16, mouseX, mouseY + 16);

    noStroke();
    fill(0, 55);
    circle(mouseX, mouseY, 5);

    pop();
  }

  drawLockedHint() {
    push();

    stroke(180, 0, 0, 110);
    strokeWeight(1.5);
    line(this.lockX, this.lockY, mouseX, mouseY);

    noFill();
    stroke(180, 0, 0, 140);
    circle(this.lockX, this.lockY, this.unlockDistance * 2);

    noStroke();
    fill(160, 0, 0);
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text("return mouse here", this.lockX, this.lockY - 18);

    pop();
  }
}

/*
  Drawing helpers
*/

function drawStartAndFinish() {
  noStroke();

  fill(225, 238, 220);
  rect(startArea.x, startArea.y, startArea.w, startArea.h);

  fill(238, 226, 170);
  rect(finishArea.x, finishArea.y, finishArea.w, finishArea.h);

  fill(20);
  textSize(10);
  textAlign(CENTER, CENTER);

  text("START", startArea.x + startArea.w / 2, startArea.y + startArea.h / 2);
  text("FINISH", finishArea.x + finishArea.w / 2, finishArea.y + finishArea.h / 2);
}

function drawTitleText() {
  fill(20);
  textAlign(LEFT, TOP);
  textSize(14);

  text("Invisible Trap Maze", maze.x, 24);

  textSize(11);

  if (!gameStarted) {
    text("Move your real mouse onto START to begin.", maze.x, 44);
  } else if (player.isLocked) {
    fill(160, 0, 0);
    text("Trap hit: fake cursor locked. Move the real mouse back to the frozen cursor.", maze.x, 44);
  } else {
    text("Reach FINISH. Some open-looking passages contain invisible walls.", maze.x, 44);
  }

  fill(80);
  textSize(10);
  text("Seed: " + mazeSeed + " | Press R to regenerate", maze.x, 76);

  if (DEBUG_SHOW_INVISIBLE_WALLS) {
    fill(160, 0, 0);
    text("DEBUG: invisible traps are visible in red.", maze.x, 61);
  }
}

function drawStartPrompt() {
  push();

  fill(0, 120);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("Place mouse here", startArea.x + startArea.w / 2, startArea.y - 16);

  noFill();
  stroke(0, 110);
  strokeWeight(1.5);
  rect(startArea.x - 4, startArea.y - 4, startArea.w + 8, startArea.h + 8);

  pop();
}

function drawWinScreen() {
  push();

  fill(246, 243, 232, 235);
  rect(0, 0, width, height);

  fill(20);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("MAZE COMPLETE", width / 2, height / 2 - 18);

  textSize(15);
  text("Press R to generate a new maze.", width / 2, height / 2 + 25);

  pop();
}

function drawPaperTexture() {
  stroke(0, 10);
  strokeWeight(1);

  for (let y = 0; y < height; y += 13) {
    line(0, y, width, y);
  }
}

function pointInsideRect(px, py, rectangle) {
  return (
    px >= rectangle.x &&
    px <= rectangle.x + rectangle.w &&
    py >= rectangle.y &&
    py <= rectangle.y + rectangle.h
  );
}

function drawSpotlight() {
  push();
  noStroke();
  fill(0, 0, 0, 254); // Almost complete darkness
  
  beginShape();
  // Draw the massive dark overlay
  vertex(0, 0);
  vertex(width, 0);
  vertex(width, height);
  vertex(0, height);
  
  // Cut a circular hole around the player
  beginContour();
  let radius = 60; // Size of the flashlight
  for (let angle = PI * 2; angle > 0; angle -= 0.1) {
    vertex(player.x + cos(angle) * radius, player.y + sin(angle) * radius);
  }
  endContour();
  endShape(CLOSE);
  pop();
}

function mousePressed() {
  if (mouseButton === LEFT && gameStarted && !hasWon && timeLeft <= 600 && cooldownTimer === 0) {
    radarActive = 40;
    cooldownTimer = 240;
  }
}