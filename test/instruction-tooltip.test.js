import test from "node:test";
import assert from "node:assert/strict";

import { formatInstructionTooltip } from "../src/lib/debugger/instruction-tooltip.js";

test("formats a human-readable tooltip for indexed loads", () => {
  const tooltip = formatInstructionTooltip({
    baseCycles: 4,
    effectiveAddress: 0x0015,
    mnemonic: "LDA",
    mode: "zeroPageX",
    operandText: "$10,X",
    pageCrossCyclePossible: false,
    resolvedValue: 0x42,
  });

  assert.match(tooltip, /Load the accumulator from the operand\./);
  assert.match(tooltip, /zero-page address \$10,X with the current X register/i);
  assert.match(tooltip, /resolves to \$0015/i);
  assert.match(tooltip, /byte there is \$42/i);
  assert.match(tooltip, /Base timing is 4 cycles\./);
});

test("formats a human-readable tooltip for branches", () => {
  const tooltip = formatInstructionTooltip({
    baseCycles: 2,
    branchTarget: 0xc004,
    mnemonic: "BNE",
    mode: "relative",
    operandText: "$C004",
    pageCrossCyclePossible: false,
  });

  assert.match(tooltip, /Branch when the zero flag is clear\./);
  assert.match(tooltip, /jumps to \$C004/i);
  assert.match(tooltip, /Base timing is 2 cycles\./);
});

test("formats a human-readable tooltip for indirect jumps", () => {
  const tooltip = formatInstructionTooltip({
    baseCycles: 5,
    branchTarget: 0x1234,
    mnemonic: "JMP",
    mode: "indirect",
    operandText: "($C2FF)",
    pageCrossCyclePossible: false,
  });

  assert.match(tooltip, /Jump directly to another address\./);
  assert.match(tooltip, /pointer \(\$C2FF\), which currently resolves to \$1234/i);
});

test("formats a fallback tooltip for unsupported opcodes", () => {
  const tooltip = formatInstructionTooltip({
    mnemonic: ".db",
    opcode: 0x02,
  });

  assert.equal(
    tooltip,
    "Unsupported or unknown opcode byte $02. The debugger is showing it as raw data."
  );
});
