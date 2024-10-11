import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Vector2,Vector3 } from 'three'
const Mixshader = {
	defines: {
		gamma: 2.2,

	},
	uniforms: {
		tDiffuse: { value: null },
		_texture: { value: null },
		_textureNormal: { value: null },
		_iResolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
		_Color:{value:new Vector3(5.0,5.0,5.0)},
		_Tiling:{value:new Vector2(1.0,1.0)},
		_Offset:{value:new Vector2(0.5,0.0)},
		_Distort:{value:0.3}



	},

	vertexShader: `
		varying vec2 vUv;
		void main() {
      		vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform sampler2D _texture;
		uniform sampler2D _textureNormal;
		uniform vec2 _iResolution;
		uniform vec3 _Color;
		uniform vec2 _Tiling;
		uniform vec2 _Offset;
		uniform float _Distort;




		varying vec2 vUv;
        float luminance( vec3 rgb ) {
    		vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
    		return dot( weights, rgb );
		}
		vec3 lerp(vec3 x, vec3 y, float t) {
    		return x + t * (y - x);
		}
		//线性转srgb
		vec3 gammaCorrection(vec3 color) {
    		return pow(color, vec3(1.0 / gamma));
		}
		vec3 inverseGammaCorrection(vec3 color) {
    		return pow(color, vec3(gamma));
		}
		vec3 unpackNormal(vec3 normalMap) {
		    return normalMap * 2.0 - 1.0;
		}

		void main() {
			 float aspect=_iResolution.x/_iResolution.y;

			 vec2 uv2=vUv;
			 uv2.x=uv2.x*aspect;

			 uv2=uv2*_Tiling-_Offset;


			 vec4 _texture=texture(_texture,uv2);
			 vec3 _textureNormal=unpackNormal(texture(_textureNormal,uv2).xyz);
			 //边缘删除
			 vec2 d=1.0-smoothstep(0.95,1.0,abs(vUv.xy*2.0-1.0));
			 float vfactor=d.x*d.y;
			 vec2 d_mask=step(0.005,abs(_textureNormal.xy));
			 float mask=d_mask.x*d_mask.y;

			 vec2 uv_distort=vUv+_textureNormal.xy*_Distort *vfactor*mask;
			 vec4 Diffuse=texture(tDiffuse,uv_distort);
			 Diffuse.rgb= gammaCorrection(Diffuse.rgb);


			//  vec4 _texture2=texture(_texture,(uv_distort*_Tiling-_Offset));

			 vec3 finalcolor=lerp(Diffuse.rgb,_Color,_texture.r);

			 gl_FragColor = vec4(finalcolor,1.0);
		}`,
};



class MixtexturePass extends ShaderPass {

	set texture(v) {
		this.material.uniforms._texture.value = v;
	}
	get texture() {
		return this.material.uniforms._texture.value;
	}
	set textureNormal(v) {
		this.material.uniforms._textureNormal.value = v;
	}
	get textureNormal() {
		return this.material.uniforms._textureNormal.value;
	}

	constructor(options = {}) {

		super(Mixshader);
		this.texture = 'texture' in options ? options.texture : null;
		this.textureNormal = 'textureNormal' in options ? options.textureNormal : null;

	}

}

export { MixtexturePass };
