import * as THREE from 'three';
import GUI from 'lil-gui';

/**
 * setupUI: Centraliza toda la lógica de interfaz de usuario y controles de lil-gui.
 */
export function setupUI(params) {
    const {
        scene,
        renderer,
        camera,
        sunLight,
        hemiLight,
        sunDir
    } = params;

    // 1. Instrucciones Overlay
    const info = document.createElement('div');
    info.style.position = 'absolute';
    info.style.top = '10px';
    info.style.left = '10px';
    info.style.color = 'white';
    info.style.backgroundColor = 'rgba(0,0,0,0.5)';
    info.style.padding = '10px';
    info.style.fontFamily = 'monospace';
    info.style.zIndex = '100';
    info.innerHTML = 'CLICK PARA JUGAR<br>WASD: Moverse<br>MOUSE: Mirar';
    document.body.appendChild(info);

    // 4. Configuración lil-gui
    const gui = new GUI({ title: 'Config Estándar' });

    // --- Carpeta Sol ---
    const sunFolder = gui.addFolder('Sol');
    const sunParams = {
        elevation: 60, // Elevación más alta para iluminación estándar
        azimuth: 116.64,
        intensity: 1.5,
        ambientIntensity: 0.2
    };

    const updateSun = () => {
        const phi = THREE.MathUtils.degToRad(90 - sunParams.elevation);
        const theta = THREE.MathUtils.degToRad(sunParams.azimuth);
        const sunPos = new THREE.Vector3().setFromSphericalCoords(100, phi, theta);

        sunLight.position.copy(sunPos);

        sunLight.intensity = sunParams.intensity;
        if (hemiLight) hemiLight.intensity = sunParams.ambientIntensity;
    };

    sunFolder.add(sunParams, 'elevation', 0, 360).name('Elevación (Vertical)').onChange(updateSun);
    sunFolder.add(sunParams, 'azimuth', 0, 360).name('Rumbos (Horizontal)').onChange(updateSun);
    sunFolder.add(sunParams, 'intensity', 0, 5).name('Intensidad Sol').onChange(updateSun);
    sunFolder.add(sunParams, 'ambientIntensity', 0, 2).name('Luz Ambiental').onChange(updateSun);

    updateSun(); // Valores iniciales

    // --- Carpeta Exposición ---
    const settingsFolder = gui.addFolder('Ajustes');
    const settingsParams = { exposure: 1.0 };
    settingsFolder.add(settingsParams, 'exposure', 0, 5).name('Exposición').onChange(v => {
        renderer.toneMappingExposure = v;
    });

    return gui;
}
