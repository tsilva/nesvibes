These are a couple of demos that I experimented with to get fast (enough)
full-screen animation out of the good old slow hardware of the NES.  Also
with these demos, I experimented on ways of getting a "universal" CHR file
that can display any graphic image without having to change CHR graphics.
The side-effect of this is a lowered resolution.  The Flame demo uses 256
levels of dithering to approximate smoother shading; the resolution of the
image is actually just 32x30, though.  The Motion demo sacrifices colours
for greater resolution, at 64x60 pixels.  I've also added another small
still demo that shows how dithering can give "artistic" looks to blocky
greyscale images.

Longtime Amiga users will probably notice some familiar graphics in the
Motion demo.  Let's just say it's my homage to them.  Drop me a line if
you recognize the images.  (Long live Amiga!!)

I've included the asm source for you to look at.  You should assemble it
with the cross-assembler DASM for good results.  Just assemble the
source, and join the header to the output file at the front, and you have
different CHR files to experiment with putting at the end.

Chris Covell
ccovell@direct.ca
http://mypage.direct.ca/c/ccovell/
Powered by Amiga!
