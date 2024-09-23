import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
// import { ColorPass } from './Colorpass';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import CameraControls from 'camera-controls';
import { PencilLinesPass } from './PencilLinesPass';
let gui = new GUI()
// const params = {
//   VignettingIntensity:1.0,
//   r:0.5,
//   center:new THREE.Vector2(0.0,0)
// };
// gui.add( params, 'VignettingIntensity' ).min( 0).max(5);
// gui.add( params, 'r' ).min( 0 ).max( 1 );
// gui.add( params.center, 'x' ).min( -1 ).max( 1 );
// gui.add( params.center, 'y' ).min( -1 ).max( 1 );
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
// camera.position.set(0, 0, 1000);
camera.position.z = 5
camera.position.y = 2
renderer.setSize(width, height);
canvas.appendChild(renderer.domElement);
renderer.render(scene, camera);
// renderer.setClearColor('#eee')
// // renderer.physicallyCorrectLights = true
// renderer.toneMapping = THREE.CineonToneMapping
// renderer.toneMappingExposure = 1.75
// renderer.shadowMap.enabled = true
// renderer.shadowMap.type = THREE.PCFSoftShadowMap
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
// directionalLight.castShadow = true
// directionalLight.position.set(2, 2, 2)
// directionalLight.shadow.mapSize.width = 2048
// directionalLight.shadow.mapSize.height = 2048
// scene.add(directionalLight)

// const hemisphereLight = new THREE.HemisphereLight(0x7a3114, 0x48c3ff, 0.5)
// scene.add(hemisphereLight)

// const pmremGenerator = new THREE.PMREMGenerator(renderer);
// scene.environment = pmremGenerator.fromScene(
//   new RoomEnvironment(renderer),
//   0.04
// ).texture;
// scene.background = pmremGenerator.fromScene(
//   new RoomEnvironment(renderer),
//   0.04
// ).texture;
cameracontrols = new CameraControls(camera, renderer.domElement);
const mapbg=await new THREE.TextureLoader().loadAsync('./asoulbg.png')
const plane= new THREE.Mesh(
  new THREE.PlaneGeometry(2,1,100,100),
  new THREE.MeshBasicMaterial({
    map:mapbg
  })
);
mapbg.colorSpace="srgb"
scene.add(plane);
// const geometry = new THREE.TorusKnotGeometry(1, 0.3, 200, 32)
// const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
// const torus = new THREE.Mesh(geometry, material)
// torus.castShadow = true
// torus.rotation.y = Math.PI / 4
// torus.position.set(0, 1, 0)
// scene.add(torus)

// const plane = new THREE.Mesh(
//   new THREE.PlaneGeometry(10, 10),
//   new THREE.MeshStandardMaterial({ color: 0xffffff })
// )
// plane.rotation.x = -Math.PI / 2
// plane.position.y = -0.75
// plane.receiveShadow = true
// scene.add(plane)
//effect
let composer = new EffectComposer(renderer);
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
let pencilLinePass = new PencilLinesPass( renderer.domElement.clientWidth,renderer.domElement.clientHeight, scene, camera)

composer.addPass(pencilLinePass)
composer.addPass(new ShaderPass(FXAAShader));
// let vignettingPass=new VignettingPass()
// composer.addPass(vignettingPass)
// let colorpass=new ColorPass()
let animate = function () {
  // vignettingPass.r=params.r
  // vignettingPass.VignettingIntensity=params.VignettingIntensity
  // vignettingPass.center=params.center
  // colorpass.Contrast=params.Contrast
  // colorpass.HueShift=params.HueShift
  requestAnimationFrame(animate);
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