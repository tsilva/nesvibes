import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createNesEmulator, getButtonForKeyboardCode } from "../src/lib/emu/nes-emulator.js";

function createCanvasStub() {
  const state = { fills: [], images: [] };
  const context = {
    fillStyle: "#000",
    imageSmoothingEnabled: true,
    fillRect(...args) { state.fills.push({ color: this.fillStyle, args }); },
    createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4), width, height }; },
    putImageData(image, x, y) { state.images.push({ image, x, y }); },
  };
  return {
    width: 256,
    height: 240,
    focusCalls: [],
    state,
    getContext(kind) {
      assert.equal(kind, "2d");
      return context;
    },
    focus(options) { this.focusCalls.push(options); },
  };
}

function withRuntimeStubs(run) {
  const original = {
    performance: globalThis.performance,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    window: globalThis.window,
    consoleError: console.error,
  };
  let nextFrame = 1;
  const frames = new Map();
  globalThis.performance = { now: () => 0 };
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(nextFrame, callback);
    return nextFrame++;
  };
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
  globalThis.window = {};
  console.error = () => {};
  try {
    return run({ frames });
  } finally {
    globalThis.performance = original.performance;
    globalThis.requestAnimationFrame = original.requestAnimationFrame;
    globalThis.cancelAnimationFrame = original.cancelAnimationFrame;
    globalThis.window = original.window;
    console.error = original.consoleError;
  }
}

function loadRom(relativePath) {
  return new Uint8Array(readFileSync(resolve(process.cwd(), relativePath)));
}

function setVectors(prg, { nmi = 0xc000, reset = 0xc000, irq = 0xc000 } = {}) {
  const view = new DataView(prg.buffer, prg.byteOffset, prg.byteLength);
  view.setUint16(prg.length - 6, nmi, true);
  view.setUint16(prg.length - 4, reset, true);
  view.setUint16(prg.length - 2, irq, true);
}

function createUxRomFixture() {
  const header = Uint8Array.from([0x4e, 0x45, 0x53, 0x1a, 2, 0, 0x20, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
  const bank0 = new Uint8Array(0x4000);
  const bank1 = new Uint8Array(0x4000);
  bank0[0] = 0xea;
  bank1.set([0xa9, 0x01, 0x8d, 0x00, 0x80, 0x4c, 0x05, 0xc0], 0);
  setVectors(bank1);
  return new Uint8Array([...header, ...bank0, ...bank1]);
}

test("keyboard mapping and idle lifecycle stay stable", () => withRuntimeStubs(() => {
  const canvas = createCanvasStub();
  const emulator = createNesEmulator({ canvas });
  assert.equal(getButtonForKeyboardCode("KeyX"), "a");
  assert.equal(getButtonForKeyboardCode("KeyZ"), "b");
  assert.equal(getButtonForKeyboardCode("Unknown"), null);
  assert.equal(emulator.hasActiveRom(), false);
  assert.equal(emulator.pause(), false);
  assert.equal(emulator.resume(), false);
  assert.equal(emulator.setButtonByCode("KeyX", true), false);
  emulator.drawPlaceholder();
  assert.equal(canvas.state.fills.at(-1)?.color, "#000");
  emulator.stop();
  emulator.destroy();
}));

test("invalid ROM errors are preserved", () => withRuntimeStubs(() => {
  const emulator = createNesEmulator({ canvas: createCanvasStub() });
  assert.throws(() => emulator.loadRomBytes(new Uint8Array([1, 2, 3])), /too small|valid iNES header/);
  assert.throws(
    () => emulator.loadRomBytes(Uint8Array.from([0x4e, 0x45, 0x53, 0x1a, 1, 0, 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    /Trainer ROMs are not supported/
  );
  emulator.destroy();
}));

for (const rom of [
  { mapper: 0, path: "static/roms/pdroms/nes/library/bingo/bingo.nes" },
  { mapper: 1, path: "static/roms/pdroms/nes/library/elite/ELITE.NES" },
  { mapper: 3, path: "static/roms/pdroms/nes/library/cmc-80s/CMC80s.NES" },
  { mapper: 4, path: "static/roms/pdroms/nes/library/sack-of-flour-heart-of-gold/SOF_v1d.nes" },
]) {
  test(`bundled mapper ${rom.mapper} ROM loads and exposes debugger state`, () => withRuntimeStubs(() => {
    const canvas = createCanvasStub();
    const emulator = createNesEmulator({ canvas });
    emulator.loadRomBytes(loadRom(rom.path));
    const snapshot = emulator.getDebugSnapshot({ startAddress: 0x8000, length: 16 });
    assert.equal(emulator.hasActiveRom(), true);
    assert.equal(typeof snapshot.cpu.pc, "number");
    assert.equal(snapshot.memory.length, 16);
    assert.equal(snapshot.memory.bytes.length, 16);
    assert.deepEqual(canvas.focusCalls.at(-1), { preventScroll: true });
    emulator.stop();
    emulator.destroy();
  }));
}

test("synthetic mapper 2 ROM still bank-switches and keeps debugger invariants", () => withRuntimeStubs(() => {
  const emulator = createNesEmulator({ canvas: createCanvasStub() });
  emulator.loadRomBytes(createUxRomFixture());
  assert.equal(emulator.isDebugWritableAddress(0x0000), true);
  assert.equal(emulator.isDebugWritableAddress(0x6000), true);
  assert.equal(emulator.isDebugWritableAddress(0x2000), false);
  assert.equal(emulator.isDebugWritableAddress(0x8000), false);
  assert.equal(emulator.setDebugByte(0x0000, 0x42), true);
  assert.equal(emulator.setDebugByte(0x6000, 0x24), true);
  assert.equal(emulator.setDebugByte(0x2000, 0x11), false);
  assert.equal(emulator.setDebugByte(0x8000, 0x11), false);
  assert.equal(emulator.getDebugSnapshot({ startAddress: 0x8000, length: 1 }).memory.bytes[0], 0xea);
  for (let step = 0; step < 16 && emulator.getDebugSnapshot({ startAddress: 0x8000, length: 1 }).memory.bytes[0] !== 0xa9; step += 1) {
    emulator.stepInstruction();
  }
  assert.equal(emulator.getDebugSnapshot({ startAddress: 0x8000, length: 1 }).memory.bytes[0], 0xa9);
  const snapshot = emulator.getDebugSnapshot({ startAddress: 0x0000, length: 0x20 });
  assert.equal(snapshot.memory.bytes[0], 0x42);
  assert.equal(emulator.getDebugSnapshot({ startAddress: 0x6000, length: 1 }).memory.bytes[0], 0x24);
  assert.equal(Array.isArray(snapshot.cpu.flags), true);
  assert.equal(snapshot.paused, true);
  emulator.destroy();
}));
