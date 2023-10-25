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
var keyZones = [
    //Use this to control the key mapping:
                ["right", [39]],
                ["left", [37]],
                ["up", [38]],
                ["down", [40]],
                ["a", [88, 74]],
                ["b", [90, 81, 89]],
                ["select", [16]],
                ["start", [13]],
                ["r", [50]],
                ["l", [49]]
];
function keyDown(event) {
    var keyCode = event.keyCode;
    var keyMapLength = keyZones.length;
    for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
        var keyCheck = keyZones[keyMapIndex];
        var keysMapped = keyCheck[1];
        var keysTotal = keysMapped.length;
        for (var index = 0; index < keysTotal; ++index) {
            if (keysMapped[index] == keyCode) {
                Iodine.keyDown(keyCheck[0]);
                try {
                    event.preventDefault();
                }
                catch (error) { }
            }
        }
    }
}
function keyUp(event) {
    var keyCode = event.keyCode;
    var keyMapLength = keyZones.length;
    for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
        var keyCheck = keyZones[keyMapIndex];
        var keysMapped = keyCheck[1];
        var keysTotal = keysMapped.length;
        for (var index = 0; index < keysTotal; ++index) {
            if (keysMapped[index] == keyCode) {
                Iodine.keyUp(keyCheck[0]);
                try {
                    event.preventDefault();
                }
                catch (error) { }
            }
        }
    }
}
function keyUpPreprocess(event) {
    switch (event.keyCode) {
        case 68:
            lowerVolume();
            break;
        case 82:
            raiseVolume();
            break;
        case 51:
            var emuSpeed = Math.min(Iodine.getSpeed() + 0.10, 4);
            Iodine.setSpeed(emuSpeed);
            break;
        case 52:
            var emuSpeed = Math.max(Iodine.getSpeed() - 0.10, 0.10);
            Iodine.setSpeed(emuSpeed);
            break;
        default:
            //Control keys / other
            keyUp(event);
    }
}