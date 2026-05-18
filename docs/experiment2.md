# Experiment 2: Find a 2d design or visual pattern that inspires you

## Version 1  
My inspiration behind this project is, well, patatap. However, I haven't played patatap in long over a month, so instead I will use varying keys to control different aspects of the game such as color, design, and shape creation.  
  
This version features visual-only animations when the user presses letters or numbers. In addition, the background will change to a randomized dark background when the spacebar is pressed.  
  
Exploring the code, the shapes are created using a "Shape" class, which handles logic for each shape individually, and allows dynamic changes and action to each shape without manually creating new variables. These shapes are added to a "shapes" array, allowing the program to iterate through each shape, triggering the next "frame" to generate, and deleting the shape if it is not visible anymore.  
  
Due to a limitation of p5.js, the *whole canvas* gets rotated rather than just the class object. So, to work around that, the square is "created" at the central point of the canvas (0,0), and then "translated" (moved) to its actual randomized point. This allows me to reference that point, and rotate the square against that point, instead of swinging around out side of the canvas.  
  
**Next steps: Adding audio**  
  
![Version 1 protoype image](img/exp2/v1.png)
## Version 2  

