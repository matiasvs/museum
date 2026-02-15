import * as THREE from 'three';
import gsap from 'gsap';

export function setupInteraction(camera, scene, callbacks) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const objectClicked = intersects[0].object;
            console.log("Interactuado con:", objectClicked.name);

            // Ejemplo: si el objeto tiene userData.isInteractable
            if (callbacks.onClick) callbacks.onClick(objectClicked);
        }
    };

    window.addEventListener('mousedown', onMouseClick);

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            // Lógica simple de hover
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    });

    // Teclado
    window.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'e') {
            if (callbacks.onKeyInteract) callbacks.onKeyInteract();
        }
    });
}
