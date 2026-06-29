import * as THREE from 'three/webgpu';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export async function setupEnvironment(renderer, scene) {
    // Cargar HDRI para ambiente y fondo
    const exrLoader = new EXRLoader();
    try {
        const texture = await exrLoader.loadAsync('textures/EveningSkyHDRI022B_4K_HDR.exr');
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene.background = texture;
        scene.environment = texture;
        scene.environmentIntensity = 1.0;

        console.log("✅ HDRI cargado con éxito");
    } catch (err) {
        console.error("❌ Error al cargar el HDRI:", err);
        scene.environmentIntensity = 1.0;
    }
}

export function setupSun(scene) {
    // Luz Direccional con Sombras
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(10, 20, 10);
    light.castShadow = true;

    // Configuración de sombras de alta calidad
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 100;

    // Ajustar frustum para cubrir el área de juego
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;

    light.shadow.bias = -0.00005;
    light.shadow.normalBias = 0.03;

    scene.add(light);

    // Helper visual para ver la posición del sol
    const lightHelper = new THREE.DirectionalLightHelper(light, 5, 0xffff00);
    scene.add(lightHelper);

    // Luz ambiental
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.05);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    return { light, hemiLight, lightHelper };
}

export function setupFog(scene) {
    scene.fog = new THREE.FogExp2(0x8899aa, 0.002);
}
