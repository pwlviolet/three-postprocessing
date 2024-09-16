import {
	ShaderMaterial,
	UniformsUtils,
	MeshDepthMaterial,
	MeshNormalMaterial,
	RenderTarget,
	WebGLRenderTarget
} from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { SobelOutlineShader } from './SobelOutlineShader.js';


class SobelOutlinePass extends Pass {

	constructor( resolution,scene,camera, params ) {

		super();
		this.resolution = resolution;

		this.renderScene = scene;
		this.renderCamera = camera;
		this.depethRT=new WebGLRenderTarget(resolution.x,resolution.y);
		this.normalRT=new WebGLRenderTarget(resolution.x,resolution.y);
		this.depthMaterial = new MeshDepthMaterial();
		this.normalMaterial = new MeshNormalMaterial();

	 	if ( SobelOutlineShader === undefined ) {

	 		console.error( 'THREE.SobelOutlinePass requires SobelOutlineShader' );

	 	}

	 	this.uniforms = UniformsUtils.clone( SobelOutlineShader.uniforms );
	 	this.material = new ShaderMaterial( {
			defines:SobelOutlineShader.defines,
	 		uniforms: this.uniforms,
	 		fragmentShader: SobelOutlineShader.fragmentShader,
	 		vertexShader: SobelOutlineShader.vertexShader
	 	} );
		this.material.uniforms.resolution.value = this.resolution;
	 	// this.material.uniforms.depthOutlineThickness.value = 1;
	 	// this.material.uniforms.depthBias.value = 0.1;
	 	// this.material.uniforms.normalOutlineThickness.value = 1;
	 	// this.material.uniforms.normalBias.value = 0.1;


		for ( const key in params ) {

			if ( params.hasOwnProperty( key ) && this.uniforms.hasOwnProperty( key ) ) {

				this.uniforms[ key ].value = params[ key ];

			}

		}

		this.fsQuad = new FullScreenQuad( this.material );

	}

	render( renderer, writeBuffer, readBuffer/*, deltaTime, maskActive*/ ) {

 		this.material.uniforms[ 'mainTex' ].value = readBuffer.texture;
		 this.initialBackground = this.renderScene.background;
		 this.renderScene.background = null;
		 this.renderScene.overrideMaterial = this.depthMaterial
	   
		 this.initialClearAlpha = renderer.getClearAlpha();
		 renderer.setClearAlpha(0);
	   
		 renderer.setRenderTarget(this.depethRT);
		 renderer.render(this.renderScene, this.renderCamera);
		 this.material.uniforms.depthTex.value = this.depethRT.texture;
		 this.renderScene.overrideMaterial = this.normalMaterial
		 renderer.setRenderTarget(this.normalRT);
		 renderer.render(this.renderScene, this.renderCamera);
		 this.material.uniforms.normalTex.value = this.normalRT.texture;
		 renderer.setRenderTarget(null);
		 this.renderScene.background = this.initialBackground;
		 renderer.getClearAlpha(this.initialClearAlpha);
		 this.renderScene.overrideMaterial = null;

 		if ( this.renderToScreen ) {

 			renderer.setRenderTarget( null );
 			this.fsQuad.render( renderer );

		} else {

 			renderer.setRenderTarget( writeBuffer );
 			if ( this.clear ) renderer.clear();
			this.fsQuad.render( renderer );

		}

 	}

}

export { SobelOutlinePass };
