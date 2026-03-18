 _____ _____ _____ ____    _   _    _ _ _   _  ___
|_   _|  ___|_   _|  _ \  / \ | \  / | | \ | |/   \
  | | | |__   | | | |_) |/ _ \|  \/  | |  \| | ,^. |
  | | |  __|  | | |    /| |_| |      | |     | | | |
  | | | |___  | | | |\ \|  _  | |\/| | | |\  | `v' |
  |_| |_____| |_| |_| |_|_| |_|_|  |_|_|_| \_|\___/

an NES game
by Damian Yerrick


=== Legal ===

Copyright (c) 2003 Damian Yerrick

This is a free document.  Permission is granted to copy, distribute
and/or modify this document under the terms of any of the following
licenses:

* the GNU Free Documentation License, Version 1.2 or any later
  version published by the Free Software Foundation; with no
  Invariant Sections, no Front-Cover Texts, and no Back-Cover Texts,
  or
* the GNU General Public License, Version 2 or any later version
  published by the Free Software Foundation.

This document is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
licenses for more details.

You should have received a copy of the aforementioned licenses along
with this program; if not, write to the Free Software Foundation, Inc.,
59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

You can contact Damian Yerrick through a web form:
http://www.pineight.com/contact/

Damian Yerrick and Nathanael Nerode encourage those who modify GFDL
documents such as this not to add Invariant Sections.  Explanation:
http://home.twcny.rr.com/nerode/neroden/fdl.html


=== Introduction ===

Tetramino is an action puzzle game for NES comparable to the
popular game Tetris(R), except published as free software and with
more responsive movement controls than some Tetris brand games.


=== Installing ===

Tetramino is designed to run on Nintendo Family Computer (sold in
North America as Nintendo Entertainment system), compatible consoles
(such as Dendy, Doctor PC Jr., Game Axe, Game Theory Admiral, and
some PolyStation models), and accurate NES emulators.  It is
distributed as source code and an iNES format binary, using
mapper 0 (NROM).

I have successfully tested it on FCE Ultra, Nintendulator, Nestopia,
NNNesterJ, and PocketNES.  It has not yet been tested on a real
NES, but Michel Iwaniec has reassured me that it will "probably"
work. Do NOT use NESticle; that emulator is so outdated (5+ years
since last update) that it probably won't even work.  When I
tried it on NNNesterJ, the playfield bounced a little bit during
redraws; I'm not sure whether this glitch would occur on NTSC
hardware or not.  I'm pretty darn sure it wouldn't happen on PAL.

To run this on a real NES you'll need a writable NES cartridge with
at least 16 KB of PRG space and 2 KB of CHR space.

To build Tetramino, you will need CC65 (available from
http://www.cc65.org/) and a GNU make utility (available as
source code from http://www.gnu.org/; Windows binaries from
http://www.mingw.org/).  Modify the makefile to point to where
you have CC65 installed; if you don't put GNU make in your path,
modify mk.bat to point to GNU make.  To build some data conversion
tools, you'll need a GNU C compiler such as MinGW (which includes
GNU make); I have included Windows binaries of the conversion tools
for those who want to quickly get into hacking on Tetramino.


=== Game Controls ===

Title screen:
  Start: Show playfields.
Game over:
  A+B: Join game.
  Select: Insert coin (planned for coin-op version only).
Menu:
  Control Pad up, down: Choose parameter.
  Control Pad left, right: Change parameter.
  A: Start game.
Game:
  Control Pad left, right, down: Move piece.
  Control Pad up: Move piece to floor.
  A: Rotate piece clockwise.
  B: Rotate piece anticlockwise.
  Start: Pause game (home version).


=== Play ===

At first, press Start to skip past each of the informational screens.
Then press Start at the title screen to display the playfields.
At this point, either player can press the A and B buttons at the
same time to begin playing.

The pieces in Tetramino are, of course, tetraminoes.  Each of the
seven tetraminoes is made of four square blocks.
 _____   _____     ___   ___     ___   _____   _______
|  ___| |___  |  _|  _| |_  |_  |   | |_   _| |_______|
|_|         |_| |___|     |___| |___|   |_|
   L       J       S       Z    Square   T      Stick

When you start the game, a tetramino will begin to fall slowly into
the bin.  You can move it with the Control Pad and rotate it with
the A or B button.

The goal of Tetramino is to make complete horizontal lines by
packing the pieces into the bin with no holes.  If you complete
a line, everything above it will move down a row.  If you complete
more than one line with a piece, you get more points.  As you
play, the pieces will gradually fall faster, making the game more
difficult.  The game ends when you "top out", that is, when you
place a piece such that it extends above the top of the bin.

If you have an overhang in the blocks, you can slide another
piece under it by holding Left or Right as the new piece passes
by the overhang.

Scoring is based on how far you have moved pieces downward
and on the number of horizontal lines made at once:

1 line (any piece)          100 points
2 lines (any piece)         300 points
3 lines (L, Z, Stick only)  700 points
4 lines (Stick only)       1500 points

There are some tetramino gh0ds who can get more than six million
points in some games.  There exists a known corner case in this
game's score computation, and stability has not been tested beyond
6,550,000 points.


=== Questions ===

Q: How do I run this on the real NES?

Chris Covell has put together instructions on how to replace NES
Game Paks' mask ROM chips with writable EEPROMs.
http://www.zyx.com/chrisc/solarwarscart.html

Q: Where's (feature that has appeared in another Tetris clone)?

If it's mentioned in the status display in the opening informational
screens, I know about it and plan to implement it in a future
milestone build.  Otherwise, I'd be glad to take suggestions.

Q: Why do the pieces become gray when they land?

The NES's tile size is 8x8 pixels, but the "attribute table" assigns
palettes to 16x16 pixel areas, or clusters of 2x2 tiles.  Only three
colors plus the backdrop color can appear in each color area.
I decided to make these colors dark gray, light gray, and white
throughout the playfields.  Just be glad the pieces actually
maintain some semblance of distinct shading, unlike in Tengen's
bootleg NES version of Tetris.

Q: So why didn't you just make it an MMC5 game?  The MMC5 has EXRAM,
which can be used to make color areas smaller.

I don't feel like learning to program for the MMC5, and besides,
it's much more difficult to find somebody with MMC5 hardware to
test on.  


=== Credits ===

Program and graphics by Damian Yerrick
Original game design by Alexey Pajitnov
NES assembler toolchain by Ullrich von Bassewitz
NES emulator by Xodnizel
NES documentation by Jeremy Chadwick, Brad Taylor, and other
contributors to http://nesdev.parodius.com/

