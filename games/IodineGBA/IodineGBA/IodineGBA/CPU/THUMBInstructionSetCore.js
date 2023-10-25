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
function THUMBInstructionSet(CPUCore) {
    this.CPUCore = CPUCore;
    this.initialize();
}
THUMBInstructionSet.prototype.initialize = function () {
    this.wait = this.CPUCore.wait;
    this.registers = this.CPUCore.registers;
    this.CPSR = this.CPUCore.CPSR;
    this.fetch = 0;
    this.decode = 0;
    this.execute = 0;
    this.stackMemoryCache = new GameBoyAdvanceMemoryCache(this.CPUCore.memory);
    this.compileInstructionMap();
}
THUMBInstructionSet.prototype.executeIteration = function () {
    //Push the new fetch access:
    this.fetch = this.wait.CPUGetOpcode16(this.readPC() | 0) | 0;
    //Execute Instruction:
    this.executeTHUMB();
    //Update the pipelining state:
    this.execute = this.decode | 0;
    this.decode = this.fetch | 0;
}
THUMBInstructionSet.prototype.executeTHUMB = function () {
    if ((this.CPUCore.pipelineInvalid | 0) == 0) {
        //No condition code:
        this.instructionMap[this.execute >> 6](this);
    }
}
THUMBInstructionSet.prototype.incrementProgramCounter = function () {
    //Increment The Program Counter:
    this.registers[15] = ((this.registers[15] | 0) + 2) | 0;
}
THUMBInstructionSet.prototype.readLowRegister = function (address) {
    //Low register read:
    address = address | 0;
    return this.registers[address & 0x7] | 0;
}
THUMBInstructionSet.prototype.readHighRegister = function (address) {
    //High register read:
    address = address | 0x8;
    return this.registers[address & 0xF] | 0;
}
THUMBInstructionSet.prototype.writeLowRegister = function (address, data) {
    //Low register write:
    address = address | 0;
    data = data | 0;
    this.registers[address & 0x7] = data | 0;
}
THUMBInstructionSet.prototype.guardHighRegisterWrite = function (data) {
    data = data | 0;
    var address = 0x8 | (this.execute & 0x7);
    if ((address | 0) == 0xF) {
        //We performed a branch:
        this.CPUCore.branch(data & -2);
    }
    else {
        //Regular Data Write:
        this.registers[address & 0xF] = data | 0;
    }
}
THUMBInstructionSet.prototype.writeSP = function (data) {
    //Update the stack pointer:
    data = data | 0;
    this.registers[0xD] = data | 0;
}
THUMBInstructionSet.prototype.SPDecrementWord = function () {
    //Decrement the stack pointer by one word:
    this.registers[0xD] = ((this.registers[0xD] | 0) - 4) | 0;
}
THUMBInstructionSet.prototype.SPIncrementWord = function () {
    //Increment the stack pointer by one word:
    this.registers[0xD] = ((this.registers[0xD] | 0) + 4) | 0;
}
THUMBInstructionSet.prototype.writeLR = function (data) {
    //Update the link register:
    data = data | 0;
    this.registers[0xE] = data | 0;
}
THUMBInstructionSet.prototype.writePC = function (data) {
    data = data | 0;
    //We performed a branch:
    //Update the program counter to branch address:
    this.CPUCore.branch(data & -2);
}
THUMBInstructionSet.prototype.offsetPC = function () {
    //We performed a branch:
    //Update the program counter to branch address:
    this.CPUCore.branch(((this.readPC() | 0) + ((this.execute << 24) >> 23)) | 0);
}
THUMBInstructionSet.prototype.getLR = function () {
    //Read back the value for the LR register upon Exception:
    return ((this.readPC() | 0) - 2) | 0;
}
THUMBInstructionSet.prototype.getIRQLR = function () {
    //Read back the value for the LR register upon IRQ:
    return this.readPC() | 0;
}
THUMBInstructionSet.prototype.readSP = function () {
    //Read back the current SP:
    return this.registers[0xD] | 0;
}
THUMBInstructionSet.prototype.readLR = function () {
    //Read back the current LR:
    return this.registers[0xE] | 0;
}
THUMBInstructionSet.prototype.readPC = function () {
    //Read back the current PC:
    return this.registers[0xF] | 0;
}
THUMBInstructionSet.prototype.getCurrentFetchValue = function () {
    return this.fetch | (this.fetch << 16);
}
THUMBInstructionSet.prototype.LSLimm = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var offset = (parentObj.execute >> 6) & 0x1F;
    if (offset > 0) {
        //CPSR Carry is set by the last bit shifted out:
        parentObj.CPSR.carry = ((source << ((offset - 1) | 0)) < 0);
        //Perform shift:
        source <<= offset;
    }
    //Perform CPSR updates for N and Z (But not V):
    parentObj.CPSR.negative = (source < 0);
    parentObj.CPSR.zero = (source == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, source | 0);
}
THUMBInstructionSet.prototype.LSRimm = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var offset = (parentObj.execute >> 6) & 0x1F;
    if (offset > 0) {
        //CPSR Carry is set by the last bit shifted out:
        parentObj.CPSR.carry = (((source >> ((offset - 1) | 0)) & 0x1) != 0);
        //Perform shift:
        source = (source >>> offset) | 0;
    }
    else {
        parentObj.CPSR.carry = (source < 0);
        source = 0;
    }
    //Perform CPSR updates for N and Z (But not V):
    parentObj.CPSR.negative = (source < 0);
    parentObj.CPSR.zero = (source == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, source | 0);
}
THUMBInstructionSet.prototype.ASRimm = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var offset = (parentObj.execute >> 6) & 0x1F;
    if (offset > 0) {
        //CPSR Carry is set by the last bit shifted out:
        parentObj.CPSR.carry = (((source >> ((offset - 1) | 0)) & 0x1) != 0);
        //Perform shift:
        source >>= offset;
    }
    else {
        parentObj.CPSR.carry = (source < 0);
        source >>= 0x1F;
    }
    //Perform CPSR updates for N and Z (But not V):
    parentObj.CPSR.negative = (source < 0);
    parentObj.CPSR.zero = (source == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, source | 0);
}
THUMBInstructionSet.prototype.ADDreg = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 6) | 0;
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.CPUCore.setADDFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.SUBreg = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 6) | 0;
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.CPUCore.setSUBFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.ADDimm3 = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var operand2 = (parentObj.execute >> 6) & 0x7;
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.CPUCore.setADDFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.SUBimm3 = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var operand2 = (parentObj.execute >> 6) & 0x7;
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.CPUCore.setSUBFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.MOVimm8 = function (parentObj) {
    //Get the 8-bit value to move into the register:
    var result = parentObj.execute & 0xFF;
    parentObj.CPSR.negative = false;
    parentObj.CPSR.zero = (result == 0);
    //Update destination register:
    parentObj.writeLowRegister((parentObj.execute >> 8) | 0, result | 0);
}
THUMBInstructionSet.prototype.CMPimm8 = function (parentObj) {
    //Compare an 8-bit immediate value with a register:
    var operand1 = parentObj.readLowRegister(parentObj.execute >> 8) | 0;
    var operand2 = parentObj.execute & 0xFF;
    parentObj.CPUCore.setCMPFlags(operand1 | 0, operand2 | 0);
}
THUMBInstructionSet.prototype.ADDimm8 = function (parentObj) {
    //Add an 8-bit immediate value with a register:
    var operand1 = parentObj.readLowRegister(parentObj.execute >> 8) | 0;
    var operand2 = parentObj.execute & 0xFF;
    parentObj.writeLowRegister(parentObj.execute >> 8, parentObj.CPUCore.setADDFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.SUBimm8 = function (parentObj) {
    //Subtract an 8-bit immediate value from a register:
    var operand1 = parentObj.readLowRegister(parentObj.execute >> 8) | 0;
    var operand2 = parentObj.execute & 0xFF;
    parentObj.writeLowRegister(parentObj.execute >> 8, parentObj.CPUCore.setSUBFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.AND = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Perform bitwise AND:
    var result = source & destination;
    parentObj.CPSR.negative = (result < 0);
    parentObj.CPSR.zero = (result == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, result | 0);
}
THUMBInstructionSet.prototype.EOR = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Perform bitwise EOR:
    var result = source ^ destination;
    parentObj.CPSR.negative = (result < 0);
    parentObj.CPSR.zero = (result == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, result | 0);
}
THUMBInstructionSet.prototype.LSL = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) & 0xFF;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Check to see if we need to update CPSR:
    if (source > 0) {
        if (source < 0x20) {
            //Shift the register data left:
            parentObj.CPSR.carry = ((destination << ((source - 1) | 0)) < 0);
            destination <<= source;
        }
        else if (source == 0x20) {
            //Shift bit 0 into carry:
            parentObj.CPSR.carry = ((destination & 0x1) == 0x1);
            destination = 0;
        }
        else {
            //Everything Zero'd:
            parentObj.CPSR.carry = false;
            destination = 0;
        }
    }
    //Perform CPSR updates for N and Z (But not V):
    parentObj.CPSR.negative = (destination < 0);
    parentObj.CPSR.zero = (destination == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, destination | 0);
}
THUMBInstructionSet.prototype.LSR = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) & 0xFF;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Check to see if we need to update CPSR:
    if (source > 0) {
        if (source < 0x20) {
            //Shift the register data right logically:
            parentObj.CPSR.carry = (((destination >> ((source - 1) | 0)) & 0x1) == 0x1);
            destination = (destination >>> source) | 0;
        }
        else if (source == 0x20) {
            //Shift bit 31 into carry:
            parentObj.CPSR.carry = (destination < 0);
            destination = 0;
        }
        else {
            //Everything Zero'd:
            parentObj.CPSR.carry = false;
            destination = 0;
        }
    }
    //Perform CPSR updates for N and Z (But not V):
    parentObj.CPSR.negative = (destination < 0);
    parentObj.CPSR.zero = (destination == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, destination | 0);
}
THUMBInstructionSet.prototype.ASR = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) & 0xFF;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Check to see if we need to update CPSR:
    if (source > 0) {
        if (source < 0x20) {
            //Shift the register data right arithmetically:
            parentObj.CPSR.carry = (((destination >> ((source - 1) | 0)) & 0x1) == 0x1);
            destination >>= source;
        }
        else {
            //Set all bits with bit 31:
            parentObj.CPSR.carry = (destination < 0);
            destination >>= 0x1F;
        }
    }
    //Perform CPSR updates for N and Z (But not V):
    parentObj.CPSR.negative = (destination < 0);
    parentObj.CPSR.zero = (destination == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, destination | 0);
}
THUMBInstructionSet.prototype.ADC = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.CPUCore.setADCFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.SBC = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.CPUCore.setSBCFlags(operand1 | 0, operand2 | 0) | 0);
}
THUMBInstructionSet.prototype.ROR = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) & 0xFF;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    if (source > 0) {
        source &= 0x1F;
        if (source > 0) {
            //CPSR Carry is set by the last bit shifted out:
            parentObj.CPSR.carry = (((destination >>> ((source - 1) | 0)) & 0x1) != 0);
            //Perform rotate:
            destination = (destination << ((0x20 - source) | 0)) | (destination >>> (source | 0));
        }
        else {
            parentObj.CPSR.carry = (destination < 0);
        }
    }
    //Perform CPSR updates for N and Z (But not V):
    parentObj.CPSR.negative = (destination < 0);
    parentObj.CPSR.zero = (destination == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, destination | 0);
}
THUMBInstructionSet.prototype.TST = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Perform bitwise AND:
    var result = source & destination;
    parentObj.CPSR.negative = (result < 0);
    parentObj.CPSR.zero = (result == 0);
}
THUMBInstructionSet.prototype.NEG = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    parentObj.CPSR.overflow = ((source ^ (-(source | 0))) == 0);
    //Perform Subtraction:
    source = (-(source | 0)) | 0;
    parentObj.CPSR.negative = (source < 0);
    parentObj.CPSR.zero = (source == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, source | 0);
}
THUMBInstructionSet.prototype.CMP = function (parentObj) {
    //Compare two registers:
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    parentObj.CPUCore.setCMPFlags(operand1 | 0, operand2 | 0);
}
THUMBInstructionSet.prototype.CMN = function (parentObj) {
    //Compare two registers:
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    parentObj.CPUCore.setCMNFlags(operand1 | 0, operand2 | 0);
}
THUMBInstructionSet.prototype.ORR = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Perform bitwise OR:
    var result = source | destination;
    parentObj.CPSR.negative = (result < 0);
    parentObj.CPSR.zero = (result == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, result | 0);
}
THUMBInstructionSet.prototype.MUL = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Perform MUL32:
    var result = parentObj.CPUCore.performMUL32(source | 0, destination | 0, 0) | 0;
    parentObj.CPSR.carry = false;
    parentObj.CPSR.negative = (result < 0);
    parentObj.CPSR.zero = (result == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, result | 0);
}
THUMBInstructionSet.prototype.BIC = function (parentObj) {
    var source = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    var destination = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    //Perform bitwise AND with a bitwise NOT on source:
    var result = (~source) & destination;
    parentObj.CPSR.negative = (result < 0);
    parentObj.CPSR.zero = (result == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, result | 0);
}
THUMBInstructionSet.prototype.MVN = function (parentObj) {
    //Perform bitwise NOT on source:
    var source = ~parentObj.readLowRegister(parentObj.execute >> 3);
    parentObj.CPSR.negative = (source < 0);
    parentObj.CPSR.zero = (source == 0);
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, source | 0);
}
THUMBInstructionSet.prototype.ADDH_LL = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    //Perform Addition:
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, ((operand1 | 0) + (operand2 | 0)) | 0);
}
THUMBInstructionSet.prototype.ADDH_LH = function (parentObj) {
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readHighRegister(parentObj.execute >> 3) | 0;
    //Perform Addition:
    //Update destination register:
    parentObj.writeLowRegister(parentObj.execute | 0, ((operand1 | 0) + (operand2 | 0)) | 0);
}
THUMBInstructionSet.prototype.ADDH_HL = function (parentObj) {
    var operand1 = parentObj.readHighRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    //Perform Addition:
    //Update destination register:
    parentObj.guardHighRegisterWrite(((operand1 | 0) + (operand2 | 0)) | 0);
}
THUMBInstructionSet.prototype.ADDH_HH = function (parentObj) {
    var operand1 = parentObj.readHighRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readHighRegister(parentObj.execute >> 3) | 0;
    //Perform Addition:
    //Update destination register:
    parentObj.guardHighRegisterWrite(((operand1 | 0) + (operand2 | 0)) | 0);
}
THUMBInstructionSet.prototype.CMPH_LL = function (parentObj) {
    //Compare two registers:
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    parentObj.CPUCore.setCMPFlags(operand1 | 0, operand2 | 0);
}
THUMBInstructionSet.prototype.CMPH_LH = function (parentObj) {
    //Compare two registers:
    var operand1 = parentObj.readLowRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readHighRegister(parentObj.execute >> 3) | 0;
    parentObj.CPUCore.setCMPFlags(operand1 | 0, operand2 | 0);
}
THUMBInstructionSet.prototype.CMPH_HL = function (parentObj) {
    //Compare two registers:
    var operand1 = parentObj.readHighRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    parentObj.CPUCore.setCMPFlags(operand1 | 0, operand2 | 0);
}
THUMBInstructionSet.prototype.CMPH_HH = function (parentObj) {
    //Compare two registers:
    var operand1 = parentObj.readHighRegister(parentObj.execute | 0) | 0;
    var operand2 = parentObj.readHighRegister(parentObj.execute >> 3) | 0;
    parentObj.CPUCore.setCMPFlags(operand1 | 0, operand2 | 0);
}
THUMBInstructionSet.prototype.MOVH_LL = function (parentObj) {
    //Move a register to another register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.readLowRegister(parentObj.execute >> 3) | 0);
}
THUMBInstructionSet.prototype.MOVH_LH = function (parentObj) {
    //Move a register to another register:
    parentObj.writeLowRegister(parentObj.execute | 0, parentObj.readHighRegister(parentObj.execute >> 3) | 0);
}
THUMBInstructionSet.prototype.MOVH_HL = function (parentObj) {
    //Move a register to another register:
    parentObj.guardHighRegisterWrite(parentObj.readLowRegister(parentObj.execute >> 3) | 0);
}
THUMBInstructionSet.prototype.MOVH_HH = function (parentObj) {
    //Move a register to another register:
    parentObj.guardHighRegisterWrite(parentObj.readHighRegister(parentObj.execute >> 3) | 0);
}
THUMBInstructionSet.prototype.BX_L = function (parentObj) {
    //Branch & eXchange:
    var address = parentObj.readLowRegister(parentObj.execute >> 3) | 0;
    if ((address & 0x1) == 0) {
        //Enter ARM mode:
        parentObj.CPUCore.enterARM();
        parentObj.CPUCore.branch(address & -0x4);
    }
    else {
        //Stay in THUMB mode:
        parentObj.CPUCore.branch(address & -0x2);
    }
}
THUMBInstructionSet.prototype.BX_H = function (parentObj) {
    //Branch & eXchange:
    var address = parentObj.readHighRegister(parentObj.execute >> 3) | 0;
    if ((address & 0x1) == 0) {
        //Enter ARM mode:
        parentObj.CPUCore.enterARM();
        parentObj.CPUCore.branch(address & -0x4);
    }
    else {
        //Stay in THUMB mode:
        parentObj.CPUCore.branch(address & -0x2);
    }
}
THUMBInstructionSet.prototype.LDRPC = function (parentObj) {
    //PC-Relative Load
    var data = parentObj.CPUCore.read32(((parentObj.readPC() & -3) + ((parentObj.execute & 0xFF) << 2)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute >> 8, data | 0);
}
THUMBInstructionSet.prototype.STRreg = function (parentObj) {
    //Store Word From Register
    var address = ((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0;
    parentObj.CPUCore.write32(address | 0, parentObj.readLowRegister(parentObj.execute | 0) | 0);
}
THUMBInstructionSet.prototype.STRHreg = function (parentObj) {
    //Store Half-Word From Register
    var address = ((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0;
    parentObj.CPUCore.write16(address | 0, parentObj.readLowRegister(parentObj.execute | 0) | 0);
}
THUMBInstructionSet.prototype.STRBreg = function (parentObj) {
    //Store Byte From Register
    var address = ((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0;
    parentObj.CPUCore.write8(address | 0, parentObj.readLowRegister(parentObj.execute | 0) | 0);
}
THUMBInstructionSet.prototype.LDRSBreg = function (parentObj) {
    //Load Signed Byte Into Register
    var data = (parentObj.CPUCore.read8(((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) << 24) >> 24;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.LDRreg = function (parentObj) {
    //Load Word Into Register
    var data = parentObj.CPUCore.read32(((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.LDRHreg = function (parentObj) {
    //Load Half-Word Into Register
    var data = parentObj.CPUCore.read16(((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.LDRBreg = function (parentObj) {
    //Load Byte Into Register
    var data = parentObj.CPUCore.read8(((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.LDRSHreg = function (parentObj) {
    //Load Signed Half-Word Into Register
    var data = (parentObj.CPUCore.read16(((parentObj.readLowRegister(parentObj.execute >> 6) | 0) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) << 16) >> 16;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.STRimm5 = function (parentObj) {
    //Store Word From Register
    var address = ((((parentObj.execute >> 6) & 0x1F) << 2) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0;
    parentObj.CPUCore.write32(address | 0, parentObj.readLowRegister(parentObj.execute | 0) | 0);
}
THUMBInstructionSet.prototype.LDRimm5 = function (parentObj) {
    //Load Word Into Register
    var data = parentObj.CPUCore.read32(((((parentObj.execute >> 6) & 0x1F) << 2) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.STRBimm5 = function (parentObj) {
    //Store Byte From Register
    var address = (((parentObj.execute >> 6) & 0x1F) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0;
    parentObj.CPUCore.write8(address | 0, parentObj.readLowRegister(parentObj.execute | 0) | 0);
}
THUMBInstructionSet.prototype.LDRBimm5 = function (parentObj) {
    //Load Byte Into Register
    var data = parentObj.CPUCore.read8((((parentObj.execute >> 6) & 0x1F) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.STRHimm5 = function (parentObj) {
    //Store Half-Word From Register
    var address = ((((parentObj.execute >> 6) & 0x1F) << 1) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0;
    parentObj.CPUCore.write16(address | 0, parentObj.readLowRegister(parentObj.execute | 0) | 0);
}
THUMBInstructionSet.prototype.LDRHimm5 = function (parentObj) {
    //Load Half-Word Into Register
    var data = parentObj.CPUCore.read16(((((parentObj.execute >> 6) & 0x1F) << 1) + (parentObj.readLowRegister(parentObj.execute >> 3) | 0)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute | 0, data | 0);
}
THUMBInstructionSet.prototype.STRSP = function (parentObj) {
    //Store Word From Register
    var address = (((parentObj.execute & 0xFF) << 2) + (parentObj.readSP() | 0)) | 0;
    parentObj.CPUCore.write32(address | 0, parentObj.readLowRegister(parentObj.execute >> 8) | 0);
}
THUMBInstructionSet.prototype.LDRSP = function (parentObj) {
    //Load Word Into Register
    var data = parentObj.CPUCore.read32((((parentObj.execute & 0xFF) << 2) + (parentObj.readSP() | 0)) | 0) | 0;
    parentObj.writeLowRegister(parentObj.execute >> 8, data | 0);
}
THUMBInstructionSet.prototype.ADDPC = function (parentObj) {
    //Add PC With Offset Into Register
    var data = ((parentObj.readPC() & -3) + ((parentObj.execute & 0xFF) << 2)) | 0;
    parentObj.writeLowRegister(parentObj.execute >> 8, data | 0);
}
THUMBInstructionSet.prototype.ADDSP = function (parentObj) {
    //Add SP With Offset Into Register
    var data = (((parentObj.execute & 0xFF) << 2) + (parentObj.readSP() | 0)) | 0;
    parentObj.writeLowRegister(parentObj.execute >> 8, data | 0);
}
THUMBInstructionSet.prototype.ADDSPimm7 = function (parentObj) {
    //Add Signed Offset Into SP
    if ((parentObj.execute & 0x80) != 0) {
        parentObj.writeSP(((parentObj.readSP() | 0) - ((parentObj.execute & 0x7F) << 2)) | 0);
    }
    else {
        parentObj.writeSP(((parentObj.readSP() | 0) + ((parentObj.execute & 0x7F) << 2)) | 0);
    }
}
THUMBInstructionSet.prototype.PUSH = function (parentObj) {
    //Only initialize the PUSH sequence if the register list is non-empty:
    if ((parentObj.execute & 0xFF) > 0) {
        //Updating the address bus away from PC fetch:
        parentObj.wait.NonSequentialBroadcast();
        //Push register(s) onto the stack:
        for (var rListPosition = 7; (rListPosition | 0) > -1; rListPosition = ((rListPosition | 0) - 1) | 0) {
            if ((parentObj.execute & (1 << rListPosition)) != 0) {
                //Push register onto the stack:
                parentObj.SPDecrementWord();
                parentObj.stackMemoryCache.memoryWrite32(parentObj.readSP() >>> 0, parentObj.readLowRegister(rListPosition | 0) | 0);
            }
        }
        //Updating the address bus back to PC fetch:
        parentObj.wait.NonSequentialBroadcast();
    }
}
THUMBInstructionSet.prototype.PUSHlr = function (parentObj) {
    //Updating the address bus away from PC fetch:
    parentObj.wait.NonSequentialBroadcast();
    //Push link register onto the stack:
    parentObj.SPDecrementWord();
    parentObj.stackMemoryCache.memoryWrite32(parentObj.readSP() >>> 0, parentObj.readLR() | 0);
    //Push register(s) onto the stack:
    for (var rListPosition = 7; (rListPosition | 0) > -1; rListPosition = ((rListPosition | 0) - 1) | 0) {
        if ((parentObj.execute & (1 << rListPosition)) != 0) {
            //Push register onto the stack:
            parentObj.SPDecrementWord();
            parentObj.stackMemoryCache.memoryWrite32(parentObj.readSP() >>> 0, parentObj.readLowRegister(rListPosition | 0) | 0);
        }
    }
    //Updating the address bus back to PC fetch:
    parentObj.wait.NonSequentialBroadcast();
}
THUMBInstructionSet.prototype.POP = function (parentObj) {
    //Only initialize the POP sequence if the register list is non-empty:
    if ((parentObj.execute & 0xFF) > 0) {
        //Updating the address bus away from PC fetch:
        parentObj.wait.NonSequentialBroadcast();
        //POP stack into register(s):
        for (var rListPosition = 0; (rListPosition | 0) < 8; rListPosition = ((rListPosition | 0) + 1) | 0) {
            if ((parentObj.execute & (1 << rListPosition)) != 0) {
                //POP stack into a register:
                parentObj.writeLowRegister(rListPosition | 0, parentObj.stackMemoryCache.memoryRead32(parentObj.readSP() >>> 0) | 0);
                parentObj.SPIncrementWord();
            }
        }
        //Updating the address bus back to PC fetch:
        parentObj.wait.NonSequentialBroadcast();
    }
}
THUMBInstructionSet.prototype.POPpc = function (parentObj) {
    //Updating the address bus away from PC fetch:
    parentObj.wait.NonSequentialBroadcast();
    //POP stack into register(s):
    for (var rListPosition = 0; (rListPosition | 0) < 8; rListPosition = ((rListPosition | 0) + 1) | 0) {
        if ((parentObj.execute & (1 << rListPosition)) != 0) {
            //POP stack into a register:
            parentObj.writeLowRegister(rListPosition | 0, parentObj.stackMemoryCache.memoryRead32(parentObj.readSP() >>> 0) | 0);
            parentObj.SPIncrementWord();
        }
    }
    //POP stack into the program counter (r15):
    parentObj.writePC(parentObj.stackMemoryCache.memoryRead32(parentObj.readSP() >>> 0) | 0);
    parentObj.SPIncrementWord();
    //Updating the address bus back to PC fetch:
    parentObj.wait.NonSequentialBroadcast();
}
THUMBInstructionSet.prototype.STMIA = function (parentObj) {
    //Only initialize the STMIA sequence if the register list is non-empty:
    if ((parentObj.execute & 0xFF) > 0) {
        //Get the base address:
        var currentAddress = parentObj.readLowRegister(parentObj.execute >> 8) | 0;
        //Updating the address bus away from PC fetch:
        parentObj.wait.NonSequentialBroadcast();
        //Push register(s) into memory:
        for (var rListPosition = 0; (rListPosition | 0) < 8; rListPosition = ((rListPosition | 0) + 1) | 0) {
            if ((parentObj.execute & (1 << rListPosition)) != 0) {
                //Push a register into memory:
                parentObj.stackMemoryCache.memoryWrite32(currentAddress >>> 0, parentObj.readLowRegister(rListPosition | 0) | 0);
                currentAddress = ((currentAddress | 0) + 4) | 0;
            }
        }
        //Store the updated base address back into register:
        parentObj.writeLowRegister(parentObj.execute >> 8, currentAddress | 0);
        //Updating the address bus back to PC fetch:
        parentObj.wait.NonSequentialBroadcast();
    }
}
THUMBInstructionSet.prototype.LDMIA = function (parentObj) {
    //Only initialize the LDMIA sequence if the register list is non-empty:
    if ((parentObj.execute & 0xFF) > 0) {
        //Get the base address:
        var currentAddress = parentObj.readLowRegister(parentObj.execute >> 8) | 0;
        //Updating the address bus away from PC fetch:
        parentObj.wait.NonSequentialBroadcast();
        //Load  register(s) from memory:
        for (var rListPosition = 0; (rListPosition | 0) < 8; rListPosition = ((rListPosition | 0) + 1) | 0) {
            if ((parentObj.execute & (1 << rListPosition)) != 0) {
                //Load a register from memory:
                parentObj.writeLowRegister(rListPosition | 0, parentObj.stackMemoryCache.memoryRead32(currentAddress >>> 0) | 0);
                currentAddress = ((currentAddress | 0) + 4) | 0;
            }
        }
        //Store the updated base address back into register:
        parentObj.writeLowRegister(parentObj.execute >> 8, currentAddress | 0);
        //Updating the address bus back to PC fetch:
        parentObj.wait.NonSequentialBroadcast();
    }
}
THUMBInstructionSet.prototype.BEQ = function (parentObj) {
    //Branch if EQual:
    if (parentObj.CPSR.zero) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BNE = function (parentObj) {
    //Branch if Not Equal:
    if (!parentObj.CPSR.zero) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BCS = function (parentObj) {
    //Branch if Carry Set:
    if (parentObj.CPSR.carry) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BCC = function (parentObj) {
    //Branch if Carry Clear:
    if (!parentObj.CPSR.carry) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BMI = function (parentObj) {
    //Branch if Negative Set:
    if (parentObj.CPSR.negative) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BPL = function (parentObj) {
    //Branch if Negative Clear:
    if (!parentObj.CPSR.negative) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BVS = function (parentObj) {
    //Branch if Overflow Set:
    if (parentObj.CPSR.overflow) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BVC = function (parentObj) {
    //Branch if Overflow Clear:
    if (!parentObj.CPSR.overflow) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BHI = function (parentObj) {
    //Branch if Carry & Non-Zero:
    if (parentObj.CPSR.carry && !parentObj.CPSR.zero) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BLS = function (parentObj) {
    //Branch if Carry Clear or is Zero Set:
    if (!parentObj.CPSR.carry || parentObj.CPSR.zero) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BGE = function (parentObj) {
    //Branch if Negative equal to Overflow
    if (parentObj.CPSR.negative == parentObj.CPSR.overflow) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BLT = function (parentObj) {
    //Branch if Negative NOT equal to Overflow
    if (parentObj.CPSR.negative != parentObj.CPSR.overflow) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BGT = function (parentObj) {
    //Branch if Zero Clear and Negative equal to Overflow
    if (!parentObj.CPSR.zero && parentObj.CPSR.negative == parentObj.CPSR.overflow) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.BLE = function (parentObj) {
    //Branch if Zero Set or Negative NOT equal to Overflow
    if (parentObj.CPSR.zero || parentObj.CPSR.negative != parentObj.CPSR.overflow) {
        parentObj.offsetPC();
    }
}
THUMBInstructionSet.prototype.SWI = function (parentObj) {
    //Software Interrupt:
    parentObj.CPUCore.SWI();
}
THUMBInstructionSet.prototype.B = function (parentObj) {
    //Unconditional Branch:
    //Update the program counter to branch address:
    parentObj.CPUCore.branch(((parentObj.readPC() | 0) + ((parentObj.execute << 21) >> 20)) | 0);
}
THUMBInstructionSet.prototype.BLsetup = function (parentObj) {
    //Brank with Link (High offset)
    //Update the link register to branch address:
    parentObj.writeLR(((parentObj.readPC() | 0) + (((parentObj.execute & 0x7FF) << 21) >> 9)) | 0);
}
THUMBInstructionSet.prototype.BLoff = function (parentObj) {
    //Brank with Link (Low offset)
    //Update the link register to branch address:
    parentObj.writeLR(((parentObj.readLR() | 0) + ((parentObj.execute & 0x7FF) << 1)) | 0);
    //Copy LR to PC:
    var oldPC = parentObj.readPC() | 0;
    //Flush Pipeline & Block PC Increment:
    parentObj.CPUCore.branch(parentObj.readLR() & -0x2);
    //Set bit 0 of LR high:
    parentObj.writeLR(((oldPC | 0) - 0x2) | 0x1);
}
THUMBInstructionSet.prototype.UNDEFINED = function (parentObj) {
    //Undefined Exception:
    parentObj.CPUCore.UNDEFINED();
}
THUMBInstructionSet.prototype.compileInstructionMap = function () {
    this.instructionMap = [];
    //0-7
    this.generateLowMap(this.LSLimm);
    //8-F
    this.generateLowMap(this.LSRimm);
    //10-17
    this.generateLowMap(this.ASRimm);
    //18-19
    this.generateLowMap2(this.ADDreg);
    //1A-1B
    this.generateLowMap2(this.SUBreg);
    //1C-1D
    this.generateLowMap2(this.ADDimm3);
    //1E-1F
    this.generateLowMap2(this.SUBimm3);
    //20-27
    this.generateLowMap(this.MOVimm8);
    //28-2F
    this.generateLowMap(this.CMPimm8);
    //30-37
    this.generateLowMap(this.ADDimm8);
    //38-3F
    this.generateLowMap(this.SUBimm8);
    //40
    this.generateLowMap4(this.AND, this.EOR, this.LSL, this.LSR);
    //41
    this.generateLowMap4(this.ASR, this.ADC, this.SBC, this.ROR);
    //42
    this.generateLowMap4(this.TST, this.NEG, this.CMP, this.CMN);
    //43
    this.generateLowMap4(this.ORR, this.MUL, this.BIC, this.MVN);
    //44
    this.generateLowMap4(this.ADDH_LL, this.ADDH_LH, this.ADDH_HL, this.ADDH_HH);
    //45
    this.generateLowMap4(this.CMPH_LL, this.CMPH_LH, this.CMPH_HL, this.CMPH_HH);
    //46
    this.generateLowMap4(this.MOVH_LL, this.MOVH_LH, this.MOVH_HL, this.MOVH_HH);
    //47
    this.generateLowMap4(this.BX_L, this.BX_H, this.BX_L, this.BX_H);
    //48-4F
    this.generateLowMap(this.LDRPC);
    //50-51
    this.generateLowMap2(this.STRreg);
    //52-53
    this.generateLowMap2(this.STRHreg);
    //54-55
    this.generateLowMap2(this.STRBreg);
    //56-57
    this.generateLowMap2(this.LDRSBreg);
    //58-59
    this.generateLowMap2(this.LDRreg);
    //5A-5B
    this.generateLowMap2(this.LDRHreg);
    //5C-5D
    this.generateLowMap2(this.LDRBreg);
    //5E-5F
    this.generateLowMap2(this.LDRSHreg);
    //60-67
    this.generateLowMap(this.STRimm5);
    //68-6F
    this.generateLowMap(this.LDRimm5);
    //70-77
    this.generateLowMap(this.STRBimm5);
    //78-7F
    this.generateLowMap(this.LDRBimm5);
    //80-87
    this.generateLowMap(this.STRHimm5);
    //88-8F
    this.generateLowMap(this.LDRHimm5);
    //90-97
    this.generateLowMap(this.STRSP);
    //98-9F
    this.generateLowMap(this.LDRSP);
    //A0-A7
    this.generateLowMap(this.ADDPC);
    //A8-AF
    this.generateLowMap(this.ADDSP);
    //B0
    this.generateLowMap3(this.ADDSPimm7);
    //B1
    this.generateLowMap3(this.UNDEFINED);
    //B2
    this.generateLowMap3(this.UNDEFINED);
    //B3
    this.generateLowMap3(this.UNDEFINED);
    //B4
    this.generateLowMap3(this.PUSH);
    //B5
    this.generateLowMap3(this.PUSHlr);
    //B6
    this.generateLowMap3(this.UNDEFINED);
    //B7
    this.generateLowMap3(this.UNDEFINED);
    //B8
    this.generateLowMap3(this.UNDEFINED);
    //B9
    this.generateLowMap3(this.UNDEFINED);
    //BA
    this.generateLowMap3(this.UNDEFINED);
    //BB
    this.generateLowMap3(this.UNDEFINED);
    //BC
    this.generateLowMap3(this.POP);
    //BD
    this.generateLowMap3(this.POPpc);
    //BE
    this.generateLowMap3(this.UNDEFINED);
    //BF
    this.generateLowMap3(this.UNDEFINED);
    //C0-C7
    this.generateLowMap(this.STMIA);
    //C8-CF
    this.generateLowMap(this.LDMIA);
    //D0
    this.generateLowMap3(this.BEQ);
    //D1
    this.generateLowMap3(this.BNE);
    //D2
    this.generateLowMap3(this.BCS);
    //D3
    this.generateLowMap3(this.BCC);
    //D4
    this.generateLowMap3(this.BMI);
    //D5
    this.generateLowMap3(this.BPL);
    //D6
    this.generateLowMap3(this.BVS);
    //D7
    this.generateLowMap3(this.BVC);
    //D8
    this.generateLowMap3(this.BHI);
    //D9
    this.generateLowMap3(this.BLS);
    //DA
    this.generateLowMap3(this.BGE);
    //DB
    this.generateLowMap3(this.BLT);
    //DC
    this.generateLowMap3(this.BGT);
    //DD
    this.generateLowMap3(this.BLE);
    //DE
    this.generateLowMap3(this.UNDEFINED);
    //DF
    this.generateLowMap3(this.SWI);
    //E0-E7
    this.generateLowMap(this.B);
    //E8-EF
    this.generateLowMap(this.UNDEFINED);
    //F0-F7
    this.generateLowMap(this.BLsetup);
    //F8-FF
    this.generateLowMap(this.BLoff);
    //Force length to be ready only:
    try {
        Object.defineProperty(this.instructionMap, "length", {writable: false});
    }
    catch (error) {
        //Some browsers throw here....
    }
}
THUMBInstructionSet.prototype.generateLowMap = function (instruction) {
    for (var index = 0; index < 0x20; ++index) {
        this.instructionMap.push(instruction);
    }
}
THUMBInstructionSet.prototype.generateLowMap2 = function (instruction) {
    for (var index = 0; index < 0x8; ++index) {
        this.instructionMap.push(instruction);
    }
}
THUMBInstructionSet.prototype.generateLowMap3 = function (instruction) {
    for (var index = 0; index < 0x4; ++index) {
        this.instructionMap.push(instruction);
    }
}
THUMBInstructionSet.prototype.generateLowMap4 = function (instruction1, instruction2, instruction3, instruction4) {
    this.instructionMap.push(instruction1);
    this.instructionMap.push(instruction2);
    this.instructionMap.push(instruction3);
    this.instructionMap.push(instruction4);
}