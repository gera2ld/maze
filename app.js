import * as THREE from "https://cdn.jsdelivr.net/npm/three/+esm";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three/examples/jsm/controls/OrbitControls.js/+esm";
import { KeyboardService } from "https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut/+esm";
import { getOutlinePoints } from "./corner.js";
import { Directions, generateMaze, getLines, isConnected } from "./maze.js";
import { wall as wallUrl } from "./resource.js";

const keyboard = new KeyboardService();
keyboard.enable();

const renderer = new THREE.WebGLRenderer();
document.body.append(renderer.domElement);

const scene = new THREE.Scene();

{
  const light = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(light);
}

{
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 8, 2);
  scene.add(light);
}

const width = 10;
const height = 10;
const scale = 1;
const thickness = 0.2;

const planeGeometry = new THREE.PlaneGeometry(width * scale, height * scale);
const planeMaterial = new THREE.MeshBasicMaterial({
  color: "hsl(240,20%,30%)"
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

const connections = generateMaze(width, height);
const lines = getLines(connections);
lines.push([
  [width, 0],
  [0, 0],
  [0, height]
]);
const walls = new THREE.Object3D();
const loader = new THREE.TextureLoader();
const texture = loader.load(wallUrl);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
const materialWall = new THREE.MeshPhongMaterial({ map: texture });
const materialPure = new THREE.MeshPhongMaterial({ color: "hsl(20,60%,50%)" });
const materials = [materialPure, materialWall];
lines.forEach((line) => {
  line = line.map((p) => p.map((i) => i * scale));
  // console.log(line);
  const points = getOutlinePoints(line, thickness / 2);
  // console.log(points);
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(...p)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 2,
    bevelEnabled: false
  });
  const wall = new THREE.Mesh(geometry, materials);
  walls.add(wall);
});
walls.position.set((-width * scale) / 2, 0, (height * scale) / 2);
walls.rotation.x = -Math.PI / 2;
scene.add(walls);

const playerGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const playerMaterial = new THREE.MeshPhongMaterial({
  color: "hsl(290,50%,50%)"
});
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1.5;
player.rotation.set(Math.PI / 4, 0, Math.PI / 4);
scene.add(player);

const playerCamera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
playerCamera.position.set(-4.5, 1, 5);
playerCamera.lookAt(-4.5, 1, 2);

const externalCamera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
externalCamera.position.set(-6, 8, 6);
const controls = new OrbitControls(externalCamera, renderer.domElement);
controls.enabled = false;

const cameras = [playerCamera, externalCamera];
let activeCamera = 0;
updateSize();
updatePlayer();

const cameraInfo = {
  direction: 0,
  forward: true,
  paused: false,
  rotating: false,
  moving: false,
  rotation: {
    value: 0,
    to: 0,
    delta: 0
  },
  vMove: 0.01,
  vRotate: 0.01,
  pos: [0, 0],
  target: undefined
};
updateTarget();

keyboard.register("up", () => {
  cameraInfo.forward = true;
  cameraInfo.paused = false;
});
keyboard.register("down", () => {
  cameraInfo.forward = false;
  cameraInfo.paused = false;
});
keyboard.register("left", () => {
  rotate(false);
});
keyboard.register("right", () => {
  rotate(true);
});
keyboard.register("space", () => {
  cameraInfo.paused = !cameraInfo.paused;
});
keyboard.register("enter", () => {
  activeCamera = (activeCamera + 1) % cameras.length;
  controls.enabled = cameras[activeCamera] === externalCamera;
});

requestAnimationFrame(render);

function updatePlayer() {
  player.position.x = playerCamera.position.x;
  player.position.z = playerCamera.position.z;
}

function rotate(right) {
  const { rotation } = cameraInfo;
  if (right) {
    rotation.to = (rotation.value + 3) % 4;
    if (rotation.value < rotation.to) rotation.value += 4;
    rotation.delta = -1;
  } else {
    rotation.to = (rotation.value + 1) % 4;
    if (rotation.value > rotation.to) rotation.value -= 4;
    rotation.delta = 1;
  }
}

function updateTarget() {
  const [x, y] = cameraInfo.pos;
  if (isConnected(connections, x, y, cameraInfo.direction)) {
    const [dx, dy] = Directions[cameraInfo.direction];
    cameraInfo.target = [x + dx, y + dy];
  } else {
    cameraInfo.target = undefined;
  }
}

function getPosition(x, y) {
  return [x - width / 2 + 0.5, height / 2 - y - 0.5];
}

function isDirection(x1, y1, x2, y2, dx, dy) {
  return dx
    ? Math.sign(x2 - x1) === Math.sign(dx)
    : Math.sign(y2 - y1) === Math.sign(dy);
}

function updateCamera() {
  if (cameraInfo.paused) return;
  if (cameraInfo.rotating) {
    // rotating
    const { rotation } = cameraInfo;
    let value = rotation.value + rotation.delta * cameraInfo.vRotate;
    if (
      !rotation.delta ||
      Math.sign(rotation.to - value) !== Math.sign(rotation.delta)
    ) {
      value = rotation.to;
      rotation.delta = 0;
      cameraInfo.rotating = false;
      cameraInfo.direction = rotation.to;
      updateTarget();
    }
    rotation.value = value;
    playerCamera.rotation.y = (value * Math.PI) / 2;
  } else if (!cameraInfo.target) {
    // cannot move forward, rotate
    // Always turn right if there is a way, otherwise turn left
    // In other words, always walk along the wall on right side
    rotate(
      isConnected(
        connections,
        cameraInfo.pos[0],
        cameraInfo.pos[1],
        (cameraInfo.direction + 3) % 4
      )
    );
    cameraInfo.rotating = true;
  } else {
    const [dx, dy] = cameraInfo.forward
      ? Directions[cameraInfo.direction]
      : Directions[(cameraInfo.direction + 2) % 4];
    const [tx, ty] = getPosition(...cameraInfo.target);
    if (
      isDirection(
        playerCamera.position.x,
        playerCamera.position.z,
        tx,
        ty,
        dx,
        -dy
      )
    ) {
      // not get to the target cell yet
      playerCamera.position.x += dx * cameraInfo.vMove;
      playerCamera.position.z -= dy * cameraInfo.vMove;
    } else {
      // reached target cell, find next target
      playerCamera.position.x = tx;
      playerCamera.position.z = ty;
      cameraInfo.pos = cameraInfo.target;
      updateTarget();
      // Always turn right if there is a way
      if (
        isConnected(
          connections,
          cameraInfo.pos[0],
          cameraInfo.pos[1],
          (cameraInfo.direction + 3) % 4
        )
      ) {
        rotate(true);
      }
      // start rotation when there is a pending one
      if (cameraInfo.rotation.delta) cameraInfo.rotating = true;
    }
    updatePlayer();
  }
}

function updateSize() {
  const { devicePixelRatio, innerWidth, innerHeight } = window;
  const width = (innerWidth * devicePixelRatio) | 0;
  const height = (innerHeight * devicePixelRatio) | 0;
  const canvas = renderer.domElement;
  const { width: canvasWidth, height: canvasHeight } = canvas;
  if (canvasWidth === width && canvasHeight === height) return;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  cameras.forEach((camera) => {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  });
}

function render() {
  controls.update();
  updateCamera();
  updateSize();
  const camera = cameras[activeCamera];
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
