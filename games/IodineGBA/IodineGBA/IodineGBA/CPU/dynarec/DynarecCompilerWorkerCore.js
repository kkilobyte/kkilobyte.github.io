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
importScripts(/*"DynarecARMAssemblerCore.js", */"DynarecTHUMBAssemblerCore.js");
self.onmessage = function (command) {
    var info = command.data;
    var startPC = info[0];
    var record = info[1];
    var InTHUMB = info[2];
    if (InTHUMB) {
        var compiler = new DynarecTHUMBAssemblerCore(startPC >>> 0, record);
    }
    else {
        bailout();
        //var compiler = new DynarecARMAssemblerCore(startPC >>> 0, record);
    }
    done(compiler.getStubCode());
}
function done(functionString) {
    postMessage([0, functionString]);
}