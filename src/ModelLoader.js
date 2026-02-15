import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * ModelLoader: Sistema robusto para cargar modelos GLB/FBX con PBR en WebGL Standard.
 * Soporta texturas externas y materiales integrados (Embedded).
 */
export class ModelLoader {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.fbxLoader = new FBXLoader();
        this.textureLoader = new THREE.TextureLoader();
    }

    /**
     * Carga un modelo y sus texturas. 
     * Si 'textures' está vacío, usa los materiales originales del GLB/FBX.
     */
    async loadModel(modelPath, textures = {}, options = {}) {
        const {
            scale = 1,
            position = new THREE.Vector3(0, 0, 0),
            repeat = [1, 1],
            rotation = 0,
            castShadow = true,
            receiveShadow = true,
            transparent = false,
            opacity = 1.0,
            envMapIntensity = 1.0,
            side = THREE.FrontSide,
            roughnessMultiplier = 1.0,
            metalness = 0.0,
            roughness = null // Nueva opción: Roughness absoluto (opcional)
        } = options;

        console.log(`[ModelLoader] 📦 Cargando: ${modelPath}`);

        try {
            const isFBX = modelPath.toLowerCase().endsWith('.fbx');
            let model;

            if (isFBX) {
                model = await this.fbxLoader.loadAsync(modelPath);
            } else {
                const gltf = await this.loader.loadAsync(modelPath);
                model = gltf.scene;
            }

            model.scale.setScalar(scale);
            model.position.copy(position);

            const hasExternalTextures = Object.keys(textures).length > 0;
            let meshStandardMaterial = null;

            if (hasExternalTextures) {
                // MODO EXTERNO: Crear material PBR Standard

                // Helper para configurar texturas con transforms
                const configureTexture = (tex, isSRGB = false) => {
                    if (!tex) return;
                    tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                    tex.flipY = false;

                    // Transforms
                    tex.repeat.set(repeat[0], repeat[1]);
                    if (rotation !== 0) {
                        tex.rotation = rotation;
                        tex.center.set(0.5, 0.5);
                    }
                };

                const setupTex = async (path, isSRGB = false) => {
                    if (!path) return null;
                    try {
                        const tex = await this.textureLoader.loadAsync(path);
                        configureTexture(tex, isSRGB);
                        return tex;
                    } catch (e) {
                        console.error(`  - ❌ Error cargando textura: ${path}`, e);
                        return null;
                    }
                };

                const map = await setupTex(textures.color, true);
                const roughnessMap = await setupTex(textures.roughness);
                const metalnessMap = await setupTex(textures.metal);
                const normalMap = await setupTex(textures.normal);

                meshStandardMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0xffffff),
                    transparent: transparent,
                    opacity: opacity,
                    envMapIntensity: envMapIntensity,
                    side: side,
                    metalness: metalness,

                    map: map,
                    roughnessMap: roughnessMap,
                    metalnessMap: metalnessMap,
                    normalMap: normalMap
                });

                // Si no hay mapa de roughness, usamos el valor base * multiplier
                // Si hay mapa de roughness, three.js multiplica el mapa por .roughness, así que podemos usar el multiplier ahí.
                meshStandardMaterial.roughness = roughnessMap ? roughnessMultiplier : (0.8 * roughnessMultiplier);

            }

            // Aplicación y Limpieza
            let meshCount = 0;
            model.traverse((child) => {
                // Eliminar luces heredadas
                if (child.isLight) {
                    child.intensity = 0;
                    child.visible = false;
                    return;
                }

                if (child.isMesh) {
                    // 1. Limpieza de colores de vértices
                    if (child.geometry && child.geometry.attributes.color) {
                        child.geometry.deleteAttribute('color');
                    }

                    // 2. Aplicación de Material
                    if (hasExternalTextures) {
                        child.material = meshStandardMaterial;
                    } else {
                        // MODO INTEGRADO: Usar original pero optimizar
                        if (child.material) {
                            child.material.envMapIntensity = envMapIntensity;
                            child.material.side = side;
                            child.material.transparent = transparent;
                            if (transparent) child.material.opacity = opacity;

                            // NUEVO: Overrides de metalness y roughness
                            if (metalness !== 0.0) child.material.metalness = metalness;
                            if (roughness !== null) child.material.roughness = roughness;
                        }
                    }

                    child.castShadow = castShadow;
                    child.receiveShadow = receiveShadow;
                    meshCount++;
                }
            });

            this.scene.add(model);
            console.log(`[ModelLoader] ✅ OK: ${modelPath} (${meshCount} meshes, Modo: ${hasExternalTextures ? 'Externo' : 'Integrado'})`);
            return model;

        } catch (error) {
            console.error(`[ModelLoader] ❌ Error en ${modelPath}:`, error);
        }
    }
}
