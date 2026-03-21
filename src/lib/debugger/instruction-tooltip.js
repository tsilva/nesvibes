function formatHex(value, width = 2) {
  if (value === null || value === undefined) {
    return "?".repeat(width);
  }

  return value.toString(16).toUpperCase().padStart(width, "0");
}

const INSTRUCTION_SUMMARIES = {
  ADC: "Add the operand and the carry flag to the accumulator.",
  AND: "Bitwise AND the operand with the accumulator.",
  ASL: "Shift bits left by one position. The old high bit moves into carry.",
  BCC: "Branch when the carry flag is clear.",
  BCS: "Branch when the carry flag is set.",
  BEQ: "Branch when the zero flag is set.",
  BIT: "Test bits in memory against the accumulator without changing either value.",
  BMI: "Branch when the negative flag is set.",
  BNE: "Branch when the zero flag is clear.",
  BPL: "Branch when the negative flag is clear.",
  BRK: "Trigger a software interrupt.",
  BVC: "Branch when the overflow flag is clear.",
  BVS: "Branch when the overflow flag is set.",
  CLC: "Clear the carry flag.",
  CLD: "Clear decimal mode.",
  CLI: "Allow maskable interrupts again.",
  CLV: "Clear the overflow flag.",
  CMP: "Compare the accumulator with the operand.",
  CPX: "Compare the X register with the operand.",
  CPY: "Compare the Y register with the operand.",
  DEC: "Decrement the value in memory by one.",
  DEX: "Decrement the X register by one.",
  DEY: "Decrement the Y register by one.",
  EOR: "Bitwise exclusive-OR the operand with the accumulator.",
  INC: "Increment the value in memory by one.",
  INX: "Increment the X register by one.",
  INY: "Increment the Y register by one.",
  JMP: "Jump directly to another address.",
  JSR: "Call a subroutine at another address.",
  LDA: "Load the accumulator from the operand.",
  LDX: "Load the X register from the operand.",
  LDY: "Load the Y register from the operand.",
  LSR: "Shift bits right by one position. The old low bit moves into carry.",
  NOP: "Do nothing except consume time and read any operand bytes.",
  ORA: "Bitwise OR the operand into the accumulator.",
  PHA: "Push the accumulator onto the stack.",
  PHP: "Push the processor status register onto the stack.",
  PLA: "Pull a byte from the stack into the accumulator.",
  PLP: "Pull a byte from the stack into the processor status register.",
  ROL: "Rotate bits left through the carry flag.",
  ROR: "Rotate bits right through the carry flag.",
  RTI: "Return from an interrupt handler.",
  RTS: "Return from a subroutine.",
  SBC: "Subtract the operand and borrow from the accumulator.",
  SEC: "Set the carry flag.",
  SED: "Set decimal mode.",
  SEI: "Disable maskable interrupts.",
  STA: "Store the accumulator into memory.",
  STX: "Store the X register into memory.",
  STY: "Store the Y register into memory.",
  TAX: "Copy the accumulator into the X register.",
  TAY: "Copy the accumulator into the Y register.",
  TSX: "Copy the stack pointer into the X register.",
  TXA: "Copy the X register into the accumulator.",
  TXS: "Copy the X register into the stack pointer.",
  TYA: "Copy the Y register into the accumulator.",
};

function describeResolvedValue(value, { beforeWrite = false } = {}) {
  if (value === null || value === undefined) {
    return "";
  }

  return beforeWrite
    ? ` It currently holds $${formatHex(value, 2)} before the write.`
    : ` The byte there is $${formatHex(value, 2)}.`;
}

function describeAddressResolution(entry, intro, { beforeWrite = false } = {}) {
  if (entry.effectiveAddress === null || entry.effectiveAddress === undefined) {
    return intro;
  }

  return `${intro} It resolves to $${formatHex(entry.effectiveAddress, 4)}.${describeResolvedValue(entry.resolvedValue, { beforeWrite })}`;
}

function describeOperand(entry) {
  switch (entry.mode) {
    case "immediate":
      return `It uses the literal value ${entry.operandText}.`;
    case "zeroPage":
      return `The operand points at zero-page address ${entry.operandText}.${describeResolvedValue(entry.resolvedValue, {
        beforeWrite: entry.mnemonic === "STA" || entry.mnemonic === "STX" || entry.mnemonic === "STY",
      })}`;
    case "zeroPageX":
      return describeAddressResolution(
        entry,
        `The operand uses zero-page address ${entry.operandText} with the current X register.`,
        { beforeWrite: entry.mnemonic === "STA" || entry.mnemonic === "STY" }
      );
    case "zeroPageY":
      return describeAddressResolution(
        entry,
        `The operand uses zero-page address ${entry.operandText} with the current Y register.`,
        { beforeWrite: entry.mnemonic === "STX" }
      );
    case "absolute":
      if (entry.mnemonic === "JMP" || entry.mnemonic === "JSR") {
        return `Execution will move to $${formatHex(entry.branchTarget, 4)}.`;
      }

      return `The operand points at address ${entry.operandText}.${describeResolvedValue(entry.resolvedValue, {
        beforeWrite: entry.mnemonic === "STA" || entry.mnemonic === "STX" || entry.mnemonic === "STY",
      })}`;
    case "absoluteX":
      return describeAddressResolution(
        entry,
        `The operand uses address ${entry.operandText} with the current X register.`,
        { beforeWrite: entry.mnemonic === "STA" || entry.mnemonic === "STY" }
      );
    case "absoluteY":
      return describeAddressResolution(
        entry,
        `The operand uses address ${entry.operandText} with the current Y register.`,
        { beforeWrite: entry.mnemonic === "STA" || entry.mnemonic === "STX" }
      );
    case "indirect":
      return `The instruction reads a 16-bit destination through pointer ${entry.operandText}, which currently resolves to $${formatHex(entry.branchTarget, 4)}.`;
    case "indexedIndirect":
      return describeAddressResolution(
        entry,
        `The zero-page pointer in ${entry.operandText} is offset by X before being dereferenced.`
      );
    case "indirectIndexed":
      return describeAddressResolution(
        entry,
        `The zero-page pointer in ${entry.operandText} is dereferenced first, then offset by Y.`
      );
    case "relative":
      return `If the branch condition passes, execution jumps to $${formatHex(entry.branchTarget, 4)}. Otherwise it continues with the next instruction.`;
    case "accumulator":
      return `It operates directly on the accumulator, which is currently $${formatHex(entry.resolvedValue, 2)}.`;
    case "implied":
    default:
      return "";
  }
}

function describeTiming(entry) {
  if (!entry?.baseCycles) {
    return "";
  }

  return entry.pageCrossCyclePossible
    ? `Base timing is ${entry.baseCycles} cycles, plus 1 more if indexing crosses a page boundary.`
    : `Base timing is ${entry.baseCycles} cycles.`;
}

export function formatInstructionTooltip(entry) {
  if (!entry) {
    return "";
  }

  if (entry.mnemonic === ".db") {
    return `Unsupported or unknown opcode byte $${formatHex(entry.opcode, 2)}. The debugger is showing it as raw data.`;
  }

  const summary = INSTRUCTION_SUMMARIES[entry.mnemonic] ?? `${entry.mnemonic} is a 6502 instruction.`;
  return [summary, describeOperand(entry), describeTiming(entry)].filter(Boolean).join(" ");
}
