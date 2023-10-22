gdjs.Main_32MenuCode = {};
gdjs.Main_32MenuCode.GDTITLEObjects1= [];
gdjs.Main_32MenuCode.GDTITLEObjects2= [];
gdjs.Main_32MenuCode.GDBackground_9595Menu_9595ShitObjects1= [];
gdjs.Main_32MenuCode.GDBackground_9595Menu_9595ShitObjects2= [];
gdjs.Main_32MenuCode.GDPlayObjects1= [];
gdjs.Main_32MenuCode.GDPlayObjects2= [];
gdjs.Main_32MenuCode.GDDemoObjects1= [];
gdjs.Main_32MenuCode.GDDemoObjects2= [];


gdjs.Main_32MenuCode.mapOfGDgdjs_9546Main_959532MenuCode_9546GDPlayObjects1Objects = Hashtable.newFrom({"Play": gdjs.Main_32MenuCode.GDPlayObjects1});
gdjs.Main_32MenuCode.eventsList0 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.runtimeScene.sceneJustBegins(runtimeScene);
if (isConditionTrue_0) {
{gdjs.evtTools.sound.playSound(runtimeScene, "1710b312e6b9ec8c7db40415ddb39fe27405bf38c3e5b31b8622ead94d40161b_Theme 3.aac", true, 40, 1);
}}

}


{

gdjs.copyArray(runtimeScene.getObjects("Play"), gdjs.Main_32MenuCode.GDPlayObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.Main_32MenuCode.mapOfGDgdjs_9546Main_959532MenuCode_9546GDPlayObjects1Objects, runtimeScene, true, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonPressed(runtimeScene, "Left");
}
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "The Game", false);
}}

}


};

gdjs.Main_32MenuCode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.Main_32MenuCode.GDTITLEObjects1.length = 0;
gdjs.Main_32MenuCode.GDTITLEObjects2.length = 0;
gdjs.Main_32MenuCode.GDBackground_9595Menu_9595ShitObjects1.length = 0;
gdjs.Main_32MenuCode.GDBackground_9595Menu_9595ShitObjects2.length = 0;
gdjs.Main_32MenuCode.GDPlayObjects1.length = 0;
gdjs.Main_32MenuCode.GDPlayObjects2.length = 0;
gdjs.Main_32MenuCode.GDDemoObjects1.length = 0;
gdjs.Main_32MenuCode.GDDemoObjects2.length = 0;

gdjs.Main_32MenuCode.eventsList0(runtimeScene);

return;

}

gdjs['Main_32MenuCode'] = gdjs.Main_32MenuCode;
