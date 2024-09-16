import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import CameraControls from 'camera-controls';
import { SobelOutlinePass } from './SobelOutlinePass';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import {GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import{}
let gui = new GUI()
let params = {
  enabled: true,
  outlinesOnly: true,
  useNormalMaps: true,

  depthOutlineThickness: 1,
  depthBias: 0.1,

  normalOutlineThickness: 1,
  normalBias: 0.1,

  color: 0,
};
gui.width = 300;

// gui.add(params, 'enabled');
// gui.add(params, 'outlinesOnly');
// gui.add(params, 'useNormalMaps');
// gui.add(params, 'depthOutlineThickness', 0, 5, 0.01);
// gui.add(params, 'depthBias', - 5, 5, 0.01);
// gui.add(params, 'normalOutlineThickness', 0, 5, 0.01);
// gui.add(params, 'normalBias', - 5, 5, 0.01);
// gui.addColor(params, 'color');

gui.open();
const canvas = document.getElementById('three-canvas');
CameraControls.install({ THREE: THREE });
let cameracontrols;
let clock = new THREE.Clock();
const width = canvas.clientWidth;
const height = canvas.clientHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
camera.position.set(0, 0, 1000);
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
// const mapbg=await new THREE.TextureLoader().loadAsync('./asoulbg.png')
// const plane= new THREE.Mesh(
//   new THREE.PlaneGeometry(200,100,100,100),
//   new THREE.MeshBasicMaterial({
//     map:mapbg
//   })
// );
// mapbg.colorSpace="srgb"
// scene.add(plane);

const mmdmodel = await new MMDLoader().loadAsync('./mmd/cywl10/cywl10.pmx')
scene.add(mmdmodel)
// const loader = new GLTFLoader();
// loader.load(
//   'https://rawgit.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
//   g => {

//     scene.add( g.scene );

//   }
// );
// Lights
const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
directionalLight.position.set(60, 200, 130);
scene.add(directionalLight);

let ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);
// mmdmodel.position.set(0,0,0)
//effect
let renderPass = new RenderPass(scene, camera);

let gammaPass = new ShaderPass(GammaCorrectionShader);

let fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);

let outlinePass = new SobelOutlinePass(new THREE.Vector2(window.innerWidth,window.innerHeight),scene, camera);
// window.outlinePass = outlinePass;
let composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
composer.setPixelRatio(window.devicePixelRatio);
composer.addPass(renderPass);
composer.addPass( outlinePass );
// composer.addPass(gammaPass);
composer.addPass(fxaaPass);
let animate = function () {
  requestAnimationFrame(animate);
  // outlinePass.enabled = params.enabled;
  // outlinePass.outlinesOnly = params.outlinesOnly;
  // outlinePass.useNormalMaps = params.useNormalMaps;
  // outlinePass.depthBias = params.depthBias;
  // outlinePass.depthOutlineThickness = params.depthOutlineThickness;
  // outlinePass.normalBias = params.normalBias;
  // outlinePass.normalOutlineThickness = params.normalOutlineThickness;
  // outlinePass.color.set(params.color);
  cameracontrols.update(clock.getDelta());
  renderer.render(scene, camera);
  composer.render(renderer, scene);
};

animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});