const CPU_FLAG_CARRY = 0x01;
const CPU_FLAG_ZERO = 0x02;
const CPU_FLAG_INTERRUPT = 0x04;
const CPU_FLAG_DECIMAL = 0x08;
const CPU_FLAG_BREAK = 0x10;
const CPU_FLAG_UNUSED = 0x20;
const CPU_FLAG_OVERFLOW = 0x40;
const CPU_FLAG_NEGATIVE = 0x80;

const NES_PALETTE = [
  [124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188],
  [148, 0, 132], [168, 0, 32], [168, 16, 0], [136, 20, 0],
  [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0],
  [0, 64, 88], [0, 0, 0], [0, 0, 0], [0, 0, 0],
  [188, 188, 188], [0, 120, 248], [0, 88, 248], [104, 68, 252],
  [216, 0, 204], [228, 0, 88], [248, 56, 0], [228, 92, 16],
  [172, 124, 0], [0, 184, 0], [0, 168, 0], [0, 168, 68],
  [0, 136, 136], [0, 0, 0], [0, 0, 0], [0, 0, 0],
  [248, 248, 248], [60, 188, 252], [104, 136, 252], [152, 120, 248],
  [248, 120, 248], [248, 88, 152], [248, 120, 88], [252, 160, 68],
  [248, 184, 0], [184, 248, 24], [88, 216, 84], [88, 248, 152],
  [0, 232, 216], [120, 120, 120], [0, 0, 0], [0, 0, 0],
  [252, 252, 252], [164, 228, 252], [184, 184, 248], [216, 184, 248],
  [248, 184, 248], [248, 164, 192], [240, 208, 176], [252, 224, 168],
  [248, 216, 120], [216, 248, 120], [184, 248, 184], [184, 248, 216],
  [0, 252, 252], [248, 216, 248], [0, 0, 0], [0, 0, 0],
];

const NTSC_CPU_CLOCK = 1789773;
const LENGTH_TABLE = [
  10, 254, 20, 2, 40, 4, 80, 6,
  160, 8, 60, 10, 14, 12, 26, 14,
  12, 16, 24, 18, 48, 20, 96, 22,
  192, 24, 72, 26, 16, 28, 32, 30,
];
const PULSE_DUTY_TABLE = [
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 1, 1],
];
const TRIANGLE_SEQUENCE = [
  15, 14, 13, 12, 11, 10, 9, 8,
  7, 6, 5, 4, 3, 2, 1, 0,
  0, 1, 2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14, 15,
];
const NOISE_PERIOD_TABLE = [
  4, 8, 16, 32, 64, 96, 128, 160,
  202, 254, 380, 508, 762, 1016, 2034, 4068,
];
const AUDIO_WORKLET_PROCESSOR_NAME = "nes-audio-output";
const AUDIO_WORKLET_CHUNK_SIZE = 512;

function wrapIndex(index, size) {
  if (size <= 0) {
    return 0;
  }
  return index % size;
}

class Cartridge {
  static fromINES(bytes) {
    if (bytes.length < 16) {
      throw new Error("ROM is too small to contain an iNES header");
    }

    if (
      bytes[0] !== 0x4e ||
      bytes[1] !== 0x45 ||
      bytes[2] !== 0x53 ||
      bytes[3] !== 0x1a
    ) {
      throw new Error("ROM does not contain a valid iNES header");
    }

    const prgBanks = bytes[4];
    const chrBanks = bytes[5];
    const flags6 = bytes[6];
    const flags7 = bytes[7];
    const mapper = (flags6 >> 4) | (flags7 & 0xf0);

    if (flags6 & 0x04) {
      throw new Error("Trainer ROMs are not supported");
    }

    const prgSize = prgBanks * 0x4000;
    const chrSize = chrBanks * 0x2000;
    const offset = 16;
    const prgRom = bytes.slice(offset, offset + prgSize);
    const chrOffset = offset + prgSize;
    const chrRom = chrSize > 0 ? bytes.slice(chrOffset, chrOffset + chrSize) : new Uint8Array(0x2000);
    const common = {
      prgRom,
      chrRom,
      hasChrRam: chrSize === 0,
      mirroring: flags6 & 0x01 ? "vertical" : "horizontal",
      fourScreen: (flags6 & 0x08) !== 0,
      prgRamSize: (bytes[8] || 1) * 0x2000,
    };

    if (mapper === 0) {
      return new NROMCartridge(common);
    }

    if (mapper === 1) {
      return new MMC1Cartridge(common);
    }

    if (mapper === 2) {
      return new UxROMCartridge(common);
    }

    if (mapper === 3) {
      return new CNROMCartridge(common);
    }

    if (mapper === 4) {
      return new MMC3Cartridge(common);
    }

    throw new Error(
      `Unsupported mapper ${mapper}. This build supports mappers 0, 1, 2, 3, and 4.`
    );
  }

  constructor({ prgRom, chrRom, hasChrRam, mirroring, fourScreen = false, prgRamSize = 0 }) {
    this.prgRom = prgRom;
    this.chrRom = chrRom;
    this.hasChrRam = hasChrRam;
    this.mirroring = mirroring;
    this.fourScreen = fourScreen;
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

  readPrg() {
    return 0;
  }

  writePrg() {}

  readPrgRam(addr) {
    if (!this.prgRamEnabled || this.prgRam.length === 0) {
      return 0;
    }

    return this.prgRam[wrapIndex(addr - 0x6000, this.prgRam.length)];
  }

  writePrgRam(addr, value) {
    if (!this.prgRamEnabled || this.prgRamWriteProtected || this.prgRam.length === 0) {
      return;
    }

    this.prgRam[wrapIndex(addr - 0x6000, this.prgRam.length)] = value & 0xff;
  }

  readChr(addr) {
    return this.chrRom[wrapIndex(addr & 0x1fff, this.chrRom.length)];
  }

  writeChr(addr, value) {
    if (this.hasChrRam) {
      this.chrRom[wrapIndex(addr & 0x1fff, this.chrRom.length)] = value;
    }
  }

  mirrorNametableAddress(addr) {
    if (this.fourScreen) {
      return addr & 0x0fff;
    }

    const index = addr & 0x0fff;
    const table = index >> 10;
    const offset = index & 0x03ff;

    if (this.mirroring === "single-screen-lower") {
      return offset;
    }

    if (this.mirroring === "single-screen-upper") {
      return 0x0400 + offset;
    }

    if (this.mirroring === "vertical") {
      return (table & 0x01) * 0x0400 + offset;
    }

    return ((table >> 1) & 0x01) * 0x0400 + offset;
  }

  clockScanline() {}

  hasIRQ() {
    return false;
  }
}

class NROMCartridge extends Cartridge {
  readPrg(addr) {
    let index = addr - 0x8000;
    if (this.prgRom.length === 0x4000) {
      index &= 0x3fff;
    }
    return this.prgRom[index];
  }
}

class UxROMCartridge extends Cartridge {
  constructor(options) {
    super(options);
    this.prgBank = 0;
    this.reset();
  }

  reset() {
    super.reset();
    this.prgBank = 0;
  }

  getPrgBankCount() {
    return Math.max(1, this.prgRom.length >> 14);
  }

  readPrg(addr) {
    const slot = (addr - 0x8000) >> 14;
    const lastBank = this.getPrgBankCount() - 1;
    const bank = slot === 0 ? wrapIndex(this.prgBank, this.getPrgBankCount()) : lastBank;
    const index = bank * 0x4000 + (addr & 0x3fff);
    return this.prgRom[index];
  }

  writePrg(addr, value) {
    this.prgBank = value & 0xff;
  }
}

class CNROMCartridge extends NROMCartridge {
  constructor(options) {
    super(options);
    this.chrBank = 0;
    this.reset();
  }

  reset() {
    super.reset();
    this.chrBank = 0;
  }

  getChrBankCount() {
    return Math.max(1, this.chrRom.length >> 13);
  }

  readChr(addr) {
    const bank = wrapIndex(this.chrBank, this.getChrBankCount());
    const index = bank * 0x2000 + (addr & 0x1fff);
    return this.chrRom[index];
  }

  writeChr(addr, value) {
    if (!this.hasChrRam) {
      return;
    }

    const bank = wrapIndex(this.chrBank, this.getChrBankCount());
    const index = bank * 0x2000 + (addr & 0x1fff);
    this.chrRom[index] = value & 0xff;
  }

  writePrg(addr, value) {
    this.chrBank = value & 0xff;
  }
}

class MMC1Cartridge extends Cartridge {
  constructor(options) {
    super(options);
    this.shiftRegister = 0x10;
    this.control = 0x0c;
    this.chrBank0 = 0;
    this.chrBank1 = 0;
    this.prgBank = 0;
    this.reset();
  }

  reset() {
    super.reset();
    this.shiftRegister = 0x10;
    this.control = 0x0c;
    this.chrBank0 = 0;
    this.chrBank1 = 0;
    this.prgBank = 0;
    if (!this.fourScreen) {
      this.mirroring = "horizontal";
    }
  }

  getPrgBankCount() {
    return Math.max(1, this.prgRom.length >> 14);
  }

  getChrBankCount() {
    return Math.max(1, this.chrRom.length >> 12);
  }

  readPrg(addr) {
    const mode = (this.control >> 2) & 0x03;
    const slot = (addr - 0x8000) >> 14;
    const lastBank = this.getPrgBankCount() - 1;
    let bank;

    if (mode <= 1) {
      bank = (this.prgBank & 0x0e) + slot;
    } else if (mode === 2) {
      bank = slot === 0 ? 0 : this.prgBank;
    } else {
      bank = slot === 0 ? this.prgBank : lastBank;
    }

    const index = wrapIndex(bank, this.getPrgBankCount()) * 0x4000 + (addr & 0x3fff);
    return this.prgRom[index];
  }

  writePrg(addr, value) {
    if (value & 0x80) {
      this.shiftRegister = 0x10;
      this.control |= 0x0c;
      this.updateMirroring();
      return;
    }

    const commit = (this.shiftRegister & 0x01) !== 0;
    this.shiftRegister = (this.shiftRegister >> 1) | ((value & 0x01) << 4);

    if (!commit) {
      return;
    }

    const data = this.shiftRegister & 0x1f;
    if (addr < 0xa000) {
      this.control = data;
      this.updateMirroring();
    } else if (addr < 0xc000) {
      this.chrBank0 = data;
    } else if (addr < 0xe000) {
      this.chrBank1 = data;
    } else {
      this.prgBank = data & 0x0f;
      this.prgRamEnabled = this.prgRam.length > 0 && (data & 0x10) === 0;
    }

    this.shiftRegister = 0x10;
  }

  readChr(addr) {
    const bank = this.resolveChrBank(addr);
    const index = bank * 0x1000 + (addr & 0x0fff);
    return this.chrRom[index];
  }

  writeChr(addr, value) {
    if (!this.hasChrRam) {
      return;
    }

    const bank = this.resolveChrBank(addr);
    const index = bank * 0x1000 + (addr & 0x0fff);
    this.chrRom[index] = value & 0xff;
  }

  resolveChrBank(addr) {
    if (((this.control >> 4) & 0x01) === 0) {
      return wrapIndex((this.chrBank0 & 0x1e) + ((addr & 0x1000) >> 12), this.getChrBankCount());
    }

    const bank = (addr & 0x1000) === 0 ? this.chrBank0 : this.chrBank1;
    return wrapIndex(bank, this.getChrBankCount());
  }

  updateMirroring() {
    if (this.fourScreen) {
      return;
    }

    switch (this.control & 0x03) {
      case 0:
        this.mirroring = "single-screen-lower";
        break;
      case 1:
        this.mirroring = "single-screen-upper";
        break;
      case 2:
        this.mirroring = "vertical";
        break;
      default:
        this.mirroring = "horizontal";
        break;
    }
  }
}

class MMC3Cartridge extends Cartridge {
  constructor(options) {
    super(options);
    this.bankSelect = 0;
    this.prgMode = 0;
    this.chrMode = 0;
    this.bankRegisters = new Uint8Array(8);
    this.irqLatch = 0;
    this.irqCounter = 0;
    this.irqReload = false;
    this.irqEnabled = false;
    this.irqPending = false;
    this.reset();
  }

  reset() {
    super.reset();
    this.bankSelect = 0;
    this.prgMode = 0;
    this.chrMode = 0;
    this.bankRegisters.fill(0);
    this.bankRegisters[6] = 0;
    this.bankRegisters[7] = 1;
    this.irqLatch = 0;
    this.irqCounter = 0;
    this.irqReload = false;
    this.irqEnabled = false;
    this.irqPending = false;
  }

  getPrgBankCount() {
    return Math.max(1, this.prgRom.length >> 13);
  }

  getChrBankCount() {
    return Math.max(1, this.chrRom.length >> 10);
  }

  resolvePrgBank(bank) {
    return wrapIndex(bank, this.getPrgBankCount());
  }

  resolveChrBank(bank) {
    return wrapIndex(bank, this.getChrBankCount());
  }

  readPrg(addr) {
    const slot = (addr - 0x8000) >> 13;
    const lastBank = this.getPrgBankCount() - 1;
    const secondLastBank = Math.max(0, lastBank - 1);

    let bank = lastBank;
    switch (slot) {
      case 0:
        bank = this.prgMode ? secondLastBank : this.bankRegisters[6];
        break;
      case 1:
        bank = this.bankRegisters[7];
        break;
      case 2:
        bank = this.prgMode ? this.bankRegisters[6] : secondLastBank;
        break;
      default:
        bank = lastBank;
        break;
    }

    const index = this.resolvePrgBank(bank) * 0x2000 + (addr & 0x1fff);
    return this.prgRom[index];
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
        if (!this.fourScreen) {
          this.mirroring = (value & 0x01) === 0 ? "vertical" : "horizontal";
        }
      } else {
        this.prgRamWriteProtected = (value & 0x40) !== 0;
        this.prgRamEnabled = (value & 0x80) !== 0;
      }
      return;
    }

    if (address < 0xe000) {
      if ((address & 1) === 0) {
        this.irqLatch = value & 0xff;
      } else {
        this.irqReload = true;
      }
      return;
    }

    if ((address & 1) === 0) {
      this.irqEnabled = false;
      this.irqPending = false;
    } else {
      this.irqEnabled = true;
    }
  }

  writeBankData(value) {
    switch (this.bankSelect) {
      case 0:
      case 1:
        this.bankRegisters[this.bankSelect] = value & 0xfe;
        break;
      default:
        this.bankRegisters[this.bankSelect] = value & 0xff;
        break;
    }
  }

  readChr(addr) {
    const slot = (addr & 0x1fff) >> 10;
    const offset = addr & 0x03ff;
    let bank;

    if (this.chrMode === 0) {
      switch (slot) {
        case 0:
          bank = this.bankRegisters[0];
          break;
        case 1:
          bank = this.bankRegisters[0] + 1;
          break;
        case 2:
          bank = this.bankRegisters[1];
          break;
        case 3:
          bank = this.bankRegisters[1] + 1;
          break;
        case 4:
          bank = this.bankRegisters[2];
          break;
        case 5:
          bank = this.bankRegisters[3];
          break;
        case 6:
          bank = this.bankRegisters[4];
          break;
        default:
          bank = this.bankRegisters[5];
          break;
      }
    } else {
      switch (slot) {
        case 0:
          bank = this.bankRegisters[2];
          break;
        case 1:
          bank = this.bankRegisters[3];
          break;
        case 2:
          bank = this.bankRegisters[4];
          break;
        case 3:
          bank = this.bankRegisters[5];
          break;
        case 4:
          bank = this.bankRegisters[0];
          break;
        case 5:
          bank = this.bankRegisters[0] + 1;
          break;
        case 6:
          bank = this.bankRegisters[1];
          break;
        default:
          bank = this.bankRegisters[1] + 1;
          break;
      }
    }

    const index = this.resolveChrBank(bank) * 0x0400 + offset;
    return this.chrRom[index];
  }

  writeChr(addr, value) {
    if (!this.hasChrRam) {
      return;
    }

    const slot = (addr & 0x1fff) >> 10;
    const offset = addr & 0x03ff;
    let bank;

    if (this.chrMode === 0) {
      switch (slot) {
        case 0:
          bank = this.bankRegisters[0];
          break;
        case 1:
          bank = this.bankRegisters[0] + 1;
          break;
        case 2:
          bank = this.bankRegisters[1];
          break;
        case 3:
          bank = this.bankRegisters[1] + 1;
          break;
        case 4:
          bank = this.bankRegisters[2];
          break;
        case 5:
          bank = this.bankRegisters[3];
          break;
        case 6:
          bank = this.bankRegisters[4];
          break;
        default:
          bank = this.bankRegisters[5];
          break;
      }
    } else {
      switch (slot) {
        case 0:
          bank = this.bankRegisters[2];
          break;
        case 1:
          bank = this.bankRegisters[3];
          break;
        case 2:
          bank = this.bankRegisters[4];
          break;
        case 3:
          bank = this.bankRegisters[5];
          break;
        case 4:
          bank = this.bankRegisters[0];
          break;
        case 5:
          bank = this.bankRegisters[0] + 1;
          break;
        case 6:
          bank = this.bankRegisters[1];
          break;
        default:
          bank = this.bankRegisters[1] + 1;
          break;
      }
    }

    const index = this.resolveChrBank(bank) * 0x0400 + offset;
    this.chrRom[index] = value & 0xff;
  }

  clockScanline() {
    if (this.irqCounter === 0 || this.irqReload) {
      this.irqCounter = this.irqLatch;
      this.irqReload = false;
    } else {
      this.irqCounter = (this.irqCounter - 1) & 0xff;
    }

    if (this.irqCounter === 0 && this.irqEnabled) {
      this.irqPending = true;
    }
  }

  hasIRQ() {
    return this.irqPending;
  }
}

class Controller {
  constructor() {
    this.state = 0;
    this.shift = 0;
    this.strobe = 0;
  }

  setButton(button, pressed) {
    const bit = {
      a: 0,
      b: 1,
      select: 2,
      start: 3,
      up: 4,
      down: 5,
      left: 6,
      right: 7,
    }[button];

    if (bit === undefined) {
      return;
    }

    if (pressed) {
      this.state |= 1 << bit;
    } else {
      this.state &= ~(1 << bit);
    }
  }

  write(value) {
    const nextStrobe = value & 1;
    if (this.strobe === 1 && nextStrobe === 0) {
      this.shift = this.state;
    }
    this.strobe = nextStrobe;
    if (this.strobe) {
      this.shift = this.state;
    }
  }

  read() {
    let value;

    if (this.strobe) {
      value = this.state & 1;
      this.shift = this.state;
    } else {
      value = this.shift & 1;
      this.shift = (this.shift >> 1) | 0x80;
    }

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

    this.ctrl = 0;
    this.mask = 0;
    this.status = 0;
    this.oamAddr = 0;
    this.readBuffer = 0;
    this.openBus = 0;

    this.v = 0;
    this.t = 0;
    this.x = 0;
    this.w = 0;

    this.scanline = 261;
    this.cycle = 0;
    this.frameReady = false;
    this.nmiPending = false;
    this.lineBaseV = 0;
    this.lineSprites = [];
  }

  reset() {
    this.ctrl = 0;
    this.mask = 0;
    this.status = 0;
    this.oamAddr = 0;
    this.readBuffer = 0;
    this.openBus = 0;
    this.v = 0;
    this.t = 0;
    this.x = 0;
    this.w = 0;
    this.scanline = 261;
    this.cycle = 0;
    this.frameReady = false;
    this.nmiPending = false;
    this.lineBaseV = 0;
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
    if (!this.nmiPending) {
      return false;
    }
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

        if (address >= 0x3f00) {
          value = readValue;
          this.readBuffer = this.read(address - 0x1000);
        } else {
          value = this.readBuffer;
          this.readBuffer = readValue;
        }

        this.incrementVramAddress();
        break;
      }
      default:
        break;
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
        if (!wasNmiEnabled && (this.ctrl & 0x80) && (this.status & 0x80)) {
          this.triggerNMI();
        }
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
        if (this.w === 0) {
          this.t = (this.t & 0x7fe0) | (value >> 3);
          this.x = value & 0x07;
          this.w = 1;
        } else {
          this.t = (this.t & 0x0c1f) | ((value & 0x07) << 12) | ((value & 0xf8) << 2);
          this.w = 0;
        }
        break;
      case 0x2006:
        if (this.w === 0) {
          this.t = (this.t & 0x00ff) | ((value & 0x3f) << 8);
          this.w = 1;
        } else {
          this.t = (this.t & 0x7f00) | value;
          this.v = this.t;
          this.w = 0;
        }
        break;
      case 0x2007:
        this.write(this.v & 0x3fff, value);
        this.incrementVramAddress();
        break;
      default:
        break;
    }
  }

  writeOamDma(buffer) {
    for (let i = 0; i < 256; i += 1) {
      this.oam[(this.oamAddr + i) & 0xff] = buffer[i];
    }
  }

  incrementVramAddress() {
    this.v = (this.v + ((this.ctrl & 0x04) ? 32 : 1)) & 0x7fff;
  }

  read(addr) {
    const address = addr & 0x3fff;

    if (address < 0x2000) {
      return this.cartridge.readChr(address);
    }

    if (address < 0x3f00) {
      return this.nametableRam[this.cartridge.mirrorNametableAddress(address)];
    }

    return this.paletteRam[this.normalizePaletteAddress(address)];
  }

  write(addr, value) {
    const address = addr & 0x3fff;

    if (address < 0x2000) {
      this.cartridge.writeChr(address, value);
      return;
    }

    if (address < 0x3f00) {
      this.nametableRam[this.cartridge.mirrorNametableAddress(address)] = value;
      return;
    }

    this.paletteRam[this.normalizePaletteAddress(address)] = value & 0x3f;
  }

  normalizePaletteAddress(addr) {
    let index = addr & 0x1f;
    if (index === 0x10 || index === 0x14 || index === 0x18 || index === 0x1c) {
      index -= 0x10;
    }
    return index;
  }

  incrementX() {
    if ((this.v & 0x001f) === 31) {
      this.v &= ~0x001f;
      this.v ^= 0x0400;
    } else {
      this.v += 1;
    }
  }

  incrementY() {
    if ((this.v & 0x7000) !== 0x7000) {
      this.v += 0x1000;
      return;
    }

    this.v &= ~0x7000;
    let y = (this.v & 0x03e0) >> 5;

    if (y === 29) {
      y = 0;
      this.v ^= 0x0800;
    } else if (y === 31) {
      y = 0;
    } else {
      y += 1;
    }

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
      if ((value & 0x001f) === 0) {
        value = (value & ~0x001f) | 31;
        value ^= 0x0400;
      } else {
        value -= 1;
      }
    }

    return value;
  }

  decodeBackgroundPixel(screenX) {
    if (!this.backgroundEnabled()) {
      return { pixel: 0, palette: 0 };
    }

    if (screenX < 8 && (this.mask & 0x02) === 0) {
      return { pixel: 0, palette: 0 };
    }

    const coarseXBase = this.lineBaseV & 0x001f;
    const coarseY = (this.lineBaseV >> 5) & 0x001f;
    const nametableXBase = (this.lineBaseV >> 10) & 0x01;
    const nametableY = (this.lineBaseV >> 11) & 0x01;
    const fineY = (this.lineBaseV >> 12) & 0x07;

    const pixelOffset = this.x + screenX;
    const tileX = (coarseXBase + (pixelOffset >> 3)) & 0x1f;
    const nametableX = nametableXBase ^ ((coarseXBase + (pixelOffset >> 3)) >> 5);
    const bit = 7 - (pixelOffset & 0x07);
    const nametable = 0x2000 | (nametableY << 11) | (nametableX << 10);
    const tileAddress = nametable | (coarseY << 5) | tileX;
    const tileId = this.read(tileAddress);
    const attributeAddress = nametable | 0x03c0 | ((coarseY >> 2) << 3) | (tileX >> 2);
    const attribute = this.read(attributeAddress);
    const palette = (attribute >> (((coarseY & 0x02) << 1) | (tileX & 0x02))) & 0x03;
    const patternBase = (this.ctrl & 0x10) ? 0x1000 : 0x0000;
    const patternAddress = patternBase + tileId * 16 + fineY;
    const low = this.read(patternAddress);
    const high = this.read(patternAddress + 8);
    const pixel = ((low >> bit) & 0x01) | (((high >> bit) & 0x01) << 1);
    return { pixel, palette };
  }

  getSpritePixel(screenX, screenY) {
    if (!this.spritesEnabled()) {
      return null;
    }

    if (screenX < 8 && (this.mask & 0x04) === 0) {
      return null;
    }

    const spriteHeight = (this.ctrl & 0x20) ? 16 : 8;

    for (const sprite of this.lineSprites) {
      if (screenX < sprite.x || screenX >= sprite.x + 8) {
        continue;
      }

      let row = screenY - (sprite.y + 1);
      let column = screenX - sprite.x;

      if (sprite.attributes & 0x80) {
        row = spriteHeight - 1 - row;
      }

      if (sprite.attributes & 0x40) {
        column = 7 - column;
      }

      let patternBase;
      let tileIndex;
      let fineY = row;

      if (spriteHeight === 16) {
        patternBase = (sprite.tileIndex & 0x01) * 0x1000;
        tileIndex = sprite.tileIndex & 0xfe;
        if (fineY >= 8) {
          tileIndex += 1;
          fineY -= 8;
        }
      } else {
        patternBase = (this.ctrl & 0x08) ? 0x1000 : 0x0000;
        tileIndex = sprite.tileIndex;
      }

      const patternAddress = patternBase + tileIndex * 16 + fineY;
      const low = this.read(patternAddress);
      const high = this.read(patternAddress + 8);
      const bit = 7 - column;
      const pixel = ((low >> bit) & 0x01) | (((high >> bit) & 0x01) << 1);

      if (pixel === 0) {
        continue;
      }

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
    const spriteHeight = (this.ctrl & 0x20) ? 16 : 8;
    let visibleCount = 0;

    for (let i = 0; i < 64; i += 1) {
      const base = i * 4;
      const y = this.oam[base];
      const row = scanline - (y + 1);

      if (row < 0 || row >= spriteHeight) {
        continue;
      }

      visibleCount += 1;
      if (this.lineSprites.length < 8) {
        this.lineSprites.push({
          index: i,
          y,
          tileIndex: this.oam[base + 1],
          attributes: this.oam[base + 2],
          x: this.oam[base + 3],
        });
      }
    }

    if (visibleCount > 8) {
      this.status |= 0x20;
    }
  }

  readColor(paletteIndex, pixel) {
    const colorIndex = pixel === 0
      ? this.paletteRam[0] & 0x3f
      : this.paletteRam[this.normalizePaletteAddress(0x3f00 + paletteIndex * 4 + pixel)] & 0x3f;
    return NES_PALETTE[colorIndex];
  }

  renderPixel() {
    const screenX = this.cycle - 1;
    const screenY = this.scanline;
    const bg = this.decodeBackgroundPixel(screenX);
    const sprite = this.getSpritePixel(screenX, screenY);

    let color = this.readColor(0, 0);

    if (sprite && sprite.sprite0 && sprite.pixel !== 0 && bg.pixel !== 0 && screenX < 255) {
      this.status |= 0x40;
    }

    if (sprite && sprite.pixel !== 0 && (bg.pixel === 0 || !sprite.priorityBehindBackground)) {
      color = this.readColor(sprite.palette, sprite.pixel);
    } else if (bg.pixel !== 0) {
      color = this.readColor(bg.palette, bg.pixel);
    }

    const offset = (screenY * 256 + screenX) * 4;
    this.framebuffer[offset] = color[0];
    this.framebuffer[offset + 1] = color[1];
    this.framebuffer[offset + 2] = color[2];
    this.framebuffer[offset + 3] = 255;
  }

  step() {
    const rendering = this.isRenderingEnabled();

    if (this.scanline === 261 && this.cycle === 1) {
      this.status &= ~0xe0;
    }

    if (this.scanline === 241 && this.cycle === 1) {
      this.status |= 0x80;
      this.frameReady = true;
      if (this.ctrl & 0x80) {
        this.triggerNMI();
      }
    }

    if (this.scanline >= 0 && this.scanline < 240 && this.cycle === 0) {
      // `v` has already advanced through the two background prefetch tiles
      // for the next scanline. This renderer samples pixels directly rather
      // than through shift registers, so rewind those tiles here.
      this.lineBaseV = this.rewindHorizontalTiles(this.v, 2);
      this.evaluateSpritesForScanline(this.scanline);
    }

    if (this.scanline >= 0 && this.scanline < 240 && this.cycle >= 1 && this.cycle <= 256) {
      this.renderPixel();
    }

    if (rendering) {
      const isVisibleCycle = (this.cycle >= 1 && this.cycle <= 256) || (this.cycle >= 321 && this.cycle <= 336);
      if ((this.scanline >= 0 && this.scanline < 240) || this.scanline === 261) {
        if (isVisibleCycle && (this.cycle & 0x07) === 0) {
          this.incrementX();
        }

        if (this.cycle === 256) {
          this.incrementY();
        }

        if (this.cycle === 257) {
          this.copyHorizontalBits();
        }

        if (this.scanline === 261 && this.cycle >= 280 && this.cycle <= 304) {
          this.copyVerticalBits();
        }
      }
    }

    if (rendering && this.scanline >= 0 && this.scanline < 240 && this.cycle === 260) {
      this.cartridge.clockScanline();
    }

    this.cycle += 1;
    if (this.cycle > 340) {
      this.cycle = 0;
      this.scanline += 1;
      if (this.scanline > 261) {
        this.scanline = 0;
      }
    }
  }
}

class CPU6502 {
  constructor(bus) {
    this.bus = bus;
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.s = 0xfd;
    this.p = CPU_FLAG_INTERRUPT | CPU_FLAG_UNUSED;
    this.pc = 0;
    this.stallCycles = 0;
  }

  reset() {
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.s = 0xfd;
    this.p = CPU_FLAG_INTERRUPT | CPU_FLAG_UNUSED;
    this.stallCycles = 7;
    this.pc = this.read16(0xfffc);
  }

  setFlag(flag, enabled) {
    if (enabled) {
      this.p |= flag;
    } else {
      this.p &= ~flag;
    }
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
    if (stall) {
      this.stallCycles += stall + ((this.bus.ppu.cycle & 1) ? 1 : 0);
    }
  }

  read16(addr) {
    const lo = this.read(addr);
    const hi = this.read((addr + 1) & 0xffff);
    return lo | (hi << 8);
  }

  read16Bug(addr) {
    const lo = this.read(addr);
    const hi = this.read((addr & 0xff00) | ((addr + 1) & 0x00ff));
    return lo | (hi << 8);
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
    const lo = this.pull();
    const hi = this.pull();
    return lo | (hi << 8);
  }

  serviceInterrupt(vector, breakFlag) {
    this.push16(this.pc);
    this.push((this.p & ~CPU_FLAG_BREAK) | CPU_FLAG_UNUSED | (breakFlag ? CPU_FLAG_BREAK : 0));
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
    const addr = this.read(pointer) | (this.read((pointer + 1) & 0xff) << 8);
    return { addr, pageCrossed: false };
  }

  indirectIndexed() {
    const pointer = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    const base = this.read(pointer) | (this.read((pointer + 1) & 0xff) << 8);
    const addr = (base + this.y) & 0xffff;
    return { addr, pageCrossed: this.pageCrossed(base, addr) };
  }

  relative() {
    const offsetByte = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    const offset = offsetByte < 0x80 ? offsetByte : offsetByte - 0x100;
    return { offset };
  }

  accumulator() {
    return { addr: null, pageCrossed: false };
  }

  implied() {
    return { addr: null, pageCrossed: false };
  }

  branchIf(condition, offset) {
    if (!condition) {
      return 0;
    }

    const previous = this.pc;
    this.pc = (this.pc + offset) & 0xffff;
    return this.pageCrossed(previous, this.pc) ? 2 : 1;
  }

  adc(value) {
    const carry = this.getFlag(CPU_FLAG_CARRY) ? 1 : 0;
    const sum = this.a + value + carry;
    const result = sum & 0xff;
    this.setFlag(CPU_FLAG_CARRY, sum > 0xff);
    this.setFlag(CPU_FLAG_OVERFLOW, (~(this.a ^ value) & (this.a ^ result) & 0x80) !== 0);
    this.a = result;
    this.setZN(this.a);
  }

  compare(register, value) {
    const result = (register - value) & 0xff;
    this.setFlag(CPU_FLAG_CARRY, register >= value);
    this.setZN(result);
  }

  step() {
    if (this.stallCycles > 0) {
      this.stallCycles -= 1;
      return 1;
    }

    if (this.bus.pollNMI()) {
      this.serviceInterrupt(0xfffa, false);
      return 7;
    }

    if (!this.getFlag(CPU_FLAG_INTERRUPT) && this.bus.hasIRQ()) {
      this.serviceInterrupt(0xfffe, false);
      return 7;
    }

    const opcode = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    const meta = OPCODES[opcode];

    if (!meta) {
      throw new Error(
        `Unsupported opcode 0x${opcode.toString(16).padStart(2, "0")} at 0x${((this.pc - 1) & 0xffff).toString(16).padStart(4, "0")}`
      );
    }

    const operand = this[meta.mode]();
    let extraCycles = 0;
    const address = operand.addr;
    const readValue = () => this.read(address);
    const writeValue = (value) => this.write(address, value);

    switch (meta.name) {
      case "ADC":
        this.adc(readValue());
        break;
      case "AND":
        this.a &= readValue();
        this.setZN(this.a);
        break;
      case "ASL":
        if (meta.mode === "accumulator") {
          this.setFlag(CPU_FLAG_CARRY, (this.a & 0x80) !== 0);
          this.a = (this.a << 1) & 0xff;
          this.setZN(this.a);
        } else {
          const value = readValue();
          this.setFlag(CPU_FLAG_CARRY, (value & 0x80) !== 0);
          const result = (value << 1) & 0xff;
          writeValue(result);
          this.setZN(result);
        }
        break;
      case "BCC":
        extraCycles = this.branchIf(!this.getFlag(CPU_FLAG_CARRY), operand.offset);
        break;
      case "BCS":
        extraCycles = this.branchIf(this.getFlag(CPU_FLAG_CARRY), operand.offset);
        break;
      case "BEQ":
        extraCycles = this.branchIf(this.getFlag(CPU_FLAG_ZERO), operand.offset);
        break;
      case "BIT": {
        const value = readValue();
        this.setFlag(CPU_FLAG_ZERO, (this.a & value) === 0);
        this.setFlag(CPU_FLAG_NEGATIVE, (value & 0x80) !== 0);
        this.setFlag(CPU_FLAG_OVERFLOW, (value & 0x40) !== 0);
        break;
      }
      case "BMI":
        extraCycles = this.branchIf(this.getFlag(CPU_FLAG_NEGATIVE), operand.offset);
        break;
      case "BNE":
        extraCycles = this.branchIf(!this.getFlag(CPU_FLAG_ZERO), operand.offset);
        break;
      case "BPL":
        extraCycles = this.branchIf(!this.getFlag(CPU_FLAG_NEGATIVE), operand.offset);
        break;
      case "BRK":
        this.pc = (this.pc + 1) & 0xffff;
        this.serviceInterrupt(0xfffe, true);
        break;
      case "BVC":
        extraCycles = this.branchIf(!this.getFlag(CPU_FLAG_OVERFLOW), operand.offset);
        break;
      case "BVS":
        extraCycles = this.branchIf(this.getFlag(CPU_FLAG_OVERFLOW), operand.offset);
        break;
      case "CLC":
        this.setFlag(CPU_FLAG_CARRY, false);
        break;
      case "CLD":
        this.setFlag(CPU_FLAG_DECIMAL, false);
        break;
      case "CLI":
        this.setFlag(CPU_FLAG_INTERRUPT, false);
        break;
      case "CLV":
        this.setFlag(CPU_FLAG_OVERFLOW, false);
        break;
      case "CMP":
        this.compare(this.a, readValue());
        break;
      case "CPX":
        this.compare(this.x, readValue());
        break;
      case "CPY":
        this.compare(this.y, readValue());
        break;
      case "DEC": {
        const result = (readValue() - 1) & 0xff;
        writeValue(result);
        this.setZN(result);
        break;
      }
      case "DEX":
        this.x = (this.x - 1) & 0xff;
        this.setZN(this.x);
        break;
      case "DEY":
        this.y = (this.y - 1) & 0xff;
        this.setZN(this.y);
        break;
      case "EOR":
        this.a ^= readValue();
        this.setZN(this.a);
        break;
      case "INC": {
        const result = (readValue() + 1) & 0xff;
        writeValue(result);
        this.setZN(result);
        break;
      }
      case "INX":
        this.x = (this.x + 1) & 0xff;
        this.setZN(this.x);
        break;
      case "INY":
        this.y = (this.y + 1) & 0xff;
        this.setZN(this.y);
        break;
      case "JMP":
        this.pc = address;
        break;
      case "JSR":
        this.push16((this.pc - 1) & 0xffff);
        this.pc = address;
        break;
      case "LDA":
        this.a = readValue();
        this.setZN(this.a);
        break;
      case "LDX":
        this.x = readValue();
        this.setZN(this.x);
        break;
      case "LDY":
        this.y = readValue();
        this.setZN(this.y);
        break;
      case "LSR":
        if (meta.mode === "accumulator") {
          this.setFlag(CPU_FLAG_CARRY, (this.a & 0x01) !== 0);
          this.a = (this.a >> 1) & 0xff;
          this.setZN(this.a);
        } else {
          const value = readValue();
          this.setFlag(CPU_FLAG_CARRY, (value & 0x01) !== 0);
          const result = (value >> 1) & 0xff;
          writeValue(result);
          this.setZN(result);
        }
        break;
      case "NOP":
        break;
      case "ORA":
        this.a |= readValue();
        this.setZN(this.a);
        break;
      case "PHA":
        this.push(this.a);
        break;
      case "PHP":
        this.push(this.p | CPU_FLAG_BREAK | CPU_FLAG_UNUSED);
        break;
      case "PLA":
        this.a = this.pull();
        this.setZN(this.a);
        break;
      case "PLP":
        this.p = (this.pull() & ~CPU_FLAG_BREAK) | CPU_FLAG_UNUSED;
        break;
      case "ROL":
        if (meta.mode === "accumulator") {
          const carryIn = this.getFlag(CPU_FLAG_CARRY) ? 1 : 0;
          this.setFlag(CPU_FLAG_CARRY, (this.a & 0x80) !== 0);
          this.a = ((this.a << 1) | carryIn) & 0xff;
          this.setZN(this.a);
        } else {
          const value = readValue();
          const carryIn = this.getFlag(CPU_FLAG_CARRY) ? 1 : 0;
          this.setFlag(CPU_FLAG_CARRY, (value & 0x80) !== 0);
          const result = ((value << 1) | carryIn) & 0xff;
          writeValue(result);
          this.setZN(result);
        }
        break;
      case "ROR":
        if (meta.mode === "accumulator") {
          const carryIn = this.getFlag(CPU_FLAG_CARRY) ? 0x80 : 0;
          this.setFlag(CPU_FLAG_CARRY, (this.a & 0x01) !== 0);
          this.a = ((this.a >> 1) | carryIn) & 0xff;
          this.setZN(this.a);
        } else {
          const value = readValue();
          const carryIn = this.getFlag(CPU_FLAG_CARRY) ? 0x80 : 0;
          this.setFlag(CPU_FLAG_CARRY, (value & 0x01) !== 0);
          const result = ((value >> 1) | carryIn) & 0xff;
          writeValue(result);
          this.setZN(result);
        }
        break;
      case "RTI":
        this.p = (this.pull() & ~CPU_FLAG_BREAK) | CPU_FLAG_UNUSED;
        this.pc = this.pull16();
        break;
      case "RTS":
        this.pc = (this.pull16() + 1) & 0xffff;
        break;
      case "SBC":
        this.adc(readValue() ^ 0xff);
        break;
      case "SEC":
        this.setFlag(CPU_FLAG_CARRY, true);
        break;
      case "SED":
        this.setFlag(CPU_FLAG_DECIMAL, true);
        break;
      case "SEI":
        this.setFlag(CPU_FLAG_INTERRUPT, true);
        break;
      case "STA":
        writeValue(this.a);
        break;
      case "STX":
        writeValue(this.x);
        break;
      case "STY":
        writeValue(this.y);
        break;
      case "TAX":
        this.x = this.a;
        this.setZN(this.x);
        break;
      case "TAY":
        this.y = this.a;
        this.setZN(this.y);
        break;
      case "TSX":
        this.x = this.s;
        this.setZN(this.x);
        break;
      case "TXA":
        this.a = this.x;
        this.setZN(this.a);
        break;
      case "TXS":
        this.s = this.x;
        break;
      case "TYA":
        this.a = this.y;
        this.setZN(this.a);
        break;
      default:
        throw new Error(`Opcode handler missing for ${meta.name}`);
    }

    return meta.cycles + extraCycles + (meta.pageCycle && operand.pageCrossed ? 1 : 0);
  }
}

function defineOpcode(table, opcode, name, mode, cycles, pageCycle = false) {
  table[opcode] = { name, mode, cycles, pageCycle };
}

const OPCODES = new Array(256);
const OPCODE_GROUPS = {
  ADC: [
    [0x69, "immediate", 2],
    [0x65, "zeroPage", 3],
    [0x75, "zeroPageX", 4],
    [0x6d, "absolute", 4],
    [0x7d, "absoluteX", 4, true],
    [0x79, "absoluteY", 4, true],
    [0x61, "indexedIndirect", 6],
    [0x71, "indirectIndexed", 5, true],
  ],
  AND: [
    [0x29, "immediate", 2],
    [0x25, "zeroPage", 3],
    [0x35, "zeroPageX", 4],
    [0x2d, "absolute", 4],
    [0x3d, "absoluteX", 4, true],
    [0x39, "absoluteY", 4, true],
    [0x21, "indexedIndirect", 6],
    [0x31, "indirectIndexed", 5, true],
  ],
  ASL: [
    [0x0a, "accumulator", 2],
    [0x06, "zeroPage", 5],
    [0x16, "zeroPageX", 6],
    [0x0e, "absolute", 6],
    [0x1e, "absoluteX", 7],
  ],
  BCC: [[0x90, "relative", 2]],
  BCS: [[0xb0, "relative", 2]],
  BEQ: [[0xf0, "relative", 2]],
  BIT: [
    [0x24, "zeroPage", 3],
    [0x2c, "absolute", 4],
  ],
  BMI: [[0x30, "relative", 2]],
  BNE: [[0xd0, "relative", 2]],
  BPL: [[0x10, "relative", 2]],
  BRK: [[0x00, "implied", 7]],
  BVC: [[0x50, "relative", 2]],
  BVS: [[0x70, "relative", 2]],
  CLC: [[0x18, "implied", 2]],
  CLD: [[0xd8, "implied", 2]],
  CLI: [[0x58, "implied", 2]],
  CLV: [[0xb8, "implied", 2]],
  CMP: [
    [0xc9, "immediate", 2],
    [0xc5, "zeroPage", 3],
    [0xd5, "zeroPageX", 4],
    [0xcd, "absolute", 4],
    [0xdd, "absoluteX", 4, true],
    [0xd9, "absoluteY", 4, true],
    [0xc1, "indexedIndirect", 6],
    [0xd1, "indirectIndexed", 5, true],
  ],
  CPX: [
    [0xe0, "immediate", 2],
    [0xe4, "zeroPage", 3],
    [0xec, "absolute", 4],
  ],
  CPY: [
    [0xc0, "immediate", 2],
    [0xc4, "zeroPage", 3],
    [0xcc, "absolute", 4],
  ],
  DEC: [
    [0xc6, "zeroPage", 5],
    [0xd6, "zeroPageX", 6],
    [0xce, "absolute", 6],
    [0xde, "absoluteX", 7],
  ],
  DEX: [[0xca, "implied", 2]],
  DEY: [[0x88, "implied", 2]],
  EOR: [
    [0x49, "immediate", 2],
    [0x45, "zeroPage", 3],
    [0x55, "zeroPageX", 4],
    [0x4d, "absolute", 4],
    [0x5d, "absoluteX", 4, true],
    [0x59, "absoluteY", 4, true],
    [0x41, "indexedIndirect", 6],
    [0x51, "indirectIndexed", 5, true],
  ],
  INC: [
    [0xe6, "zeroPage", 5],
    [0xf6, "zeroPageX", 6],
    [0xee, "absolute", 6],
    [0xfe, "absoluteX", 7],
  ],
  INX: [[0xe8, "implied", 2]],
  INY: [[0xc8, "implied", 2]],
  JMP: [
    [0x4c, "absolute", 3],
    [0x6c, "indirect", 5],
  ],
  JSR: [[0x20, "absolute", 6]],
  LDA: [
    [0xa9, "immediate", 2],
    [0xa5, "zeroPage", 3],
    [0xb5, "zeroPageX", 4],
    [0xad, "absolute", 4],
    [0xbd, "absoluteX", 4, true],
    [0xb9, "absoluteY", 4, true],
    [0xa1, "indexedIndirect", 6],
    [0xb1, "indirectIndexed", 5, true],
  ],
  LDX: [
    [0xa2, "immediate", 2],
    [0xa6, "zeroPage", 3],
    [0xb6, "zeroPageY", 4],
    [0xae, "absolute", 4],
    [0xbe, "absoluteY", 4, true],
  ],
  LDY: [
    [0xa0, "immediate", 2],
    [0xa4, "zeroPage", 3],
    [0xb4, "zeroPageX", 4],
    [0xac, "absolute", 4],
    [0xbc, "absoluteX", 4, true],
  ],
  LSR: [
    [0x4a, "accumulator", 2],
    [0x46, "zeroPage", 5],
    [0x56, "zeroPageX", 6],
    [0x4e, "absolute", 6],
    [0x5e, "absoluteX", 7],
  ],
  NOP: [
    [0xea, "implied", 2],
    [0x1a, "implied", 2],
    [0x3a, "implied", 2],
    [0x5a, "implied", 2],
    [0x7a, "implied", 2],
    [0xda, "implied", 2],
    [0xfa, "implied", 2],
    [0x04, "zeroPage", 3],
    [0x44, "zeroPage", 3],
    [0x64, "zeroPage", 3],
    [0x14, "zeroPageX", 4],
    [0x34, "zeroPageX", 4],
    [0x54, "zeroPageX", 4],
    [0x74, "zeroPageX", 4],
    [0xd4, "zeroPageX", 4],
    [0xf4, "zeroPageX", 4],
    [0x0c, "absolute", 4],
    [0x1c, "absoluteX", 4, true],
    [0x3c, "absoluteX", 4, true],
    [0x5c, "absoluteX", 4, true],
    [0x7c, "absoluteX", 4, true],
    [0xdc, "absoluteX", 4, true],
    [0xfc, "absoluteX", 4, true],
  ],
  ORA: [
    [0x09, "immediate", 2],
    [0x05, "zeroPage", 3],
    [0x15, "zeroPageX", 4],
    [0x0d, "absolute", 4],
    [0x1d, "absoluteX", 4, true],
    [0x19, "absoluteY", 4, true],
    [0x01, "indexedIndirect", 6],
    [0x11, "indirectIndexed", 5, true],
  ],
  PHA: [[0x48, "implied", 3]],
  PHP: [[0x08, "implied", 3]],
  PLA: [[0x68, "implied", 4]],
  PLP: [[0x28, "implied", 4]],
  ROL: [
    [0x2a, "accumulator", 2],
    [0x26, "zeroPage", 5],
    [0x36, "zeroPageX", 6],
    [0x2e, "absolute", 6],
    [0x3e, "absoluteX", 7],
  ],
  ROR: [
    [0x6a, "accumulator", 2],
    [0x66, "zeroPage", 5],
    [0x76, "zeroPageX", 6],
    [0x6e, "absolute", 6],
    [0x7e, "absoluteX", 7],
  ],
  RTI: [[0x40, "implied", 6]],
  RTS: [[0x60, "implied", 6]],
  SBC: [
    [0xe9, "immediate", 2],
    [0xe5, "zeroPage", 3],
    [0xf5, "zeroPageX", 4],
    [0xed, "absolute", 4],
    [0xfd, "absoluteX", 4, true],
    [0xf9, "absoluteY", 4, true],
    [0xe1, "indexedIndirect", 6],
    [0xf1, "indirectIndexed", 5, true],
  ],
  SEC: [[0x38, "implied", 2]],
  SED: [[0xf8, "implied", 2]],
  SEI: [[0x78, "implied", 2]],
  STA: [
    [0x85, "zeroPage", 3],
    [0x95, "zeroPageX", 4],
    [0x8d, "absolute", 4],
    [0x9d, "absoluteX", 5],
    [0x99, "absoluteY", 5],
    [0x81, "indexedIndirect", 6],
    [0x91, "indirectIndexed", 6],
  ],
  STX: [
    [0x86, "zeroPage", 3],
    [0x96, "zeroPageY", 4],
    [0x8e, "absolute", 4],
  ],
  STY: [
    [0x84, "zeroPage", 3],
    [0x94, "zeroPageX", 4],
    [0x8c, "absolute", 4],
  ],
  TAX: [[0xaa, "implied", 2]],
  TAY: [[0xa8, "implied", 2]],
  TSX: [[0xba, "implied", 2]],
  TXA: [[0x8a, "implied", 2]],
  TXS: [[0x9a, "implied", 2]],
  TYA: [[0x98, "implied", 2]],
};

for (const [name, entries] of Object.entries(OPCODE_GROUPS)) {
  for (const [opcode, mode, cycles, pageCycle = false] of entries) {
    defineOpcode(OPCODES, opcode, name, mode, cycles, pageCycle);
  }
}

class HighPassFilter {
  constructor(sampleRate, cutoffHz) {
    const dt = 1 / sampleRate;
    const rc = 1 / (2 * Math.PI * cutoffHz);
    this.alpha = rc / (rc + dt);
    this.prevInput = 0;
    this.prevOutput = 0;
  }

  step(input) {
    const output = this.alpha * (this.prevOutput + input - this.prevInput);
    this.prevInput = input;
    this.prevOutput = output;
    return output;
  }
}

class LowPassFilter {
  constructor(sampleRate, cutoffHz) {
    const dt = 1 / sampleRate;
    const rc = 1 / (2 * Math.PI * cutoffHz);
    this.alpha = dt / (rc + dt);
    this.output = 0;
  }

  step(input) {
    this.output += this.alpha * (input - this.output);
    return this.output;
  }
}

class AudioDriver {
  constructor(onStatusChange = () => {}) {
    this.onStatusChange = onStatusChange;
    this.context = null;
    this.initializing = null;
    this.processor = null;
    this.workletNode = null;
    this.gain = null;
    this.buffer = new Float32Array(16384);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableSamples = 0;
  }

  getSampleRate() {
    return this.context?.sampleRate || 0;
  }

  clear() {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableSamples = 0;
    this.workletNode?.port.postMessage({ type: "reset" });
  }

  pushSample(sample) {
    if (!this.context) {
      return;
    }

    if (this.availableSamples >= this.buffer.length) {
      this.readIndex = (this.readIndex + 1) % this.buffer.length;
      this.availableSamples -= 1;
    }

    this.buffer[this.writeIndex] = Math.max(-1, Math.min(1, sample));
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    this.availableSamples += 1;

    if (this.workletNode && this.availableSamples >= AUDIO_WORKLET_CHUNK_SIZE) {
      this.flushPendingSamples();
    }
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
    if (!this.workletNode) {
      return;
    }

    const minimumSamples = force ? 1 : AUDIO_WORKLET_CHUNK_SIZE;
    while (this.availableSamples >= minimumSamples) {
      const length = force
        ? Math.min(this.availableSamples, AUDIO_WORKLET_CHUNK_SIZE)
        : AUDIO_WORKLET_CHUNK_SIZE;
      const samples = new Float32Array(length);
      this.drainSamples(samples);
      this.workletNode.port.postMessage(
        { type: "samples", samples },
        [samples.buffer]
      );
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
    if (!AudioContextCtor) {
      this.onStatusChange("Web Audio is unavailable in this browser.", "error", "Audio Unsupported");
      return false;
    }

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
        await this.context.audioWorklet.addModule(
          new URL("./audio-output-worklet.js", import.meta.url)
        );
        this.workletNode = new AudioWorkletNode(
          this.context,
          AUDIO_WORKLET_PROCESSOR_NAME,
          { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] }
        );
        this.workletNode.connect(this.gain);
        return true;
      } catch (error) {
        console.warn("AudioWorklet initialization failed, falling back to ScriptProcessorNode.", error);
      }
    }

    this.createLegacyProcessor();
    return true;
  }

  async enable() {
    try {
      if (!this.context) {
        this.initializing ??= this.createContext().finally(() => {
          this.initializing = null;
        });
      }

      if (this.initializing && !(await this.initializing)) {
        return false;
      }

      await this.context.resume();
      this.flushPendingSamples(true);
      this.onStatusChange("Audio live. Boot a ROM or keep playing to hear it.", "ready", "Audio On");
      return true;
    } catch (error) {
      this.onStatusChange(
        error instanceof Error ? error.message : String(error),
        "error",
        "Retry Audio"
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
    if (context && context.state !== "closed") {
      void context.close().catch(() => {});
    }
  }
}

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

class PulseChannel {
  constructor(onesComplementSweep) {
    this.onesComplementSweep = onesComplementSweep;
    this.envelope = new EnvelopeGenerator();
    this.reset();
  }

  reset() {
    this.enabled = false;
    this.duty = 0;
    this.sequenceIndex = 0;
    this.lengthCounter = 0;
    this.lengthHalt = false;
    this.timerPeriod = 0;
    this.timerValue = 0;
    this.sweepEnabled = false;
    this.sweepPeriod = 0;
    this.sweepNegate = false;
    this.sweepShift = 0;
    this.sweepDivider = 0;
    this.sweepReload = false;
    this.envelope.reset();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.lengthCounter = 0;
    }
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

  writeTimerLow(value) {
    this.timerPeriod = (this.timerPeriod & 0x0700) | value;
  }

  writeTimerHigh(value) {
    this.timerPeriod = (this.timerPeriod & 0x00ff) | ((value & 0x07) << 8);
    if (this.enabled) {
      this.lengthCounter = LENGTH_TABLE[(value >> 3) & 0x1f];
    }
    this.sequenceIndex = 0;
    this.envelope.restart();
  }

  getSweepTarget() {
    const delta = this.timerPeriod >> this.sweepShift;
    if (this.sweepNegate) {
      return this.timerPeriod - delta - (this.onesComplementSweep ? 1 : 0);
    }
    return this.timerPeriod + delta;
  }

  clockTimer() {
    if (this.timerValue === 0) {
      this.timerValue = this.timerPeriod;
      this.sequenceIndex = (this.sequenceIndex + 1) & 0x07;
    } else {
      this.timerValue -= 1;
    }
  }

  clockQuarterFrame() {
    this.envelope.clock();
  }

  clockHalfFrame() {
    if (this.lengthCounter > 0 && !this.lengthHalt) {
      this.lengthCounter -= 1;
    }

    const dividerZero = this.sweepDivider === 0;
    if (dividerZero && this.sweepEnabled && this.sweepShift > 0 && this.timerPeriod >= 8) {
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
    if (!this.enabled || this.lengthCounter === 0) {
      return 0;
    }

    if (this.timerPeriod < 8 || this.getSweepTarget() > 0x07ff) {
      return 0;
    }

    if (PULSE_DUTY_TABLE[this.duty][this.sequenceIndex] === 0) {
      return 0;
    }

    return this.envelope.getVolume();
  }
}

class TriangleChannel {
  constructor() {
    this.reset();
  }

  reset() {
    this.enabled = false;
    this.controlFlag = false;
    this.linearReloadValue = 0;
    this.linearCounter = 0;
    this.linearReloadFlag = false;
    this.lengthCounter = 0;
    this.timerPeriod = 0;
    this.timerValue = 0;
    this.sequenceIndex = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.lengthCounter = 0;
    }
  }

  writeControl(value) {
    this.controlFlag = (value & 0x80) !== 0;
    this.linearReloadValue = value & 0x7f;
  }

  writeTimerLow(value) {
    this.timerPeriod = (this.timerPeriod & 0x0700) | value;
  }

  writeTimerHigh(value) {
    this.timerPeriod = (this.timerPeriod & 0x00ff) | ((value & 0x07) << 8);
    if (this.enabled) {
      this.lengthCounter = LENGTH_TABLE[(value >> 3) & 0x1f];
    }
    this.linearReloadFlag = true;
  }

  clockTimer() {
    if (this.timerValue === 0) {
      this.timerValue = this.timerPeriod;
      if (this.lengthCounter > 0 && this.linearCounter > 0) {
        this.sequenceIndex = (this.sequenceIndex + 1) & 0x1f;
      }
    } else {
      this.timerValue -= 1;
    }
  }

  clockQuarterFrame() {
    if (this.linearReloadFlag) {
      this.linearCounter = this.linearReloadValue;
    } else if (this.linearCounter > 0) {
      this.linearCounter -= 1;
    }

    if (!this.controlFlag) {
      this.linearReloadFlag = false;
    }
  }

  clockHalfFrame() {
    if (this.lengthCounter > 0 && !this.controlFlag) {
      this.lengthCounter -= 1;
    }
  }

  output() {
    if (!this.enabled) {
      return 0;
    }

    if (this.timerPeriod < 2) {
      return 7.5;
    }

    return TRIANGLE_SEQUENCE[this.sequenceIndex];
  }
}

class NoiseChannel {
  constructor() {
    this.envelope = new EnvelopeGenerator();
    this.reset();
  }

  reset() {
    this.enabled = false;
    this.lengthCounter = 0;
    this.lengthHalt = false;
    this.mode = false;
    this.timerPeriod = NOISE_PERIOD_TABLE[0];
    this.timerValue = 0;
    this.shiftRegister = 1;
    this.envelope.reset();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.lengthCounter = 0;
    }
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
    if (this.enabled) {
      this.lengthCounter = LENGTH_TABLE[(value >> 3) & 0x1f];
    }
    this.envelope.restart();
  }

  clockTimer() {
    if (this.timerValue === 0) {
      this.timerValue = this.timerPeriod;
      const tapBit = this.mode ? 6 : 1;
      const feedback = (this.shiftRegister & 0x01) ^ ((this.shiftRegister >> tapBit) & 0x01);
      this.shiftRegister = (this.shiftRegister >> 1) | (feedback << 14);
    } else {
      this.timerValue -= 1;
    }
  }

  clockQuarterFrame() {
    this.envelope.clock();
  }

  clockHalfFrame() {
    if (this.lengthCounter > 0 && !this.lengthHalt) {
      this.lengthCounter -= 1;
    }
  }

  output() {
    if (!this.enabled || this.lengthCounter === 0 || (this.shiftRegister & 0x01) !== 0) {
      return 0;
    }

    return this.envelope.getVolume();
  }
}

class APU {
  constructor(audioDriver) {
    this.audioDriver = audioDriver;
    this.pulse1 = new PulseChannel(true);
    this.pulse2 = new PulseChannel(false);
    this.triangle = new TriangleChannel();
    this.noise = new NoiseChannel();
    this.reset();
  }

  reset() {
    this.pulse1.reset();
    this.pulse2.reset();
    this.triangle.reset();
    this.noise.reset();
    this.frameMode = 0;
    this.frameInterruptInhibit = false;
    this.frameInterruptFlag = false;
    this.pendingFrameCounterWrite = null;
    this.cpuCycles = 0;
    this.sampleClock = 0;
    this.sampleRate = 0;
    this.dmcOutput = 0;
    this.dmcEnabled = false;
    this.highPass90 = null;
    this.highPass440 = null;
    this.lowPass14k = null;
  }

  hasIRQ() {
    return this.frameInterruptFlag;
  }

  configureFilters(sampleRate) {
    if (sampleRate <= 0 || sampleRate === this.sampleRate) {
      return;
    }

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
    this.pulse1.setEnabled((value & 0x01) !== 0);
    this.pulse2.setEnabled((value & 0x02) !== 0);
    this.triangle.setEnabled((value & 0x04) !== 0);
    this.noise.setEnabled((value & 0x08) !== 0);
    this.dmcEnabled = (value & 0x10) !== 0;
  }

  writeFrameCounter(value) {
    if (value & 0x40) {
      this.frameInterruptFlag = false;
    }

    this.pendingFrameCounterWrite = {
      value,
      delay: (this.cpuCycles & 0x01) === 0 ? 4 : 3,
    };
  }

  applyFrameCounterWrite(value) {
    this.frameMode = (value >> 7) & 0x01;
    this.frameInterruptInhibit = (value & 0x40) !== 0;
    if (this.frameInterruptInhibit) {
      this.frameInterruptFlag = false;
    }
    this.cpuCycles = 0;
    if (this.frameMode === 1) {
      this.clockQuarterFrame();
      this.clockHalfFrame();
    }
  }

  writeRegister(address, value) {
    switch (address) {
      case 0x4000:
        this.pulse1.writeControl(value);
        break;
      case 0x4001:
        this.pulse1.writeSweep(value);
        break;
      case 0x4002:
        this.pulse1.writeTimerLow(value);
        break;
      case 0x4003:
        this.pulse1.writeTimerHigh(value);
        break;
      case 0x4004:
        this.pulse2.writeControl(value);
        break;
      case 0x4005:
        this.pulse2.writeSweep(value);
        break;
      case 0x4006:
        this.pulse2.writeTimerLow(value);
        break;
      case 0x4007:
        this.pulse2.writeTimerHigh(value);
        break;
      case 0x4008:
        this.triangle.writeControl(value);
        break;
      case 0x400a:
        this.triangle.writeTimerLow(value);
        break;
      case 0x400b:
        this.triangle.writeTimerHigh(value);
        break;
      case 0x400c:
        this.noise.writeControl(value);
        break;
      case 0x400e:
        this.noise.writePeriod(value);
        break;
      case 0x400f:
        this.noise.writeLength(value);
        break;
      case 0x4010:
      case 0x4012:
      case 0x4013:
        break;
      case 0x4011:
        this.dmcOutput = value & 0x7f;
        break;
      case 0x4015:
        this.writeStatus(value);
        break;
      case 0x4017:
        this.writeFrameCounter(value);
        break;
      default:
        break;
    }
  }

  clockQuarterFrame() {
    this.pulse1.clockQuarterFrame();
    this.pulse2.clockQuarterFrame();
    this.triangle.clockQuarterFrame();
    this.noise.clockQuarterFrame();
  }

  clockHalfFrame() {
    this.pulse1.clockHalfFrame();
    this.pulse2.clockHalfFrame();
    this.triangle.clockHalfFrame();
    this.noise.clockHalfFrame();
  }

  clockFrameCounter() {
    if (this.frameMode === 0) {
      if (this.cpuCycles === 3729 || this.cpuCycles === 11186) {
        this.clockQuarterFrame();
      } else if (this.cpuCycles === 7457) {
        this.clockQuarterFrame();
        this.clockHalfFrame();
      } else if (this.cpuCycles === 14915) {
        this.clockQuarterFrame();
        this.clockHalfFrame();
        if (!this.frameInterruptInhibit) {
          this.frameInterruptFlag = true;
        }
        this.cpuCycles = 0;
      }
      return;
    }

    if (this.cpuCycles === 3729 || this.cpuCycles === 11186) {
      this.clockQuarterFrame();
    } else if (this.cpuCycles === 7457 || this.cpuCycles === 18641) {
      this.clockQuarterFrame();
      this.clockHalfFrame();
      if (this.cpuCycles === 18641) {
        this.cpuCycles = 0;
      }
    }
  }

  mixSample() {
    const pulse1 = this.pulse1.output();
    const pulse2 = this.pulse2.output();
    const triangle = this.triangle.output();
    const noise = this.noise.output();
    const dmc = this.dmcOutput;

    const pulseSum = pulse1 + pulse2;
    const pulseOut = pulseSum === 0 ? 0 : 95.88 / ((8128 / pulseSum) + 100);
    const tndDenominator = (triangle / 8227) + (noise / 12241) + (dmc / 22638);
    const tndOut = tndDenominator === 0 ? 0 : 159.79 / ((1 / tndDenominator) + 100);

    let sample = pulseOut + tndOut;
    if (this.highPass90 && this.highPass440 && this.lowPass14k) {
      sample = this.highPass90.step(sample);
      sample = this.highPass440.step(sample);
      sample = this.lowPass14k.step(sample);
    }

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

    if ((this.cpuCycles & 0x01) === 0) {
      this.pulse1.clockTimer();
      this.pulse2.clockTimer();
      this.noise.clockTimer();
    }

    this.clockFrameCounter();

    const sampleRate = this.audioDriver.getSampleRate();
    if (sampleRate > 0) {
      this.configureFilters(sampleRate);
      this.sampleClock += sampleRate;
      if (this.sampleClock >= NTSC_CPU_CLOCK) {
        this.sampleClock -= NTSC_CPU_CLOCK;
        this.audioDriver.pushSample(this.mixSample());
      }
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

    if (address < 0x2000) {
      return this.cpuRam[address & 0x07ff];
    }

    if (address < 0x4000) {
      return this.ppu.readRegister(0x2000 | (address & 0x0007));
    }

    if (address === 0x4016) {
      return this.controller1.read();
    }

    if (address === 0x4015) {
      return this.apu.readStatus();
    }

    if (address === 0x4017) {
      return this.controller2.read();
    }

    if (address >= 0x6000 && address < 0x8000) {
      return this.cartridge.readPrgRam(address);
    }

    if (address >= 0x8000) {
      return this.cartridge.readPrg(address);
    }

    return 0;
  }

  write(addr, value) {
    const address = addr & 0xffff;

    if (address < 0x2000) {
      this.cpuRam[address & 0x07ff] = value;
      return 0;
    }

    if (address < 0x4000) {
      this.ppu.writeRegister(0x2000 | (address & 0x0007), value);
      return 0;
    }

    if (address === 0x4014) {
      const page = value << 8;
      const buffer = new Uint8Array(256);
      for (let i = 0; i < 256; i += 1) {
        buffer[i] = this.read(page + i);
      }
      this.ppu.writeOamDma(buffer);
      return 513;
    }

    if (address === 0x4016) {
      this.controller1.write(value);
      this.controller2.write(value);
      return 0;
    }

    if ((address >= 0x4000 && address <= 0x4013) || address === 0x4015 || address === 0x4017) {
      this.apu.writeRegister(address, value);
      return 0;
    }

    if (address >= 0x6000 && address < 0x8000) {
      this.cartridge.writePrgRam(address, value);
      return 0;
    }

    if (address >= 0x8000) {
      this.cartridge.writePrg(address, value);
      return 0;
    }

    return 0;
  }
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
    for (const button of ["a", "b", "select", "start", "up", "down", "left", "right"]) {
      this.bus.controller1.setButton(button, false);
    }
  }

  runFrame() {
    this.bus.ppu.frameReady = false;

    while (!this.bus.ppu.frameReady) {
      const cpuCycles = this.cpu.step();

      for (let i = 0; i < cpuCycles; i += 1) {
        this.bus.apu.stepCpuCycle();
      }

      for (let i = 0; i < cpuCycles * 3; i += 1) {
        this.bus.ppu.step();
      }
    }
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
  if (!canvas) {
    throw new Error("A canvas element is required to initialize the emulator.");
  }

  const context = canvas.getContext("2d");
  const audioDriver = new AudioDriver(onAudioStatus);
  let activeNES = null;
  let frameHandle = 0;
  let isPaused = false;
  let loopGeneration = 0;

  function stepCpuInstruction(nes) {
    const cpuCycles = nes.cpu.step();

    for (let i = 0; i < cpuCycles; i += 1) {
      nes.bus.apu.stepCpuCycle();
    }

    for (let i = 0; i < cpuCycles * 3; i += 1) {
      nes.bus.ppu.step();
    }
  }

  function getDebugByte(nes, address) {
    const normalizedAddress = address & 0xffff;

    if (normalizedAddress < 0x2000) {
      return nes.bus.cpuRam[normalizedAddress & 0x07ff];
    }

    if (normalizedAddress >= 0x6000 && normalizedAddress < 0x8000) {
      return nes.bus.cartridge.readPrgRam(normalizedAddress);
    }

    if (normalizedAddress >= 0x8000) {
      return nes.bus.cartridge.readPrg(normalizedAddress);
    }

    return null;
  }

  function getDebugSnapshot({
    length = 0x80,
    startAddress = 0x0000,
  } = {}) {
    if (!activeNES) {
      return null;
    }

    const safeLength = Math.min(0x100, Math.max(0x10, length | 0));
    const baseAddress = startAddress & 0xffff;
    const memory = new Array(safeLength);

    for (let index = 0; index < safeLength; index += 1) {
      memory[index] = getDebugByte(activeNES, baseAddress + index);
    }

    return {
      memory: {
        bytes: memory,
        length: safeLength,
        startAddress: baseAddress,
      },
      paused: isPaused,
      cpu: {
        a: activeNES.cpu.a,
        flags: [
          { label: "N", enabled: activeNES.cpu.getFlag(CPU_FLAG_NEGATIVE) },
          { label: "V", enabled: activeNES.cpu.getFlag(CPU_FLAG_OVERFLOW) },
          { label: "U", enabled: activeNES.cpu.getFlag(CPU_FLAG_UNUSED) },
          { label: "B", enabled: activeNES.cpu.getFlag(CPU_FLAG_BREAK) },
          { label: "D", enabled: activeNES.cpu.getFlag(CPU_FLAG_DECIMAL) },
          { label: "I", enabled: activeNES.cpu.getFlag(CPU_FLAG_INTERRUPT) },
          { label: "Z", enabled: activeNES.cpu.getFlag(CPU_FLAG_ZERO) },
          { label: "C", enabled: activeNES.cpu.getFlag(CPU_FLAG_CARRY) },
        ],
        p: activeNES.cpu.p,
        pc: activeNES.cpu.pc,
        s: activeNES.cpu.s,
        stallCycles: activeNES.cpu.stallCycles,
        x: activeNES.cpu.x,
        y: activeNES.cpu.y,
      },
      ppu: {
        cycle: activeNES.bus.ppu.cycle,
        frameReady: activeNES.bus.ppu.frameReady,
        scanline: activeNES.bus.ppu.scanline,
        status: activeNES.bus.ppu.status,
      },
    };
  }

  function drawPlaceholder() {
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function stopActiveLoop() {
    loopGeneration += 1;
    if (frameHandle) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    }
    if (activeNES) {
      activeNES.releaseAllButtons();
    }
    isPaused = false;
    activeNES = null;
    audioDriver.clear();
  }

  function bootNES(nes) {
    stopActiveLoop();
    activeNES = nes;
    isPaused = false;
    activeNES.present();

    let previousFrameTime = performance.now();
    let lag = 0;
    const frameDuration = 1000 / 60;
    const generation = loopGeneration;

    const frame = (now) => {
      if (generation !== loopGeneration || activeNES !== nes) {
        return;
      }

      try {
        if (isPaused) {
          previousFrameTime = now;
          lag = 0;
          nes.present();
          frameHandle = requestAnimationFrame(frame);
          return;
        }

        lag += Math.min(100, now - previousFrameTime);
        previousFrameTime = now;

        while (lag >= frameDuration) {
          nes.runFrame();
          lag -= frameDuration;
        }

        nes.present();
        frameHandle = requestAnimationFrame(frame);
      } catch (error) {
        console.error(error);
        stopActiveLoop();
        drawPlaceholder();
        onRuntimeError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    frameHandle = requestAnimationFrame(frame);
  }

  async function enableAudio() {
    return audioDriver.enable();
  }

  function loadRomBytes(bytes) {
    try {
      const cartridge = Cartridge.fromINES(bytes);
      const nes = new NES(cartridge, canvas, audioDriver);
      bootNES(nes);
      canvas.focus({ preventScroll: true });
    } catch (error) {
      console.error(error);
      stopActiveLoop();
      drawPlaceholder();
      throw error;
    }
  }

  function setButton(button, pressed) {
    if (!activeNES) {
      return false;
    }

    void enableAudio();
    activeNES.setButton(button, pressed);
    return true;
  }

  function setButtonByCode(code, pressed) {
    const button = getButtonForKeyboardCode(code);
    if (!button) {
      return false;
    }

    return setButton(button, pressed);
  }

  function releaseAllButtons() {
    activeNES?.releaseAllButtons();
  }

  function pause() {
    if (!activeNES) {
      return false;
    }

    isPaused = true;
    activeNES.releaseAllButtons();
    return true;
  }

  function resume() {
    if (!activeNES) {
      return false;
    }

    isPaused = false;
    return true;
  }

  function stepInstruction() {
    if (!activeNES) {
      return null;
    }

    isPaused = true;

    try {
      stepCpuInstruction(activeNES);
      activeNES.present();
      return getDebugSnapshot();
    } catch (error) {
      console.error(error);
      stopActiveLoop();
      drawPlaceholder();
      onRuntimeError(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
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
    isPaused: () => isPaused,
    loadRomBytes,
    pause,
    releaseAllButtons,
    resume,
    setButton,
    setButtonByCode,
    stepInstruction,
    stop: stopActiveLoop,
  };
}
