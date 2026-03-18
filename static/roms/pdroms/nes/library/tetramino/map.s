;;; map.s - Map include script for Tetramino game for NES

;;; Copyright (C) 2003 Damian Yerrick
;
;   This program is free software; you can redistribute it and/or
;   modify it under the terms of the GNU General Public License
;   as published by the Free Software Foundation; either version 2
;   of the License, or (at your option) any later version.
;
;   This program is distributed in the hope that it will be useful,
;   but WITHOUT ANY WARRANTY; without even the implied warranty of
;   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;   GNU General Public License for more details.
;
;   You should have received a copy of the GNU General Public License
;   along with this program; if not, write to 
;     Free Software Foundation, Inc., 59 Temple Place - Suite 330,
;     Boston, MA  02111-1307, USA.
;
;   Visit http://www.pineight.com/ for more information.


.segment "CODE"
.global do_intro_screens
.import fbi_warning

do_intro_screens:
  lda #<early_pkb
  sta 0
  lda #>early_pkb
  sta 1
  jsr fbi_warning

  lda #<status_pkb
  sta 0
  lda #>status_pkb
  sta 1
  jsr fbi_warning

  lda #<changes2_pkb
  sta 0
  lda #>changes2_pkb
  sta 1
  jmp fbi_warning

do_fbi:

.segment "RODATA"
.global how2_pkb, nesticle_pkb, t_pkb, title_pkb, pause_pkb

nesticle_pkb:
  .incbin "nesticle.pkb"

early_pkb:
  .incbin "early.pkb"

status_pkb:
  .incbin "status.pkb"

how2_pkb:
  .incbin "how2.pkb"

changes2_pkb:
  .incbin "changes2.pkb"

t_pkb:
  .incbin "t.pkb"

pause_pkb:
  .incbin "pause.pkb"

title_pkb:
  .incbin "title.pkb"

