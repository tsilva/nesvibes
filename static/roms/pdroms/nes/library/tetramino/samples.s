.segment "CODE"
.global play_dmc
play_dmc:
  asl a
  tax
  lda dmctable+1,x
  sta $4010
  lda #$20
  sta $4011
  lda dmctable,x
  sta $4012
  eor #$ff
  adc dmctable+2,x
  asl a
  asl a
  sta $4013
  lda #$1f
  sta $4015
  rts

.segment "DMC"
.incbin "4lines.dmc"

.segment "RODATA"
.global dmctable
dmctable:
  .byt   0, $0e
  .byt  30

