// global
import { lerp, dist2D, setMinMaxRange, delay } from "./global.js";

// system
import { rotateBillboards } from "./billboards.js";

// game
import {
  projectileShot,
  createBossProjectileSingleShot,
  projectileTripleShot,
  bossProjectilesChainTripleShot,
  createBossMissleShot,
  projectileTrap,
  bossFloorBlastAttack,
  bossHeal,
  createBossMeleeShot,
  createBossProjectileTripleShot,
  createBossProjectileChainTripleShot,
  bossRushFloorBlastAttack,
  bossRandomMove,
  createBossProjectileChainingShot,
} from "./bossPattern.js";

// stages
import Stage from "./stages/stage.js";
import Stage2 from "./stages/stage2.js";
import Stage3 from "./stages/stage3.js";

// player
let playerCol;
let playerModel;
let playerEffectModel;

// boss
let bossCol;
let bossModel;

// boss attack models
let bossFB;
let bossAB;
let bossExplodeModel;

// ui
let uiLifeBar;
let uiLifeBarName;
let uiTutorialText;
let uiFader;
let uiDeathText;
let uiVictoryText;
let uiPressEnter;

// Textures
let texture;

// Global objects
let camera;
let keyboard;

// Gameplay variables
let camLookX; // Camera look X position
let camLookY; // Camera look Y position
let inputsEnabled; // Are the inputs enabled

// Settings
const PLAYERMAXHEALTH = 2;
const LERPFACTOR = 0.1; // Linear interpolation speed
const PSPEED = 0.6; // Player speed
const PDASH = 4; // Dash multiplier
const PDMG = 10; // Player damage
const CAMHEIGHT = 14; // Camera height
const BOSSPROJSPEED = 355; // How fast the boss projectiles move
const PLAYERSHIELDTIME = 1000; // shield time
const PLAYERATTACKDISTANCE = 76; // attack distance
const PLAYERMODELHEIGHT = 60; // height

// field size
const FIELDX = 252;
const FIELDY = 654;

// variables
let playerInvincible = false;
let blinkingInterval;
let playerHealth = PLAYERMAXHEALTH;
let playerShield = 0;
let playerTension = 0;
let playerMaxPower = false;

// runtime
let runtimeGlobal;

runOnStartup(async (runtime) => {
  runtimeGlobal = runtime;

  // Code to run on the loading screen
  runtime.addEventListener("beforeprojectstart", () =>
    onBeforeProjectStart(runtime)
  );
});

async function onBeforeProjectStart(runtime) {
  console.log(runtime.layout);
  console.log(runtime.layout.name);

  if (runtime.layout.name === "stage1") {
    // Get instances
    playerCol = runtime.objects.PlayerCollider.getFirstInstance();
    playerModel = runtime.objects.PlayerModel.getFirstInstance();
    playerEffectModel = runtime.objects.playerEffectModel.getFirstInstance();

    bossCol = runtime.objects.BossCollider.getFirstInstance();
    bossModel = runtime.objects.BossModel.getFirstInstance();

    // floor blast set
    bossFB = runtime.objects.BossFloorBlast.getFirstInstance();
    // air blast set
    bossAB = runtime.objects.BossAirBlast.getFirstInstance();

    bossExplodeModel = runtime.objects.ExplodeEffectModel.getFirstInstance();

    uiLifeBar = runtime.objects.UILifeBar.getFirstInstance();
    uiLifeBarName = runtime.objects.UILifeBarName.getFirstInstance();
    uiTutorialText = runtime.objects.UITutorialText.getFirstInstance();
    uiFader = runtime.objects.UIFader.getFirstInstance();
    uiDeathText = runtime.objects.UIDeathText.getFirstInstance();
    uiVictoryText = runtime.objects.UIVictoryText.getFirstInstance();
    uiPressEnter = runtime.objects.UIPressEnter.getFirstInstance();

    // Get global objects
    camera = runtime.objects.Camera3D;
    keyboard = runtime.keyboard;

    // Set textures
    texture = {
      pIdle: runtime.objects.TexPlayerIdle,
      pWalk: runtime.objects.TexPlayerWalk,
      pDashL: runtime.objects.TexPlayerDashL,
      pDashR: runtime.objects.TexPlayerDashR,

      pHit: runtime.objects.TexPlayerHit,
      pHitEffect: runtime.objects.attackEffect,

      bIdle: runtime.objects.SteelWatcherIdle,
      bAttack: runtime.objects.SteelWatcherAttack,

      // bFBExp: runtime.objects.TexBossFBExp,
      bFBExp: runtime.objects.ExplodeEffectModel,

      lockdownMark: runtime.objects.lockdownMark,

      lockdownUI: runtime.objects.lockdownUI,
      fireAnimation: runtime.objects.fireBossProjectileAnimation,
    };

    // Set initial camera position (behind the player and looking at the boss)
    camLookX = bossCol.x;
    camLookY = bossCol.y;
    camera.lookAtPosition(
      playerCol.x - 35 * Math.cos(playerCol.angle),
      playerCol.y - 35 * Math.sin(playerCol.angle),
      CAMHEIGHT,
      camLookX,
      (camLookY = bossCol.y),
      CAMHEIGHT,
      0,
      0,
      1
    );

    // Start the game and disable inputs (wait for [Enter])
    restartGame(runtime);
    inputsEnabled = false;

    // Start ticking
    runtime.addEventListener("tick", () => onTick(runtime));
  }
}

function restartGame(runtime) {
  // (Re)start the game

  // Reset camera
  camLookX = playerCol.x - 16 + Math.cos(playerCol.angle);
  camLookY = playerCol.y + Math.sin(playerCol.angle);

  playerHealth = PLAYERMAXHEALTH;
  playerShield = 0;
  playerTension = 0;
  playerMaxPower = false;

  const iceAura = runtime.objects.iceAura.getFirstInstance();
  iceAura.x = 10000


  // Reset player
  playerModel.height = PLAYERMODELHEIGHT;
  playerCol.instVars.pspeed = PSPEED;
  playerCol.instVars.isAttacking = false;
  playerCol.instVars.isWalking = false;
  playerCol.instVars.dashing = "N";
  playerCol.instVars.dashInCooldown = false;
  playerCol.x = 136;
  playerCol.y = 136;
  inputsEnabled = true;

  // reset time
  runtime.callFunction("resetTimer");

  runtime.callFunction("resetGotHitCount");

  // Reset boss
  bossCol.x = 376;
  bossCol.y = 376;
  bossCol.zElevation = 0;
  uiLifeBar.width = 160;

  // clearIntervals
  clearInterval(blinkingInterval);

  // Hide Death screen
  uiFader.behaviors.Tween.startTween("opacity", 0, 0.5, "in-out-sine");
  uiDeathText.behaviors.Tween.startTween("opacity", 0, 0.5, "in-out-sine");
  uiVictoryText.behaviors.Tween.startTween("opacity", 0, 0.5, "in-out-sine");
  uiPressEnter.behaviors.Tween.startTween("opacity", 0, 0.5, "in-out-sine");
}

function onTick(runtime) {
  // Code to run every tick
  checkBossTimer(runtime);
  movePlayerModel(runtime);

  getInputs(runtime);
  playerDashState(runtime);

  if (runtime.layout.name === "stage1") {
    computeCollisions(runtime, FIELDX, FIELDY);
  }
  if (runtime.layout.name === "stage2") {
    computeCollisions(runtime, 500, 500);
  }

  rotateBillboards(runtime);
  setCamera3D(runtime);
  updateUI(runtime);
  checkPlayerMaxPower(runtime);
}

function playerShieldIncrement() {
  playerShield += 1;

  if (PLAYERSHIELDTIME <= playerShield) {
    playerShield = 0;
    playerHealth += 1;

    playerHealth = setMinMaxRange(0, PLAYERMAXHEALTH, playerHealth);
  }
}

function playerTensionIncrement(inc) {
  playerTension += inc;

  playerTension = setMinMaxRange(0, 100, playerTension);

  if (100 === playerTension) {
    playerMaxPower = true;
  }
}

function checkPlayerMaxPower(runtime) {
  if (playerMaxPower) {
    const iceAura = runtime.objects.iceAura.getFirstInstance();

    iceAura.x = playerModel.x;
    iceAura.y = playerModel.y;
  }
}

function updateUI(runtime) {
  runtime.callFunction("updateStatebar", playerHealth);
  runtime.callFunction("updateShield", playerShield);
  runtime.callFunction("updateTension", playerTension);
}

function iceWatcherProcedure(runtime) {
  // for debug
  // createBossMeleeShot();
  // bossProjectilesChainTripleShot(runtime);
  // bossRushFloorBlastAttack(runtime)
  // createBossMissleShot();
  // bossHeal();

  const distanceNumber = dist2D(playerCol.x, playerCol.y, bossCol.x, bossCol.y);

  if (distanceNumber < 90) {
    // short melee range

    if (70 < uiLifeBar.width) {
      // phase 1

      // Select a random attack
      const newAttack = Math.floor(Math.random() * 4);

      // Floor Blast attack
      if (newAttack < 1) {
        // Move to a random position on the arena and restart attack timer
        bossFloorBlastAttack(runtime);
      } else if (newAttack < 2) {
        bossProjectilesChainTripleShot(runtime);
      } else if (newAttack < 3) {
        createBossMeleeShot();
      } else {
        // Move to a random position on the arena and restart attack timer
        bossRandomMove(runtime);
      }
    } else if (uiLifeBar.width <= 70) {
      // phase 2

      // Select a random attack
      const newAttack = Math.floor(Math.random() * 4);

      // Floor Blast attack
      if (newAttack < 1) {
        bossRushFloorBlastAttack(runtime);
      } else if (newAttack < 2) {
        bossProjectilesChainTripleShot(runtime);
      } else if (newAttack < 4) {
        // projectileTrap(runtime);
        // Move to a random position on the arena and restart attack timer
        bossRandomMove(runtime)
      } else {
        bossRandomMove(runtime);
      }
    }
  } else {
    // long range

    if (70 < uiLifeBar.width) {
      // phase 1

      // Select a random attack
      const newAttack = Math.floor(Math.random() * 4);

      // Floor Blast attack
      if (newAttack < 1) {
        bossProjectilesChainTripleShot(runtime);
      } else {
        // Move to a random position on the arena and restart attack timer
        bossRandomMove(runtime);
      }
    } else if (uiLifeBar.width <= 70) {
      // phase 2

      // Select a random attack
      const newAttack = Math.floor(Math.random() * 5);

      // Floor Blast attack
      if (newAttack < 1) {
        bossRushFloorBlastAttack(runtime);
      } else if (newAttack < 2) {
        bossProjectilesChainTripleShot(runtime);
      // } else if (newAttack < 4) {
        // projectileTrap(runtime);
        // bossHeal();
        // Move to a random position on the arena and restart attack timer
      } else if (newAttack < 5) {
        createBossProjectileChainingShot(runtime, 7);
      } else {
        bossRandomMove(runtime);
      }
    }
  }
}

function checkBossTimer(runtime) {
  // Boss OnTimer events

  const tm = bossCol.behaviors.Timer; // Shorthand to make code more compact

  // Perform new attack
  if (tm.hasFinished("bossAttackTimer")) {
    iceWatcherProcedure(runtime);
  }

  // Floor Blast
  if (tm.hasFinished("bossFloorBlastTimer")) {
    // Move the indicator right below the player and start other timers
    bossFB.x = bossCol.x;
    bossFB.y = bossCol.y;
    tm.startTimer(0.4, "bossBackToIdleTimer", "once"); // Boss goes back to idle
    tm.startTimer(2.0, "bossFloorBlastExplosionTimer"); // Indicator explodes
    tm.startTimer(2.5, "bossAttackTimer", "once"); // Restart attack timer
  }

  if (tm.hasFinished("bossMeleeShotTimer")) {
    const bossFrontX = bossCol.x + Math.cos(bossCol.angle) * 30;
    const bossFrontY = bossCol.y + Math.sin(bossCol.angle) * 30;

    runtime.objects.TexBossFBExp.getFirstInstance().startAnimation("beginning");
    const exp = runtime.objects.BossFBExpModel2.createInstance(
      "Game",
      bossFrontX,
      bossFrontY
    );

    setTimeout(() => {
      exp.destroy();
    }, 300);

    tm.startTimer(0.4, "bossBackToIdleTimer", "once"); // Boss goes back to idle
    tm.startTimer(2.5, "bossAttackTimer", "once"); // Restart attack timer
  }

  if (tm.hasFinished("bossHealTimer")) {
    const intervalSave = setInterval(() => {
      // 회복
      uiLifeBar.width += 10;
      bossFlash();
    }, 200);

    setTimeout(() => {
      // 회복기간
      clearInterval(intervalSave);
      tm.startTimer(0.4, "bossBackToIdleTimer", "once"); // Boss goes back to idle
      tm.startTimer(2.5, "bossAttackTimer", "once"); // Restart attack timer
    }, 1200);
  }

  if (tm.hasFinished("bossRushFloorBlastTimer")) {
    // rush
    bossCol.x = playerCol.x + 20;
    bossCol.y = playerCol.y + 20;

    // Move the indicator right below the player and start other timers
    bossAB.x = bossCol.x;
    bossAB.y = bossCol.y;
    tm.startTimer(0.4, "bossBackToIdleTimer", "once"); // Boss goes back to idle
    tm.startTimer(2.0, "bossAirBlastExplosionTimer"); // Indicator explodes
    tm.startTimer(2.5, "bossAttackTimer", "once"); // Restart attack timer
  }

  // Floor Blast Explosion (kills player if close)
  if (tm.hasFinished("bossFloorBlastExplosionTimer")) {
    // Create 6 explosions on the image points of the blaster indicator

    runtime.objects.blastEffect.getFirstInstance().startAnimation("beginning");
    for (let i = 0; i < 6; i += 1) {
      runtime.objects.BossFBExpModel.createInstance(
        "Game",
        bossFB.getImagePointX("exp" + i),
        bossFB.getImagePointY("exp" + i)
      );
    }

    // If player is too close, it dies.
    if (
      dist2D(playerCol.x, playerCol.y, bossFB.x, bossFB.y) <
      bossFB.width / 2
    ) {
      playerGotHit(runtime);
    }

    // Move indicator away and wait for explosions animations to end
    bossFB.x = 10000;
    tm.startTimer(0.5, "bossExplosionRemoveTimer"); // Remove explosions
  }

  // Floor Blast Explosion (kills player if close)
  if (tm.hasFinished("bossAirBlastExplosionTimer")) {
    // Create 6 explosions on the image points of the blaster indicator
    runtime.objects.blastEffect.getFirstInstance().startAnimation("beginning");
    for (let i = 0; i < 6; i++) {
      runtime.objects.BossFBExpModel.createInstance(
        "Game",
        bossAB.getImagePointX("exp" + i),
        bossAB.getImagePointY("exp" + i)
      );
    }

    // If player is too close, it dies.
    if (
      dist2D(playerCol.x, playerCol.y, bossAB.x, bossAB.y) <
      bossAB.width / 2
    ) {
      playerGotHit(runtime);
    }

    // Move indicator away and wait for explosions animations to end
    bossAB.x = 10000;
    tm.startTimer(0.5, "bossExplosionRemoveTimer"); // Remove explosions
  }

  // Projectiles
  if (tm.hasFinished("bossProjectilesTimer")) {
    tm.startTimer(0.4, "bossBackToIdleTimer", "once"); // Go back to idle
    tm.startTimer(2, "bossAttackTimer", "once"); // Restart attack timer

    // Create a projectile and roughly aim it at the player
    const rx = Math.floor(Math.random() * 16) - 8;
    const ry = Math.floor(Math.random() * 16) - 8;
    const p = runtime.objects.BossProjectile.createInstance(
      "Game",
      bossCol.x,
      bossCol.y
    );
    const spd =
      dist2D(p.x, p.y, playerCol.x + rx, playerCol.y + ry) / BOSSPROJSPEED;
    p.zElevation = 24;

    // Start projectile movement and explosion timer
    p.behaviors.Tween.startTween(
      "position",
      [playerCol.x + rx, playerCol.y + ry],
      spd,
      "in-sine"
    );
    p.behaviors.Tween.startTween("z-elevation", 0, spd, "in-sine");
    tm.startTimer(spd, "bossProjectilesExplodeTimer", "once"); // Projectile explodes
  }

  if (tm.hasFinished("bossProjectilesSingleShotTimer")) {
    createBossProjectileSingleShot(runtime, BOSSPROJSPEED);
  }

  if (tm.hasFinished("bossProjectilesTripleShotTimer")) {
    createBossProjectileTripleShot(runtime, BOSSPROJSPEED);
  }

  if (tm.hasFinished("bossProjectilesChainTripleShotTimer")) {
    createBossProjectileChainTripleShot(runtime, BOSSPROJSPEED);
  }

  // field projectiles
  if (tm.hasFinished("bossFieldProjectilesTimer")) {
    // Create a projectile and roughly aim it at the player
    const rx = Math.floor(Math.random() * 16) - 8;
    const ry = Math.floor(Math.random() * 16) - 8;

    const p = runtime.objects.BossProjectile.createInstance(
      "Game",
      bossCol.x,
      bossCol.y
    );
    p.zElevation = 24;

    setTimeout(() => {
      const spd =
        dist2D(p.x, p.y, playerCol.x + rx, playerCol.y + ry) / BOSSPROJSPEED;

      // Start projectile movement and explosion timer
      p.behaviors.Tween.startTween(
        "position",
        [playerCol.x + rx, playerCol.y + ry],
        spd,
        "in-sine"
      );

      p.behaviors.Tween.startTween("z-elevation", 0, spd, "in-sine");

      bossCol.behaviors.Timer.startTimer(0.4, "bossBackToIdleTimer", "once"); // Go back to idle
      bossCol.behaviors.Timer.startTimer(2, "bossAttackTimer", "once"); // Restart attack timer
    }, 1000);
  }

  // Projectiles Explosion
  if (tm.hasFinished("bossProjectilesExplodeTimer")) {
    // Get all projectiles currently on the map and destroy them, placing an explosion in its place
    texture.bFBExp.getFirstInstance().startAnimation("beginning");
    for (const p of runtime.objects.BossProjectile.getAllInstances()) {
      runtime.objects.BossFBExpModel.createInstance("Game", p.x, p.y);
      p.destroy();
    }
    bossCol.behaviors.Timer.startTimer(0.5, "bossExplosionRemoveTimer"); // Activate explosion remover timer
  }

  // Explosion Remove
  if (tm.hasFinished("bossExplosionRemoveTimer")) {
    for (const e of runtime.objects.BossFBExpModel.getAllInstances()) {
      e.destroy();
    }
  }

  // Boss goes back to idle state
  if (tm.hasFinished("bossBackToIdleTimer")) {
    bossModel.setFaceObject("right", texture.bIdle);
  }
}

function movePlayerModel(runtime) {
  // Make PlayerModel follow PlayerCollider smoothly

  let followX = lerp(playerModel.x, playerCol.x, 10 * runtime.dt);
  playerModel.x = followX;

  let followY = lerp(playerModel.y, playerCol.y, 10 * runtime.dt);
  playerModel.y = followY;
}

function getInputs(runtime) {
  // Get player inputs and execute the corresponding actions

  // [Enter] (re)starts the game
  if (keyboard.isKeyDown("Enter") && !inputsEnabled) {
    // Boss starts attacking
    bossCol.behaviors.Timer.startTimer(1, "bossAttackTimer", "once");

    // If player or boss is dead, restart the game
    if (playerModel.height == 0 || bossCol.zElevation == -64) {
      restartGame(runtime);

      // Otherwise enable inputs and show the proper UI
    } else {
      inputsEnabled = true;

      uiLifeBar.behaviors.Tween.startTween("opacity", 1, 0.5, "in-out-sine");

      uiLifeBarName.behaviors.Tween.startTween(
        "opacity",
        1,
        0.5,
        "in-out-sine"
      );
      uiTutorialText.behaviors.Tween.startTween(
        "opacity",
        0,
        0.5,
        "in-out-sine"
      );
    }
  }

  if (!inputsEnabled) return; // If inputs are not enabled, ignore

  const pv = playerCol.instVars; // Shorthand to make code more compact
  pv.isWalking = false; // Before getting the inputs, assume player is idle

  // Player movement
  if (pv.dashing == "N" && !pv.isAttacking) {
    // Move forward
    if (keyboard.isKeyDown("ArrowUp")) {
      playerCol.x += Math.cos(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      playerCol.y += Math.sin(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      pv.isWalking = true;
      playerModel.setFaceObject("left", texture.pWalk);
    }

    // Move fackwards
    if (keyboard.isKeyDown("ArrowDown")) {
      playerCol.x -= Math.cos(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      playerCol.y -= Math.sin(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      pv.isWalking = true;
      playerModel.setFaceObject("left", texture.pWalk);
    }

    // Move left
    if (keyboard.isKeyDown("ArrowLeft")) {
      playerCol.x +=
        Math.cos(playerCol.angle - Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      playerCol.y +=
        Math.sin(playerCol.angle - Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      pv.isWalking = true;
      playerModel.setFaceObject("left", texture.pWalk);
    }

    // Move right
    if (keyboard.isKeyDown("ArrowRight")) {
      playerCol.x +=
        Math.cos(playerCol.angle + Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      playerCol.y +=
        Math.sin(playerCol.angle + Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      pv.isWalking = true;
      playerModel.setFaceObject("left", texture.pWalk);
    }
  }

  // Perform Dash
  if (
    keyboard.isKeyDown(88) &&
    !pv.dashInCooldown &&
    pv.dashing == "N" &&
    !pv.isAttacking
  ) {
    // Dash left
    if (keyboard.isKeyDown("ArrowLeft") && pv.dashing == "N") {
      texture.pDashL.getFirstInstance().startAnimation("beginning");
      playerModel.setFaceObject("left", texture.pDashL);
      pv.dashing = "L";

      // play sound
      runtime.callFunction("playBoostSound");

      // Dash right
    } else if (keyboard.isKeyDown("ArrowRight") && pv.dashing == "N") {
      texture.pDashR.getFirstInstance().startAnimation("beginning");
      playerModel.setFaceObject("left", texture.pDashR);
      pv.dashing = "R";

      // play sound
      runtime.callFunction("playBoostSound");

      // Dash forward
    } else if (keyboard.isKeyDown("ArrowUp") && pv.dashing == "N") {
      texture.pDashR.getFirstInstance().startAnimation("beginning");
      playerModel.setFaceObject("left", texture.pDashR);
      pv.dashing = "F";

      // play sound
      runtime.callFunction("playBoostSound");

      // Dash backwards
    } else if (keyboard.isKeyDown("ArrowDown") && pv.dashing == "N") {
      texture.pDashL.getFirstInstance().startAnimation("beginning");
      playerModel.setFaceObject("left", texture.pDashL);
      pv.dashing = "B";

      // play sound
      runtime.callFunction("playBoostSound");
      playerTensionIncrement(5)
    }

    // Disable dash for now, then reset player movement and reset dash
    pv.dashInCooldown = true;

    setTimeout(() => {
      pv.dashing = "N";
      pv.pspeed = PSPEED;
    }, 400);

    setTimeout(() => (pv.dashInCooldown = false), 500);
  }

  // Attack
  if (
    keyboard.isKeyDown(90) &&
    !pv.attackInCooldown &&
    pv.dashing == "N" &&
    !pv.isAttacking
  ) {
    pv.isAttacking = true;
    texture.pHit.getFirstInstance().startAnimation("beginning");
    playerModel.setFaceObject("left", texture.pHit);

    texture.pHitEffect.getFirstInstance().startAnimation("beginning");
    playerEffectModel.setFaceObject("front", texture.pHitEffect);

    // play sound
    runtime.callFunction("playSaberSound");

    // Disable attack for now, then reset it later
    pv.attackInCooldown = true;

    setTimeout(() => {
      pv.isAttacking = false;
    }, 500);

    setTimeout(() => (pv.attackInCooldown = false), 1000);

    // If the player is close to the boss, deal damage
    if (
      dist2D(playerCol.x, playerCol.y, bossCol.x, bossCol.y) <
      PLAYERATTACKDISTANCE
    ) {
      bossFlash();

      playerTensionIncrement(10);

      // create slash effect
      const playerFrontX = playerCol.x + Math.cos(playerCol.angle) * 20;
      const playerFrontY = playerCol.y + Math.sin(playerCol.angle) * 20;

      const slashEffect0 = runtime.objects.slashEffect.createInstance(
        "Game",
        playerFrontX,
        playerFrontY
      );

      // slashEffect0.behaviors.Tween.startTween("height", 0, 0.2, "in-out-sine");
      setTimeout(() => {
        slashEffect0.destroy();
      }, 100);

      // Damage not enough to kill the boss
      if (uiLifeBar.width > PDMG && bossCol.zElevation >= 0) {
        uiLifeBar.width = Math.max(0, uiLifeBar.width - PDMG);

        bossCol.behaviors.Tween.startTween("z-elevation", 54, 0.1, "in-sine");
        bossCol.behaviors.Tween.startTween("z-elevation", 0, 0.1, "in-sine");

        // Damage is enough to kill the boss, so it dies
      } else {
        uiLifeBar.width = 0;
        bossModel.setFaceObject("right", texture.bIdle);
        bossCol.behaviors.Tween.startTween("z-elevation", -64, 2, "in-sine");
        stopEverything(runtime);
        setTimeout(() => endGame("won"), 2000);
      }
    }
  }
}

function bossFlash() {
  // Boss flashes
  bossModel.effects[0].setParameter(2, 2);
  setTimeout(() => bossModel.effects[0].setParameter(2, 1), 50);
}

function playerDashState(runtime) {
  // Check if player is in a dash state, otherwise make it idle

  const pv = playerCol.instVars; // Shorthand to make code more compact

  switch (pv.dashing) {
    case "L":
      pv.pspeed = PSPEED * PDASH * 2;
      playerCol.x +=
        Math.cos(playerCol.angle - Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      playerCol.y +=
        Math.sin(playerCol.angle - Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      break;
    case "R":
      pv.pspeed = PSPEED * PDASH * 2;
      playerCol.x +=
        Math.cos(playerCol.angle + Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      playerCol.y +=
        Math.sin(playerCol.angle + Math.PI / 2) * pv.pspeed * 60 * runtime.dt;
      break;
    case "F":
      pv.pspeed = PSPEED * PDASH * 2;
      playerCol.x += Math.cos(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      playerCol.y += Math.sin(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      break;
    case "B":
      pv.pspeed = PSPEED * PDASH * 2;
      playerCol.x -= Math.cos(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      playerCol.y -= Math.sin(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
      break;
  }

  // Set the player to idle
  if (pv.dashing == "N" && !pv.isWalking && !pv.isAttacking)
    playerModel.setFaceObject("left", texture.pIdle);
}

function computeCollisions(runtime, fieldX, fieldY) {
  // Compute player collision with other objects

  const pv = playerCol.instVars; // Shorthand to make code more compact

  // Check collision with the Boss
  if (playerCol.testOverlap(bossCol)) {
    playerCol.x -= Math.cos(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
    playerCol.y -= Math.sin(playerCol.angle) * pv.pspeed * 60 * runtime.dt;
  }

  //Check collision with Boss projectiles (kills the player)
  for (const bb of runtime.objects.BossProjectile.getAllInstances()) {
    if (
      dist2D(playerCol.x, playerCol.y, bb.x, bb.y) < 16 &&
      bb.zElevation < 16
    ) {
      playerGotHit(runtime);
    }
  }

  for (const cc of runtime.objects.BossFBExpModel2.getAllInstances()) {
    if (
      dist2D(playerCol.x, playerCol.y, cc.x, cc.y) < 56 &&
      cc.zElevation < 16
    ) {
      playerGotHit(runtime);
    }
  }

  // Limit the player inside the arena
  playerCol.x = Math.min(fieldX, Math.max(100, playerCol.x));
  playerCol.y = Math.min(fieldY, Math.max(100, playerCol.y));

  // Limit the boss inside the arena
  bossCol.x = Math.min(fieldX, Math.max(100, bossCol.x));
  bossCol.y = Math.min(fieldY, Math.max(100, bossCol.y));
}

function setCamera3D(runtime) {
  // Set camera position and rotation to follow the playerCol

  // Place the camera behind the playerCol
  const camX = lerp(
    camera.getCameraPosition()[0],
    playerCol.x - 35 * Math.cos(playerCol.angle),
    LERPFACTOR * 60 * runtime.dt
  );

  const camY = lerp(
    camera.getCameraPosition()[1],
    playerCol.y - 35 * Math.sin(playerCol.angle),
    LERPFACTOR * 60 * runtime.dt
  );

  // Point the camera to the bossCol
  camLookX = lerp(camLookX, bossCol.x, LERPFACTOR * 60 * runtime.dt);
  camLookY = lerp(camLookY, bossCol.y, LERPFACTOR * 60 * runtime.dt);

  // Apply the camera settings
  camera.lookAtPosition(
    camX,
    camY,
    CAMHEIGHT,
    camLookX,
    camLookY,
    CAMHEIGHT,
    0,
    0,
    1
  );
}

function blinkingObject(object, blinkingSpeed) {
  blinkingInterval = setInterval(() => {
    object.effects[0].setParameter(2, 2);
    setTimeout(() => object.effects[0].setParameter(2, 1), blinkingSpeed);
  }, 200);
}

function playerGotHit(runtime) {
  if (playerInvincible) return;

  playerInvincible = true;

  // make player blicking
  if (playerInvincible) {
    blinkingObject(playerModel, 50);
  }

  runtime.callFunction("updateGotHitCount");
  playerTensionIncrement(20);

  if (0 < playerHealth) {
    playerHealth -= 1;
    playerModel.effects[0].setParameter(2, 2);
    playGirlTakeDamage(runtime);
    setTimeout(() => playerModel.effects[0].setParameter(2, 1), 50);
  } else {
    playGirlTakeDamage(runtime);
    playerDeath(runtime);
  }

  setTimeout(() => {
    playerInvincible = false;
    clearInterval(blinkingInterval);
  }, 2000);
}

function playGirlTakeDamage(runtime) {
  const randSound = Math.floor(Math.random() * 3);

  runtime.callFunction(`playGirlTakeDamage${randSound}`);
}

function playerDeath(runtime) {
  // Player death

  playerModel.behaviors.Tween.startTween("height", 0, 0.5, "in-out-sine");
  stopEverything(runtime);
  endGame("lost");
}

function stopEverything(runtime) {
  // Stop everything relevant that may be going on

  bossCol.behaviors.Timer.stopAllTimers(); // Stop all boss timers

  // Destroy projectiles and explosions
  for (const p of runtime.objects.BossProjectile.getAllInstances()) p.destroy();
  for (const e of runtime.objects.BossFBExpModel.getAllInstances()) e.destroy();
  for (const e of runtime.objects.ExplodeEffectModel.getAllInstances())
    e.destroy();
  bossFB.x = 10000; // Move indicator ouside the screen
  bossAB.x = 10000; // Move indicator ouside the screen
}

function endGame(mode) {
  // Stop the game and show vitory/defeat screen depending on the mode

  inputsEnabled = false;

  if (mode == "lost")
    uiDeathText.behaviors.Tween.startTween("opacity", 1, 0.5, "in-out-sine");
  else
    uiVictoryText.behaviors.Tween.startTween("opacity", 1, 0.5, "in-out-sine");

  uiPressEnter.behaviors.Tween.startTween("opacity", 1, 0.5, "in-out-sine");
  uiFader.behaviors.Tween.startTween("opacity", 1, 0.5, "in-out-sine");
}

export {
  onBeforeProjectStart,
  playerShieldIncrement,
  runtimeGlobal,
  texture,
  BOSSPROJSPEED,
};
