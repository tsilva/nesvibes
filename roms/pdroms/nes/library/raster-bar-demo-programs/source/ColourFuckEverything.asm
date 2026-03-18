;Colour bars program
;-------------------
;Binary created using DAsm 2.12 running on an Amiga.

   PROCESSOR   6502

VBPASS   EQU   #$00
LOBYTE   EQU   #$01
HIBYTE   EQU   #$02
CONTROLLER1 EQU #$03
LOBYTEHARD EQU #$04
HIBYTEHARD EQU #$05
LINEDELAY  EQU #$06
LINECOUNT  EQU #$07
WAVYINDEX  EQU #$08
POINTERDELAY EQU #$09
DELAYCOUNT EQU #$0A


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

   ldx   #$0F     ;Colour Value (White)
   ldy   #$20     ;Clear BG & Sprite palettes.
.InitPal stx $2007
   dey
   bne   .InitPal

   lda   #$3F
   sta   $2006
   lda   #$01
   sta   $2006
   lda   #$01
   sta   $2007
   lda   #$11
   sta   $2007
   lda   #$30
   sta   $2007

;   lda   #$3F
;   sta   $2006
;   lda   #$11
;   sta   $2006
;   lda   #$16
;   sta   $2007
;   lda   #$20
;   sta   $2007
;   lda   #$30
;   sta   $2007
;   lda   #$0F
;   sta   $2007
;   lda   #$3B
;   sta   $2007
;   lda   #$28
;   sta   $2007
;   lda   #$38
;   sta   $2007

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


   lda   #$24
   sta   $2006
   lda   #$20
   sta   $2006    ;Point to next NAM table...

   ldx   #$00
.DrawText
   lda   .IntroText,X
   beq   .FinishedText
   sta   $2007
   inx
   jmp   .DrawText

.IntroText
;        12345678911234567892123456789312
   dc.b "'A New Kind of Wavy' demo...  by"
   dc.b "Chris Covell (ccovell@direct.ca)"
   dc.b "This is a work in progress V.0.3"
   dc.b #$00

.FinishedText


;--------------------------------------
;   ldx   #$00
;.CopySPRRAM
;   lda   .SPRROM,X
;   sta   #$0700,X
;   inx
;   bne   .CopySPRRAM
;   jmp   .DoneCopying
;
;
;.SPRROM INCLUDE Stretch.SPR.ASM
;.DoneCopying

;************************************

   lda   #$00
   sta   VBPASS
   lda   #$20
   sta   HIBYTE
   lda   #$00
   sta   LOBYTE
   sta   LOBYTEHARD
   lda   #$40
   sta   LINEDELAY
   lda   #$00
   sta   WAVYINDEX
   lda   #$02
   sta   POINTERDELAY
   sta   DELAYCOUNT

;************************************

;Enable vblank interrupts, etc.
   lda   #%10001001        ;Point to NT2!!!
   sta   $2000
   lda   #%00001110        ;Screen on, sprites off, show leftmost 8 pixels, colour
   sta   $2001
;  cli            ;Enable interrupts(?)

;Now just loop forever?
.Loop
   lda   VBPASS
   beq   .Loop
   lda   #$00
   sta   VBPASS
.WaitforEndofVB
   bit   $2002                ;Wait until VB ends... duh...
   bmi   .WaitforEndofVB

   ldy   #$06
   ldx   #$80
.DelayLineLoop
   dex
   bne   .DelayLineLoop
   dey
   bne   .DelayLineLoop

   lda   #$00                ;32 loops... eventually more...
   sta   LINECOUNT
.LineLoop
   ldy   LINECOUNT
   ldx   .LineDelayTBL,Y
.XDelay01
   dex
   bne   .XDelay01

   lda   #$00
   sta   $2001
   lda   #$3F
   sta   $2006
   lda   #$00
   sta   $2006
;------------------------------------
; WHOOOPPIIIEEEEE!!!!!!
;------------------------------------
   ldx   .PalTBL0,Y
   stx   $2007
   ldx   .PalTBL1,Y
   stx   $2007
   ldx   .PalTBL2,Y
   stx   $2007
   ldx   .PalTBL3,Y
   stx   $2007
   ldx   .PalTBL0,Y
   stx   $2007
   ldx   .PalTBL1,Y
   stx   $2007
   ldx   .PalTBL2,Y
   stx   $2007
   ldx   .PalTBL3,Y
   stx   $2007
   ldx   .PalTBL0,Y
   stx   $2007
   ldx   .PalTBL1,Y
   stx   $2007
   ldx   .PalTBL2,Y
   stx   $2007
   ldx   .PalTBL3,Y
   stx   $2007
   ldx   .PalTBL0,Y
   stx   $2007
   ldx   .PalTBL1,Y
   stx   $2007
   ldx   .PalTBL2,Y
   stx   $2007
   ldx   .PalTBL3,Y
   stx   $2007

   lda   #%00001110        ;Screen on, sprites off, show leftmost 8 pixels, colour
   sta   $2001

   lda   #%10001000
   sta   $2000
   ldx   .PPUTBLHI,Y
   stx   $2006
   ldx   .PPUTBLLO,Y
   stx   $2006
;   lda   #$00
;   sta   $2005      ;DO ***NOT*** Write to the scroll!!!!

   inc   LINECOUNT
   lda   LINECOUNT
   cmp   #$20        ;32 loops for now...
   beq   .FinishedLooping
   jmp   .LineLoop
.FinishedLooping

   lda   #%10011001
   sta   $2000
   lda   #%00000000        ;Screen off, sprites off
   sta   $2001


   jmp   .Loop

.CMCMap
   INCLUDE Stretch.nam.asm

.LineDelayTBL
   ;This is where the delay table for each line goes....
   INCLUDE LineDelayTBL.ASM
.PPUTBLHI
   INCLUDE PPUTBLHI.ASM
.PPUTBLLO
   ;This is where the numbers for each $2006 byte go.
   INCLUDE PPUTBLLO.ASM
.PalTBL0
   INCLUDE PalTBL0.ASM
.PalTBL1
   INCLUDE PalTBL1.ASM
.PalTBL2
   INCLUDE PalTBL2.ASM
.PalTBL3
   INCLUDE PalTBL3.ASM
   ;This is the beginning of the palette tables....

;.StretchTbl
;   INCLUDE StretchTBL.asm

NMI_Routine SUBROUTINE
   pha
   txa
   pha

   lda   #$01
   sta   VBPASS

   lda   #$00
   sta   $2006
   sta   $2006
   sta   $2005
   sta   $2005

   lda   #%10011001
   sta   $2000                ;Point to NT2!!!!
   lda   #%00001110        ;Screen on, sprites on, show leftmost 8 pixels, colour
   sta   $2001


   pla
   tax
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
