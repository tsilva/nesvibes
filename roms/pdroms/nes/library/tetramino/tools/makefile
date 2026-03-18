EXE = .exe  # use for windoze
#EXE =       # use for *n?x

all: packbits$(EXE) 81$(EXE) # bmp2nes$(EXE)

packbits$(EXE): packbits.c
	gcc -Wall -O3 packbits.c -o packbits$(EXE)

#bmp2nes$(EXE): bmp2nes.c
#	gcc -Wall -O3 bmp2nes.c -lalleg -o bmp2nes$(EXE)

81$(EXE): 81.c readwav.c readwav.h
	gcc -Wall -O3 81.c readwav.c -o readwav$(EXE)