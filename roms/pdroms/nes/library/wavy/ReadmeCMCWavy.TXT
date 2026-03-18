This is an NES demo that I made to show off some of the NES' features.
This particular demo displays a wavy effect mapped onto my CMC logo.
This logo was going to be used in my game, Solar Wars, but I ran out of
space.  You can change certain parameters of the demo by pressing different
buttons on the controller.  Here's a rundown:

L/R: Decrease/Increase the scrolling speed of the wave.
U/D: Decrease/Increase the wavelength of the wave.
Select/Start: Decrease/Increase the colour-cycling speed.
B/A: Change wave type.  There are 8 different wave mappings:

1) Firewave.  This is the same one used in Solar Wars.  Looks best with
   moderate speed and wavelength.

2) Sine-wave.  The classic wave.  Looks great at all speeds, but better
   with a longer wavelength.  (Longest makes the logo look like rubber!)

3) Interlaced wave.  Alternates between two sides of the screen.  Looks
   best at full speed and either at longest or third-shortest wavelength.

4) Triangle-wave.  Looks good at all wavelengths, but at slow speeds too.

5) Circle.  This is a circle mapped onto a wave.  Looks better with shorter
   wavelengths, at all speeds.

6) Shear.  This skews the logo in varying amounts depending on the wavelength.
   Looks best at slow speeds.

7) Random.  It creates a frazzled logo.  Looks best at full speed and shorter
   wavelength.

8) Mandelbrot.  It's hard to make out, but it's a Mandelbrot shape mapped onto
   a wave.  At slower speeds, it looks very abstract at any wavelength.


Why did I make a demo like this?  For one reason: to trip out on.  Setting
the speed of scrolling and cycling low makes for a groovy lava-lamp effect.
Setting the speed of everything way up plays with your mind.  Who needs drugs
when you have your NES?  :-)

I've included the asm source for you to look at.  You should assemble it
with the cross-assembler DASM for good results.  If you are using an
Amiga (yay!) just execute the make script.  If not, then assemble the
source, and join the header to the output file at the front, and the CHR
file at the end.  On the Amiga, this demo displays best in DarkNESs.  I'd
recommend GrayBox on the Mac, and LoopyNES on the PC.  Have a good trip!

Chris Covell
ccovell@direct.ca
http://mypage.direct.ca/c/ccovell/
Powered by Amiga!
