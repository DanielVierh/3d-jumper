import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b4ff);
scene.fog = new THREE.Fog(0x87b4ff, 35, 170);

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.1,
  260,
);
camera.position.set(0, 4.8, -10.5);
camera.lookAt(0, 2, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xdde8ff, 0x19203a, 1);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(8, 17, -8);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
sun.shadow.bias = -0.00015;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x264878 });
const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff5f5f });
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x34e38d });

const player = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 1), playerMaterial);
player.castShadow = true;
player.position.set(0, 1.1, 0);
scene.add(player);

const playerBox = new THREE.Box3();
const enemyBox = new THREE.Box3();

const segments = [];
const enemies = [];

const SEGMENT_LENGTH = 8;
const TRACK_WIDTH = 7;
const BASE_SPEED = 10;
const GRAVITY = -30;
const JUMP_VELOCITY = 12;
const MAX_JUMPS = 2;
const STOMP_BOUNCE_FACTOR = 0.85;
const ENEMY_STOMP_POINTS = 100;

let velocityY = 0;
let jumpsUsed = 0;
let distance = 0;
let score = 0;
let speed = BASE_SPEED;
let gameOver = false;
let segmentCursor = -24;
const generatedUntil = { z: 115 };

const distanceEl = document.getElementById("distance");
const stateEl = document.getElementById("state");
const jumpButton = document.getElementById("jumpButton");

function createSegment(startZ, hasGap) {
  if (hasGap) {
    segments.push({ start: startZ, end: startZ + SEGMENT_LENGTH, mesh: null });
    return;
  }

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_WIDTH, 1, SEGMENT_LENGTH),
    groundMaterial,
  );
  mesh.receiveShadow = true;
  mesh.position.set(0, 0, startZ + SEGMENT_LENGTH / 2);
  world.add(mesh);
  segments.push({ start: startZ, end: startZ + SEGMENT_LENGTH, mesh });

  if (Math.random() < 0.38) {
    const enemy = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.4, 1.2),
      enemyMaterial,
    );
    enemy.castShadow = true;
    enemy.position.set(0, 1.2, startZ + SEGMENT_LENGTH * 0.55);
    world.add(enemy);
    enemies.push(enemy);
  }
}

function generateTrack() {
  while (generatedUntil.z < segmentCursor + 125) {
    const hasGap = Math.random() < 0.24;
    createSegment(generatedUntil.z, hasGap);
    generatedUntil.z += SEGMENT_LENGTH;
  }
}

for (let z = -24; z < generatedUntil.z; z += SEGMENT_LENGTH) {
  createSegment(z, false);
}

function isSupportedAt(zPos) {
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!segment.mesh) {
      continue;
    }
    if (zPos >= segment.start && zPos <= segment.end) {
      return true;
    }
  }
  return false;
}

function jump() {
  if (gameOver) {
    restart();
    return;
  }

  const onGround = Math.abs(player.position.y - 1.1) < 0.03;
  if (onGround) {
    jumpsUsed = 0;
  }

  if (jumpsUsed < MAX_JUMPS) {
    velocityY = JUMP_VELOCITY;
    jumpsUsed += 1;
  }
}

function restart() {
  gameOver = false;
  speed = BASE_SPEED;
  distance = 0;
  score = 0;
  velocityY = 0;
  jumpsUsed = 0;
  player.position.set(0, 1.1, 0);
  segmentCursor = -24;
  generatedUntil.z = 115;

  for (const segment of segments) {
    if (segment.mesh) {
      world.remove(segment.mesh);
      segment.mesh.geometry.dispose();
    }
  }
  for (const enemy of enemies) {
    world.remove(enemy);
    enemy.geometry.dispose();
  }

  segments.length = 0;
  enemies.length = 0;

  for (let z = -24; z < generatedUntil.z; z += SEGMENT_LENGTH) {
    createSegment(z, false);
  }

  stateEl.textContent = "Leertaste oder Touch zum Springen";
}

function onPressInput() {
  jump();
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    onPressInput();
  }
});

jumpButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  onPressInput();
});

window.addEventListener(
  "pointerdown",
  (event) => {
    if (event.target === jumpButton) {
      return;
    }
    onPressInput();
  },
  { passive: false },
);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function update(delta) {
  if (gameOver) {
    return;
  }

  segmentCursor += speed * delta;
  distance += speed * delta;
  speed = Math.min(speed + 0.03 * delta, 14.5);

  for (const segment of segments) {
    if (segment.mesh) {
      segment.mesh.position.z -= speed * delta;
      segment.start -= speed * delta;
      segment.end -= speed * delta;
    } else {
      segment.start -= speed * delta;
      segment.end -= speed * delta;
    }
  }

  for (const enemy of enemies) {
    enemy.position.z -= speed * delta;
  }

  while (segments.length > 0 && segments[0].end < -24) {
    const old = segments.shift();
    if (old.mesh) {
      world.remove(old.mesh);
      old.mesh.geometry.dispose();
    }
  }

  while (enemies.length > 0 && enemies[0].position.z < -24) {
    const oldEnemy = enemies.shift();
    world.remove(oldEnemy);
    oldEnemy.geometry.dispose();
  }

  generateTrack();

  velocityY += GRAVITY * delta;
  player.position.y += velocityY * delta;

  const supported = isSupportedAt(player.position.z + 1.4);
  if (supported && player.position.y <= 1.1) {
    player.position.y = 1.1;
    velocityY = 0;
    jumpsUsed = 0;
  }

  if (!supported && player.position.y <= -3.2) {
    gameOver = true;
    stateEl.textContent = "In die Klippe gefallen! Tippen/Leertaste = Neustart";
  }

  playerBox.setFromObject(player);
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemyBox.setFromObject(enemy);
    const overlaps = playerBox.intersectsBox(enemyBox);
    if (!overlaps) {
      continue;
    }

    const stompedEnemy =
      velocityY < 0 && playerBox.min.y >= enemyBox.max.y - 0.25;

    if (stompedEnemy) {
      score += ENEMY_STOMP_POINTS;
      velocityY = JUMP_VELOCITY * STOMP_BOUNCE_FACTOR;
      jumpsUsed = 1;
      world.remove(enemy);
      enemy.geometry.dispose();
      enemies.splice(i, 1);
      continue;
    }

    const isLow = player.position.y < 2.35;
    if (isLow) {
      gameOver = true;
      stateEl.textContent = "Von Gegner getroffen! Tippen/Leertaste = Neustart";
      break;
    }
  }

  distanceEl.textContent = `Distanz: ${Math.floor(distance)} m | Punkte: ${score}`;

  camera.position.z = -10.5;
  camera.position.y = THREE.MathUtils.lerp(
    camera.position.y,
    4.8 + player.position.y * 0.1,
    0.08,
  );
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
