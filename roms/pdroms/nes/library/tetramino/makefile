AS = e:\nesdev\cc65\bin\ca65.exe
LD = e:\nesdev\cc65\bin\ld65.exe
PACK = tools\packbits.exe
DMCENC = tools\81.exe
EMU = e:\games\nes\fceu080win\fceu.exe

OBJS = samples.o unpkb.o map.o blkshape.o t.o
MAPS = how2.pkb nesticle.pkb early.pkb status.pkb changes2.pkb t.pkb title.pkb pause.pkb

.PHONY: run

run: t.nes
	$(EMU) t.nes

$(OBJS): %.o: %.s
	$(AS) $(CFLAGS) $< -o $@

map.o: $(MAPS)

$(MAPS): %.pkb: %.nam
	$(PACK) $< $@

samples.o: 4lines.dmc

%.dmc: %.wav
	$(DMCENC) $< $@ 100 32

map.txt t.prg: $(OBJS)
	$(LD) $(OBJS) -C nes.ini -m map.txt -o t.prg

t.nes: t.prg t.chr
	copy /b t.prg+t.chr t.nes

