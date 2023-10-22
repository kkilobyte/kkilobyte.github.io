gdjs.Game_32OverCode = {};
gdjs.Game_32OverCode.GDBLOODObjects1= [];
gdjs.Game_32OverCode.GDBLOODObjects2= [];
gdjs.Game_32OverCode.GDDead_9595CourpesObjects1= [];
gdjs.Game_32OverCode.GDDead_9595CourpesObjects2= [];
gdjs.Game_32OverCode.GDGAME_9595OVERObjects1= [];
gdjs.Game_32OverCode.GDGAME_9595OVERObjects2= [];
gdjs.Game_32OverCode.GDRetry_9595buttonObjects1= [];
gdjs.Game_32OverCode.GDRetry_9595buttonObjects2= [];
gdjs.Game_32OverCode.GDRetry_9595button2Objects1= [];
gdjs.Game_32OverCode.GDRetry_9595button2Objects2= [];


gdjs.Game_32OverCode.mapOfGDgdjs_9546Game_959532OverCode_9546GDRetry_95959595buttonObjects1Objects = Hashtable.newFrom({"Retry_button": gdjs.Game_32OverCode.GDRetry_9595buttonObjects1});
gdjs.Game_32OverCode.mapOfGDgdjs_9546Game_959532OverCode_9546GDRetry_95959595button2Objects1Objects = Hashtable.newFrom({"Retry_button2": gdjs.Game_32OverCode.GDRetry_9595button2Objects1});
gdjs.Game_32OverCode.eventsList0 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.runtimeScene.sceneJustBegins(runtimeScene);
if (isConditionTrue_0) {
{gdjs.evtTools.sound.playSound(runtimeScene, "ef566123783e3acc49b78eac8952f466e7cd01ce9932ae05aa0812a6ad2ceb20_Lonely Mountain.aac", true, 40, 1);
}}

}


{

gdjs.copyArray(runtimeScene.getObjects("Retry_button"), gdjs.Game_32OverCode.GDRetry_9595buttonObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.Game_32OverCode.mapOfGDgdjs_9546Game_959532OverCode_9546GDRetry_95959595buttonObjects1Objects, runtimeScene, false, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonPressed(runtimeScene, "Left");
}
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "The Game", false);
}}

}


{

gdjs.copyArray(runtimeScene.getObjects("Retry_button2"), gdjs.Game_32OverCode.GDRetry_9595button2Objects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.Game_32OverCode.mapOfGDgdjs_9546Game_959532OverCode_9546GDRetry_95959595button2Objects1Objects, runtimeScene, true, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonPressed(runtimeScene, "Left");
}
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Main Menu", false);
}}

}


};

gdjs.Game_32OverCode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.Game_32OverCode.GDBLOODObjects1.length = 0;
gdjs.Game_32OverCode.GDBLOODObjects2.length = 0;
gdjs.Game_32OverCode.GDDead_9595CourpesObjects1.length = 0;
gdjs.Game_32OverCode.GDDead_9595CourpesObjects2.length = 0;
gdjs.Game_32OverCode.GDGAME_9595OVERObjects1.length = 0;
gdjs.Game_32OverCode.GDGAME_9595OVERObjects2.length = 0;
gdjs.Game_32OverCode.GDRetry_9595buttonObjects1.length = 0;
gdjs.Game_32OverCode.GDRetry_9595buttonObjects2.length = 0;
gdjs.Game_32OverCode.GDRetry_9595button2Objects1.length = 0;
gdjs.Game_32OverCode.GDRetry_9595button2Objects2.length = 0;

gdjs.Game_32OverCode.eventsList0(runtimeScene);

return;

}

gdjs['Game_32OverCode'] = gdjs.Game_32OverCode;
