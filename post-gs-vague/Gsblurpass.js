import { Vector4, ShaderMaterial, UniformsUtils, WebGLRenderTarget } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
const Gsblurshader = {
	defines: {
		gamma: 2.2
	},
	uniforms: {
		tDiffuse: { value: null },
		v: { value: 3.0 / window.innerHeight },
		h: { value: 3.0 / window.innerWidth  }
	},

	vertexShader: `
		varying vec2 vUv;
		void main() {
      		vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform float v;
		uniform float h;

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
		vec4 sum = vec4( 0.0 );

		//纵向高斯模糊
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * (0.051/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * (0.0918/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * (0.12245/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * (0.1531/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y ) ) * (0.1633/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * (0.1531/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * (0.12245/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * (0.0918/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * (0.051/2.0);
		
		//横向高斯模糊
		sum += texture( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * (0.051/2.0);
		sum += texture( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * (0.0918/2.0);
		sum += texture( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * (0.12245/2.0);
		sum += texture( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * (0.1531/2.0);
		sum += texture( tDiffuse, vec2( vUv.x, vUv.y ) ) * (0.1633/2.0);
		sum += texture( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * (0.1531/2.0);
		sum += texture( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * (0.12245/2.0);
		sum += texture( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * (0.0918/2.0);
		sum += texture( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * (0.051/2.0);
		
		gl_FragColor = sum;
		}`,
};



class GsblurPass extends Pass {
	set v(v) {
		this.material.uniforms.v.value = v;
	}
	get v() {
		return this.material.uniforms.v.value;
	}
	set h(v) {
		this.material.uniforms.h.value = v;
	}
	get h() {
		return this.material.uniforms.h.value;
	}

	constructor(options = {}, textureID) {
		super()
		this.textureID = (textureID !== undefined) ? textureID : 'tDiffuse';
		let shader = Gsblurshader
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
		this.fsQuad = new FullScreenQuad(this.material);
		// this.Bluroffset = 'Bluroffset' in options ? options.Bluroffset : new Vector4(1.0 / window.innerWidth, 1.0 / window.innerHeight, 1.0 / window.innerWidth, 1.0 / window.innerHeight);
		this.v='v'in options? options.v : 3.0 / window.innerHeight;
		this.h='h'in options? options.h : 3.0 / window.innerWidth;
	}
	render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

		if (this.uniforms[this.textureID]) {

			this.uniforms[this.textureID].value = readBuffer.texture;

		}

		this.fsQuad.material = this.material;

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

export { GsblurPass };
