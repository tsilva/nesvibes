/*
packbits.c
RLE compress a file
By Damian Yerrick


Copyright 2000 Damian Yerrick

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.

*/


#include <stdio.h>
#include <stdlib.h>

/* fpack() *****************************
 * Write PackBits() encoded data to a file.
 * buffer, file: as fwrite()
 * size: size of source (unpacked) buffer
 * returns: number of packed bytes written
 */
size_t fpack(const unsigned char *buf, size_t size, FILE *fp)
{
  char b[127];
  unsigned int bdex = 0, i = 0, j = 0, t = 0;

  do {
    /* zero the line index */
    i = 0;

    /* check for a run of at least three bytes */
    while((buf[t + i] == buf[t + i + 1]) &&
          (buf[t + i] == buf[t + i + 2]) &&
          (t + i + 3 < size) && (i < 126))
      i++;

    /* if there's a run... */
    if((i > 0 && bdex > 0) || (bdex >= 127))
    {
      /* if there's a literal string... */
      fputc(bdex - 1, fp);
      j++;
      /* write it to the file. */
      j += fwrite(b, 1, bdex, fp);
      bdex = 0;
    }
    if(i > 0)
    {
      /* and then write the run. */
      i += 2;
      fputc(257 - i, fp);
      fputc(buf[t], fp);
      t += i;
      j += 2;
    }
    else
    {
      b[bdex++] = buf[t++];
    }
  } while(t < size);
  if(bdex)
  {
    /* if there's a literal string... */
    fputc(bdex - 1, fp);
    j++;
    /* write it to the file. */
    j += fwrite(b, 1, bdex, fp);
    bdex = 0;
  }

  return j;
}

int main(int argc, char **argv)
{
  FILE *infile, *outfile;
  unsigned char *buf;
  size_t filelen;

  if(argc < 2)
  {
    fputs("syntax: packbits infile.nam outfile.pkb\n", stderr);
    return 1;
  }

  infile = fopen(argv[1], "rb");
  if(infile == 0)
  {
    fprintf(stderr, "packbits could not open %s for reading\n", argv[1]);
    return 1;
  }
  outfile = fopen(argv[2], "wb");
  if(outfile == 0)
  {
    fprintf(stderr, "packbits could not open %s for writing\n", argv[2]);
    fclose(infile);
    return 1;
  }

//fprintf(stderr, "compressing %s into %s\n", argv[1], argv[2]);

  // get the size of the file
  fseek(infile, 0, SEEK_END);
  filelen = ftell(infile);
  fseek(infile, 0, SEEK_SET);
  printf("reading %lu bytes\n", filelen);

  buf = malloc(filelen);
  if(buf == 0)
  {
    fprintf(stderr, "packbits could not allocate %lu bytes to hold the file",
            filelen);
    fclose(infile);
    fclose(outfile);
    return 1;
  }

  fread(buf, 1, filelen, infile);
  fclose(infile);
  /* write length */
  fputc((unsigned char)(filelen >>  8), outfile);
  fputc((unsigned char)(filelen      ), outfile);
  /* write file */
  printf("compressed to %lu bytes.\n", fpack(buf, filelen, outfile));
  free(buf);
  fclose(outfile);
  return 0;
}


