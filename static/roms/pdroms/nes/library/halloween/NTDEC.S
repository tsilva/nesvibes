; This is the 6502 code for decompressing the compressed name table
; created by NTENC.EXE. I'm sure it can be improved, but the main
; concern was getting it working right. :-)
;
; This code was successfully assembled with X816. Of course, this
; is not a stand-alone program, it has to be included and called
; from your own code. Use a BIN2DB util to include the nametable
; data as a series of .DB's.
;
; IN:   ADDR_HI = High byte of 16-bit pointer to compressed data
;       ADDR_LO = Low byte of 16-bit pointer to compressed data
;             A = Name Table #

COUNT_LO = $04
COUNT_HI = $05
ADDR_LO = $06 ; 16bit low
ADDR_HI = $07 ; 16bit high

;.import COUNT_LO, COUNT_HI, ADDR_LO, ADDR_HI
.export NT_decode

NT_decode:
        and     #$03
        asl
        asl
        ora     #$20
        sta     $2006   ; write high byte of PPU address
        lda     #$00
        sta     $2006   ; write low byte of PPU address
        tay
        lda     (ADDR_LO),y
        sta     COUNT_LO
        iny
        lda     (ADDR_LO),y
        sta     COUNT_HI
        lda     #$02
        clc
        adc     ADDR_LO
        sta     ADDR_LO
        lda     #$00
        tay
        rol
        adc     ADDR_HI
        sta     ADDR_HI
NT_loop:
        lda     (ADDR_LO),y
        iny
        bne     plus
        inc     ADDR_HI
        plus:
        pha
        and     #%11100000
        cmp     #%11100000
        beq     NT_rep_data
        pla
        ldx     #$01
        bpl     NT_rep_loop
NT_rep_data:
        pla
        and     #%00011111
        tax
        lda     (ADDR_LO),y
        iny
        bne     NT_rep_loop
        inc     ADDR_HI
NT_rep_loop:
        sta     $2007
        dex
        bne     NT_rep_loop
NT_check:
        dec     COUNT_LO
        bne     NT_loop
        dec     COUNT_HI
        bpl     NT_loop
NT_end_decode:
        rts
