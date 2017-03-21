(function (React,ReactDOM) {
'use strict';

const WIDTH = 48;
const HEIGHT = 31;
const dir1 = 1 - WIDTH;
const dir3 = 1;
const dir5 = WIDTH;
const dir7 = -1 + WIDTH;
const dir9 = -1;
const dir11 = -WIDTH;

/** @file helper functions for working with positions */
const directions = [dir1, dir3, dir5, dir7, dir9, dir11];
/** convert the coordinate pair [x], [y] into an integer position */
function xy2pos(x, y) {
    return x + y * WIDTH;
}
/** convert an integer [pos] into the coordinate pair x, y */
function pos2xy(pos) {
    return {
        x: pos % WIDTH,
        y: Math.floor(pos / WIDTH),
    };
}
/** return the number of contiguous groups of tiles around a [pos] that satisfy [ingroup] */
function countGroups(pos, ingroup) {
    // use var instead of let because
    // chrome can't optimize compound let assignment
    var groupcount = 0;
    for (let i = 0; i < 6; i++) {
        const curr = directions[i];
        const next = directions[(i + 1) % 6];
        if (!ingroup(pos + curr) && ingroup(pos + next)) {
            groupcount += 1;
        }
    }
    if (groupcount) {
        return groupcount;
    }
    else {
        return Number(ingroup(pos + dir1));
    }
}
/**
 * [flood] from [pos] as long as neighbors are [floodable]
 * it is up to [flood] to make sure that [floodable] returns false for visited positions
 */
function floodfill(pos, floodable, flood) {
    if (floodable(pos)) {
        flood(pos);
        for (let i = 0; i < 6; i++) {
            floodfill(pos + directions[i], floodable, flood);
        }
    }
}
/**
 * flood from [pos] as long as neighbors are [passable]
 * [visited] keeps track of what positions have already been flooded, and is normally set to empty
 */
function floodfillSet(pos, passable, visited) {
    if (passable(pos) && !visited.has(pos)) {
        visited.add(pos);
        forEachNeighbor(pos, neighbor => {
            floodfillSet(neighbor, passable, visited);
        });
    }
}
/** whether [istype] is true for all positions surrounding [pos] */
function surrounded(pos, istype) {
    for (let i = 0; i < 6; i++) {
        if (!istype(pos + directions[i])) {
            return false;
        }
    }
    return true;
}
/** calls [callback] for each position neighboring [pos] */
function forEachNeighbor(pos, callback) {
    for (let i = 0; i < 6; i++) {
        callback(pos + directions[i]);
    }
}

/** @file helper functions for working with randomness */
/** return a random integer in the range [min, max] inclusive */
function randint(min, max, random) {
    return min + Math.floor((max - min + 1) * random());
}
/** randomly shuffle an array in place */
function shuffle(array, random) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = randint(0, i, random);
        const tempi = array[i];
        array[i] = array[j];
        array[j] = tempi;
    }
    return array;
}

// Port of alea.js to typescript
// From http://baagoe.com/en/RandomMusings/javascript/
// Johannes Baagøe <baagoe@baagoe.com>, 2010
// version 0.9
// Port of alea.js to typescript
function Alea(...args) {
    const mash = Mash();
    let s0 = mash(' ');
    let s1 = mash(' ');
    let s2 = mash(' ');
    let c = 1;
    if (args.length === 0) {
        args = [Date.now()];
    }
    for (let i = 0; i < args.length; i++) {
        s0 -= mash(args[i]);
        if (s0 < 0) {
            s0 += 1;
        }
        s1 -= mash(args[i]);
        if (s1 < 0) {
            s1 += 1;
        }
        s2 -= mash(args[i]);
        if (s2 < 0) {
            s2 += 1;
        }
    }
    return function random() {
        let t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
        s0 = s1;
        s1 = s2;
        return s2 = t - (c = t | 0);
    };
}
function Mash() {
    let n = 0xefc8249d;
    return function mash(data) {
        data = data.toString();
        for (let i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            let h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 0x100000000; // 2^32
        }
        return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };
}

/** create a new level */
function create$1(seed, player) {
    const random = Alea(seed);
    const types = createTypes();
    // const weights = createRandomWeights() // for lakes
    //makeLakes()
    carveCaves();
    removeSmallWalls();
    const size = removeOtherCaves();
    if (size < WIDTH * HEIGHT / 4) {
        return create$1(random(), player);
    }
    fillSmallCaves();
    const actors = createActors();
    /** return a dict of positions to a random number */
    // function createRandomWeights() {
    //     const weights = {}
    //     forEachInnerPos(pos => {
    //         weights[pos] = random()
    //     })
    //     return weights
    // }
    /**
     * return a dict of positions to tile types
     * all tiles are initially walls except for the player's position, which is a floor
     */
    function createTypes() {
        const types = {};
        forEachPos(pos => {
            types[pos] = 'wall';
        });
        types[player.pos] = 'floor';
        return types;
    }
    /** return a dict of positions to actor ids */
    function createActors() {
        const actors = {};
        actors[player.pos] = player.id;
        return actors;
    }
    /** whether the tile at [pos] is a floor tile */
    function isFloor(pos) {
        return types[pos] === 'floor';
    }
    /** whether the tile at [pos] is passable */
    function passable(pos) {
        return types[pos] === 'floor'; // || types[pos] === '.'SHALLOW_WATER
    }
    /** whether the tile at [pos] is a wall tile */
    function isWall(pos) {
        return inBounds(pos) && types[pos] === 'wall';
    }
    // function makeLake() {
    //     const center = shuffle(Array.from(innerPositions), random)[0]
    //     const neighbors = (pos, callback) => {
    //         forEachNeighbor(pos, neighbor => {
    //             if (innerPositions.has(neighbor)) {
    //                 callback(neighbor)
    //             }
    //         })
    //     }
    //     const cost = pos => 0.1 + 0.3 * weights.get(pos)
    //     const lake = flowmap(center, 1, neighbors, cost)
    //     for ([pos, val] of lake) {
    //         const type = val < 0.6 ? '.'DEEP_WATER : '.'SHALLOW_WATER
    //         types.set(pos, type)
    //     }
    //     return lake
    // }
    // function makeLakes() {
    //     makeLake()
    // }
    /** use an (almost) cellular automaton to generate caves */
    function carveCaves() {
        const innerPositions = [];
        forEachInnerPos(pos => innerPositions.push(pos));
        shuffle(Array.from(innerPositions), random).forEach(pos => {
            if (isWall(pos) && countGroups(pos, passable) !== 1) {
                types[pos] = 'floor';
            }
        });
    }
    /** remove groups of 5 or fewer walls */
    function removeSmallWalls() {
        const visited = new Set();
        forEachInnerPos(pos => {
            const wallGroup = new Set();
            const floodable = (pos) => isWall(pos) && !wallGroup.has(pos) && !visited.has(pos);
            const flood = (pos) => {
                visited.add(pos);
                wallGroup.add(pos);
            };
            floodfill(pos, floodable, flood);
            if (wallGroup.size < 6) {
                for (const pos of wallGroup) {
                    types[pos] = 'floor';
                }
            }
        });
    }
    /** remove disconnected caves */
    function removeOtherCaves() {
        const mainCave = new Set();
        floodfillSet(player.pos, passable, mainCave);
        forEachInnerPos(pos => {
            if (types[pos] === 'floor' && !mainCave.has(pos)) {
                types[pos] = 'wall';
            }
        });
        return mainCave.size;
    }
    /** whether the tile at [pos] is part of a cave */
    function isCave(pos) {
        return isFloor(pos) && countGroups(pos, passable) === 1;
    }
    /** whether the tile at [pos] is not part of a cave */
    function isNotCave(pos) {
        return isWall(pos) || countGroups(pos, passable) !== 1;
    }
    /** whether the tile at [pos] is a dead end */
    function isDeadEnd(pos) {
        return isFloor(pos)
            && countGroups(pos, passable) === 1
            && surrounded(pos, isNotCave);
    }
    /** recursively fill a dead end */
    function fillDeadEnd(pos) {
        if (isDeadEnd(pos)) {
            types[pos] = 'wall';
            forEachNeighbor(pos, neighbor => {
                if (pos === player.pos && passable(neighbor)) {
                    player.pos = neighbor;
                }
                fillDeadEnd(neighbor);
            });
        }
    }
    /** remove 2-3 tile caves that are connected to the main cave */
    function fillSmallCaves() {
        // can't skip visited tiles here because previous caves can be affected
        // by the removal of later ones
        forEachInnerPos(pos => {
            fillDeadEnd(pos);
            const cave = new Set();
            floodfillSet(pos, isCave, cave);
            if (cave.size === 2 || cave.size === 3) {
                types[pos] = 'wall';
                for (const pos of cave) {
                    fillDeadEnd(pos);
                }
            }
        });
    }
    return {
        types,
        actors,
    };
}
/** return the minimum x coordinate for a given [y], inclusive */
function xmin(y) {
    return Math.floor((HEIGHT - y) / 2);
}
/** return the maximum x coordinate for a given [y], exclusive */
function xmax(y) {
    return WIDTH - Math.floor(y / 2);
}
/** whether [pos] is inside the level */
function inBounds(pos) {
    const { x, y } = pos2xy(pos);
    return y >= 0 && y < HEIGHT && x >= xmin(y) && x < xmax(y);
}
/** call [fun] for each position in the level */
function forEachPos(fun) {
    for (let y = 0; y < HEIGHT; y++) {
        const min = xmin(y);
        const max = xmax(y);
        for (let x = min; x < max; x++) {
            fun(xy2pos(x, y), x, y);
        }
    }
}
/** call [fun] for each position in the level except the outer edge */
function forEachInnerPos(fun) {
    for (let y = 1; y < HEIGHT - 1; y++) {
        const min = xmin(y) + 1;
        const max = xmax(y) - 1;
        for (let x = min; x < max; x++) {
            fun(xy2pos(x, y), x, y);
        }
    }
}

/** create an entity */
function create$3(entities) {
    const entity = { id: entities.nextId };
    entities[entity.id] = entity;
    entities.nextId++;
    return entity;
}

/** @file handles actor behavior and scheduling (turn order) */
/** dict of actor behaviors */
const Behavior = {};
// function create(game, behavior) {
//     const actor = Entity.create(game)
//     actor.behavior = behavior
//     return actor
// }
/** advance gamestate by an atomic step */
function step(game) {
    const id = game.schedule[0];
    const entity = game.entities[id];
    return Behavior[entity.type](entity, game);
}

/** @file calculates fov */
const normals = [dir1, dir3, dir5, dir7, dir9, dir11];
const tangents = [dir5, dir7, dir9, dir11, dir1, dir3];
function fov(center, transparent, reveal) {
    reveal(center);
    for (let i = 0; i < 6; i++) {
        const transform = (x, y) => center + x * normals[i] + y * tangents[i];
        const transformedTransparent = (x, y) => transparent(transform(x, y));
        const transformedReveal = (x, y) => reveal(transform(x, y));
        scan(1, 0, 1, transformedTransparent, transformedReveal);
    }
}
/** round a number, rounding up if it ends in .5 */
function roundHigh(n) {
    return Math.round(n);
}
/** round a number, rounding down if it ends in .5 */
function roundLow(n) {
    return Math.ceil(n - 0.5);
}
/** Recursively scan one row spanning 60 degrees of fov */
function scan(y, start, end, transparent, reveal) {
    if (start >= end)
        return;
    const xmin = roundHigh(y * start);
    const xmax = roundLow(y * end);
    let fovExists = false;
    for (let x = xmin; x <= xmax; x++) {
        if (transparent(x, y)) {
            if (x >= y * start && x <= y * end) {
                reveal(x, y);
                fovExists = true;
            }
        }
        else {
            if (fovExists) {
                scan(y + 1, start, (x - 0.5) / y, transparent, reveal);
            }
            reveal(x, y);
            fovExists = false;
            start = (x + 0.5) / y;
            if (start >= end)
                return;
        }
    }
    if (fovExists) {
        scan(y + 1, start, end, transparent, reveal);
    }
}

/** create a new player */
function create$2(entities) {
    return Object.assign(create$3(entities), {
        type: 'player',
        pos: xy2pos(intHalf(WIDTH), intHalf(HEIGHT)),
        fov: {}
    });
}
Behavior.player = function (self, game) {
    function transparent(pos) {
        return game.level.types[pos] === 'floor';
    }
    function reveal(pos) {
        self.fov[pos] = true;
    }
    fov(self.pos, transparent, reveal);
    return Infinity;
};
/** return half of n rounded to an int */
function intHalf(n) {
    return Math.round(n / 2);
}

const VERSION = '0.1.0';
const SAVE_NAME = 'hex adventure';
/** load save game if it exists, otherwise create a new game */
function getGame() {
    let game = load() || create$$1(Date.now());
    if (game.version !== VERSION) {
        console.warn('Save game is out of date');
    }
    console.log('Seed:', game.seed);
    return game;
}
/** create a new game */
function create$$1(seed) {
    const version = VERSION;
    const schedule = [];
    const entities = { nextId: 1 };
    const player = create$2(entities);
    // createEntity(entities)
    // player.fov = {}
    // player.pos = xy2pos(Math.floor(WIDTH / 2), Math.floor(HEIGHT / 2))
    // player.type = 'player'
    schedule.unshift(player.id);
    const level = create$1(seed, player);
    return { version, seed, schedule, entities, player, level };
}
/** save a game */
function save(game) {
    localStorage[SAVE_NAME] = JSON.stringify(game);
}
/** load the saved game if it exists */
function load() {
    const saveFile = localStorage[SAVE_NAME];
    return saveFile && JSON.parse(saveFile);
}
/** delete the current savefile */
// function deleteSave() {
//     localStorage.removeItem(SAVE_NAME)
// }

/** @file constants related to visual style */
/** @file constants related to visual style */ const xu = 18;
const smallyu = 16;

function Tile({ type, color, x, y, opacity }) {
    const left = (x - (HEIGHT - y - 1) / 2) * xu;
    const top = y * smallyu;
    const style = { left, top, opacity };
    if (color) {
        style.background = color;
    }
    return React.createElement("div", { className: `tile ${type}`, style: style });
}

/** array of {pos, x, y} */
const positions = createPositions();
function Grid({ game }) {
    const { types, actors } = game.level;
    const fov = game.player.fov;
    return React.createElement("div", null, positions.map(({ pos, x, y }) => React.createElement(Tile, { key: pos, type: actors[pos] && fov[pos] && game.entities[actors[pos]].type || types[pos], opacity: fov[pos] ? 1.0 : 0.5, x: x, y: y })));
}
function createPositions() {
    const positions = [];
    forEachPos((pos, x, y) => {
        positions.push({ pos, x, y });
    });
    return positions;
}

/** @file handles displaying the game and the game loop */
const root = document.getElementById('game');
const game = getGame();
/** advance the gamestate until player input is needed */
function loop() {
    let delay = 0;
    while (!delay) {
        delay = step(game);
    }
    ReactDOM.render(React.createElement(Grid, { game: game }), root);
    if (delay === Infinity) {
        save(game);
    }
    else {
        defer(loop, delay);
    }
}
/** call [fun] after waiting for [frames] */
function defer(fun, frames) {
    if (frames) {
        requestAnimationFrame(() => defer(fun, frames - 1));
    }
    fun();
}

/** @file entry point */
loop();

}(React,ReactDOM));
