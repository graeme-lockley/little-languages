export enum InstructionOpCode {
  PUSH_TRUE,
  PUSH_FALSE,
  PUSH_INT,
  PUSH_VAR,
  PUSH_CLOSURE,
  STORE,
  ADD,
  SUB,
  MUL,
  DIV,
  EQ,
  LT,
  GT,
  LE,
  GE,
  JMP,
  JMP_TRUE,
  JMP_FALSE,
  CALL,
  ENTER,
  RET,
  STORE_VAR,
}

export enum OpParameter {
  OPInt,
  OPLabel,
}

export type Instruction = {
  name: string;
  opcode: InstructionOpCode;
  args: Array<OpParameter>;
};

const instructions: Array<Instruction> = [
  { name: "ADD", opcode: InstructionOpCode.ADD, args: [] },

  { name: "EQ", opcode: InstructionOpCode.EQ, args: [] },

  { name: "CALL", opcode: InstructionOpCode.CALL, args: [] },
  { name: "ENTER", opcode: InstructionOpCode.ENTER, args: [OpParameter.OPInt] },
  {
    name: "PUSH_INT",
    opcode: InstructionOpCode.PUSH_INT,
    args: [OpParameter.OPInt],
  },
  {
    name: "PUSH_CLOSURE",
    opcode: InstructionOpCode.PUSH_CLOSURE,
    args: [OpParameter.OPLabel],
  },
  {
    name: "JMP_TRUE",
    opcode: InstructionOpCode.JMP_TRUE,
    args: [OpParameter.OPLabel],
  },
  {
    name: "PUSH_VAR",
    opcode: InstructionOpCode.PUSH_VAR,
    args: [OpParameter.OPInt, OpParameter.OPInt],
  },
  { name: "RET", opcode: InstructionOpCode.RET, args: [] },
  {
    name: "STORE_VAR",
    opcode: InstructionOpCode.STORE_VAR,
    args: [OpParameter.OPInt],
  },
];

export const find = (opCode: InstructionOpCode): Instruction | undefined =>
  instructions.find((i) => i.opcode === opCode);

export const findOnName = (name: string): Instruction | undefined =>
  instructions.find((i) => i.name === name);
