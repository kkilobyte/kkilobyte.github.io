gdjs.End_32Of_32DemoCode = {};
gdjs.End_32Of_32DemoCode.GDUnnamedObjects1= [];
gdjs.End_32Of_32DemoCode.GDUnnamedObjects2= [];
gdjs.End_32Of_32DemoCode.GDNewTextObjects1= [];
gdjs.End_32Of_32DemoCode.GDNewTextObjects2= [];
gdjs.End_32Of_32DemoCode.GDNewText2Objects1= [];
gdjs.End_32Of_32DemoCode.GDNewText2Objects2= [];


gdjs.End_32Of_32DemoCode.asyncCallback8757380 = function (runtimeScene, asyncObjectsList) {
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Main Menu", false);
}}
gdjs.End_32Of_32DemoCode.eventsList0 = function(runtimeScene) {

{


{
{
const asyncObjectsList = new gdjs.LongLivedObjectsList();
runtimeScene.getAsyncTasksManager().addTask(gdjs.evtTools.runtimeScene.wait(30), (runtimeScene) => (gdjs.End_32Of_32DemoCode.asyncCallback8757380(runtimeScene, asyncObjectsList)));
}
}

}


};gdjs.End_32Of_32DemoCode.eventsList1 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.runtimeScene.sceneJustBegins(runtimeScene);
if (isConditionTrue_0) {
{gdjs.evtTools.sound.playSound(runtimeScene, "96fe32b3e8a49a81878b02044a3224a6a449255458e54dbbde8cc7d712d95d98_My Giant Bunny Friend.aac", false, 40, 1);
}}

}


{


let isConditionTrue_0 = false;
{

{ //Subevents
gdjs.End_32Of_32DemoCode.eventsList0(runtimeScene);} //End of subevents
}

}


};

gdjs.End_32Of_32DemoCode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.End_32Of_32DemoCode.GDUnnamedObjects1.length = 0;
gdjs.End_32Of_32DemoCode.GDUnnamedObjects2.length = 0;
gdjs.End_32Of_32DemoCode.GDNewTextObjects1.length = 0;
gdjs.End_32Of_32DemoCode.GDNewTextObjects2.length = 0;
gdjs.End_32Of_32DemoCode.GDNewText2Objects1.length = 0;
gdjs.End_32Of_32DemoCode.GDNewText2Objects2.length = 0;

gdjs.End_32Of_32DemoCode.eventsList1(runtimeScene);

return;

}

gdjs['End_32Of_32DemoCode'] = gdjs.End_32Of_32DemoCode;
