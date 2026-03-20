class NesAudioOutputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(32768);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableSamples = 0;

    this.port.onmessage = (event) => {
      const { type, samples } = event.data ?? {};

      if (type === "reset") {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.availableSamples = 0;
        return;
      }

      if (type !== "samples" || !(samples instanceof Float32Array)) {
        return;
      }

      for (let i = 0; i < samples.length; i += 1) {
        if (this.availableSamples >= this.buffer.length) {
          this.readIndex = (this.readIndex + 1) % this.buffer.length;
          this.availableSamples -= 1;
        }

        this.buffer[this.writeIndex] = samples[i];
        this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
        this.availableSamples += 1;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) {
      return true;
    }

    for (let i = 0; i < output.length; i += 1) {
      if (this.availableSamples > 0) {
        output[i] = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.buffer.length;
        this.availableSamples -= 1;
      } else {
        output[i] = 0;
      }
    }

    return true;
  }
}

registerProcessor("nes-audio-output", NesAudioOutputProcessor);
