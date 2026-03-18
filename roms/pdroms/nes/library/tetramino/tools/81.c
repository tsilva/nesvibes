/* myima.c
   encode ADPCM

Copyright (C) 2003  Damian Yerrick

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to 
  Free Software Foundation, Inc., 59 Temple Place - Suite 330,
  Boston, MA  02111-1307, USA.
GNU licenses can be viewed online at http://www.gnu.org/copyleft/

In addition, as a special exception, Damian Yerrick gives
permission to link the code of this program with import libraries
distributed as part of the plug-in development tools published by
the vendor of any audio manipulation program, and distribute
linked combinations including the two.  You must obey the GNU
General Public License in all respects for all of the code used
other than the plug-in interface.  If you modify this file, you
may extend this exception to your version of the file, but you
are not obligated to do so.  If you do not wish to do so, delete
this exception statement from your version.

Visit http://www.pineight.com/ for more information.

*/

/* Explanation

This program compresses 8-bit .wav samples into the 1-bit
delta modulation format that the Famicom and NES use to store
sampled sound.  While compressing, it scales the volume to a
more NES-friendly range and oversamples the sound.  Tip: set
oversampling to 414% for 8 kHz samples or 300% for 11 kHz samples.
Play them back on the NES at speed $F (33 KHz).  It'll use 4 KB
per second, but it's worth it for speech, especially when you're
using a mapper such as MMC3 that can map the $C000 region.

*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "readwav.h"


/* WAV OUTPUT STUFF ************************************************/

typedef struct WAVOUT_SPECS
{
  unsigned long len;  /* in samples per channel */
  unsigned long sample_rate;  /* in Hz */
  unsigned char sample_width;  /* in bytes per sample, usually 1 or 2 */
  unsigned char channels;
} WAVOUT_SPECS;

const unsigned char canonical_wav_header[44] =
{
  'R','I','F','F',  0,  0,  0,  0,'W','A','V','E','f','m','t',' ',
   16,  0,  0,  0,  1,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    0,  0,  0,  0,'d','a','t','a',  0,  0,  0,  0
};

void fill_32(unsigned char *dest, unsigned long src)
{
  int i;

  for(i = 0; i < 4; i++)
    {
      *dest++ = src;
      src >>= 8;
    }
}

void wavout_make_header(unsigned char *header, const WAVOUT_SPECS *data)
{
  memcpy(header, canonical_wav_header, 44);

  header[22] = data->channels;
  header[32] = data->sample_width * header[22];
  fill_32(header + 24, data->sample_rate);
  fill_32(header + 28, header[32] * data->sample_rate);
  header[34] = 8 * data->sample_width;
  fill_32(header + 4, data->len * header[32] + 36);
  fill_32(header + 40, data->len * header[32]);
}


/* NOISE SHAPED DITHERING *************************/



int main(int argc, char **argv)
{
  WAVE_SRC wav;
  FILE *outfp, *codefp;
  int maxinamp = 24;
  int subsample = 99, oversampling = 100;
  long filelen;
  int y = 0, x = 0;


  if(argc < 3)
  {
    fputs("81 by Damian Yerrick: compresses pcm wav file to 8ad\n"
          "usage: 81 infile outfile [upsample_pct [amplitude]]\n"
          "example: 81 song.wav song.dmc 100 24\n", stderr);
    return EXIT_FAILURE;
  }

  if(argc > 3)
  {
    oversampling = atoi(argv[3]);
    if(oversampling < 100)
      oversampling = 100;
    if(oversampling > 1000)
      oversampling = 1000;
  }

  if(argc > 4)
  {
    maxinamp = atoi(argv[4]);
    if(maxinamp < 2)
      maxinamp = 2;
    if(maxinamp > 40)
      maxinamp = 40;
  }

  printf("oversample: %d; amplitude: %d\n", oversampling, maxinamp);


  if(open_wave_src(&wav, argv[1]) < 0)
  {
    fputs("couldn't open wave file\n", stderr);
    return EXIT_FAILURE;
  }

  if(wav.fmt.channels != 1)
  {
    fputs("wave file isn't mono\n", stderr);
    close_wave_src(&wav);
    return EXIT_FAILURE;
  }

  codefp = fopen(argv[2], "wb");
  if(!codefp)
  {
    fputs("couldn't write to dmc file\n", stderr);
    perror(argv[2]);
    close_wave_src(&wav);
    return EXIT_FAILURE;
  }

  outfp = fopen("decomp.wav", "wb");
  if(!outfp)
  {
    fputs("couldn't write to output wave file\n", stderr);
    close_wave_src(&wav);
    fclose(codefp);
    return EXIT_FAILURE;
  }

  {
    WAVOUT_SPECS specs;
    unsigned char header[44];

    specs.len = wav.chunk_left / wav.fmt.frame_size * oversampling / 100;
    specs.sample_rate = wav.fmt.sample_rate * oversampling / 100;
    specs.sample_width = 1;
    specs.channels = 1;

    wavout_make_header(header, &specs);
    fwrite(header, 1, sizeof(header), outfp);
  }

  while(wav.chunk_left > 0)
  {
    int i;
    unsigned char code = 0;

    for(i = 0; i < 8; i++)
    {
      /* read sample */
      while(subsample < 100)
      {
        x = (get_next_wav_sample(&wav) * maxinamp + 16384) >> 15;
        filelen--;
        subsample += oversampling;
      }
      subsample -= 100;

      if(x >= y)
      {
        y++;
        if(y > 31)
          y = 31;
        code |= 1 << i;
      }
      else
      {
        y--;
        if(y < -32)
          y = -32;
      }

      fputc(y * 4 + 128, outfp);
    }
    fputc(code, codefp);
  }
  fclose(outfp);
  fclose(codefp);
  close_wave_src(&wav);

  return 0;
}
