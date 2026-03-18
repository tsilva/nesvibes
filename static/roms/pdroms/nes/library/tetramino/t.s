

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


.p02


;;; Memory mapped registers

OAM       = $0200

PPUCTRL   = $2000
PPUMASK   = $2001
PPUSTATUS = $2002
SPRADDR   = $2003  ; always write 0 here and use DMA from OAM
PPUSCROLL = $2005
PPUADDR   = $2006
PPUDATA   = $2007

SPRDMA    = $4014
SNDCHN    = $4015
JOY1      = $4016
JOY2      = $4017

PPUCTRL_NMI      = $80
PPUCTRL_8X8      = $00
PPUCTRL_8X16     = $20
PPUCTRL_BGHIPAT  = $10
PPUCTRL_SPRHIPAT = $08
PPUCTRL_WRDOWN   = $04  ; when set, PPU address increments by 32

PPUMASK_RED      = $80  ; when set, slightly darkens other colors
PPUMASK_GREEN    = $40
PPUMASK_BLUE     = $20
PPUMASK_SPR      = $14  ; SPR: show sprites in x=0-255
PPUMASK_SPRCLIP  = $10  ; SPRCLIP: show sprites in x=8-255
PPUMASK_BG0      = $0A  ; BG0: similarly
PPUMASK_BG0CLIP  = $08
PPUMASK_MONO     = $01  ; when set, zeroes the low nibble of palette values

PPUSTATUS_VBL  = $80  ; the PPU has entered a vblank since last $2002 read
PPUSTATUS_SPR0 = $40  ; sprite 0 has overlapped BG since ???
PPUSTATUS_OVER = $20  ; More than 64 sprite pixels on a scanline since ???


;;; Some helpful macros

;;; wait4vbl
;   Waits for the PPU to signal a vertical blank.
;   Apparently local labels cause the following:
;       Internal assembler error
;       WriteExpr: Cannot write EXPR_ULABEL nodes
.macro wait4vbl
:
  bit PPUSTATUS
  bpl :-
.endmacro


;;; Debug settings
;   When stress testing the refresh daemon (redraw_calc plus
;   speed_draw), turn REDRAW_ALL_THE_TIME on.

SELECT_MAKES_NEW_PIECE = 0
REDRAW_ALL_THE_TIME = 0
DRAW_1P_STATUS = 0
PLAY_4LINE_SOUND = 1
PLAY_MOVE_SOUND = 1


;;; Constants

MAX_ROWS_PER_FRAME = 11  ; half the rows that the refresh daemon can handle per vblank
MOVE_DOWN_DELAY = 2  ; at least 20 divided by MAX_ROWS_PER_FRAME
INITIAL_SPEED = 2
MAX_SPEED = 250
N_PIECES_TO_SPEEDUP = 20

N_PIECES         = 7

STATE_INACTIVE          = 0
STATE_NEW_GAME          = 1
STATE_NEW_PIECE         = 2
STATE_FALLING_PIECE     = 3
STATE_CHECK_LINES       = 4
STATE_POST_CLEAR        = 5
STATE_FALL              = 6
STATE_GAMEOVER          = 7

DMC_TESSERA      = 0

CLEARED_ROW_TILE   = $07  ; cleared lines are flashed to this
EMPTY_ROW_TILE     = $20  ; empty lines are drawn with this
                          ; so that the scroll logic remembers which
                          ; lines it still needs to scroll down
DARK_TILE          = $0F  ; game over: all blocks are flashed to this


;;; Memory map
;   000-00f local variables
;   010-04f ZP global variables
;   050-0ff unallocated
;   100-1ff stack (cut that down to 32 bytes?)
;   200-2ff OAM buffer
;   300-3ff unallocated; possibly music engine's?
;   400-4db player 1 field
;   4dc-4df unallocated
;   4e0-4ff palette buffer
;   500-5db player 2 field
;   5dc-7ff unallocated


;;; Common local variables

dividend = $0c


;;; Global variables
;   Unallocated: $1a $1b $4f-$ff

retrace_count = $10  ; currently, retrace_count+1 is unused but
                     ; reserved for use as retrace_count_hi
reset_time_lo = $12  ; reset_time is how long after gameover to
reset_time_hi = $13  ; go back to title screen.
rand0 = $14
rand1 = $15
rand2 = $16
rand3 = $17
randbias = $18
sprite_index = $19
;  nothing allocated at $1a, $1b
dirty_bottom = $1c
rows_left = $1e
vblanked = $1f       ; deal with NES hardware's glitchy vblank detection

pads = $20
pad_A = pads+0
pad_B = pads+2
pad_SELECT = pads+4
pad_START = pads+6
pad_UP = pads+8
pad_DOWN = pads+10
pad_LEFT = pads+12
pad_RIGHT = pads+14

cur_state = $30
state_timer = $32
cur_flip = $34
piece_x = $36
piece_y = $38
piece_ysub = $3A
cur_piece = $3C
next_piece = $3E
score_ones = $40
score_lo = $42
score_hi = $44
lines_lo = $46
lines_hi = $48
piece_yspeed = $4A
pieces_to_speedup = $4c
cur_turn = $4e
garbage = $4f

palbuf = $4e0
FIELD_1P = $400
FIELD_2P = $500

.segment "INESHDR"

  .byt "NES", 26
  .byt 1  ; number of 16 KB program segments
  .byt 1  ; number of 8 KB chr segments
  .byt 0  ; mapper, mirroring, etc
  .byt 0  ; extended mapper info
  .byt 0,0,0,0,0,0,0,0  ; f you DiskDude


.segment "CODE"

.import PKB_unpackblk

nmihandler:
  inc vblanked
  rti

irqhandler:
  rti

main:

;;; Init CPU
  sei
  cld
  ldx #$c0
  stx JOY2
  ldx #$ff
  txs
  inx

  lda #$08
  sta $4011

;;; Init machine
  wait4vbl
  stx PPUCTRL  ; After first VBL, clear PPU registers
  stx PPUMASK

  lda #$10
  sta $4011

  ldx #0
  ldy #$ef
  txa
@ramclrloop:
  sta 0,x
  sta $100,x
  sta $300,x
  sta $400,x
  sta $500,x
  sta $600,x
  sta $700,x
  inx
  bne @ramclrloop
  lda #4
  sta sprite_index

  lda #$14
  sta $4011

  jsr fill_rest_of_sprites

  wait4vbl  ; after second VBL we can write to ppu memory
  lda PPUSTATUS
  sta rand3  ; store NESTICLE-ness in bit 7 of rand3

  lda #$18
  sta $4011

;;; Load initial sprite table
  ldx #0
  stx SPRADDR  ;copy sprites
  lda #>OAM
  sta SPRDMA

  lda #$1c
  sta $4011

;;; Load initial palette
  lda #$3f
  sta PPUADDR
  ldx #0
  stx PPUADDR
@palclrloop:
  lda gamepal,x
  sta palbuf,x
  inx
  cpx #32
  bne @palclrloop

  lda #$a5
  sta rand0

  lda #$0f
  sta SNDCHN
  lda #$20
  sta $4011
  lda #8
  sta $4001
  sta $4005


;;; Load warning into nametable $2000
  .import do_intro_screens, nesticle_pkb, t_pkb, title_pkb, pause_pkb, how2_pkb
  lda rand3  ; if we decided it was nesticle...
  bpl @not_nesticle
  lda #<nesticle_pkb
  sta 0
  lda #>nesticle_pkb
  sta 1
  jsr fbi_warning
@not_nesticle:
  jsr do_intro_screens

title_scr:
  ldx #3
  stx reset_time_hi
  ldx #0
  stx reset_time_lo
  stx PPUMASK
  lda #$20
  sta PPUADDR
  stx PPUADDR
  lda #<title_pkb
  sta 0
  lda #>title_pkb
  sta 1
  jsr PKB_unpackblk
:
  lda gamepal,x
  sta palbuf,x
  inx
  cpx #32
  bne :-
  jsr copy_pal
  lda #PPUCTRL_NMI
  sta PPUCTRL
  lda #0
  sta PPUSCROLL
  sta PPUSCROLL
  sta vblanked
@title_loop:
  lda vblanked
  beq @title_loop
  lda #PPUMASK_BG0
  sta PPUMASK
  dec vblanked
  jsr read_pads
  lda pad_START
  ora pad_START+1
  cmp #1
  beq restart_game
  dec reset_time_lo
  bne @title_loop
  dec reset_time_hi
  bne @title_loop
  
;;; show how to play
  ldx #4
  stx reset_time_hi
  ldx #0
  stx reset_time_lo
  stx PPUMASK
  lda PPUSTATUS
  lda #$20
  sta PPUADDR
  stx PPUADDR
  lda #<how2_pkb
  sta 0
  lda #>how2_pkb
  sta 1
  jsr PKB_unpackblk
  lda #PPUCTRL_NMI
  sta PPUCTRL
  lda #0
  sta PPUSCROLL
  sta vblanked
  lda #8
  sta PPUSCROLL
@how2_loop:
  lda vblanked
  beq @how2_loop
  lda #PPUMASK_BG0
  sta PPUMASK
  dec vblanked
  jsr read_pads
  lda pad_START
  ora pad_START+1
  cmp #1
  beq restart_game
  dec reset_time_lo
  bne @how2_loop
  dec reset_time_hi
  bne @how2_loop
  jmp title_scr



restart_game:
  ldx #0
  stx PPUMASK
  lda #<t_pkb
  sta 0
  lda #>t_pkb
  sta 1
  lda #$20
  sta PPUADDR
  stx PPUADDR
  jsr PKB_unpackblk
  ldx #0
  lda #<pause_pkb
  sta 0
  lda #>pause_pkb
  sta 1
  lda #$2c
  sta PPUADDR
  stx PPUADDR
  jsr PKB_unpackblk
:
  lda gamepal,x
  sta palbuf,x
  inx
  cpx #32
  bne :-

  lda #STATE_GAMEOVER
  sta cur_state
  sta cur_state+1
  lda #0
  sta garbage
  sta piece_y
  sta piece_y+1
  lda #1
  sta state_timer
  sta state_timer+1

  wait4vbl
  lda #0
  sta PPUCTRL
  sta PPUSCROLL
  lda #8
  sta PPUSCROLL
  lda #%00011110
  sta PPUMASK


;
; THE MAIN GAME LOOP
;
game_loop:
  inc retrace_count
  jsr read_pads

  ldx #0
  jsr game_cycle
  jsr draw_piece

  ldx #1
  jsr game_cycle
  jsr draw_piece

.if 1
  ; Draw next pieces. If two players, draw the player whose falling
  ; piece is lower on the screen first.
  lda piece_y
  cmp piece_y+1
  ; now: carry is set iff piece 0 is higher than piece 1
  lda #0
  adc #0
  ; now: A holds the number of the player with lower piece
.endif

  sta cur_turn
  jsr draw_next

  lda cur_turn
  eor #1
  sta cur_turn
  jsr draw_next

  jsr fill_rest_of_sprites
  jsr redraw_calc
:
  bit PPUSTATUS  ; wait for sprite 0 hit
;  bmi @vblinstead
  bvc :-

@vblinstead:

  lda #0
  sta PPUMASK
  sta PPUCTRL

  jsr copy_pal

  ldx #0
  stx SPRADDR  ;copy sprites
  lda #>OAM
  sta SPRDMA

  jsr speed_draw

  bit PPUSTATUS
  lda #0
  sta PPUCTRL
  sta PPUADDR
  lda #$20
  sta PPUADDR
  lda #%00011110
  sta PPUMASK

  lda cur_state  ; return to title screen if nothing has happened
  bne @bunny
  lda cur_state+1
  beq @countdown_to_title
@bunny:  ; still going?
  lda #$fc
  sta reset_time_hi
  lda #0
  sta reset_time_lo
@jgl:
  jmp game_loop

@countdown_to_title:
  inc reset_time_lo
  bne @jgl
  inc reset_time_hi
  bne @jgl
  jmp title_scr

game_cycle:
  stx cur_turn
  lda cur_state,x
  asl a
  tax
  lda state_jtable+1,x
  pha
  lda state_jtable,x
  pha
straight_rts:
  rts

state_jtable:
  .addr wait_for_join-1
  .addr do_new_game_menu-1
  .addr make_new_piece-1
  .addr falling_piece-1
  .addr find_full_lines-1
  .addr post_clear-1
  .addr move_down-1
  .addr game_over_anim-1

wait_for_join:
  ldx cur_turn
  lda pad_A,x
  beq straight_rts
  ldy pad_B,x
  beq straight_rts
;;; now: we know A is down and B is down.
;   find if one has just been pressed.
  cmp #1
  beq init_new_game_menu
  cpy #1
  bne straight_rts

init_new_game_menu:
  lda cur_turn
  asl a
  asl a
  tax
  lda palbuf+7,x
  sta palbuf+19,x
  lda cur_turn
  tax
  ora #>FIELD_1P
  sta 1
  ldy #0
  sty 0
  ldy #219
:
  lda menu_text,y
  sta (0),y
  dey
  bne :-
  lda menu_text
  sta (0),y
  lda #0
  sta dirty_bottom,x
  lda #STATE_NEW_GAME
  sta cur_state,x
  lda #14
  sta piece_y,x
  lda #0
  sta piece_yspeed,x
  jsr update_menu_garbage
  jsr update_menu_speed
  rts

do_new_game_menu:
  ldx cur_turn
  lda pad_A,x
  cmp #1
  bne @not_A
  jmp make_new_game
@not_A:
  txa
  ora #>FIELD_1P
  sta 1
  ldy #0
  sty 0

  lda pad_UP,x
  cmp #1
  bne @not_up
  lda piece_y,x
  cmp #14
  bcs @not_up
  adc #3
  sta piece_y,x
@not_up:

  lda pad_DOWN,x
  cmp #1
  bne @not_down
  lda piece_y,x
  cmp #12
  bcc @not_down
  sbc #3
  sta piece_y,x
@not_down:

  lda pad_LEFT,x
  cmp #1
  bne @not_left
  lda piece_y,x
  sta dirty_bottom,x
  cmp #11
  beq toggle_garbage
  cmp #14
  bne @not_left
  dec piece_yspeed,x
  jmp update_menu_speed
@not_left:

  lda pad_RIGHT,x
  cmp #1
  bne @not_right
  lda piece_y,x
  sta dirty_bottom,x
  cmp #11
  beq toggle_garbage
  cmp #14
  bne @not_right
  inc piece_yspeed,x
  jmp update_menu_speed

@not_right:
  rts

toggle_garbage:
  lda garbage
  eor #1
  sta garbage
update_menu_garbage:
  lda garbage
  asl a
  asl a
  ora #3
  tax
  lda #11*10+5
  sta 0
  ldy #3
:
  lda on_off_text,x
  sta (0),y
  dex
  dey
  bpl :-
  ldx cur_turn
  rts

update_menu_speed:
  lda piece_yspeed,x
  and #%00000011
  sta piece_yspeed,x
  asl a
  asl a
  ora #3
  tax
  lda #14*10+5
  sta 0
  ldy #3
:
  lda speed_names,x
  sta (0),y
  dex
  dey
  bpl :-
  ldx cur_turn
  rts

make_new_game:
  ldx cur_turn

  txa           ; clear out playfield
  ora #>FIELD_1P
  sta 1
  ldy #0
  sty 0
  tya
@clear_field:
  sta (0),y
  iny
  sta (0),y
  iny
  cpy #200
  bcc @clear_field
  sty 0
  tay
@copy_score:
  lda board_top,y
  sta (0),y
  iny
  lda board_top,y
  sta (0),y
  iny
  cpy #20
  bcc @copy_score

  lda #0
  sta lines_lo,x
  sta lines_hi,x
  sta score_ones,x
  sta score_lo,x
  sta score_hi,x
  
  lda piece_yspeed,x  ; set initial speed
  tay
  lda initial_speeds,y
  sta piece_yspeed,x
  lda #5
  sta pieces_to_speedup,x

  lda #0
  sta dirty_bottom,x
  jsr randpiece
  sta next_piece,x
  lda #STATE_NEW_PIECE
  sta cur_state,x
  rts

.import darkcolors

make_new_piece:
  jsr update_score
  ldx cur_turn
  dec pieces_to_speedup,x
  bne @no_speedup
  lda #N_PIECES_TO_SPEEDUP
  sta pieces_to_speedup,x
  lda piece_yspeed,x
  cmp #MAX_SPEED
  bcs @no_speedup
  inc piece_yspeed,x
@no_speedup:
  lda next_piece,x
  sta cur_piece,x

  jsr randpiece
  sta next_piece,x

  lda #0
  sta piece_ysub,x
  sta cur_flip,x
  lda #20
  sta piece_y,x
  lda #3
  sta piece_x,x
  lda #STATE_FALLING_PIECE
  sta cur_state,x

  ; get the color of the current piece
  lda cur_piece,x
  tay
  txa
  asl a
  asl a
  tax   ; palette offset = 4 * x
  lda darkcolors,y
  sta palbuf+17,x
  adc #$10
  sta palbuf+18,x
  adc #$10
  sta palbuf+19,x

  ; get the color of the next piece
  ldx cur_turn
  lda next_piece,x
  tay
  txa
  asl a
  asl a
  tax
  lda darkcolors,y
  sta palbuf+25,x
  adc #$10
  sta palbuf+26,x
  adc #$10
  sta palbuf+27,x
  rts

falling_piece:
  ldx cur_turn

.if SELECT_MAKES_NEW_PIECE
  lda pad_SELECT,x           ;handle START press (FIXME)
  cmp #1
  bne @no_mknewpiece
  jmp make_new_piece
@no_mknewpiece:
.endif

  lda pad_START,x           ;handle START press
  cmp #1
  bne @no_start

  lda #%00001010            ;display pause screen
  sta PPUMASK
  lda #3
  jsr startwait
  lda #0
  sta PPUCTRL
  sta PPUSCROLL
  lda #8
  sta PPUSCROLL
  lda #%00011110
  sta PPUMASK
  ldx cur_turn
@no_start:

  ;do control and collision here
  lda pad_LEFT,x          ;handle LEFT press
  and #$07
  cmp #1
  bne @no_left
  dec piece_x,x
  jsr collision_check
  bne @undo_left

.if PLAY_MOVE_SOUND
  lda #8
  bit SNDCHN
  bne @no_left
  lda #$00
  sta $400c
  lda #$00
  sta $400e
  lda #$18
  sta $400f
.endif
  bne @no_left
@undo_left:
  inc piece_x,x
@no_left:

  lda pad_RIGHT,x          ;handle RIGHT press
  and #$07
  cmp #1
  bne @no_right
  inc piece_x,x
  jsr collision_check
  bne @undo_right

.if PLAY_MOVE_SOUND
  lda #8
  bit SNDCHN
  bne @no_right
  lda #$00  ; play move sound
  sta $400c
  lda #$00
  sta $400e
  lda #$18
  sta $400f
.endif
  bne @no_right
@undo_right:
  dec piece_x,x
@no_right:

  lda pad_B,x          ;handle B press
  cmp #1
  bne @no_lflip
  dec cur_flip,x
  lda cur_flip,x
  and #$03
  sta cur_flip,x
  jsr collision_check
  bne @undo_lflip

  lda #$00  ; play flip sound
  sta $400c
  lda #$00
  sta $400e
  lda #$48
  sta $400f
  bne @no_lflip

@undo_lflip:
  inc cur_flip,x
  lda cur_flip,x
  and #$03
  sta cur_flip,x

@no_lflip:

  lda pad_A,x          ;handle A press
  cmp #1
  bne @no_rflip
  inc cur_flip,x
  lda cur_flip,x
  and #$03
  sta cur_flip,x
  jsr collision_check
  bne @undo_rflip

  lda #$00  ; play flip sound
  sta $400c
  lda #$00
  sta $400e
  lda #$48
  sta $400f
  bne @no_rflip

@undo_rflip:
  dec cur_flip,x
  lda cur_flip,x
  and #$03
  sta cur_flip,x

@no_rflip:
  lda pad_DOWN,x          ;handle DOWN press
  and #1                  ;comment out to speed up soft-drop
  beq @no_drop
  lda #0
  sta piece_ysub,x
  inc score_ones,x
  lda score_ones,x
  cmp #100
  bcc @no_drop
  sbc #100
  sta score_ones,x
  inc score_lo,x
  bne @no_drop
  inc score_hi,x
@no_drop:

  lda pad_UP,x          ;handle UP press
  cmp #1
  bne @no_harddrop

  lda piece_y,x
  sta 7
@harddrop_loop:
  dec piece_y,x
  jsr collision_check
  beq @harddrop_loop   ; while there's no collision, keep looking
  inc piece_y,x
  lda 7
  sec
  sbc piece_y,x
  beq @no_harddrop

  clc   ; so we have a hard drop.  now figure score
  adc score_ones,x
  cmp #100
  bcc @no_ones_ovf
  sbc #100
  inc score_lo,x
  bne @no_ones_ovf
  inc score_hi,x
@no_ones_ovf:
  sta score_ones,x

  lda piece_yspeed,x  ; set drop time
  cmp #31
  bcc :+
  lda #31
:
  asl a
  asl a
  asl a
  sta piece_ysub,x
@no_harddrop:

  lda piece_ysub,x
  sec
  sbc piece_yspeed,x
  sta piece_ysub,x
  bcs @no_lock
  dec piece_y,x

  jsr collision_check
  beq @no_lock
  ldx cur_turn
  inc piece_y,x
  lda #0
  sta piece_ysub,x
  lda #STATE_CHECK_LINES
  sta cur_state,x
  lda #10
  sta state_timer,x

  lda #$00
  sta $400c
  lda #$0e
  sta $400e
  lda #$48
  sta $400f

  jsr commit_piece

@no_lock:
  rts



.import xshapes, yshapes

;
; in:
;   0 piece y
;   1 piece_x
;   4 pointer to field
; trashes 2, 3
; result: Z = was there a collision found
;   
collision_check:
  ldx cur_turn
  txa
  ora #>FIELD_1P
  sta 5
  lda #0
  sta 4

  ; calculate piece y
  lda piece_y,x
  sta 0

  lda piece_x,x
  sta 1

  lda cur_piece,x
  asl a
  asl a
  ora cur_flip,x
  asl a
  asl a
  tax

  lda #4
  sta 3

@blockloop:
  lda xshapes,x
  clc
  adc 1
  cmp #10       ; x<0 or x>=10: collision
  bcs @collision_found
  sta 2

  lda yshapes,x
  adc 0         ; y<0: collision
  bmi @collision_found
  cmp #20
  bcs @above         ; y>=20: no collision
  tay
  lda timesten,y
  adc 2
  tay
  lda (4),y     ;load the block
  bne @collision_found
@above:
  inx
  dec 3
  bne @blockloop
;no collision found; restore registers
  ldx cur_turn
  lda #0
  rts
  
@collision_found:
  ldx cur_turn
  lda #1
  rts

.import fallencolors

commit_piece:
  ldx cur_turn
  txa
  ora #>FIELD_1P
  sta 5
  lda #0
  sta 4

  lda piece_y,x         ; redraw starting at the bottom of the piece
  sta 0
  bpl @not_below        ; make sure not redrawing below playfield
  lda #0
@not_below:
  sta dirty_bottom,x

  lda piece_x,x
  sta 1

  lda cur_piece,x
  tay
  lda fallencolors,y
  sta 2

  tya
  asl a
  asl a
  ora cur_flip,x
  asl a
  asl a
  tax

  lda #4
  sta 3

@commit_loop:
  lda yshapes,x
  clc
  adc 0         ; (piece_y + blk_y)
  cmp #20
  bcs commit_g_o ;y>=20: Game Over!
  tay
  lda timesten,y ;y * 10
  adc xshapes,x  ;  + x
  adc 1          ;  + piece_x
  tay
  lda 2
  sta (4),y     ;fill in the block
  inx
  dec 3
  bne @commit_loop
  rts

commit_g_o:
  ldx cur_turn
  lda #19
  sta piece_y,x
  lda #STATE_GAMEOVER
  sta cur_state,x
  lda #1
  sta state_timer,x

  lda #$0f  ; play die sound
  sta $400c
  lda #$0c
  sta $400e
  lda #$40
  sta $400f

;;; darken blocks
  ldy #0
  sty dirty_bottom,x
  sty 4
@darken_loop:
  lda (4),y
  beq @is_empty
  lda #DARK_TILE
  sta (4),y
@is_empty:
  iny
  cpy #200
  bne @darken_loop
  rts


game_over_anim:
  ldx cur_turn
  dec state_timer,x
  beq @ready
  rts
@ready:
  txa
  ora #>FIELD_1P
  sta 5
  lda #0
  sta 4
  sta dirty_bottom,x
  lda piece_y,x
  tay
  lda timesten,y
  tax
  ldy #0
@loop:
  lda gameover_text,x
  sta (4),y
  inx
  iny
  lda gameover_text,x
  sta (4),y
  inx
  iny
  cpx #200
  bcc @loop
  ldx cur_turn
  dec piece_y,x
  bpl @still_going
  lda #STATE_INACTIVE
  sta cur_state,x
  rts
@still_going:
  lda #MOVE_DOWN_DELAY
  sta state_timer,x
  rts


draw_next:
  ldx cur_turn
  lda cur_state,x
  cmp #STATE_NEW_PIECE
  bcs @not_inactive
  rts
@not_inactive:
  txa
  ora #2
  sta 2

  lda #164
  sta 0
  lda #3
  clc
  adc board_x,x
  asl a
  asl a
  asl a
  sta 1
  lda next_piece,x
  asl a
  asl a
  jmp draw_a_piece

draw_piece:
  ldx cur_turn

  lda cur_state,x       ;if the piece isn't falling don't draw it
  cmp #STATE_FALLING_PIECE
  beq @is_falling
  cmp #STATE_NEW_GAME
  beq @is_new_game_menu
  rts

;;; In the new game menu, the "piece" is an arrow at the
;   left side that bounces back and forth on the line.
@is_new_game_menu:
  lda piece_y,x
  asl a
  asl a
  asl a
  eor #$ff
  clc
  adc #208
  sta 0
  lda board_x,x
  asl a
  asl a
  asl a
  sta 1
  lda #%00010000  ; compute bouncing arrow
  and retrace_count
  beq :+
  lda #$0f
:
  eor retrace_count
  and #%00001110
  lsr a
  adc 1
  sta 1

  ldx sprite_index
  lda 0
  sta $200,x
  inx
  lda #31  ; greater-than tile
  sta $200,x
  inx
  lda cur_turn
  sta $200,x
  inx
  lda 1
  sta $200,x
  inx
  stx sprite_index
  ldx cur_turn
  rts

@is_falling:
  stx 2                 ; 2: palette to draw the piece in

  ; calculate piece y
  lda piece_y,x
  asl a
  asl a
  asl a
  sta 0
  lda piece_ysub,x
  lsr a
  lsr a
  lsr a
  lsr a
  lsr a
  ora 0
  sta 0         ;0: bottom of piece, in pixels

  ; calculate piece x
  lda piece_x,x
  clc
  adc board_x,x
  asl a
  asl a
  asl a
  sta 1         ;1: left side of piece, in pixels

  ; calculate base addr of piece data
  lda cur_piece,x
  asl a
  asl a
  ora cur_flip,x
draw_a_piece:
  asl a
  asl a           ;y = piece data offset
  tay             ;  = 16 * piece + 4 * flip

  lda #4
  sta 3

  ldx sprite_index
@blockloop:
  lda yshapes,y
  asl a
  asl a
  asl a
  adc 0
  cmp #200
  bcs @above_field
  eor #$ff
  clc
  adc #208
  sta $200,x
  inx
  lda #2        ; medium tile: maximum range of brightness
  sta $200,x
  inx
  lda 2  ; vhp000cc = 000000np where p = turn and n = next
  sta $200,x
  inx
  lda xshapes,y
  asl a
  asl a
  asl a
  adc 1
  sta $200,x
  inx
@above_field:
  iny
  dec 3
  bne @blockloop
  
; debugging sh**
.if DRAW_1P_STATUS
  lda #119
  sta $200,x
  inx
  lda piece_y
  ora #$30
  sta $200,x
  inx
  lda #0
  sta $200,x
  inx
  lda #120
  sta $200,x
  inx
  lda #127
  sta $200,x
  inx
  lda cur_state
  ora #$30
  sta $200,x
  inx
  lda #0
  sta $200,x
  inx
  lda #120
  sta $200,x
  inx
.endif
  stx sprite_index
  rts


fill_rest_of_sprites:
  lda sprite_index
  and #%11111100
  tax
  lda #$ef
@loop:
  sta OAM,x
  inx
  bne @loop

  ; setup up sprite 0
  lda #231
  sta OAM
  lda #$66
  sta OAM+1
  lda #%00100011  ; behind
  sta OAM+2
  lda #0
  sta OAM+3
  ldx #4
  stx sprite_index
  rts


;
; find_full_lines
; For player x, look for filled lines.  Leave the number of such lines
; in 2.
;

.import play_dmc

find_full_lines:
  ldx cur_turn
  dec state_timer,x
  beq @ready
  rts
@ready:
  txa
  ora #>FIELD_1P
  sta 5
  lda #0
  sta 4

  lda piece_y,x   ; current line
  bpl @not_below  ; clip against bottom
  lda #0
@not_below:
  cmp #16         ; clip against top
  bcc @not_above
  lda #16
@not_above:
  sta 1   ; line currently being checked
  sta dirty_bottom,x  ; redraw lines that were checked


  lda #4
  sta 0   ; number of lines to check

  lda #0
  sta 2   ; number of lines found

  ; search each line
@lineloop:
  ldy 1
  lda timesten,y
  tay
  ldx #10
@chkblkloop:
  lda (4),y
  beq @not_this_line
  iny
  dex
  bne @chkblkloop
  inc 2

  ldx #5  ;fill this row with CLEARED_ROW_TILE
  lda #CLEARED_ROW_TILE
@fillrowloop:
  dey
  sta (4),y
  dey
  sta (4),y
  dex
  bne @fillrowloop
@not_this_line:
  inc 1
  dec 0
  bne @lineloop
  ldx cur_turn
  lda 2
  beq @no_lines

;;; do stuff with lines
  lda #STATE_POST_CLEAR
  sta cur_state,x
  lda #15
  sta state_timer,x

  lda 2  ; play line sound based on number of lines
  asl a
  adc #1
  sta $400c
  lda #$08
  sta $400e
  lda #$50
  sta $400f

.if PLAY_4LINE_SOUND
  lda 2
  cmp #4
  bne @no_tetris_sound
  lda #DMC_TESSERA
  jsr play_dmc
  ldx cur_turn
@no_tetris_sound:
.endif
  
  lda 2  ; compute the score
  tay
  clc
  adc lines_lo,x
  sta lines_lo,x
  bcc @no_lines_carry
  inc lines_hi,x
@no_lines_carry:
  lda score_per_lines,y
  clc
  adc score_lo,x
  sta score_lo,x
  bcc @no_score_carry
  inc score_hi,x
@no_score_carry:
  rts
@no_lines:
  lda #STATE_NEW_PIECE
  sta cur_state,x
  rts


;;; post_clear
;   For each row that begins with a CLEARED_ROW_TILE,
;   set it to an EMPTY_ROW_TILE, which should look like a blank tile
;   but be of a different number.
post_clear:
  ldx cur_turn
  dec state_timer,x
  beq @ready
  rts
@ready:
  txa
  ora #>FIELD_1P
  sta 5
  lda #0
  sta 4

; setup next state
  lda #STATE_FALL
  sta cur_state,x
  lda #1
  sta state_timer,x
  lda piece_y,x
  bpl @not_below
  lda #0
  sta piece_y,x
@not_below:
  sta dirty_bottom,x

  lda #19 ;current line
  sta 0
@lineloop:
  ldy 0
  lda timesten,y
  tay
  lda (4),y
  cmp #CLEARED_ROW_TILE
  bne @not_this_row
  ldx #5
  lda #EMPTY_ROW_TILE
@blkloop:
  sta (4),y
  iny
  sta (4),y
  iny
  dex
  bne @blkloop
@not_this_row:
  dec 0
  bpl @lineloop

  rts


move_down:
  ldx cur_turn
  dec state_timer,x
  beq @ready
  rts
@ready:
  txa
  ora #>FIELD_1P
  sta 5
  sta 3
  lda #0
  sta 4
@find_cleared_row:
  lda piece_y,x
  sta dirty_bottom,x
  cmp #20       ; have we made everything fall up to the top?
  bcc @still_got_more
  lda #STATE_NEW_PIECE
  sta cur_state,x
  lda #1
  sta state_timer,x
  rts
@still_got_more:
  tay           ; is row y cleared?
  lda timesten,y
  tay
  lda (4),y
  cmp #EMPTY_ROW_TILE
  beq @got_one
  inc piece_y,x
  bne @find_cleared_row
@got_one:       ; so we've found a cleared row.
                ; now move everything above it down one row.
  lda #10
  sta 2
@scroll_loop:
  lda (2),y
  sta (4),y
  iny
  lda (2),y
  sta (4),y
  iny
  cpy #190
  bcc @scroll_loop
  lda #0
@clear_top_loop:
  sta (4),y
  iny
  sta (4),y
  iny
  cpy #200
  bcc @clear_top_loop

  lda #$c3
  sta $4000
  lda #$83
  sta $4001
  lda #$c0
  sta $4002
  lda #$43
  sta $4003
  

  lda #MOVE_DOWN_DELAY
  sta state_timer,x
  rts



redraw_calc:

.if REDRAW_ALL_THE_TIME
  ldx #1
@reset_redraw:
  lda dirty_bottom,x
  cmp #22
  bne @skip_reset_redraw
  lda #0
  sta dirty_bottom,x
@skip_reset_redraw:
  dex
  bpl @reset_redraw
.endif

;;; Calculate number of lines that need to be redrawn
  ldx #1
@calc_hi:
  lda #22
  sec
  sbc dirty_bottom,x
  bcs :+
  lda #0
:
  sta rows_left,x
  dex
  bpl @calc_hi
  
;;; Reduce this to fit redraw engine speed, if necessary
  clc
  lda rows_left
  adc rows_left+1
  sec
  sbc #MAX_ROWS_PER_FRAME*2
  bcc @no_reduce
  beq @no_reduce
;;; Now, A holds the total number of rows over the maximum.
;   Divide it by 2, rounding up.  Then reduce the rows to
;   draw on each side by that many.
  lsr a
  adc #0
  sta 0
  sec
  lda rows_left
  sbc 0
  bcs :+
  lda #0
:
  sta rows_left
  sec
  lda rows_left+1
  sbc 0
  bcs :+
  lda #0
:
  sta rows_left+1
@no_reduce:
  rts


;;; Speed critical functions need to be aligned such that
;   an inner loop does not cross a page boundary.

.align 256
speed_draw:

;;; 1P
  lda rows_left
  beq @skip_1p
  ldy dirty_bottom
@loop_1p:
  lda ppubasehi,y
  sta PPUADDR
  lda ppubaselo,y
  ora #2
  sta PPUADDR
  ldx timesten,y
  lda FIELD_1P,x  ; hand unroll for blazing speed
  sta PPUDATA
  lda FIELD_1P+1,x
  sta PPUDATA
  lda FIELD_1P+2,x
  sta PPUDATA
  lda FIELD_1P+3,x
  sta PPUDATA
  lda FIELD_1P+4,x
  sta PPUDATA
  lda FIELD_1P+5,x
  sta PPUDATA
  lda FIELD_1P+6,x
  sta PPUDATA
  lda FIELD_1P+7,x
  sta PPUDATA
  lda FIELD_1P+8,x
  sta PPUDATA
  lda FIELD_1P+9,x
  sta PPUDATA
  iny
  dec rows_left
  bne @loop_1p
  sty dirty_bottom
@skip_1p:

  lda rows_left+1
  beq @skip_2p
;;; 2P
  ldy dirty_bottom+1
@loop_2p:
  lda ppubasehi,y
  sta PPUADDR
  lda ppubaselo,y
  ora #20
  sta PPUADDR
  ldx timesten,y
  lda FIELD_2P,x  ; hand unroll for blazing speed
  sta PPUDATA
  lda FIELD_2P+1,x
  sta PPUDATA
  lda FIELD_2P+2,x
  sta PPUDATA
  lda FIELD_2P+3,x
  sta PPUDATA
  lda FIELD_2P+4,x
  sta PPUDATA
  lda FIELD_2P+5,x
  sta PPUDATA
  lda FIELD_2P+6,x
  sta PPUDATA
  lda FIELD_2P+7,x
  sta PPUDATA
  lda FIELD_2P+8,x
  sta PPUDATA
  lda FIELD_2P+9,x
  sta PPUDATA
  iny
  dec rows_left+1
  bne @loop_2p
  sty dirty_bottom+1
@skip_2p:
  rts

read_pads:
  ldx #1
  stx JOY1
  dex
  stx JOY1
@button_loop:
  lda JOY1
  jsr @readpads_cycle
  lda JOY2
  jsr @readpads_cycle
  cpx #16
  bcc @button_loop
  rts

@readpads_cycle:
  and #$03  ; D0 for pad, D1 for Famicom external pad
  bne @down
  lda #0
  sta pads,x
  inx
  rts
@down:
  inc pads,x
  lda pads,x
  cmp #10
  bcc @skip
  lda #8
  sta pads,x
@skip:
  inx
  rts


;
; random
; Uses the crc32 polynomial to generate Y random bits
; as the low_order bits of rand3.
; Average 48 cycles per bit.
;
random:
  asl rand3
  rol rand2
  rol rand1
  rol rand0
  bcc @no_xor
  lda rand0
  eor #$04
  sta rand0
  lda rand1
  eor #$c1
  sta rand1
  lda rand2
  eor #$1d
  sta rand2
  lda rand3
  eor #$b7
  sta rand3
@no_xor:
  dey
  bne random
  rts



;;; copy_pal:
;   Copy current palette from RAM to PPU.
;
copy_pal:
  lda #$3f
  sta PPUADDR
  ldx #0
  stx PPUADDR
  ldy palbuf  ; don't reload it every time to shave some cycles
@loop:
  sty PPUDATA
  inx
  lda palbuf,x
  sta PPUDATA
  inx
  lda palbuf,x
  sta PPUDATA
  inx
  lda palbuf,x
  sta PPUDATA
  inx
  cpx #32
  bcc @loop
  rts


;;; fbi_warning:
;   Loads a static map and waits for a player to press start.
;   0: address of packed data
.global fbi_warning
fbi_warning:
  ldx #0
  stx PPUMASK
  lda #$20
  sta PPUADDR
  stx PPUADDR
  jsr PKB_unpackblk

  lda #PPUCTRL_NMI  ; wait for vblank in a secure way
  sta PPUCTRL
:
  lda vblanked
  beq :-

  jsr copy_pal
  lda #%00011110
  sta PPUMASK
  lda #0
  sta vblanked
  sta PPUSCROLL
  sta PPUSCROLL

startwait:
  ora #PPUCTRL_NMI
  sta PPUCTRL
  lda #$ff
  sta 0
@loop:
  lda vblanked
  beq @loop
  dec vblanked

  inc rand1
  bne :+
  inc rand2
:
  jsr read_pads
  lda #1
  cmp pad_START
  beq @got
  cmp pad_START+1
  bne @loop
@got:
  ldy #8
  jsr random
  rts


;;; map_clear:
;   Clears a nametable to all zeroes.
;   A: map address ($20 or $2C on std mirrorings;
;                   $20, $24, $28, or $2C on 4-screen)
;   Trashes A, X
map_clear:
  sta PPUADDR
  ldx #0
  stx PPUADDR
  txa
@ppuclrloop:
  sta PPUDATA
  sta PPUDATA
  sta PPUDATA
  sta PPUDATA
  inx
  bne @ppuclrloop
  rts


;;; draw_text:
;   Draws a nul-terminated line of text to the screen.
;   0: pointer to text src
;   X: high word of dst
;   Y: low word of dst
;   out: Y: length of string; A: 0
draw_text:
  stx PPUADDR
  sty PPUADDR
  ldy #0
  lda (0),y
  beq @skip
@loop:
  sta PPUDATA
  iny
  lda (0),y
  bne @loop
@skip:
  rts


;
; randpiece
; Generates a random piece in A.  A random result of 0 to 6 returns
; that piece; a random result of 7 does a "possession arrow" that
; increases every '7'.
;
randpiece:
  ldy #3
  jsr random
  lda rand3
  and #$07
  cmp #N_PIECES
  beq not_so_randpiece
  rts
; Handle the possession arrow
not_so_randpiece:
  inc randbias
  lda randbias
  cmp #N_PIECES
  bcc @rand_ok
  lda #0
  sta randbias
@rand_ok:
  rts


;;; div10
;   Given a 16-bit number in dividend, divides it by ten and
;   stores the result in dividend.
;   out: A: remainder; X: 0; Y: unchanged
div10:
  ldx #16
  lda #0
@divloop:
  asl dividend
  rol dividend+1
  rol a
  cmp #10
  bcc @no_sub
  sbc #10
  inc dividend
@no_sub:
  dex
  bne @divloop
  rts


;;; decimalize
;   Given a pointer to a text field, turns
;   in: 4: text field ptr
;       y: field length
;       dividend: number to decimalize
;   out: written
decimalize_loop:
  jsr div10
  cmp #0
  bne @nonzero
  ldx dividend
  bne @nonzero
  ldx dividend+1
  bne @nonzero
  rts
@nonzero:
  ora #'0'
  sta (4),y
decimalize:
  dey
  bpl decimalize_loop
  rts

;;; update_score
;   Updates the display of score and lines for the current player.
;   in: cur_turn: current turn
update_score:
  ldx cur_turn
  lda dirty_bottom,x  ; if not dirty, mark them dirty
  cmp #20
  bcc @no_reset_dirty
  lda #20
  sta dirty_bottom,x
@no_reset_dirty:
  txa  ; find field pointer
  ora #>FIELD_1P
  sta 5

  lda #218  ; draw score ones place
  sta 4
  ldy #0
  sty dividend+1
  lda score_lo,x
  ora score_hi,x
  beq @no_tens_zero
  lda #'0'     ; zero out tens place if it doesn't
  sta (4),y
@no_tens_zero:
  lda score_ones,x
  sta dividend
  ldy #2
  jsr decimalize

  ldx cur_turn  ; draw score hundreds place
  lda #213
  sta 4
  lda score_lo,x
  sta dividend
  lda score_hi,x
  sta dividend+1
  ldy #5
  jsr decimalize
  
  ldx cur_turn  ; draw score hundreds place
  lda #205
  sta 4
  lda lines_lo,x
  sta dividend
  lda lines_hi,x
  sta dividend+1
  ldy #5
  jsr decimalize

  rts


.segment "RODATA"

.align 256
gameover_text:
  .byt "          "
  .byt " TO PLAY  "
  .byt "PRESS A+B "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "yv z z|tuz"  ; OVER
  .byt "uz uuzs }v"  ; OVER
  .byt "vyz zzsqwy"  ; OVER
  .byt "          "
  .byt "yvz uu u}|"  ; GAME
  .byt "u|z|uuuuwq"  ; GAME
  .byt "vyxst}xuws"  ; GAME
  .byt "          "
board_top:
  .byt "LINES    0"
  .byt "SC       0"
gamepal:
  .byt $0f,$00,$10,$30,$0f,$06,$16,$26,$0f,$02,$12,$22,$0f,$00,$10,$30
  .byt $0f,$00,$10,$30,$0f,$00,$10,$30,$0f,$00,$10,$30,$0f,$00,$10,$30
board_x:
  .byt 2, 20
.align 256
menu_text:
  .byt "          "
  .byt "START GAME"
  .byt "PRESS A TO"
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "          "
  .byt "(NOT YET) "
  .byt " MUSIC    "
  .byt "          "
  .byt "(NOT YET) "
  .byt "          "
  .byt " GARBAGE  "
  .byt "          "
  .byt "          "
  .byt " SPEED    "
  .byt "          "
  .byt "  SELECT  "
  .byt "  OPTION  "
  .byt "          "
;     -- division --
  .byt "TETRAMINO!"
  .byt "WELCOME TO"

timesten:
  .byt 0,10,20,30,40,50,60,70,80,90
  .byt 100,110,120,130,140,150,160,170,180,190
  .byt 200,210

.align 256
ppubaselo:
  .byt $60,$40,$20,$00,$e0,$c0,$a0,$80
  .byt $60,$40,$20,$00,$e0,$c0,$a0,$80
  .byt $60,$40,$20,$00,            $80
  .byt $60
ppubasehi:
  .byt $23,$23,$23,$23,$22,$22,$22,$22
  .byt $22,$22,$22,$22,$21,$21,$21,$21
  .byt $21,$21,$21,$21,            $20
  .byt $20
score_per_lines:
  .byt 0, 1, 3, 7, 15
speed_names:
  .byt "SLOW MEDFASTDAMN"
initial_speeds:
  .byt     2, 16, 40, 96
on_off_text:
  .byt " OFF ON!"


.segment "VECTORS"

  .addr nmihandler, main, irqhandler

