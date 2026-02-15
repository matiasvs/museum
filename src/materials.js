import * as THREE from 'three';

// 1. Configuramos el cargador
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

// Función auxiliar para cargar texturas con settings correctos
const loadTex = (url) => {
    const tex = textureLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace; // Importante para Albedo
    return tex;
};

/**
 * Configura el tiling (repetición) de una textura.
 * @param {THREE.Texture} map - La textura a configurar.
 * @param {number} repeatX - Repeticiones en X (U).
 * @param {number} repeatY - Repeticiones en Y (V).
 */
export const configureTiling = (map, repeatX = 1, repeatY = 1) => {
    if (!map) return;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.needsUpdate = true;
};

// 2. Definición de Materiales
export const createPBRMaterials = () => {

    // --- MATERIAL 1: METAL PULIDO (CROMO) ---
    const metalPoli = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xf0f0f0), // Casi blanco para cromo
        metalness: 1.0,           // Completamente metálico
        roughness: 0.05           // Muy pulido/brilloso
    });

    // --- MATERIAL 2: METAL OXIDADO (USANDO PACKING) ---
    // Nota: Requiere texturas en /public/textures/
    const metalRust = new THREE.MeshStandardMaterial();
    // Fallback provisional si no hay texturas
    metalRust.color = new THREE.Color(0x8B4513);
    metalRust.metalness = 0.5;
    metalRust.roughness = 0.8;


    // --- MATERIAL 3: HORMIGÓN ---
    const concrete = new THREE.MeshStandardMaterial();
    concrete.color = new THREE.Color(0x808080);
    concrete.roughness = 0.9;
    concrete.metalness = 0.0;


    // --- MATERIAL 4: MADERA MATE ---
    const woodMate = new THREE.MeshStandardMaterial({
        color: 0x8B5A2B,
        roughness: 0.7,
        metalness: 0.0
    });

    // --- MATERIAL 5: MADERA BARNIZADA (PHYSICAL) ---
    const woodLux = new THREE.MeshPhysicalMaterial({
        color: 0x5C4033,
        roughness: 0.5,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03
    });

    // --- MATERIAL 6: VIDRIO REALISTA (PHYSICAL) ---
    const vidrioMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffe5cc), // Naranja muy suave
        metalness: 0.0,
        roughness: 0.05,
        transmission: 1.0,      // Transmisión total
        thickness: 0.05,        // Pequeño grosor para habilitar efecto lupa
        ior: 1.2,               // IOR un poco mayor a 1.0 para distorsión suave
        transparent: true,
        envMapIntensity: 1.0
    });

    // --- MATERIAL 7: ACERO CROMADO ---
    const aceroMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x888888), // Color original
        metalness: 1.0,         // Máxima metalicidad para reflejos
        roughness: 0.1,         // Restaurado para efecto acero pulido
    });

    // --- MATERIAL 8: METAL BLANCO ---
    const metalBlancoMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xf0f0f0), // Blanco roto
        metalness: 0.9,
        roughness: 0.2,
    });

    return { metalPoli, metalRust, concrete, woodMate, woodLux, vidrioMaterial, aceroMaterial, metalBlancoMaterial, loadingManager };
};
