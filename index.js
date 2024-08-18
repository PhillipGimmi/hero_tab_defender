const CONFIG = {
    PERSON: '🧑',
    MONSTERS: {
        BASIC: '👾',
        FAST: '🚀',
        TANK: '🛡️',
        JUMPER: '🦘',
        BOSS: '👹',  // Default boss icon
        ZOMBIE: '🧟'
    },
    BOSSES: [
        '👹', // Boss 1
        '👺', // Boss 2
        '💀', // Boss 3
        '🦈', // Boss 4
        '🐉', // Boss 5
        '🦖', // Boss 6
        '👽', // Boss 7
        '🤖', // Boss 8
        '🧛', // Boss 9
        '🐲'  // Boss 10
    ],
    SPACE: '_',
    HOME_BASE: '🏠',
    BULLET: '•',
    GRAPPLE: '—[',  // Changed this line
    MAX_TITLE_LENGTH: 25,
    BASE_SPEED: 1000,
    INITIAL_BULLET_SPEED: 3,
    MACHINE_GUN_ROUNDS: 10,  
    PEOPLE_FOR_MACHINE_GUN: 10,
    GRAPPLE_SPEED: 1000,
    GRAPPLE_RETURN_SPEED: 500,
    NORMAL_GUN_COOLDOWN: 500,
    MACHINE_GUN_FIRE_RATE: 100
};

CONFIG.GRAPPLE = '—[';

let machineGunAmmo = 0;
let isMachineGunActive = false;
let machineGunCooldown = 0;
const MACHINE_GUN_COOLDOWN = 5; // 5 frame cooldown between bursts
const MAX_MACHINE_GUN_BULLETS = 10;
const AMMO_PER_MACHINE_GUN_BULLET = 10;


// Game state
let gameState = {
    isRunning: false,
    score: 0,
    wave: 0,
    entitiesSpawned: 0, 
    entities: [],
    bullets: [],
    grapplePosition: null,
    humansKilledByPlayer: 0,
    humansKilledByMonsters: 0,
    grappleInUse: false,
    grappleReturning: false,
    nextBoss: 10,
    tickCount: 0,
    bulletSpeed: CONFIG.INITIAL_BULLET_SPEED,
    gameSpeed: 1,
    peopleSaved: 0,
    machineGunAmmo: 0,
    isMachineGun: false,
    normalGunUpgrade: 0,
    points: 0,
    gameStartTime: null,
    humansKilled: 0,
    bossesKilled: 0,
    monstersKilled: 0,
    hasPurchasedUpgrade: false,
    bossSpawned: false,
    caughtEntity: null,
    monstersHooked: 0
};

function spawnEntities() {
    if (gameState.tickCount % gameState.spawnInterval === 0) {
        console.log(`Entities Spawned: ${gameState.entitiesSpawned}, Next Boss at: ${gameState.nextBoss}, Current Wave: ${gameState.wave}`);

        if (gameState.entitiesSpawned >= gameState.nextBoss && !gameState.bossSpawned) {
            spawnBossAndHelpers();
        } else if (!gameState.bossSpawned) {
            spawnRegularEntity();
        }

        gameState.wave++;
    }

    spawnBonusHuman();
    ensureMinimumHumans();
}

function spawnRegularEntities() {
    console.log(`Entities Spawned: ${gameState.entitiesSpawned}, Next Boss at: ${gameState.nextBoss}, Current Wave: ${gameState.wave}`);

    if (shouldSpawnBoss()) {
        spawnBossAndHelpers();
    } else if (!gameState.bossSpawned) {
        spawnRegularEntity();
    }

    gameState.wave++;
}

function shouldSpawnBoss() {
    return gameState.entitiesSpawned >= gameState.nextBoss && !gameState.bossSpawned;
}

function spawnBossAndHelpers() {
    console.log("Attempting to spawn Boss...");
    const bossAndHelpers = spawnBoss();
    if (bossAndHelpers.length > 0) {
        gameState.entities.push(...bossAndHelpers);
        gameState.bossSpawned = true;
        gameState.nextBoss += 20;
        console.log("Boss and helpers successfully added to entities:", 
            gameState.entities.filter(e => e.type === 'BOSS' || e.type === 'HELPER'));
    }
}

function spawnRegularEntity() {
    let entity = determineEntityType();
    gameState.entities.push(entity);
    gameState.entitiesSpawned++;
    console.log(`New Entity Spawned: ${entity.type}, Total Entities Spawned: ${gameState.entitiesSpawned}`);
}

function spawnBonusHuman() {
    if (gameState.bossesKilled > 0 && gameState.tickCount % 500 === 0) {
        spawnHumanAtSafePosition();
    }
}

function ensureMinimumHumans() {
    const humansOnScreen = gameState.entities.filter(e => e.type === 'PERSON').length;
    if (humansOnScreen < 3 && Math.random() < 0.1) {
        spawnHumanAtSafePosition();
    }
}

function spawnHumanAtSafePosition() {
    const safePosition = findSafeSpawnPosition();
    if (safePosition !== null) {
        gameState.entities.push(new Entity('PERSON', 1, 1, null, safePosition));
    }
}

function findSafeSpawnPosition() {
    const occupiedPositions = new Set(gameState.entities.map(e => e.position));
    for (let i = CONFIG.MAX_TITLE_LENGTH - 1; i > 1; i--) {
        if (!occupiedPositions.has(i) && !occupiedPositions.has(i - 1)) {
            return i;
        }
    }
    return null;
}

function updateMachineGun() {
    if (machineGunCooldown > 0) {
        machineGunCooldown--;
    }

    if (isMachineGunActive && machineGunAmmo >= AMMO_PER_MACHINE_GUN_BULLET && machineGunCooldown === 0) {
        const bulletsToShoot = Math.min(MAX_MACHINE_GUN_BULLETS, Math.floor(machineGunAmmo / AMMO_PER_MACHINE_GUN_BULLET));
        for (let i = 0; i < bulletsToShoot; i++) {
            shootBullet();
            machineGunAmmo -= AMMO_PER_MACHINE_GUN_BULLET;
        }
        machineGunCooldown = MACHINE_GUN_COOLDOWN;
    }
}

// Notify player upon unlocking the machine gun
function checkMachineGunUnlock() {
    if (gameState.monstersKilled >= 20 && !gameState.isMachineGun) {
        gameState.isMachineGun = true;
        showNotification("You've killed 20 monsters! You've unlocked the machine gun. Press '2' to fire.");
    }
}

// Function to show a notification
function showNotification(message, duration = 3000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Trigger reflow without linter warnings
    notification.getBoundingClientRect();
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, duration);
}

// Function to show a modal
function showModal(title, message, buttons = []) {
    const modalContainer = document.getElementById('modal-container');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <h2>${title}</h2>
        <p>${message}</p>
        <div class="modal-buttons"></div>
    `;
    
    const buttonContainer = modal.querySelector('.modal-buttons');
    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = button.text;
        btn.addEventListener('click', () => {
            button.onClick();
            modalContainer.classList.remove('show');
            setTimeout(() => {
                modalContainer.innerHTML = '';
            }, 300);
        });
        buttonContainer.appendChild(btn);
    });
    
    modalContainer.innerHTML = '';
    modalContainer.appendChild(modal);
    modalContainer.classList.add('show');
}

function showPrompt(title, message, callback) {
    const modalContainer = document.getElementById('modal-container');
    const modal = document.createElement('div');
    modal.className = 'modal hall-of-heroes-modal';
    modal.innerHTML = `
        <h2>${title}</h2>
        <p>${message}</p>
        <input type="text" id="prompt-input" class="prompt-input" placeholder="Enter your name" autofocus>
        <div class="modal-buttons">
            <button id="prompt-submit" class="btn-submit">Submit</button>
        </div>
    `;

    modalContainer.innerHTML = '';
    modalContainer.appendChild(modal);
    modalContainer.classList.add('show');

    const input = modal.querySelector('#prompt-input');
    const submitButton = modal.querySelector('#prompt-submit');

    const handleSubmit = () => {
        const playerName = input.value.trim();
        if (playerName) {
            closeModal();
            callback(playerName);
        } else {
            showNotification("Please enter a valid name to submit your application.");
            return; // Don't close the modal or call the callback if no name is entered
        }
        // Trigger the game over screen immediately after closing the modal
        showGameOverModal();
    };

    submitButton.addEventListener('click', handleSubmit);

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    });

    function closeModal() {
        modalContainer.classList.remove('show');
        modalContainer.innerHTML = '';
    }

    input.focus();
}

function disableGrapplingHook() {
    console.log('Disabling grappling hook...');
    gameState.grappleDisabled = true;
    document.getElementById('grappleStatus').innerText = 'Grappling hook disabled';

    setTimeout(() => {
        document.getElementById('grappleStatus').innerText = '';
        gameState.grappleDisabled = false;
        console.log('Grappling hook re-enabled after 5 seconds.');
    }, 5000); // 5 seconds delay
}

// Audio setup
const audio = {
    fx: {
        bossDeath: new Audio('sound/fx/bossdeathsound.mp3'),
        grapplingHook: new Audio('sound/fx/grapplinghook.mp3'),
        gunFire: new Audio('sound/fx/gunfire.mp3'),
        hit: new Audio('sound/fx/hit.mp3'),
        humanSaved: new Audio('sound/fx/human saved.mp3'),
        machineGun: new Audio('sound/fx/machinegun.mp3'),
        monsterReact1: new Audio('sound/fx/monster reacts to bullet.mp3'),
        monsterReact2: new Audio('sound/fx/monster reacts to bullet alternative.mp3'),
        scream: new Audio('sound/fx/scream.mp3'),
        reload: new Audio('sound/fx/reload.mp3'), // Added reload sound effect
    },
    music: {
        boss: [new Audio('sound/music/boss.mp3'), new Audio('sound/music/boss1.mp3')],
        game: new Audio('sound/music/game music.mp3'),
        gameOver: new Audio('sound/music/gameover.mp3'),
        start: new Audio('sound/music/start game music.mp3')
    },
    currentMusic: null
};

// Global variables
let lastNormalGunFireTime = 0;
let machineGunInterval = null;
let canFireNormalGun = true;
let humansSpawnedThisCycle = 0;
let difficultyIncreasedAfterBoss = false;

class Entity {
    constructor(type, health = 1, speed = 1, icon = null, startPosition = null) {
        this.type = type;
        this.health = health;
        this.speed = speed;
        this.position = startPosition !== null ? startPosition : CONFIG.MAX_TITLE_LENGTH - 1;
        this.stepCount = 0;
        this.icon = icon || (type === 'PERSON' ? CONFIG.PERSON : CONFIG.MONSTERS[type] || CONFIG.SPACE);
        this.movingForward = false; // For boss movement
    }

    move() {
        const moveInterval = Math.floor(CONFIG.BASE_SPEED / this.speed / 100 / gameState.gameSpeed);
        if (gameState.tickCount % moveInterval === 0) {
            if (this.type === 'BOSS') {
                // Boss moves back and forth
                if (this.position <= CONFIG.MAX_TITLE_LENGTH - 5) {
                    this.movingForward = true;
                } else if (this.position >= CONFIG.MAX_TITLE_LENGTH - 1) {
                    this.movingForward = false;
                }
                this.position += this.movingForward ? 1 : -1;
            } else if (this.type === 'JUMPER' && this.stepCount++ === 1) {
                this.position = Math.max(0, this.position - 4);
                this.stepCount = 0;
            } else if (this.type !== 'HELPER') { // Regular entities and non-helper monsters move towards the base
                this.position--;
            }
            // Helpers don't move
        }
    }
}

// Bullet class
class Bullet {
    constructor(isMachineGun = false) {
        this.position = 1;
        this.isMachineGun = isMachineGun;
        this.lastVisiblePosition = 1;
    }

    move() {
        const oldPosition = this.position;
        this.position += gameState.bulletSpeed;
        this.lastVisiblePosition = Math.floor(this.position);
        console.log(`Bullet moved from ${oldPosition.toFixed(2)} to ${this.position.toFixed(2)} (speed: ${gameState.bulletSpeed.toFixed(2)})`);
    }
}

// Game loop
function gameLoop() {
    if (!gameState.isRunning) return;

    gameState.tickCount++;

    console.log("--- Game Loop Start ---");
    console.log("Entities:", gameState.entities.map(e => `${e.type}(${e.position})`).join(', '));
    console.log("Boss Spawned:", gameState.bossSpawned);

    moveEntities();
    moveBullets();
    handleBossProjectiles(); // New function to handle boss projectiles
    if (gameState.grappleInUse) {
        moveGrapplingHook();
    }
    checkCollisions();
    checkBaseReached();
    spawnEntities();
    updateGameSpeed();
    updateTitle();
    updateGameStats();

    // Reset humansSpawnedThisCycle every 100 ticks
    if (gameState.tickCount % 100 === 0) {
        humansSpawnedThisCycle = 0;
    }

    // Spawn a bonus human every 500 ticks after the first boss
    if (gameState.bossesKilled > 0 && gameState.tickCount % 500 === 0) {
        gameState.entities.push(new Entity('PERSON', 1, 1));
    }

    // Ensure a minimum number of humans on the screen
    const humansOnScreen = gameState.entities.filter(e => e.type === 'PERSON').length;
    if (humansOnScreen < 1 && Math.random() < 0.01) { // 1% chance each tick to spawn a human if below minimum
        gameState.entities.push(new Entity('PERSON', 1, 1));
    }

    console.log("--- Game Loop End ---");

    setTimeout(gameLoop, 100); // Control game speed
}

function moveEntities() {
    gameState.entities.forEach((entity, index) => {
        console.log(`Entity ${index}: Type ${entity.type}, Position ${entity.position}, Speed ${entity.speed}`);
        entity.move();
        console.log(`After Move: Entity ${index}: Type ${entity.type}, Position ${entity.position}`);
    });
    checkEntityOverlap();
    checkEntityCollisions();
}
function handleBossProjectiles() {
    if (gameState.bossSpawned) {
        const boss = gameState.entities.find(entity => entity.type === 'BOSS');
        if (boss && Math.random() < 0.05) { // 5% chance to shoot each tick
            const projectile = new BossProjectile(boss.position - 1, getBossProjectileType(boss));
            gameState.bossProjectiles.push(projectile);
        }
    }

    // Move existing projectiles
    gameState.bossProjectiles.forEach(projectile => projectile.move());

    // Remove projectiles that are out of bounds
    gameState.bossProjectiles = gameState.bossProjectiles.filter(projectile => projectile.position > 0);
}

class BossProjectile {
    constructor(position, type) {
        this.position = position;
        this.type = type;
        this.icon = getBossProjectileIcon(type);
    }

    move() {
        this.position--;
    }
}

function getBossProjectileType(boss) {
    const bossLevel = CONFIG.BOSSES.indexOf(boss.icon);
    switch (bossLevel) {
        case 0: return 'BASIC';
        case 1: return 'FAST';
        case 2: return 'SPLIT';
        case 3: return 'HOMING';
        case 4: return 'EXPLOSIVE';
        default: return 'BASIC';
    }
}

function getBossProjectileIcon(type) {
    switch (type) {
        case 'BASIC': return '•';
        case 'FAST': return '◊';
        case 'SPLIT': return '⋄';
        case 'HOMING': return '⟡';
        case 'EXPLOSIVE': return '◉';
        default: return '•';
    }
}

// Move all bullets
function moveBullets() {
    gameState.bullets.forEach(bullet => {
        bullet.move();
        bullet.lastVisiblePosition = Math.floor(bullet.position);
    });
    gameState.bullets = gameState.bullets.filter(bullet => bullet.position < CONFIG.MAX_TITLE_LENGTH);
}

// Check for collisions between bullets and entities
function checkCollisions() {
    // Check player bullets with entities
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        for (let j = gameState.entities.length - 1; j >= 0; j--) {
            if (gameState.bullets[i].position >= gameState.entities[j].position) {
                handleCollision(i, j);
                break;
            }
        }
    }

    // Check boss projectiles with player bullets
    for (let i = gameState.bossProjectiles.length - 1; i >= 0; i--) {
        for (let j = gameState.bullets.length - 1; j >= 0; j--) {
            if (gameState.bossProjectiles[i].position <= gameState.bullets[j].position) {
                gameState.bossProjectiles.splice(i, 1);
                gameState.bullets.splice(j, 1);
                gameState.score += 1;
                break;
            }
        }
    }

    // Check if boss projectiles hit the base
    for (let i = gameState.bossProjectiles.length - 1; i >= 0; i--) {
        if (gameState.bossProjectiles[i].position <= 1) {
            gameState.bossProjectiles.splice(i, 1);
            handleBossProjectileHit();
        }
    }
}

function handleBossProjectileHit() {
    gameState.score -= 2;
    if (gameState.score < 0) {
        endGame();
    }
}
// Handle collision between a bullet and an entity
function handleCollision(bulletIndex, entityIndex) {
    const entity = gameState.entities[entityIndex];
    const bullet = gameState.bullets[bulletIndex];

    if (entity.type === 'PERSON') {
        handlePersonHit(entityIndex);
    } else {
        handleMonsterHit(entityIndex, bullet.isMachineGun, bullet.power);
    }

    gameState.bullets.splice(bulletIndex, 1);
}

// Check for collisions between entities (monsters and humans)
function checkEntityCollisions() {
    for (const entity1 of gameState.entities) {
        if (isMonster(entity1)) {
            // Check if the monster collides with any human
            for (const entity2 of gameState.entities) {
                if (entity2.type === 'PERSON' && entity1.position === entity2.position) {
                    handlePersonCaught(gameState.entities.indexOf(entity2));
                }
            }
        }
    }
}


// Handle a person being caught by a monster
function handlePersonCaught(personIndex) {
    const humanPosition = gameState.entities[personIndex].position;
    gameState.score -= 1; // Corrected to deduct 1 point when a monster kills a human
    gameState.machineGunAmmo = Math.max(0, gameState.machineGunAmmo - 10); // Deduct 10 ammo, but not below 0
    gameState.humansKilledByMonsters += 1;
    gameState.entities[personIndex] = new Entity('ZOMBIE', 1, 0.8); // Convert the human into a zombie
    gameState.entities[personIndex].position = humanPosition;
    audio.fx.scream.play();

    updateGameStats(); // Update the game stats to reflect the changes in points and ammo
}


// Check if an entity is a monster
function isMonster(entity) {
    return entity.type !== 'PERSON' && entity.type !== 'ZOMBIE';
}

// Check for entities reaching the base
function checkBaseReached() {
    const homeBasePosition = 1; // The position of the home base
    gameState.entities.forEach((entity, index) => {
        if (entity.position <= homeBasePosition) {
            if (entity.type === 'PERSON') {
                handlePersonSaved();
                gameState.entities.splice(index, 1);
            } else if (isMonster(entity)) {
                endGame(); // End the game if any monster reaches the base
            }
        }
    });
}
// Handle a person being saved
function handlePersonSaved() {
    gameState.score += 1;
    gameState.peopleSaved++;
    gameState.machineGunAmmo += 20; // Increased from 10 to 20
    audio.fx.humanSaved.play();
    updateTitle();
}

function fireBullet() {
    const bullet = new Bullet(gameState.isMachineGun);
    gameState.bullets.push(bullet);
    console.log("Fired bullet, total bullets:", gameState.bullets.length); // Add this line for debugging
}

// Example of refactoring entity spawning into a single function
function spawnEntity() {
    gameState.wave++;
    let entity = determineEntityType();
    gameState.entities.push(entity);
    gameState.entitiesSpawned++;
    maintainDifficulty();
    updateGameStats();
}

// Refactored logic for increasing difficulty and ensuring that the game scales appropriately
function maintainDifficulty() {
    const baseEntities = 5;
    const maxEntities = gameState.bossSpawned 
        ? baseEntities + Math.floor((gameState.wave - 10) / 2) 
        : baseEntities;

    gameState.entities = gameState.entities.slice(0, maxEntities);

    if (gameState.bossSpawned) {
        gameState.gameSpeed = 1 + ((gameState.wave - 10) * 0.1);
        gameState.bulletSpeed *= 1.05;
    }
    updateGameStats();
}

function spawnBoss() {
    try {
        const bossLevel = Math.min(Math.floor(gameState.wave / 10), CONFIG.BOSSES.length - 1);
        const bossHealth = 50 + bossLevel * 3;
        const bossSpeed = 0.5 + bossLevel * 0.1;
        const bossIcon = CONFIG.BOSSES[bossLevel];

        console.log(`Spawning Boss ${bossIcon} with ${bossHealth} health, ${bossSpeed} speed, at position ${CONFIG.MAX_TITLE_LENGTH - 1}.`);

        playBossMusic(); // Play boss music when spawning the boss

        const boss = new Entity('BOSS', bossHealth, bossSpeed, bossIcon, CONFIG.MAX_TITLE_LENGTH - 1);
        boss.movingForward = false; // Initialize boss movement direction

        const numberOfHelpers = 3;
        const helpers = [];
        for (let i = 0; i < numberOfHelpers; i++) {
            const helper = spawnMonster(true);
            helper.type = 'HELPER'; // Mark as helper for easy identification
            helpers.push(helper);
        }

        console.log("Boss entity created:", boss);
        console.log("Helper entities created:", helpers);

        return [boss, ...helpers];
    } catch (error) {
        console.error("Error spawning boss:", error);
        return [];
    }
}

// Determine the type of entity to spawn
function determineEntityType() {
    const baseHumanSpawnChance = 0.01; // 1% chance to spawn a human
    const bossesKilledBonus = gameState.bossesKilled * 0.05; // 5% increase per boss killed
    const humanSpawnChance = Math.min(baseHumanSpawnChance + bossesKilledBonus, 0.5); // Cap at 50% chance

    if (Math.random() < humanSpawnChance && humansSpawnedThisCycle < 10) {
        const safePosition = findSafeSpawnPosition();
        if (safePosition !== null) {
            humansSpawnedThisCycle++;
            return new Entity('PERSON', 1, 1, null, safePosition);
        }
    }
    return spawnMonster(true);
}

function spawnMonster(isPoweredUp) {
    const monsterTypes = Object.keys(CONFIG.MONSTERS).filter(type => type !== 'BOSS' && type !== 'ZOMBIE');
    const randomType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
    return new Entity(randomType, getMonsterHealth(randomType), getMonsterSpeed(randomType, isPoweredUp));
}

function spawnEarlyGameEntity() {
    if (Math.random() < 0.5) {
        humansSpawnedThisCycle++;
        return new Entity('PERSON', 1, 1);
    }
    return spawnMonster(false);
}

function isTimeForBoss() {
    return humansSpawnedThisCycle >= 10 && gameState.wave >= gameState.nextBoss;
}

function spawnBossEntity() {
    humansSpawnedThisCycle = 0;
    gameState.nextBoss += 10;
    difficultyIncreasedAfterBoss = true;
    return spawnBoss();
}

function spawnLateGameEntity() {
    const monsterRatio = difficultyIncreasedAfterBoss ? 1 + Math.floor((gameState.wave - 20) / 10) : 1;
    const isPerson = Math.random() < 1 / (monsterRatio + 1);
    
    if (isPerson) {
        humansSpawnedThisCycle++;
        return new Entity('PERSON', 1, 1);
    }
    return spawnMonster(true);
}


// Get monster speed based on type
function getMonsterSpeed(type, isPoweredUp) {
    const baseSpeedMultiplier = isPoweredUp ? 1 + ((gameState.wave - 20) * 0.01) : 1;
    switch (type) {
        case 'BASIC': return 1 * baseSpeedMultiplier;
        case 'FAST': return 1.5 * baseSpeedMultiplier;
        case 'TANK': return 0.8 * baseSpeedMultiplier;
        case 'JUMPER': return 1.2 * baseSpeedMultiplier;
        default: return 1 * baseSpeedMultiplier;
    }
}

// Get monster health based on type and current wave
function getMonsterHealth(type) {
    const baseHealth = type === 'TANK' ? 2 : 1;
    const waveMultiplier = gameState.wave > 20 ? Math.pow(1.5, (gameState.wave - 20) / 10) : 1;
    return Math.floor(baseHealth * waveMultiplier + Math.floor(gameState.wave / 20));
}


function checkEntityOverlap() {
    const positions = {};
    gameState.entities.forEach((entity, index) => {
        if (positions[entity.position]) {
            if (entity.type === 'PERSON' && isMonster(positions[entity.position])) {
                handlePersonCaught(index);
            } else if (positions[entity.position].type === 'PERSON' && isMonster(entity)) {
                handlePersonCaught(gameState.entities.indexOf(positions[entity.position]));
            }
        } else {
            positions[entity.position] = entity;
        }
    });
}

// Update game speed
function updateGameSpeed() {
    if (gameState.tickCount % 1000 === 0) {
        gameState.gameSpeed *= 1.03; // Monsters' speed increases by 3% each cycle
        gameState.bulletSpeed *= 1.05; // Bullets' speed increases by 5% each cycle
        
        // Increase spawn rate
        const newSpawnInterval = Math.max(10, 50 - Math.floor(gameState.wave / 2));
        if (newSpawnInterval < gameState.spawnInterval) {
            gameState.spawnInterval = newSpawnInterval;
        }
    }
}

function updateTitle() {
    const display = Array(CONFIG.MAX_TITLE_LENGTH).fill(CONFIG.SPACE);
    const entityCounts = Array(CONFIG.MAX_TITLE_LENGTH).fill(0);

    // Process entities
    gameState.entities.forEach(entity => {
        if (entity.position >= 0 && entity.position < CONFIG.MAX_TITLE_LENGTH) {
            if (entityCounts[entity.position] === 0) {
                display[entity.position] = entity.icon;
            }
            entityCounts[entity.position]++;
        }
    });

    // Process bullets with visibility
    gameState.bullets.forEach(bullet => {
        const visiblePosition = Math.floor(bullet.position);
        if (visiblePosition >= 0 && visiblePosition < CONFIG.MAX_TITLE_LENGTH) {
            display[visiblePosition] = CONFIG.BULLET;
        }

        // Add a trail effect for fast-moving bullets
        if (bullet.lastVisiblePosition < visiblePosition) {
            for (let i = bullet.lastVisiblePosition; i < visiblePosition; i++) {
                if (i >= 0 && i < CONFIG.MAX_TITLE_LENGTH && display[i] === CONFIG.SPACE) {
                    display[i] = '.'; // Use a dot for the bullet trail
                }
            }
        }
    });

    // Show boss projectiles
    if (gameState.bossProjectiles) {
        gameState.bossProjectiles.forEach(projectile => {
            if (projectile.position >= 0 && projectile.position < CONFIG.MAX_TITLE_LENGTH) {
                display[projectile.position] = projectile.icon;
            }
        });
    }

    // Show grappling hook
    if (gameState.grapplePosition !== null) {
        const grappleMax = Math.floor(gameState.grapplePosition);
        for (let i = 1; i <= grappleMax; i++) {
            if (display[i] === CONFIG.SPACE) {
                display[i] = '-';
            }
        }
        display[grappleMax] = '[';

        if (gameState.caughtEntity && gameState.grappleReturning) {
            display[grappleMax] = gameState.caughtEntity.icon;
        }
    }

    // Display home base
    display[0] = CONFIG.HOME_BASE;

    // Add count indicators for multiple entities
    for (let i = 0; i < CONFIG.MAX_TITLE_LENGTH; i++) {
        if (entityCounts[i] > 1) {
            display[i] += entityCounts[i];
        }
    }

    const displayString = display.join('');

    // Update the title with the current game state, including bullet speed
    const bulletSpeedString = `Bullet Speed: ${gameState.bulletSpeed.toFixed(2)}`;
    document.title = `${displayString} | ${bulletSpeedString} | Score: ${gameState.score} | Ammo: ${gameState.machineGunAmmo}`;
}

// Start the game
function startGame() {
    gameState = {
        isRunning: true,
        score: 0,
        wave: 0,
        entitiesSpawned: 0, 
        entities: [],
        bullets: [],
        bossProjectiles: [],
        grapplePosition: null,
        humansKilledByPlayer: 0,
        humansKilledByMonsters: 0,
        // bulletSpeed: CONFIG.INITIAL_BULLET_SPEED,
        grappleInUse: false,
        grappleReturning: false,
        nextBoss: 10,
        tickCount: 0,
        gameSpeed: 1,
        peopleSaved: 0,
        machineGunAmmo: 0,
        isMachineGun: false,
        gameStartTime: Date.now(),
        humansKilled: 0,
        spawnInterval: 50, 
        bossesKilled: 0,
        monstersKilled: 0,
        normalGunUpgrade: 0,
        points: 0,
        bossSpawned: false,
        hasPurchasedUpgrade: false,
        bulletSpeed: 3, 
    };

    humansSpawnedThisCycle = 0;
    difficultyIncreasedAfterBoss = false;

    updateTitle();
    playGameMusic();
    activateGameStatsTab();
    gameLoop();
    checkMonstersHookedElement();
    updateGameStats();
}

function activateGameStatsTab() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    const gameStatsButton = document.querySelector('[data-tab="game-stats"]');
    const gameStatsContent = document.getElementById('game-stats');
    
    gameStatsButton.classList.add('active');
    gameStatsContent.classList.add('active');
}

// Get high scores
function getHighScores() {
    // Get the high scores from localStorage and return them sorted in descending order of score.
    const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
    return highScores.sort((a, b) => b.score - a.score).slice(0, 5);
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const negativeInsults = [
    "I can't believe you put your name to this.",
    "Did you even try? This isn't golf!",
    "Well, that was embarrassing.",
    "Better luck next time... a lot of it.",
    "Ouch! Maybe stick to knitting?",
    "Is this your best effort?",
    "Might want to hang that score in the hall of shame.",
    "Even the monsters are laughing.",
    "Maybe you're better at being bait?",
    "You call that a score?",
    "I’ve seen toddlers do better.",
    "You made it to the scoreboard... barely.",
    "Was this intentional?",
    "Let’s pretend this never happened.",
    "There’s always next time... I hope.",
    "Even the keyboard is disappointed.",
    "Consider a new hobby.",
    "Is this a joke? Oh, it’s your score.",
    "The monsters thank you for the free entertainment.",
    "You’re lucky this isn’t real life.",
    "Hall of Heroes? More like Hall of Turds.",
    "Seriously? This made it on the Hall of Heroes?",
    "Were you trying to fail, or did it just happen naturally?",
    "This score is like a bad horror movie, but not even worth watching.",
    "You should be charged with crimes against gaming.",
    "I’ve seen roadkill with more fight in them than this score.",
    "This isn’t a score; it’s a cry for help.",
    "Even a blindfolded squirrel would do better."
];

const lowPositiveJokes = [
    "Well, at least you tried.",
    "Not hero-worthy, but not bad.",
    "You didn’t save the day, but you showed up.",
    "Keep practicing, champ!",
    "Hey, it’s better than nothing!",
    "Not quite heroic, but keep going.",
    "You made an effort, that counts.",
    "Not bad for a beginner!",
    "Everyone starts somewhere.",
    "There’s potential in you... somewhere.",
    "A for effort, at least.",
    "You could do worse... maybe.",
    "Keep pushing, you'll get there.",
    "A noble attempt, but not quite.",
    "You have the heart, now just improve the skills.",
    "Not exactly hero material, but it’s a start.",
    "Hey, Rome wasn’t built in a day.",
    "A decent start, but aim higher.",
    "We’ll call this a warm-up.",
    "Keep your chin up, there's room for improvement.",
    "At least you didn’t embarrass yourself... too much.",
    "You might not be a legend, but you’re not a disaster either.",
    "Hero adjacent, but you still need a map.",
    "Not bad, but you’re no John Wick.",
    "Good job! Now, do it ten times better next time."
];

const heroicCompliments = [
    "Bravery knows no bounds! You left quite the legacy.",
    "A true hero among men!",
    "You’ve earned your place in the hall of legends!",
    "Heroic deeds immortalized!",
    "You’ve made your mark in history!",
    "A true warrior, no doubt!",
    "Your courage is unmatched!",
    "Legendary skills, worthy of praise!",
    "You’ve slain the monsters with style!",
    "A job well done, hero!",
    "You’ve earned your place in the hero’s hall.",
    "Your legacy will be remembered!",
    "Monsters tremble at your name!",
    "Your skills are the stuff of legend!",
    "You’ve proven yourself a true hero!",
    "Your bravery is an inspiration!",
    "Monsters feared you, heroes envy you.",
    "Your name will be spoken of in awe!",
    "A warrior's spirit, a hero’s heart!",
    "You’ve earned eternal glory!",
    "If Hercules were alive, he’d ask for your autograph.",
    "Your score will be sung in ballads for centuries.",
    "You didn’t just play the game; you redefined it.",
    "The gods themselves would kneel before your skill.",
    "The monsters tell tales of your might around their campfires."
];

function displayHighScores() {
    const highScores = getHighScores();
    const highScoresElement = document.getElementById('highScores');
    if (highScores.length === 0) {
        highScoresElement.innerHTML = '<li>No Heroes Yet</li>';
    } else {
        highScoresElement.innerHTML = '<ul>' + highScores.map(score => {
            let tooltipText;

            if (score.score < 0) {
                tooltipText = getRandomItem(negativeInsults);
            } else if (score.score < 10) {
                tooltipText = getRandomItem(lowPositiveJokes);
            } else {
                tooltipText = getRandomItem(heroicCompliments);
            }

            return `<li class="hero ${score.score < 0 ? 'negative-score' : ''}" data-tooltip="${tooltipText}">${score.name}: ${score.score} points</li>`;
        }).join('') + '</ul>';
    }
}


document.addEventListener('DOMContentLoaded', displayHighScores);


function handleGrapplingHook() {
    if (!gameState.isRunning || gameState.grappleDisabled || gameState.grappleInUse) {
        console.log('Grappling hook is currently disabled or already in use. Cannot use.');
        return;  // Prevents the hook from being used if disabled or already in use
    }

    console.log('Grappling hook is enabled. Initiating...');
    gameState.grappleInUse = true;
    gameState.grapplePosition = 1;
    gameState.grappleReturning = false;
    audio.fx.grapplingHook.play();

    updateTitle();
}

function resetGrapplingHook() {
    console.log('Resetting grappling hook...');
    if (!gameState.grappleDisabled) {
        gameState.grappleInUse = false;  // Ensure the hook is reset correctly if not disabled
    }
    gameState.grappleReturning = false;
    gameState.grapplePosition = null;
    gameState.caughtEntity = null;
}

// Move grappling hook
function moveGrapplingHook() {
    if (!gameState.grappleInUse || gameState.grappleDisabled) return;  // Prevent movement when disabled or not in use

    if (!gameState.grappleReturning) {
        extendGrapplingHook();
    } else {
        retractGrapplingHook();
    }
}


// Extend the grappling hook
function extendGrapplingHook() {
    gameState.grapplePosition += CONFIG.GRAPPLE_SPEED / 100;

    // Find the nearest human within the grappling hook's range
    let nearestHuman = gameState.entities.find(entity => entity.type === 'PERSON' && entity.position <= gameState.grapplePosition);

    if (nearestHuman) {
        gameState.grappleReturning = true;
        gameState.caughtEntity = nearestHuman;  // Store the caught human in gameState
    } else {
        // If no human is found, try to grab a monster
        let nearestMonster = gameState.entities.find(entity => isMonster(entity) && entity.position <= gameState.grapplePosition);
        if (nearestMonster) {
            gameState.grappleReturning = true;
            gameState.caughtEntity = nearestMonster;  // Store the caught monster in gameState
        } else if (gameState.grapplePosition >= CONFIG.MAX_TITLE_LENGTH - 1) {
            gameState.grappleReturning = true;
        }
    }
}

// Retract the grappling hook
function retractGrapplingHook() {
    if (gameState.caughtEntity) {
        // Remove the caught entity from its original position
        gameState.entities = gameState.entities.filter(e => e !== gameState.caughtEntity);
        gameState.caughtEntity.position = Math.floor(gameState.grapplePosition);
    }

    gameState.grapplePosition -= CONFIG.GRAPPLE_RETURN_SPEED / 100;

    if (gameState.grapplePosition <= 1) {
        if (gameState.caughtEntity) {
            processGrappledEntity(gameState.caughtEntity);
            gameState.caughtEntity = null;
        }
        resetGrapplingHook();
    }
}

// Process the entity pulled by the grappling hook
function processGrappledEntity(entity) {
    if (entity.type === 'BOSS') {
        console.log('Grappled the boss! You die.');
        showNotification('You grappled the boss and died!', 5000); // Show the notification for 5 seconds
        endGame(); // End the game if the player grapples the boss
    } else if (entity.type === 'PERSON') {
        handlePersonSaved();
    } else if (isMonster(entity)) {
        console.log('Monster hooked!');
        gameState.monstersHooked = (Number(gameState.monstersHooked) || 0) + 1;
        console.log(`Monsters hooked: ${gameState.monstersHooked}`);
        gameState.score = Math.max(0, gameState.score - 5);
        gameState.machineGunAmmo = Math.max(0, gameState.machineGunAmmo - 10);

        disableGrapplingHook();
        showNotification('You hooked a monster! Grappling hook disabled for 5 seconds.');

        gameState.entities = gameState.entities.filter(e => e !== entity);
        updateGameStats();
    }
}


// Pull entity with grappling hook
function pullEntityWithGrapplingHook(entity) {
    entity.position = gameState.grapplePosition;
}

// End game
function endGame() {
    gameState.isRunning = false;
    document.title = `Game Over! Score: ${gameState.score}`;
    document.getElementById('favicon').href = 'icon.png';
    stopAllMusic();
    audio.music.gameOver.play();

    const gameTime = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    const highScores = getHighScores();
    const isHighScore = highScores.length < 5 || gameState.score > highScores[highScores.length - 1].score;

    let message = `Score: ${gameState.score}\n`;
    message += `Wave: ${gameState.wave}\n`;
    message += `Humans Saved: ${gameState.peopleSaved}\n`;
    message += `Humans Killed by Player: ${gameState.humansKilledByPlayer}\n`;
    message += `Humans Killed by Monsters: ${gameState.humansKilledByMonsters}\n`;
    message += `Monsters Killed: ${gameState.monstersKilled}\n`;
    message += `Bosses Killed: ${gameState.bossesKilled}\n`;
    message += `Time Played: ${gameTime} seconds\n\n`;
    message += "High Scores:\n" + highScores.map(score => `${score.name}: ${score.score}`).join('\n');

    function showGameOverModal() {
        const failureJokes = [
            "Wow, you really tried, didn't you?",
            "Is this your best shot? Really?",
            "Even the monsters are laughing at this score.",
            "Pathetic. Just... pathetic.",
            "Were you even trying?",
            "Is this a joke? Oh, it's your score.",
            "Better luck next time... a lot of it.",
            "Maybe stick to knitting?",
            "That score was... something.",
            "Keep practicing, you'll get there. Maybe.",
            "Let's pretend this never happened.",
            "Well, at least you showed up.",
            "Consider a new hobby?",
            "Even the keyboard is disappointed.",
            "You call that a score?",
            "The monsters thank you for the free entertainment.",
            "Rome wasn't built in a day, but this score sure is low.",
            "Ouch! That had to hurt.",
            "At least you made the scoreboard... just kidding, haha.",
            "The monsters are laughing... at you.",
            "Probably better off dead to be honest, probably a win for humanity with the amount of humans who died on your watch",
            "No silly, you meant to kill the monsters not feed them, this is not Overcooked 2",
            "Ooofff.... that was quick",
            "Your performance was so bad, even the monsters felt sorry for you.",
            "Congratulations! You've just set a new record for disappointment.",
            "If incompetence was a superpower, you'd be unstoppable.",
            "Your strategy was bold: bore the monsters to death with your mediocrity.",
            "On the bright side, you've given the monsters indigestion.",
            "Your score is lower than your chances of survival in a real monster apocalypse.",
            "You died so fast, even the Grim Reaper is impressed.",
            "The good news: you've made history. The bad news: as the worst player ever.",
            "Your performance was so bad, it's technically classified as a war crime.",
            "Congratulations on single-handedly lowering the bar for human achievement."
        ];

        const successJokes = [
            "You're dead, but hey, at least your score lives on!",
            "Congratulations! You've won a lifetime supply of... nothing. You're dead.",
            "Your high score is impressive, but have you considered a career that doesn't involve constant near-death experiences?",
            "Great job! The monsters will tell stories about you... mostly about how tasty you were.",
            "You've set a new high score! Too bad you're not around to enjoy it.",
            "Your score is so high, it's practically immortal. Unlike you.",
            "Wow, look at that score! It's almost as if risking your life was worth it. Almost.",
            "Congratulations! Your legacy will live on... in a bunch of pixels on a screen.",
            "You've achieved greatness! And promptly died. Typical.",
            "Your heroic deeds will be remembered... or at least, your score will be.",
            "Amazing score! The afterlife's Hall of Fame awaits you.",
            "You've left quite the impression. Mostly on the ground, but also on the scoreboard.",
            "Your score is legendary! Your survival skills? Not so much.",
            "Incredible! You've peaked just in time for your untimely demise.",
            "A new high score! Don't let it go to your head... oh wait, you can't anymore.",
            "Congratulations on your high score! It's a shame you won't be able to brag about it.",
            "You've set a new record! The monsters are preparing a special plaque... for your gravestone.",
            "Your score is so high, it's outlived you. Talk about leaving a legacy!",
            "Fantastic job! The monsters are throwing a party to celebrate... your demise.",
            "You've reached new heights! Shame about that fatal fall at the end.",
            "Your score is impressive! It's almost like you knew it was your last game... ever.",
            "Congratulations! You've won the game... and a one-way ticket to the afterlife.",
            "Amazing performance! The monsters are considering making you their posthumous mascot.",
            "You've outdone yourself! And by 'yourself', I mean your life expectancy.",
            "Stellar score! The monsters are fighting over who gets to mount your head on their wall."
        ];
    
        const gameOverMessage = isHighScore
            ? `Congratulations on making it to the Hall of Heroes! <strong>${getRandomItem(successJokes)}</strong>`
            : `Unfortunately, you do not qualify for the Hall of Heroes. <strong>${getRandomItem(failureJokes)}</strong>`;
    
        showModal("Game Over!", gameOverMessage, [
            {
                text: "Play Again",
                onClick: () => {
                    location.reload();
                    startGame();
                }
            },
            {
                text: "No, I'm Done",
                onClick: () => {
                    location.reload();
                }
            }
        ]);
    }

    if (isHighScore) {
        showPrompt("You may submit your name to the Hall of Heroes", "Enter your name:", (playerName) => {
            if (playerName) {
                saveHighScore(playerName, gameState.score);
                showNotification(`High score saved! ${playerName}: ${gameState.score}`);
            }
            showGameOverModal();
        });
    } else {
        showGameOverModal();
    }
}

function restartGameListener(event) {
    if (['1', '2', '3', 'NumPad1', 'NumPad2', 'NumPad3'].includes(event.key)) {
        document.removeEventListener('keydown', restartGameListener);
        startGame();
    }
}

function restartGameListener(event) {
    if (['1', '2', '3', 'NumPad1', 'NumPad2', 'NumPad3'].includes(event.key)) {
        document.removeEventListener('keydown', restartGameListener);
        startGame();
    }
}

// Handle firing the standard gun
function handleShootKey() {
    if (!gameState.isRunning) startGame();
    else fireStandardGun();
}

// Handle firing the upgraded gun
function handleUpgradedGunKey() {
    if (!gameState.isRunning) startGame();
    else fireUpgradedGun();
}

function handleFiring() {
    if (!gameState.isRunning || gameState.grappleInUse || !canFireNormalGun) return;

    const currentTime = Date.now();
    const cooldown = 500; // Reduced cooldown to allow faster firing

    if (gameState.isMachineGun && gameState.machineGunAmmo > 0) {
        fireMachineGun();
        lastNormalGunFireTime = currentTime;
        canFireNormalGun = false;
        setTimeout(() => canFireNormalGun = true, cooldown);
    } else if (currentTime - lastNormalGunFireTime >= cooldown) {
        fireNormalGun();
        lastNormalGunFireTime = currentTime;
        canFireNormalGun = false;
        setTimeout(() => canFireNormalGun = true, cooldown);
    }
}

// Fire normal gun

let normalGunFireRate = 1000; // 1 shot per second

function fireNormalGun() {
    const currentTime = Date.now();
    if (currentTime - lastNormalGunFireTime >= normalGunFireRate) {
        const bullet = new Bullet(false);
        bullet.power = 1;
        gameState.bullets.push(bullet);

        audio.fx.gunFire.currentTime = 0;
        audio.fx.gunFire.play();
        updateTitle();
        animateFavicon();

        lastNormalGunFireTime = currentTime;
    }
}

function updateNormalGunFireRate() {
    const fireRateIncrease = Math.floor(gameState.monstersKilled / 10) * 0.1;
    normalGunFireRate = Math.max(100, 1000 / (1 + fireRateIncrease));
    updateFireRateDisplay();
}

function updateFireRateDisplay() {
    const fireRateElement = document.getElementById('fireRate');
    if (fireRateElement) {
        fireRateElement.textContent = `${(1000 / normalGunFireRate).toFixed(2)} shots/sec`;
    }
}

// Handle upgrading the gun
function handleBuyUpgrade() {
    if (gameState.machineGunAmmo >= 100) {
        gameState.normalGunUpgrade++;
        gameState.machineGunAmmo -= 100;
        gameState.hasPurchasedUpgrade = true;
        showNotification(`Upgraded gun purchased! You now shoot ${gameState.normalGunUpgrade + 1} bullets at once when using the upgraded gun.`);
        updateGameStats();
    } else {
        showNotification("Not enough ammo to buy an upgrade. You need 100 ammo.");
    }
}

// Handle person hit
function handlePersonHit(entityIndex) {
    const humanPosition = gameState.entities[entityIndex].position;
    gameState.score -= 10;  // Deduct 10 points for hitting a human
    gameState.humansKilledByPlayer += 1;  // Increment the count of humans killed by the player
    gameState.entities[entityIndex] = new Entity('ZOMBIE', 1, 0.8);  // Convert the human into a zombie
    gameState.entities[entityIndex].position = humanPosition;
    audio.fx.scream.play();

    console.log(`Human killed by player! Total: ${gameState.humansKilledByPlayer}`);
}

// Update the handleMonsterHit function
function handleMonsterHit(entityIndex, isMachineGun, bulletPower = 1) {
    const entity = gameState.entities[entityIndex];
    const damage = isMachineGun ? 2 * bulletPower : bulletPower;

    entity.health -= (entity.type === 'TANK') ? damage * 0.5 : damage;

    if (entity.health <= 0) {
        if (entity.type === 'BOSS') {
            gameState.score += 5;
            gameState.points += 5;
            gameState.bossesKilled += 1;
            audio.fx.bossDeath.play();
            stopAllMusic(); // Stop the boss music
            playGameMusic(); // Switch back to game music
            gameState.bossSpawned = false; // Reset boss spawn flag
            gameState.nextBoss = gameState.entitiesSpawned + 20; // Set next boss spawn
            
            // Increase bullet speed by 25% after killing a boss
            const oldSpeed = gameState.bulletSpeed;
            gameState.bulletSpeed *= 1.25;
            console.log(`Bullet speed increased from ${oldSpeed.toFixed(2)} to ${gameState.bulletSpeed.toFixed(2)} after killing a boss`);
            
            // Immediately fire a test bullet to verify speed
            const testBullet = new Bullet(false);
            console.log(`Test bullet initial position: ${testBullet.position}`);
            testBullet.move();
            console.log(`Test bullet position after move: ${testBullet.position}`);

            // Notify the player about the speed increase
            showNotification(`Boss defeated! Bullet speed increased to ${gameState.bulletSpeed.toFixed(2)}`);
        } else {
            gameState.score += 1;
            gameState.points += 1;
            gameState.monstersKilled = (gameState.monstersKilled || 0) + 1;
            checkMachineGunUnlock();
            audio.fx[Math.random() < 0.5 ? 'monsterReact1' : 'monsterReact2'].play();
        }
        gameState.entities.splice(entityIndex, 1);
    } else {
        audio.fx.hit.play();
    }
    
    updateGameStats(); // Update game stats after each hit
}

// Fire machine gun with strict 10 rounds per burst, available only after saving 10 people
function fireMachineGun() {
    if (gameState.peopleSaved >= CONFIG.PEOPLE_FOR_MACHINE_GUN) {
        if (gameState.machineGunAmmo >= CONFIG.MACHINE_GUN_ROUNDS) {
            let bulletsFired = 0;
            const burstInterval = setInterval(() => {
                if (bulletsFired < CONFIG.MACHINE_GUN_ROUNDS && gameState.machineGunAmmo > 0) {
                    fireMachineGunBullet();
                    bulletsFired++;
                    gameState.machineGunAmmo--;  // Decrement ammo here
                    updateTitle();
                    animateFavicon();
                } else {
                    clearInterval(burstInterval);
                }
            }, CONFIG.MACHINE_GUN_FIRE_RATE);
        } else {
            console.log("Not enough ammo for a full burst. You need at least 10 ammo.");
        }
    } else {
        console.log(`You need to save at least ${CONFIG.PEOPLE_FOR_MACHINE_GUN} people to use the machine gun.`);
    }
}

// Start machine gun
function startMachineGun() {
    if (machineGunInterval) return;
    machineGunInterval = setInterval(() => {
        if (gameState.isRunning && gameState.isMachineGun && gameState.machineGunAmmo > 0) {
            fireMachineGun();
        } else if (gameState.machineGunAmmo <= 0) {
            stopMachineGun();
        }
    }, 100);
}

// Stop machine gun
function stopMachineGun() {
    if (machineGunInterval) {
        clearInterval(machineGunInterval);
        machineGunInterval = null;
    }
}

// Animate favicon
function animateFavicon() {
    const favicon = document.getElementById('favicon');
    favicon.href = 'fire.png';
    setTimeout(() => {
        favicon.href = 'icon.png';
    }, 200);
}

// Handle firing the machine gun
function handleMachineGunKey() {
    if (!gameState.isMachineGun) {
        showNotification("You don't have the machine gun yet! Kill more monsters to unlock it.");
        return;
    }
    if (!gameState.isRunning) startGame();
    else toggleMachineGun();
}

function toggleMachineGun() {
    if (gameState.machineGunAmmo < CONFIG.MACHINE_GUN_ROUNDS) {
        showNotification("Not enough ammo for the machine gun!");
        return;
    }

    let bulletsFired = 0;
    const burstInterval = setInterval(() => {
        if (bulletsFired < CONFIG.MACHINE_GUN_ROUNDS && gameState.machineGunAmmo > 0) {
            fireMachineGunBullet();
            bulletsFired++;
            gameState.machineGunAmmo--;  // Decrement ammo here
        } else {
            clearInterval(burstInterval);
        }
    }, CONFIG.MACHINE_GUN_FIRE_RATE);
}

function fireMachineGunBullet() {
    const bullet = new Bullet(true);
    gameState.bullets.push(bullet);
    audio.fx.machineGun.currentTime = 0;
    audio.fx.machineGun.play();
    updateTitle();
    animateFavicon();
    
    // Decrement ammo every time a bullet is fired
    if (gameState.machineGunAmmo > 0) {
        gameState.machineGunAmmo--;
    }
}


// Grappling hook logic
const GRAPPLE_SPEED = 5;
const GRAPPLE_MAX_LENGTH = 200;
const GRAPPLE_MONSTER_COST = 10;

let grappleHook = null;

function shootGrappleHook() {
    if (!grappleHook) {
        const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
        grappleHook = {
            x: player.x,
            y: player.y,
            targetX: mouseX,
            targetY: mouseY,
            angle: angle,
            length: 0,
            maxLength: GRAPPLE_MAX_LENGTH,
            extending: true,
            attachedEntity: null
        };
        audio.fx.grapplingHook.play();
    }
}

function updateGrappleHook() {
    if (!grappleHook) return;

    if (grappleHook.extending) {
        extendGrappleHook();
    } else if (grappleHook.attachedEntity) {
        pullEntityTowardsPlayer();
    } else {
        grappleHook = null; // Retract grapple if not attached
    }
}

function extendGrappleHook() {
    grappleHook.length += GRAPPLE_SPEED;
    if (grappleHook.length >= grappleHook.maxLength) {
        grappleHook.extending = false;
    } else {
        checkEntityCollision();
    }
}

function checkCharacterCollision() {
    const characters = [...humans, ...monsters, ...zombies];
    for (let char of characters) {
        if (distanceBetween(grappleHook, char) < char.radius) {
            grappleHook.attachedCharacter = char;
            grappleHook.extending = false;
            break;
        }
    }
}

function pullCharacterTowardsPlayer() {
    const angle = Math.atan2(player.y - grappleHook.attachedCharacter.y, player.x - grappleHook.attachedCharacter.x);
    grappleHook.attachedCharacter.x += Math.cos(angle) * GRAPPLE_SPEED;
    grappleHook.attachedCharacter.y += Math.sin(angle) * GRAPPLE_SPEED;

    if (distanceBetween(player, grappleHook.attachedCharacter) < player.radius + grappleHook.attachedCharacter.radius) {
        grappleHook = null; // Release grapple
    }
}


function drawGrappleHook() {
    if (grappleHook) {
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        
        const endX = player.x + Math.cos(grappleHook.angle) * grappleHook.length;
        const endY = player.y + Math.sin(grappleHook.angle) * grappleHook.length;
        
        // Draw the rope
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw the hook
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'silver';
        ctx.fill();
    }
}

// Play game music
function playGameMusic() {
    stopAllMusic();
    audio.music.game.loop = true;
    audio.music.game.play();
    audio.currentMusic = audio.music.game;
}

// Play boss music
function playBossMusic() {
    stopAllMusic();
    const bossTrack = audio.music.boss[Math.floor(Math.random() * audio.music.boss.length)];
    bossTrack.loop = true;
    bossTrack.play();
    audio.currentMusic = bossTrack;
}

// Stop all music
function stopAllMusic() {
    if (audio.currentMusic) {
        audio.currentMusic.pause();
        audio.currentMusic.currentTime = 0;
    }
    audio.music.boss.forEach(track => {
        track.pause();
        track.currentTime = 0;
    });
    audio.music.game.pause();
    audio.music.game.currentTime = 0;
    if (currentPreviewTrack) {
        currentPreviewTrack.pause();
        currentPreviewTrack.currentTime = 0;
    }
}

function selectCustomTrack(trackNumber) {
    const trackName = `track${trackNumber}`;
    if (customTracks[trackName]) {
        stopAllMusic();
        customTracks[trackName].loop = true;
        customTracks[trackName].play();
        audio.currentMusic = customTracks[trackName];
    }
}

// Update the updateGameStats function
function updateGameStats() {
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;  // Use textContent instead of innerText
        } else {
            console.error(`Element with id '${id}' not found`);
        }
    };

    updateElement('score', gameState.score);
    updateElement('wave', gameState.wave);
    updateElement('humansSaved', gameState.peopleSaved);
    updateElement('humansKilledByPlayer', gameState.humansKilledByPlayer);
    updateElement('humansKilledByMonsters', gameState.humansKilledByMonsters);
    updateElement('monstersKilled', gameState.monstersKilled || 0);
    updateElement('bossesKilled', gameState.bossesKilled);
    updateElement('machineGunAmmo', gameState.machineGunAmmo);
    updateElement('gameTime', `${Math.floor((Date.now() - gameState.gameStartTime) / 1000)}s`);
    updateElement('normalGunLevel', gameState.normalGunUpgrade);
    updateElement('availablePoints', gameState.points);
    updateElement('bulletSpeed', gameState.bulletSpeed.toFixed(2));
    const monstersHooked = Number(gameState.monstersHooked) || 0;
    updateElement('monstersHooked', `${monstersHooked}/50`);

    // Additional updates if necessary
    updateMachineGun();
    updateGrappleHook();
    updateHighScores();
}

function checkMonstersHookedElement() {
    const element = document.getElementById('monstersHooked');
    if (element) {
        console.log('monstersHooked element found in DOM');
        element.textContent = '0/50';  // Initialize the display
    } else {
        console.error('monstersHooked element not found in DOM');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    initTabs();
    loadKeyMapping();
});

function drawGame() {

    drawGrappleHook();
}
// Update high scores
function updateHighScores() {
    const highScoresElement = document.getElementById('highScores');
    const highScores = getHighScores();
    highScoresElement.innerHTML = highScores.map(score => `<li>${score.name}: ${score.score}</li>`).join('');
}

// Update options
function updateOptions() {
    document.getElementById('normalGunLevel').innerText = gameState.normalGunUpgrade;
    document.getElementById('availablePoints').innerText = gameState.points;
}

// Initialize game
function initGame() {
    document.title = "Press 1, 2, or 3 to Start!";

    // Preload sounds
    Object.values(audio.fx).forEach(sound => sound.load());
    Object.values(audio.music).flat().forEach(music => {
        music.load();
        music.loop = true;
    });
    Object.values(gameTracks).forEach(track => {
        track.load();
        track.loop = true;
    });

    // Set up event listeners
    setupEventListeners();
}

// Global variables for tracking shots and reloading
let normalGunShotsFired = 0;
let upgradedGunShotsFired = 0;
let isNormalGunReloading = false;
let isUpgradedGunReloading = false;

// Fire the standard gun (single bullet)
function fireStandardGun() {
    if (isNormalGunReloading) {
        console.log("Normal gun is reloading...");
        return;
    }

    normalGunShotsFired++;
    const bullet = new Bullet(false);
    bullet.power = 1; // Standard bullet power
    gameState.bullets.push(bullet);

    audio.fx.gunFire.currentTime = 0;
    audio.fx.gunFire.play();
    updateTitle();
    animateFavicon();

    if (normalGunShotsFired >= 6) {
        reloadNormalGun();
    }
}

function reloadNormalGun() {
    isNormalGunReloading = true;
    normalGunShotsFired = 0;
    audio.fx.reload.play();

    setTimeout(() => {
        isNormalGunReloading = false;
        console.log("Normal gun reloaded.");
    }, 2000); // 2 second reload time
}


// Fire the upgraded gun (multiple bullets)
function fireUpgradedGun() {
    if (isUpgradedGunReloading) {
        showNotification("Upgraded gun is reloading...");
        return;
    }

    if (!gameState.hasPurchasedUpgrade) {
        showNotification("You need to purchase the upgraded gun first! It will cost 100 ammo.");
        return;
    }

    upgradedGunShotsFired++;
    const totalBullets = 1 + gameState.normalGunUpgrade;
    const bulletPowerMultiplier = 1 + (gameState.normalGunUpgrade * 0.1);

    for (let i = 0; i < totalBullets; i++) {
        const bullet = new Bullet(false);
        bullet.power = bulletPowerMultiplier;
        gameState.bullets.push(bullet);
    }

    audio.fx.gunFire.currentTime = 0;
    audio.fx.gunFire.play();
    updateTitle();
    animateFavicon();

    if (upgradedGunShotsFired >= 6) {
        reloadUpgradedGun();
    }
}

function reloadUpgradedGun() {
    isUpgradedGunReloading = true;
    upgradedGunShotsFired = 0;
    audio.fx.reload.play();

    setTimeout(() => {
        isUpgradedGunReloading = false;
        console.log("Upgraded gun reloaded.");
    }, 1000); // 1 second reload time
}

// Set up event listeners
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyPress);
    document.getElementById('saveKeyMapping').addEventListener('click', saveKeyMapping);
    
    // Add event listeners for play buttons
    document.querySelectorAll('.play-button').forEach(button => {
        button.addEventListener('click', (e) => previewTrack(e.target.dataset.track));
    });

    // Add event listeners for select buttons
    document.querySelectorAll('.select-button').forEach(button => {
        button.addEventListener('click', (e) => selectTrack(e.target.dataset.track));
    });
}

// Handle key press
function handleKeyPress(event) {
    const keyMappings = getKeyMappings();
    const key = event.key;

    switch (key) {
        case keyMappings.shoot:
        case 'NumPad1':
            handleShootKey();
            break;
        case keyMappings.machineGun:
        case 'NumPad2':
            handleMachineGunKey();
            break;
        case keyMappings.grapple:
        case 'NumPad3':
            handleGrappleKey();
            break;
        case keyMappings.upgrade:
        case 'NumPad4':
            handleUpgradedGunKey();
            break;
        case keyMappings.store:  // Add this case for the store key
        case 'NumPad5':
            handleBuyUpgrade();  // Ensure this function is called for the store key
            break;
    }
}


function handleGrappleKey() {
    if (!gameState.isRunning) startGame();
    else handleGrapplingHook();
}

function handleMusicKey(key) {
    let trackNumber;

    if (key === '6' || key === 'NumPad6') {
        trackNumber = 1;
    } else if (key === '7' || key === 'NumPad7') {
        trackNumber = 2;
    } else {
        trackNumber = 3;
    }

    selectCustomTrack(trackNumber);
}


const gameTracks = {
    'Digital Dreams': new Audio('sound/music/Digital Dreams.mp3'),
    'Digital Heartbeat': new Audio('sound/music/Digital Heartbeat.mp3'),
    'Eternal Onslaught': new Audio('sound/music/Eternal Onslaught.mp3'),
    'Ethereal Descent': new Audio('sound/music/Ethereal Descent.mp3'),
    'Ethereal Quest': new Audio('sound/music/Ethereal Quest.mp3'),
    'Pixelated Serenity': new Audio('sound/music/Pixelated Serenity.mp3'),
    'Pixelated Survival': new Audio('sound/music/Pixelated Survival.mp3'),
};

let currentPreviewTrack = null;

// Get key mappings
function getKeyMappings() {
    return {
        shoot: document.getElementById('shootKey').value,
        machineGun: document.getElementById('machineGunKey').value,
        grapple: document.getElementById('grappleKey').value,
        upgrade: document.getElementById('upgradeKey').value,
        store: document.getElementById('storeKey').value,  // Add this line
    };
}

function saveHighScore(name, score) {
    const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
    highScores.push({ name, score });
    highScores.sort((a, b) => b.score - a.score);
    const topScores = highScores.slice(0, 5);
    localStorage.setItem('highScores', JSON.stringify(topScores));

    // Immediately update the high scores display
    updateHighScoresDisplay(topScores);
}

function updateHighScoresDisplay(highScores) {
    const highScoresElement = document.getElementById('highScores');
    highScoresElement.innerHTML = highScores.map(score => {
        let tooltipText;

        if (score.score < 0) {
            tooltipText = getRandomItem(negativeInsults);
        } else if (score.score < 10) {
            tooltipText = getRandomItem(lowPositiveJokes); // This line is causing the error
        } else {
            tooltipText = getRandomItem(heroicCompliments);
        }

        return `<li class="hero ${score.score < 0 ? 'negative-score' : ''}" data-tooltip="${tooltipText}">${score.name}: ${score.score} points</li>`;
    }).join('');
}


function previewTrack(trackName) {
    if (currentPreviewTrack) {
        currentPreviewTrack.pause();
        currentPreviewTrack.currentTime = 0;
    }

    if (trackName === 'boss' || trackName === 'boss1') {
        currentPreviewTrack = audio.music[trackName];
    } else {
        currentPreviewTrack = gameTracks[trackName];
    }

    currentPreviewTrack.play();
}

function selectTrack(trackName) {
    if (trackName === 'boss' || trackName === 'boss1') {
        audio.music.boss = [audio.music[trackName]];
    } else {
        audio.music.game = gameTracks[trackName];
    }

    showNotification(`Selected "${trackName}" as the new game music!`);
    
    if (currentPreviewTrack) {
        currentPreviewTrack.pause();
        currentPreviewTrack.currentTime = 0;
    }

    if (gameState.isRunning) {
        playGameMusic();
    }
}

// Save key mapping
function saveKeyMapping() {
    const keyMappings = getKeyMappings();
    localStorage.setItem('keyMappings', JSON.stringify(keyMappings));
    showNotification('Key mappings saved!');
}

// Load key mapping
function loadKeyMapping() {
    const savedMappings = JSON.parse(localStorage.getItem('keyMappings'));
    if (savedMappings) {
        document.getElementById('shootKey').value = savedMappings.shoot;
        document.getElementById('machineGunKey').value = savedMappings.machineGun;
        document.getElementById('grappleKey').value = savedMappings.grapple;
        document.getElementById('upgradeKey').value = savedMappings.upgrade;
    }
}

// Initialize tabs
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// Call initGame and initTabs when the page loads
window.onload = () => {
    initGame();
    initTabs();
    loadKeyMapping();
};