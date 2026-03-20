const CPU_FLAG_CARRY = 0x01,
  CPU_FLAG_ZERO = 0x02,
  CPU_FLAG_INTERRUPT = 0x04,
  CPU_FLAG_DECIMAL = 0x08;
const CPU_FLAG_BREAK = 0x10,
  CPU_FLAG_UNUSED = 0x20,
  CPU_FLAG_OVERFLOW = 0x40,
  CPU_FLAG_NEGATIVE = 0x80;
const DISASSEMBLY_BEFORE_COUNT = 8,
  DISASSEMBLY_AFTER_COUNT = 12,
  DISASSEMBLY_SCAN_BACK_BYTES = 0x40;
const NES_PALETTE = [
  [124, 124, 124],
  [0, 0, 252],
  [0, 0, 188],
  [68, 40, 188],
  [148, 0, 132],
  [168, 0, 32],
  [168, 16, 0],
  [136, 20, 0],
  [80, 48, 0],
  [0, 120, 0],
  [0, 104, 0],
  [0, 88, 0],
  [0, 64, 88],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [188, 188, 188],
  [0, 120, 248],
  [0, 88, 248],
  [104, 68, 252],
  [216, 0, 204],
  [228, 0, 88],
  [248, 56, 0],
  [228, 92, 16],
  [172, 124, 0],
  [0, 184, 0],
  [0, 168, 0],
  [0, 168, 68],
  [0, 136, 136],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [248, 248, 248],
  [60, 188, 252],
  [104, 136, 252],
  [152, 120, 248],
  [248, 120, 248],
  [248, 88, 152],
  [248, 120, 88],
  [252, 160, 68],
  [248, 184, 0],
  [184, 248, 24],
  [88, 216, 84],
  [88, 248, 152],
  [0, 232, 216],
  [120, 120, 120],
  [0, 0, 0],
  [0, 0, 0],
  [252, 252, 252],
  [164, 228, 252],
  [184, 184, 248],
  [216, 184, 248],
  [248, 184, 248],
  [248, 164, 192],
  [240, 208, 176],
  [252, 224, 168],
  [248, 216, 120],
  [216, 248, 120],
  [184, 248, 184],
  [184, 248, 216],
  [0, 252, 252],
  [248, 216, 248],
  [0, 0, 0],
  [0, 0, 0],
];
const NTSC_CPU_CLOCK = 1789773;
const LENGTH_TABLE = [
  10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14, 12, 16, 24, 18,
  48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30,
];
const PULSE_DUTY_TABLE = [
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 1, 1],
];
const TRIANGLE_SEQUENCE = [
  15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14, 15,
];
const NOISE_PERIOD_TABLE = [
  4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068,
];
const AUDIO_WORKLET_PROCESSOR_NAME = "nes-audio-output",
  AUDIO_WORKLET_CHUNK_SIZE = 512;
const CONTROLLER_BUTTON_BITS = {
  a: 0,
  b: 1,
  select: 2,
  start: 3,
  up: 4,
  down: 5,
  left: 6,
  right: 7,
};
const CONTROLLER_BUTTON_ORDER = Object.keys(CONTROLLER_BUTTON_BITS);
const DEBUG_CPU_FLAGS = [
  ["N", CPU_FLAG_NEGATIVE],
  ["V", CPU_FLAG_OVERFLOW],
  ["U", CPU_FLAG_UNUSED],
  ["B", CPU_FLAG_BREAK],
  ["D", CPU_FLAG_DECIMAL],
  ["I", CPU_FLAG_INTERRUPT],
  ["Z", CPU_FLAG_ZERO],
  ["C", CPU_FLAG_CARRY],
];
const MMC1_MIRRORING_MODES = [
  "single-screen-lower",
  "single-screen-upper",
  "vertical",
  "horizontal",
];
const MMC3_CHR_BANK_SELECTORS = [
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ],
  [
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
];
const PPU_DEFAULTS = {
  ctrl: 0,
  mask: 0,
  status: 0,
  oamAddr: 0,
  readBuffer: 0,
  openBus: 0,
  v: 0,
  t: 0,
  x: 0,
  w: 0,
  scanline: 261,
  cycle: 0,
  frameReady: false,
  nmiPending: false,
  lineBaseV: 0,
};
const CPU_DEFAULTS = {
  a: 0,
  x: 0,
  y: 0,
  s: 0xfd,
  p: CPU_FLAG_INTERRUPT | CPU_FLAG_UNUSED,
  pc: 0,
  stallCycles: 0,
};
const APU_DEFAULTS = {
  frameMode: 0,
  frameInterruptInhibit: false,
  frameInterruptFlag: false,
  pendingFrameCounterWrite: null,
  cpuCycles: 0,
  sampleClock: 0,
  sampleRate: 0,
  dmcOutput: 0,
  dmcEnabled: false,
  highPass90: null,
  highPass440: null,
  lowPass14k: null,
};
const MMC1_DEFAULTS = {
  shiftRegister: 0x10,
  control: 0x0c,
  chrBank0: 0,
  chrBank1: 0,
  prgBank: 0,
};
const MMC3_DEFAULTS = {
  bankSelect: 0,
  prgMode: 0,
  chrMode: 0,
  irqLatch: 0,
  irqCounter: 0,
  irqReload: false,
  irqEnabled: false,
  irqPending: false,
};
const CARTRIDGE_TYPES = {};
const wrapIndex = (index, size) => (size <= 0 ? 0 : index % size);
const resetFields = (target, defaults) => Object.assign(target, defaults);
function setLengthEnabled(channel, enabled) {
  channel.enabled = enabled;
  if (!enabled) channel.lengthCounter = 0;
}
const writeTimerLow = (channel, value) => {
  channel.timerPeriod = (channel.timerPeriod & 0x0700) | value;
};
const loadLengthCounter = (channel, value) => {
  if (channel.enabled)
    channel.lengthCounter = LENGTH_TABLE[(value >> 3) & 0x1f];
};
const clockLengthCounter = (channel, halted) => {
  if (channel.lengthCounter > 0 && !halted) channel.lengthCounter -= 1;
};
const getBankOffset = (addr, shift) => addr & ((1 << shift) - 1);
class Cartridge {
  static fromINES(bytes) {
    if (bytes.length < 16)
      throw new Error("ROM is too small to contain an iNES header");
    if (
      bytes[0] !== 0x4e ||
      bytes[1] !== 0x45 ||
      bytes[2] !== 0x53 ||
      bytes[3] !== 0x1a
    )
      throw new Error("ROM does not contain a valid iNES header");
    const [prgBanks, chrBanks, flags6, flags7] = bytes.slice(4, 8);
    if (flags6 & 0x04) throw new Error("Trainer ROMs are not supported");
    const prgSize = prgBanks * 0x4000,
      chrSize = chrBanks * 0x2000,
      prgRom = bytes.slice(16, 16 + prgSize);
    const CartridgeType = CARTRIDGE_TYPES[(flags6 >> 4) | (flags7 & 0xf0)];
    if (!CartridgeType)
      throw new Error(
        `Unsupported mapper ${(flags6 >> 4) | (flags7 & 0xf0)}. This build supports mappers 0, 1, 2, 3, and 4.`,
      );
    return new CartridgeType({
      prgRom,
      chrRom:
        chrSize > 0
          ? bytes.slice(16 + prgSize, 16 + prgSize + chrSize)
          : new Uint8Array(0x2000),
      hasChrRam: chrSize === 0,
      mirroring: flags6 & 0x01 ? "vertical" : "horizontal",
      fourScreen: (flags6 & 0x08) !== 0,
      prgRamSize: (bytes[8] || 1) * 0x2000,
    });
  }
  constructor({
    prgRom,
    chrRom,
    hasChrRam,
    mirroring,
    fourScreen = false,
    prgRamSize = 0,
  }) {
    Object.assign(this, { prgRom, chrRom, hasChrRam, mirroring, fourScreen });
    this.prgRam = new Uint8Array(prgRamSize);
    this.prgRamEnabled = this.prgRam.length > 0;
    this.prgRamWriteProtected = false;
  }
  reset() {
    this.prgRamEnabled = this.prgRam.length > 0;
    this.prgRamWriteProtected = false;
  }
  getNametableRamSize() {
    return this.fourScreen ? 0x1000 : 0x0800;
  }
  normalizePrgBank(bank, shift) {
    return wrapIndex(bank, Math.max(1, this.prgRom.length >> shift));
  }
  normalizeChrBank(bank, shift) {
    return wrapIndex(bank, Math.max(1, this.chrRom.length >> shift));
  }
  getPrgBankAddress(addr, bank, shift) {
    return (
      this.normalizePrgBank(bank, shift) * (1 << shift) +
      getBankOffset(addr, shift)
    );
  }
  getChrBankAddress(addr, bank, shift) {
    return (
      this.normalizeChrBank(bank, shift) * (1 << shift) +
      getBankOffset(addr, shift)
    );
  }
  readBankedPrg(addr, bank, shift) {
    return this.prgRom[this.getPrgBankAddress(addr, bank, shift)];
  }
  readBankedChr(addr, bank, shift) {
    return this.chrRom[this.getChrBankAddress(addr, bank, shift)];
  }
  writeBankedChr(addr, value, bank, shift) {
    if (this.hasChrRam)
      this.chrRom[this.getChrBankAddress(addr, bank, shift)] = value & 0xff;
  }
  readPrg() {
    return 0;
  }
  writePrg() {}
  readPrgRam(addr) {
    return !this.prgRamEnabled || this.prgRam.length === 0
      ? 0
      : this.prgRam[wrapIndex(addr - 0x6000, this.prgRam.length)];
  }
  writePrgRam(addr, value) {
    if (
      this.prgRamEnabled &&
      !this.prgRamWriteProtected &&
      this.prgRam.length > 0
    )
      this.prgRam[wrapIndex(addr - 0x6000, this.prgRam.length)] = value & 0xff;
  }
  readChr(addr) {
    return this.chrRom[wrapIndex(addr & 0x1fff, this.chrRom.length)];
  }
  writeChr(addr, value) {
    if (this.hasChrRam)
      this.chrRom[wrapIndex(addr & 0x1fff, this.chrRom.length)] = value;
  }
  mirrorNametableAddress(addr) {
    if (this.fourScreen) return addr & 0x0fff;
    const index = addr & 0x0fff,
      table = index >> 10,
      offset = index & 0x03ff;
    if (this.mirroring === "single-screen-lower") return offset;
    if (this.mirroring === "single-screen-upper") return 0x0400 + offset;
    return (
      (this.mirroring === "vertical" ? table & 0x01 : (table >> 1) & 0x01) *
        0x0400 +
      offset
    );
  }
  clockScanline() {}
  hasIRQ() {
    return false;
  }
}
class NROMCartridge extends Cartridge {
  readPrg(addr) {
    return this.prgRom[
      this.prgRom.length === 0x4000 ? addr & 0x3fff : addr - 0x8000
    ];
  }
}
class UxROMCartridge extends Cartridge {
  prgBank = 0;
  reset() {
    super.reset();
    this.prgBank = 0;
  }
  readPrg(addr) {
    return this.readBankedPrg(
      addr,
      addr & 0x4000 ? (this.prgRom.length >> 14) - 1 : this.prgBank,
      14,
    );
  }
  writePrg(_, value) {
    this.prgBank = value & 0xff;
  }
}
class CNROMCartridge extends NROMCartridge {
  chrBank = 0;
  reset() {
    super.reset();
    this.chrBank = 0;
  }
  readChr(addr) {
    return this.readBankedChr(addr, this.chrBank, 13);
  }
  writeChr(addr, value) {
    this.writeBankedChr(addr, value, this.chrBank, 13);
  }
  writePrg(_, value) {
    this.chrBank = value & 0xff;
  }
}
class MMC1Cartridge extends Cartridge {
  reset() {
    super.reset();
    resetFields(this, MMC1_DEFAULTS);
    if (!this.fourScreen) this.mirroring = "horizontal";
  }
  readPrg(addr) {
    const mode = (this.control >> 2) & 0x03,
      slot = (addr - 0x8000) >> 14,
      lastBank = (this.prgRom.length >> 14) - 1;
    const bank =
      mode <= 1
        ? (this.prgBank & 0x0e) + slot
        : mode === 2
          ? slot === 0
            ? 0
            : this.prgBank
          : slot === 0
            ? this.prgBank
            : lastBank;
    return this.readBankedPrg(addr, bank, 14);
  }
  writePrg(addr, value) {
    if (value & 0x80)
      return (
        (this.shiftRegister = 0x10),
        (this.control |= 0x0c),
        void this.updateMirroring()
      );
    const commit = (this.shiftRegister & 0x01) !== 0;
    this.shiftRegister = (this.shiftRegister >> 1) | ((value & 0x01) << 4);
    if (!commit) return;
    const data = this.shiftRegister & 0x1f;
    if (addr < 0xa000) {
      this.control = data;
      this.updateMirroring();
    } else if (addr < 0xc000) this.chrBank0 = data;
    else if (addr < 0xe000) this.chrBank1 = data;
    else {
      this.prgBank = data & 0x0f;
      this.prgRamEnabled = this.prgRam.length > 0 && (data & 0x10) === 0;
    }
    this.shiftRegister = 0x10;
  }
  readChr(addr) {
    return this.readBankedChr(addr, this.resolveChrBank(addr), 12);
  }
  writeChr(addr, value) {
    this.writeBankedChr(addr, value, this.resolveChrBank(addr), 12);
  }
  resolveChrBank(addr) {
    return ((this.control >> 4) & 0x01) === 0
      ? this.normalizeChrBank(
          (this.chrBank0 & 0x1e) + ((addr & 0x1000) >> 12),
          12,
        )
      : this.normalizeChrBank(
          (addr & 0x1000) === 0 ? this.chrBank0 : this.chrBank1,
          12,
        );
  }
  updateMirroring() {
    if (!this.fourScreen)
      this.mirroring = MMC1_MIRRORING_MODES[this.control & 0x03];
  }
}
class MMC3Cartridge extends Cartridge {
  bankRegisters = new Uint8Array(8);
  reset() {
    super.reset();
    resetFields(this, MMC3_DEFAULTS);
    this.bankRegisters.fill(0);
    this.bankRegisters[7] = 1;
  }
  readPrg(addr) {
    const slot = (addr - 0x8000) >> 13,
      lastBank = (this.prgRom.length >> 13) - 1,
      secondLastBank = Math.max(0, lastBank - 1);
    const bank = [
      this.prgMode ? secondLastBank : this.bankRegisters[6],
      this.bankRegisters[7],
      this.prgMode ? this.bankRegisters[6] : secondLastBank,
      lastBank,
    ][slot];
    return this.readBankedPrg(addr, bank, 13);
  }
  writePrg(addr, value) {
    const address = addr & 0xffff;
    if (address < 0xa000) {
      if ((address & 1) === 0) {
        this.bankSelect = value & 0x07;
        this.prgMode = (value >> 6) & 0x01;
        this.chrMode = (value >> 7) & 0x01;
      } else {
        this.writeBankData(value);
      }
      return;
    }
    if (address < 0xc000) {
      if ((address & 1) === 0) {
        if (!this.fourScreen)
          this.mirroring = (value & 0x01) === 0 ? "vertical" : "horizontal";
      } else {
        this.prgRamWriteProtected = (value & 0x40) !== 0;
        this.prgRamEnabled = (value & 0x80) !== 0;
      }
      return;
    }
    if (address < 0xe000)
      return (address & 1) === 0
        ? (this.irqLatch = value & 0xff)
        : (this.irqReload = true);
    if ((address & 1) === 0)
      ((this.irqEnabled = false), (this.irqPending = false));
    else this.irqEnabled = true;
  }
  writeBankData(value) {
    this.bankRegisters[this.bankSelect] =
      value & (this.bankSelect <= 1 ? 0xfe : 0xff);
  }
  getChrAddress(addr) {
    const [registerIndex, offset] =
      MMC3_CHR_BANK_SELECTORS[this.chrMode][(addr & 0x1fff) >> 10];
    return (
      this.normalizeChrBank(this.bankRegisters[registerIndex] + offset, 10) *
        0x0400 +
      (addr & 0x03ff)
    );
  }
  readChr(addr) {
    return this.chrRom[this.getChrAddress(addr)];
  }
  writeChr(addr, value) {
    if (this.hasChrRam) this.chrRom[this.getChrAddress(addr)] = value & 0xff;
  }
  clockScanline() {
    if (this.irqCounter === 0 || this.irqReload)
      ((this.irqCounter = this.irqLatch), (this.irqReload = false));
    else this.irqCounter = (this.irqCounter - 1) & 0xff;
    if (this.irqCounter === 0 && this.irqEnabled) this.irqPending = true;
  }
  hasIRQ() {
    return this.irqPending;
  }
}
Object.assign(CARTRIDGE_TYPES, {
  0: NROMCartridge,
  1: MMC1Cartridge,
  2: UxROMCartridge,
  3: CNROMCartridge,
  4: MMC3Cartridge,
});
class Controller {
  constructor() {
    resetFields(this, { state: 0, shift: 0, strobe: 0 });
  }
  setButton(button, pressed) {
    const bit = CONTROLLER_BUTTON_BITS[button];
    if (bit === undefined) return;
    this.state = pressed ? this.state | (1 << bit) : this.state & ~(1 << bit);
  }
  write(value) {
    const nextStrobe = value & 1;
    if (this.strobe && !nextStrobe) this.shift = this.state;
    this.strobe = nextStrobe;
    if (nextStrobe) this.shift = this.state;
  }
  read() {
    const value = this.strobe ? this.state & 1 : this.shift & 1;
    this.shift = this.strobe ? this.state : (this.shift >> 1) | 0x80;
    return value | 0x40;
  }
}
class PPU {
  constructor(cartridge) {
    this.cartridge = cartridge;
    this.nametableRam = new Uint8Array(cartridge.getNametableRamSize());
    this.paletteRam = new Uint8Array(0x20);
    this.oam = new Uint8Array(0x100);
    this.framebuffer = new Uint8ClampedArray(256 * 240 * 4);
    this.reset();
  }
  reset() {
    resetFields(this, PPU_DEFAULTS);
    this.lineSprites = [];
  }
  isRenderingEnabled() {
    return (this.mask & 0x18) !== 0;
  }
  backgroundEnabled() {
    return (this.mask & 0x08) !== 0;
  }
  spritesEnabled() {
    return (this.mask & 0x10) !== 0;
  }
  triggerNMI() {
    this.nmiPending = true;
  }
  pollNMI() {
    if (!this.nmiPending) return false;
    this.nmiPending = false;
    return true;
  }
  readRegister(addr) {
    const reg = addr & 0x2007;
    let value = this.openBus;
    switch (reg) {
      case 0x2002:
        value = (this.status & 0xe0) | (this.openBus & 0x1f);
        this.status &= ~0x80;
        this.w = 0;
        break;
      case 0x2004:
        value = this.oam[this.oamAddr];
        break;
      case 0x2007: {
        const address = this.v & 0x3fff;
        const readValue = this.read(address);
        if (address >= 0x3f00)
          ((value = readValue),
            (this.readBuffer = this.read(address - 0x1000)));
        else ((value = this.readBuffer), (this.readBuffer = readValue));
        this.incrementVramAddress();
        break;
      }
    }
    this.openBus = value;
    return value;
  }
  writeRegister(addr, value) {
    this.openBus = value;
    switch (addr & 0x2007) {
      case 0x2000: {
        const wasNmiEnabled = (this.ctrl & 0x80) !== 0;
        this.ctrl = value;
        this.t = (this.t & 0xf3ff) | ((value & 0x03) << 10);
        if (!wasNmiEnabled && this.ctrl & 0x80 && this.status & 0x80)
          this.triggerNMI();
        break;
      }
      case 0x2001:
        this.mask = value;
        break;
      case 0x2003:
        this.oamAddr = value;
        break;
      case 0x2004:
        this.oam[this.oamAddr] = value;
        this.oamAddr = (this.oamAddr + 1) & 0xff;
        break;
      case 0x2005:
        if (this.w === 0)
          ((this.t = (this.t & 0x7fe0) | (value >> 3)),
            (this.x = value & 0x07),
            (this.w = 1));
        else
          ((this.t =
            (this.t & 0x0c1f) | ((value & 0x07) << 12) | ((value & 0xf8) << 2)),
            (this.w = 0));
        break;
      case 0x2006:
        if (this.w === 0)
          ((this.t = (this.t & 0x00ff) | ((value & 0x3f) << 8)), (this.w = 1));
        else
          ((this.t = (this.t & 0x7f00) | value),
            (this.v = this.t),
            (this.w = 0));
        break;
      case 0x2007:
        this.write(this.v & 0x3fff, value);
        this.incrementVramAddress();
        break;
    }
  }
  writeOamDma(buffer) {
    for (let i = 0; i < 256; i += 1)
      this.oam[(this.oamAddr + i) & 0xff] = buffer[i];
  }
  incrementVramAddress() {
    this.v = (this.v + (this.ctrl & 0x04 ? 32 : 1)) & 0x7fff;
  }
  read(addr) {
    const address = addr & 0x3fff;
    if (address < 0x2000) return this.cartridge.readChr(address);
    if (address < 0x3f00)
      return this.nametableRam[this.cartridge.mirrorNametableAddress(address)];
    return this.paletteRam[this.normalizePaletteAddress(address)];
  }
  write(addr, value) {
    const address = addr & 0x3fff;
    if (address < 0x2000) return void this.cartridge.writeChr(address, value);
    if (address < 0x3f00)
      return void (this.nametableRam[
        this.cartridge.mirrorNametableAddress(address)
      ] = value);
    this.paletteRam[this.normalizePaletteAddress(address)] = value & 0x3f;
  }
  normalizePaletteAddress(addr) {
    const index = addr & 0x1f;
    return index >= 0x10 && (index & 0x03) === 0 ? index - 0x10 : index;
  }
  incrementX() {
    if ((this.v & 0x001f) === 31) this.v = (this.v & ~0x001f) ^ 0x0400;
    else this.v += 1;
  }
  incrementY() {
    if ((this.v & 0x7000) !== 0x7000) return void (this.v += 0x1000);
    this.v &= ~0x7000;
    let y = (this.v & 0x03e0) >> 5;
    if (y === 29) ((y = 0), (this.v ^= 0x0800));
    else if (y === 31) y = 0;
    else y += 1;
    this.v = (this.v & ~0x03e0) | (y << 5);
  }
  copyHorizontalBits() {
    this.v = (this.v & ~0x041f) | (this.t & 0x041f);
  }
  copyVerticalBits() {
    this.v = (this.v & ~0x7be0) | (this.t & 0x7be0);
  }
  rewindHorizontalTiles(addr, count) {
    let value = addr;
    for (let i = 0; i < count; i += 1) {
      if ((value & 0x001f) === 0) value = ((value & ~0x001f) | 31) ^ 0x0400;
      else value -= 1;
    }
    return value;
  }
  decodeBackgroundPixel(screenX) {
    if (!this.backgroundEnabled() || (screenX < 8 && (this.mask & 0x02) === 0))
      return { pixel: 0, palette: 0 };
    const coarseXBase = this.lineBaseV & 0x001f;
    const coarseY = (this.lineBaseV >> 5) & 0x001f;
    const nametableXBase = (this.lineBaseV >> 10) & 0x01;
    const nametableY = (this.lineBaseV >> 11) & 0x01;
    const fineY = (this.lineBaseV >> 12) & 0x07;
    const pixelOffset = this.x + screenX;
    const tileX = (coarseXBase + (pixelOffset >> 3)) & 0x1f;
    const nametableX =
      nametableXBase ^ ((coarseXBase + (pixelOffset >> 3)) >> 5);
    const bit = 7 - (pixelOffset & 0x07);
    const nametable = 0x2000 | (nametableY << 11) | (nametableX << 10);
    const tileAddress = nametable | (coarseY << 5) | tileX;
    const tileId = this.read(tileAddress);
    const attributeAddress =
      nametable | 0x03c0 | ((coarseY >> 2) << 3) | (tileX >> 2);
    const attribute = this.read(attributeAddress);
    const palette =
      (attribute >> (((coarseY & 0x02) << 1) | (tileX & 0x02))) & 0x03;
    const patternBase = this.ctrl & 0x10 ? 0x1000 : 0x0000;
    const patternAddress = patternBase + tileId * 16 + fineY;
    const low = this.read(patternAddress);
    const high = this.read(patternAddress + 8);
    const pixel = ((low >> bit) & 0x01) | (((high >> bit) & 0x01) << 1);
    return { pixel, palette };
  }
  getSpritePixel(screenX, screenY) {
    if (!this.spritesEnabled() || (screenX < 8 && (this.mask & 0x04) === 0))
      return null;
    const spriteHeight = this.ctrl & 0x20 ? 16 : 8;
    for (const sprite of this.lineSprites) {
      if (screenX < sprite.x || screenX >= sprite.x + 8) continue;
      let row = screenY - (sprite.y + 1);
      let column = screenX - sprite.x;
      if (sprite.attributes & 0x80) row = spriteHeight - 1 - row;
      if (sprite.attributes & 0x40) column = 7 - column;
      let patternBase;
      let tileIndex;
      let fineY = row;
      if (spriteHeight === 16) {
        patternBase = (sprite.tileIndex & 0x01) * 0x1000;
        tileIndex = sprite.tileIndex & 0xfe;
        if (fineY >= 8) ((tileIndex += 1), (fineY -= 8));
      } else {
        patternBase = this.ctrl & 0x08 ? 0x1000 : 0x0000;
        tileIndex = sprite.tileIndex;
      }
      const patternAddress = patternBase + tileIndex * 16 + fineY;
      const low = this.read(patternAddress);
      const high = this.read(patternAddress + 8);
      const bit = 7 - column;
      const pixel = ((low >> bit) & 0x01) | (((high >> bit) & 0x01) << 1);
      if (pixel !== 0)
        return {
          pixel,
          palette: (sprite.attributes & 0x03) + 4,
          priorityBehindBackground: (sprite.attributes & 0x20) !== 0,
          sprite0: sprite.index === 0,
        };
    }
    return null;
  }
  evaluateSpritesForScanline(scanline) {
    this.lineSprites = [];
    const spriteHeight = this.ctrl & 0x20 ? 16 : 8;
    let visibleCount = 0;
    for (let i = 0; i < 64; i += 1) {
      const base = i * 4;
      const y = this.oam[base];
      const row = scanline - (y + 1);
      if (row < 0 || row >= spriteHeight) continue;
      visibleCount += 1;
      if (this.lineSprites.length < 8)
        this.lineSprites.push({
          index: i,
          y,
          tileIndex: this.oam[base + 1],
          attributes: this.oam[base + 2],
          x: this.oam[base + 3],
        });
    }
    if (visibleCount > 8) this.status |= 0x20;
  }
  readColor(paletteIndex, pixel) {
    return NES_PALETTE[
      pixel === 0
        ? this.paletteRam[0] & 0x3f
        : this.paletteRam[
            this.normalizePaletteAddress(0x3f00 + paletteIndex * 4 + pixel)
          ] & 0x3f
    ];
  }
  renderPixel() {
    const screenX = this.cycle - 1;
    const screenY = this.scanline;
    const bg = this.decodeBackgroundPixel(screenX);
    const sprite = this.getSpritePixel(screenX, screenY);
    let color = this.readColor(0, 0);
    if (
      sprite &&
      sprite.sprite0 &&
      sprite.pixel !== 0 &&
      bg.pixel !== 0 &&
      screenX < 255
    )
      this.status |= 0x40;
    if (
      sprite &&
      sprite.pixel !== 0 &&
      (bg.pixel === 0 || !sprite.priorityBehindBackground)
    )
      color = this.readColor(sprite.palette, sprite.pixel);
    else if (bg.pixel !== 0) color = this.readColor(bg.palette, bg.pixel);
    const offset = (screenY * 256 + screenX) * 4;
    this.framebuffer[offset] = color[0];
    this.framebuffer[offset + 1] = color[1];
    this.framebuffer[offset + 2] = color[2];
    this.framebuffer[offset + 3] = 255;
  }
  step() {
    const rendering = this.isRenderingEnabled();
    if (this.scanline === 261 && this.cycle === 1) this.status &= ~0xe0;
    if (this.scanline === 241 && this.cycle === 1) {
      this.status |= 0x80;
      this.frameReady = true;
      if (this.ctrl & 0x80) this.triggerNMI();
    }
    if (this.scanline >= 0 && this.scanline < 240 && this.cycle === 0) {
      // `v` has already advanced through the two background prefetch tiles
      // for the next scanline. This renderer samples pixels directly rather
      // than through shift registers, so rewind those tiles here.
      this.lineBaseV = this.rewindHorizontalTiles(this.v, 2);
      this.evaluateSpritesForScanline(this.scanline);
    }
    if (
      this.scanline >= 0 &&
      this.scanline < 240 &&
      this.cycle >= 1 &&
      this.cycle <= 256
    )
      this.renderPixel();
    if (rendering) {
      const isVisibleCycle =
        (this.cycle >= 1 && this.cycle <= 256) ||
        (this.cycle >= 321 && this.cycle <= 336);
      if (
        (this.scanline >= 0 && this.scanline < 240) ||
        this.scanline === 261
      ) {
        if (isVisibleCycle && (this.cycle & 0x07) === 0) this.incrementX();
        if (this.cycle === 256) this.incrementY();
        if (this.cycle === 257) this.copyHorizontalBits();
        if (this.scanline === 261 && this.cycle >= 280 && this.cycle <= 304)
          this.copyVerticalBits();
      }
    }
    if (
      rendering &&
      this.scanline >= 0 &&
      this.scanline < 240 &&
      this.cycle === 260
    )
      this.cartridge.clockScanline();
    this.cycle += 1;
    if (this.cycle > 340) {
      this.cycle = 0;
      this.scanline += 1;
      if (this.scanline > 261) this.scanline = 0;
    }
  }
}
class CPU6502 {
  constructor(bus) {
    this.bus = bus;
    resetFields(this, CPU_DEFAULTS);
  }
  reset() {
    resetFields(this, CPU_DEFAULTS);
    this.stallCycles = 7;
    this.pc = this.read16(0xfffc);
  }
  setFlag(flag, enabled) {
    if (enabled) this.p |= flag;
    else this.p &= ~flag;
  }
  getFlag(flag) {
    return (this.p & flag) !== 0;
  }
  setZN(value) {
    this.setFlag(CPU_FLAG_ZERO, (value & 0xff) === 0);
    this.setFlag(CPU_FLAG_NEGATIVE, (value & 0x80) !== 0);
  }
  read(addr) {
    return this.bus.read(addr);
  }
  write(addr, value) {
    const stall = this.bus.write(addr, value & 0xff);
    if (stall) this.stallCycles += stall + (this.bus.ppu.cycle & 1 ? 1 : 0);
  }
  read16(addr) {
    return this.read(addr) | (this.read((addr + 1) & 0xffff) << 8);
  }
  read16Bug(addr) {
    return (
      this.read(addr) |
      (this.read((addr & 0xff00) | ((addr + 1) & 0x00ff)) << 8)
    );
  }
  push(value) {
    this.write(0x0100 | this.s, value);
    this.s = (this.s - 1) & 0xff;
  }
  pull() {
    this.s = (this.s + 1) & 0xff;
    return this.read(0x0100 | this.s);
  }
  push16(value) {
    this.push((value >> 8) & 0xff);
    this.push(value & 0xff);
  }
  pull16() {
    return this.pull() | (this.pull() << 8);
  }
  serviceInterrupt(vector, breakFlag) {
    this.push16(this.pc);
    this.push(
      (this.p & ~CPU_FLAG_BREAK) |
        CPU_FLAG_UNUSED |
        (breakFlag ? CPU_FLAG_BREAK : 0),
    );
    this.setFlag(CPU_FLAG_INTERRUPT, true);
    this.pc = this.read16(vector);
  }
  pageCrossed(a, b) {
    return (a & 0xff00) !== (b & 0xff00);
  }
  immediate() {
    const addr = this.pc;
    this.pc = (this.pc + 1) & 0xffff;
    return { addr, pageCrossed: false };
  }
  zeroPage() {
    const addr = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    return { addr, pageCrossed: false };
  }
  zeroPageX() {
    const addr = (this.read(this.pc) + this.x) & 0xff;
    this.pc = (this.pc + 1) & 0xffff;
    return { addr, pageCrossed: false };
  }
  zeroPageY() {
    const addr = (this.read(this.pc) + this.y) & 0xff;
    this.pc = (this.pc + 1) & 0xffff;
    return { addr, pageCrossed: false };
  }
  absolute() {
    const addr = this.read16(this.pc);
    this.pc = (this.pc + 2) & 0xffff;
    return { addr, pageCrossed: false };
  }
  absoluteX() {
    const base = this.read16(this.pc);
    const addr = (base + this.x) & 0xffff;
    this.pc = (this.pc + 2) & 0xffff;
    return { addr, pageCrossed: this.pageCrossed(base, addr) };
  }
  absoluteY() {
    const base = this.read16(this.pc);
    const addr = (base + this.y) & 0xffff;
    this.pc = (this.pc + 2) & 0xffff;
    return { addr, pageCrossed: this.pageCrossed(base, addr) };
  }
  indirect() {
    const pointer = this.read16(this.pc);
    this.pc = (this.pc + 2) & 0xffff;
    return { addr: this.read16Bug(pointer), pageCrossed: false };
  }
  indexedIndirect() {
    const pointer = (this.read(this.pc) + this.x) & 0xff;
    this.pc = (this.pc + 1) & 0xffff;
    return {
      addr: this.read(pointer) | (this.read((pointer + 1) & 0xff) << 8),
      pageCrossed: false,
    };
  }
  indirectIndexed() {
    const pointer = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    const base = this.read(pointer) | (this.read((pointer + 1) & 0xff) << 8),
      addr = (base + this.y) & 0xffff;
    return { addr, pageCrossed: this.pageCrossed(base, addr) };
  }
  relative() {
    const offset = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    return { offset: offset < 0x80 ? offset : offset - 0x100 };
  }
  accumulator() {
    return { addr: null, pageCrossed: false };
  }
  implied() {
    return { addr: null, pageCrossed: false };
  }
  branchIf(condition, offset) {
    if (!condition) return 0;
    const previous = this.pc;
    this.pc = (this.pc + offset) & 0xffff;
    return this.pageCrossed(previous, this.pc) ? 2 : 1;
  }
  adc(value) {
    const sum = this.a + value + (this.getFlag(CPU_FLAG_CARRY) ? 1 : 0),
      result = sum & 0xff;
    this.setFlag(CPU_FLAG_CARRY, sum > 0xff);
    this.setFlag(
      CPU_FLAG_OVERFLOW,
      (~(this.a ^ value) & (this.a ^ result) & 0x80) !== 0,
    );
    this.a = result;
    this.setZN(this.a);
  }
  compare(register, value) {
    const result = (register - value) & 0xff;
    this.setFlag(CPU_FLAG_CARRY, register >= value);
    this.setZN(result);
  }
  step() {
    if (this.stallCycles > 0) return ((this.stallCycles -= 1), 1);
    if (this.bus.pollNMI()) return (this.serviceInterrupt(0xfffa, false), 7);
    if (!this.getFlag(CPU_FLAG_INTERRUPT) && this.bus.hasIRQ())
      return (this.serviceInterrupt(0xfffe, false), 7);
    const opcode = this.read(this.pc),
      meta = OPCODES[opcode];
    this.pc = (this.pc + 1) & 0xffff;
    if (!meta)
      throw new Error(
        `Unsupported opcode 0x${opcode.toString(16).padStart(2, "0")} at 0x${((this.pc - 1) & 0xffff).toString(16).padStart(4, "0")}`,
      );
    const operand = this[meta.mode](),
      handler = CPU_INSTRUCTION_HANDLERS[meta.name];
    if (!handler) throw new Error(`Opcode handler missing for ${meta.name}`);
    return (
      meta.cycles +
      handler(this, operand, meta) +
      (meta.pageCycle && operand.pageCrossed ? 1 : 0)
    );
  }
}
function readOperand(cpu, operand) {
  return cpu.read(operand.addr);
}
function writeOperand(cpu, operand, value) {
  cpu.write(operand.addr, value);
}
function mutateAccumulator(cpu, operand, operation) {
  cpu.a = operation(cpu.a, readOperand(cpu, operand)) & 0xff;
  cpu.setZN(cpu.a);
  return 0;
}
function readModifyWrite(cpu, operand, meta, operation) {
  const value = meta.mode === "accumulator" ? cpu.a : readOperand(cpu, operand);
  const result = operation(cpu, value) & 0xff;
  if (meta.mode === "accumulator") cpu.a = result;
  else writeOperand(cpu, operand, result);
  cpu.setZN(result);
  return 0;
}
function branchOnFlag(flag, enabled) {
  return (cpu, operand) =>
    cpu.branchIf(cpu.getFlag(flag) === enabled, operand.offset);
}
function compareRegister(register) {
  return (cpu, operand) => (
    cpu.compare(cpu[register], readOperand(cpu, operand)),
    0
  );
}
function loadRegister(register) {
  return (cpu, operand) => (
    (cpu[register] = readOperand(cpu, operand)),
    cpu.setZN(cpu[register]),
    0
  );
}
function storeRegister(register) {
  return (cpu, operand) => (writeOperand(cpu, operand, cpu[register]), 0);
}
function transferRegister(target, source, setZN = true) {
  return (cpu) => (
    (cpu[target] = cpu[source]),
    setZN && cpu.setZN(cpu[target]),
    0
  );
}
function setFlagHandler(flag, enabled) {
  return (cpu) => (cpu.setFlag(flag, enabled), 0);
}
function adjustRegister(register, delta) {
  return (cpu) => (
    (cpu[register] = (cpu[register] + delta) & 0xff),
    cpu.setZN(cpu[register]),
    0
  );
}
function jumpToOperand(pushReturn = false) {
  return (cpu, operand) => (
    pushReturn && cpu.push16((cpu.pc - 1) & 0xffff),
    (cpu.pc = operand.addr),
    0
  );
}
function accumulatorOp(operation) {
  return (cpu, operand) => mutateAccumulator(cpu, operand, operation);
}
function adjustOperand(delta) {
  return (cpu, operand, meta) =>
    readModifyWrite(cpu, operand, meta, (_, value) => value + delta);
}
function pushRegister(register) {
  return (cpu) => (cpu.push(cpu[register]), 0);
}
function pullRegister(register) {
  return (cpu) => ((cpu[register] = cpu.pull()), cpu.setZN(cpu[register]), 0);
}
const CPU_INSTRUCTION_HANDLERS = {
  ADC: (cpu, operand) => (cpu.adc(readOperand(cpu, operand)), 0),
  AND: accumulatorOp((a, b) => a & b),
  ASL(cpu, operand, meta) {
    return readModifyWrite(cpu, operand, meta, (instance, value) => {
      instance.setFlag(CPU_FLAG_CARRY, (value & 0x80) !== 0);
      return value << 1;
    });
  },
  BIT(cpu, operand) {
    const value = readOperand(cpu, operand);
    cpu.setFlag(CPU_FLAG_ZERO, (cpu.a & value) === 0);
    cpu.setFlag(CPU_FLAG_NEGATIVE, (value & 0x80) !== 0);
    cpu.setFlag(CPU_FLAG_OVERFLOW, (value & 0x40) !== 0);
    return 0;
  },
  BRK(cpu) {
    cpu.pc = (cpu.pc + 1) & 0xffff;
    cpu.serviceInterrupt(0xfffe, true);
    return 0;
  },
  DEC: adjustOperand(-1),
  EOR: accumulatorOp((a, b) => a ^ b),
  INC: adjustOperand(1),
  JMP: jumpToOperand(),
  JSR: jumpToOperand(true),
  LSR(cpu, operand, meta) {
    return readModifyWrite(cpu, operand, meta, (instance, value) => {
      instance.setFlag(CPU_FLAG_CARRY, (value & 0x01) !== 0);
      return value >> 1;
    });
  },
  NOP: () => 0,
  ORA: accumulatorOp((a, b) => a | b),
  PHA: pushRegister("a"),
  PHP: (cpu) => (cpu.push(cpu.p | CPU_FLAG_BREAK | CPU_FLAG_UNUSED), 0),
  PLA: pullRegister("a"),
  PLP(cpu) {
    cpu.p = (cpu.pull() & ~CPU_FLAG_BREAK) | CPU_FLAG_UNUSED;
    return 0;
  },
  ROL(cpu, operand, meta) {
    return readModifyWrite(cpu, operand, meta, (instance, value) => {
      const carryIn = instance.getFlag(CPU_FLAG_CARRY) ? 1 : 0;
      instance.setFlag(CPU_FLAG_CARRY, (value & 0x80) !== 0);
      return (value << 1) | carryIn;
    });
  },
  ROR(cpu, operand, meta) {
    return readModifyWrite(cpu, operand, meta, (instance, value) => {
      const carryIn = instance.getFlag(CPU_FLAG_CARRY) ? 0x80 : 0;
      instance.setFlag(CPU_FLAG_CARRY, (value & 0x01) !== 0);
      return (value >> 1) | carryIn;
    });
  },
  RTI(cpu) {
    cpu.p = (cpu.pull() & ~CPU_FLAG_BREAK) | CPU_FLAG_UNUSED;
    cpu.pc = cpu.pull16();
    return 0;
  },
  RTS: (cpu) => ((cpu.pc = (cpu.pull16() + 1) & 0xffff), 0),
  SBC: (cpu, operand) => (cpu.adc(readOperand(cpu, operand) ^ 0xff), 0),
};
function registerHandlers(factory, entries) {
  Object.assign(
    CPU_INSTRUCTION_HANDLERS,
    Object.fromEntries(
      entries.map(([name, ...args]) => [name, factory(...args)]),
    ),
  );
}
registerHandlers(branchOnFlag, [
  ["BCC", CPU_FLAG_CARRY, false],
  ["BCS", CPU_FLAG_CARRY, true],
  ["BEQ", CPU_FLAG_ZERO, true],
  ["BMI", CPU_FLAG_NEGATIVE, true],
  ["BNE", CPU_FLAG_ZERO, false],
  ["BPL", CPU_FLAG_NEGATIVE, false],
  ["BVC", CPU_FLAG_OVERFLOW, false],
  ["BVS", CPU_FLAG_OVERFLOW, true],
]);
registerHandlers(setFlagHandler, [
  ["CLC", CPU_FLAG_CARRY, false],
  ["CLD", CPU_FLAG_DECIMAL, false],
  ["CLI", CPU_FLAG_INTERRUPT, false],
  ["CLV", CPU_FLAG_OVERFLOW, false],
  ["SEC", CPU_FLAG_CARRY, true],
  ["SED", CPU_FLAG_DECIMAL, true],
  ["SEI", CPU_FLAG_INTERRUPT, true],
]);
registerHandlers(compareRegister, [
  ["CMP", "a"],
  ["CPX", "x"],
  ["CPY", "y"],
]);
registerHandlers(loadRegister, [
  ["LDA", "a"],
  ["LDX", "x"],
  ["LDY", "y"],
]);
registerHandlers(storeRegister, [
  ["STA", "a"],
  ["STX", "x"],
  ["STY", "y"],
]);
registerHandlers(adjustRegister, [
  ["DEX", "x", -1],
  ["DEY", "y", -1],
  ["INX", "x", 1],
  ["INY", "y", 1],
]);
registerHandlers(transferRegister, [
  ["TAX", "x", "a"],
  ["TAY", "y", "a"],
  ["TSX", "x", "s"],
  ["TXA", "a", "x"],
  ["TXS", "s", "x", false],
  ["TYA", "a", "y"],
]);
const OPCODES = new Array(256);
const OPCODE_SPECS = Object.fromEntries([
  [
    "ADC",
    "69 immediate 2|65 zeroPage 3|75 zeroPageX 4|6d absolute 4|7d absoluteX 4 p|79 absoluteY 4 p|61 indexedIndirect 6|71 indirectIndexed 5 p",
  ],
  [
    "AND",
    "29 immediate 2|25 zeroPage 3|35 zeroPageX 4|2d absolute 4|3d absoluteX 4 p|39 absoluteY 4 p|21 indexedIndirect 6|31 indirectIndexed 5 p",
  ],
  [
    "ASL",
    "0a accumulator 2|06 zeroPage 5|16 zeroPageX 6|0e absolute 6|1e absoluteX 7",
  ],
  ["BCC", "90 relative 2"],
  ["BCS", "b0 relative 2"],
  ["BEQ", "f0 relative 2"],
  ["BIT", "24 zeroPage 3|2c absolute 4"],
  ["BMI", "30 relative 2"],
  ["BNE", "d0 relative 2"],
  ["BPL", "10 relative 2"],
  ["BRK", "00 implied 7"],
  ["BVC", "50 relative 2"],
  ["BVS", "70 relative 2"],
  ["CLC", "18 implied 2"],
  ["CLD", "d8 implied 2"],
  ["CLI", "58 implied 2"],
  ["CLV", "b8 implied 2"],
  [
    "CMP",
    "c9 immediate 2|c5 zeroPage 3|d5 zeroPageX 4|cd absolute 4|dd absoluteX 4 p|d9 absoluteY 4 p|c1 indexedIndirect 6|d1 indirectIndexed 5 p",
  ],
  ["CPX", "e0 immediate 2|e4 zeroPage 3|ec absolute 4"],
  ["CPY", "c0 immediate 2|c4 zeroPage 3|cc absolute 4"],
  ["DEC", "c6 zeroPage 5|d6 zeroPageX 6|ce absolute 6|de absoluteX 7"],
  ["DEX", "ca implied 2"],
  ["DEY", "88 implied 2"],
  [
    "EOR",
    "49 immediate 2|45 zeroPage 3|55 zeroPageX 4|4d absolute 4|5d absoluteX 4 p|59 absoluteY 4 p|41 indexedIndirect 6|51 indirectIndexed 5 p",
  ],
  ["INC", "e6 zeroPage 5|f6 zeroPageX 6|ee absolute 6|fe absoluteX 7"],
  ["INX", "e8 implied 2"],
  ["INY", "c8 implied 2"],
  ["JMP", "4c absolute 3|6c indirect 5"],
  ["JSR", "20 absolute 6"],
  [
    "LDA",
    "a9 immediate 2|a5 zeroPage 3|b5 zeroPageX 4|ad absolute 4|bd absoluteX 4 p|b9 absoluteY 4 p|a1 indexedIndirect 6|b1 indirectIndexed 5 p",
  ],
  [
    "LDX",
    "a2 immediate 2|a6 zeroPage 3|b6 zeroPageY 4|ae absolute 4|be absoluteY 4 p",
  ],
  [
    "LDY",
    "a0 immediate 2|a4 zeroPage 3|b4 zeroPageX 4|ac absolute 4|bc absoluteX 4 p",
  ],
  [
    "LSR",
    "4a accumulator 2|46 zeroPage 5|56 zeroPageX 6|4e absolute 6|5e absoluteX 7",
  ],
  [
    "NOP",
    "ea implied 2|1a implied 2|3a implied 2|5a implied 2|7a implied 2|da implied 2|fa implied 2|04 zeroPage 3|44 zeroPage 3|64 zeroPage 3|14 zeroPageX 4|34 zeroPageX 4|54 zeroPageX 4|74 zeroPageX 4|d4 zeroPageX 4|f4 zeroPageX 4|0c absolute 4|1c absoluteX 4 p|3c absoluteX 4 p|5c absoluteX 4 p|7c absoluteX 4 p|dc absoluteX 4 p|fc absoluteX 4 p",
  ],
  [
    "ORA",
    "09 immediate 2|05 zeroPage 3|15 zeroPageX 4|0d absolute 4|1d absoluteX 4 p|19 absoluteY 4 p|01 indexedIndirect 6|11 indirectIndexed 5 p",
  ],
  ["PHA", "48 implied 3"],
  ["PHP", "08 implied 3"],
  ["PLA", "68 implied 4"],
  ["PLP", "28 implied 4"],
  [
    "ROL",
    "2a accumulator 2|26 zeroPage 5|36 zeroPageX 6|2e absolute 6|3e absoluteX 7",
  ],
  [
    "ROR",
    "6a accumulator 2|66 zeroPage 5|76 zeroPageX 6|6e absolute 6|7e absoluteX 7",
  ],
  ["RTI", "40 implied 6"],
  ["RTS", "60 implied 6"],
  [
    "SBC",
    "e9 immediate 2|e5 zeroPage 3|f5 zeroPageX 4|ed absolute 4|fd absoluteX 4 p|f9 absoluteY 4 p|e1 indexedIndirect 6|f1 indirectIndexed 5 p",
  ],
  ["SEC", "38 implied 2"],
  ["SED", "f8 implied 2"],
  ["SEI", "78 implied 2"],
  [
    "STA",
    "85 zeroPage 3|95 zeroPageX 4|8d absolute 4|9d absoluteX 5|99 absoluteY 5|81 indexedIndirect 6|91 indirectIndexed 6",
  ],
  ["STX", "86 zeroPage 3|96 zeroPageY 4|8e absolute 4"],
  ["STY", "84 zeroPage 3|94 zeroPageX 4|8c absolute 4"],
  ["TAX", "aa implied 2"],
  ["TAY", "a8 implied 2"],
  ["TSX", "ba implied 2"],
  ["TXA", "8a implied 2"],
  ["TXS", "9a implied 2"],
  ["TYA", "98 implied 2"],
]);
for (const [name, spec] of Object.entries(OPCODE_SPECS)) {
  for (const entry of spec.split("|")) {
    const [opcode, mode, cycles, pageCycle] = entry.split(" ");
    OPCODES[Number.parseInt(opcode, 16)] = {
      name,
      mode,
      cycles: Number(cycles),
      pageCycle: pageCycle === "p",
    };
  }
}
class HighPassFilter {
  constructor(sampleRate, cutoffHz) {
    const dt = 1 / sampleRate,
      rc = 1 / (2 * Math.PI * cutoffHz);
    this.alpha = rc / (rc + dt);
    this.prevInput = 0;
    this.prevOutput = 0;
  }
  step(input) {
    const previousInput = this.prevInput;
    this.prevInput = input;
    return (this.prevOutput =
      this.alpha * (this.prevOutput + input - previousInput));
  }
}
class LowPassFilter {
  constructor(sampleRate, cutoffHz) {
    const dt = 1 / sampleRate,
      rc = 1 / (2 * Math.PI * cutoffHz);
    this.alpha = dt / (rc + dt);
    this.output = 0;
  }
  step(input) {
    return (this.output += this.alpha * (input - this.output));
  }
}
class AudioDriver {
  constructor(onStatusChange = () => {}) {
    this.onStatusChange = onStatusChange;
    this.context =
      this.initializing =
      this.processor =
      this.workletNode =
      this.gain =
        null;
    this.buffer = new Float32Array(16384);
    this.readIndex = this.writeIndex = this.availableSamples = 0;
  }
  getSampleRate() {
    return this.context?.sampleRate || 0;
  }
  clear() {
    this.readIndex = this.writeIndex = this.availableSamples = 0;
    this.workletNode?.port.postMessage({ type: "reset" });
  }
  pushSample(sample) {
    if (!this.context) return;
    if (this.availableSamples >= this.buffer.length) {
      this.readIndex = (this.readIndex + 1) % this.buffer.length;
      this.availableSamples -= 1;
    }
    this.buffer[this.writeIndex] = Math.max(-1, Math.min(1, sample));
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    this.availableSamples += 1;
    if (this.workletNode && this.availableSamples >= AUDIO_WORKLET_CHUNK_SIZE)
      this.flushPendingSamples();
  }
  consume(buffer) {
    for (let i = 0; i < buffer.length; i += 1) {
      if (this.availableSamples > 0) {
        buffer[i] = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.buffer.length;
        this.availableSamples -= 1;
      } else {
        buffer[i] = 0;
      }
    }
  }
  drainSamples(target) {
    for (let i = 0; i < target.length; i += 1) {
      target[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.buffer.length;
    }
    this.availableSamples -= target.length;
  }
  flushPendingSamples(force = false) {
    if (!this.workletNode) return;
    const minimumSamples = force ? 1 : AUDIO_WORKLET_CHUNK_SIZE;
    while (this.availableSamples >= minimumSamples) {
      const length = force
        ? Math.min(this.availableSamples, AUDIO_WORKLET_CHUNK_SIZE)
        : AUDIO_WORKLET_CHUNK_SIZE;
      const samples = new Float32Array(length);
      this.drainSamples(samples);
      this.workletNode.port.postMessage({ type: "samples", samples }, [
        samples.buffer,
      ]);
    }
  }
  createLegacyProcessor() {
    this.processor = this.context.createScriptProcessor(2048, 0, 1);
    this.processor.onaudioprocess = (event) => {
      this.consume(event.outputBuffer.getChannelData(0));
    };
    this.processor.connect(this.gain);
  }
  async createContext() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor)
      return (
        this.onStatusChange(
          "Web Audio is unavailable in this browser.",
          "error",
          "Audio Unsupported",
        ),
        false
      );
    this.context = new AudioContextCtor();
    this.gain = this.context.createGain();
    this.gain.gain.value = 0.18;
    this.gain.connect(this.context.destination);
    if (
      typeof AudioWorkletNode === "function" &&
      this.context.audioWorklet &&
      typeof this.context.audioWorklet.addModule === "function"
    ) {
      try {
        await this.context.audioWorklet.addModule("/audio-output-worklet.js");
        this.workletNode = new AudioWorkletNode(
          this.context,
          AUDIO_WORKLET_PROCESSOR_NAME,
          { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] },
        );
        this.workletNode.connect(this.gain);
        return true;
      } catch (error) {
        console.warn(
          "AudioWorklet initialization failed, falling back to ScriptProcessorNode.",
          error,
        );
      }
    }
    this.createLegacyProcessor();
    return true;
  }
  async enable() {
    try {
      if (!this.context)
        this.initializing ??= this.createContext().finally(() => {
          this.initializing = null;
        });
      if (this.initializing && !(await this.initializing)) return false;
      await this.context.resume();
      this.flushPendingSamples(true);
      this.onStatusChange(
        "Audio live. Boot a ROM or keep playing to hear it.",
        "ready",
        "Audio On",
      );
      return true;
    } catch (error) {
      this.onStatusChange(
        error instanceof Error ? error.message : String(error),
        "error",
        "Retry Audio",
      );
      return false;
    }
  }
  destroy() {
    this.clear();
    this.workletNode?.port.postMessage({ type: "reset" });
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.processor?.disconnect();
    this.processor = null;
    this.gain?.disconnect();
    this.gain = null;
    const context = this.context;
    this.context = null;
    this.initializing = null;
    if (context && context.state !== "closed")
      void context.close().catch(() => {});
  }
}
const PULSE_CHANNEL_DEFAULTS = {
  enabled: false,
  duty: 0,
  sequenceIndex: 0,
  lengthCounter: 0,
  lengthHalt: false,
  timerPeriod: 0,
  timerValue: 0,
  sweepEnabled: false,
  sweepPeriod: 0,
  sweepNegate: false,
  sweepShift: 0,
  sweepDivider: 0,
  sweepReload: false,
};
const TRIANGLE_CHANNEL_DEFAULTS = {
  enabled: false,
  controlFlag: false,
  linearReloadValue: 0,
  linearCounter: 0,
  linearReloadFlag: false,
  lengthCounter: 0,
  timerPeriod: 0,
  timerValue: 0,
  sequenceIndex: 0,
};
const NOISE_CHANNEL_DEFAULTS = {
  enabled: false,
  lengthCounter: 0,
  lengthHalt: false,
  mode: false,
  timerPeriod: NOISE_PERIOD_TABLE[0],
  timerValue: 0,
  shiftRegister: 1,
};
const APU_REGISTER_WRITES = {
  0x4000: ["pulse1", "writeControl"],
  0x4001: ["pulse1", "writeSweep"],
  0x4002: ["pulse1", "writeTimerLow"],
  0x4003: ["pulse1", "writeTimerHigh"],
  0x4004: ["pulse2", "writeControl"],
  0x4005: ["pulse2", "writeSweep"],
  0x4006: ["pulse2", "writeTimerLow"],
  0x4007: ["pulse2", "writeTimerHigh"],
  0x4008: ["triangle", "writeControl"],
  0x400a: ["triangle", "writeTimerLow"],
  0x400b: ["triangle", "writeTimerHigh"],
  0x400c: ["noise", "writeControl"],
  0x400e: ["noise", "writePeriod"],
  0x400f: ["noise", "writeLength"],
};
class EnvelopeGenerator {
  constructor() {
    this.reset();
  }
  reset() {
    this.loop = false;
    this.constantVolume = false;
    this.period = 0;
    this.start = false;
    this.divider = 0;
    this.decayLevel = 0;
  }
  writeControl(value) {
    this.loop = (value & 0x20) !== 0;
    this.constantVolume = (value & 0x10) !== 0;
    this.period = value & 0x0f;
  }
  restart() {
    this.start = true;
  }
  clock() {
    if (this.start) {
      this.start = false;
      this.decayLevel = 15;
      this.divider = this.period;
      return;
    }
    if (this.divider === 0) {
      this.divider = this.period;
      if (this.decayLevel > 0) {
        this.decayLevel -= 1;
      } else if (this.loop) {
        this.decayLevel = 15;
      }
      return;
    }
    this.divider -= 1;
  }
  getVolume() {
    return this.constantVolume ? this.period : this.decayLevel;
  }
}
function clockTimer(channel, onTick) {
  if (channel.timerValue === 0) {
    channel.timerValue = channel.timerPeriod;
    onTick();
  } else channel.timerValue -= 1;
}
class LengthChannel {
  constructor(defaults) {
    this.defaults = defaults;
  }
  reset() {
    resetFields(this, this.defaults);
  }
  setEnabled(enabled) {
    setLengthEnabled(this, enabled);
  }
  writeTimerLow(value) {
    writeTimerLow(this, value);
  }
}
class EnvelopeChannel extends LengthChannel {
  constructor(defaults) {
    super(defaults);
    this.envelope = new EnvelopeGenerator();
  }
  reset() {
    super.reset();
    this.envelope.reset();
  }
  clockQuarterFrame() {
    this.envelope.clock();
  }
}
class PulseChannel extends EnvelopeChannel {
  constructor(onesComplementSweep) {
    super(PULSE_CHANNEL_DEFAULTS);
    this.onesComplementSweep = onesComplementSweep;
  }
  writeControl(value) {
    this.duty = (value >> 6) & 0x03;
    this.lengthHalt = (value & 0x20) !== 0;
    this.envelope.writeControl(value);
  }
  writeSweep(value) {
    this.sweepEnabled = (value & 0x80) !== 0;
    this.sweepPeriod = (value >> 4) & 0x07;
    this.sweepNegate = (value & 0x08) !== 0;
    this.sweepShift = value & 0x07;
    this.sweepReload = true;
  }
  writeTimerHigh(value) {
    this.timerPeriod = (this.timerPeriod & 0x00ff) | ((value & 0x07) << 8);
    loadLengthCounter(this, value);
    this.sequenceIndex = 0;
    this.envelope.restart();
  }
  getSweepTarget() {
    const delta = this.timerPeriod >> this.sweepShift;
    return this.sweepNegate
      ? this.timerPeriod - delta - (this.onesComplementSweep ? 1 : 0)
      : this.timerPeriod + delta;
  }
  clockTimer() {
    clockTimer(this, () => {
      this.sequenceIndex = (this.sequenceIndex + 1) & 0x07;
    });
  }
  clockHalfFrame() {
    clockLengthCounter(this, this.lengthHalt);
    const dividerZero = this.sweepDivider === 0;
    if (
      dividerZero &&
      this.sweepEnabled &&
      this.sweepShift > 0 &&
      this.timerPeriod >= 8
    ) {
      const target = this.getSweepTarget();
      if (target >= 0 && target <= 0x07ff) {
        this.timerPeriod = target;
      }
    }
    if (dividerZero || this.sweepReload) {
      this.sweepDivider = this.sweepPeriod;
      this.sweepReload = false;
    } else {
      this.sweepDivider -= 1;
    }
  }
  output() {
    if (!this.enabled || this.lengthCounter === 0) return 0;
    if (this.timerPeriod < 8 || this.getSweepTarget() > 0x07ff) return 0;
    if (PULSE_DUTY_TABLE[this.duty][this.sequenceIndex] === 0) return 0;
    return this.envelope.getVolume();
  }
}
class TriangleChannel extends LengthChannel {
  constructor() {
    super(TRIANGLE_CHANNEL_DEFAULTS);
  }
  writeControl(value) {
    this.controlFlag = (value & 0x80) !== 0;
    this.linearReloadValue = value & 0x7f;
  }
  writeTimerHigh(value) {
    this.timerPeriod = (this.timerPeriod & 0x00ff) | ((value & 0x07) << 8);
    loadLengthCounter(this, value);
    this.linearReloadFlag = true;
  }
  clockTimer() {
    clockTimer(this, () => {
      if (this.lengthCounter > 0 && this.linearCounter > 0)
        this.sequenceIndex = (this.sequenceIndex + 1) & 0x1f;
    });
  }
  clockQuarterFrame() {
    if (this.linearReloadFlag) this.linearCounter = this.linearReloadValue;
    else if (this.linearCounter > 0) this.linearCounter -= 1;
    if (!this.controlFlag) this.linearReloadFlag = false;
  }
  clockHalfFrame() {
    clockLengthCounter(this, this.controlFlag);
  }
  output() {
    if (!this.enabled) return 0;
    return this.timerPeriod < 2 ? 7.5 : TRIANGLE_SEQUENCE[this.sequenceIndex];
  }
}
class NoiseChannel extends EnvelopeChannel {
  constructor() {
    super(NOISE_CHANNEL_DEFAULTS);
  }
  writeControl(value) {
    this.lengthHalt = (value & 0x20) !== 0;
    this.envelope.writeControl(value);
  }
  writePeriod(value) {
    this.mode = (value & 0x80) !== 0;
    this.timerPeriod = NOISE_PERIOD_TABLE[value & 0x0f];
  }
  writeLength(value) {
    loadLengthCounter(this, value);
    this.envelope.restart();
  }
  clockTimer() {
    clockTimer(this, () => {
      const tapBit = this.mode ? 6 : 1,
        feedback =
          (this.shiftRegister & 0x01) ^ ((this.shiftRegister >> tapBit) & 0x01);
      this.shiftRegister = (this.shiftRegister >> 1) | (feedback << 14);
    });
  }
  clockHalfFrame() {
    clockLengthCounter(this, this.lengthHalt);
  }
  output() {
    return !this.enabled ||
      this.lengthCounter === 0 ||
      (this.shiftRegister & 0x01) !== 0
      ? 0
      : this.envelope.getVolume();
  }
}
class APU {
  constructor(audioDriver) {
    this.audioDriver = audioDriver;
    this.pulse1 = new PulseChannel(true);
    this.pulse2 = new PulseChannel(false);
    this.triangle = new TriangleChannel();
    this.noise = new NoiseChannel();
    this.frameChannels = [this.pulse1, this.pulse2, this.triangle, this.noise];
    this.reset();
  }
  reset() {
    for (const channel of this.frameChannels) channel.reset();
    resetFields(this, APU_DEFAULTS);
  }
  hasIRQ() {
    return this.frameInterruptFlag;
  }
  configureFilters(sampleRate) {
    if (sampleRate <= 0 || sampleRate === this.sampleRate) return;
    this.sampleRate = sampleRate;
    this.sampleClock = 0;
    this.highPass90 = new HighPassFilter(sampleRate, 90);
    this.highPass440 = new HighPassFilter(sampleRate, 440);
    this.lowPass14k = new LowPassFilter(sampleRate, 14000);
  }
  readStatus() {
    const status =
      (this.frameInterruptFlag ? 0x40 : 0) |
      (this.noise.lengthCounter > 0 ? 0x08 : 0) |
      (this.triangle.lengthCounter > 0 ? 0x04 : 0) |
      (this.pulse2.lengthCounter > 0 ? 0x02 : 0) |
      (this.pulse1.lengthCounter > 0 ? 0x01 : 0);
    this.frameInterruptFlag = false;
    return status;
  }
  writeStatus(value) {
    for (const [index, channel] of this.frameChannels.entries())
      channel.setEnabled((value & (1 << index)) !== 0);
    this.dmcEnabled = (value & 0x10) !== 0;
  }
  writeFrameCounter(value) {
    if (value & 0x40) this.frameInterruptFlag = false;
    this.pendingFrameCounterWrite = {
      value,
      delay: (this.cpuCycles & 0x01) === 0 ? 4 : 3,
    };
  }
  applyFrameCounterWrite(value) {
    this.frameMode = (value >> 7) & 0x01;
    this.frameInterruptInhibit = (value & 0x40) !== 0;
    if (this.frameInterruptInhibit) this.frameInterruptFlag = false;
    this.cpuCycles = 0;
    if (this.frameMode === 1) (this.clockQuarterFrame(), this.clockHalfFrame());
  }
  writeRegister(address, value) {
    const registerWrite = APU_REGISTER_WRITES[address];
    if (registerWrite) return this[registerWrite[0]][registerWrite[1]](value);
    if (address === 0x4011) this.dmcOutput = value & 0x7f;
    else if (address === 0x4015) this.writeStatus(value);
    else if (address === 0x4017) this.writeFrameCounter(value);
  }
  clockQuarterFrame() {
    for (const channel of this.frameChannels) channel.clockQuarterFrame();
  }
  clockHalfFrame() {
    for (const channel of this.frameChannels) channel.clockHalfFrame();
  }
  clockFrameCounter() {
    if (this.frameMode === 0) {
      if (this.cpuCycles === 3729 || this.cpuCycles === 11186)
        this.clockQuarterFrame();
      else if (this.cpuCycles === 7457)
        (this.clockQuarterFrame(), this.clockHalfFrame());
      else if (this.cpuCycles === 14915)
        (this.clockQuarterFrame(),
          this.clockHalfFrame(),
          (this.frameInterruptFlag ||= !this.frameInterruptInhibit),
          (this.cpuCycles = 0));
      return;
    }
    if (this.cpuCycles === 3729 || this.cpuCycles === 11186)
      this.clockQuarterFrame();
    else if (this.cpuCycles === 7457 || this.cpuCycles === 18641)
      (this.clockQuarterFrame(),
        this.clockHalfFrame(),
        this.cpuCycles === 18641 && (this.cpuCycles = 0));
  }
  mixSample() {
    const pulseSum = this.pulse1.output() + this.pulse2.output();
    const pulseOut = pulseSum === 0 ? 0 : 95.88 / (8128 / pulseSum + 100);
    const tndDenominator =
      this.triangle.output() / 8227 +
      this.noise.output() / 12241 +
      this.dmcOutput / 22638;
    const tndOut =
      tndDenominator === 0 ? 0 : 159.79 / (1 / tndDenominator + 100);
    let sample = pulseOut + tndOut;
    if (this.highPass90 && this.highPass440 && this.lowPass14k)
      sample = this.lowPass14k.step(
        this.highPass440.step(this.highPass90.step(sample)),
      );
    return sample * 1.8;
  }
  stepCpuCycle() {
    if (this.pendingFrameCounterWrite) {
      this.pendingFrameCounterWrite.delay -= 1;
      if (this.pendingFrameCounterWrite.delay <= 0) {
        const { value } = this.pendingFrameCounterWrite;
        this.pendingFrameCounterWrite = null;
        this.applyFrameCounterWrite(value);
      }
    }
    this.cpuCycles += 1;
    this.triangle.clockTimer();
    if ((this.cpuCycles & 0x01) === 0)
      (this.pulse1.clockTimer(),
        this.pulse2.clockTimer(),
        this.noise.clockTimer());
    this.clockFrameCounter();
    const sampleRate = this.audioDriver.getSampleRate();
    if (sampleRate > 0) {
      this.configureFilters(sampleRate);
      this.sampleClock += sampleRate;
      if (this.sampleClock >= NTSC_CPU_CLOCK)
        ((this.sampleClock -= NTSC_CPU_CLOCK),
          this.audioDriver.pushSample(this.mixSample()));
    }
  }
}
class Bus {
  constructor(cartridge, audioDriver) {
    this.cartridge = cartridge;
    this.cpuRam = new Uint8Array(0x0800);
    this.ppu = new PPU(cartridge);
    this.apu = new APU(audioDriver);
    this.controller1 = new Controller();
    this.controller2 = new Controller();
  }
  reset() {
    this.cpuRam.fill(0);
    this.cartridge.reset();
    this.ppu.reset();
    this.apu.reset();
  }
  pollNMI() {
    return this.ppu.pollNMI();
  }
  hasIRQ() {
    return this.cartridge.hasIRQ() || this.apu.hasIRQ();
  }
  read(addr) {
    const address = addr & 0xffff;
    if (address < 0x2000) return this.cpuRam[address & 0x07ff];
    if (address < 0x4000)
      return this.ppu.readRegister(0x2000 | (address & 0x0007));
    if (address === 0x4016) return this.controller1.read();
    if (address === 0x4015) return this.apu.readStatus();
    if (address === 0x4017) return this.controller2.read();
    if (address >= 0x6000 && address < 0x8000)
      return this.cartridge.readPrgRam(address);
    if (address >= 0x8000) return this.cartridge.readPrg(address);
    return 0;
  }
  write(addr, value) {
    const address = addr & 0xffff;
    if (address < 0x2000) return ((this.cpuRam[address & 0x07ff] = value), 0);
    if (address < 0x4000)
      return (this.ppu.writeRegister(0x2000 | (address & 0x0007), value), 0);
    if (address === 0x4014) {
      const page = value << 8;
      const buffer = new Uint8Array(256);
      for (let i = 0; i < 256; i += 1) buffer[i] = this.read(page + i);
      this.ppu.writeOamDma(buffer);
      return 513;
    }
    if (address === 0x4016)
      return (this.controller1.write(value), this.controller2.write(value), 0);
    if (
      (address >= 0x4000 && address <= 0x4013) ||
      address === 0x4015 ||
      address === 0x4017
    )
      return (this.apu.writeRegister(address, value), 0);
    if (address >= 0x6000 && address < 0x8000)
      return (this.cartridge.writePrgRam(address, value), 0);
    if (address >= 0x8000) return (this.cartridge.writePrg(address, value), 0);
    return 0;
  }
}
function advanceNesCycles(nes, cpuCycles) {
  for (let i = 0; i < cpuCycles; i += 1) nes.bus.apu.stepCpuCycle();
  for (let i = 0; i < cpuCycles * 3; i += 1) nes.bus.ppu.step();
}
function stepNesInstruction(nes) {
  advanceNesCycles(nes, nes.cpu.step());
}
function getInstructionOperandLength(mode) {
  switch (mode) {
    case "absolute":
    case "absoluteX":
    case "absoluteY":
    case "indirect":
      return 2;
    case "accumulator":
    case "implied":
      return 0;
    case "immediate":
    case "indexedIndirect":
    case "indirectIndexed":
    case "relative":
    case "zeroPage":
    case "zeroPageX":
    case "zeroPageY":
    default:
      return 1;
  }
}
function formatDecodeHex(value, width) {
  return value === null || value === undefined
    ? "?".repeat(width)
    : value.toString(16).toUpperCase().padStart(width, "0");
}
class NES {
  constructor(cartridge, canvas, audioDriver) {
    this.bus = new Bus(cartridge, audioDriver);
    this.cpu = new CPU6502(this.bus);
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.imageData = this.context.createImageData(256, 240);
    this.context.imageSmoothingEnabled = false;
    this.bus.reset();
    this.cpu.reset();
  }
  setButton(button, pressed) {
    this.bus.controller1.setButton(button, pressed);
  }
  releaseAllButtons() {
    for (const button of CONTROLLER_BUTTON_ORDER)
      this.bus.controller1.setButton(button, false);
  }
  runFrame() {
    this.bus.ppu.frameReady = false;
    while (!this.bus.ppu.frameReady) stepNesInstruction(this);
  }
  present() {
    this.imageData.data.set(this.bus.ppu.framebuffer);
    this.context.putImageData(this.imageData, 0, 0);
  }
}
const BUTTON_MAP = new Map([
  ["KeyZ", "b"],
  ["KeyX", "a"],
  ["ShiftLeft", "select"],
  ["ShiftRight", "select"],
  ["Enter", "start"],
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
]);
export function getButtonForKeyboardCode(code) {
  return BUTTON_MAP.get(code) ?? null;
}
export function createNesEmulator({
  canvas,
  onAudioStatus = () => {},
  onRuntimeError = () => {},
}) {
  if (!canvas)
    throw new Error("A canvas element is required to initialize the emulator.");
  const context = canvas.getContext("2d");
  const audioDriver = new AudioDriver(onAudioStatus);
  let activeNES = null;
  let frameHandle = 0;
  let isPaused = false;
  let loopGeneration = 0;
  const normalizeAddress = (address) => address & 0xffff;
  const withActiveNES = (callback, fallback = false) =>
    activeNES ? callback(activeNES) : fallback;
  const isDebugWritableAddress = (address) => {
    const normalizedAddress = normalizeAddress(address);
    return (
      normalizedAddress < 0x2000 ||
      (normalizedAddress >= 0x6000 && normalizedAddress < 0x8000)
    );
  };
  function getDebugByte(nes, address) {
    const normalizedAddress = normalizeAddress(address);
    if (normalizedAddress < 0x2000)
      return nes.bus.cpuRam[normalizedAddress & 0x07ff];
    if (normalizedAddress < 0x8000)
      return normalizedAddress >= 0x6000
        ? nes.bus.cartridge.readPrgRam(normalizedAddress)
        : null;
    return nes.bus.cartridge.readPrg(normalizedAddress);
  }
  function getDebugWordBug(nes, address) {
    const normalizedAddress = normalizeAddress(address);
    const low = getDebugByte(nes, normalizedAddress);
    const high = getDebugByte(
      nes,
      (normalizedAddress & 0xff00) | ((normalizedAddress + 1) & 0x00ff),
    );
    return low === null || high === null ? null : low | (high << 8);
  }
  function getZeroPagePointer(nes, address) {
    const pointer = address & 0xff;
    const low = getDebugByte(nes, pointer);
    const high = getDebugByte(nes, (pointer + 1) & 0xff);
    return low === null || high === null ? null : low | (high << 8);
  }
  function decodeInstruction(nes, address, isCurrent = false) {
    const cpu = nes.cpu;
    const instructionAddress = normalizeAddress(address);
    const opcode = getDebugByte(nes, instructionAddress);
    const meta = opcode === null || opcode === undefined ? null : OPCODES[opcode];

    if (!meta) {
      return {
        address: instructionAddress,
        baseCycles: 0,
        branchTarget: null,
        bytes: [opcode],
        effectiveAddress: null,
        isCurrent,
        length: 1,
        mnemonic: opcode === null || opcode === undefined ? "???" : ".db",
        mode: "unknown",
        opcode,
        operandText:
          opcode === null || opcode === undefined
            ? ""
            : `$${formatDecodeHex(opcode, 2)}`,
        pageCrossCyclePossible: false,
        resolvedValue: null,
      };
    }

    const operandLength = getInstructionOperandLength(meta.mode);
    const length = operandLength + 1;
    const bytes = new Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = getDebugByte(nes, instructionAddress + index);
    }

    const operandLow = bytes[1] ?? null;
    const operandHigh = bytes[2] ?? null;
    const operandWord =
      operandLow === null || operandHigh === null
        ? null
        : operandLow | (operandHigh << 8);
    const readValueAt = (targetAddress) =>
      targetAddress === null ? null : getDebugByte(nes, targetAddress);
    let operandText = "";
    let effectiveAddress = null;
    let resolvedValue = null;
    let branchTarget = null;

    switch (meta.mode) {
      case "immediate":
        operandText = `#$${formatDecodeHex(operandLow, 2)}`;
        resolvedValue = operandLow;
        break;
      case "zeroPage":
        operandText = `$${formatDecodeHex(operandLow, 2)}`;
        effectiveAddress = operandLow;
        resolvedValue = readValueAt(effectiveAddress);
        break;
      case "zeroPageX":
        operandText = `$${formatDecodeHex(operandLow, 2)},X`;
        effectiveAddress = operandLow === null ? null : (operandLow + cpu.x) & 0xff;
        resolvedValue = readValueAt(effectiveAddress);
        break;
      case "zeroPageY":
        operandText = `$${formatDecodeHex(operandLow, 2)},Y`;
        effectiveAddress = operandLow === null ? null : (operandLow + cpu.y) & 0xff;
        resolvedValue = readValueAt(effectiveAddress);
        break;
      case "absolute":
        operandText = `$${formatDecodeHex(operandWord, 4)}`;
        if (meta.name === "JMP" || meta.name === "JSR") {
          branchTarget = operandWord;
        } else {
          effectiveAddress = operandWord;
          resolvedValue = readValueAt(effectiveAddress);
        }
        break;
      case "absoluteX":
        operandText = `$${formatDecodeHex(operandWord, 4)},X`;
        effectiveAddress =
          operandWord === null ? null : normalizeAddress(operandWord + cpu.x);
        resolvedValue = readValueAt(effectiveAddress);
        break;
      case "absoluteY":
        operandText = `$${formatDecodeHex(operandWord, 4)},Y`;
        effectiveAddress =
          operandWord === null ? null : normalizeAddress(operandWord + cpu.y);
        resolvedValue = readValueAt(effectiveAddress);
        break;
      case "indirect":
        operandText = `($${formatDecodeHex(operandWord, 4)})`;
        branchTarget = operandWord === null ? null : getDebugWordBug(nes, operandWord);
        break;
      case "indexedIndirect": {
        operandText = `($${formatDecodeHex(operandLow, 2)},X)`;
        const pointer = operandLow === null ? null : (operandLow + cpu.x) & 0xff;
        effectiveAddress = pointer === null ? null : getZeroPagePointer(nes, pointer);
        resolvedValue = readValueAt(effectiveAddress);
        break;
      }
      case "indirectIndexed": {
        operandText = `($${formatDecodeHex(operandLow, 2)}),Y`;
        const baseAddress =
          operandLow === null ? null : getZeroPagePointer(nes, operandLow);
        effectiveAddress =
          baseAddress === null ? null : normalizeAddress(baseAddress + cpu.y);
        resolvedValue = readValueAt(effectiveAddress);
        break;
      }
      case "relative": {
        const offset =
          operandLow === null ? null : operandLow < 0x80 ? operandLow : operandLow - 0x100;
        branchTarget =
          offset === null ? null : normalizeAddress(instructionAddress + length + offset);
        operandText = `$${formatDecodeHex(branchTarget, 4)}`;
        break;
      }
      case "accumulator":
        operandText = "A";
        resolvedValue = cpu.a;
        break;
      case "implied":
      default:
        break;
    }

    return {
      address: instructionAddress,
      baseCycles: meta.cycles,
      branchTarget,
      bytes,
      effectiveAddress,
      isCurrent,
      length,
      mnemonic: meta.name,
      mode: meta.mode,
      opcode,
      operandText,
      pageCrossCyclePossible: meta.pageCycle,
      resolvedValue,
    };
  }
  function getDisassembly(nes) {
    const currentAddress = normalizeAddress(nes.cpu.pc);
    const scanStart = Math.max(0x0000, currentAddress - DISASSEMBLY_SCAN_BACK_BYTES);
    const previousEntries = [];
    let cursor = scanStart;
    while (cursor < currentAddress) {
      const entry = decodeInstruction(nes, cursor);
      previousEntries.push(entry);
      cursor += Math.max(1, entry.length);
    }

    const currentEntry = decodeInstruction(nes, currentAddress, true);
    const nextEntries = [];
    cursor = currentAddress + Math.max(1, currentEntry.length);

    while (cursor <= 0xffff && nextEntries.length < DISASSEMBLY_AFTER_COUNT) {
      const entry = decodeInstruction(nes, cursor);
      nextEntries.push(entry);
      cursor += Math.max(1, entry.length);
    }

    return {
      currentAddress,
      entries: [
        ...previousEntries.slice(-DISASSEMBLY_BEFORE_COUNT),
        currentEntry,
        ...nextEntries,
      ],
    };
  }
  function setDebugByte(address, value) {
    return withActiveNES((nes) => {
      const normalizedAddress = normalizeAddress(address);
      if (!isDebugWritableAddress(normalizedAddress)) return false;
      const normalizedValue = value & 0xff;
      if (normalizedAddress < 0x2000)
        nes.bus.cpuRam[normalizedAddress & 0x07ff] = normalizedValue;
      else nes.bus.cartridge.writePrgRam(normalizedAddress, normalizedValue);
      return true;
    }, false);
  }
  function getDebugSnapshot({ length = 0x80, startAddress = 0x0000 } = {}) {
    return withActiveNES((nes) => {
      const safeLength = Math.min(0x100, Math.max(0x10, length | 0));
      const baseAddress = normalizeAddress(startAddress);
      const memory = new Array(safeLength);
      for (let index = 0; index < safeLength; index += 1)
        memory[index] = getDebugByte(nes, baseAddress + index);
      const instruction = decodeInstruction(nes, nes.cpu.pc, true);
      return {
        disassembly: getDisassembly(nes),
        instruction,
        memory: {
          bytes: memory,
          length: safeLength,
          startAddress: baseAddress,
        },
        paused: isPaused,
        cpu: {
          a: nes.cpu.a,
          flags: DEBUG_CPU_FLAGS.map(([label, flag]) => ({
            label,
            enabled: nes.cpu.getFlag(flag),
          })),
          p: nes.cpu.p,
          pc: nes.cpu.pc,
          s: nes.cpu.s,
          stallCycles: nes.cpu.stallCycles,
          x: nes.cpu.x,
          y: nes.cpu.y,
        },
        ppu: {
          cycle: nes.bus.ppu.cycle,
          frameReady: nes.bus.ppu.frameReady,
          scanline: nes.bus.ppu.scanline,
          status: nes.bus.ppu.status,
        },
      };
    }, null);
  }
  function drawPlaceholder() {
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  function releaseAllButtons() {
    activeNES?.releaseAllButtons();
  }
  function clearFrameHandle() {
    if (!frameHandle) return;
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }
  function stopActiveLoop() {
    loopGeneration += 1;
    clearFrameHandle();
    releaseAllButtons();
    isPaused = false;
    activeNES = null;
    audioDriver.clear();
  }
  function handleRuntimeFailure(error, notify = true) {
    const runtimeError =
      error instanceof Error ? error : new Error(String(error));
    console.error(runtimeError);
    stopActiveLoop();
    drawPlaceholder();
    if (notify) onRuntimeError(runtimeError);
    return runtimeError;
  }
  function bootNES(nes) {
    stopActiveLoop();
    activeNES = nes;
    activeNES.present();
    const generation = loopGeneration;
    const frameDuration = 1000 / 60;
    let previousFrameTime = performance.now();
    let lag = 0;
    const frame = (now) => {
      if (generation !== loopGeneration || activeNES !== nes) return;
      try {
        if (isPaused) ((previousFrameTime = now), (lag = 0));
        else {
          lag += Math.min(100, now - previousFrameTime);
          previousFrameTime = now;
          while (lag >= frameDuration) (nes.runFrame(), (lag -= frameDuration));
        }
        nes.present();
        frameHandle = requestAnimationFrame(frame);
      } catch (error) {
        handleRuntimeFailure(error);
      }
    };
    frameHandle = requestAnimationFrame(frame);
  }
  async function enableAudio() {
    return audioDriver.enable();
  }
  function loadRomBytes(bytes) {
    try {
      bootNES(new NES(Cartridge.fromINES(bytes), canvas, audioDriver));
      canvas.focus({ preventScroll: true });
    } catch (error) {
      throw handleRuntimeFailure(error, false);
    }
  }
  function setButton(button, pressed) {
    return withActiveNES((nes) => {
      void enableAudio();
      nes.setButton(button, pressed);
      return true;
    }, false);
  }
  function setButtonByCode(code, pressed) {
    const button = getButtonForKeyboardCode(code);
    return button ? setButton(button, pressed) : false;
  }
  function setPaused(paused) {
    return withActiveNES(
      (nes) => ((isPaused = paused), paused && nes.releaseAllButtons(), true),
      false,
    );
  }
  function stepInstruction() {
    return withActiveNES((nes) => {
      isPaused = true;
      try {
        stepNesInstruction(nes);
        nes.present();
        return getDebugSnapshot();
      } catch (error) {
        handleRuntimeFailure(error);
        return null;
      }
    }, null);
  }
  function destroy() {
    stopActiveLoop();
    audioDriver.destroy();
  }
  drawPlaceholder();
  return {
    destroy,
    drawPlaceholder,
    enableAudio,
    getDebugSnapshot,
    hasActiveRom: () => activeNES !== null,
    isDebugWritableAddress,
    isPaused: () => isPaused,
    loadRomBytes,
    pause: () => setPaused(true),
    releaseAllButtons,
    resume: () => setPaused(false),
    setDebugByte,
    setButton,
    setButtonByCode,
    stepInstruction,
    stop: stopActiveLoop,
  };
}
