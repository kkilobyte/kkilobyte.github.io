"use strict";
/*
 * This file is part of IodineGBA
 *
 * Copyright (C) 2013 Grant Galitz
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
function DynarecCacheManagerCore(dynarec, start, end, InTHUMB) {
    this.dynarec = dynarec;
    this.CPUCore = dynarec.CPUCore;
    this.registers = this.CPUCore.registers;
    this.CPSR = this.CPUCore.CPSR;
    this.thumb = this.CPUCore.THUMB;
    this.arm = this.CPUCore.ARM;
    this.memory = this.CPUCore.memory;
    this.stackMemoryCache = new GameBoyAdvanceMemoryCache(this.memory);
    this.wait = this.CPUCore.wait;
    this.start = start >>> 0;
    end = ((end >>> 0) - ((!!InTHUMB) ? 0x4 : 0x8)) >>> 0;
    this.end = end >>> 0;
    this.InTHUMB = !!InTHUMB;
    this.badCount = 0;
    this.hotCount = 0;
    this.worker = null;
    this.compiling = false;
    this.compiled = false;
    this.read = (this.InTHUMB) ? this.read16 : this.read32;
    this.sizeOfBlock = (this.end >>> 0) - (this.start >>> 0);
    this.execute = null;
    this.lastBranch = 0;
    this.lastStubCall = null;
}
DynarecCacheManagerCore.prototype.MAGIC_HOT_COUNT = 1000;
DynarecCacheManagerCore.prototype.MAGIC_BAD_COUNT_RATIO = 0.001;
DynarecCacheManagerCore.prototype.MAGIC_BAD_COUNT_CLEAR_RATIO = 0.1;
DynarecCacheManagerCore.prototype.MIN_BLOCK_SIZE = 1;
DynarecCacheManagerCore.prototype.tickHotness = function () {
    if (this.sizeOfBlock >= this.MIN_BLOCK_SIZE) {
        //Don't let sub-routines too small through:
        ++this.hotCount;
        if (!this.compiled) {
            if (this.hotCount >= this.MAGIC_HOT_COUNT) {
                if ((this.badCount / this.hotCount) < this.MAGIC_BAD_COUNT_RATIO) {
                    this.compile();
                }
            }
        }
    }
}
DynarecCacheManagerCore.prototype.bailout = function () {
    ++this.badCount;
    this.compiled = false;
}
DynarecCacheManagerCore.prototype.tickBad = function () {
    ++this.badCount;
    if ((this.badCount / this.hotCount) >= this.MAGIC_BAD_COUNT_CLEAR_RATIO) {
        this.compiled = false;
    }
}
DynarecCacheManagerCore.prototype.read16 = function (address) {
    address = address >>> 0;
    if (address >= 0x8000000 && address < 0xE000000) {
        return this.CPUCore.IOCore.cartridge.readROM16(address & 0x1FFFFFF);
    }
    else if (address >= 0x3000000 && address < 0x4000000) {
        return this.memory.externalRAM[address & 0x3FFFF] | (this.memory.externalRAM[(address & 0x3FFFF) | 1] << 8);
    }
    else if (address >= 0x2000000 && address < 0x3000000) {
        return this.memory.internalRAM[address & 0x7FFF] | (this.memory.internalRAM[(address & 0x7FFF) | 1] << 8);
    }
    else if (address >= 0x20 && address < 0x4000) {
        return this.memory.BIOS[address] | (this.memory.BIOS[address | 1] << 8);
    }
}
DynarecCacheManagerCore.prototype.read32 = function (address) {
    address = address >>> 0;
    if (address >= 0x8000000 && address < 0xE000000) {
        return this.CPUCore.IOCore.cartridge.readROM32(address & 0x1FFFFFF);
    }
    else if (address >= 0x3000000 && address < 0x4000000) {
        return this.memory.externalRAM[address & 0x3FFFF] | (this.memory.externalRAM[(address & 0x3FFFF) | 1] << 8) | (this.memory.externalRAM[(address & 0x3FFFF) | 2] << 16)  | (this.memory.externalRAM[(address & 0x3FFFF) | 3] << 24);
    }
    else if (address >= 0x2000000 && address < 0x3000000) {
        return this.memory.internalRAM[address & 0x7FFF] | (this.memory.internalRAM[(address & 0x7FFF) | 1] << 8) | (this.memory.internalRAM[(address & 0x7FFF) | 2] << 16)  | (this.memory.internalRAM[(address & 0x7FFF) | 3] << 24);
    }
    else if (address >= 0x20 && address < 0x4000) {
        return this.memory.BIOS[address] | (this.memory.BIOS[address | 1] << 8) | (this.memory.BIOS[address | 2] << 16)  | (this.memory.BIOS[address | 3] << 24);
    }
}
DynarecCacheManagerCore.prototype.getRecords = function () {
    this.record = [];
    var start = this.start >>> 0;
    var end = this.end >>> 0;
    end = ((end >>> 0) + ((!!this.InTHUMB) ? 0x4 : 0x8)) >>> 0;
    while ((start >>> 0) <= (end >>> 0)) {
        //Build up a record of bytecode to pass to the worker to compile:
        this.record.push(this.read(start >>> 0) | 0);
        start = ((start >>> 0) + ((!!this.InTHUMB) ? 0x2 : 0x4)) >>> 0;
    }
}
DynarecCacheManagerCore.prototype.compile = function () {
    //Get the instruction data to JIT:
    this.getRecords();
    if (!this.CPUCore.settings.useWorkers) {
        //Don't use workers to JIT:
        if (this.InTHUMB) {
            var assembler = new DynarecTHUMBAssemblerCore(this.start >>> 0, this.record);
        }
        else {
            //var assembler = new DynarecARMAssemblerCore(this.start >>> 0, this.record);
        }
        this.attachCompiled(new Function(assembler.getStubCode()));
    }
    else if (!this.compiling && this.dynarec.hasFreeWorker()) {
        //Make sure there isn't another worker compiling:
        try {
            var parentObj = this;
            this.worker = this.dynarec.getFreeWorker();
            this.worker.onmessage = function (command) {
                var message = command.data;
                var code = message[0] | 0;
                switch (code | 0) {
                        //Got the code block back:
                    case 0:
                        parentObj.attachCompiled(new Function(message[1]));
                        break;
                        //Compiler returned an error:
                    case 1:
                        parentObj.bailout();
                }
                //Destroy the worker:
                parentObj.dynarec.returnFreeWorker(parentObj.worker);
                parentObj.worker = null;
                parentObj.compiling = false;
                parentObj.compiled = true;
            }
            //Put a lock on the compiler:
            this.compiling = true;
            //Pass the record memory and state:
            this.worker.postMessage([this.start >>> 0, this.record, !!this.InTHUMB]);
        }
        catch (error) {
            //Browser doesn't support webworkers, so disable web worker usage:
            this.CPUCore.settings.useWorkers = false;
        }
    }
}
DynarecCacheManagerCore.prototype.ready = function () {
    return !!this.compiled;
}
DynarecCacheManagerCore.prototype.attachCompiled = function (JITStub) {
    this.execute = JITStub;
}
DynarecCacheManagerCore.prototype.branchTHUMB = function (branchTo) {
    branchTo = branchTo | 0;
    if ((branchTo | 0) > 0x3FFF || this.CPUCore.IOCore.BIOSFound) {
        if ((this.lastBranch | 0) == (branchTo | 0) && this.lastStubCall) {
            //Use our cached stub:
            this.dynarec.attachNextCache(this.lastStubCall)
        }
        else {
            //Go out and find the stub:
            this.lastStubCall = (this.dynarec.handleNextWithStatus(branchTo | 0, true)) ? this.dynarec.currentCache : null;
            this.lastBranch = branchTo | 0;
        }
        //Branch to new address:
        this.registers[15] = branchTo | 0;
        //Mark pipeline as invalid:
        this.CPUCore.pipelineInvalid = 0x4;
        //Next PC fetch has to update the address bus:
        this.CPUCore.wait.NonSequentialBroadcast();
    }
    else {
        //We're branching into BIOS, handle specially:
        if ((branchTo | 0) == 0x130) {
            //IRQ mode exit handling:
            //ROM IRQ handling returns back from its own subroutine back to BIOS at this address.
            this.CPUCore.HLEIRQExit();
        }
        else {
            //Illegal to branch directly into BIOS (Except for return from IRQ), only SWIs can:
            throw(new Error("Could not handle branch to: " + branchTo.toString(16)));
        }
    }
}
DynarecCacheManagerCore.prototype.branchARM = function (branchTo) {
    branchTo = branchTo | 0;
    if ((branchTo | 0) > 0x3FFF || this.CPUCore.IOCore.BIOSFound) {
        if ((this.lastBranch | 0) == (branchTo | 0) && this.lastStubCall) {
            //Use our cached stub:
            this.dynarec.attachNextCache(this.lastStubCall)
        }
        else {
            //Go out and find the stub:
            this.lastStubCall = (this.dynarec.handleNextWithStatus(branchTo | 0, false)) ? this.dynarec.currentCache : null;
            this.lastBranch = branchTo | 0;
        }
        //Branch to new address:
        this.registers[15] = branchTo | 0;
        //Mark pipeline as invalid:
        this.CPUCore.pipelineInvalid = 0x4;
        //Next PC fetch has to update the address bus:
        this.CPUCore.wait.NonSequentialBroadcast();
    }
    else {
        //We're branching into BIOS, handle specially:
        if ((branchTo | 0) == 0x130) {
            //IRQ mode exit handling:
            //ROM IRQ handling returns back from its own subroutine back to BIOS at this address.
            this.CPUCore.HLEIRQExit();
        }
        else {
            //Illegal to branch directly into BIOS (Except for return from IRQ), only SWIs can:
            throw(new Error("Could not handle branch to: " + branchTo.toString(16)));
        }
    }
}