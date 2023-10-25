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
function DynarecBranchListenerCore(CPUCore) {
    this.CPUCore = CPUCore;
    this.initialize();
}
DynarecBranchListenerCore.prototype.MAX_WORKERS = 1;
DynarecBranchListenerCore.prototype.initialize = function () {
    this.lastBranch = 0;
    this.lastTHUMB = false;
    this.caches = {};
    this.currentCache = null;
    this.backEdge = false;
    this.workers = [];
    this.generateWorkerCache();
}
DynarecBranchListenerCore.prototype.generateWorkerCache = function () {
    try {
        for (var index = 0; index < this.MAX_WORKERS; index++) {
            var newWorker = new Worker("IodineGBA/IodineGBA/CPU/dynarec/DynarecCompilerWorkerCore.js");
            this.workers.push(newWorker);
        }
    }
    catch (error) {
        this.CPUCore.settings.useWorkers = false;
    }
}
DynarecBranchListenerCore.prototype.getFreeWorker = function () {
    return this.workers.pop();
}
DynarecBranchListenerCore.prototype.returnFreeWorker = function (oldWorker) {
    return this.workers.push(oldWorker);
}
DynarecBranchListenerCore.prototype.hasFreeWorker = function () {
    return (this.workers.length > 0);
}
DynarecBranchListenerCore.prototype.listen = function (oldPC, newPC, instructionmode) {
    if ((this.CPUCore.settings.dynarecTHUMB && instructionmode) || (this.CPUCore.settings.dynarecARM && !instructionmode)) {
        this.analyzePast(oldPC >>> 0, instructionmode);
        this.handleNext(newPC >>> 0, instructionmode);
    }
    else {
        this.backEdge = false;
    }
}
DynarecBranchListenerCore.prototype.analyzePast = function (endPC, instructionmode) {
    endPC = endPC >>> 0;
    instructionmode = !!instructionmode;
    if (this.backEdge) {
        var cache = this.findCache(this.lastBranch >>> 0, !!instructionmode);
        if (!cache) {
            cache = new DynarecCacheManagerCore(this, this.lastBranch >>> 0, endPC >>> 0, !!this.lastTHUMB);
            this.cacheAppend(cache);
        }
        cache.tickHotness();
    }
    this.backEdge = true;
}
DynarecBranchListenerCore.prototype.handleNext = function (newPC, instructionmode) {
    this.lastBranch = newPC >>> 0;
    this.lastTHUMB = !!instructionmode;
    if (this.isAddressSafe(newPC >>> 0)) {
        var cache = this.findCache(newPC >>> 0, !!instructionmode);
        if (cache && cache.ready()) {
            this.CPUCore.IOCore.preprocessCPUHandler(1);
            this.currentCache = cache;
        }
    }
    else {
        this.backEdge = false;
    }
}
DynarecBranchListenerCore.prototype.handleNextWithStatus = function (newPC, instructionmode) {
    this.lastBranch = newPC >>> 0;
    this.lastTHUMB = !!instructionmode;
    if (this.isAddressSafe(newPC >>> 0)) {
        var cache = this.findCache(newPC >>> 0, !!instructionmode);
        if (cache && cache.ready()) {
            this.CPUCore.IOCore.preprocessCPUHandler(1);
            this.currentCache = cache;
            return true;
        }
    }
    else {
        this.backEdge = false;
    }
    return false;
}
DynarecBranchListenerCore.prototype.attachNextCache = function (cache) {
    this.CPUCore.IOCore.preprocessCPUHandler(1);
    this.currentCache = cache;
}
DynarecBranchListenerCore.prototype.enter = function () {
   if (this.CPUCore.settings.dynarecEnabled) {
       //Execute our compiled code:
       this.currentCache.execute();
   }
}
DynarecBranchListenerCore.prototype.isAddressSafe = function (address) {
    address = address >>> 0;
    if (address < 0xE000000) {
        if (address < 0x4000000) {
            if (address >= 0x2000000) {
                return true;
            }
            else if (this.CPUCore.IOCore.BIOSFound && address >= 0x20 && address < 0x4000) {
                return true;
            }
        }
        else if (address >= 0x8000000) {
            return true;
        }
    }
    return false;
}
DynarecBranchListenerCore.prototype.cacheAppend = function (cache) {
    this.caches[((cache.InTHUMB) ? "thumb_" : "arm_") + (cache.start >>> 0)] = cache;
}
DynarecBranchListenerCore.prototype.findCache = function (address, InTHUMB) {
    address = address >>> 0;
    InTHUMB = !!InTHUMB;
    return this.caches[((InTHUMB) ? "thumb_" : "arm_") + (address >>> 0)];
}