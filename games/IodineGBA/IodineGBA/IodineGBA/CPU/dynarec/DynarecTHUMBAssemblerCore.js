"use strict";
/*
 * This file is part of IodineGBA
 *
 * Copyright (C) 2012-2013 Grant Galitz
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * version 2 as published by the Free Software Foundation.
 * The full license is available at http://www.gnu.org/licenses/gpl.html
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 */
function DynarecTHUMBAssemblerCore(pc, records) {
    pc = pc >>> 0;
    this.currentPC = pc >>> 0;
    this.startAddress = this.toHex(this.currentPC);
    this.branched = false;
    this.records = records;
    this.compileInstructionMap();
    this.generateSpew();
}
DynarecTHUMBAssemblerCore.prototype.generateSpew = function () {
    var batched = "\t//Stub Code For Address " + this.startAddress + ":\n";
    batched += this.generatePipelineSpew1();
    this.incrementInternalPC();
    batched += this.generatePipelineSpew2();
    this.incrementInternalPC();
    var length = this.records.length - 2;
    for (var index = 0; index < length && !this.branched; index++) {
        batched += this.generateBodySpew(index >>> 0, this.records[index >>> 0] >>> 0);
        this.incrementInternalPC();
    }
    this.stubCode = batched;
}
DynarecTHUMBAssemblerCore.prototype.toHex = function (toConvert) {
    return "0x" + toConvert.toString(16);
}
DynarecTHUMBAssemblerCore.prototype.getStubCode = function () {
    return this.stubCode;
}
DynarecTHUMBAssemblerCore.prototype.incrementInternalPC = function () {
    this.currentPC = this.nextInstructionPC() >>> 0;
}
DynarecTHUMBAssemblerCore.prototype.nextInstructionPC = function () {
    return ((this.currentPC >>> 0) + 2) >>> 0;
}
DynarecTHUMBAssemblerCore.prototype.currentInstructionPC = function () {
    return this.toHex(this.currentPC >>> 0);
}
DynarecTHUMBAssemblerCore.prototype.isInROM = function (relativePC) {
    //Get the address of the instruction:
    relativePC = relativePC >>> 0;
    //Check for instruction address being in ROM:
    if ((relativePC >>> 0) > 0x80000FF) {
        if ((relativePC >>> 0) < 0xD000000) {
            if ((relativePC & 0x1FFFFFF) < 0x1FE0000) {
                return true;
            }
        }
    }
    else if ((relativePC >>> 0) < 0x4000) {
        return true;
    }
    return false;
}
DynarecTHUMBAssemblerCore.prototype.generatePipelineSpew1 = function () {
    return this.insertRunnableCheck() +
    this.insertFetchPrefix() +
    "\t//Waiting for the pipeline bubble to clear... two stages left\n" +
    "\t//Push fetch to decode:\n" +
    "\tthis.thumb.decode = this.thumb.fetch | 0;\n" +
    this.incrementPC();
}
DynarecTHUMBAssemblerCore.prototype.generatePipelineSpew2 = function () {
    return this.insertRunnableCheck() +
    this.insertFetchPrefix() +
    "\t//Waiting for the pipeline bubble to clear... one stage left\n" +
    this.insertPipelineStartSuffix() +
    this.incrementPC();
}
DynarecTHUMBAssemblerCore.prototype.generateBodySpew = function (index, instruction) {
    instruction = instruction | 0;
    return this.insertRunnableCheck() +
    this.insertMemoryInstabilityCheck(instruction) +
    ((index == 0) ? this.insertFetchPrefix() : this.insertFetching()) +
    this.generateInstructionSpew(instruction | 0) +
    this.insertPipelineSuffix(index | 0) +
    this.checkPCStatus();
}
DynarecTHUMBAssemblerCore.prototype.generateInstructionSpew = function (instruction) {
    instruction = instruction | 0;
    var instructionID = this.instructionMap[instruction >> 6];
    if (typeof this[instructionID] == "function") {
        //Patch in our own inlined code:
        return this[instructionID](instruction | 0);
    }
    else {
        //Call out to the interpreter's stub:
        return "\tthis.thumb." + this.instructionMap[instruction >> 6] + "(this.thumb);\n";
    }
}
DynarecTHUMBAssemblerCore.prototype.insertMemoryInstabilityCheck = function (instruction) {
    if (!!this.isInROM(((this.currentPC >>> 0) - 4) >>> 0)) {
        return "\t//Address of instruction located in ROM, skipping guard check!\n";
    }
    else {
        return "\t//Verify the cached instruction should be called:\n" +
        "\tif ((this.thumb.execute | 0) != " + this.toHex(instruction) + ") {\n" +
            "\t\tthis.bailout();\n" +
            "\t\treturn;\n" +
        "\t}\n";
    }
}
DynarecTHUMBAssemblerCore.prototype.insertRunnableCheck = function () {
    return "\t//Ensure we do not run when an IRQ is flagged or not in cpu mode:\n" +
    "\tif (!!this.CPUCore.breakNormalExecution) {\n" +
        "\t\tthis.tickBad();\n" +
        "\t\treturn;\n" +
    "\t}\n";
}
DynarecTHUMBAssemblerCore.prototype.insertFetchPrefix = function () {
    return this.insertPipelineTick() +
    this.insertFetching();
}
DynarecTHUMBAssemblerCore.prototype.insertPipelineTick = function () {
    return "\t//Tick the CPU pipeline:\n" +
    "\tthis.CPUCore.pipelineInvalid >>= 1;\n";
}
DynarecTHUMBAssemblerCore.prototype.insertFetching = function () {
    return "\t//Update the fetch stage:\n" +
    "\tthis.thumb.fetch = this.CPUCore.wait.CPUGetOpcode16(" + this.currentInstructionPC() + ") | 0;\n";
}
DynarecTHUMBAssemblerCore.prototype.insertPipelineStartSuffix = function () {
    return "\t//Push decode to execute and fetch to decode:\n" +
    "\tthis.thumb.execute = this.thumb.decode | 0;\n" +
    "\tthis.thumb.decode = this.thumb.fetch | 0;\n";
}
DynarecTHUMBAssemblerCore.prototype.insertPipelineSuffix = function (index) {
    return "\t//Push decode to execute and fetch to decode:\n" +
    "\tthis.thumb.execute = " + ((this.isInROM(((this.currentPC >>> 0) - 2) >>> 0)) ? this.toHex(this.records[index + 1]) : "this.thumb.decode | 0") + ";\n" +
    "\tthis.thumb.decode = " + ((this.isInROM(this.currentPC >>> 0)) ? this.toHex(this.records[index + 2]) : "this.thumb.fetch | 0") + ";\n";
}
DynarecTHUMBAssemblerCore.prototype.checkPCStatus = function () {
    return "\tif ((this.CPUCore.pipelineInvalid | 0) == 0) {\n" +
        "\t" + this.incrementPC() +
    "\t}\n" +
    "\telse {\n" +
        "\t\t//We branched, so exit normally:\n" +
        "\t\treturn;\n" +
    "\t}\n";
}
DynarecTHUMBAssemblerCore.prototype.incrementPC = function () {
    return "\tthis.registers[15] = " + this.toHex(this.nextInstructionPC()) + ";\n";
}
DynarecTHUMBAssemblerCore.prototype.guardHighRegisterWrite = function (register, data) {
    register = (register & 0x7) | 0x8;
    var spew = "";
    if ((register | 0) == 0xF) {
        spew += "\t//We performed a branch:\n" +
        "\tthis.branchTHUMB((" + data + ") & -2);\n";
        //Mark as branch point:
        this.branched = true;
    }
    else {
        spew += "\t//Regular Data Write:\n" +
        "\tthis.registers[" + this.toHex(register | 0) + "] = " + data + ";\n";
    }
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.conditionalInline = function (instructionVariable, instructionSnippet, altSnippet) {
    //Factor out some zero math:
    if (instructionVariable > 0) {
        return instructionSnippet;
    }
    else {
        return altSnippet;
    }
}
DynarecTHUMBAssemblerCore.prototype.compileInstructionMap = function () {
    this.instructionMap = [];
    //0-7
    this.generateLowMap("LSLimm");
    //8-F
    this.generateLowMap("LSRimm");
    //10-17
    this.generateLowMap("ASRimm");
    //18-19
    this.generateLowMap2("ADDreg");
    //1A-1B
    this.generateLowMap2("SUBreg");
    //1C-1D
    this.generateLowMap2("ADDimm3");
    //1E-1F
    this.generateLowMap2("SUBimm3");
    //20-27
    this.generateLowMap("MOVimm8");
    //28-2F
    this.generateLowMap("CMPimm8");
    //30-37
    this.generateLowMap("ADDimm8");
    //38-3F
    this.generateLowMap("SUBimm8");
    //40
    this.generateLowMap4("AND", "EOR", "LSL", "LSR");
    //41
    this.generateLowMap4("ASR", "ADC", "SBC", "ROR");
    //42
    this.generateLowMap4("TST", "NEG", "CMP", "CMN");
    //43
    this.generateLowMap4("ORR", "MUL", "BIC", "MVN");
    //44
    this.generateLowMap4("ADDH_LL", "ADDH_LH", "ADDH_HL", "ADDH_HH");
    //45
    this.generateLowMap4("CMPH_LL", "CMPH_LH", "CMPH_HL", "CMPH_HH");
    //46
    this.generateLowMap4("MOVH_LL", "MOVH_LH", "MOVH_HL", "MOVH_HH");
    //47
    this.generateLowMap4("BX_L", "BX_H", "BX_L", "BX_H");
    //48-4F
    this.generateLowMap("LDRPC");
    //50-51
    this.generateLowMap2("STRreg");
    //52-53
    this.generateLowMap2("STRHreg");
    //54-55
    this.generateLowMap2("STRBreg");
    //56-57
    this.generateLowMap2("LDRSBreg");
    //58-59
    this.generateLowMap2("LDRreg");
    //5A-5B
    this.generateLowMap2("LDRHreg");
    //5C-5D
    this.generateLowMap2("LDRBreg");
    //5E-5F
    this.generateLowMap2("LDRSHreg");
    //60-67
    this.generateLowMap("STRimm5");
    //68-6F
    this.generateLowMap("LDRimm5");
    //70-77
    this.generateLowMap("STRBimm5");
    //78-7F
    this.generateLowMap("LDRBimm5");
    //80-87
    this.generateLowMap("STRHimm5");
    //88-8F
    this.generateLowMap("LDRHimm5");
    //90-97
    this.generateLowMap("STRSP");
    //98-9F
    this.generateLowMap("LDRSP");
    //A0-A7
    this.generateLowMap("ADDPC");
    //A8-AF
    this.generateLowMap("ADDSP");
    //B0
    this.generateLowMap3("ADDSPimm7");
    //B1
    this.generateLowMap3("UNDEFINED");
    //B2
    this.generateLowMap3("UNDEFINED");
    //B3
    this.generateLowMap3("UNDEFINED");
    //B4
    this.generateLowMap3("PUSH");
    //B5
    this.generateLowMap3("PUSHlr");
    //B6
    this.generateLowMap3("UNDEFINED");
    //B7
    this.generateLowMap3("UNDEFINED");
    //B8
    this.generateLowMap3("UNDEFINED");
    //B9
    this.generateLowMap3("UNDEFINED");
    //BA
    this.generateLowMap3("UNDEFINED");
    //BB
    this.generateLowMap3("UNDEFINED");
    //BC
    this.generateLowMap3("POP");
    //BD
    this.generateLowMap3("POPpc");
    //BE
    this.generateLowMap3("UNDEFINED");
    //BF
    this.generateLowMap3("UNDEFINED");
    //C0-C7
    this.generateLowMap("STMIA");
    //C8-CF
    this.generateLowMap("LDMIA");
    //D0
    this.generateLowMap3("BEQ");
    //D1
    this.generateLowMap3("BNE");
    //D2
    this.generateLowMap3("BCS");
    //D3
    this.generateLowMap3("BCC");
    //D4
    this.generateLowMap3("BMI");
    //D5
    this.generateLowMap3("BPL");
    //D6
    this.generateLowMap3("BVS");
    //D7
    this.generateLowMap3("BVC");
    //D8
    this.generateLowMap3("BHI");
    //D9
    this.generateLowMap3("BLS");
    //DA
    this.generateLowMap3("BGE");
    //DB
    this.generateLowMap3("BLT");
    //DC
    this.generateLowMap3("BGT");
    //DD
    this.generateLowMap3("BLE");
    //DE
    this.generateLowMap3("UNDEFINED");
    //DF
    this.generateLowMap3("SWI");
    //E0-E7
    this.generateLowMap("B");
    //E8-EF
    this.generateLowMap("UNDEFINED");
    //F0-F7
    this.generateLowMap("BLsetup");
    //F8-FF
    this.generateLowMap("BLoff");
    //Force length to be ready only:
    try {
        Object.defineProperty(this.instructionMap, "length", {writable: false});
    }
    catch (error) {
        //Some browsers throw here....
    }
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap = function (instruction) {
    for (var index = 0; index < 0x20; ++index) {
        this.instructionMap.push(instruction);
    }
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap2 = function (instruction) {
    for (var index = 0; index < 0x8; ++index) {
        this.instructionMap.push(instruction);
    }
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap3 = function (instruction) {
    for (var index = 0; index < 0x4; ++index) {
        this.instructionMap.push(instruction);
    }
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap4 = function (instruction1, instruction2, instruction3, instruction4) {
    this.instructionMap.push(instruction1);
    this.instructionMap.push(instruction2);
    this.instructionMap.push(instruction3);
    this.instructionMap.push(instruction4);
}
DynarecTHUMBAssemblerCore.prototype.LSLimm = function (instructionValue) {
    var spew = "\t//LSL imm:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n";
    var offset = (instructionValue >> 6) & 0x1F;
    if (offset > 0) {
        spew += "\t//CPSR Carry is set by the last bit shifted out:\n" +
        "\tthis.CPSR.carry = (" + this.conditionalInline(offset - 1, "(source << " + this.toHex(offset - 1) + ")", "source") + " < 0);\n" +
        "\t//Perform shift:\n" + 
        "\tsource <<= " + this.toHex(offset) + ";\n";
    }
    spew += "\t//Perform CPSR updates for N and Z (But not V):\n" +
    "\tthis.CPSR.negative = (source < 0);\n" +
    "\tthis.CPSR.zero = (source == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = source | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LSRimm = function (instructionValue) {
    var spew = "\t//LSR imm:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n";
    var offset = (instructionValue >> 6) & 0x1F;
    if (offset > 0) {
        spew += "\t//CPSR Carry is set by the last bit shifted out:\n" +
        "\tthis.CPSR.carry = ((" + this.conditionalInline(offset - 1, "(source >> " + this.toHex(offset - 1) + ")", "source") + " & 0x1) != 0);\n" +
        "\t//Perform shift:\n" +
        "\tsource = (source >>> " + this.toHex(offset) + ") | 0;\n" +
        "//Perform CPSR updates for N and Z (But not V):\n" +
        "\tthis.CPSR.negative = (source < 0);\n" +
        "\tthis.CPSR.zero = (source == 0);\n" +
        "\t//Update destination register:\n" +
        "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = source | 0;\n";
    }
    else {
        spew += "\tthis.CPSR.carry = (source < 0);\n" +
        "\t//Perform CPSR updates for N and Z (But not V):\n" +
        "\tthis.CPSR.negative = false;\n" +
        "\tthis.CPSR.zero = true;\n" +
        "\t//Update destination register:\n" +
        "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = 0;\n";
    }
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ASRimm = function (instructionValue) {
    var spew = "\t//ASR imm:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n";
    var offset = (instructionValue >> 6) & 0x1F;
    if (offset > 0) {
        spew += "\t//CPSR Carry is set by the last bit shifted out:\n" +
        "\tthis.CPSR.carry = ((" + this.conditionalInline(offset - 1, "(source >> " + this.toHex(offset - 1) + ")", "source") + " & 0x1) != 0);\n" +
        "\t//Perform shift:\n" +
        "\tsource >>= " + this.toHex(offset) + ";\n";
    }
    else {
        spew += "\tthis.CPSR.carry = (source < 0);\n" +
        "\tsource >>= 0x1F;\n";
    }
    spew += "\t//Perform CPSR updates for N and Z (But not V):\n" +
    "\tthis.CPSR.negative = (source < 0);\n" +
    "\tthis.CPSR.zero = (source == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = source | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDreg = function (instructionValue) {
    var spew = "\t//ADD reg:\n" +
    "\tvar operand1 = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar operand2 = this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0;\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.setADDFlags(operand1 | 0, operand2 | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.SUBreg = function (instructionValue) {
    var spew = "\t//SUB reg:\n" +
    "\tvar operand1 = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar operand2 = this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0;\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.setSUBFlags(operand1 | 0, operand2 | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDimm3 = function (instructionValue) {
    var spew = "\t//ADDimm3:\n" +
    "\tvar operand1 = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.setADDFlags(operand1 | 0, " + this.toHex((instructionValue >> 6) & 0x7) + ") | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.SUBimm3 = function (instructionValue) {
    var spew = "\t//SUBimm3:\n" +
    "\tvar operand1 = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.setSUBFlags(operand1 | 0, " + this.toHex((instructionValue >> 6) & 0x7) + ") | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.MOVimm8 = function (instructionValue) {
    var spew = "\t//MOVimm8:\n" +
    "\t//Get the 8-bit value to move into the register:\n" +
    "\tthis.CPSR.negative = false;\n" +
    "\tthis.CPSR.zero = " + ((instructionValue & 0xFF) ? "false" : "true") + ";\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] = " + this.toHex(instructionValue & 0xFF) + ";\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.CMPimm8 = function (instructionValue) {
    var spew = "\t//CMPimm8:\n" +
    "\t//Compare an 8-bit immediate value with a register:\n" +
    "\tvar operand1 = this.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] | 0;\n" +
    "\tthis.CPUCore.setCMPFlags(operand1 | 0, " + this.toHex(instructionValue & 0xFF) + ");\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDimm8 = function (instructionValue) {
    var spew = "\t//ADDimm8:\n" +
    "\t//Add an 8-bit immediate value with a register:\n" +
    "\tvar operand1 = this.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] | 0;\n" +
    "\tthis.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] = this.CPUCore.setADDFlags(operand1 | 0, " + this.toHex(instructionValue & 0xFF) + ") | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.SUBimm8 = function (instructionValue) {
    var spew = "\t//SUBimm8:\n" +
    "\t//Subtract an 8-bit immediate value with a register:\n" +
    "\tvar operand1 = this.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] | 0;\n" +
    "\tthis.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] = this.CPUCore.setSUBFlags(operand1 | 0, " + this.toHex(instructionValue & 0xFF) + ") | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.AND = function (instructionValue) {
    var spew = "\t//AND:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\t//Perform bitwise AND:\n" +
    "\tvar result = source & destination;\n" +
    "\tthis.CPSR.negative = (result < 0);\n" +
    "\tthis.CPSR.zero = (result == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = result | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.EOR = function (instructionValue) {
    var spew = "\t//EOR:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\t//Perform bitwise EOR:\n" +
    "\tvar result = source ^ destination;\n" +
    "\tthis.CPSR.negative = (result < 0);\n" +
    "\tthis.CPSR.zero = (result == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = result | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LSL = function (instructionValue) {
    var spew = "\t//LSL:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] & 0xFF;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\tif (source > 0) {\n" +
        "\t\tif (source < 0x20) {\n" +
            "\t\t\t//Shift the register data left:\n" +
            "\t\t\tthis.CPSR.carry = ((destination << ((source - 1) | 0)) < 0);\n" +
            "\t\t\tdestination <<= source;\n" +
        "\t\t}\n" +
        "\t\telse if (source == 0x20) {\n" +
            "\t\t\t//Shift bit 0 into carry:\n" +
            "\t\t\tthis.CPSR.carry = ((destination & 0x1) == 0x1);\n" +
            "\t\t\tdestination = 0;\n" +
        "\t\t}\n" +
        "\t\telse {\n" +
            "\t\t\t//Everything Zero'd:\n" +
            "\t\t\tthis.CPSR.carry = false;\n" +
            "\t\t\tdestination = 0;\n" +
        "\t\t}\n" +
    "\t}\n" +
    "\t//Perform CPSR updates for N and Z (But not V):\n" +
    "\tthis.CPSR.negative = (destination < 0);\n" +
    "\tthis.CPSR.zero = (destination == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = destination | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LSR = function (instructionValue) {
    var spew = "\t//LSR:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] & 0xFF;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\tif (source > 0) {\n" +
        "\t\tif (source < 0x20) {\n" +
            "\t\t\t//Shift the register data right logically:\n" +
            "\t\t\tthis.CPSR.carry = (((destination >> ((source - 1) | 0)) & 0x1) == 0x1);\n" +
            "\t\t\tdestination = (destination >>> source) | 0;\n" +
        "\t\t}\n" +
        "\t\telse if (source == 0x20) {\n" +
            "\t\t\t//Shift bit 31 into carry:\n" +
            "\t\t\tthis.CPSR.carry = (destination < 0);\n" +
            "\t\t\tdestination = 0;\n" +
        "\t\t}\n" +
        "\t\telse {\n" +
            "\t\t\t//Everything Zero'd:\n" +
            "\t\t\tthis.CPSR.carry = false;\n" +
            "\t\t\tdestination = 0;\n" +
        "\t\t}\n" +
    "\t}\n" +
    "\t//Perform CPSR updates for N and Z (But not V):\n" +
    "\tthis.CPSR.negative = (destination < 0);\n" +
    "\tthis.CPSR.zero = (destination == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = destination | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ASR = function (instructionValue) {
    var spew = "\t//ASR:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] & 0xFF;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\tif (source > 0) {\n" +
        "\t\tif (source < 0x20) {\n" +
            "\t\t\t//Shift the register data right arithmetically:\n" +
            "\t\t\tthis.CPSR.carry = (((destination >> ((source - 1) | 0)) & 0x1) == 0x1);\n" +
            "\t\t\tdestination >>= source;\n" +
        "\t\t}\n" +
        "\t\telse {\n" +
            "\t\t\t//Set all bits with bit 31:\n" +
            "\t\t\tthis.CPSR.carry = (destination < 0);\n" +
            "\t\t\tdestination >>= 0x1F;\n" +
        "\t\t}\n" +
    "\t}\n" +
    "\t//Perform CPSR updates for N and Z (But not V):\n" +
    "\tthis.CPSR.negative = (destination < 0);\n" +
    "\tthis.CPSR.zero = (destination == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = destination | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADC = function (instructionValue) {
    var spew = "\t//ADC:\n" +
    "\tvar operand1 = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\tvar operand2 = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.setADCFlags(operand1 | 0, operand2 | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.SBC = function (instructionValue) {
    var spew = "\t//SBC:\n" +
    "\tvar operand1 = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\tvar operand2 = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.setSBCFlags(operand1 | 0, operand2 | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ROR = function (instructionValue) {
    var spew = "\t//ROR:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] & 0xFF;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\tif (source > 0) {\n" +
        "\t\tsource &= 0x1F;\n" +
        "\t\tif (source > 0) {\n" +
            "\t\t\t//CPSR Carry is set by the last bit shifted out:\n" +
            "\t\t\tthis.CPSR.carry = (((destination >>> ((source - 1) | 0)) & 0x1) != 0);\n" +
            "\t\t\t//Perform rotate:\n" +
            "\t\t\tdestination = (destination << ((0x20 - source) | 0)) | (destination >>> (source | 0));\n" +
        "\t\t}\n" +
        "\t\telse {\n" +
            "\t\t\tthis.CPSR.carry = (destination < 0);\n" +
        "\t\t}\n" +
    "\t}\n" +
    "\t//Perform CPSR updates for N and Z (But not V):\n" +
    "\tthis.CPSR.negative = (destination < 0);\n" +
    "\tthis.CPSR.zero = (destination == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = destination | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.TST = function (instructionValue) {
    var spew = "\t//TST:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\t//Perform bitwise AND:\n" +
    "\tvar result = source & destination;\n" +
    "\tthis.CPSR.negative = (result < 0);\n" +
    "\tthis.CPSR.zero = (result == 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.NEG = function (instructionValue) {
    var spew = "\t//NEG:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tthis.CPSR.overflow = ((source ^ (-(source | 0))) == 0);\n" +
    "\t//Perform Subtraction:\n" +
    "\tsource = (-(source | 0)) | 0;\n" +
    "\tthis.CPSR.negative = (source < 0);\n" +
    "\tthis.CPSR.zero = (source == 0);\n" +
    "\t//Update destination register:\n" +
     "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = source | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.CMP = function (instructionValue) {
    var spew = "\t//CMP:\n" +
    "\t//Compare two registers:\n" +
    "\tthis.CPUCore.setCMPFlags(this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0, this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.CMN = function (instructionValue) {
    var spew = "\t//CMN:\n" +
    "\t//Compare two registers:\n" +
    "\tthis.CPUCore.setCMNFlags(this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0, this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ORR = function (instructionValue) {
    var spew = "\t//ORR:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\t//Perform bitwise OR:\n" +
    "\tvar result = source | destination;\n" +
    "\tthis.CPSR.negative = (result < 0);\n" +
    "\tthis.CPSR.zero = (result == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = result | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.MUL = function (instructionValue) {
    var spew = "\t//MUL:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\t//Perform MUL32:\n" +
    "\tvar result = this.CPUCore.performMUL32(source | 0, destination | 0, 0) | 0;\n" +
    "\tthis.CPSR.carry = false;\n" +
    "\tthis.CPSR.negative = (result < 0);\n" +
    "\tthis.CPSR.zero = (result == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = result | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.BIC = function (instructionValue) {
    var spew = "\t//BIC:\n" +
    "\tvar source = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tvar destination = this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0;\n" +
    "\t//Perform bitwise AND with a bitwise NOT on source:\n" +
    "\tvar result = (~source) & destination;\n" +
    "\tthis.CPSR.negative = (result < 0);\n" +
    "\tthis.CPSR.zero = (result == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = result | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.MVN = function (instructionValue) {
    var spew = "\t//MVN:\n" +
    "\t//Perform bitwise NOT on source:\n" +
    "\tvar source = ~this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "];\n" +
    "\tthis.CPSR.negative = (source < 0);\n" +
    "\tthis.CPSR.zero = (source == 0);\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = source | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDH_LL = function (instructionValue) {
    var spew = "\t//ADDH_LL:\n" +
    "\t//Perform Addition:\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = ((this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDH_LH = function (instructionValue) {
    var spew = "\t//ADDH_LH:\n" +
    "\t//Perform Addition:\n" +
    "\t//Update destination register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = ((this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0) + (this.registers[" + this.toHex(0x8 | ((instructionValue >> 3) & 0x7)) + "] | 0)) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDH_HL = function (instructionValue) {
    var spew = "\t//ADDH_HL:\n" +
    "\t//Perform Addition:\n" +
    "\t//Update destination register:\n" +
    this.guardHighRegisterWrite(instructionValue & 0x7, "((this.registers[" + this.toHex(0x8 | (instructionValue & 0x7)) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0");
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDH_HH = function (instructionValue) {
    var spew = "\t//ADDH_HH:\n" +
    "\t//Perform Addition:\n" +
    "\t//Update destination register:\n" +
    this.guardHighRegisterWrite(instructionValue & 0x7, "((this.registers[" + this.toHex(0x8 | (instructionValue & 0x7)) + "] | 0) + (this.registers[" + this.toHex(0x8 | ((instructionValue >> 3) & 0x7)) + "] | 0)) | 0");
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.CMPH_LL = function (instructionValue) {
    var spew = "\t//CMPH_LL:\n" +
    "\t//Compare two registers:\n" +
    "\tthis.CPUCore.setCMPFlags(this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0, this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.CMPH_LH = function (instructionValue) {
    var spew = "\t//CMPH_LH:\n" +
    "\t//Compare two registers:\n" +
    "\tthis.CPUCore.setCMPFlags(this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0, this.registers[" + this.toHex(0x8 | ((instructionValue >> 3) & 0x7)) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.CMPH_HL = function (instructionValue) {
    var spew = "\t//CMPH_HL:\n" +
    "\t//Compare two registers:\n" +
    "\tthis.CPUCore.setCMPFlags(this.registers[" + this.toHex(0x8 | (instructionValue & 0x7)) + "] | 0, this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.CMPH_HH = function (instructionValue) {
    var spew = "\t//CMPH_HH:\n" +
    "\t//Compare two registers:\n" +
    "\tthis.CPUCore.setCMPFlags(this.registers[" + this.toHex(0x8 | (instructionValue & 0x7)) + "] | 0, this.registers[" + this.toHex(0x8 | ((instructionValue >> 3) & 0x7)) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.MOVH_LL = function (instructionValue) {
    var spew = "\t//MOVH_LL:\n" +
    "\t//Move a register to another register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.MOVH_LH = function (instructionValue) {
    var spew = "\t//MOVH_LH:\n" +
    "\t//Move a register to another register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.registers[" + this.toHex(0x8 | ((instructionValue >> 3) & 0x7)) + "] | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.MOVH_HL = function (instructionValue) {
    var spew = "\t//MOVH_HL:\n" +
    "\t//Move a register to another register:\n" +
    this.guardHighRegisterWrite(instructionValue & 0x7, "this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0");
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.MOVH_HH = function (instructionValue) {
    var spew = "\t//MOVH_HH:\n" +
    "\t//Move a register to another register:\n" +
    this.guardHighRegisterWrite(instructionValue & 0x7, "this.registers[" + this.toHex(0x8 | ((instructionValue >> 3) & 0x7)) + "] | 0");
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.BX_L = function (instructionValue) {
    var spew = "\t//BX_L:\n" +
    "\t//Branch & eXchange:\n" +
    "\tvar address = this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0;\n" +
    "\tif ((address & 0x1) == 0) {\n" +
        "\t\t//Enter ARM mode:\n" +
        "\t\tthis.CPUCore.enterARM();\n" +
        "\t\tthis.branchARM(address & -0x4);\n" +
    "\t}\n" +
    "\telse {\n" +
        "\t\t//Stay in THUMB mode:\n" +
        "\t\tthis.branchTHUMB(address & -0x2);\n" +
    "\t}\n";
    //Mark as branch point:
    this.branched = true;
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.BX_H = function (instructionValue) {
    var spew = "\t//BX_H:\n" +
    "\t//Branch & eXchange:\n" +
    "\tvar address = this.registers[" + this.toHex(0x8 | ((instructionValue >> 3) & 0x7)) + "] | 0;\n" +
    "\tif ((address & 0x1) == 0) {\n" +
        "\t\t//Enter ARM mode:\n" +
        "\t\tthis.CPUCore.enterARM();\n" +
        "\t\tthis.branchARM(address & -0x4);\n" +
    "\t}\n" +
    "\telse {\n" +
        "\t\t//Stay in THUMB mode:\n" +
        "\t\tthis.branchTHUMB(address & -0x2);\n" +
    "\t}\n";
    //Mark as branch point:
    this.branched = true;
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRPC = function (instructionValue) {
    var spew = "\t//LDRPC:\n" +
    "\t//PC-Relative Load:\n" +
    "\tthis.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] = this.CPUCore.read32(" + this.toHex((this.currentInstructionPC() & -3) + ((instructionValue & 0xFF) << 2)) + ") | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.STRreg = function (instructionValue) {
    var spew = "\t//STRreg:\n" +
    "\t//Store Word From Register:\n" +
    "\tthis.CPUCore.write32(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0, this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.STRHreg = function (instructionValue) {
    var spew = "\t//STRHreg:\n" +
    "\t//Store Half-Word From Register:\n" +
    "\tthis.CPUCore.write16(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0, this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.STRBreg = function (instructionValue) {
    var spew = "\t//STRBreg:\n" +
    "\t//Store Byte From Register:\n" +
    "\tthis.CPUCore.write8(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0, this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRSBreg = function (instructionValue) {
    var spew = "\t//LDRSBreg:\n" +
    "\t//Load Signed Byte Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = (this.CPUCore.read8(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) << 24) >> 24;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRreg = function (instructionValue) {
    var spew = "\t//LDRreg:\n" +
    "\t//Load Word Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.read32(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRHreg = function (instructionValue) {
    var spew = "\t//LDRHreg:\n" +
    "\t//Load Half-Word Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.read16(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRBreg = function (instructionValue) {
    var spew = "\t//LDRBreg:\n" +
    "\t//Load Byte Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.read8(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRSHreg = function (instructionValue) {
    var spew = "\t//LDRSHreg:\n" +
    "\t//Load Signed Half-Word Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = (this.CPUCore.read16(((this.registers[" + this.toHex((instructionValue >> 6) & 0x7) + "] | 0) + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) << 16) >> 16;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.STRimm5 = function (instructionValue) {
    var spew = "\t//STRimm5:\n" +
    "\t//Store Word From Register:\n" +
    "\tthis.CPUCore.write32((" + this.toHex(((instructionValue >> 6) & 0x1F) << 2) + " + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0, this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRimm5 = function (instructionValue) {
    var spew = "\t//LDRimm5:\n" +
    "\t//Load Word Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.read32((" + this.toHex(((instructionValue >> 6) & 0x1F) << 2) + " + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.STRBimm5 = function (instructionValue) {
    var spew = "\t//STRBimm5:\n" +
    "\t//Store Byte From Register:\n" +
    "\tthis.CPUCore.write8((" + this.toHex((instructionValue >> 6) & 0x1F) + " + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0, this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRBimm5 = function (instructionValue) {
    var spew = "\t//LDRBimm5:\n" +
    "\t//Load Byte Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.read8((" + this.toHex((instructionValue >> 6) & 0x1F) + " + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.STRHimm5 = function (instructionValue) {
    var spew = "\t//STRHimm5:\n" +
    "\t//Store Half-Word From Register:\n" +
    "\tthis.CPUCore.write16((" + this.toHex(((instructionValue >> 6) & 0x1F) << 1) + " + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0, this.registers[" + this.toHex(instructionValue & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRHimm5 = function (instructionValue) {
    var spew = "\t//LDRHimm5:\n" +
    "\t//Load Half-Word Into Register:\n" +
    "\tthis.registers[" + this.toHex(instructionValue & 0x7) + "] = this.CPUCore.read16((" + this.toHex(((instructionValue >> 6) & 0x1F) << 1) + " + (this.registers[" + this.toHex((instructionValue >> 3) & 0x7) + "] | 0)) | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.STRSP = function (instructionValue) {
    var spew = "\t//STRSP:\n" +
    "\t//Store Word From Register:\n" +
    "\tthis.CPUCore.write32((" + this.toHex((instructionValue & 0xFF) << 2) + " + (this.registers[0xD] | 0)) | 0, this.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] | 0);\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.LDRSP = function (instructionValue) {
    var spew = "\t//LDRSP:\n" +
    "\t//Load Word From Register:\n" +
    "\tthis.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] = this.CPUCore.read32((" + this.toHex((instructionValue & 0xFF) << 2) + " + (this.registers[0xD] | 0)) | 0) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDPC = function (instructionValue) {
    var spew = "\t//ADDPC:\n" +
    "\t//Add PC With Offset Into Register:\n" +
    "\tthis.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] = (" + this.toHex((instructionValue & 0xFF) << 2) + " + (this.registers[0xF] & -3)) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDSP = function (instructionValue) {
    var spew = "\t//ADDSP:\n" +
    "\t//Add SP With Offset Into Register:\n" +
    "\tthis.registers[" + this.toHex((instructionValue >> 8) & 0x7) + "] = (" + this.toHex((instructionValue & 0xFF) << 2) + " + (this.registers[0xD] | 0)) | 0;\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.ADDSPimm7 = function (instructionValue) {
    var spew = "\t//ADDSPimm7:\n" +
    "\t//Add Signed Offset Into SP:\n";
    if ((instructionValue & 0x80) != 0) {
        spew += "\tthis.registers[0xD] = ((this.registers[0xD] | 0) - " + this.toHex((instructionValue & 0x7F) << 2) + ") | 0;\n";
    }
    else {
        spew += "\tthis.registers[0xD] = ((this.registers[0xD] | 0) + " + this.toHex((instructionValue & 0x7F) << 2) + ") | 0;\n";
    }
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.PUSH = function (instructionValue) {
    var spew = "\t//PUSH:\n";
    //Only initialize the PUSH sequence if the register list is non-empty:
    if ((instructionValue & 0xFF) > 0) {
        spew += "\t//Updating the address bus away from PC fetch:\n" +
        "\tthis.wait.NonSequentialBroadcast();\n" +
        "\t//Push register(s) onto the stack:\n";
        for (var rListPosition = 7; (rListPosition | 0) > -1; rListPosition = ((rListPosition | 0) - 1) | 0) {
            if ((instructionValue & (1 << rListPosition)) != 0) {
                spew += "\t//Push register " + this.toHex(rListPosition & 0x7) + " onto the stack:\n" +
                "\tthis.registers[0xD] = ((this.registers[0xD] | 0) - 4) | 0;\n" +
                "\tthis.stackMemoryCache.memoryWrite32(this.registers[0xD] >>> 0, this.registers[" + this.toHex(rListPosition & 0x7) + "] | 0);\n";
            }
        }
        spew += "\t//Updating the address bus back to PC fetch:\n" +
        "\tthis.wait.NonSequentialBroadcast();\n";
    }
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.PUSHlr = function (instructionValue) {
    var spew = "\t//PUSHlr:\n";
    spew += "\t//Updating the address bus away from PC fetch:\n" +
    "\tthis.wait.NonSequentialBroadcast();\n" +
    "\t//Push link register onto the stack:\n" +
    "\tthis.registers[0xD] = ((this.registers[0xD] | 0) - 4) | 0;\n" +
    "\tthis.stackMemoryCache.memoryWrite32(this.registers[0xD] >>> 0, this.registers[0xE] | 0);\n" +
    "\t//Push register(s) onto the stack:\n";
    for (var rListPosition = 7; (rListPosition | 0) > -1; rListPosition = ((rListPosition | 0) - 1) | 0) {
        if ((instructionValue & (1 << rListPosition)) != 0) {
            spew += "\t//Push register " + this.toHex(rListPosition & 0x7) + " onto the stack:\n" +
            "\tthis.registers[0xD] = ((this.registers[0xD] | 0) - 4) | 0;\n" +
            "\tthis.stackMemoryCache.memoryWrite32(this.registers[0xD] >>> 0, this.registers[" + this.toHex(rListPosition & 0x7) + "] | 0);\n";
        }
    }
    spew += "\t//Updating the address bus back to PC fetch:\n" +
    "\tthis.wait.NonSequentialBroadcast();\n";
    return spew;
}
DynarecTHUMBAssemblerCore.prototype.B = function (instructionValue) {
    var spew = "\t//B:\n" +
    "\t//Unconditional Branch:\n" +
    "\t//Update the program counter to branch address:\n" +
    "\tthis.branchTHUMB(" + this.toHex(((this.currentInstructionPC() | 0) + ((instructionValue << 21) >> 20)) | 0) + ");\n";
    //Mark as branch point:
    this.branched = true;
    return spew;
}