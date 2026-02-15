import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * modFBX: Fábrica especializada para cargar y configurar modelos FBX con PBR avanzado (WebGL Standard).
 */
export async function loadFBX(scene, modelPath, textures = {}, options = {}) {
    const {
        scale = 1,
        position = new THREE.Vector3(0, 0, 0),
        repeat = [1, 1],
        offset = [0, 0],
        rotation = 0,
        side = THREE.FrontSide,
        castShadow = true,
        receiveShadow = true,
        // Parámetros de Comportamiento PBR
        colorIntensity = 1.0,
        roughnessMultiplier = 1.0,
        metalness = 0.0,
        normalScale = 1.0,
        displacementScale = 1.0,
        displacementBias = 0.0,
        envMapIntensity = 1.0
    } = options;

    console.log(`[modFBX] 🚀 Iniciando carga: ${modelPath}`, { textures, options });

    // --- MANAGER PARA INTERCEPTAR RUTAS ABSOLUTAS ---
    const manager = new THREE.LoadingManager();
    const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    manager.setURLModifier((url) => {
        // Regex para detectar rutas absolutas de sistemas de archivos (Windows/Linux/Mac)
        // Coincide con: /home/, /Users/, C:/, D:/, etc., o rutas largas que contienen 'Documents'
        const isAbsolutePath = /^(\/home\/|\/Users\/|[a-zA-Z]:\/|.*Documents\/)/i.test(url);

        // También atrapa URLs que empiezan con doble slash (protocol relative) erróneo local
        const isProtocolRelativeLocal = url.startsWith('//home') || url.startsWith('//Users');

        if (isAbsolutePath || isProtocolRelativeLocal) {
            // console.warn(`[modFBX] 🛡️ Interceptando ruta absoluta inválida: ${url}`);
            return transparentPixel;
        }

        return url;
    });

    const fbxLoader = new FBXLoader(manager);
    const textureLoader = new THREE.TextureLoader();

    try {
        const model = await fbxLoader.loadAsync(modelPath);
        model.scale.setScalar(scale);
        model.position.copy(position);

        // Helper para configurar texturas con transforms
        const configureTexture = (tex, isSRGB = false) => {
            if (!tex) return;
            tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.flipY = false; // FBX suele requerir flipY false para texturas externas a veces, depende del export

            // Transforms
            tex.repeat.set(repeat[0], repeat[1]);
            tex.offset.set(offset[0], offset[1]);
            if (rotation !== 0) {
                tex.rotation = rotation;
                tex.center.set(0.5, 0.5);
            }
        };

        const loadTex = async (path, isSRGB = false) => {
            if (!path) return null;
            const tex = await textureLoader.loadAsync(path);
            configureTexture(tex, isSRGB);
            return tex;
        };

        // Carga de texturas PBR
        const map = await loadTex(textures.color, true);
        const roughnessMap = await loadTex(textures.roughness);
        const metalnessMap = await loadTex(textures.metal || textures.glossy);
        const normalMap = await loadTex(textures.normal);
        const displacementMap = await loadTex(textures.displacement);

        // Crear material estándar
        const material = new THREE.MeshStandardMaterial({
            map: map,
            roughnessMap: roughnessMap,
            metalnessMap: metalnessMap,
            normalMap: normalMap,
            displacementMap: displacementMap,

            color: new THREE.Color(0xffffff).multiplyScalar(colorIntensity),
            roughness: roughnessMap ? 1.0 : 0.8 * roughnessMultiplier, // Si hay mapa, roughness base 1 multiplicado por mapa. Si no, valor fijo.
            metalness: metalness,

            normalScale: new THREE.Vector2(normalScale, normalScale),
            displacementScale: displacementScale,
            displacementBias: displacementBias,
            envMapIntensity: envMapIntensity,
            side: side,
            transparent: false,
            opacity: 1
        });

        // Ajuste fino de roughness si hay mapa, Three.js multiplica map * roughness value. 
        // Si queremos usar el multiplier, lo aplicamos al valor base.
        if (roughnessMap) {
            material.roughness = roughnessMultiplier;
        }

        // --- Aplicación al Modelo ---
        model.traverse((child) => {
            if (child.isLight) {
                console.warn(`[modFBX] 💡 Eliminando luz intrusa de FBX: ${child.name}`);
                child.intensity = 0;
                child.visible = false;
                return;
            }

            if (child.isMesh) {
                // Limpieza de colores de vértices
                if (child.geometry && child.geometry.attributes.color) {
                    child.geometry.deleteAttribute('color');
                }
                child.material = material;
                child.castShadow = castShadow;
                child.receiveShadow = receiveShadow;
            }
        });

        scene.add(model);
        console.log(`[modFBX] ✅ Modelo listo: ${modelPath}`);
        return model;

    } catch (error) {
        console.error(`[modFBX] ❌ Error cargando ${modelPath}:`, error);
        throw error;
    }
}
