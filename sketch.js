// Bakeoff #2 - Seleção de Alvos e Fatores Humanos
// IPM 2020-21, Semestre 2
// Entrega: até dia 7 de Maio às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 3 de Maio

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER   = 45;      // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY   = true;  // Set to 'true' before sharing during the simulation and bake-off days

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;

// Metrics
let testStartTime, testEndTime;// time between the start and end of one attempt (48 trials)
let hits 			 = 0;      // number of successful selections
let misses 			 = 0;      // number of missed selections (used to calculate accuracy)
let database;                  // Firebase DB  

// Study control parameters
let draw_targets     = false;  // used to control what to show in draw()
let trials 			 = [];     // contains the order of targets that activate in the test
let current_trial    = 0;      // the current trial number (indexes into trials array above)
let attempt          = 0;      // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs        = [];     // add the Fitts ID for each selection here (-1 when there is a miss)
let mouse_x_value    = 0;      // saves x value of last click - used for determining fitts IDs
let mouse_y_value    = 0;      // saves y value of last click - used for determining fitts IDs

// Target class (position and width)
class Target
{
  constructor(x, y, w)
  {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

let correct;
let wrong;

function preload()
{
  correct = loadSound('sound/soft-hitnormal.wav');
  wrong = loadSound('sound/monkeymiss.wav');
}

// Runs once at the start
function setup()
{
  createCanvas(700, 500);    // window size in px before we go into fullScreen()
  frameRate(60);             // frame rate (DO NOT CHANGE!)
  
  randomizeTrials();         // randomize the trial order at the start of execution
  
  textFont("Arial", 18);     // font size for the majority of the text
  drawUserIDScreen();        // draws the user input screen (student number and display size)
}

// Runs every frame and redraws the screen
function draw()
{
  if (draw_targets)
  {
    cursor("cursors/smaller-green-cursor.png");
    // The user is interacting with the 4x4 target grid
    background(color(153,214,211));        // sets background to black
    
    // Print trial count at the top left-corner of the canvas
    fill(color(255,255,255));
    textAlign(LEFT);
    textFont("Arial", 18);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);
    
    // Draw all 16 targets
    drawLine();
	  for (var i = 0; i < 16; i++) drawTarget(i);
    let target = getTargetBounds(trials[current_trial]);
    if (dist(target.x, target.y, mouseX, mouseY) < target.w/2)
    {
      noStroke();
      stroke(color(255,245,7));
      strokeWeight(6);
      fill(color(0,0,0,0));
      circle(target.x, target.y, target.w);
      noStroke()
    }
  }
}

// Print and save results at the end of 48 trials
function printAndSavePerformance()
{
  // DO NOT CHANGE THESE! 
  let accuracy			= parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time         = (testEndTime - testStartTime) / 1000;
  let time_per_target   = nf((test_time) / parseFloat(hits + misses), 0, 3);
  let penalty           = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
  let target_w_penalty	= nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
  let timestamp         = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();
  let x_of_leftside     = width/2 - 300;
  let x_of_rightside    = width/2 + 300;
  let y_level           = 300;
  let aux               = 0;
  
  background(color(0,0,0));   // clears screen
  fill(color(255,255,255));   // set text fill color to white
  textFont("Arial", 18);
  text(timestamp, 10, 20);    // display time on screen (top-left corner)
  
  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width/2, 60); 
  text("Hits: " + hits, width/2, 100);
  text("Misses: " + misses, width/2, 120);
  text("Accuracy: " + accuracy + "%", width/2, 140);
  text("Total time taken: " + test_time + "s", width/2, 160);
  text("Average time per target: " + time_per_target + "s", width/2, 180);
  text("Average time for each target (+ penalty): " + target_w_penalty + "s", width/2, 200);
  
  // Print Fitts IDS (one per target, -1 if failed selection)
  text("Fitts Index of Performance", width/2, 240);
  for (var it = 0; it < 48; it++) {
    if(it == 0)
      {
        text("Target 1: ----", x_of_leftside, y_level);
        continue;
      }
    //prints on the left
    if(it % 2 == 0)
      {
        if(fitts_IDs[it] == -1)
          {
            aux = it;
            aux++;
            text("Target " + aux +": Missed", x_of_leftside, y_level);
          }
        else
          {
            aux = it;
            aux++;
            text("Target " + aux +": " + round(fitts_IDs[it],3), x_of_leftside, y_level);
          }
      }
    //prints on the right
    if(it % 2 != 0)
      {
        if(fitts_IDs[it] == -1)
          {
            aux = it;
            aux++;
            text("Target " + aux +": Missed", x_of_rightside, y_level);
          }
        else
          {
            aux = it;
            aux++;
            text("Target " + aux +": " + round(fitts_IDs[it],3), x_of_rightside, y_level);
          }
        y_level = y_level + 22;
      }
  }

  // Saves results (DO NOT CHANGE!)
  let attempt_data = 
  {
        project_from:       GROUP_NUMBER,
        assessed_by:        student_ID,
        test_completed_by:  timestamp,
        attempt:            attempt,
        hits:               hits,
        misses:             misses,
        accuracy:           accuracy,
        attempt_duration:   test_time,
        time_per_target:    time_per_target,
        target_w_penalty:   target_w_penalty,
        fitts_IDs:          fitts_IDs
  }
  
  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY)
  {
    // Access the Firebase DB
    if (attempt === 0)
    {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }
    
    // Add user performance results
    let db_ref = database.ref('G' + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() 
{
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets)
  {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);
    let fitts_value = 0;
    
    // Check to see if the mouse cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters
    if (dist(target.x, target.y, mouseX, mouseY) < target.w/2){
      correct.play();
      hits++;
      if(current_trial != 0) 
         {
           fitts_value = log((dist(mouse_x_value, mouse_y_value, target.x, target.y)/target.w) + 1)/log(2); 
           fitts_IDs[current_trial] = fitts_value;
         }
    }                                                        
    else{
      wrong.play();
      misses++;
      fitts_IDs[current_trial] = -1;
    } 
    
    mouse_x_value = mouseX;
    mouse_y_value = mouseY;
    current_trial++;                 // Move on to the next trial/target
    
    // Check if the user has completed all 48 trials
    if (current_trial === trials.length)
    {
      testEndTime = millis();
      draw_targets = false;          // Stop showing targets and the user performance results
      printAndSavePerformance();     // Print the user's results on-screen and send these to the DB
      attempt++;                      
      
      // If there's an attempt to go create a button to start this
      if (attempt < 2)
      {
        continue_button = createButton('START 2ND ATTEMPT');
        continue_button.mouseReleased(continueTest);
        continue_button.position(width/2 - continue_button.size().width/2, height/2 - continue_button.size().height/2);
      }
    } 
  }
}

function drawLine()
{
  let target = getTargetBounds(trials[current_trial]);  
  let target_next = getTargetBounds(trials[current_trial+1]);
  
  stroke(color(255,245,7));
  strokeWeight(10);
  line(target.x, target.y, target_next.x, target_next.y);
}

// Draw target on-screen
function drawTarget(i)
{
  // Get the location and size for target (i)
  let s = 'NEXT'
  let target = getTargetBounds(i);  

  // Check whether this target is the target the user should be trying to select
  if (trials[current_trial] === i) 
  { 
	  // Changes appearance of current target 
    noStroke();
    fill(color(153,60,60));
    circle(target.x, target.y, target.w);
    fill(color(255,255,255));
    circle(target.x, target.y, target.w * 0.8);
    fill(color(153,60,60));
    circle(target.x, target.y, target.w * 0.6);
    if (trials[current_trial+1] === trials[current_trial]) {
      fill(color(153,60,60));
      circle(target.x, target.y, target.w);
      fill(color(255,255,255));
      circle(target.x, target.y, target.w * 0.8);
      fill(color(153,60,60));
      circle(target.x, target.y, target.w * 0.6);
      fill(255, 255, 255);
      textSize(PPCM * 0.5);
      textFont("Helvetica");
      textAlign(CENTER, CENTER); 
      text("x2", target.x, target.y);
    }
    // Remember you are allowed to access targets (i-1) and (i+1)
    // if this is the target the user should be trying to select
    //
  }

  else if(trials[current_trial+1] === i) {
    noStroke();
    fill(color(0,0,0));
    circle(target.x, target.y, target.w);
    fill(255, 255, 255);
    textSize(PPCM * 0.5);
    textFont("Helvetica");
    textAlign(CENTER, CENTER); 
    text(s, target.x, target.y);
  }
  // Draws the target
  else {
    noStroke();
    fill(color(255,255,255));                 
    circle(target.x, target.y, target.w);
  }
}

// Returns the location and size of a given target
function getTargetBounds(i)
{
  var x = parseInt(LEFT_PADDING) + parseInt((i % 4) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 4) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest()
{
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);
  
  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];
  
  continue_button.remove();
  
  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();  
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() 
{
  resizeCanvas(windowWidth, windowHeight);
    
  let display    = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI            = display.ppi;                        // calculates pixels per inch
  PPCM           = PPI / 2.54;                         // calculates pixels per cm
  TARGET_SIZE    = 1.5 * PPCM;                         // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM;                         // sets the padding around the targets in cm
  MARGIN         = 1.5 * PPCM;                         // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING   = width/2 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;        
  
  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING    = height/2 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;
  
  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}
