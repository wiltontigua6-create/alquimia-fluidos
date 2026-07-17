// ============================================
// LABORATORY OF ALCHEMY - FLUID PHYSICS SIMULATOR
// ============================================

const canvas = document.getElementById('fluidCanvas');
const ctx = canvas.getContext('2d');

// Canvas Setup
function resizeCanvas() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================
// PARTICLE SYSTEM & FLUID SIMULATION
// ============================================

class Particle {
    constructor(x, y, element) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.element = element;
        this.life = 255;
        this.mass = ELEMENT_CONFIG[element].mass;
        this.density = ELEMENT_CONFIG[element].density;
        this.size = ELEMENT_CONFIG[element].size;
    }

    update() {
        // Gravity
        this.vy += 0.1 * (simulator.speedFactor) * (this.density / 5);
        
        // Viscosity
        this.vx *= (1 - simulator.viscosity * 0.02);
        this.vy *= (1 - simulator.viscosity * 0.02);

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Decay
        this.life -= 1;

        // Bounce off walls
        if (this.x < 0 || this.x > canvas.clientWidth) {
            this.vx *= -0.8;
            this.x = Math.max(0, Math.min(canvas.clientWidth, this.x));
        }
        if (this.y < 0 || this.y > canvas.clientHeight) {
            this.vy *= -0.8;
            this.y = Math.max(0, Math.min(canvas.clientHeight, this.y));
        }
    }

    draw() {
        ctx.fillStyle = `rgba(${ELEMENT_CONFIG[this.element].color.join(',')}, ${(this.life / 255) * 0.7})`;
        ctx.shadowColor = `rgba(${ELEMENT_CONFIG[this.element].glowColor.join(',')}, ${(this.life / 255) * 0.5})`;
        ctx.shadowBlur = this.size * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class WaveSystem {
    constructor() {
        this.waves = [];
    }

    addWave(x, y, intensity = 1) {
        this.waves.push({
            x, y,
            radius: 0,
            maxRadius: 150,
            intensity,
            life: 1
        });
    }

    update() {
        this.waves = this.waves.filter(wave => {
            wave.radius += 4 * simulator.speedFactor;
            wave.life = Math.max(0, wave.life - 0.02);
            return wave.life > 0;
        });
    }

    draw() {
        this.waves.forEach(wave => {
            ctx.strokeStyle = `rgba(0, 255, 200, ${wave.life * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Additional rings
            ctx.strokeStyle = `rgba(100, 200, 255, ${wave.life * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
}

// Element Configuration
const ELEMENT_CONFIG = {
    hydrogen: {
        color: [255, 100, 200],
        glowColor: [255, 150, 200],
        mass: 0.08,
        density: 0.08,
        size: 3,
        viscosity: 0.3,
        particle_count: 30
    },
    oxygen: {
        color: [100, 200, 255],
        glowColor: [150, 220, 255],
        mass: 1.43,
        density: 1.43,
        size: 4,
        viscosity: 0.5,
        particle_count: 25
    },
    mercury: {
        color: [200, 200, 200],
        glowColor: [230, 230, 230],
        mass: 13.6,
        density: 13.6,
        size: 5,
        viscosity: 0.8,
        particle_count: 15
    },
    oil: {
        color: [255, 200, 0],
        glowColor: [255, 230, 100],
        mass: 0.92,
        density: 0.92,
        size: 4,
        viscosity: 1.2,
        particle_count: 20
    },
    water: {
        color: [0, 255, 200],
        glowColor: [100, 255, 220],
        mass: 1.0,
        density: 1.0,
        size: 4,
        viscosity: 0.6,
        particle_count: 25
    },
    plasma: {
        color: [255, 0, 255],
        glowColor: [255, 100, 255],
        mass: 0.01,
        density: 0.01,
        size: 3,
        viscosity: 0.1,
        particle_count: 40
    }
};

// Main Simulator Object
const simulator = {
    particles: [],
    waveSystem: new WaveSystem(),
    viscosity: 1.0,
    speedFactor: 1.0,
    isPaused: false,
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false,
    temperature: 20,
    totalEnergy: 0,

    init() {
        this.addBackgroundParticles();
        this.setupEventListeners();
        this.animate();
    },

    addBackgroundParticles() {
        const count = 50;
        for (let i = 0; i < count; i++) {
            const element = Object.keys(ELEMENT_CONFIG)[Math.floor(Math.random() * 3)];
            const x = Math.random() * canvas.clientWidth;
            const y = Math.random() * canvas.clientHeight;
            this.particles.push(new Particle(x, y, element));
        }
    },

    addParticles(x, y, element, count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const particle = new Particle(x, y, element);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            this.particles.push(particle);
        }
        this.waveSystem.addWave(x, y, 1);
    },

    setupEventListeners() {
        // Mouse movement for waves
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;

            if (this.isMouseDown) {
                this.waveSystem.addWave(this.mouseX, this.mouseY, 0.5);
            }
        });

        canvas.addEventListener('mousedown', () => {
            this.isMouseDown = true;
        });

        canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
        });

        // Touch support
        canvas.addEventListener('touchmove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
            this.waveSystem.addWave(this.mouseX, this.mouseY, 0.5);
        });

        // Element dragging
        this.setupDragAndDrop();

        // Controls
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());

        document.getElementById('viscositySlider').addEventListener('input', (e) => {
            this.viscosity = parseFloat(e.target.value);
            document.getElementById('viscosityValue').textContent = e.target.value;
        });

        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.speedFactor = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = e.target.value;
        });
    },

    setupDragAndDrop() {
        const elementCards = document.querySelectorAll('.element-card');
        
        elementCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('element', card.dataset.element);
            });
        });

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const element = e.dataTransfer.getData('element');
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const count = ELEMENT_CONFIG[element].particle_count;
            this.addParticles(x, y, element, count);
            this.updateTemperature();
        });
    },

    clear() {
        this.particles = [];
        this.waveSystem.waves = [];
        this.temperature = 20;
    },

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.isPaused ? '▶ Reanudar' : '⏸ Pausar';
    },

    updateStats() {
        document.getElementById('particleCount').textContent = this.particles.length;
        
        this.totalEnergy = this.particles.reduce((sum, p) => {
            const speed = Math.sqrt(p.vx ** 2 + p.vy ** 2);
            return sum + speed;
        }, 0);

        const energyPercent = Math.min(100, Math.round((this.totalEnergy / 500) * 100));
        document.getElementById('energy').textContent = energyPercent + '%';
        document.getElementById('temperature').textContent = Math.round(this.temperature) + '°C';
    },

    updateTemperature() {
        this.temperature = Math.min(100, 20 + (this.totalEnergy / 100));
    },

    update() {
        if (this.isPaused) return;

        // Update particles
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());

        // Update waves
        this.waveSystem.update();

        // Particle interactions (oil separates from water)
        this.handleParticleInteractions();

        this.updateTemperature();
    },

    handleParticleInteractions() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 30) {
                    // Oil and water repulsion
                    if ((p1.element === 'oil' && p2.element === 'water') ||
                        (p1.element === 'water' && p2.element === 'oil')) {
                        const angle = Math.atan2(dy, dx);
                        const repulsion = 1.5;
                        p1.vx -= Math.cos(angle) * repulsion;
                        p1.vy -= Math.sin(angle) * repulsion;
                        p2.vx += Math.cos(angle) * repulsion;
                        p2.vy += Math.sin(angle) * repulsion;
                    }

                    // Plasma attraction
                    if (p1.element === 'plasma' || p2.element === 'plasma') {
                        const strongerParticle = p1.element === 'plasma' ? p1 : p2;
                        const weakerParticle = p1.element === 'plasma' ? p2 : p1;
                        
                        if (dist < 15) {
                            const angle = Math.atan2(dy, dx);
                            weakerParticle.vx += Math.cos(angle) * 0.3;
                            weakerParticle.vy += Math.sin(angle) * 0.3;
                        }
                    }
                }
            }
        }
    },

    draw() {
        // Clear with fade effect
        ctx.fillStyle = 'rgba(10, 14, 39, 0.1)';
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        // Draw background gradient
        const gradient = ctx.createRadialGradient(
            simulator.mouseX, simulator.mouseY, 0,
            simulator.mouseX, simulator.mouseY, 400
        );
        gradient.addColorStop(0, 'rgba(0, 255, 200, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        // Draw waves
        this.waveSystem.draw();

        // Draw particles
        this.particles.forEach(p => p.draw());

        // Draw stats
        this.updateStats();
    },

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
};

// Start the simulation
simulator.init();

// ============================================
// ADDITIONAL FEATURES
// ============================================

// Tooltip functionality
const tooltip = document.getElementById('tooltip');
document.querySelectorAll('.element-card').forEach(card => {
    card.addEventListener('mouseenter', (e) => {
        const element = card.dataset.element;
        const config = ELEMENT_CONFIG[element];
        tooltip.textContent = `${card.querySelector('h3').textContent} - Densidad: ${config.density}`;
        tooltip.style.display = 'block';
    });

    card.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.pageX + 10) + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
    });

    card.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'c' || e.key === 'C') {
        simulator.clear();
    }
    if (e.key === ' ') {
        e.preventDefault();
        simulator.togglePause();
    }
});

// Auto-generate some ambient particles
setInterval(() => {
    if (!simulator.isPaused && simulator.particles.length < 100) {
        const element = Object.keys(ELEMENT_CONFIG)[Math.floor(Math.random() * 4)];
        const x = Math.random() * canvas.clientWidth;
        const y = Math.random() * canvas.clientHeight;
        simulator.addParticles(x, y, element, 1);
    }
}, 500);

console.log('🧪 Laboratorio de Alquimia iniciado. ¡Bienvenido, Alquimista!');