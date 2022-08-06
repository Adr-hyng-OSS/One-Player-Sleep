import { world } from "mojang-minecraft";
import {configuration} from "../configuration.js"

var {maxDuration} = configuration;

function stringtifyCommand(command){
    let result = world.getDimension("overworld").runCommand(command);
    return JSON.stringify(result.statusMessage);
}

world.events.beforeItemUseOn.subscribe((useOn) =>{
     wantsToSleep(useOn); 
});

world.events.tick.subscribe( e => {
  let players = world.getPlayers();
  for(let player of players){
    try {
      player.runCommand(`scoreboard objectives add sleepTick dummy "SleepTick"`);
      player.runCommand(`scoreboard objectives add sleepSecond dummy "SleepSecond"`);
    } 
    catch {
      player.runCommand(`scoreboard players add ${player.name} "sleepTick" 0`);
      player.runCommand(`scoreboard players add ${player.name} "sleepSecond" 0`);
    } 
    finally {
      if(player.hasTag("start_sleeping")){ 
        let sleepTick = parseInt((stringtifyCommand(`scoreboard players test ${player.name} "sleepTick" * *`)).split(" ")[1]);
        player.runCommand(`scoreboard players add ${player.name} "sleepTick" ${1}`);
        if(sleepTick % 20 === 0) { 
          let sleepSecond = parseInt((stringtifyCommand(`scoreboard players test ${player.name} "sleepSecond" * *`)).split(" ")[1]);
          player.runCommand(`scoreboard players add ${player.name} "sleepSecond" ${1}`);
          if (sleepSecond >= maxDuration) { 
            player.runCommandAsync(`time set day`);
          }
        }
      }
      else{ 
        player.runCommand(`scoreboard players set ${player.name} "sleepTick" ${0}`);
        player.runCommand(`scoreboard players set ${player.name} "sleepSecond" ${0}`);
      }
    }
  }
});


function getDayLightCycle(timeQuery){
  const timeCycles = {
    daytime: 1000, noon: 6000, sunset: 12000, night: 13000, midnight: 18000, sunrise: 23000
  };

  if(Object.keys(timeCycles).some( timeCycle => timeCycle === timeQuery)) return timeCycles[timeQuery];
  return -1;
}

function isNight(currentTick){
    // Checking what daytime cycle it is using the dayLightCycle on minecraft.
    return currentTick >= getDayLightCycle("night") && currentTick < getDayLightCycle("sunrise");
}


function wantsToSleep(player){
  player.source.removeTag("start_sleeping");

  // Get world Tick using the command "time query daytime".
  let command = world.getDimension("overworld").runCommand('time query daytime');
  let worldTick = JSON.stringify(command.statusMessage).match(/[0-9]+/i);
  let block = world.getDimension("overworld").getBlock(player.blockLocation);

  // If player interacts with a block named "bed", and is night time, while the player who touched is not sneaking.
  if(block.id == "minecraft:bed" && isNight(worldTick) && !player.source.isSneaking){
    player.source.addTag("start_sleeping");
    player.source.runCommand(`summon yn:not_sleeper ${player.blockLocation.x} ${player.blockLocation.y} ${player.blockLocation.z}`);
  }

  // Else, the player interacted with the bed, but, it is not night time.
  else if(block.id == "minecraft:bed" && !isNight(worldTick)){
    player.source.runCommand(`title @s actionbar ${player.source.name} cannot sleep cause it's day.`);
  }
}