;Colour bars program
;-------------------
;Binary created using DAsm 2.12 running on an Amiga.

   PROCESSOR   6502

NUM_LINES EQU #$B0
LUMDELAYVAL EQU #$01
CHROMDELAYVAL EQU #$0A

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
LUMPOS EQU #$0B
CHROMPOS EQU #$0C
LUMDELAY EQU #$0D
CHROMDELAY EQU #$0E
VBODD    EQU #$0F

LUMADD   EQU #$10       ;Pointers to the tables...
CHROMADD EQU #$12
LUMDELTA EQU #$14
CHROMDELTA EQU #$15


PalTBL0 EQU #$0600

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


;---------------------------------------------------------------
   ldx   #$00
.CopyTBLs
   lda   .PalTBL0Hard,X
   sta   PalTBL0,X
   inx
   bne   .CopyTBLs

;---------------------------------------------------------------
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

   lda   #$3F
   sta   $2006
   lda   #$11
   sta   $2006
   lda   #$16
   sta   $2007
   lda   #$20
   sta   $2007
   lda   #$30
   sta   $2007
   lda   #$0F
   sta   $2007
   lda   #$3B
   sta   $2007
   lda   #$28
   sta   $2007
   lda   #$38
   sta   $2007

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
   dc.b "Chroma & Luma Bars Demo V.0.5 by"
   dc.b "ccovell@direct.ca !USE LOOPYNES!"
   dc.b "Inspired by Mem's Demo. THANX! _"
   dc.b #$00

.FinishedText

   lda   #$17
   sta   $0700
   lda   #$5F
   sta   $0701
   lda   #$00
   sta   $0702
   lda   #$F8
   sta   $0703


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
   sta   VBODD
   sta   LUMPOS
   sta   CHROMPOS
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

   lda   #$00
   sta   LUMADD
   sta   CHROMADD       ;Positions in ROM...
   lda   #$F4
   sta   LUMADD+1
   lda   #$F5
   sta   CHROMADD+1     ;Hi addresses in ROM

   lda   #LUMDELAYVAL
   sta   LUMDELAY
   sta   LUMDELTA
   lda   #CHROMDELAYVAL
   sta   CHROMDELAY
   sta   CHROMDELTA

;************************************

;Enable vblank interrupts, etc.
   lda   #%10001001        ;Point to NT2!!!
   sta   $2000
   lda   #%00011110        ;Screen on, sprites on, show leftmost 8 pixels, colour
   sta   $2001
;  cli            ;Enable interrupts(?)
   jmp   .Loop

   ORG   $E400             ;Align nice and evenly....

;Now just loop forever?
.Loop
   lda   VBPASS
   beq   .Loop
   lda   #$00
   sta   VBPASS
;.WaitforEndofVB
;   bit   $2002                ;Wait until VB ends... duh...
;   bmi   .WaitforEndofVB

;.WaitforSpriteClear
;   bit   $2002
;   bvs   .WaitforSpriteClear

.WaitforSpriteHit
   bit   $2002                ;Check for sprite hit...
   bvc   .WaitforSpriteHit

   ldx   #$77        ;This is perfectly timed (at $77)...
.DelayLineLoop
   dex
   bne   .DelayLineLoop

   lda   #$00
   sta   $2001             ;Turn off sprites and BG....

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
   ldx   PalTBL0,Y
   stx   $2007

   lda   #%00010110        ;Screen off, sprites on, show leftmost 8 pixels, colour
   sta   $2001

;   lda   #%10001000
;   sta   $2000
;   ldx   .PPUTBLHI,Y
;   stx   $2006
;   ldx   .PPUTBLLO,Y
;   stx   $2006
;   lda   #$00
;   sta   $2005      ;DO ***NOT*** Write to the scroll!!!!

   inc   LINECOUNT
   lda   LINECOUNT
   cmp   #NUM_LINES        ;192 loops for now...
   beq   .FinishedLooping
   jmp   .LineLoop
.FinishedLooping

   lda   #%10011001
   sta   $2000
   lda   #%00000110        ;Screen off, sprites on
   sta   $2001

   jsr   LineArt

   jmp   .Loop

.CMCMap
   INCLUDE Stretch.nam.asm

   ORG   $F000

.LineDelayTBL
   ;This is where the delay table for each line goes....
   INCLUDE LineDelayTBL.ASM
;.PPUTBLHI
;   INCLUDE PPUTBLHI.ASM
;.PPUTBLLO
;   ;This is where the numbers for each $2006 byte go.
;   INCLUDE PPUTBLLO.ASM
.PalTBL0Hard
   INCLUDE PalTBL0.ASM
;.PalTBL1
;   INCLUDE PalTBL1.ASM
;.PalTBL2
;   INCLUDE PalTBL2.ASM
;.PalTBL3
;   INCLUDE PalTBL3.ASM
;   ;This is the beginning of the palette tables....
;
;.StretchTbl
;   INCLUDE StretchTBL.asm

LineArt SUBROUTINE
;   lda   #%00100111        ;Screen off, sprites on, Monochrome
;   sta   $2001

   lda   LUMDELTA
   sta   LUMDELAY
   lda   CHROMDELTA
   sta   CHROMDELAY

   ldy   #$00
   ldx   #NUM_LINES
.LineLoop01
   lda   (LUMADD),Y
   ora   (CHROMADD),Y
   sta   PalTBL0,X
;-----------------------
   dec   LUMDELAY
   bne   .NoLumChange
   inc   LUMADD
   lda   #LUMDELAYVAL
   sta   LUMDELAY
.NoLumChange
   dec   CHROMDELAY
   bne   .NoChromChange
   inc   CHROMADD
   lda   #CHROMDELAYVAL
   sta   CHROMDELAY
.NoChromChange

;-----------------------
   dex
   bne   .LineLoop01

   lda   VBODD
   bne   .NoLumChange2

   dec   LUMDELTA
   bne   .NoLumChange2
   dec   LUMPOS
   lda   #LUMDELAYVAL
   sta   LUMDELTA
.NoLumChange2
   lda   LUMPOS
   sta   LUMADD

   lda   VBODD
   bne   .NoChromChange2

   dec   CHROMDELTA
   bne   .NoChromChange2
   inc   CHROMPOS
   lda   #CHROMDELAYVAL
   sta   CHROMDELTA
.NoChromChange2
   lda   CHROMPOS
   sta   CHROMADD


   ldx   #NUM_LINES
   dex
   lda   #$0D
   sta   PalTBL0,X

;   lda   #%00111111        ;Screen on, sprites on, show leftmost 8 pixels, colour
;   sta   $2001

   lda   #%00011110        ;Screen on, sprites on, show leftmost 8 pixels, colour
   sta   $2001

   rts

   ORG $F400

.LumTBL
   INCLUDE Luminance.asm
.ChromTBL
   INCLUDE Chrominance.asm

NMI_Routine SUBROUTINE
   pha
   txa
   pha

   lda   #$01
   sta   VBPASS

   lda   VBODD
   eor   #$01
   sta   VBODD

   lda   #$00
   sta   $2003
   lda   #$07
   sta   $4014

   lda   #$00
   sta   $2006
   sta   $2006
   sta   $2005
   sta   $2005


   lda   #%10011001
   sta   $2000                ;Point to NT2!!!!
   lda   #%00011110        ;Screen on, sprites on, show leftmost 8 pixels, colour
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
