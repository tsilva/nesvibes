;Colour bars program
;-------------------
;Binary created using DAsm 2.12 running on an Amiga.

   PROCESSOR   6502

SCROLL   EQU   #$0000
SCROLL1  EQU   #$0001
SCROLL2  EQU   #$0002
NMIPASS  EQU   #$0003
SCROLLHEIGHT EQU #$0004
SCROLLSPEED  EQU #$0005
VBWAIT   EQU   #$0006
CONTROLLER1  EQU #$0007
VBDELAY  EQU   #$0008
PALINDEX EQU   #$0009
PALDELAY EQU   #$000A
SINDEX   EQU   #$000B
WAVEADD  EQU   #$10

;----------------------

   ORG   $C000    ;16Kb PRG-ROM, 8Kb CHR-ROM

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
   ldy   #$20     ;Set BG & Sprite palettes.
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

   lda   #$27
   sta   $2006
   lda   #$80
   sta   $2006

   lda   #$07
   ldy   #$40
.OtherNAMLoop sta $2007
   dey
   bne   .OtherNAMLoop

   lda   #$00                 ;REALLY lazy, I know!
   sta   $2003
   lda   #$DF
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$00
   sta   $2004
   lda   #$08
   sta   $2004

   lda   #$DF
   sta   $2004
   lda   #$02
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$44
   sta   $2004

   lda   #$DF
   sta   $2004
   lda   #$03
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$54
   sta   $2004

   lda   #$DF
   sta   $2004
   lda   #$02
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$64
   sta   $2004

   lda   #$DF
   sta   $2004
   lda   #$05
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$84
   sta   $2004

   lda   #$DF
   sta   $2004
   lda   #$04
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$94
   sta   $2004

   lda   #$DF
   sta   $2004
   lda   #$06
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$A4
   sta   $2004

   lda   #$DF
   sta   $2004
   lda   #$04
   sta   $2004
   lda   #$01
   sta   $2004
   lda   #$B4
   sta   $2004


   lda   #$00
   sta   $2005
   sta   $2005

   sta   SCROLL
   sta   SCROLL1
   sta   SCROLL2
   sta   NMIPASS
   sta   VBWAIT
   sta   VBDELAY
   sta   SINDEX


   lda   #$01
   sta   PALINDEX
   lda   #$0A
   sta   PALDELAY

   lda   #$08
   sta   SCROLLHEIGHT
   lda   #$04
   sta   SCROLLSPEED

   lda   #<.SINTAB
   sta   WAVEADD
   lda   #>.SINTAB
   sta   WAVEADD+1

;************************************


;Enable vblank interrupts, etc.
   lda   #%10001000
   sta   $2000
   lda   #%00011110        ;Screen on, sprites on, show leftmost 8 pixels, colour
   sta   $2001
;  cli            ;Enable interrupts(?)

;Now just loop forever?
;.Loop
;   lda   $2002
;   bmi   .Loop

.Loop
   lda   NMIPASS
   beq   .Loop

.Loop0
   lda   $2002
   bmi   .Loop0

.Loop0A
   lda   $2002
   and   #$40
   bne   .Loop0A

   lda   #$00
   sta   NMIPASS
   ldy   SCROLL

.Loop1
   lda   $2002
   and   #%00010000
   bne   .Loop1

   inc   SCROLL2
   lda   SCROLL2
   cmp   SCROLLHEIGHT
   bne   .NoUpdateScroll
   lda   #$00
   sta   SCROLL2

   lda   (WAVEADD),Y
;   lda   .SINTAB,X
   sta   $2005
   lda   #$00
   sta   $2005
   iny
   cpy   #$40
   bne   .NoUpdateScroll
   ldy   #$00
.NoUpdateScroll

.Loop0B
   lda   $2002
   and   #$40
   beq   .Loop1

   lda   #$00
   sta   $2005
   sta   $2005

   jmp   .Loop

.SINTAB

   INCLUDE FireWave.ASM
   INCLUDE CMCSINE1.TXT
   INCLUDE CMCSINE2.TXT
   INCLUDE CMCSINE3.TXT
   INCLUDE CMCSINE4.TXT
   INCLUDE CMCSINE5.TXT
   INCLUDE CMCSINE6.TXT
   INCLUDE CMCSINE7.TXT

.Palette dc.b #$0D,#$0C,#$1C,#$2C,#$0D,#$01,#$11,#$21
         dc.b #$0D,#$02,#$12,#$22,#$0D,#$03,#$13,#$23
         dc.b #$0D,#$05,#$15,#$25,#$0D,#$12,#$03,#$0D
         dc.b #$0D,#$07,#$17,#$27,#$0D,#$08,#$18,#$28

.CMCMap
   INCLUDE cmcNAM.asm


NMI_Routine SUBROUTINE
   pha

   lda   #$01
   sta   NMIPASS

   lda   VBWAIT
   beq   .ReadController
   jmp   .NoRead

.ReadController
   ldx   #$01
   stx   $4016
   dex
   stx   $4016
   ldy   #$08     ;Read 8 bits from $4016
   lda   #$00
   sta   CONTROLLER1
.ReadCont1
   lda   $4016
   ror
   lda   CONTROLLER1
   rol
   sta   CONTROLLER1
   dey
   bne   .ReadCont1
   sta   CONTROLLER1

   lda   CONTROLLER1
   and   #%10000000
   beq   .NotA

   lda   #$40
   clc
   adc   WAVEADD
   sta   WAVEADD
   lda   #$00
   adc   WAVEADD+1
   sta   WAVEADD+1
   inc   SINDEX
   lda   SINDEX
   cmp   #$08
   bne   .SineReset
   lda   #$00
   sta   SINDEX
   lda   WAVEADD+1
   sec
   sbc   #$02
   sta   WAVEADD+1
.SineReset
   lda   #$10
   sta   VBWAIT
   jmp   .NotContRead

.NotA
   lda   CONTROLLER1
   and   #%01000000
   beq   .NotB

   lda   WAVEADD
   sec
   sbc   #$40
   sta   WAVEADD
   lda   WAVEADD+1
   sbc   #$00
   sta   WAVEADD+1
   dec   SINDEX
   lda   SINDEX
   cmp   #$FF
   bne   .SineReset2
   lda   #$07
   sta   SINDEX
   lda   WAVEADD+1
   clc
   adc   #$02
   sta   WAVEADD+1
.SineReset2


   lda   #$10
   sta   VBWAIT
   jmp   .NotContRead

.NotB
   lda   CONTROLLER1
   and   #%00100000
   beq   .NotSel
   inc   PALDELAY
   lda   PALDELAY
   cmp   #$60
   bne   .NotTooSlowPal
   lda   #$5F
   sta   PALDELAY
.NotTooSlowPal
   lda   #$10
   sta   VBWAIT
   jmp   .NotContRead

.NotSel
   lda   CONTROLLER1
   and   #%00010000
   beq   .NotStart
   dec   PALDELAY
   lda   PALDELAY
   cmp   #$00
   bne   .NotTooFastPal
   lda   #$01
   sta   PALDELAY
.NotTooFastPal
   lda   #$10
   sta   VBWAIT
   jmp   .NotContRead

.NotStart
   lda   CONTROLLER1
   and   #%00001000
   beq   .NotUp
   dec   SCROLLHEIGHT
   lda   SCROLLHEIGHT
   cmp   #$00
   bne   .NotTooTight
   lda   #$01
   sta   SCROLLHEIGHT
.NotTooTight
   lda   #$10
   sta   VBWAIT
   jmp   .NotContRead

.NotUp
   lda   CONTROLLER1
   and   #%00000100
   beq   .NotDown
   inc   SCROLLHEIGHT
   lda   SCROLLHEIGHT
   cmp   #$20
   bne   .NotTooTall
   lda   #$1F
   sta   SCROLLHEIGHT
.NotTooTall
   lda   #$10
   sta   VBWAIT
   jmp   .NotContRead

.NotDown
   lda   CONTROLLER1
   and   #%00000010
   beq   .NotLeft
   inc   SCROLLSPEED
   lda   SCROLLSPEED
   cmp   #$20
   bne   .NotTooSlow
   lda   #$1F
   sta   SCROLLSPEED
.NotTooSlow
   lda   #$10
   sta   VBWAIT
   jmp   .NotContRead

.NotLeft
   lda   CONTROLLER1
   and   #%00000001
   beq   .NotRight
   dec   SCROLLSPEED
   lda   #$00
   sta   SCROLL1
   lda   SCROLLSPEED
   cmp   #$00
   bne   .NotTooFast
   lda   #$01
   sta   SCROLLSPEED
.NotTooFast
   lda   #$10
   sta   VBWAIT

.NotRight
   jmp   .NotContRead
.NoRead
   dec   VBWAIT
.NotContRead

   lda   VBDELAY
   bne   .NoPaletteChange

   lda   #$3F
   sta   $2006
   lda   #$00
   sta   $2006

   ldy   #$04
   ldx   PALINDEX
.PalIndexLoop
   lda   #$0D
   sta   $2007
   txa
   sta   $2007
   clc
   adc   #$10
   sta   $2007
   clc
   adc   #$10
   sta   $2007
   inx
   cpx   #$0D
   bne   .NoResetPal
   ldx   #$01
.NoResetPal
   dey
   bne   .PalIndexLoop

   lda   #$3F
   sta   $2006
   lda   #$13
   sta   $2006
   lda   PALINDEX
   clc
   adc   #$20
   sta   $2007

   inc   PALINDEX
   lda   PALINDEX
   cmp   #$0D
   bne   .NoResetPalIndex
   lda   #$01
   sta   PALINDEX
.NoResetPalIndex

   lda   PALDELAY
   sta   VBDELAY
   jmp   .PaletteChanged
.NoPaletteChange
   dec   VBDELAY
.PaletteChanged

   lda   #$00
   sta   SCROLL2
   sta   $2005
   sta   $2005
   sta   $2006
   sta   $2006

   inc   SCROLL1
   lda   SCROLL1
   cmp   SCROLLSPEED
   bne   .NotTooWavy
   lda   #$00
   sta   SCROLL1

   inc   SCROLL
   lda   SCROLL
   cmp   #$40
   bne   .NotTooWavy
   lda   #$00
   sta   SCROLL

.NotTooWavy

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
