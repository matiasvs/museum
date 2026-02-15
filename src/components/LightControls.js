import '../styles/controls.css';
import * as THREE from 'three';

export class LightControls {
    constructor(container = document.body, onUpdate) {
        this.container = container;
        this.onUpdate = onUpdate;

        // Estado inicial
        this.state = {
            timeOfDay: 12, // 0-24 horas
            orientation: 90 // 0-360 grados
        };

        this.initDOM();
        this.attachEvents();
    }

    initDOM() {
        // Crear contenedor principal
        this.domElement = document.createElement('div');
        this.domElement.id = 'light-controls-container';

        this.domElement.innerHTML = `
            <!-- Time of Day Control -->
            <div class="control-group">
                <div class="label-row">
                    <span>TIME OF DAY (24H)</span>
                </div>
                <input type="range" id="time-slider" min="0" max="24" step="0.1" value="12">
                <div class="ticks">
                    <span>0h</span>
                    <span>6h</span>
                    <span>12h</span>
                    <span>18h</span>
                    <span>24h</span>
                </div>
            </div>

            <!-- Orientation Y Control (Azimuth) -->
            <div class="control-group">
                <div class="label-row">
                    <span>ORIENTATION Y (Horizon)</span>
                    <span style="font-size: 16px;">↻</span>
                </div>
                <input type="range" id="orientation-slider" min="0" max="360" step="1" value="90">
                <div class="ticks">
                    <span>0°</span>
                    <span>180°</span>
                    <span>360°</span>
                </div>
            </div>

            <!-- Orientation X Control -->
            <div class="control-group">
                <div class="label-row">
                    <span>ORIENTATION X</span>
                    <span style="font-size: 16px;">⟲</span>
                </div>
                <input type="range" id="orientation-x-slider" min="0" max="360" step="1" value="0">
                <div class="ticks">
                    <span>0°</span>
                    <span>180°</span>
                    <span>360°</span>
                </div>
            </div>
        `;

        this.container.appendChild(this.domElement);

        this.timeSlider = this.domElement.querySelector('#time-slider');
        this.orientationSlider = this.domElement.querySelector('#orientation-slider');
        this.orientationXSlider = this.domElement.querySelector('#orientation-x-slider');
    }

    attachEvents() {
        this.timeSlider.addEventListener('input', (e) => {
            this.state.timeOfDay = parseFloat(e.target.value);
            this.update();
        });

        this.orientationSlider.addEventListener('input', (e) => {
            this.state.orientation = parseFloat(e.target.value);
            this.update();
        });

        this.orientationXSlider.addEventListener('input', (e) => {
            this.state.orientationX = parseFloat(e.target.value);
            this.update();
        });
    }

    // Calcula la posición del sol basado en la hora y orientación
    update() {
        const hour = this.state.timeOfDay;
        let elevation = 0;

        // Ciclo de 24 horas:
        // 0h = -90° (Medianoche)
        // 6h = 0° (Amanecer)
        // 12h = 90° (Mediodía)
        // 18h = 0° (Atardecer)
        // 24h = -90° (Medianoche)

        if (hour < 6) {
            elevation = THREE.MathUtils.mapLinear(hour, 0, 6, -90, 0);
        } else if (hour <= 12) {
            elevation = THREE.MathUtils.mapLinear(hour, 6, 12, 0, 90);
        } else if (hour <= 18) {
            elevation = THREE.MathUtils.mapLinear(hour, 12, 18, 90, 0);
        } else {
            elevation = THREE.MathUtils.mapLinear(hour, 18, 24, 0, -90);
        }

        const isNight = elevation < -5;

        if (this.onUpdate) {
            this.onUpdate({
                elevation: elevation,
                azimuth: this.state.orientation,
                orientationX: this.state.orientationX || 0,
                intensity: isNight ? 0 : this.calculateIntensity(elevation),
                temperature: this.calculateTemperature(hour)
            });
        }
    }

    calculateIntensity(elevation) {
        // Intensidad máxima al mediodía, baja al amanecer/atardecer
        return THREE.MathUtils.mapLinear(elevation, 0, 90, 0.2, 1.5);
    }

    calculateTemperature(hour) {
        // Esto podría devolver un color hexadecimal para tintar la luz
        // Por ahora lo dejamos simple
        return 0xffffff;
    }
}


