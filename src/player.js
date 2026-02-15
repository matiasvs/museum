import * as THREE from 'three';

export class PlayerController {
    constructor(camera, scene, playerMesh, domElement, colliders = []) {
        this.camera = camera;
        this.scene = scene;
        this.player = playerMesh;
        this.domElement = domElement;
        this.colliders = colliders; // Array de objetos contra los que chocar (Pisos)

        // Configuración
        this.speed = 5.0; // Velocidad de caminata
        this.runSpeed = 10.0;
        this.lookSpeed = 0.002;
        this.playerHeight = 1.0; // Altura de los ojos/centro respecto al suelo

        // Raycaster para terreno
        this.raycaster = new THREE.Raycaster();
        this.downVector = new THREE.Vector3(0, -1, 0);

        this.isLocked = false;

        // Estado de movimiento
        this.move = { forward: false, backward: false, left: false, right: false, running: false };
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.pitch = 0; // Rotación vertical de la cámara

        // Física de Salto y Gravedad
        this.verticalVelocity = 0;
        this.gravity = 30.0;
        this.jumpForce = 12.0;
        this.isGrounded = false;
        this.move.jump = false;

        this.init();
    }

    init() {
        // Setup inicial
        // La cámara debe estar "en la cabeza" del jugador.
        // Hacemos que la cámara no sea hija directa para evitar cancelaciones de transform,
        // pero copiaremos su posición. O la hacemos hija si es más fácil.
        // En este caso, moveremos la cámara manualmente para coincidir con el player.

        // Eventos de teclado
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Eventos de Mouse (Pointer Lock)
        this.domElement.addEventListener('click', () => {
            if (!this.isLocked) {
                try {
                    this.domElement.requestPointerLock().catch(e => { }); // Silenciar error de usuario saliendo rápido
                } catch (e) {
                    // Ignorar errores síncronos en navegadores viejos
                }
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });

        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.move.forward = true; break;
            case 'ArrowLeft':
            case 'KeyA': this.move.left = true; break;
            case 'ArrowDown':
            case 'KeyS': this.move.backward = true; break;
            case 'ArrowRight':
            case 'KeyD': this.move.right = true; break;
            case 'KeyR': this.move.running = true; break;
            case 'Space': this.move.jump = true; break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.move.forward = false; break;
            case 'ArrowLeft':
            case 'KeyA': this.move.left = false; break;
            case 'ArrowRight':
            case 'KeyD': this.move.right = false; break;
            case 'ArrowDown':
            case 'KeyS': this.move.backward = false; break;
            case 'KeyR': this.move.running = false; break;
            case 'Space': this.move.jump = false; break;
        }
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // Rotar Jugador (Eje Y - Izquierda/Derecha)
        this.player.rotation.y -= movementX * this.lookSpeed;

        // Rotar PITCH (Mirar Arriba/Abajo) - Esto solo afecta a la cámara
        this.pitch -= movementY * this.lookSpeed;
        // Limitar Pitch (casi 90 grados)
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
    }

    update(delta) {
        // Limitar delta para estabilidad
        const dt = Math.min(delta, 0.05);

        if (this.isLocked) {
            this.direction.z = Number(this.move.forward) - Number(this.move.backward);
            this.direction.x = Number(this.move.left) - Number(this.move.right);
            this.direction.normalize();

            const speed = this.move.running ? this.runSpeed : this.speed;
            const actualSpeed = speed * dt;
            if (this.move.forward || this.move.backward) this.player.translateZ(-this.direction.z * actualSpeed);
            if (this.move.left || this.move.right) this.player.translateX(-this.direction.x * actualSpeed);

            if (this.move.jump && this.isGrounded) {
                this.verticalVelocity = this.jumpForce;
                this.isGrounded = false;
            }
        }

        // 2. Gravedad con Velocidad Terminal
        if (!this.isGrounded) {
            this.verticalVelocity -= this.gravity * dt;
            if (this.verticalVelocity < -50) this.verticalVelocity = -50;
        } else {
            this.verticalVelocity = -0.1; // Pegamento al suelo
        }

        this.player.position.y += this.verticalVelocity * dt;

        // 2.1 Raycasting de Suelo (Afinado)
        const rayHeight = 3.0;
        const rayOrigin = this.player.position.clone();
        rayOrigin.y += rayHeight;
        this.raycaster.set(rayOrigin, this.downVector);

        if (this.playerGroundOffset === undefined) this.playerGroundOffset = 0.05;

        const intersects = this.raycaster.intersectObjects(this.colliders, true);
        if (intersects.length > 0) {
            const groundY = intersects[0].point.y + this.playerGroundOffset;

            // Detección de colisión (margen generoso para evitar atravesar)
            if (this.player.position.y <= groundY + 0.2) {
                this.player.position.y = groundY;
                this.verticalVelocity = 0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }
        } else {
            this.isGrounded = false;
        }

        // 2.2 Rescate de Emergencia (Si el raycast falla por completo)
        if (this.player.position.y < -100) {
            console.warn("¡Rescate activado! Cayendo al vacío.");
            this.player.position.set(0, 20, 0);
            this.verticalVelocity = 0;
            this.isGrounded = false;
        }

        // 3. Cámara
        const camPos = this.player.position.clone();
        camPos.y += 1.8;
        this.camera.position.copy(camPos);
        this.camera.quaternion.copy(this.player.quaternion);
        this.camera.rotateX(this.pitch);
    }
}
