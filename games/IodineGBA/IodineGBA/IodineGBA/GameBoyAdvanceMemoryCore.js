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
function GameBoyAdvanceMemory(IOCore) {
    //Reference to the emulator core:
    this.IOCore = IOCore;
    //WRAM Map Control Stuff:
    this.memoryCaches = [];
    this.WRAMControlFlags = 0x20;
    //Load the BIOS:
    this.BIOS = getUint8Array(0x4000);
    this.BIOS16 = getUint16View(this.BIOS);
    this.BIOS32 = getInt32View(this.BIOS);
    this.loadBIOS();
    //Initialize Some RAM:
    this.externalRAM = getUint8Array(0x40000);
    this.externalRAM16 = getUint16View(this.externalRAM);
    this.externalRAM32 = getInt32View(this.externalRAM);
    this.internalRAM = getUint8Array(0x8000);
    this.internalRAM16 = getUint16View(this.internalRAM);
    this.internalRAM32 = getInt32View(this.internalRAM);
    this.lastBIOSREAD = getUint8Array(0x4);        //BIOS read bus last.
    this.lastBIOSREAD16 = getUint16View(this.lastBIOSREAD);
    this.lastBIOSREAD32 = getInt32View(this.lastBIOSREAD);
    //After all sub-objects initialized, initialize dispatches:
    var generator = new GameBoyAdvanceMemoryDispatchGenerator(this);
    this.readIO8 = generator.generateMemoryReadIO8();
    this.readIO16 = generator.generateMemoryReadIO16();
    this.readIO32 = generator.generateMemoryReadIO32();
    this.writeIO8 = generator.generateMemoryWriteIO8();
    this.writeIO16 = generator.generateMemoryWriteIO16();
    this.writeIO32 = generator.generateMemoryWriteIO32();
    this.memoryReader8 = generator.generateMemoryRead8();
    this.memoryWriter8 = generator.generateMemoryWrite8();
    this.memoryReader16 = generator.generateMemoryRead16();
    this.memoryWriter16 = generator.generateMemoryWrite16();
    this.memoryReader32 = generator.generateMemoryRead32();
    this.memoryWriter32 = generator.generateMemoryWrite32();
}
GameBoyAdvanceMemory.prototype.loadReferences = function () {
    //Initialize the various handler objects:
    this.dma = this.IOCore.dma;
    this.gfx = this.IOCore.gfx;
    this.sound = this.IOCore.sound;
    this.timer = this.IOCore.timer;
    this.irq = this.IOCore.irq;
    this.serial = this.IOCore.serial;
    this.joypad = this.IOCore.joypad;
    this.cartridge = this.IOCore.cartridge;
    this.wait = this.IOCore.wait;
    this.cpu = this.IOCore.cpu;
    this.saves = this.IOCore.saves;
}
GameBoyAdvanceMemory.prototype.memoryWriteFast8 = function (address, data) {
    address = address >>> 0;
    data = data | 0;
    this.memoryWriter8[address >>> 24](this, address >>> 0, data & 0xFF);
}
GameBoyAdvanceMemory.prototype.memoryWrite16 = function (address, data) {
    address = address >>> 0;
    data = data | 0;
    this.memoryWriter16[address >>> 24](this, (address & -2) >>> 0, data & 0xFFFF);
}
GameBoyAdvanceMemory.prototype.memoryWriteFast16 = function (address, data) {
    address = address >>> 0;
    data = data | 0;
    this.memoryWriter16[address >>> 24](this, address >>> 0, data & 0xFFFF);
}
GameBoyAdvanceMemory.prototype.memoryWrite32 = function (address, data) {
    address = address >>> 0;
    data = data | 0;
    this.memoryWriter32[address >>> 24](this, (address & -4) >>> 0, data | 0);
}
GameBoyAdvanceMemory.prototype.memoryWriteFast32 = function (address, data) {
    address = address >>> 0;
    data = data | 0;
    this.memoryWriter32[address >>> 24](this, address >>> 0, data | 0);
}
GameBoyAdvanceMemory.prototype.memoryReadFast8 = function (address) {
    address = address >>> 0;
    return this.memoryReader8[address >>> 24](this, address >>> 0) | 0;
}
GameBoyAdvanceMemory.prototype.memoryRead16 = function (address) {
    address = address >>> 0;
    return this.memoryReader16[address >>> 24](this, (address & -2) >>> 0) | 0;
}
GameBoyAdvanceMemory.prototype.memoryReadFast16 = function (address) {
    address = address >>> 0;
    return this.memoryReader16[address >>> 24](this, address >>> 0) | 0;
}
GameBoyAdvanceMemory.prototype.memoryRead32 = function (address) {
    address = address >>> 0;
    return this.memoryReader32[address >>> 24](this, (address & -4) >>> 0) | 0;
}
GameBoyAdvanceMemory.prototype.memoryReadFast32 = function (address) {
    address = address >>> 0;
    return this.memoryReader32[address >>> 24](this, address >>> 0) | 0;
}
GameBoyAdvanceMemory.prototype.writeExternalWRAM8 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    //External WRAM:
    parentObj.wait.WRAMAccess8();
    parentObj.externalRAM[address & 0x3FFFF] = data | 0;
}
GameBoyAdvanceMemory.prototype.writeExternalWRAM16Slow = function (parentObj, address, data) {
    //External WRAM:
    parentObj.wait.WRAMAccess16();
    parentObj.externalRAM[address & 0x3FFFF] = data & 0xFF;
    parentObj.externalRAM[(address + 1) & 0x3FFFF] = data >> 8;
}
GameBoyAdvanceMemory.prototype.writeExternalWRAM16Optimized = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    //External WRAM:
    parentObj.wait.WRAMAccess16();
    parentObj.externalRAM16[(address >> 1) & 0x1FFFF] = data | 0;
}
GameBoyAdvanceMemory.prototype.writeExternalWRAM32Slow = function (parentObj, address, data) {
    //External WRAM:
    parentObj.wait.WRAMAccess32();
    parentObj.externalRAM[address & 0x3FFFF] = data & 0xFF;
    parentObj.externalRAM[(address + 1) & 0x3FFFF] = (data >> 8) & 0xFF;
    parentObj.externalRAM[(address + 2) & 0x3FFFF] = (data >> 16) & 0xFF;
    parentObj.externalRAM[(address + 3) & 0x3FFFF] = (data >> 24) & 0xFF;
}
GameBoyAdvanceMemory.prototype.writeExternalWRAM32Optimized = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    //External WRAM:
    parentObj.wait.WRAMAccess32();
    parentObj.externalRAM32[(address >> 2) & 0xFFFF] = data | 0;
}
GameBoyAdvanceMemory.prototype.writeInternalWRAM8 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    parentObj.internalRAM[address & 0x7FFF] = data | 0;
}
GameBoyAdvanceMemory.prototype.writeInternalWRAM16Slow = function (parentObj, address, data) {
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    parentObj.internalRAM[address & 0x7FFF] = data & 0xFF;
    parentObj.internalRAM[(address + 1) & 0x7FFF] = data >> 8;
}
GameBoyAdvanceMemory.prototype.writeInternalWRAM16Optimized = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    parentObj.internalRAM16[(address >> 1) & 0x3FFF] = data | 0;
}
GameBoyAdvanceMemory.prototype.writeInternalWRAM32Slow = function (parentObj, address, data) {
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    parentObj.internalRAM[address & 0x7FFF] = data & 0xFF;
    parentObj.internalRAM[(address + 1) & 0x7FFF] = (data >> 8) & 0xFF;
    parentObj.internalRAM[(address + 2) & 0x7FFF] = (data >> 16) & 0xFF;
    parentObj.internalRAM[(address + 3) & 0x7FFF] = (data >> 24) & 0xFF;
}
GameBoyAdvanceMemory.prototype.writeInternalWRAM32Optimized = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    parentObj.internalRAM32[(address >> 2) & 0x1FFF] = data | 0;
}
GameBoyAdvanceMemory.prototype.writeIODispatch8 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.FASTAccess2();
    if ((address | 0) < 0x4000302) {
        //IO Write:
        parentObj.writeIO8[address & 0x3FF](parentObj, data | 0);
    }
    else if ((address & 0x4000800) == 0x4000800) {
        //WRAM wait state control:
        parentObj.wait.writeConfigureWRAM8(address | 0, data | 0);
    }
}
GameBoyAdvanceMemory.prototype.writeIODispatch16 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.FASTAccess2();
    if ((address | 0) < 0x4000301) {
        //IO Write:
        address = address >> 1;
        parentObj.writeIO16[address & 0x1FF](parentObj, data | 0);
    }
    else if ((address & 0x4000800) == 0x4000800) {
        //WRAM wait state control:
        parentObj.wait.writeConfigureWRAM16(address | 0, data | 0);
    }
}
GameBoyAdvanceMemory.prototype.writeIODispatch32 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.FASTAccess2();
    if ((address | 0) < 0x4000301) {
        //IO Write:
        address = address >> 2;
        parentObj.writeIO32[address & 0xFF](parentObj, data | 0);
    }
    else if ((address & 0x4000800) == 0x4000800) {
        //WRAM wait state control:
        parentObj.wait.writeConfigureWRAM32(data | 0);
    }
}
GameBoyAdvanceMemory.prototype.writeVRAM8 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess8();
    if ((address & 0x10000) != 0) {
        if ((address & 0x17FFF) < 0x14000 && (parentObj.gfx.BGMode | 0) >= 3) {
            parentObj.gfx.writeVRAM(address & 0x17FFE, data | 0);
            parentObj.gfx.writeVRAM((address | 1) & 0x17FFF, data | 0);
        }
    }
    else {
        parentObj.gfx.writeVRAM(address & 0xFFFE, data | 0);
        parentObj.gfx.writeVRAM((address | 1) & 0xFFFF, data | 0);
    }
}
GameBoyAdvanceMemory.prototype.writeVRAM16 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess16();
    if ((address & 0x10000) != 0) {
        parentObj.gfx.writeVRAM16(address & 0x17FFF, data | 0);
    }
    else {
        parentObj.gfx.writeVRAM16(address & 0xFFFF, data | 0);
    }
}
GameBoyAdvanceMemory.prototype.writeVRAM32 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess32();
    if ((address & 0x10000) != 0) {
        parentObj.gfx.writeVRAM32(address & 0x17FFF, data | 0);
    }
    else {
        parentObj.gfx.writeVRAM32(address & 0xFFFF, data | 0);
    }
}
GameBoyAdvanceMemory.prototype.writeOAM8 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.OAMAccess8();
    parentObj.gfx.writeOAM(address & 0x3FF, data | 0);
}
GameBoyAdvanceMemory.prototype.writeOAM16 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.OAMAccess16();
    parentObj.gfx.writeOAM(address & 0x3FF, data & 0xFF);
    parentObj.gfx.writeOAM(((address | 0) + 1) & 0x3FF, data >> 8);
}
GameBoyAdvanceMemory.prototype.writeOAM32 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.OAMAccess32();
    parentObj.gfx.writeOAM(address & 0x3FF, data & 0xFF);
    parentObj.gfx.writeOAM(((address | 0) + 1) & 0x3FF, (data >> 8) & 0xFF);
    parentObj.gfx.writeOAM(((address | 0) + 2) & 0x3FF, (data >> 16) & 0xFF);
    parentObj.gfx.writeOAM(((address | 0) + 3) & 0x3FF, (data >> 24) & 0xFF);
}
GameBoyAdvanceMemory.prototype.writePalette8 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess8();
    parentObj.gfx.writePalette(address & 0x3FE, data | 0);
    parentObj.gfx.writePalette((address | 1) & 0x3FF, data | 0);
}
GameBoyAdvanceMemory.prototype.writePalette16 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess16();
    parentObj.gfx.writePalette(address & 0x3FF, data & 0xFF);
    parentObj.gfx.writePalette(((address | 0) + 1) & 0x3FF, data >> 8);
}
GameBoyAdvanceMemory.prototype.writePalette32 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess32();
    parentObj.gfx.writePalette(address & 0x3FF, data & 0xFF);
    parentObj.gfx.writePalette(((address | 0) + 1) & 0x3FF, (data >> 8) & 0xFF);
    parentObj.gfx.writePalette(((address | 0) + 2) & 0x3FF, (data >> 16) & 0xFF);
    parentObj.gfx.writePalette(((address | 0) + 3) & 0x3FF, (data >> 24) & 0xFF);
}
GameBoyAdvanceMemory.prototype.writeROM08 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM0Access8();
    parentObj.cartridge.writeROM8(address & 0x1FFFFFF, data | 0);
}
GameBoyAdvanceMemory.prototype.writeROM016 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM0Access16();
    parentObj.cartridge.writeROM8(address & 0x1FFFFFF, data & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 1) & 0x1FFFFFF, data >> 8);
}
GameBoyAdvanceMemory.prototype.writeROM032 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM0Access32();
    parentObj.cartridge.writeROM8(address & 0x1FFFFFF, data & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 1) & 0x1FFFFFF, (data >> 8) & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 2) & 0x1FFFFFF, (data >> 16) & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 3) & 0x1FFFFFF, (data >> 24) & 0xFF);
}
GameBoyAdvanceMemory.prototype.writeROM18 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM1Access8();
    parentObj.cartridge.writeROM8(address & 0x1FFFFFF, data | 0);
}
GameBoyAdvanceMemory.prototype.writeROM116 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM1Access16();
    parentObj.cartridge.writeROM8(address & 0x1FFFFFF, data & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 1) & 0x1FFFFFF, data >> 8);
}
GameBoyAdvanceMemory.prototype.writeROM132 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM1Access32();
    parentObj.cartridge.writeROM8(address & 0x1FFFFFF, data & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 1) & 0x1FFFFFF, (data >> 8) & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 2) & 0x1FFFFFF, (data >> 16) & 0xFF);
    parentObj.cartridge.writeROM8(((address | 0) + 3) & 0x1FFFFFF, (data >> 24) & 0xFF);
}
GameBoyAdvanceMemory.prototype.writeROM28 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM2Access8();
    parentObj.cartridge.writeROM8Space2(address & 0x1FFFFFF, data | 0);
}
GameBoyAdvanceMemory.prototype.writeROM216 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM2Access16();
    parentObj.cartridge.writeROM8Space2(address & 0x1FFFFFF, data & 0xFF);
    parentObj.cartridge.writeROM8Space2(((address | 0) + 1) & 0x1FFFFFF, data >> 8);
}
GameBoyAdvanceMemory.prototype.writeROM232 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.ROM2Access32();
    parentObj.cartridge.writeROM8Space2(address & 0x1FFFFFF, data & 0xFF);
    parentObj.cartridge.writeROM8Space2(((address | 0) + 1) & 0x1FFFFFF, (data >> 8) & 0xFF);
    parentObj.cartridge.writeROM8Space2(((address | 0) + 2) & 0x1FFFFFF, (data >> 16) & 0xFF);
    parentObj.cartridge.writeROM8Space2(((address | 0) + 3) & 0x1FFFFFF, (data >> 24) & 0xFF);
}
GameBoyAdvanceMemory.prototype.writeSRAM8 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.SRAMAccess();
    parentObj.saves.writeSRAM(address & 0xFFFF, data & 0xFF);
}
GameBoyAdvanceMemory.prototype.writeSRAM16 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.SRAMAccess();
    parentObj.saves.writeSRAM(address & 0xFFFF, (data >> ((address & 0x1) << 3)) & 0xFF);
}
GameBoyAdvanceMemory.prototype.writeSRAM32 = function (parentObj, address, data) {
    address = address | 0;
    data = data | 0;
    parentObj.wait.SRAMAccess();
    parentObj.saves.writeSRAM(address & 0xFFFF, (data >> ((address & 0x3) << 3)) & 0xFF);
}
GameBoyAdvanceMemory.prototype.NOP = function (parentObj, data) {
    //Ignore the data write...
}
GameBoyAdvanceMemory.prototype.writeUnused8 = function (parentObj, address, data) {
    //Ignore the data write...
    parentObj.wait.FASTAccess2();
}
GameBoyAdvanceMemory.prototype.writeUnused16 = function (parentObj, address, data) {
    //Ignore the data write...
    parentObj.wait.FASTAccess2();
}
GameBoyAdvanceMemory.prototype.writeUnused32 = function (parentObj, address, data) {
    //Ignore the data write...
    parentObj.wait.FASTAccess2();
}
GameBoyAdvanceMemory.prototype.remapWRAM = function (data) {
    data = data & 0x21;
    if ((data | 0) != (this.WRAMControlFlags | 0)) {
        if ((data & 0x01) == 0) {
            if ((data & 0x20) == 0x20) {
                //Use External RAM:
                this.memoryWriter8[2] = this.writeExternalWRAM8;
                this.memoryReader8[2] = this.readExternalWRAM8;
                this.memoryWriter16[2] = (this.externalRAM16) ? this.writeExternalWRAM16Optimized : this.writeExternalWRAM16Slow;
                this.memoryReader16[2] = (this.externalRAM16) ? this.readExternalWRAM16Optimized : this.readExternalWRAM16Slow;
                this.memoryWriter32[2] = (this.externalRAM32) ? this.writeExternalWRAM32Optimized : this.writeExternalWRAM32Slow;
                this.memoryReader32[2] = (this.externalRAM32) ? this.readExternalWRAM32Optimized : this.readExternalWRAM32Slow;
            }
            else {
                // Mirror Internal RAM to External:
                this.memoryWriter8[2] = this.writeInternalWRAM8;
                this.memoryReader8[2] = this.readInternalWRAM8;
                this.memoryWriter16[2] = (this.internalRAM16) ? this.writeInternalWRAM16Optimized : this.writeInternalWRAM16Slow;
                this.memoryReader16[2] = (this.internalRAM16) ? this.readInternalWRAM16Optimized : this.readInternalWRAM16Slow;
                this.memoryWriter32[2] = (this.internalRAM32) ? this.writeInternalWRAM32Optimized : this.writeInternalWRAM32Slow;
                this.memoryReader32[2] = (this.internalRAM32) ? this.readInternalWRAM32Optimized : this.readInternalWRAM32Slow;
            }
            this.memoryWriter8[3] = this.writeInternalWRAM8;
            this.memoryReader8[3] = this.readInternalWRAM8;
            this.memoryWriter16[3] = (this.internalRAM16) ? this.writeInternalWRAM16Optimized : this.writeInternalWRAM16Slow;
            this.memoryReader16[3] = (this.internalRAM16) ? this.readInternalWRAM16Optimized : this.readInternalWRAM16Slow;
            this.memoryWriter32[3] = (this.internalRAM32) ? this.writeInternalWRAM32Optimized : this.writeInternalWRAM32Slow;
            this.memoryReader32[3] = (this.internalRAM32) ? this.readInternalWRAM32Optimized : this.readInternalWRAM32Slow;
        }
        else {
            this.memoryWriter8[2] = this.memoryWriter8[3] = this.writeUnused8;
            this.memoryReader8[2] = this.memoryReader8[3] = this.readUnused8;
            this.memoryWriter16[2] = this.memoryWriter16[3] = this.writeUnused16;
            this.memoryReader16[2] = this.memoryReader16[3] = this.readUnused16;
            this.memoryWriter32[2] = this.memoryWriter32[3] = this.writeUnused32;
            this.memoryReader32[2] = this.memoryReader32[3] = this.readUnused32;
        }
        this.WRAMControlFlags = data | 0;
        this.checkMemoryCacheValidity();
    }
}
GameBoyAdvanceMemory.prototype.checkMemoryCacheValidity = function () {
    var length = this.memoryCaches.length | 0;
    for (var index = 0; (index | 0) < (length | 0); index = ((index | 0) + 1) | 0) {
        this.memoryCaches[index | 0].invalidateIfWRAM();
    }
}
GameBoyAdvanceMemory.prototype.addMemoryCacheRoot = function (root) {
    this.memoryCaches.push(root);
}
GameBoyAdvanceMemory.prototype.readBIOS8 = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    if ((address | 0) < 0x4000) {
        parentObj.wait.FASTAccess2();
        if ((parentObj.cpu.registers[15] | 0) < 0x4000) {
            //If reading from BIOS while executing it:
            parentObj.lastBIOSREAD[address & 0x3] = (parentObj.cpu.registers[15] >> ((address & 0x3) << 3)) & 0xFF;
            data = parentObj.BIOS[address & 0x3FFF] | 0;
        }
        else {
            //Not allowed to read from BIOS while executing outside of it:
            data = parentObj.lastBIOSREAD[address & 0x3] | 0;
        }
    }
    else {
        data = parentObj.readUnused8(parentObj, address | 0) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readBIOS16Slow = function (parentObj, address) {
    address = address | 0;
    if ((address | 0) < 0x4000) {
        parentObj.wait.FASTAccess2();
        if (parentObj.cpu.registers[15] < 0x4000) {
            //If reading from BIOS while executing it:
            parentObj.lastBIOSREAD[address & 0x3] = (parentObj.cpu.registers[15] >> ((address & 0x3) << 3)) & 0xFF;
            parentObj.lastBIOSREAD[(address + 1) & 0x3] = (parentObj.cpu.registers[15] >> (((address + 1) & 0x3) << 3)) & 0xFF;
            return parentObj.BIOS[address] | (parentObj.BIOS[address | 1] << 8);
        }
        else {
            //Not allowed to read from BIOS while executing outside of it:
            return parentObj.lastBIOSREAD[address & 0x2] | (parentObj.lastBIOSREAD[(address & 0x2) | 1] << 8);
        }
    }
    else {
        return parentObj.readUnused16(parentObj, address) | 0;
    }
}
GameBoyAdvanceMemory.prototype.readBIOS16Optimized = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    if ((address | 0) < 0x4000) {
        address >>= 1;
        parentObj.wait.FASTAccess2();
        if ((parentObj.cpu.registers[15] | 0) < 0x4000) {
            //If reading from BIOS while executing it:
            parentObj.lastBIOSREAD16[address & 0x1] = (parentObj.cpu.registers[15] >> ((address & 0x1) << 16)) & 0xFFFF;
            data = parentObj.BIOS16[address & 0x1FFF] | 0;
        }
        else {
            //Not allowed to read from BIOS while executing outside of it:
            data = parentObj.lastBIOSREAD16[address & 0x1] | 0;
        }
    }
    else {
        data = parentObj.readUnused16(parentObj, address | 0) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readBIOS32Slow = function (parentObj, address) {
    address = address | 0;
    if ((address | 0) < 0x4000) {
        parentObj.wait.FASTAccess2();
        if (parentObj.cpu.registers[15] < 0x4000) {
            //If reading from BIOS while executing it:
            parentObj.lastBIOSREAD[0] = parentObj.cpu.registers[15] & 0xFF;
            parentObj.lastBIOSREAD[1] = (parentObj.cpu.registers[15] >> 8) & 0xFF;
            parentObj.lastBIOSREAD[2] = (parentObj.cpu.registers[15] >> 16) & 0xFF;
            parentObj.lastBIOSREAD[3] = (parentObj.cpu.registers[15] >> 24) & 0xFF;
            return parentObj.BIOS[address] | (parentObj.BIOS[address | 1] << 8) | (parentObj.BIOS[address | 2] << 16)  | (parentObj.BIOS[address | 3] << 24);
        }
        else {
            //Not allowed to read from BIOS while executing outside of it:
            return parentObj.lastBIOSREAD[0] | (parentObj.lastBIOSREAD[1] << 8) | (parentObj.lastBIOSREAD[2] << 16) | (parentObj.lastBIOSREAD[3] << 24);
        }
    }
    else {
        return parentObj.readUnused32(parentObj, address);
    }
}
GameBoyAdvanceMemory.prototype.readBIOS32Optimized = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    if ((address | 0) < 0x4000) {
        address >>= 2;
        parentObj.wait.FASTAccess2();
        if ((parentObj.cpu.registers[15] | 0) < 0x4000) {
            //If reading from BIOS while executing it:
            parentObj.lastBIOSREAD32[0] = parentObj.cpu.registers[15] | 0;
            data = parentObj.BIOS32[address & 0xFFF] | 0;
        }
        else {
            //Not allowed to read from BIOS while executing outside of it:
            data = parentObj.lastBIOSREAD32[0] | 0;
        }
    }
    else {
        data = parentObj.readUnused32(parentObj, address | 0) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readExternalWRAM8 = function (parentObj, address) {
    address = address | 0;
    //External WRAM:
    parentObj.wait.WRAMAccess8();
    return parentObj.externalRAM[address & 0x3FFFF] | 0;
}
GameBoyAdvanceMemory.prototype.readExternalWRAM16Slow = function (parentObj, address) {
    //External WRAM:
    parentObj.wait.WRAMAccess16();
    return parentObj.externalRAM[address & 0x3FFFF] | (parentObj.externalRAM[(address + 1) & 0x3FFFF] << 8);
}
GameBoyAdvanceMemory.prototype.readExternalWRAM16Optimized = function (parentObj, address) {
    address = address | 0;
    //External WRAM:
    parentObj.wait.WRAMAccess16();
    return parentObj.externalRAM16[(address >> 1) & 0x1FFFF] | 0;
}
GameBoyAdvanceMemory.prototype.readExternalWRAM32Slow = function (parentObj, address) {
    //External WRAM:
    parentObj.wait.WRAMAccess32();
    return parentObj.externalRAM[address & 0x3FFFF] | (parentObj.externalRAM[(address + 1) & 0x3FFFF] << 8) | (parentObj.externalRAM[(address + 2) & 0x3FFFF] << 16) | (parentObj.externalRAM[(address + 3) & 0x3FFFF] << 24);
}
GameBoyAdvanceMemory.prototype.readExternalWRAM32Optimized = function (parentObj, address) {
    address = address | 0;
    //External WRAM:
    parentObj.wait.WRAMAccess32();
    return parentObj.externalRAM32[(address >> 2) & 0xFFFF] | 0;
}
GameBoyAdvanceMemory.prototype.readInternalWRAM8 = function (parentObj, address) {
    address = address | 0;
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    return parentObj.internalRAM[address & 0x7FFF] | 0;
}
GameBoyAdvanceMemory.prototype.readInternalWRAM16Slow = function (parentObj, address) {
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    return parentObj.internalRAM[address & 0x7FFF] | (parentObj.internalRAM[(address + 1) & 0x7FFF] << 8);
}
GameBoyAdvanceMemory.prototype.readInternalWRAM16Optimized = function (parentObj, address) {
    address = address | 0;
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    return parentObj.internalRAM16[(address >> 1) & 0x3FFF] | 0;
}
GameBoyAdvanceMemory.prototype.readInternalWRAM32Slow = function (parentObj, address) {
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    return parentObj.internalRAM[address & 0x7FFF] | (parentObj.internalRAM[(address + 1) & 0x7FFF] << 8) | (parentObj.internalRAM[(address + 2) & 0x7FFF] << 16) | (parentObj.internalRAM[(address + 3) & 0x7FFF] << 24);
}
GameBoyAdvanceMemory.prototype.readInternalWRAM32Optimized = function (parentObj, address) {
    address = address | 0;
    //Internal WRAM:
    parentObj.wait.FASTAccess2();
    return parentObj.internalRAM32[(address >> 2) & 0x1FFF] | 0;
}
GameBoyAdvanceMemory.prototype.readIODispatch8 = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    if ((address | 0) < 0x4000304) {
        //IO Read:
        parentObj.wait.FASTAccess2();
        data = parentObj.readIO8[address & 0x3FF](parentObj) | 0;
    }
    else if ((address & 0x4000800) == 0x4000800) {
        //WRAM wait state control:
        parentObj.wait.FASTAccess2();
        data = parentObj.wait.readConfigureWRAM8(address | 0) | 0;
    }
    else {
        data = parentObj.readUnused8(parentObj, address | 0) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readIODispatch16 = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    if ((address | 0) < 0x4000303) {
        //IO Read:
        parentObj.wait.FASTAccess2();
        address >>= 1;
        data = parentObj.readIO16[address & 0x1FF](parentObj) | 0;
    }
    else if ((address & 0x4000800) == 0x4000800) {
        //WRAM wait state control:
        parentObj.wait.FASTAccess2();
        data = parentObj.wait.readConfigureWRAM16(address | 0) | 0;
    }
    else {
        data = parentObj.readUnused16(parentObj, address | 0) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readIODispatch32 = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    if ((address | 0) < 0x4000301) {
        //IO Read:
        parentObj.wait.FASTAccess2();
        address >>= 2;
        data = parentObj.readIO32[address & 0xFF](parentObj) | 0;
    }
    else if ((address & 0x4000800) == 0x4000800) {
        //WRAM wait state control:
        parentObj.wait.FASTAccess2();
        data = parentObj.wait.readConfigureWRAM32() | 0;
    }
    else {
        data = parentObj.readUnused32(parentObj, address | 0) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readVRAM8 = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess8();
    if ((address & 0x10000) != 0) {
        data = parentObj.gfx.readVRAM(address & 0x17FFF) | 0;
    }
    else {
        data = parentObj.gfx.readVRAM(address & 0xFFFF) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readVRAM16 = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess16();
    if ((address & 0x10000) != 0) {
        data = parentObj.gfx.readVRAM16(address & 0x17FFF) | 0;
    }
    else {
        data = parentObj.gfx.readVRAM16(address & 0xFFFF) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readVRAM32 = function (parentObj, address) {
    address = address | 0;
    var data = 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess32();
    if ((address & 0x10000) != 0) {
        data = parentObj.gfx.readVRAM32(address & 0x17FFF) | 0;
    }
    else {
        data = parentObj.gfx.readVRAM32(address & 0xFFFF) | 0;
    }
    return data | 0;
}
GameBoyAdvanceMemory.prototype.readOAM8 = function (parentObj, address) {
    address = address | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.OAMAccess8();
    return parentObj.gfx.readOAM(address & 0x3FF) | 0;
}
GameBoyAdvanceMemory.prototype.readOAM16 = function (parentObj, address) {
    address = address | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.OAMAccess16();
    return parentObj.gfx.readOAM16(address & 0x3FF) | 0;
}
GameBoyAdvanceMemory.prototype.readOAM32 = function (parentObj, address) {
    address = address | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.OAMAccess32();
    return parentObj.gfx.readOAM32(address & 0x3FF) | 0;
}
GameBoyAdvanceMemory.prototype.readPalette8 = function (parentObj, address) {
    address = address | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess8();
    return parentObj.gfx.readPalette(address & 0x3FF);
}
GameBoyAdvanceMemory.prototype.readPalette16 = function (parentObj, address) {
    address = address | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess16();
    return parentObj.gfx.readPalette16(address & 0x3FF);
}
GameBoyAdvanceMemory.prototype.readPalette32 = function (parentObj, address) {
    address = address | 0;
    parentObj.IOCore.updateGraphicsClocking();
    parentObj.wait.VRAMAccess32();
    return parentObj.gfx.readPalette32(address & 0x3FF);
}
GameBoyAdvanceMemory.prototype.readROM08 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM0Access8();
    return parentObj.cartridge.readROM8(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM016 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM0Access16();
    return parentObj.cartridge.readROM16(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM032 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM0Access32();
    return parentObj.cartridge.readROM32(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM18 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM1Access8();
    return parentObj.cartridge.readROM8(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM116 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM1Access16();
    return parentObj.cartridge.readROM16(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM132 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM1Access32();
    return parentObj.cartridge.readROM32(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM28 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM2Access8();
    return parentObj.cartridge.readROM8(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM216 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM2Access16();
    return parentObj.cartridge.readROM16(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM232 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM2Access32();
    return parentObj.cartridge.readROM32(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM28 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM2Access8();
    return parentObj.cartridge.readROM8Space2(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM216 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM2Access16();
    return parentObj.cartridge.readROM16Space2(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readROM232 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.ROM2Access32();
    return parentObj.cartridge.readROM32Space2(address & 0x1FFFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readSRAM8 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.SRAMAccess();
    return parentObj.saves.readSRAM(address & 0xFFFF) | 0;
}
GameBoyAdvanceMemory.prototype.readSRAM16 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.SRAMAccess();
    return ((parentObj.saves.readSRAM(address & 0xFFFF) | 0) * 0x101) | 0;
}
GameBoyAdvanceMemory.prototype.readSRAM32 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.SRAMAccess();
    return ((parentObj.saves.readSRAM(address & 0xFFFF) | 0) * 0x1010101) | 0;
}
GameBoyAdvanceMemory.prototype.readZero = function (parentObj) {
    return 0;
}
GameBoyAdvanceMemory.prototype.readUnused8 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.FASTAccess2();
    var controller = ((parentObj.IOCore.systemStatus | 0) == 0) ? parentObj.cpu : parentObj.dma;
    return (controller.getCurrentFetchValue() >> ((address & 0x3) << 3)) & 0xFF;
}
GameBoyAdvanceMemory.prototype.readUnused16 = function (parentObj, address) {
    address = address | 0;
    parentObj.wait.FASTAccess2();
    var controller = ((parentObj.IOCore.systemStatus | 0) == 0) ? parentObj.cpu : parentObj.dma;
    return (controller.getCurrentFetchValue() >> ((address & 0x2) << 3)) & 0xFFFF;
}
GameBoyAdvanceMemory.prototype.readUnused32 = function (parentObj, address) {
    parentObj.wait.FASTAccess2();
    var controller = ((parentObj.IOCore.systemStatus | 0) == 0) ? parentObj.cpu : parentObj.dma;
    return controller.getCurrentFetchValue() | 0;
}
GameBoyAdvanceMemory.prototype.readUnused0 = function (parentObj) {
    var controller = ((parentObj.IOCore.systemStatus | 0) == 0) ? parentObj.cpu : parentObj.dma;
    return controller.getCurrentFetchValue() & 0xFF;
}
GameBoyAdvanceMemory.prototype.readUnused1 = function (parentObj) {
    var controller = ((parentObj.IOCore.systemStatus | 0) == 0) ? parentObj.cpu : parentObj.dma;
    return (controller.getCurrentFetchValue() >> 8) & 0xFF;
}
GameBoyAdvanceMemory.prototype.readUnused2 = function (parentObj) {
    var controller = ((parentObj.IOCore.systemStatus | 0) == 0) ? parentObj.cpu : parentObj.dma;
    return (controller.getCurrentFetchValue() >> 16) & 0xFF;
}
GameBoyAdvanceMemory.prototype.readUnused3 = function (parentObj) {
    var controller = ((parentObj.IOCore.systemStatus | 0) == 0) ? parentObj.cpu : parentObj.dma;
    return (controller.getCurrentFetchValue() >> 24) & 0xFF;
}
GameBoyAdvanceMemory.prototype.loadBIOS = function () {
    //Ensure BIOS is of correct length:
    if ((this.IOCore.BIOS.length | 0) == 0x4000) {
        this.IOCore.BIOSFound = true;
        for (var index = 0; (index | 0) < 0x4000; index = ((index | 0) + 1) | 0) {
            this.BIOS[index & 0x3FFF] = this.IOCore.BIOS[index & 0x3FFF] & 0xFF;
        }
    }
    else {
        this.IOCore.BIOSFound = false;
    }
}