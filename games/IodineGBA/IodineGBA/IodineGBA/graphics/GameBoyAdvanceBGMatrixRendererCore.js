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
function GameBoyAdvanceBGMatrixRenderer(gfx, BGLayer) {
    this.gfx = gfx;
    this.BGLayer = BGLayer | 0;
    this.VRAM = this.gfx.VRAM;
    this.palette = this.gfx.palette256;
    this.transparency = this.gfx.transparency | 0;
    this.bgAffineRenderer = this.gfx.bgAffineRenderer[BGLayer & 0x1];
    this.fetchTile = (Math.imul) ? this.fetchTileOptimized : this.fetchTileSlow;
    this.screenSizePreprocess();
    this.screenBaseBlockPreprocess();
    this.characterBaseBlockPreprocess();
    this.displayOverflowPreprocess();
}
GameBoyAdvanceBGMatrixRenderer.prototype.renderScanLine = function (line) {
    line = line | 0;
    return this.bgAffineRenderer.renderScanLine(line | 0, this);
}
GameBoyAdvanceBGMatrixRenderer.prototype.fetchTileSlow = function (x, y, mapSize) {
    //Compute address for tile VRAM to address:
    var tileNumber = x + (y * mapSize);
    return this.VRAM[((tileNumber | 0) + (this.BGScreenBaseBlock | 0)) & 0xFFFF];
}
GameBoyAdvanceBGMatrixRenderer.prototype.fetchTileOptimized = function (x, y, mapSize) {
    //Compute address for tile VRAM to address:
    x = x | 0;
    y = y | 0;
    mapSize = mapSize | 0;
    var tileNumber = ((x | 0) + Math.imul(y | 0, mapSize | 0)) | 0;
    return this.VRAM[((tileNumber | 0) + (this.BGScreenBaseBlock | 0)) & 0xFFFF] | 0;
}
GameBoyAdvanceBGMatrixRenderer.prototype.computeScreenAddress = function (x, y) {
    //Compute address for character VRAM to address:
    x = x | 0;
    y = y | 0;
    var address = this.fetchTile(x >> 3, y >> 3, this.mapSize | 0) << 6;
    address = ((address | 0) + (this.BGCharacterBaseBlock | 0)) | 0;
    address = ((address | 0) + ((y & 0x7) << 3)) | 0;
    address = ((address | 0) + (x & 0x7)) | 0;
    return address | 0;
}
GameBoyAdvanceBGMatrixRenderer.prototype.fetchPixel = function (x, y) {
    //Fetch the pixel:
    x = x | 0;
    y = y | 0;
    var mapSizeComparer = this.mapSizeComparer | 0;
    var overflowX = x & mapSizeComparer;
    var overflowY = y & mapSizeComparer;
    //Output pixel:
    if ((x | 0) != (overflowX | 0) || (y | 0) != (overflowY | 0)) {
        //Overflow Handling:
        if (this.BGDisplayOverflow) {
            //Overflow Back:
            x = overflowX | 0;
            y = overflowY | 0;
        }
        else {
            //Out of bounds with no overflow allowed:
            return this.transparency | 0;
        }
    }
    var address = this.computeScreenAddress(x | 0, y | 0) | 0;
    return this.palette[this.VRAM[address & 0xFFFF] | 0] | 0;
}
GameBoyAdvanceBGMatrixRenderer.prototype.screenSizePreprocess = function () {
    this.mapSize = 0x10 << (this.gfx.BGScreenSize[this.BGLayer & 3] | 0);
    this.mapSizeComparer = ((this.mapSize << 3) - 1) | 0;
}
GameBoyAdvanceBGMatrixRenderer.prototype.screenBaseBlockPreprocess = function () {
    this.BGScreenBaseBlock = this.gfx.BGScreenBaseBlock[this.BGLayer & 3] << 11;
}
GameBoyAdvanceBGMatrixRenderer.prototype.characterBaseBlockPreprocess = function () {
    this.BGCharacterBaseBlock = this.gfx.BGCharacterBaseBlock[this.BGLayer & 3] << 14;
}
GameBoyAdvanceBGMatrixRenderer.prototype.displayOverflowPreprocess = function () {
    this.BGDisplayOverflow = this.gfx.BGDisplayOverflow[this.BGLayer & 3];
}