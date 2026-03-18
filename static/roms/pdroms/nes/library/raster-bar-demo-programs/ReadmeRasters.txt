Raster Bar Demo Programs by Chris Covell (ccovell@direct.ca)
============================================================

Throw away your GHB and Ecstasy, kids! It's time for more trippy demos with
wild colours to lull your senses away. Time to hook up your NES and get groovy.


WHAT IS IT?
-----------

This is a collection of demos which do (somewhat common) tricks to the NES PPU
in order to change the palette on each scanline.  However, not many emulators
run these demos correctly.  In fact, of all the NES emus that I have, only that
great paragon of emulation, LoopyNES, will run them all correctly.

So, the moral of the story: GET LOOPYNESS if you have a PC! DELETE NESTICLE!!

I began these demos because I had wanted to experiment with getting some form
of "hi-colour" graphics on the NES.  My plans were somewhat dashed when I
discovered that it takes more than one complete scanline to change all 16 BG
colour registers of the NES PPU.  So, I gave up on that, for now.  However,
changing one palette entry per scanline works quite well.  I made a palette
changing routine and solidified it so that its CPU use never varies.  This
became part of my main routine.  I then tweaked the timing of this routine so
that I can modify colour 0 for each scanline, with all the glitches associated
with PPU tweaking offscreen (beyond the borders).  So, now I can set any colour
for any scanline.  I then made various demos that did cool things with colours!


WHICH .NES FILE DO I USE?
-------------------------

Try all of them.  The main demo (and coolest-looking) is RasterChromaLuma.  It
changes the palette of each scanline dynamically, mixing the Chrominance (Hue)
and Luminance (Brightness) of each colour to varying degrees.  It looks really
nice in motion.

Here's a short description of the other files:

RasterTest1: This is one of my preliminary "hi-colour" tests. It combines the
stretching of my "Stretch" demo with palette changing.

RasterTest2: This just experiments with multiple palette changes each scanline.

RasterTest3: This shows some shaded raster bars (remapped to the NES Palette).

RasterTest3a: This shows many different shaded (static) raster bars.

RasterTest3b: This shows a nice red-yellow shaded gradient.

RasterTest3c: This is an impressionistic painting of a rural scene.  :-)

RasterTest3d: This shows different-sized greyscale raster bars.

RasterTest3e: This is merely the test pattern that I first used to adjust the
scanline timing.


FOR DEVELOPERS
--------------

I've included the source code to my demos in the "source" directory (naturally).
Sorry, but it isn't sorted, and the asm files are almost comment-free, because
I just banged these demos together in two evenings.  They're just there to give
you an idea of how bad a programmer I am.  ;-D

If you want to see how these demos should look on an NES, you should definitely
try out LoopyNES, or maybe NinthStar (though I haven't tested it, I've heard it
was good.)  I haven't found any emulators on the Mac or Amiga that run these
raster programs correctly.

So, that's that.  Get a devkit and try it out on a real NES!  In the end that's
the only real way to do your devwork.  Details of making a devcart are on my
Solar Wars Page: http://mypage.direct.ca/c/ccovell

I must give thanks to Joey "Memblers" Parsell, because his neat raster bars in
his RTC demo provided inspiration.  At least I didn't just do a routine that
was a straight copy of his!


If you like these demos, please e-mail me at ccovell@direct.ca.  And visit my
webpage (currently) at http://mypage.direct.ca/c/ccovell
