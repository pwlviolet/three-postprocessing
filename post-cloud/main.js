import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import CameraControls from 'camera-controls';
import { TexturePass } from 'three/examples/jsm/Addons.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { BloomPass } from './Bloompass';
import { CloudPass } from './CloudPass';
import { ShaderMaterial } from 'three';
let gui = new GUI()
const params = {
  v: 3,
  h: 3,
  Intensity:1.0,
  LuminanceThreshold:0.5,
  Ratio:1.5
  // Saturation:1.0,
  // Contrast:1.0,
  // HueShift:0.0
};
gui.add(params, 'v').min(1).max(10).step(1);
gui.add(params, 'h').min(1).max(10).step(1);
gui.add(params, 'Intensity').min(0).max(10).step(0.1);
gui.add(params, 'LuminanceThreshold').min(0).max(1).step(0.1);
// gui.add(params, 'Ratio').min(0.5).max(10).step(0.5);
const canvas = document.getElementById('three-canvas');
CameraControls.install({ THREE: THREE });
let cameracontrols;
let clock = new THREE.Clock();
const width = canvas.clientWidth;
const height = canvas.clientHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setPixelRatio(1.5);
camera.position.set(0, 0, 500);
renderer.setSize(width, height);
canvas.appendChild(renderer.domElement);
renderer.render(scene, camera);
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(
  new RoomEnvironment(renderer),
  0.04
).texture;
scene.background = pmremGenerator.fromScene(
  new RoomEnvironment(renderer),
  0.04
).texture;
cameracontrols = new CameraControls(camera, renderer.domElement);
const mapbg = await new THREE.TextureLoader().loadAsync('./asoulbg.png')
const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 100, 100, 100),
  new THREE.MeshBasicMaterial({
    map: mapbg
  })
);
mapbg.colorSpace = "srgb"
scene.add(plane);

const fbxLoader = new FBXLoader();
const object = await fbxLoader.loadAsync('./stanford-bunny.fbx');

object.scale.set(0.001, 0.001, 0.001);
object.position.set(0, 0, 0);

// Check if the model has materials, if not or if they look weird, we might want to apply a basic one
object.traverse((child) => {
    if (child.isMesh) {
        // Optional: Ensure it has a material that reacts to light or looks good
            child.material = new THREE.MeshNormalMaterial();
    }
    child.layers.set(1); // Set to layer 1
});

scene.add(object);

// Enable layer 1 for the camera so it can render the bunny
camera.layers.set(1);

const folder = gui.addFolder('Bunny Model');
const scaleParam = { scale: 0.001 };
folder.add(scaleParam, 'scale', 0.0001, 0.01).onChange((v) => {
    object.scale.set(v, v, v);
});
folder.add(object.position, 'x', -100, 100);
folder.add(object.position, 'y', -100, 100);
folder.add(object.position, 'z', -100, 100);
folder.add(object.rotation, 'x', 0, Math.PI * 2).name('Rotate X');
folder.add(object.rotation, 'y', 0, Math.PI * 2).name('Rotate Y');
folder.add(object.rotation, 'z', 0, Math.PI * 2).name('Rotate Z');

// Light Setup
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(100, 100, 100);
scene.add(light);
const lightHelper = new THREE.DirectionalLightHelper(light, 50);
scene.add(lightHelper);

const lightFolder = gui.addFolder('Cloud Light');
lightFolder.add(light.position, 'x', -500, 500).name('Light X');
lightFolder.add(light.position, 'y', -500, 500).name('Light Y');
lightFolder.add(light.position, 'z', -500, 500).name('Light Z');
lightFolder.addColor({ color: 0xffffff }, 'color').onChange((v) => {
    light.color.set(v);
    cloudPass.cloudMaterial.uniforms.uCloudColor.value.set(v);
}).name('Light Color');

const debugParams = { mode: 0, noiseScale: 1.0, displaceStrength: 0.5, rimStrength: 0.5, cloudBrightness: 0.8 };
const debugFolder = gui.addFolder('Cloud Settings');
debugFolder.add(debugParams, 'mode', { 
    'None': 0, 
    'Perturbed Normal': 1, 
    'Noise': 2, 
    'Linear Depth': 3, 
    'Input Normal': 4 
}).name('Debug View').onChange((v) => {
    cloudPass.cloudMaterial.uniforms.uDebug.value = parseInt(v);
});
debugFolder.add(debugParams, 'noiseScale', 0.1, 5000.0).onChange((v) => {
    cloudPass.cloudMaterial.uniforms.uNoiseScale.value = v;
});

// G-Buffer Setup
const rtWidth = window.innerWidth / 2;
const rtHeight = window.innerHeight / 2;

const normalRenderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);
const depthRenderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);

// Custom World Space Normal Material
const normalMaterial = new ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        // Transform normal to world space
        // Note: If there is non-uniform scaling, use transpose(inverse(mat3(modelMatrix)))
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        // Map [-1, 1] to [0, 1]
        gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
      }
    `
});

// Custom Depth Material to visualize depth better
const depthMaterial = new ShaderMaterial({
  uniforms: {
    cameraNear: { value: camera.near },
    cameraFar: { value: camera.far }
  },
  vertexShader: `
    varying float vViewZ;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewZ = mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float cameraNear;
    uniform float cameraFar;
    varying float vViewZ;
    #include <packing>
    void main() {
      // viewZToOrthographicDepth converts viewZ to normalized linear depth [0, 1]
      float linearDepth = viewZToOrthographicDepth(vViewZ, cameraNear, cameraFar);
      gl_FragColor = vec4(vec3(linearDepth), 1.0);
    }
  `,
  // side:1
});

// HUD for G-Buffer Visualization
const hudScene = new THREE.Scene();
const hudCamera = new THREE.OrthographicCamera(
    -window.innerWidth / 2, window.innerWidth / 2,
    window.innerHeight / 2, -window.innerHeight / 2,
    1, 10
);
hudCamera.position.z = 10;

const planeGeometry = new THREE.PlaneGeometry(rtWidth / 2, rtHeight / 2); // Scale down for visualization

// Normal Map Display (Bottom Left)
const normalQuad = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshBasicMaterial({ map: normalRenderTarget.texture })
);
normalQuad.position.set(-window.innerWidth / 2 + rtWidth / 4, -window.innerHeight / 2 + rtHeight / 4, 0);
hudScene.add(normalQuad);

// Depth Map Display (Bottom Right)
const depthQuad = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshBasicMaterial({ map: depthRenderTarget.texture })
);
depthQuad.position.set(-window.innerWidth / 2 + rtWidth / 4 * 3 + 20, -window.innerHeight / 2 + rtHeight / 4, 0);
hudScene.add(depthQuad);

//effect
const composerTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    depthTexture: new THREE.DepthTexture(),
    depthBuffer: true
});
let composer = new EffectComposer(renderer, composerTarget);
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

let cloudPass = new CloudPass(normalRenderTarget, depthRenderTarget, camera);
composer.addPass(cloudPass);

let bloompass = new  BloomPass()
composer.addPass(bloompass)


let animate = function () {
  bloompass.v = params.v/window.innerWidth
  bloompass.h = params.h/window.innerHeight
  bloompass.Intensity=params.Intensity
  bloompass.LuminanceThreshold=params.LuminanceThreshold
  
  // Update Cloud Pass Scene Depth
  if (composer.readBuffer.depthTexture) {
      cloudPass.cloudMaterial.uniforms.tDepth.value = composer.readBuffer.depthTexture;
  }
  
  // Sync Cloud Pass Light Position
  cloudPass.cloudMaterial.uniforms.uLightPos.value.copy(light.position);
  lightHelper.update();

  requestAnimationFrame(animate);
  cameracontrols.update(clock.getDelta());

  // G-Buffer Pass (Bunny Layer 1)
  // Save current clear color
  const originalClearColor = new THREE.Color();
  renderer.getClearColor(originalClearColor);
  const originalClearAlpha = renderer.getClearAlpha();
  
  // Clear with transparent black for alpha generation
  renderer.setClearColor(0x000000, 0);
  
  // Switch to Bunny Layer
  camera.layers.set(1);
  
  const currentOverrideMaterial = scene.overrideMaterial;
  
  // Render Normals
  scene.overrideMaterial = normalMaterial;
  renderer.setRenderTarget(normalRenderTarget);
  renderer.clear(); // Clear target
  renderer.render(scene, camera);
  
  // Render Depth
  scene.overrideMaterial = depthMaterial;
  renderer.setRenderTarget(depthRenderTarget);
  renderer.clear(); // Clear target
  renderer.render(scene, camera);
  
  // Restore
  scene.overrideMaterial = currentOverrideMaterial;
  renderer.setRenderTarget(null);
  renderer.setClearColor(originalClearColor, originalClearAlpha);

  // Main Render (Scene Layer 0)
  camera.layers.set(0); // Switch to Scene Layer
  
  // renderer.render(scene, camera); // Composer renders scene, so this is redundant if we use composer
  composer.render(renderer, scene);

  // Render HUD
  renderer.autoClear = false;
  renderer.clearDepth(); // Clear depth so HUD renders on top
  renderer.render(hudScene, hudCamera);
  renderer.autoClear = true;
};

animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Resize G-Buffer RTs
  const rtWidth = window.innerWidth / 2;
  const rtHeight = window.innerHeight / 2;
  normalRenderTarget.setSize(rtWidth, rtHeight);
  depthRenderTarget.setSize(rtWidth, rtHeight);
  
  // Update HUD Camera
  hudCamera.left = -window.innerWidth / 2;
  hudCamera.right = window.innerWidth / 2;
  hudCamera.top = window.innerHeight / 2;
  hudCamera.bottom = -window.innerHeight / 2;
  hudCamera.updateProjectionMatrix();

  // Update HUD Quads Position/Size (Simplified)
  // Note: Real application would update positions dynamically
});