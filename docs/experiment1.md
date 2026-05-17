# Experiment 1: Find a 2d design or visual pattern that inspires you

## Version 1
Unfortunately, I did not save any screenshots of the initial version, although can describe how it worked functionally. For future experiments however, I have ensured I have evidence of the base versions, as well as the later iterations of each experiment.

This project was inspired by Andrew Gysin and his collaboration with SEIBU Shibuya where he presented his "meltdown" digital artwork. In this artwork, he used a blue theming, combined with proceedural ASCII art that was changed / manipulated over time to form moving shapes. 

I felt heavily inspired by this artwork due to a visit to Shibuya a few months before discovering the artwork, so decided it was complex enough and intreaguing enough to utilise it within my own adaption.

During the design phases, I needed a way to seperate this artwork from "just another copy of Andrew Gysin's work". While considering appropiate alternatives, I realised that a Japanese "Secretive Singer" had very similar brand designs, and begun imagining concepts. (Davies, 2026)

> **Context: The Japanese Secretive Singer**  
> Ado is a Japanese Singer based in Tokyo who is known for her undeniable vocal skills and secretive identity who I have been following the journey of since the debut of her album "歌ってみたアルバム" in 2023.

# Technical Review - Version 1
> Disclaimer: As described earlier, there are no screenshots to showcase the development nor completion of this version. You can, however, see the remains of the base code within the later versions  

The initial version and foundation of the "AdoWave" showcased a 15x15 square grid, formed of "Square()" shapes, and "Text()" elements centered in the middle of them. Initially, this started without any form of array, although I quickly discovered that to be able to identify where a "block" actually is, I would need to make an 2D array of the individual blocks that I can later reference. *Spoiler: The approach of using a 2D array was scrapped as it was over-the-top for what it was needed for.*

# Technical Review - Version 2
[View the Version 2 p5.js Code](https://editor.p5js.org/uklewis124/full/w5AfCormo)  
  
![Image of version 2 code](img/exp1/v2.png)
  
For the second iteration, I wanted to intoduce a combination of animation over time, and improved color logic.

**Animation Logic**  
The animation works by introducing an "offset" variable that increments every frame (offset += 0.05). To acheive changes in speed, this offset can be adjusted either manually, or via automation to adapt the speed the animation changes. For example, changing the offset from 0.05 to 0.5 means that the offset of the "start location of the animation" gets increased by half a square, rather than 0.05 parts of a square each frame.  
  
To create the wave effect in the background, I used the "sin()" function inside by "getCellStyle()" function. Because the sine wave returns values -1 to 1, I used the "map()" function to translate those values into 0 to 1. Finally, I used "lerpColor()" to smoothly transition the background colors of each square between `#000` and `#2110C9`

### References
Davies, L. (2026) S1: Creative Coder Study. An Assessment Submission.