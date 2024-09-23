import {
	ShaderMaterial,
	Vector2
} from 'three';
import pencilfrag from './pencileffect_f.glsl?raw'
import pencilvertex from './pencileffect_v.glsl?raw'
const fragmentShader = pencilfrag;
const vertexShader = pencilvertex;

export class PencilLinesMaterial extends ShaderMaterial {
	constructor() {
		super({
			uniforms: {
				// we'll keep the naming convention here since the CopyShader
				// also used a tDiffuse texture for the currently rendered scene.
				tDiffuse: { value: null },
                uNormals:{value:null},
                uTexture: { value: null },
				// we'll pass in the canvas size here later
				uResolution: {
					value: new Vector2(1, 1)
				}
			},
			fragmentShader, // to be imported from another file
			vertexShader // to be imported from another file
		})
	}
}