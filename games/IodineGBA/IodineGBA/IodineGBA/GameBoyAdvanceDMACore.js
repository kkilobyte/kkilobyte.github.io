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
function GameBoyAdvanceDMA(IOCore) {
    this.IOCore = IOCore;
    this.initialize();
}
GameBoyAdvanceDMA.prototype.DMA_ENABLE_TYPE = [
    [            //DMA Channel 0 Mapping:
        0x1,
        0x2,
        0x4,
        0
    ],
    [            //DMA Channel 1 Mapping:
        0x1,
        0x2,
        0x4,
        0x8
    ],
    [            //DMA Channel 2 Mapping:
        0x1,
        0x2,
        0x4,
        0x10
    ],
    [            //DMA Channel 3 Mapping:
        0x1,
        0x2,
        0x4,
        0x20
    ],
];
GameBoyAdvanceDMA.prototype.DMA_REQUEST_TYPE = {
    PROHIBITED:        0,
    IMMEDIATE:        0x1,
    V_BLANK:        0x2,
    H_BLANK:        0x4,
    FIFO_A:            0x8,
    FIFO_B:            0x10,
    DISPLAY_SYNC:    0x20
}
GameBoyAdvanceDMA.prototype.initialize = function () {
    this.enabled = getUint8Array(4);
    this.pending = getUint8Array(4);
    this.source = getInt32Array(4);
    this.sourceShadow = getInt32Array(4);
    this.destination = getInt32Array(4);
    this.destinationShadow = getInt32Array(4);
    this.wordCount = getUint16Array(4);
    this.wordCountShadow = getUint16Array(4);
    this.irqFlagging = getUint8Array(4);
    this.dmaType = getUint8Array(4);
    this.is32Bit = getUint8Array(4);
    this.repeat = getUint8Array(4);
    this.sourceControl = getUint8Array(4);
    this.destinationControl = getUint8Array(4);
    //Game Pak DMA flag for DMA 3:
    this.gamePakDMA = false;
    this.currentMatch = -1;
    this.lastCurrentMatch = -1;
    this.fetch = 0;
    this.memoryAccessCache = new GameBoyAdvanceMemoryCache(this.IOCore.memory);
}
GameBoyAdvanceDMA.prototype.writeDMASource0 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.source[dmaChannel | 0] &= 0xFFFFFF00;
    this.source[dmaChannel | 0] |= data;
}
GameBoyAdvanceDMA.prototype.writeDMASource1 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.source[dmaChannel | 0] &= 0xFFFF00FF;
    this.source[dmaChannel | 0] |= data << 8;
}
GameBoyAdvanceDMA.prototype.writeDMASource2 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.source[dmaChannel | 0] &= 0xFF00FFFF;
    this.source[dmaChannel | 0] |= data << 16;
}
GameBoyAdvanceDMA.prototype.writeDMASource3 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.source[dmaChannel | 0] &= 0xFFFFFF;
    this.source[dmaChannel | 0] |= data << 24;
}
GameBoyAdvanceDMA.prototype.writeDMADestination0 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.destination[dmaChannel | 0] &= 0xFFFFFF00;
    this.destination[dmaChannel | 0] |= data;
}
GameBoyAdvanceDMA.prototype.writeDMADestination1 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.destination[dmaChannel | 0] &= 0xFFFF00FF;
    this.destination[dmaChannel | 0] |= data << 8;
}
GameBoyAdvanceDMA.prototype.writeDMADestination2 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.destination[dmaChannel | 0] &= 0xFF00FFFF;
    this.destination[dmaChannel | 0] |= data << 16;
}
GameBoyAdvanceDMA.prototype.writeDMADestination3 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.destination[dmaChannel | 0] &= 0xFFFFFF;
    this.destination[dmaChannel | 0] |= data << 24;
}
GameBoyAdvanceDMA.prototype.writeDMAWordCount0 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.wordCount[dmaChannel | 0] &= 0xFF00;
    this.wordCount[dmaChannel | 0] |= data;
}
GameBoyAdvanceDMA.prototype.writeDMAWordCount1 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.wordCount[dmaChannel | 0] &= 0xFF;
    this.wordCount[dmaChannel | 0] |= data << 8;
}
GameBoyAdvanceDMA.prototype.writeDMAControl0 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.destinationControl[dmaChannel | 0] = (data >> 5) & 0x3;
    this.sourceControl[dmaChannel | 0] &= 0x2;
    this.sourceControl[dmaChannel | 0] |= (data >> 7) & 0x1;
}
GameBoyAdvanceDMA.prototype.readDMAControl0 = function (dmaChannel) {
    dmaChannel = dmaChannel | 0;
    return ((this.sourceControl[dmaChannel | 0] & 0x01) << 7) | (this.destinationControl[dmaChannel | 0] << 5);
}
GameBoyAdvanceDMA.prototype.writeDMAControl1 = function (dmaChannel, data) {
    dmaChannel = dmaChannel | 0;
    data = data | 0;
    this.sourceControl[dmaChannel | 0] &= 0x1;
    this.sourceControl[dmaChannel | 0] |= (data & 0x1) << 1;
    this.repeat[dmaChannel | 0] = data & 0x2;
    this.is32Bit[dmaChannel | 0] = data & 0x4;
    if ((dmaChannel | 0) == 3) {
        this.gamePakDMA = ((data & 0x8) == 0x8);
    }
    this.dmaType[dmaChannel | 0] = (data >> 4) & 0x3;
    this.irqFlagging[dmaChannel | 0] = data & 0x40;
    if ((data | 0) > 0x7F) {
        if ((this.enabled[dmaChannel | 0] | 0) == 0) {
            this.enabled[dmaChannel | 0] = this.DMA_ENABLE_TYPE[dmaChannel | 0][this.dmaType[dmaChannel | 0] | 0] | 0;
            if ((this.enabled[dmaChannel | 0] | 0) > 0) {
                this.enableDMAChannel(dmaChannel | 0);
            }
        }
        /*else {
            this.enabled[dmaChannel | 0] = this.DMA_ENABLE_TYPE[dmaChannel | 0][this.dmaType[dmaChannel | 0] | 0] | 0;
            if ((this.enabled[dmaChannel | 0] | 0) > 0) {
                this.reconfigureDMAChannel(dmaChannel | 0);
            }
        }*/
    }
    else {
        this.enabled[dmaChannel | 0] = 0;
        //this.pending[dmaChannel | 0] = 0;
    }
}
GameBoyAdvanceDMA.prototype.readDMAControl1 = function (dmaChannel) {
    dmaChannel = dmaChannel | 0;
    return (((this.enabled[dmaChannel | 0] > 0) ? 0x80 : 0) |
            this.irqFlagging[dmaChannel | 0] |
            (this.dmaType[dmaChannel | 0] << 4) |
            (((dmaChannel | 0) == 3 && this.gamePakDMA) ? 0x8 : 0) |
            this.is32Bit[dmaChannel | 0] |
            this.repeat[dmaChannel | 0] |
            (this.sourceControl[dmaChannel | 0] >> 1)
    );
}
GameBoyAdvanceDMA.prototype.getCurrentFetchValue = function () {
    return this.fetch | 0;
}
GameBoyAdvanceDMA.prototype.enableDMAChannel = function (dmaChannel) {
    dmaChannel = dmaChannel | 0;
    if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.FIFO_A | 0)) {
        //Assert the FIFO A DMA request signal:
        this.IOCore.sound.checkFIFOAPendingSignal();
        //Direct Sound DMA Hardwired To Wordcount Of 4:
        this.wordCountShadow[1] = 0x4;
        //Destination Hardwired to 0x40000A0:
        this.destination[1] = 0x40000A0;
        //Bit-mode Hardwired to 32-bit:
        this.is32Bit[1] = 0x4;
    }
    else if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.FIFO_B | 0)) {
        //Assert the FIFO B DMA request signal:
        this.IOCore.sound.checkFIFOBPendingSignal();
        //Direct Sound DMA Hardwired To Wordcount Of 4:
        this.wordCountShadow[2] = 0x4;
        //Destination Hardwired to 0x40000A4:
        this.destination[2] = 0x40000A4;
        //Bit-mode Hardwired to 32-bit:
        this.is32Bit[2] = 0x4;
    }
    else {
        if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.IMMEDIATE | 0)) {
            //Flag immediate DMA transfers for processing now:
            this.pending[dmaChannel | 0] = this.DMA_REQUEST_TYPE.IMMEDIATE | 0;
            this.IOCore.flagStepper(0x1);
        }
        else if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.DISPLAY_SYNC | 0)) {
            //Only enable display sync if set on line 162:
            if ((this.IOCore.gfx.currentScanLine | 0) != 162) {
                this.enabled[dmaChannel | 0] = 0;
                return;
            }
        }
        //Shadow copy the word count:
        this.wordCountShadow[dmaChannel | 0] = this.wordCount[dmaChannel | 0] | 0;
    }
    //Shadow copy the source address:
    this.sourceShadow[dmaChannel | 0] = this.source[dmaChannel | 0] | 0;
    //Shadow copy the destination address:
    this.destinationShadow[dmaChannel | 0] = this.destination[dmaChannel | 0] | 0;
}
GameBoyAdvanceDMA.prototype.reconfigureDMAChannel = function (dmaChannel) {
    dmaChannel = dmaChannel | 0;
    if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.FIFO_A | 0)) {
        //Assert the FIFO A DMA request signal:
        this.IOCore.sound.checkFIFOAPendingSignal();
        //Direct Sound DMA Hardwired To Wordcount Of 4:
        this.wordCountShadow[1] = 0x4;
        //Destination Hardwired to 0x40000A0:
        this.destinationShadow[1] = 0x40000A0;
        //Bit-mode Hardwired to 32-bit:
        this.is32Bit[1] = 0x4;
    }
    else if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.FIFO_B | 0)) {
        //Assert the FIFO B DMA request signal:
        this.IOCore.sound.checkFIFOBPendingSignal();
        //Direct Sound DMA Hardwired To Wordcount Of 4:
        this.wordCountShadow[2] = 0x4;
        //Destination Hardwired to 0x40000A4:
        this.destinationShadow[2] = 0x40000A4;
        //Bit-mode Hardwired to 32-bit:
        this.is32Bit[2] = 0x4;
    }
    else {
        if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.IMMEDIATE | 0)) {
            //Flag immediate DMA transfers for processing now:
            this.pending[dmaChannel | 0] = this.DMA_REQUEST_TYPE.IMMEDIATE | 0;
            this.IOCore.flagStepper(0x1);
        }
        else if ((this.enabled[dmaChannel | 0] | 0) == (this.DMA_REQUEST_TYPE.DISPLAY_SYNC | 0)) {
            //Only enable display sync if set on line 162:
            if ((this.IOCore.gfx.currentScanLine | 0) != 162) {
                this.enabled[dmaChannel | 0] = 0;
            }
        }
    }
}
GameBoyAdvanceDMA.prototype.soundFIFOARequest = function () {
    this.requestDMA(this.DMA_REQUEST_TYPE.FIFO_A | 0);
}
GameBoyAdvanceDMA.prototype.soundFIFOBRequest = function () {
    this.requestDMA(this.DMA_REQUEST_TYPE.FIFO_B | 0);
}
GameBoyAdvanceDMA.prototype.gfxHBlankRequest = function () {
    this.requestDMA(this.DMA_REQUEST_TYPE.H_BLANK | 0);
}
GameBoyAdvanceDMA.prototype.gfxVBlankRequest = function () {
    this.requestDMA(this.DMA_REQUEST_TYPE.V_BLANK | 0);
}
GameBoyAdvanceDMA.prototype.gfxDisplaySyncRequest = function () {
    this.requestDMA(this.DMA_REQUEST_TYPE.DISPLAY_SYNC | 0);
}
GameBoyAdvanceDMA.prototype.gfxDisplaySyncKillRequest = function () {
    this.enabled[3] &= ~this.DMA_REQUEST_TYPE.DISPLAY_SYNC;
}
GameBoyAdvanceDMA.prototype.requestDMA = function (DMAType) {
    for (var dmaPriority = 0; (dmaPriority | 0) < 4; dmaPriority = ((dmaPriority | 0) + 1) | 0) {
        if ((this.enabled[dmaPriority | 0] & DMAType) == (DMAType | 0)) {
            this.pending[dmaPriority | 0] = DMAType | 0;
            this.IOCore.flagStepper(0x1);
        }
    }
}
GameBoyAdvanceDMA.prototype.perform = function () {
    //Solve for the highest priority DMA to process:
    for (var dmaPriority = 0; (dmaPriority | 0) < 4; dmaPriority = ((dmaPriority | 0) + 1) | 0) {
        this.currentMatch = this.enabled[dmaPriority | 0] & this.pending[dmaPriority | 0];
        if ((this.currentMatch | 0) != 0) {
            if ((this.currentMatch | 0) != (this.lastCurrentMatch | 0)) {
                //Re-broadcasting on address bus, so non-seq:
                this.IOCore.wait.NonSequentialBroadcast();
                this.lastCurrentMatch = this.currentMatch | 0;
            }
            this.handleDMACopy(dmaPriority | 0);
            return false;
        }
    }
    //If no DMA was processed, then the DMA period has ended:
    this.lastCurrentMatch = -1;
    return true;
}
GameBoyAdvanceDMA.prototype.handleDMACopy = function (dmaChannel) {
    dmaChannel = dmaChannel | 0;
    //Get the addesses:
    var source = this.sourceShadow[dmaChannel | 0] | 0;
    var destination = this.destinationShadow[dmaChannel | 0] | 0;
    //Transfer Data:
    if ((this.is32Bit[dmaChannel | 0] | 0) == 4) {
        //32-bit Transfer:
        this.fetch = this.memoryAccessCache.memoryRead32(source | 0) | 0;
        this.memoryAccessCache.memoryWrite32(destination | 0, this.fetch | 0);
        this.decrementWordCount(dmaChannel | 0, source | 0, destination | 0, 4);
    }
    else {
        //16-bit Transfer:
        this.fetch = this.memoryAccessCache.memoryRead16(source | 0) | 0;
        this.memoryAccessCache.memoryWrite16(destination | 0, this.fetch | 0);
        this.fetch |= this.fetch << 16;    //Mirror extreme edge case?
        this.decrementWordCount(dmaChannel | 0, source | 0, destination | 0, 2);
    }
}
GameBoyAdvanceDMA.prototype.decrementWordCount = function (dmaChannel, source, destination, transferred) {
    dmaChannel = dmaChannel | 0;
    source = source | 0;
    destination = destination | 0;
    transferred = transferred | 0;
    //Decrement the word count:
    var wordCountShadow = ((this.wordCountShadow[dmaChannel | 0] | 0) - 1) & (((dmaChannel | 0) < 3) ? 0x3FFF : 0xFFFF);
    if ((wordCountShadow | 0) == 0) {
        //DMA transfer ended, handle accordingly:
        wordCountShadow = this.finalizeDMA(dmaChannel | 0, source | 0, destination | 0, transferred | 0) | 0;
    }
    else {
        //Update addresses:
        this.incrementDMAAddresses(dmaChannel | 0, source | 0, destination | 0, transferred | 0);
    }
    //Save the new word count:
    this.wordCountShadow[dmaChannel | 0] = wordCountShadow | 0;
}
GameBoyAdvanceDMA.prototype.finalizeDMA = function (dmaChannel, source, destination, transferred) {
    dmaChannel = dmaChannel | 0;
    source = source | 0;
    destination = destination | 0;
    transferred = transferred | 0;
    var wordCountShadow = 0;
    //Reset pending requests:
    this.pending[dmaChannel | 0] = 0;
    //Check Repeat Status:
    if ((this.repeat[dmaChannel | 0] | 0) == 0 || (this.currentMatch | 0) == (this.DMA_REQUEST_TYPE.IMMEDIATE | 0)) {
        //Disable the enable bit:
        this.enabled[dmaChannel | 0] = 0;
    }
    else {
        //Repeating the dma:
        if ((this.currentMatch | 0) == (this.DMA_REQUEST_TYPE.FIFO_A | 0)) {
            //Assert the FIFO A DMA request signal:
            this.IOCore.sound.checkFIFOAPendingSignal();
            //Direct Sound DMA Hardwired To Wordcount Of 4:
            wordCountShadow = 0x4;
        }
        else if ((this.currentMatch | 0) == (this.DMA_REQUEST_TYPE.FIFO_B | 0)) {
            //Assert the FIFO B DMA request signal:
            this.IOCore.sound.checkFIFOBPendingSignal();
            //Direct Sound DMA Hardwired To Wordcount Of 4:
            wordCountShadow = 0x4;
        }
        else {
            //Reload word count:
            wordCountShadow = this.wordCount[dmaChannel | 0] | 0;
        }
    }
    //Check to see if we should flag for IRQ:
    this.checkIRQTrigger(dmaChannel | 0);
    //Update addresses:
    this.finalDMAAddresses(dmaChannel | 0, source | 0, destination | 0, transferred | 0);
    return wordCountShadow | 0;
}
GameBoyAdvanceDMA.prototype.checkIRQTrigger = function (dmaChannel) {
    dmaChannel = dmaChannel | 0;
    if ((this.irqFlagging[dmaChannel | 0] | 0) == 0x40) {
        switch (dmaChannel | 0) {
            case 0:
                this.IOCore.irq.requestIRQ(0x100);
                break;
            case 1:
                this.IOCore.irq.requestIRQ(0x200);
                break;
            case 2:
                this.IOCore.irq.requestIRQ(0x400);
                break;
            case 3:
                this.IOCore.irq.requestIRQ(0x800);
        }
    }
}
GameBoyAdvanceDMA.prototype.finalDMAAddresses = function (dmaChannel, source, destination, transferred) {
    dmaChannel = dmaChannel | 0;
    source = source | 0;
    destination = destination | 0;
    transferred = transferred | 0;
    //Update source address:
    switch (this.sourceControl[dmaChannel | 0] | 0) {
        case 0:    //Increment
            this.sourceShadow[dmaChannel | 0] = ((source | 0) + (transferred | 0)) | 0;
            break;
        case 1:    //Decrement
            this.sourceShadow[dmaChannel | 0] = ((source | 0) - (transferred | 0)) | 0;
    }
    //Don't update destination if in FIFO DMA mode:
    if ((this.currentMatch | 0) != (this.DMA_REQUEST_TYPE.FIFO_A | 0) && (this.currentMatch | 0) != (this.DMA_REQUEST_TYPE.FIFO_B | 0)) {
        //Update destination address:
        switch (this.destinationControl[dmaChannel | 0] | 0) {
            case 0:    //Increment
                this.destinationShadow[dmaChannel | 0] = ((destination | 0) + (transferred | 0)) | 0;
                break;
            case 1:    //Decrement
                this.destinationShadow[dmaChannel | 0] = ((destination | 0) - (transferred | 0)) | 0;
                break;
            case 3:    //Reload
                this.destinationShadow[dmaChannel | 0] = this.destination[dmaChannel | 0] | 0;
        }
    }
}
GameBoyAdvanceDMA.prototype.incrementDMAAddresses = function (dmaChannel, source, destination, transferred) {
    dmaChannel = dmaChannel | 0;
    source = source | 0;
    destination = destination | 0;
    transferred = transferred | 0;
    //Update source address:
    switch (this.sourceControl[dmaChannel | 0] | 0) {
        case 0:    //Increment
            this.sourceShadow[dmaChannel | 0] = ((source | 0) + (transferred | 0)) | 0;
            break;
        case 1:
            this.sourceShadow[dmaChannel | 0] = ((source | 0) - (transferred | 0)) | 0;
    }
    //Don't update destination if in FIFO DMA mode:
    if ((this.currentMatch | 0) != (this.DMA_REQUEST_TYPE.FIFO_A | 0) && (this.currentMatch | 0) != (this.DMA_REQUEST_TYPE.FIFO_B | 0)) {
        //Update destination address:
        switch (this.destinationControl[dmaChannel | 0] | 0) {
            case 0:    //Increment
            case 3:    //Increment
                this.destinationShadow[dmaChannel | 0] = ((destination | 0) + (transferred | 0)) | 0;
                break;
            case 1:    //Decrement
                this.destinationShadow[dmaChannel | 0] = ((destination | 0) - (transferred | 0)) | 0;
        }
    }
}
GameBoyAdvanceDMA.prototype.nextEventTime = function () {
    var clocks = -1;
    var workbench = -1;
    for (var dmaChannel = 0; (dmaChannel | 0) < 4; dmaChannel = ((dmaChannel | 0) + 1) | 0) {
        switch (this.enabled[dmaChannel | 0] | 0) {
            //V_BLANK
            case 0x2:
                workbench = this.IOCore.gfx.nextVBlankEventTime() | 0;
                break;
            //H_BLANK:
            case 0x4:
                workbench = this.IOCore.gfx.nextHBlankDMAEventTime() | 0;
                break;
            //FIFO_A:
            case 0x8:
                workbench = this.IOCore.sound.nextFIFOAEventTime() | 0;
                break;
            //FIFO_B:
            case 0x10:
                workbench = this.IOCore.sound.nextFIFOBEventTime() | 0;
                break;
            //DISPLAY_SYNC:
            case 0x20:
                workbench = this.IOCore.gfx.nextDisplaySyncEventTime() | 0;
        }
        clocks = (((clocks | 0) > -1) ? (((workbench | 0) > -1) ? Math.min(clocks | 0, workbench | 0) : (clocks | 0)) : (workbench | 0)) | 0;
    }
    return clocks | 0;
}
GameBoyAdvanceDMA.prototype.nextIRQEventTime = function (dmaChannel) {
    dmaChannel = dmaChannel | 0;
    var clocks = -1;
    if ((this.irqFlagging[dmaChannel | 0] | 0) == 0x40) {
        switch (this.enabled[dmaChannel | 0] | 0) {
            //V_BLANK
            case 0x2:
                clocks = this.IOCore.gfx.nextVBlankEventTime() | 0;
                break;
            //H_BLANK:
            case 0x4:
                clocks = this.IOCore.gfx.nextHBlankDMAEventTime() | 0;
                break;
            //FIFO_A:
            case 0x8:
                clocks = this.IOCore.sound.nextFIFOAEventTime() | 0;
                break;
            //FIFO_B:
            case 0x10:
                clocks = this.IOCore.sound.nextFIFOBEventTime() | 0;
                break;
            //DISPLAY_SYNC:
            case 0x20:
                clocks = this.IOCore.gfx.nextDisplaySyncEventTime() | 0;
        }
    }
    return clocks | 0;
}
GameBoyAdvanceDMA.prototype.nextDMA0IRQEventTime = function () {
    return this.nextIRQEventTime(0) | 0;
}
GameBoyAdvanceDMA.prototype.nextDMA1IRQEventTime = function () {
    return this.nextIRQEventTime(1) | 0;
}
GameBoyAdvanceDMA.prototype.nextDMA2IRQEventTime = function () {
    return this.nextIRQEventTime(2) | 0;
}
GameBoyAdvanceDMA.prototype.nextDMA3IRQEventTime = function () {
    return this.nextIRQEventTime(3) | 0;
}