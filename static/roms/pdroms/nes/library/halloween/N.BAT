del haloween.nes
ca65 haloween.s
ca65 ntdec.s
ld65 -C linker.cfg -o haloween.bin -m map.map -v haloween.o ntdec.o
copy /b header+haloween.bin haloween.nes
pause
c:\emul8\nes\nesticle haloween.nes
rem c:\emul8\nes\loopy haloween.nes
edit haloween.s
