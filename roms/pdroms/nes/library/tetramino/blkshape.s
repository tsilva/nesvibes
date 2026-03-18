;;; blkshape.s - Data tables relating to pieces in
;   Tetramino game for NES

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

.segment "RODATA"
;when space conservation becomes important, 
;consider redoing the piece shapes in a "packed" fashion
;it'd save 192 bytes

.global xshapes, yshapes, nextshapes, fallencolors, darkcolors

.align 256

xshapes:
  .byt 0,0,1,2,0,1,1,1,2,2,1,0,2,1,1,1 ; L
  .byt 0,1,2,2,1,1,1,0,2,1,0,0,1,1,1,2 ; J
  .byt 0,1,1,2,1,1,2,2,2,1,1,0,2,2,1,1 ; S
  .byt 2,1,1,0,2,2,1,1,0,1,1,2,1,1,2,2 ; Z
  .byt 0,1,2,1,1,1,1,0,2,1,0,1,1,1,1,2 ; T
  .byt 1,1,2,2,1,2,2,1,2,2,1,1,2,1,1,2 ; square
  .byt 0,1,2,3,1,1,1,1,3,2,1,0,1,1,1,1 ; stick

yshapes:
  .byt 0,1,1,1,2,2,1,0,2,1,1,1,0,0,1,2 ; €ﬂﬂ    L
  .byt 1,1,1,0,2,1,0,0,1,1,1,2,0,1,2,2 ;    ﬂﬂ€ J
  .byt 0,0,1,1,2,1,1,0,1,1,0,0,0,1,1,2 ; ‹€ﬂ    S
  .byt 0,0,1,1,2,1,1,0,1,1,0,0,0,1,1,2 ;    ﬂ€‹ Z
  .byt 1,1,1,0,2,1,0,1,1,1,1,2,0,1,2,1 ; ﬂ€ﬂ    T
  .byt 0,1,1,0,1,1,0,0,1,0,0,1,0,0,1,1 ;     €€ square
  .byt 1,1,1,1,3,2,1,0,1,1,1,1,0,1,2,3 ; ﬂﬂﬂﬂ   stick

nextshapes:
;                   0145
;       76543210    2367
  .byt %00010111 ; L
  .byt %01010011 ; J
  .byt %00011110 ; S
  .byt %01001011 ; Z
  .byt %00011011 ; T
  .byt %01011010 ; square
  .byt %00110011 ; stick

fallencolors:
  .byt 1, 2, 1, 2 ; L J S Z
  .byt 3, 2, 3    ; T square stick

darkcolors:
;      L   J   S   Z   T   Sq  St
  .byt $02,$14,$06,$1a,$18,$00,$1c
