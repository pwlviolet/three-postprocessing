import { Vector4, ShaderMaterial, UniformsUtils, WebGLRenderTarget, Color, NearestFilter, LinearFilter, RGBAFormat, Vector3 } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const BlurShader = {
	uniforms: {
		tDiffuse: { value: null },
		v: { value: 1.0 / 512.0 },
		h: { value: 1.0 / 512.0 }
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
		void main() {
			vec4 sum = vec4( 0.0 );
			// Simple 3x3 Gaussian or Box blur for efficiency, or larger kernel as in BloomPass
            // Using the one from BloomPass for consistency (9-tap)
			sum += texture( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y - 4.0 * v ) ) * 0.0162162162;
			sum += texture( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y - 3.0 * v ) ) * 0.0540540541;
			sum += texture( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y - 2.0 * v ) ) * 0.1216216216;
			sum += texture( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y - 1.0 * v ) ) * 0.1945945946;
			sum += texture( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.2270270270;
			sum += texture( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y + 1.0 * v ) ) * 0.1945945946;
			sum += texture( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y + 2.0 * v ) ) * 0.1216216216;
			sum += texture( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y + 3.0 * v ) ) * 0.0540540541;
			sum += texture( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y + 4.0 * v ) ) * 0.0162162162;
			gl_FragColor = sum;
		}`
};

const CloudShader = {
	uniforms: {
		tDiffuse: { value: null },
		tDepth: { value: null }, // Scene Depth
		tCloudNormal: { value: null },
		tCloudDepth: { value: null },
        uTime: { value: 0.0 },
        uCameraPos: { value: new Vector3() },
        uInverseViewMatrix: { value: null },
        uInverseProjectionMatrix: { value: null },
        uLightPos: { value: new Vector3(100, 100, 100) },
        uCloudColor: { value: new Color(0xffffff) },
        uNoiseScale: { value: 1.0 },
        uDebug: { value: 0 },
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 1000.0 }
	},
	vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform sampler2D tDepth;
		uniform sampler2D tCloudNormal;
		uniform sampler2D tCloudDepth;
        
        uniform float uTime;
        uniform vec3 uCameraPos;
        uniform mat4 uInverseViewMatrix;
        uniform mat4 uInverseProjectionMatrix;
        uniform vec3 uLightPos;
        uniform vec3 uCloudColor;
        uniform float uNoiseScale;
        uniform int uDebug;
        uniform float uCameraNear;
        uniform float uCameraFar;

		varying vec2 vUv;

        // Simplex 3D Noise 
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute( permute( permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        vec3 getWorldPos(float linearDepth, vec2 uv) {
            // 1. Recover viewZ (negative value in View Space) from linear depth
            float viewZ = linearDepth * (uCameraNear - uCameraFar) - uCameraNear;

            // 2. Calculate View Space Ray (pointing to Far Plane, NDC z=1.0)
            vec4 ndcRay = vec4(uv * 2.0 - 1.0, 1.0, 1.0);
            vec4 viewRay = uInverseProjectionMatrix * ndcRay;
            viewRay.xyz /= viewRay.w; // Point on the far plane in view space
            
            // 3. Calculate World Space Ray Direction (Rotate View Ray to World Space)
            // uInverseViewMatrix is Camera World Matrix. We only rotate direction (w=0.0)
            // Mathematically equivalent to (uInverseViewMatrix * vec4(viewPos, 1.0)).xyz but cheaper and gives us the Ray Dir
            vec3 worldRayDir = (uInverseViewMatrix * vec4(viewRay.xyz, 0.0)).xyz;

            // 4. Reconstruct World Position: CameraPos + RayDir * Scale
            // Scale is determined by the ratio of target ViewZ to the Ray's ViewZ
            // This accounts for the planar nature of the depth buffer (avoids fish-eye distortion)
            float scale = viewZ / viewRay.z;
            
            return uCameraPos + worldRayDir * scale;
        }

        float fbm(vec3 x) {
            float v = 0.0;
            float a = 0.5;
            vec3 shift = vec3(100.0);
            for (int i = 0; i < 5; ++i) {
                v += a * snoise(x);
                x = x * 2.0 + shift;
                a *= 0.5;
            }
            return v;
        }

		void main() {
            vec4 baseColor = texture(tDiffuse, vUv);
            vec4 cloudDepthSample = texture(tCloudDepth, vUv);
            vec4 cloudNormalSample = texture(tCloudNormal, vUv);
            
            float cloudDepthVal = cloudDepthSample.r; // Linear Depth [0, 1]
            float alpha = cloudDepthSample.a; // Alpha from blur
            
            // Basic check if there is a cloud here
            if (alpha < 0.01) {
                gl_FragColor = baseColor;
                return;
            }

            // Reconstruct world position directly from linear depth
            vec3 worldPos = getWorldPos(cloudDepthVal, vUv);
            
            // Noise (FBM)
            // float noiseVal = snoise(worldPos * uNoiseScale);
            float noiseVal = fbm(worldPos * uNoiseScale);
            //  float noiseVal = snoise(worldPos * uNoiseScale + vec3(0.0, uTime * 0.1, 0.0));
            // Perturb depth (visual only for lighting/shading, we don't actually change the depth buffer)
            // We use noise to modify the normal
            
            vec3 normal = normalize(cloudNormalSample.rgb * 2.0 - 1.0); // Unpack [0,1] to [-1,1]
            
            // Simple normal perturbation based on noise gradient (approximated)
            // Or just use noise to affect color brightness
            // Let's try to perturb normal slightly
            float epsilon = 0.1;
            vec3 noiseGrad = vec3(
                fbm(worldPos * uNoiseScale + vec3(epsilon, 0.0, 0.0)) - noiseVal,
                fbm(worldPos * uNoiseScale + vec3(0.0, epsilon, 0.0)) - noiseVal,
                fbm(worldPos * uNoiseScale + vec3(0.0, 0.0, epsilon)) - noiseVal
            );
            vec3 finalNormal = normalize(normal - noiseGrad * 0.2); // Strength of bump

            // Lighting (Blinn-Phong)
            vec3 lightDir = normalize(uLightPos - worldPos);
            vec3 viewDir = normalize(uCameraPos - worldPos);
            vec3 halfDir = normalize(lightDir + viewDir);
            
            float diff = max(dot(finalNormal, lightDir), 0.0);
            float spec = pow(max(dot(finalNormal, halfDir), 0.0), 32.0);
            
            vec3 ambient = vec3(0.4) * uCloudColor;
            vec3 diffuse = diff * uCloudColor * 0.8; // Reduce diffuse contrast slightly
            vec3 specular = vec3(spec);
            
            vec3 cloudFinalColor = ambient + diffuse + specular;

            // Cloud Edge Light (using alpha)
            // The thinner the alpha, the more light passes through (scattering)? 
            // Or rim light?
            // "Use alpha channel generated from blurred depth map" -> likely for soft edges/transparency
            
            float rim = 1.0 - max(dot(viewDir, finalNormal), 0.0);
            rim = pow(rim, 2.0);
            cloudFinalColor += vec3(rim) * 0.5;

            // Mix with scene
            // If cloud is behind scene object, we shouldn't render it?
            // But for now, just mix based on alpha
            
            // Adjust alpha and color to make gray areas more white and slightly transparent
            float brightness = dot(cloudFinalColor, vec3(0.299, 0.587, 0.114));
            
            // Boost ambient/dark areas to be more white
            // Mix current color towards pure white based on inverse brightness
            // Strong whitening for dark areas
            vec3 whitenedColor = mix(cloudFinalColor, vec3(1.0), 0.8 * (1.0 - brightness));
            
            // Reduce alpha significantly for dark/shadowed areas to make them see-through
            // Logic: The darker the pixel (shadow), the more transparent it becomes
            float finalAlpha = alpha * (0.3 + 0.7 * smoothstep(0.15, 0.7, brightness));

            vec4 finalColor = mix(baseColor, vec4(whitenedColor, 1.0), finalAlpha);

            if (uDebug == 1) {
                // Debug Perturbed Normal
                gl_FragColor = vec4(finalNormal * 0.5 + 0.5, 1.0);
            } else if (uDebug == 2) {
                // Debug Noise
                gl_FragColor = vec4(vec3(noiseVal), 1.0);
            } else if (uDebug == 3) {
                // Debug Linear Depth
                gl_FragColor = vec4(vec3(cloudDepthVal), 1.0);
            } else if (uDebug == 4) {
                // Debug Input Normal
                gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
            } else {
                gl_FragColor = vec4(finalColor);
            }
		}`
};

class CloudPass extends Pass {
	constructor(cloudNormalRT, cloudDepthRT, camera) {
		super();
		this.cloudNormalRT = cloudNormalRT;
		this.cloudDepthRT = cloudDepthRT;
        this.camera = camera;

        this.tempRT1 = new WebGLRenderTarget(cloudNormalRT.width, cloudNormalRT.height);
        // this.tempRT2 = new WebGLRenderTarget(cloudNormalRT.width, cloudNormalRT.height);
        
        // Blur Materials
        this.blurMaterial = new ShaderMaterial({
            uniforms: UniformsUtils.clone(BlurShader.uniforms),
            vertexShader: BlurShader.vertexShader,
            fragmentShader: BlurShader.fragmentShader
        });

        // Cloud Material
        this.cloudMaterial = new ShaderMaterial({
            uniforms: UniformsUtils.clone(CloudShader.uniforms),
            vertexShader: CloudShader.vertexShader,
            fragmentShader: CloudShader.fragmentShader,
            transparent: true
        });
        
        this.fsQuad = new FullScreenQuad(this.cloudMaterial);
        
        // Uniforms linking
        this.cloudMaterial.uniforms.tCloudNormal.value = this.cloudNormalRT.texture;
        this.cloudMaterial.uniforms.tCloudDepth.value = this.cloudDepthRT.texture;
        
        // Helper for 2-pass blur
        this.blurQuad = new FullScreenQuad(this.blurMaterial);
	}

    // blurTexture(renderer, inputRT, outputRT, iterations = 2) {
    //     let readBuffer = inputRT;
    //     let writeBuffer = this.tempRT1;
        
    //     for (let i = 0; i < iterations; i++) {
    //         // Horizontal or one pass (current shader is simple 2D blur)
    //         // If separable, we'd do H then V. The current shader seems to be a combined kernel or just simple.
    //         // BloomPass used v and h uniforms.
            
    //         // Pass 1
    //         this.blurMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    //         this.blurMaterial.uniforms.h.value = 1.0 / readBuffer.width;
    //         this.blurMaterial.uniforms.v.value = 0.0; // Horizontal? Or just use combined
    //         // Actually the BlurShader I copied from BloomPass has both H and V loops in one go?
    //         // Wait, BloomPass shader:
    //         // sum += texture(..., y - 4*v) ... Vertical
    //         // sum += texture(..., x - 4*h) ... Horizontal
    //         // It does BOTH in one shader execution. That's actually not a correct Gaussian blur (it adds them, doesn't convolve fully in 2D properly, but it's a "star" blur).
    //         // For "blur twice", we can just run this shader twice.
            
    //         this.blurMaterial.uniforms.v.value = 1.0 / readBuffer.height;
    //         this.blurMaterial.uniforms.h.value = 1.0 / readBuffer.width;
            
    //         renderer.setRenderTarget(writeBuffer);
    //         this.blurQuad.render(renderer);
            
    //         // Swap
    //         let temp = readBuffer;
    //         readBuffer = writeBuffer;
    //         writeBuffer = (i === iterations - 1) ? outputRT : temp; 
    //         // Logic is tricky. 
    //         // Iteration 0: Input -> Temp1
    //         // Iteration 1: Temp1 -> Temp2 (if we had 2 temps) or Temp1 -> Output
    //     }
        
    //     // Simplified: Input -> Temp1 -> Output (2 passes)
        
    //     // Pass 1: Input -> Temp1
    //     this.blurMaterial.uniforms.tDiffuse.value = inputRT.texture;
    //     this.blurMaterial.uniforms.h.value = 2.0 / inputRT.width; // Stronger blur?
    //     this.blurMaterial.uniforms.v.value = 2.0 / inputRT.height;
    //     renderer.setRenderTarget(this.tempRT1);
    //     this.blurQuad.render(renderer);
        
    //     // Pass 2: Temp1 -> Temp2 (We will use Temp2 as final blurred result for this frame)
    //     this.blurMaterial.uniforms.tDiffuse.value = this.tempRT1.texture;
    //     renderer.setRenderTarget(this.tempRT2);
    //     this.blurQuad.render(renderer);
        
    //     return this.tempRT2.texture;
    // }

	render(renderer, writeBuffer, readBuffer) {
        // Update Cloud Shader Uniforms
        this.cloudMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        this.cloudMaterial.uniforms.uTime.value = performance.now() * 0.001;
        this.cloudMaterial.uniforms.uCameraPos.value.copy(this.camera.position);
        this.cloudMaterial.uniforms.uInverseViewMatrix.value = this.camera.matrixWorld;
        this.cloudMaterial.uniforms.uInverseProjectionMatrix.value = this.camera.projectionMatrixInverse;
        this.cloudMaterial.uniforms.uCameraNear.value = this.camera.near;
        this.cloudMaterial.uniforms.uCameraFar.value = this.camera.far;

        // Blur Normals
        // We need to store the result somewhere. I'll reuse tempRTs but I need two results (normal and depth).
        // So I need more RTs or just manage carefully.
        // Let's assume we blur Normal -> TempRT1 -> TempRT2. Then pass TempRT2 to CloudShader.
        // Then blur Depth -> TempRT1 -> TempRT2. Then pass TempRT2 to CloudShader.
        // BUT CloudShader needs BOTH at the same time.
        // So I need 4 temp RTs? Or just 2 dedicated RTs for the final blurred results.
        
        // Let's create dedicated blurred RTs in constructor?
        // Actually, I can just reuse the existing RTs if I don't need the original raw G-Buffer for anything else this frame.
        // But inputRTs might be read-only or shared.
        // I'll add this.blurredNormalRT and this.blurredDepthRT.
        
        if (!this.blurredNormalRT) {
             this.blurredNormalRT = new WebGLRenderTarget(this.cloudNormalRT.width, this.cloudNormalRT.height);
             this.blurredDepthRT = new WebGLRenderTarget(this.cloudDepthRT.width, this.cloudDepthRT.height);
        }
        
        // Blur Normal -> this.blurredNormalRT
        // Pass 1
        this.blurMaterial.uniforms.tDiffuse.value = this.cloudNormalRT.texture;
        this.blurMaterial.uniforms.h.value = 1.0 / this.cloudNormalRT.width;
        this.blurMaterial.uniforms.v.value = 1.0 / this.cloudNormalRT.height; // Horizontal? Or just use combined
        renderer.setRenderTarget(this.tempRT1);
        this.blurQuad.render(renderer);
        // Pass 2
        this.blurMaterial.uniforms.tDiffuse.value = this.tempRT1.texture;
        renderer.setRenderTarget(this.blurredNormalRT);
        this.blurQuad.render(renderer);
        
        // Blur Depth -> this.blurredDepthRT
        // Pass 1
        this.blurMaterial.uniforms.tDiffuse.value = this.cloudDepthRT.texture;
        renderer.setRenderTarget(this.tempRT1);
        this.blurQuad.render(renderer);
        // Pass 2
        this.blurMaterial.uniforms.tDiffuse.value = this.tempRT1.texture;
        renderer.setRenderTarget(this.blurredDepthRT);
        this.blurQuad.render(renderer);
        
        // Bind blurred textures to Cloud Shader
        this.cloudMaterial.uniforms.tCloudNormal.value = this.blurredNormalRT.texture;
        this.cloudMaterial.uniforms.tCloudDepth.value = this.blurredDepthRT.texture;

		if (this.renderToScreen) {
			renderer.setRenderTarget(null);
			this.fsQuad.render(renderer);
		} else {
			renderer.setRenderTarget(writeBuffer);
			if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
			this.fsQuad.render(renderer);
		}
	}
}

export { CloudPass };
