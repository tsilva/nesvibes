"Stretch" by Chris Covell

This is an NES demo that I made to show off some of the NES' features.
(Or undocumented features, as the case may be.)
This particular demo displays a wavy effect mapped onto my CMC'80s logo.
I think it looks really cool, bobbing and stretching up and down...

A routine like this can warp and scale a graphic image vertically, and even
can be made to compensate for the (vertical) palette limitations of the
attribute table (but I don't do it here.)  How did I achieve this effect on
the old NES?  Well, I won't just give the answer away... Heh heh...  The
source code is included, so you PPU experts can examine it for clues...

This demo works in any emulator that has fairly accurate PPU timing.  In
fact, it looks better in emulators than on the real NES!  There are graphic
glitches on the NES, because I can't time my PPU writing 100% accurately on
an NROM cartridge.  Maybe if I was using an MMC3 cart or something, I could
get accurate scanline timing.  But, heh, c'est la vie.  It is a "work in
progress", after all.  :-)

E-mail me if you like this demo.  I personally think I've outdone myself.
I created this demo in one evening, on April 2, 2001.  I should have spent
the evening writing a final essay for university, but you know how it goes
when an irresistible idea comes into your head when you have other duties
to perform... 

I've included the asm source for you to look at.  You should assemble it
with the cross-assembler DASM for good results.  If you are using an
Amiga (yay!) just execute the make script.  If not, then assemble the
source, and join the header to the output file at the front, and the CHR
file at the end.  On the Amiga, this demo displays best in DarkNESs.  I'd
recommend iNES on the Mac, and LoopyNES on the PC.

***PLEASE DON'T USE NESTICLE!!!***

Chris Covell
ccovell@direct.ca
http://mypage.direct.ca/c/ccovell/
Powered by Amiga!
