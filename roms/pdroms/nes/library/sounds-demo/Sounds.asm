; The product of a discussion in #assembly
; (irc.forgetit.net) when Disch was explaining
; the very basics of NES sound, and the Square Wave
; (Channel 1) particular. Another very basic program,
; it being my second.
;
; Pressing the A and B buttons will change the frequency
; of the wave. One wave is Middle C i beleive, and the 
; other is the note right before Middle C (i'm not a
; music person, can you tell?). The frequencies are
; 261.626 and 246.942, converted using the following
; equation:
;
;         WAVE = 1789772.7272 / (freq + 1) * 16)
;
; Code generated for assembly with NESASM
;
; http://gavin.panicus.org  ::  Gavin - April 25th, 2004
;

;-------------------Set Up .INES Header----------------:
;------------------------------------------------------:

 .inesprg 1	;01 16k prg bank
 .ineschr 0	;no chr bank
 .inesmir 0	;no mirroring
 .inesmap 0	;no mapper

 .bank 0
 .org $8000


;--------------------Set Up Program--------------------:
;------------------------------------------------------:

LastButton = $0E	;Declare in Memory
Joystick   = $0F	;Declare in Memory


RESET:			;make sure everything is ship
 cld			;shape, avoids errors and such.
 sei

ClearRam:		; " "
 ldx #$10
 lda #$00
 sta $00,x
 dex
 beq ClearRam

;---------------------------:

 jsr initSound		;initializes the sound

;--------------------Main Code-------------------------:
;------------------------------------------------------:



Main:



	jsr JoyStickRead	;reads joystick
	jsr JoystickFilter	;acts on joystick info



 jmp Main



;------------------------------------------------------:
;---------------Program "Function Calls"---------------:

initSound:	;**initialize sound hardware**

 lda #%00000001	;bit 1 set = Square Wave Channel 1: ON
 sta $4015
 lda #%00111111 ;full volume, no decay or length
 sta $4000

 rts

;---------------------------:

playSoundA:	;These two addresses make up the 11-bit
		;sound wave. For A-Button.

 lda #%10101010
 sta $4002		;full 8-bits

 lda #%00000001
 sta $4003		;can't excede first 3 bits

 rts

;---------------------------:

playSoundB:	;These two addresses make up the 11-bit
		;sound wave. For B-Button.

 lda #%11000011
 sta $4002		;full 8-bits

 lda #%00000001
 sta $4003		;can't excede first 3 bits

 rts

;---------------------------:

JoyStickRead:		;**-Get Joystick Status**

 lda #$01	; directly loads the Accumulator with 1
 sta $4016	; stores the Accumulator (1) into $4016
 lda #$00	; directly loads the Accumulator with 0
 sta $4016	; stores the Accumulator (0) into $4016

 ldx #$08	; loads 8 so it can loop for each byte

joyloop:
 lda $4016	; loads the info from the joystick
 and #$03	; ||
 cmp #$01	; narrows down the data
 rol $02	; rotates info into memory...
 dex 		; decrements X 
 bne joyloop	; loops again if not 0 

 lda $02
 sta Joystick

 rts 		; returns to main routine

;---------------------------:

JoystickFilter:

Acheck:	  			;A Button
 lda Joystick
 and #$80
 beq Bcheck

 cmp LastButton
 beq Bcheck
 sta LastButton

 jsr playSoundA		;plays A-Button Tone

 jmp Xcheck



Bcheck:	  			;B Button
 lda Joystick
 and #$40
 beq Xcheck

 cmp LastButton
 beq Xcheck
 sta LastButton

 jsr playSoundB		;plays B-Button Tone

 jmp Xcheck



Xcheck:

 rts

;--------------------End Code--------------------------:
;------------------------------------------------------:

 .bank 1

 .org  $FFFA
 .dw   0
 .dw   RESET
 .dw   0