import './style.css';
import * as THREE from 'three/webgpu';
import { pass, output, normalView, mrt, vec3, vec4 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { PlayerController } from './player.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { setupEnvironment, setupSun, setupFog } from './scene.js';
import { setupInteraction } from './interaction.js';

// Inicialización Principal
(async () => {
    // 1. Setup Básico (WebGPURenderer)
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
    renderer.toneMappingExposure = 1.0;

    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    // 2. Iluminación y Ambiente
    await setupEnvironment(renderer, scene);
    const { light: sunLight, hemiLight, lightHelper } = setupSun(scene);
    setupFog(scene);

    // 3. Loader
    const loader = new GLTFLoader();

    // 4. Array para objetos colisionables (PisoBase)
    const colliders = [];

    // 5. Cargar PisoBase (Modelo invisible para colisiones)
    try {
        const pisoBaseGltf = await loader.loadAsync('models/pisoBase.glb');
        const modelPiso = pisoBaseGltf.scene;
        
        // Configurar como invisible
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
                child.material.opacity = 0;           // Totalmente transparente
                child.material.colorWrite = false;    // No escribe color al buffer
                child.material.depthWrite = false;   // No escribe profundidad
            }
        });
        
        scene.add(modelPiso);
        colliders.push(modelPiso);
        console.log("PisoBase cargado correctamente.");
    } catch (err) {
        console.error("Error cargando pisoBase:", err);
        console.warn("El jugador no tendrá superficie para caminar sin pisoBase.");
    }

    // 6. Controles de Jugador
    const playerAnchor = new THREE.Group();
    playerAnchor.name = "PlayerAnchor";
    playerAnchor.position.set(0, 5, 0); // Posición inicial
    scene.add(playerAnchor);

    const player = new PlayerController(camera, scene, playerAnchor, renderer.domElement, colliders);
    console.log("Controlador de jugador inicializado.");

    // 7. Configurar RenderPipeline (Post-procesamiento) con WebGPU
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

    // 8. Loop de Animación
    const clock = new THREE.Clock();

    function animate() {
        const delta = clock.getDelta();

        // Actualizar matrices de la escena
        scene.updateMatrixWorld();

        // Actualizar jugador
        if (player) player.update(delta);

        // Render mediante la pipeline de WebGPU
        renderPipeline.render();

        requestAnimationFrame(animate);
    }

    // 9. Interaction Callbacks
    setupInteraction(camera, scene, {
        onClick: (obj) => {
            console.log("Interactuado con:", obj.name || "Sin nombre");
        }
    });

    // 10. Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
})();
