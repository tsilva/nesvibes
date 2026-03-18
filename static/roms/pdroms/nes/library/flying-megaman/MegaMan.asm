;Colour bars program
;-------------------
;Binary created using DAsm 2.12 running on an Amiga.

   PROCESSOR   6502

VBFLAG     EQU #$40
SCROLLBASE EQU #$80
ADDAMTLO   EQU #$01
ADDAMTHI   EQU #$02
PALSWITCH  EQU #$03
PALBASE    EQU #$04

   ORG   $E000    ;16Kb PRG-ROM, 8Kb CHR-ROM

Reset_Routine  SUBROUTINE
   cld         ;Clear decimal flag
   sei         ;Disable interrupts
.WaitV   lda $2002
   bpl .WaitV     ;Wait for vertical blanking interval
   ldx #$00
   stx $2000
   stx $2001      ;Screen display off, amongst other things
   dex
   txs         ;Top of stack at $1FF

;Clear (most of) the NES' WRAM. This routine is ripped from "Duck Hunt" - I should probably clear all
;$800 bytes.
   ldy #$06    ;To clear 7 x $100 bytes, from $000 to $6FF?
   sty $01        ;Store count value in $01
   ldy #$00
   sty $00
   lda #$00

.Clear   sta ($00),y    ;Clear $100 bytes
   dey
   bne .Clear

   dec $01        ;Decrement "banks" left counter
   bpl .Clear     ;Do next if >= 0


   lda   #$20
   sta   $2006
   lda   #$00
   sta   $2006

   ldx   #$00
   ldy   #$10
.ClearPPU sta $2007
   dex
   bne   .ClearPPU
   dey
   bne   .ClearPPU

   lda   #$00
   sta   $2003
   tay
.ClearSpr sta   $2004
   dey
   bne   .ClearSpr

;********* Initialize Palette to specified colour ********

   ldx   #$3F
   stx   $2006
   ldx   #$00
   stx   $2006

   ldx   #$00
   ldy   #$20     ;Clear BG & Sprite palettes.
.InitPal lda   .Palette,X
   sta $2007
   inx
   dey
   bne   .InitPal

;*********************************************************

;********* Set up Name & Attributes ******************

   lda   #<.CMCMap
   sta   $00
   lda   #>.CMCMap
   sta   $01

   lda   #$20        ;Load up entire name & attribute table for screen 0.
   sta   $2006
   lda   #$00
   sta   $2006

   ldx   #$00
   ldy   #$04

.LoadDeck
   txa
   pha

   ldx   #$00
   lda   ($00),X     ;Load up NES image
   sta   $2007

   pla
   tax

   inc   $00
   bne   .NoDeck1
   inc   $01

.NoDeck1
   dex
   bne   .LoadDeck
   dey
   bne   .LoadDeck

   ldx   #$00
   stx   $2003
.CopySpr lda   .SPRMap,X
   sta   $2004
   inx
   bne   .CopySpr


   lda   #$00
   sta   SCROLLBASE      ;Scrolling... for now.
   sta   PALSWITCH
   sta   PALBASE

;************************************


;Enable vblank interrupts, etc.
   lda   #%10001000
   sta   $2000
   lda   #%00011110        ;Screen on, sprites on, show leftmost 8 pixels, colour
   sta   $2001
;  cli            ;Enable interrupts(?)

   lda   #$00
   sta   VBFLAG      ;Store no VB flag.

;Now just loop forever?
.Loop

   lda   #$01
   cmp   VBFLAG
   bne   .Loop
.CheckSpr1 lda $2002
   and   #$40        ;Check for sprite clear!
   bne   .CheckSpr1
.CheckSpr2 lda $2002
   and   #$40
   beq   .CheckSpr2

   lda   #%10011000
   sta   $2000
   lda   #$00
   sta   VBFLAG

   ldy   #$05
.DelayLoop0
   ldx   #$64
.DelayLoop1
   nop
   dex
   bne   .DelayLoop1
   dey
   bne   .DelayLoop0

   ldx   #$00
   ldy   #$30
.ScrollFill
   lda   SCROLLBASE,X
   sta   $2005

   txa
   ldx   #$0A
.FillDelay0
   nop
   dex
   bne   .FillDelay0
   tax

   inx
   dey
   bne   .ScrollFill

.NoCheck
   jmp   .Loop

.Palette dc.b #$30,#$16,#$06,#$0D,#$30,#$28,#$16,#$06,#$30,#$32,#$22,#$12,#$30,#$30,#$30,#$30
         dc.b #$30,#$36,#$17,#$07,#$30,#$3D,#$10,#$00,#$30,#$28,#$18,#$08,#$30,#$11,#$01,#$16

.CMCMap
   INCLUDE MegaManNam.asm

.SPRMap
   INCLUDE MegaManSPR.ASM

NMI_Routine SUBROUTINE
   pha
   php

   inc   PALSWITCH
   lda   PALSWITCH
   cmp   #$08
   bne   .NoSwitchPal
   lda   #$00
   sta   PALSWITCH
   lda   #$3F
   sta   $2006
   lda   #$05
   sta   $2006
   lda   PALBASE
   beq   .EvenPal
   lda   #$38
   sta   $2007
   lda   #$27
   sta   $2007
   lda   #$16
   sta   $2007
   jmp   .OddPal
.EvenPal
   lda   #$28
   sta   $2007
   lda   #$16
   sta   $2007
   lda   #$06
   sta   $2007
.OddPal
   lda   #$01
   eor   PALBASE
   sta   PALBASE
   lda   #$00
   sta   $2006
   sta   $2006

.NoSwitchPal


   lda   #$00
   sta   $2005
   sta   $2005

   lda   #$40
   sta   ADDAMTLO
   lda   #$00
   sta   ADDAMTHI
   tax
   ldy   #$30
.AddScrollBase0
   lda   SCROLLBASE+48,X
   sec
   sbc   ADDAMTLO
   sta   SCROLLBASE+48,X
   lda   SCROLLBASE,X
   sbc   ADDAMTHI
   sta   SCROLLBASE,X
   lda   ADDAMTLO
   clc
   adc   #$18
   sta   ADDAMTLO
   lda   ADDAMTHI
   adc   #$00
   sta   ADDAMTHI
   inx
   dey
   bne   .AddScrollBase0


   lda   #%10001000
   sta   $2000
   lda   #$01
   sta   VBFLAG         ;Store VB flag.

   plp
   pla

   rti

IRQ_Routine       ;Dummy label
   rti

;That's all the code. Now we just need to set the vector table approriately.

   ORG   $FFFA,0
   dc.w  NMI_Routine
   dc.w  Reset_Routine
   dc.w  IRQ_Routine    ;Not used, just points to RTI


;The end.
