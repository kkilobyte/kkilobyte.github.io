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
function GameBoyAdvanceEmulator() {
    this.settings = {
        "slowDownBusHack":false,            //Double up wait states hack.
        "SKIPBoot":false,                   //Skip the BIOS boot screen.
        "dynarecEnabled":false,             //Use the dynarec engine?
        "lineSkip":false,                   //Skip every other line draw.
        "dynarecTHUMB":true,                //Enable THUMB compiling.
        "dynarecARM":false,                 //Enable ARM compiling.
        "useWorkers":true,                  //Enable Web Workers for compiling.
        "audioVolume":1,                    //Starting audio volume.
        "audioBufferUnderrunLimit":4,       //Audio buffer minimum span amount over x interpreter iterations.
        "audioBufferSize":20,               //Audio buffer maximum span amount over x interpreter iterations.
        "timerIntervalRate":16,             //How often the emulator core is called into (in milliseconds).
        "emulatorSpeed":1                   //Speed multiplier of the emulator.
    }
    this.audioFound = false;                  //Do we have audio output sink found yet?
    this.romFound = false;                    //Do we have a ROM loaded in?
    this.faultFound = false;                  //Did we run into a fatal error?
    this.paused = true;                       //Are we paused?
    this.offscreenWidth = 240;                //Width of the GBA screen.
    this.offscreenHeight = 160;               //Height of the GBA screen.
    this.BIOS = [];                           //Initialize BIOS as not existing.
    this.ROM = [];                            //Initialize BIOS as not existing.
    //Cache some frame buffer lengths:
    this.offscreenRGBCount = this.offscreenWidth * this.offscreenHeight * 3;
    //Graphics buffers to generate in advance:
    this.frameBuffer = getInt32Array(this.offscreenRGBCount);        //The internal buffer to composite to.
    this.swizzledFrame = getUint8Array(this.offscreenRGBCount);      //The swizzled output buffer that syncs to the internal framebuffer on v-blank.
    this.audioUpdateState = false;            //Do we need to update the sound core with new info?
    this.saveExportHandler = null;            //Save export handler attached by GUI.
    this.saveImportHandler = null;            //Save import handler attached by GUI.
    this.graphicsFrameCallback = null;        //Graphics blitter handler attached by GUI.
    this.metricStart = null;                  //Date object reference.
    this.calculateTimings();                  //Calculate some multipliers against the core emulator timer.
    this.generateCoreExposed();               //Generate a limit API for the core to call this shell object.
}
GameBoyAdvanceEmulator.prototype.generateCoreExposed = function () {
    var parentObj = this;
    this.coreExposed = {
        "outputAudio":function (l, r) {
            parentObj.outputAudio(l, r);
        },
        "frameBuffer":parentObj.frameBuffer,
        "prepareFrame":function () {
            parentObj.prepareFrame();
        }
    }
}
GameBoyAdvanceEmulator.prototype.play = function () {
    if (this.paused) {
        this.startTimer();
        this.paused = false;
    }
}
GameBoyAdvanceEmulator.prototype.pause = function () {
    if (!this.paused) {
        this.clearTimer();
        this.exportSave();
        this.paused = true;
    }
}
GameBoyAdvanceEmulator.prototype.stop = function () {
    this.faultFound = false;
    this.romFound = false;
    this.audioUpdateState = this.audioFound;
    this.pause();
}
GameBoyAdvanceEmulator.prototype.statusClear = function () {
    this.faultFound = false;
    this.pause();
}
GameBoyAdvanceEmulator.prototype.restart = function () {
    this.faultFound = false;
    this.exportSave();
    this.initializeCore();
    this.importSave();
    this.resetMetrics();
    this.reinitializeAudio();
}
GameBoyAdvanceEmulator.prototype.clearTimer = function () {
    clearInterval(this.timer);
    this.resetMetrics();
}
GameBoyAdvanceEmulator.prototype.startTimer = function () {
    this.clearTimer();
    var parentObj = this;
    this.timer = setInterval(function (){parentObj.timerCallback()}, this.settings.timerIntervalRate);
}
GameBoyAdvanceEmulator.prototype.timerCallback = function () {
    //Check to see if web view is not hidden, if hidden don't run due to JS timers being inaccurate on page hide:
    if (!document.hidden && !document.msHidden && !document.mozHidden && !document.webkitHidden) {
        if (!this.faultFound && this.romFound) {                        //Any error pending or no ROM loaded is a show-stopper!
            this.iterationStartSequence();                              //Run start of iteration stuff.
            this.IOCore.iterate(this.CPUCyclesTotal | 0);               //Step through the emulation core loop.
            this.iterationEndSequence();                                //Run end of iteration stuff.
        }
        else {
            this.pause();                                                //Some pending error is preventing execution, so pause.
        }
    }
}
GameBoyAdvanceEmulator.prototype.iterationStartSequence = function () {
    this.faultFound = true;                                             //If the end routine doesn't unset this, then we are marked as having crashed.
    this.audioUnderrunAdjustment();                                     //If audio is enabled, look to see how much we should overclock by to maintain the audio buffer.
    this.audioPushNewState();                                           //Check to see if we need to update the audio core for any output changes.
}
GameBoyAdvanceEmulator.prototype.iterationEndSequence = function () {
    this.faultFound = false;                                            //If core did not throw while running, unset the fatal error flag.
    this.clockCyclesSinceStart += this.CPUCyclesTotal;                  //Accumulate tracking.
}
GameBoyAdvanceEmulator.prototype.attachROM = function (ROM) {
    this.stop();
    this.ROM = ROM;
    this.initializeCore();
    this.romFound = true;
    this.importSave();
}
GameBoyAdvanceEmulator.prototype.attachBIOS = function (BIOS) {
    this.statusClear();
    this.BIOS = BIOS;
}
GameBoyAdvanceEmulator.prototype.getGameName = function () {
    if (!this.faultFound && this.romFound) {
        return this.IOCore.cartridge.name;
    }
    else {
        return "";
    }
}
GameBoyAdvanceEmulator.prototype.attachSaveExportHandler = function (handler) {
    if (typeof handler == "function") {
        this.saveExportHandler = handler;
    }
}
GameBoyAdvanceEmulator.prototype.attachSaveImportHandler = function (handler) {
    if (typeof handler == "function") {
        this.saveImportHandler = handler;
    }
}
GameBoyAdvanceEmulator.prototype.importSave = function () {
    if (this.saveImportHandler) {
        var name = this.getGameName();
        if (name != "") {
            var save = this.saveImportHandler(name);
            var saveType = this.saveImportHandler("TYPE_" + name);
            if (save && saveType && !this.faultFound && this.romFound) {
                var length = save.length | 0;
                var convertedSave = getUint8Array(length | 0);
                if ((length | 0) > 0) {
                    for (var index = 0; (index | 0) < (length | 0); index = ((index | 0) + 1) | 0) {
                        convertedSave[index | 0] = save[index | 0] & 0xFF;
                    }
                    this.IOCore.saves.importSave(convertedSave, saveType | 0);
                }
            }
        }
    }
}
GameBoyAdvanceEmulator.prototype.exportSave = function () {
    if (this.saveExportHandler && !this.faultFound && this.romFound) {
        var save = this.IOCore.saves.exportSave();
        var saveType = this.IOCore.saves.exportSaveType();
        if (save != null && saveType != null) {
            this.saveExportHandler(this.IOCore.cartridge.name, save);
            this.saveExportHandler("TYPE_" + this.IOCore.cartridge.name, saveType | 0);
        }
    }
}
GameBoyAdvanceEmulator.prototype.setSpeed = function (speed) {
    this.settings.emulatorSpeed = Math.min(Math.max(parseFloat(speed), 0.01), 10);
    this.calculateTimings();
    this.reinitializeAudio();
}
GameBoyAdvanceEmulator.prototype.getSpeed = function (speed) {
    return this.settings.emulatorSpeed;
}
GameBoyAdvanceEmulator.prototype.changeCoreTimer = function (newTimerIntervalRate) {
    this.settings.timerIntervalRate = Math.max(parseInt(newTimerIntervalRate, 10), 1);
    if (!this.paused) {                        //Set up the timer again if running.
        this.clearTimer();
        this.startTimer();
    }
    this.calculateTimings();
    this.reinitializeAudio();
}
GameBoyAdvanceEmulator.prototype.resetMetrics = function () {
    this.clockCyclesSinceStart = 0;
    this.metricStart = new Date();
}
GameBoyAdvanceEmulator.prototype.calculateTimings = function () {
    this.clocksPerSecond = this.settings.emulatorSpeed * 0x1000000;
    this.CPUCyclesTotal = this.CPUCyclesPerIteration = (this.clocksPerSecond / 1000 * this.settings.timerIntervalRate) | 0;
}
GameBoyAdvanceEmulator.prototype.getSpeedPercentage = function () {
    if (this.metricStart && !this.paused) {
        var metricEnd = new Date();
        var timeDiff = Math.max(metricEnd.getTime() - this.metricStart.getTime(), 1);
        var result = ((this.settings.timerIntervalRate * this.clockCyclesSinceStart / timeDiff) / this.CPUCyclesPerIteration) * 100;
        this.resetMetrics();
        return result.toFixed(2) + "%";
    }
    else {
        this.resetMetrics();
        return "Paused";
    }
}
GameBoyAdvanceEmulator.prototype.initializeCore = function () {
    //Setup a new instance of the i/o core:
    this.IOCore = new GameBoyAdvanceIO(this.settings, this.coreExposed, this.BIOS, this.ROM);
}
GameBoyAdvanceEmulator.prototype.keyDown = function (keyPressed) {
    if (!this.paused) {
        this.IOCore.joypad.keyPress(keyPressed);
    }
}
GameBoyAdvanceEmulator.prototype.keyUp = function (keyReleased) {
    if (!this.paused) {
        this.IOCore.joypad.keyRelease(keyReleased);
    }
}
GameBoyAdvanceEmulator.prototype.attachGraphicsFrameHandler = function (handler) {
    if (typeof handler == "function") {
        this.graphicsFrameCallback = handler;
    }
}
GameBoyAdvanceEmulator.prototype.attachAudioHandler = function (mixerInputHandler) {
    if (mixerInputHandler) {
        this.audio = mixerInputHandler;
    }
}
GameBoyAdvanceEmulator.prototype.swizzleFrameBuffer = function () {
    //Convert our dirty 15-bit (15-bit, with internal render flags above it) framebuffer to an 8-bit buffer with separate indices for the RGB channels:
    var bufferIndex = 0;
    for (var canvasIndex = 0; canvasIndex < this.offscreenRGBCount;) {
        this.swizzledFrame[canvasIndex++] = (this.frameBuffer[bufferIndex] & 0x1F) << 3;            //Red
        this.swizzledFrame[canvasIndex++] = (this.frameBuffer[bufferIndex] & 0x3E0) >> 2;            //Green
        this.swizzledFrame[canvasIndex++] = (this.frameBuffer[bufferIndex++] & 0x7C00) >> 7;        //Blue
    }
}
GameBoyAdvanceEmulator.prototype.prepareFrame = function () {
    //Copy the internal frame buffer to the output buffer:
    this.swizzleFrameBuffer();
    this.requestDraw();
}
GameBoyAdvanceEmulator.prototype.requestDraw = function () {
    if (this.graphicsFrameCallback) {
        //We actually updated the graphics internally, so copy out:
        this.graphicsFrameCallback(this.swizzledFrame);
    }
}
GameBoyAdvanceEmulator.prototype.enableAudio = function () {
    if (!this.audioFound && this.audio) {
        //Calculate the variables for the preliminary downsampler first:
        this.audioResamplerFirstPassFactor = Math.max(Math.min(Math.floor(this.clocksPerSecond / 44100), Math.floor(0x7FFFFFFF / 0x3FF)), 1);
        this.audioDownSampleInputDivider = (2 / 0x3FF) / this.audioResamplerFirstPassFactor;
        this.audioSetState(true);    //Set audio to 'found' by default.
        //Attempt to enable audio:
        var parentObj = this;
        this.audio.initialize(2, this.clocksPerSecond / this.audioResamplerFirstPassFactor, Math.max(this.CPUCyclesPerIteration * this.settings.audioBufferSize / this.audioResamplerFirstPassFactor, 8192) << 1, this.settings.audioVolume, function () {
                                     //Disable audio in the callback here:
                                     parentObj.disableAudio();
        });
        this.audio.register();
        if (this.audioFound) {
            //Only run this if audio was found to save memory on disabled output:
            this.initializeAudioBuffering();
        }
    }
}
GameBoyAdvanceEmulator.prototype.disableAudio = function () {
    if (this.audioFound) {
        this.audio.unregister();
        this.audioSetState(false);
        this.calculateTimings();    //Re-Fix timing if it was adjusted by our audio code.
    }
}
GameBoyAdvanceEmulator.prototype.initializeAudioBuffering = function () {
    this.audioDestinationPosition = 0;
    this.audioBufferContainAmount = Math.max(this.CPUCyclesPerIteration * this.settings.audioBufferUnderrunLimit / this.audioResamplerFirstPassFactor, 4096) << 1;
    this.audioNumSamplesTotal = (this.CPUCyclesPerIteration / this.audioResamplerFirstPassFactor) << 1;
    this.audioBuffer = getFloat32Array(this.audioNumSamplesTotal);
}
GameBoyAdvanceEmulator.prototype.changeVolume = function (newVolume) {
    this.settings.audioVolume = Math.min(Math.max(parseFloat(newVolume), 0), 1);
    if (this.audioFound) {
        this.audio.changeVolume(this.settings.audioVolume);
    }
}
GameBoyAdvanceEmulator.prototype.getVolume = function (newVolume) {
    return this.settings.audioVolume;
}
GameBoyAdvanceEmulator.prototype.outputAudio = function (downsampleInputLeft, downsampleInputRight) {
    downsampleInputLeft = downsampleInputLeft | 0;
    downsampleInputRight = downsampleInputRight | 0;
    this.audioBuffer[this.audioDestinationPosition++] = (downsampleInputLeft * this.audioDownSampleInputDivider) - 1;
    this.audioBuffer[this.audioDestinationPosition++] = (downsampleInputRight * this.audioDownSampleInputDivider) - 1;
    if (this.audioDestinationPosition == this.audioNumSamplesTotal) {
        this.audio.push(this.audioBuffer);
        this.audioDestinationPosition = 0;
    }
}
GameBoyAdvanceEmulator.prototype.audioUnderrunAdjustment = function () {
    this.CPUCyclesTotal = this.CPUCyclesPerIteration | 0;
    if (this.audioFound) {
        var underrunAmount = this.audio.remainingBuffer();
        if (typeof underrunAmount == "number") {
            underrunAmount = this.audioBufferContainAmount - Math.max(underrunAmount, 0);
            if (underrunAmount > 0) {
                this.CPUCyclesTotal = Math.min(((this.CPUCyclesTotal | 0) + ((underrunAmount >> 1) * this.audioResamplerFirstPassFactor)) | 0, this.CPUCyclesTotal << 1, 0x7FFFFFFF) | 0;
            }
        }
    }
}
GameBoyAdvanceEmulator.prototype.audioPushNewState = function () {
    if (this.audioUpdateState) {
        this.IOCore.sound.initializeOutput(this.audioFound, this.audioResamplerFirstPassFactor | 0);
        this.audioUpdateState = false;
    }
}
GameBoyAdvanceEmulator.prototype.audioSetState = function (audioFound) {
    if (this.audioFound != audioFound) {
        this.audioFound = audioFound;
        this.audioUpdateState = true;
    }
}
GameBoyAdvanceEmulator.prototype.reinitializeAudio = function () {
    if (this.audioFound) {                    //Set up the audio again if enabled.
        this.disableAudio();
        this.enableAudio();
    }
}
GameBoyAdvanceEmulator.prototype.toggleSkipBootROM = function (skipBoot) {
    this.settings.SKIPBoot = !!skipBoot;
    if (this.romFound && this.paused) {
        this.initializeCore();
        this.importSave();
    }
}
GameBoyAdvanceEmulator.prototype.toggleDynarec = function (dynarecEnabled) {
    this.settings.dynarecEnabled = !!dynarecEnabled;
}
GameBoyAdvanceEmulator.prototype.toggleLineSkip = function (lineSkip) {
    this.settings.lineSkip = !!lineSkip;
}
GameBoyAdvanceEmulator.prototype.toggleSlowDownBusHack = function (slowDownBusHack) {
    this.settings.slowDownBusHack = !!slowDownBusHack;
    if (!this.faultFound && this.romFound) {
        this.IOCore.wait.preprocessBusSpeedHack(this.settings.slowDownBusHack);
    }
}