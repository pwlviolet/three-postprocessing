import { Vector4, ShaderMaterial, UniformsUtils, WebGLRenderTarget } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
// import {
// 	ShaderMaterial,
// 	UniformsUtils
// } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
const Boxblurshader = {
	defines: {
		gamma: 2.2
	},
	uniforms: {
		tDiffuse: { value: null },
		_Bluroffset: { value: new Vector4(1.0 / window.innerWidth, 1.0 / window.innerHeight, 1.0 / window.innerWidth, 1.0 / window.innerHeight) },
	},

	vertexShader: `
		varying vec2 vUv;
		void main() {
      		vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform float _Brightness;
		uniform float _Saturation;
		uniform float _Contrast;
		uniform float _HueShift;
		uniform vec4 _Bluroffset;

		varying vec2 vUv;
		//饱和度
        float luminance( vec3 rgb ) {
    		vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
    		return dot( weights, rgb );
		}
		vec3 lerp(vec3 x, vec3 y, float t) {
    		return x + t * (y - x);
		}
		vec3 gammaCorrection(vec3 color) {
    		return pow(color, vec3(1.0 / gamma));
		}
		vec3 inverseGammaCorrection(vec3 color) {
    		return pow(color, vec3(gamma));
		}

		void main() {
			 vec4 kernel=_Bluroffset.xyxy*vec4(-1,-1,1,1);
			 vec4 color=vec4(0.0);
			 vec4 Diffuse=texture(tDiffuse,vUv);
			//  Diffuse.rgb= gammaCorrection(Diffuse.rgb);
			 color+=texture(tDiffuse,vUv+kernel.xy);
			 color+=texture(tDiffuse,vUv+kernel.zy);
			 color+=texture(tDiffuse,vUv+kernel.xw);
			 color+=texture(tDiffuse,vUv+kernel.zw);
			 color*=0.25;
			//  color.rgb=gammaCorrection(color.rgb);

			 gl_FragColor = vec4(color.xyz,1.0);
		}`,
};



class BoxblurPass extends Pass {
	set Bluroffset(v) {
		this.material.uniforms._Bluroffset.value = v;
	}
	get Bluroffset() {
		return this.material.uniforms._Bluroffset.value;
	}

	constructor(options = {}, textureID) {
		super()
		this.textureID = (textureID !== undefined) ? textureID : 'tDiffuse';
		let shader = Boxblurshader
		if (shader instanceof ShaderMaterial) {
			this.uniforms = shader.uniforms;
			this.material = shader;
		} else if (shader) {

			this.uniforms = UniformsUtils.clone(shader.uniforms);
			this.material = new ShaderMaterial({
				name: (shader.name !== undefined) ? shader.name : 'unspecified',
				defines: Object.assign({}, shader.defines),
				uniforms: this.uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader

			});

		}
		this.rt1 = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
		this.rt2 = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
		this.fsQuad = new FullScreenQuad(this.material);
		this.Bluroffset = 'Bluroffset' in options ? options.Bluroffset : new Vector4(1.0 / window.innerWidth, 1.0 / window.innerHeight, 1.0 / window.innerWidth, 1.0 / window.innerHeight);
		this.count = 'count' in options ? options.count : 1;
	}
	render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

		if (this.uniforms[this.textureID]) {

			this.uniforms[this.textureID].value = readBuffer.texture;

		}

		this.fsQuad.material = this.material;
		// this.renderToScreen = false
		for (let i = 1; i < this.count; i++) {
			renderer.setRenderTarget(this.rt1)
			this.fsQuad.render(renderer);
			// this.rt1
			this.uniforms[this.textureID].value = this.rt1.texture;
			renderer.setRenderTarget(this.rt2)
			this.fsQuad.render(renderer);
			this.uniforms[this.textureID].value = this.rt2.texture;
			// this.rt1 = this.rt2
		}






		if (this.renderToScreen) {

			renderer.setRenderTarget(null);
			this.fsQuad.render(renderer);

		} else {

			renderer.setRenderTarget(writeBuffer);
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
			this.fsQuad.render(renderer);

		}

	}


}

export { BoxblurPass };
