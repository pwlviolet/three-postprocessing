import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { WebGLRenderer, TextureLoader,WebGLRenderTarget, ShaderMaterial, Vector2, NearestFilter, HalfFloatType, RGBAFormat, MeshNormalMaterial } from 'three'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader'
import { PencilLinesMaterial } from './PencilLinesMaterial'
// import { width, height } from './main'

export class PencilLinesPass extends Pass {
	fsQuad
	material

	constructor(width, height, scene, camera) {

		super()
		const normalBuffer = new WebGLRenderTarget(width, height)
		normalBuffer.texture.format = RGBAFormat
		normalBuffer.texture.type = HalfFloatType
		normalBuffer.texture.minFilter = NearestFilter
		normalBuffer.texture.magFilter = NearestFilter
		normalBuffer.texture.generateMipmaps = false
		normalBuffer.stencilBuffer = false
		this.normalBuffer = normalBuffer
		this.normalMaterial = new MeshNormalMaterial()
		this.scene = scene
		this.camera = camera
		this.material = new PencilLinesMaterial()
		this.fsQuad = new FullScreenQuad(this.material)
		this.material.uniforms.uResolution.value = new Vector2(width, height)
		const loader = new TextureLoader()
		loader.load('./cloud-noise.png', (texture) => {
			this.material.uniforms.uTexture.value = texture
		})
	}

	dispose() {
		this.material.dispose()
		this.fsQuad.dispose()
	}
	render(renderer, writeBuffer, readBuffer) {
		renderer.setRenderTarget(this.normalBuffer)
		const overrideMaterialValue = this.scene.overrideMaterial

		this.scene.overrideMaterial = this.normalMaterial
		renderer.render(this.scene, this.camera)
		this.scene.overrideMaterial = overrideMaterialValue
		// renderer.setRenderTarget(null)

		this.material.uniforms.uNormals.value = this.normalBuffer.texture
		this.material.uniforms.tDiffuse.value = readBuffer.texture
		
		// this.material.uniforms['tDiffuse'].value = readBuffer.texture

		if (this.renderToScreen) {
			renderer.setRenderTarget(null)
			this.fsQuad.render(renderer)
		} else {
			renderer.setRenderTarget(writeBuffer)
			if (this.clear) renderer.clear()
			this.fsQuad.render(renderer)
		}
	}
}