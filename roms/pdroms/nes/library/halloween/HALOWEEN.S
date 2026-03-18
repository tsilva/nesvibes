;               Totally crappy source code 
;
;               by Memblers
;
;       program assmembles with CA65
 
 .import NT_decode

.segment "VECTORS"
.addr NMI
.addr PRG
.addr IRQ

.segment "DATA"
sprites: .res $100
music: .res $100
pal: .res 32
lines: .res 1

joy1 = $00
joy1old = $01
to_do = $02
count2 = $03

count_lo = $04
count_hi = $05
addr_lo = $06 ; 16bit low
addr_hi = $07 ; 16bit high

b1_addr_l = $08
b1_addr_h = $09
b2_addr_l = $0A
b2_addr_h = $0B
b3_addr_l = $0C
b3_addr_h = $0D
b4_addr_l = $0E
b4_addr_h = $0F
b5_addr_l = $10
b5_addr_h = $11
b6_addr_l = $12
b6_addr_h = $13
b7_addr_l = $14
b7_addr_h = $15
b8_addr_l = $16
b8_addr_h = $17

old_order = $40
count3 = $41
count4 = $42
count = $43
count5 = $44
count6 = $45
count7 = $46
count8 = $47
done = $48
scount_lo = $49
scount_hi = $4A

NED_ChnVolume           = NED_RAM_BASE + $00
NED_CurrOrder           = NED_ZRAM_BASE + $05
NED_CurrRow             = NED_ZRAM_BASE + $04
NED_RAM_BASE = $300
NED_ZRAM_BASE = $90

a_button = 128          ; joystick stuff
b_button = 64
select_button = 32
start_button = 16
up_button = 8
down_button = 4
left_button = 2
right_button = 1


.segment "CODE"

.macro vb_start
.local wait
        wait:
                lda $2002
                bpl wait
.endmacro

.macro vb_end
.local wait
        wait:
                lda $2002
                bmi wait
.endmacro

.macro inc16 addr
.local no_inc
                inc addr
                bne no_inc
                inc addr + 1
        no_inc:
.endmacro

        
.macro drawblood addr
.local go, go2
        lda addr + 1
        sta $2006
        lda addr
        sta $2006

        lda #$10
        sta $2007

        lda addr + 1
        cmp #$23
        bne go
        lda addr
        cmp #$D0
        beq go2
go:     
        lda addr
        clc
        adc #32
        sta addr
        lda addr + 1
        adc #0
        sta addr + 1
go2:
.endmacro


        .incbin "sound.prg"              ; music

PRG:
        sei
        cld
        ldx #0
        stx $2000
        stx $2001
        stx $4015
        stx $2005
        stx $2005
        stx $2006
        stx $2006
        dex
        txs

        vb_start
        vb_start

        inx
        txa
clear_ram:        
        sta $00, x
        sta $200, x
        sta $300, x
        sta $400, x
        sta $500, x
        sta $600, x
        sta $700, x
        inx
        bne clear_ram

        lda #0
        sta $2005
        sta $2005
        sta $2006
        sta $2006
clear_vram:
        sta $2007
        inc addr_lo
        bne @no_inc
        inc addr_hi
@no_inc:
        ldy addr_hi
        cpy #$3F
        bne clear_vram

        lda #$3F
        sta $2006
        lda #0
        sta $2006
        
        ldx #0
@save_pal:
        lda palette, x
        sta $2007
        inx
        cpx #32
        bne @save_pal

        lda # < graphics
        sta addr_lo
        lda # > graphics
        sta addr_hi

        ldy #0
        sty $2006
        sty $2006
draw_chr:
        lda (addr_lo), y
        cmp #$7D
        beq end
        sta $2007
        inc16 addr_lo
        jmp draw_chr
end:

        lda # > name
        sta addr_hi
        lda # < name
        sta addr_lo
        lda #0
        jsr NT_decode

        lda #0
        sta $2005
        sta $2005
        sta $2006
        sta $2006

        lda #2
        sta count_lo
        lda #3
        sta count_hi
        lda #7
        sta count
        sta count2
        sta count3
        sta count4
        sta count5
        sta count6
        sta count7

        lda #$10
        sta $201
        sta $205
        sta $209
        sta $20D
        sta $211
        sta $215
        sta $219
        sta $21D
        lda #152
        sta $203
        lda #40
        sta $207
        lda #88
        sta $20B
        lda #176
        sta $20F
        lda #224
        sta $213
        lda #16
        sta $217
        lda #200
        sta $21B
        lda #64
        sta $21F

        lda #$FF
        sta $200
        sta $204
        sta $208
        sta $20C
        sta $210
        sta $214
        sta $218
        sta $21C

        lda #0
        jsr $8003

        lda #$20
        sta b1_addr_h
        sta b2_addr_h
        sta b3_addr_h
        sta b4_addr_h
        sta b5_addr_h
        sta b6_addr_h
        sta b7_addr_h
        sta b8_addr_h
        lda #$13
        sta b1_addr_l
        lda #$05
        sta b2_addr_l
        lda #$0B
        sta b3_addr_l
        lda #$16
        sta b4_addr_l
        lda #$1C
        sta b5_addr_l
        lda #$02
        sta b6_addr_l
        lda #$19
        sta b7_addr_l
        lda #$09
        sta b8_addr_l

        lda #%10000000
        sta $2000
        lda #%00011110
        sta $2001

loop:
        vb_end

        jsr $8000

        vb_start

        lda #$FF
        and joy1
        beq loop
        and joy1old
        bne loop

        lda #1
        ;sta lines
        jsr $8003

        lda #1
        ;sta NED_CurrOrder

        lda #$23
        sta $2006
        lda #$0A
        sta $2006
        
        ldx #0
@save:        
        lda memblers, x
        cmp #$EA
        beq loop2
        sta $2007
        inx
        jmp @save

loop2:
        vb_end

        lda NED_CurrOrder
        cmp #3
        beq quitloop2
        jsr $8000

        vb_start
        jmp loop2
quitloop2:
        vb_end

        jsr $8000

        lda done
        cmp #1
        bne norm
        lda #$FF        
        sta lines
        jmp skip
norm:
        lda NED_CurrRow
        lsr
        lsr
        lsr
        lsr
        cmp #16
        beq normal
        lda #1
        sta done
        jmp skip
        
normal:
        sta lines
skip:

        lda lines
        sta to_do

        vb_start

        lda scount_hi
        cmp #8
        beq quitloop2

        inc16 scount_lo
        
        dec count_lo
        bne go
        lda #2
        sta count_lo
        jmp do_odd
go:
        inc $200
        inc count
        lda count
        cmp #8
        bne next
        lda #0
        sta count

        drawblood b1_addr_l
        
next:
        dec to_do
        bne @go2
        jmp quitloop2
@go2:
        inc $204
        inc count2
        lda count2
        cmp #8
        bne next2
        lda #0
        sta count2

        drawblood b2_addr_l
next2:
        dec to_do
        bne @go3
        jmp quitloop2
@go3:
        inc $218
        inc count7
        lda count7
        cmp #8
        bne bext
        lda #0
        sta count7

        drawblood b7_addr_l
bext:
;        inc $20C
;        inc count4
;        lda count4
;        cmp #8
;        bne nextx
;        lda #0
;        sta count
;
;        drawblood b4_addr_l
;nextx:
;        dec to_do
;        bne @gox
;        jmp quitloop2
@gox:

do_odd:
        dec count_hi
        bne go2
        lda #3
        sta count_hi
        jmp quitloop2
go2:
        inc $208
        inc count3
        lda count3
        cmp #8
        bne next3
        lda #0
        sta count3

        drawblood b3_addr_l
next3:
        dec to_do
        bne @go4
        jmp quitloop2
@go4:
        inc $210
        inc count5
        lda count5
        cmp #8
        bne next4
        lda #0
        sta count5

        drawblood b5_addr_l
next4:
        dec to_do
        bne @go
        jmp quitloop2
@go:
        inc $214
        inc count6
        lda count6
        cmp #8
        bne next6
        lda #0
        sta count6

        drawblood b6_addr_l
next6:
        dec to_do
        bne @go
        jmp quitloop2
@go:

        jmp quitloop2

NMI:
        pha
        txa
        pha
        tya
        pha

        lda #0
        sta $2005
        sta $2005
        sta $2006
        sta $2006
        sta $2003
        lda #2
        sta $4014

        lda joy1
        sta joy1old

        ldy     #$01    ;
        sty     $4016   ; reset strobe
        dey
        sty     $4016   ; clear strobe
        sty     joy1    ; clears joystick data
        ldy     #$08    ; do all 8 buttons
read_buttons:
        lda     $4016   ; load button status
        and     #$01    ; only keep lowest bit
        lsr     a       ; transfer to carry flag
        rol     joy1
        dey
        bne     read_buttons
        
        pla
        tay
        pla
        tax
        pla
IRQ:
        rti

palette:
        .incbin "blank.pal"
        .incbin "blank.pal"
graphics:
        .incbin "haloween.gfx"
        .byte $7D
name:
        .incbin "haloween.cmp"
memblers:
        .incbin "memb.nam"
        .byte $EA
