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
function GameBoyAdvanceBGTEXTRenderer(gfx, BGLayer) {
    this.gfx = gfx;
    this.VRAM = this.gfx.VRAM;
    this.VRAM16 = this.gfx.VRAM16;
    this.fetchTile = (this.VRAM16) ? this.fetchTileOptimized : this.fetchTileNormal;
    this.palette16 = this.gfx.palette16;
    this.palette256 = this.gfx.palette256;
    this.BGLayer = BGLayer | 0;
    this.initialize();
}
GameBoyAdvanceBGTEXTRenderer.prototype.initialize = function () {
    this.scratchBuffer = getInt32Array(248);
    this.BGXCoord = 0;
    this.BGYCoord = 0;
    this.palettePreprocess();
    this.screenSizePreprocess();
    this.priorityPreprocess();
    this.screenBaseBlockPreprocess();
    this.characterBaseBlockPreprocess();
}
GameBoyAdvanceBGTEXTRenderer.prototype.renderScanLine = function (line) {
    line = line | 0;
    if (this.gfx.BGMosaic[this.BGLayer & 3]) {
        //Correct line number for mosaic:
        line = ((line | 0) - (this.gfx.mosaicRenderer.getMosaicYOffset(line | 0) | 0)) | 0;
    }
    var yTileOffset = ((line | 0) + (this.BGYCoord | 0)) & 0x7;
    var pixelPipelinePosition = this.BGXCoord & 0x7;
    var yTileStart = ((line | 0) + (this.BGYCoord | 0)) >> 3;
    var xTileStart = this.BGXCoord >> 3;
    for (var position = 0, chrData = 0; (position | 0) < 240;) {
        chrData = this.fetchTile(yTileStart | 0, xTileStart | 0) | 0;
        xTileStart = ((xTileStart | 0) + 1) | 0;
        while ((pixelPipelinePosition | 0) < 0x8) {
            this.scratchBuffer[position | 0] = this.priorityFlag | this.fetchVRAM(chrData | 0, pixelPipelinePosition | 0, yTileOffset | 0);
            pixelPipelinePosition = ((pixelPipelinePosition | 0) + 1) | 0;
            position = ((position | 0) + 1) | 0;
        }
        pixelPipelinePosition &= 0x7;
    }
    if (this.gfx.BGMosaic[this.BGLayer & 3]) {
        //Pixelize the line horizontally:
        this.gfx.mosaicRenderer.renderMosaicHorizontal(this.scratchBuffer);
    }
    return this.scratchBuffer;
}
GameBoyAdvanceBGTEXTRenderer.prototype.fetchTileNormal = function (yTileStart, xTileStart) {
    //Find the tile code to locate the tile block:
    var address = ((this.computeTileNumber(yTileStart, xTileStart) | this.BGScreenBaseBlock) << 1) & 0xFFFF;
    return (this.VRAM[address | 1] << 8) | this.VRAM[address];
}
GameBoyAdvanceBGTEXTRenderer.prototype.fetchTileOptimized = function (yTileStart, xTileStart) {
    yTileStart = yTileStart | 0;
    xTileStart = xTileStart | 0;
    //Find the tile code to locate the tile block:
    var address = this.computeTileNumber(yTileStart | 0, xTileStart | 0) | this.BGScreenBaseBlock;
    return this.VRAM16[address & 0x7FFF] | 0;
}
GameBoyAdvanceBGTEXTRenderer.prototype.computeTileNumber = function (yTile, xTile) {
    //Return the true tile number:
    yTile = yTile | 0;
    xTile = xTile | 0;
    var tileNumber = xTile & 0x1F;
    switch (this.tileMode | 0) {
        //1x1
        case 0:
            tileNumber = (tileNumber | 0) | ((yTile & 0x1F) << 5);
            break;
        //2x1
        case 1:
            tileNumber = (tileNumber | 0) | (((xTile & 0x20) | (yTile & 0x1F)) << 5);
            break;
        //1x2
        case 2:
            tileNumber = (tileNumber | 0) | ((yTile & 0x3F) << 5);
            break;
        //2x2
        case 3:
            tileNumber = (tileNumber | 0) | (((xTile & 0x20) | (yTile & 0x1F)) << 5) | ((yTile & 0x20) << 6);
    }
    return tileNumber | 0;
}
GameBoyAdvanceBGTEXTRenderer.prototype.fetch4BitVRAM = function (chrData, xOffset, yOffset) {
    //16 color tile mode:
    chrData = chrData | 0;
    xOffset = xOffset | 0;
    yOffset = yOffset | 0;
    //Parse flip attributes, grab palette, and then output pixel:
    var address = (chrData & 0x3FF) << 5;
    address = ((address | 0) + (this.BGCharacterBaseBlock | 0)) | 0;
    address = ((address | 0) + ((((chrData & 0x800) == 0x800) ? (0x7 - (yOffset | 0)) : (yOffset | 0)) << 2));
    address = ((address | 0) + ((((chrData & 0x400) == 0x400) ? (0x7 - (xOffset | 0)) : (xOffset | 0)) >> 1));
    address = this.VRAM[address & 0xFFFF] | 0;
    if ((xOffset & 0x1) != ((chrData & 0x400) >> 10)) {
        address = address >> 4;
    }
    address = ((chrData >> 8) & 0xF0) | (address & 0xF);
    return this.palette16[address & 0xFF] | 0;
}
GameBoyAdvanceBGTEXTRenderer.prototype.fetch8BitVRAM = function (chrData, xOffset, yOffset) {
    //256 color tile mode:
    chrData = chrData | 0;
    xOffset = xOffset | 0;
    yOffset = yOffset | 0;
    //Parse flip attributes and output pixel:
    var address = (chrData & 0x3FF) << 6;
    address = ((address | 0) + (this.BGCharacterBaseBlock | 0)) | 0;
    address = ((address | 0) + ((((chrData & 0x800) == 0x800) ? (0x7 - (yOffset | 0)) : (yOffset | 0)) << 3)) | 0;
    address = ((address | 0) + ((((chrData & 0x400) == 0x400) ? (0x7 - (xOffset | 0)) : (xOffset | 0)) | 0)) | 0;
    return this.palette256[this.VRAM[address & 0xFFFF] & 0xFF] | 0;
}
GameBoyAdvanceBGTEXTRenderer.prototype.palettePreprocess = function () {
    //Make references:
    if (this.gfx.BGPalette256[this.BGLayer & 3]) {
        this.fetchVRAM = this.fetch8BitVRAM;
    }
    else {
        this.fetchVRAM = this.fetch4BitVRAM;
    }
}
GameBoyAdvanceBGTEXTRenderer.prototype.screenSizePreprocess = function () {
    this.tileMode = this.gfx.BGScreenSize[this.BGLayer & 0x3] | 0;
}
GameBoyAdvanceBGTEXTRenderer.prototype.priorityPreprocess = function () {
    this.priorityFlag = (this.gfx.BGPriority[this.BGLayer & 3] << 23) | (1 << (this.BGLayer | 0x10));
}
GameBoyAdvanceBGTEXTRenderer.prototype.screenBaseBlockPreprocess = function () {
    this.BGScreenBaseBlock = this.gfx.BGScreenBaseBlock[this.BGLayer & 3] << 10;
}
GameBoyAdvanceBGTEXTRenderer.prototype.characterBaseBlockPreprocess = function () {
    this.BGCharacterBaseBlock = this.gfx.BGCharacterBaseBlock[this.BGLayer & 3] << 14;
}
GameBoyAdvanceBGTEXTRenderer.prototype.writeBGHOFS0 = function (data) {
    data = data | 0;
    this.BGXCoord = (this.BGXCoord & 0x100) | data;
}
GameBoyAdvanceBGTEXTRenderer.prototype.writeBGHOFS1 = function (data) {
    data = data | 0;
    this.BGXCoord = ((data & 0x01) << 8) | (this.BGXCoord & 0xFF);
}
GameBoyAdvanceBGTEXTRenderer.prototype.writeBGVOFS0 = function (data) {
    data = data | 0;
    this.BGYCoord = (this.BGYCoord & 0x100) | data;
}
GameBoyAdvanceBGTEXTRenderer.prototype.writeBGVOFS1 = function (data) {
    data = data | 0;
    this.BGYCoord = ((data & 0x01) << 8) | (this.BGYCoord & 0xFF);
}