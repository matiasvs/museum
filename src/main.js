import './style.css';
import * as THREE from 'three/webgpu';
import { pass, output, normalView, mrt, vec3, vec4 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { PlayerController } from './player.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Stats from 'stats.js';
import { setupEnvironment, setupSun, setupFog } from './scene.js';
import { setupInteraction } from './interaction.js';
import { ModelLoader } from './ModelLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { loadFBX } from './modFBX.js';

import { LightControls } from './components/LightControls.js';

// Inicialización Principal
(async () => {
    // Setup Stats
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '0px';
    stats.dom.style.left = 'auto'; // Reset left default
    stats.dom.style.right = '0px'; // Set right
    document.body.appendChild(stats.dom);

    // 2. Setup Básico (WebGPURenderer)
    const renderer = new THREE.WebGPURenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.0; // Valor estándar para AgX

    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    // 3. Iluminación y Ambiente
    await setupEnvironment(renderer, scene);
    const { light: sunLight, hemiLight, lightHelper } = setupSun(scene);
    setupFog(scene);

    // --- NUEVO: Controles de Luz Personalizados ---
    const updateSunPosition = (params) => {
        // Clamp elevation para evitar sombras invertidas (no permitir valores negativos)
        const clampedElevation = Math.max(0, params.elevation);

        const phi = THREE.MathUtils.degToRad(90 - clampedElevation);
        const theta = THREE.MathUtils.degToRad(params.azimuth);

        // Base position (Spherical)
        const sunPos = new THREE.Vector3().setFromSphericalCoords(100, phi, theta);

        // Apply Orientation X (Rotación alrededor del eje Z - inclina el plano del sol)
        if (params.orientationX !== undefined && params.orientationX !== 0) {
            const orientationXRad = THREE.MathUtils.degToRad(params.orientationX);
            sunPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), orientationXRad);
        }

        // CRÍTICO: Asegurar que el sol siempre esté por encima del horizonte
        // Si Y es negativo, invertir la posición para mantener sombras correctas
        if (sunPos.y < 0) {
            sunPos.y = Math.abs(sunPos.y);
            sunPos.x = -sunPos.x;
            sunPos.z = -sunPos.z;
        }

        sunLight.position.copy(sunPos);
        if (params.intensity !== undefined) sunLight.intensity = params.intensity;

        // Actualizar helper visual
        if (lightHelper) lightHelper.update();
    };

    // Loader
    const modelLoader = new ModelLoader(scene);
    const loader = new GLTFLoader(); // Added missing loader definition
    // Agregamos un método dummy para compatibilidad si no existe
    modelLoader.updateSun = (data) => { };

    const lightControls = new LightControls(document.body, (data) => {
        modelLoader.updateSun(data);
        updateSunPosition({
            elevation: data.elevation,
            azimuth: data.azimuth,
            intensity: data.intensity
        });
    });

    // Inicializar iluminación
    updateSunPosition({ elevation: 45, azimuth: 90, intensity: 1.5 });

    // Array para objetos colisionables (Suelo)
    const colliders = [];

    // --- Nuevo Modelo: piso-0.fbx (Usando Factoría modFBX.js) ---
    loadFBX(scene, 'models/piso-0.fbx', {
        color: 'textures/1-pisoMadera/Wood082B_2K-JPG_Color.jpg',
        roughness: 'textures/1-pisoMadera/Wood082B_2K-JPG_Roughness.jpg',
        normal: 'textures/1-pisoMadera/Wood082B_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [5.5, 5.5],
        rotation: Math.PI / 2,
        side: THREE.DoubleSide,
        colorIntensity: 3.0,
        roughnessMultiplier: 1.0, // Valor estándar
        metalness: 0.0,
        normalScale: 2.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: rampaMadera-1.fbx (Configuración Madera - Mapeo Escalera) ---
    loadFBX(scene, 'models/rampaMadera-1.fbx', {
        color: 'textures/1-pisoMadera/Wood082B_2K-JPG_Color.jpg',
        roughness: 'textures/1-pisoMadera/Wood082B_2K-JPG_Roughness.jpg',
        normal: 'textures/1-pisoMadera/Wood082B_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [3, 3],
        offset: [0, 0.04],
        rotation: Math.PI / 2,
        side: THREE.DoubleSide,
        colorIntensity: 2.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 3.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: piso-1.fbx (Configuración Madera - Segundo Piso) ---
    loadFBX(scene, 'models/piso-1.fbx', {
        color: 'textures/1-pisoMadera/Wood082B_2K-JPG_Color.jpg',
        roughness: 'textures/1-pisoMadera/Wood082B_2K-JPG_Roughness.jpg',
        normal: 'textures/1-pisoMadera/Wood082B_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [5.5, 5.5],
        rotation: Math.PI / 2,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: piso-00.fbx (Configuración Madera - Planta Baja Extension) ---
    loadFBX(scene, 'models/piso-00.fbx', {
        color: 'textures/1-pisoMadera/Wood082B_2K-JPG_Color.jpg',
        roughness: 'textures/1-pisoMadera/Wood082B_2K-JPG_Roughness.jpg',
        normal: 'textures/1-pisoMadera/Wood082B_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [5.5, 5.5],
        rotation: Math.PI / 2,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });


    // --- Nuevo Modelo: piso-2.fbx (Configuración Madera - Planta Alta / Segmento 3) ---
    loadFBX(scene, 'models/piso-2.fbx', {
        color: 'textures/1-pisoMadera/Wood082B_2K-JPG_Color.jpg',
        roughness: 'textures/1-pisoMadera/Wood082B_2K-JPG_Roughness.jpg',
        normal: 'textures/1-pisoMadera/Wood082B_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [5.5, 5.5],
        rotation: Math.PI / 2,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: pared-1.fbx (Configuración Concreto) ---
    loadFBX(scene, 'models/pared-1.fbx', {
        color: 'textures/2-concreteQuad/Concrete031_2K-JPG_Color.jpg',
        roughness: 'textures/2-concreteQuad/Concrete031_2K-JPG_Roughness.jpg',
        normal: 'textures/2-concreteQuad/Concrete031_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [2, 2],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: pared-2.fbx (Configuración Concreto - Muro 2) ---
    loadFBX(scene, 'models/pared-2.fbx', {
        color: 'textures/2-concreteQuad/Concrete031_2K-JPG_Color.jpg',
        roughness: 'textures/2-concreteQuad/Concrete031_2K-JPG_Roughness.jpg',
        normal: 'textures/2-concreteQuad/Concrete031_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [1.45, 1.45],
        offset: [-0.04, 0],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: pared-3.fbx (Configuración Concreto - Muro 3) ---
    loadFBX(scene, 'models/pared-3.fbx', {
        color: 'textures/2-concreteQuad/Concrete031_2K-JPG_Color.jpg',
        roughness: 'textures/2-concreteQuad/Concrete031_2K-JPG_Roughness.jpg',
        normal: 'textures/2-concreteQuad/Concrete031_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [2.01, 2.01],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 0.5,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: pared-4.fbx (Configuración Concreto - Muro 4) ---
    loadFBX(scene, 'models/pared-4.fbx', {
        color: 'textures/2-concreteQuad/Concrete031_2K-JPG_Color.jpg',
        roughness: 'textures/2-concreteQuad/Concrete031_2K-JPG_Roughness.jpg',
        normal: 'textures/2-concreteQuad/Concrete031_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [1, 1],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 0.5,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: pared-5.fbx (Configuración Concreto - Muro 5) ---
    loadFBX(scene, 'models/pared-5.fbx', {
        color: 'textures/2-concreteQuad/Concrete031_2K-JPG_Color.jpg',
        roughness: 'textures/2-concreteQuad/Concrete031_2K-JPG_Roughness.jpg',
        normal: 'textures/2-concreteQuad/Concrete031_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [1, 1],
        offset: [0.18, 0],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 0.5,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: pared-6.fbx (Configuración Concreto - Muro 6) ---
    loadFBX(scene, 'models/pared-6.fbx', {
        color: 'textures/2-concreteQuad/Concrete031_2K-JPG_Color.jpg',
        roughness: 'textures/2-concreteQuad/Concrete031_2K-JPG_Roughness.jpg',
        normal: 'textures/2-concreteQuad/Concrete031_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [1.45, 1.45],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 0.5,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: paredes4EntrePiso.fbx (Configuración Concreto Simple) ---
    loadFBX(scene, 'models/paredes4EntrePiso.fbx', {
        color: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Color.jpg',
        roughness: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Roughness.jpg',
        normal: 'textures/4-ConcretSimple/Concrete036_2K-JPG_NormalGL.jpg',
        ao: 'textures/4-ConcretSimple/Concrete036_2K-JPG_AmbientOcclusion.jpg'
    }, {
        scale: 0.01,
        repeat: [2, 2],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    }).then(() => {
        console.log('[main] ✅ paredes4EntrePiso.fbx cargado con éxito.');
    }).catch(err => {
        console.error('[main] ❌ Error cargando paredes4EntrePiso.fbx:', err);
    });

    // --- Nuevo Modelo: paredes4EntrePisoCostado.fbx (Configuración Madera Pared) ---
    loadFBX(scene, 'models/paredes4EntrePisoCostado.fbx', {
        color: 'textures/6-maderaPared/Wood024_2K-JPG_Color.jpg',
        roughness: 'textures/6-maderaPared/Wood024_2K-JPG_Roughness.jpg',
        normal: 'textures/6-maderaPared/Wood024_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [2, 2],
        rotation: 0,
        side: THREE.DoubleSide
    });

    // --- Nuevo Modelo: puertaMadera.fbx (Configuración Madera Puerta) ---
    loadFBX(scene, 'models/puertaMadera.fbx', {
        color: 'textures/8-maderaPuerta/Wood053_2K-JPG_Color.jpg',
        roughness: 'textures/8-maderaPuerta/Wood053_2K-JPG_Roughness.jpg',
        normal: 'textures/8-maderaPuerta/Wood053_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [1, 1], // Ajustar repeticón visualmente
        rotation: 0,
        side: THREE.DoubleSide
    });

    // --- Nuevo Modelo: 1pared.fbx (Configuración Madera Puerta) ---
    loadFBX(scene, 'models/1pared.fbx', {
        color: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Color.jpg',
        roughness: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Roughness.jpg',
        normal: 'textures/4-ConcretSimple/Concrete036_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [2, 2],
        rotation: 0,
        side: THREE.DoubleSide
    });

    // --- Nuevo Modelo: a-1-metalBajoCalle.fbx (Configuración Metal Vidrios) ---
    loadFBX(scene, 'models/a-1-metalBajoCalle.fbx', {
        color: 'textures/5-metalVidrios/Metal050A_2K-JPG_Color.jpg',
        metal: 'textures/5-metalVidrios/Metal050A_2K-JPG_Metalness.jpg',
        roughness: 'textures/5-metalVidrios/Metal050A_2K-JPG_Roughness.jpg',
        normal: 'textures/5-metalVidrios/Metal050A_2K-JPG_NormalGL.jpg',
        displacement: 'textures/5-metalVidrios/Metal050A_2K-JPG_Displacement.jpg'
    }, {
        scale: 0.01,
        repeat: [1, 1],
        rotation: 0,
        side: THREE.DoubleSide,
        metalness: 1.0,
        roughnessMultiplier: 1.0,
        normalScale: 1.0,
        displacementScale: 0.1
    });

    // --- Nuevo Modelo: a-2-detalleMetalPiso.fbx (Metal Cromado Procedural) ---
    const chromeFBXLoader = new FBXLoader();
    chromeFBXLoader.load('models/a-2-detalleMetalPiso.fbx', (fbx) => {
        fbx.scale.setScalar(0.01);

        // Material cromado procedural (sin texturas)
        const chromeMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 1.0,
            roughness: 0.1,
            envMapIntensity: 2.0,
            side: THREE.DoubleSide
        });

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = chromeMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(fbx);
        console.log('[main] ✅ a-2-detalleMetalPiso.fbx cargado con material cromado.');
    });

    // --- Nuevo Modelo: a-3-vidrio.fbx (Material Vidrio Transparente) ---
    const glassFBXLoader = new FBXLoader();
    glassFBXLoader.load('models/a-3-vidrio.fbx', (fbx) => {
        fbx.scale.setScalar(0.01);

        // Material vidrio procedural (transparente con tinte azul suave y efecto lupa)
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xddeeff,  // Tinte azul muy suave
            metalness: 0.0,
            roughness: 0.05,
            transmission: 0.92,
            ior: 1.8,  // Mayor IOR para efecto lupa más pronunciado
            thickness: 1.5,  // Mayor grosor para más refracción
            transparent: true,
            opacity: 0.4,
            envMapIntensity: 1.5,
            side: THREE.DoubleSide,
            clearcoat: 0.3,  // Capa adicional para más brillo
            clearcoatRoughness: 0.1
        });

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = glassMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(fbx);
        console.log('[main] ✅ a-3-vidrio.fbx cargado con material vidrio verdoso.');
    });

    // --- Nuevo Modelo: a-4-vidrioCalle.fbx (Material Vidrio Transparente Naranja) ---
    const glassOrangeFBXLoader = new FBXLoader();
    glassOrangeFBXLoader.load('models/a-4-vidrioCalle.fbx', (fbx) => {
        fbx.scale.setScalar(0.01);

        // Material vidrio procedural (transparente con tinte naranja suave y efecto lupa)
        const glassOrangeMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffeecc,  // Tinte naranja muy suave
            metalness: 0.0,
            roughness: 0.05,
            transmission: 0.92,
            ior: 1.8,  // Mayor IOR para efecto lupa
            thickness: 1.5,  // Mayor grosor para más refracción
            transparent: true,
            opacity: 0.4,
            envMapIntensity: 1.5,
            side: THREE.DoubleSide,
            clearcoat: 0.3,
            clearcoatRoughness: 0.1
        });

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = glassOrangeMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(fbx);
        console.log('[main] ✅ a-4-vidrioCalle.fbx cargado con material vidrio naranja.');
    });

    // --- Nuevo Modelo: a-5-vidrioInternoPuerta.fbx (Vidrio Esmerilado Semi-transparente) ---
    const glassFrostedFBXLoader = new FBXLoader();
    glassFrostedFBXLoader.load('models/a-5-vidrioInternoPuerta.fbx', (fbx) => {
        fbx.scale.setScalar(0.01);

        // Material vidrio esmerilado (opaco, semi-transparente)
        const glassFrostedMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xf5f5f5,  // Blanco casi puro
            metalness: 0.0,
            roughness: 0.8,  // Alta rugosidad para efecto esmerilado
            transmission: 0.5,  // Transmisión reducida (semi-transparente)
            ior: 1.5,
            thickness: 0.3,
            transparent: true,
            opacity: 0.7,  // Más opaco
            envMapIntensity: 0.5,
            side: THREE.DoubleSide,
            clearcoat: 0.1,
            clearcoatRoughness: 0.5
        });

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = glassFrostedMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(fbx);
        console.log('[main] ✅ a-5-vidrioInternoPuerta.fbx cargado con vidrio esmerilado.');
    });

    // --- Nuevo Modelo: a-6-ParedesCalle.fbx (Configuración Concreto Simple) ---
    loadFBX(scene, 'models/a-6-ParedesCalle.fbx', {
        color: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Color.jpg',
        roughness: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Roughness.jpg',
        normal: 'textures/4-ConcretSimple/Concrete036_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [2, 2],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: rampa1.fbx (Configuración Madera - Rampa 2) ---
    loadFBX(scene, 'models/rampa1.fbx', {
        color: 'textures/3-madera/Wood023_2K-JPG_Color.jpg',
        roughness: 'textures/3-madera/Wood023_2K-JPG_Roughness.jpg',
        normal: 'textures/3-madera/Wood023_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [6, 6],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: rampaConcretoTriple.fbx (Configuración Concreto - Rampa Concreto Triple) ---
    loadFBX(scene, 'models/rampaConcretoTriple.fbx', {
        color: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Color.jpg',
        roughness: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Roughness.jpg',
        normal: 'textures/4-ConcretSimple/Concrete036_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [1, 1],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 0.5,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: pared-8.fbx (Configuración Concreto - Muro 8) ---
    loadFBX(scene, 'models/pared-8.fbx', {
        color: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Color.jpg',
        roughness: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Roughness.jpg',
        normal: 'textures/4-ConcretSimple/Concrete036_2K-JPG_NormalGL.jpg'
    }, {
        scale: 0.01,
        repeat: [5, 5],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 0.0,
        normalScale: 0.5,
        envMapIntensity: 1.0
    });

    // --- Nuevos Modelos: Techos (Configuración Concreto - Techos 1 al 4) ---
    ['techo-1.fbx', 'techo-2.fbx', 'techo-3.fbx', 'techo-4.fbx'].forEach(file => {
        loadFBX(scene, `models/${file}`, {
            color: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Color.jpg',
            roughness: 'textures/4-ConcretSimple/Concrete036_2K-JPG_Roughness.jpg',
            normal: 'textures/4-ConcretSimple/Concrete036_2K-JPG_NormalGL.jpg'
        }, {
            scale: 0.01,
            repeat: [4, 4],
            rotation: 0,
            side: THREE.DoubleSide,
            colorIntensity: 1.0,
            roughnessMultiplier: 1.0,
            metalness: 0.0,
            normalScale: 0.5,
            envMapIntensity: 1.0
        });
    });

    // --- Nuevo Modelo: baseTecho.fbx (Texturas 7-metalBaseTecho) ---
    loadFBX(scene, 'models/baseTecho.fbx', {
        color: 'textures/7-metalBaseTecho/Metal046A_4K-JPG_Color.jpg',
        metal: 'textures/7-metalBaseTecho/Metal046A_4K-JPG_Metalness.jpg',
        normal: 'textures/7-metalBaseTecho/Metal046A_4K-JPG_NormalGL.jpg',
        roughness: 'textures/7-metalBaseTecho/Metal046A_4K-JPG_Roughness.jpg'
    }, {
        scale: 0.01,
        repeat: [4, 4],
        rotation: 0,
        side: THREE.DoubleSide,
        colorIntensity: 1.0,
        roughnessMultiplier: 1.0,
        metalness: 1.0,
        normalScale: 1.0,
        envMapIntensity: 1.0
    });

    // --- Nuevo Modelo: ventilador.glb (Respetando texturas originales) ---
    loader.load('models/ventilador.glb', (gltf) => {
        const model = gltf.scene;
        // Prevenir luces "intrusas" embebidas en el modelo
        model.traverse((child) => {
            if (child.isLight) {
                child.visible = false;
                child.intensity = 0;
            }
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
        scene.add(model);
        console.log("[main] ✅ Ventilador cargado con éxito.");
    });

    // --- Nuevo Modelo: baranda.glb (Configuración Baranda Metálica - Sincronizado con Ventilador) ---
    loader.load('models/baranda.glb', (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isLight) {
                child.visible = false;
                child.intensity = 0;
            }
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
        scene.add(model);
        console.log("[main] ✅ Baranda cargada con éxito (Modo Original).");
    });

    // --- Nuevo Modelo: marcoMetal.glb (Respetando texturas originales) ---
    loader.load('models/marcoMetal.glb', (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isLight) {
                child.visible = false;
                child.intensity = 0;
            }
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
        scene.add(model);
        console.log("[main] ✅ Marco Metal cargado con éxito.");
    });

    // --- Nuevo Modelo: elevador1.glb (Respetando texturas originales) ---
    loader.load('models/elevador1.glb', (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isLight) {
                child.visible = false;
                child.intensity = 0;
            }
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
        scene.add(model);
        console.log("[main] ✅ Elevador 1 cargado con éxito.");
    });

    // --- Nuevo Modelo: vidriosRampa.fbx (Configuración Vidrio WebGL Simple) ---
    const glassRampLoader = new FBXLoader();
    glassRampLoader.load('models/vidriosRampa.fbx', (fbx) => {
        fbx.scale.setScalar(0.01);
        const vidrioRampaMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.0,
            roughness: 0.0,
            transmission: 0.9,
            ior: 1.5,
            thickness: 1.5,
            transparent: true,
            opacity: 0.5, // Opacidad para WebGL estándar
            envMapIntensity: 1.0,
            side: THREE.DoubleSide
        });

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = vidrioRampaMaterial;
            }
        });
        scene.add(fbx);
        console.log("[main] ✅ Vidrios Rampa cargado con éxito.");
    });

    // --- Nuevo Modelo: vidriosRampa2.fbx (Configuración Vidrio WebGL Simple) ---
    const glassRamp2Loader = new FBXLoader();
    glassRamp2Loader.load('models/vidriosRampa2.fbx', (fbx) => {
        fbx.scale.setScalar(0.01);
        const vidrioRampa2Material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.0,
            roughness: 0.0,
            transmission: 0.9,
            ior: 1.5,
            thickness: 1.5,
            transparent: true,
            opacity: 0.5,
            envMapIntensity: 1.0,
            side: THREE.DoubleSide
        });

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = vidrioRampa2Material;
            }
        });
        scene.add(fbx);
        console.log("[main] ✅ Vidrios Rampa 2 cargado con éxito.");
    });

    // --- Nuevo Modelo: vidriosRampa3.fbx (Configuración Vidrio WebGL Simple) ---
    const glassRamp3Loader = new FBXLoader();
    glassRamp3Loader.load('models/vidriosRampa3.fbx', (fbx) => {
        fbx.scale.setScalar(0.01);
        const vidrioRampa3Material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.0,
            roughness: 0.0,
            transmission: 0.9,
            ior: 1.5,
            thickness: 1.5,
            transparent: true,
            opacity: 0.5,
            envMapIntensity: 1.0,
            side: THREE.DoubleSide
        });

        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = vidrioRampa3Material;
            }
        });
        scene.add(fbx);
        console.log("[main] ✅ Vidrios Rampa 3 cargado con éxito.");
    });

    // --- Misión Crítica: Cargar Piso Principal (piso2.glb) ---
    try {
        const piso2Gltf = await loader.loadAsync('models/piso2.glb');
        const modelPiso = piso2Gltf.scene;
        // Prevenir luces "intrusas" en el suelo
        modelPiso.traverse((child) => {
            if (child.isLight) {
                child.visible = false;
                child.intensity = 0;
            }
            if (child.isMesh) {
                child.material.color.set(0xCBC3E3);
                child.material.side = THREE.DoubleSide;
                child.receiveShadow = true;
                child.material.transparent = true;
                child.material.opacity = 0;
                child.material.colorWrite = false;
                child.material.depthWrite = false;
            }
        });
        scene.add(modelPiso);
        colliders.push(modelPiso);
        console.log("Piso Principal (piso2.glb) cargado.");
    } catch (err) {
        console.error("Error cargando piso principal:", err);
    }

    // 5. Controles de Jugador
    const playerAnchor = new THREE.Group();
    playerAnchor.name = "PlayerAnchor";
    playerAnchor.position.set(0, 5, 0);
    scene.add(playerAnchor);

    const player = new PlayerController(camera, scene, playerAnchor, renderer.domElement, colliders);
    console.log("Controlador de jugador inicializado.");
    // 6. Configurar RenderPipeline (Post-procesamiento) con WebGPU
    const renderPipeline = new THREE.RenderPipeline(renderer);

    const scenePass = pass(scene, camera);
    scenePass.setMRT(mrt({
        output: output,
        normal: normalView
    }));

    const scenePassColor = scenePass.getTextureNode('output');
    const scenePassNormal = scenePass.getTextureNode('normal');
    const scenePassDepth = scenePass.getTextureNode('depth');

    // GTAO (Ground Truth Ambient Occlusion) para sombras de contacto
    const aoPass = ao(scenePassDepth, scenePassNormal, camera);
    aoPass.radius.value = 0.5;
    aoPass.scale.value = 1.0;
    aoPass.thickness.value = 1.0;
    const aoPassOutput = aoPass.getTextureNode();

    // Color con AO
    const colorWithAO = scenePassColor.mul(vec4(vec3(aoPassOutput.r), 1.0));

    // Bloom (Brillo en las luces)
    const bloomPass = bloom(colorWithAO, 1.2, 0.4, 0.85);

    // Color final combinando AO y Bloom
    const combinedColor = colorWithAO.add(bloomPass);

    // SMAA (Anti-aliasing de alta calidad)
    const finalPass = smaa(combinedColor);

    renderPipeline.outputNode = finalPass;

    // 7. Loop
    const clock = new THREE.Clock();
    let debugLogDone = false;

    function animate() {
        const delta = clock.getDelta();

        // Diagnóstico de Luces (Una vez)
        if (!debugLogDone && scene.children.length > 5) {
            const lights = [];
            scene.traverse(c => { if (c.isLight) lights.push(c); });
            console.log(`[DEBUG] 💡 Luces activas en escena: ${lights.length}`, lights.map(l => l.type));
            debugLogDone = true;
        }

        // Actualizar matrices de la escena
        scene.updateMatrixWorld();

        // Actualizar jugador
        if (player) player.update(delta);

        stats.update();

        // Render mediante la pipeline de WebGPU
        renderPipeline.render();

        requestAnimationFrame(animate);
    }

    // Interaction Callbacks
    setupInteraction(camera, scene, {
        onClick: (obj) => {
            console.log("Interactuado con:", obj.name || "Sin nombre");
            console.log("Mesh:", obj);
        }
    });

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
})();
