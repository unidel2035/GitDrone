// Game state
const game = {
    canvas: null,
    ctx: null,
    drones: [],
    bullets: [],
    score: 0,
    hits: 0,
    misses: 0,
    isRunning: false,
    isPaused: false,
    lastDroneSpawn: 0,
    droneSpawnInterval: 2000,
    animationId: null
};

// Drone class
class Drone {
    constructor(y) {
        this.x = -50;
        this.y = y;
        this.width = 60;
        this.height = 40;
        this.speed = 2 + Math.random() * 2;
        this.health = 1;
        this.type = Math.floor(Math.random() * 3);
        this.rotation = 0;
        this.rotationSpeed = 0.02;
    }

    update() {
        this.x += this.speed;
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(Math.sin(this.rotation) * 0.1);

        // Draw drone body
        ctx.fillStyle = this.type === 0 ? '#3498db' : this.type === 1 ? '#e74c3c' : '#2ecc71';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Draw propellers
        const propellers = [
            [-20, -15], [20, -15], [-20, 15], [20, 15]
        ];

        propellers.forEach(([px, py]) => {
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(this.rotation * 10);
            ctx.fillStyle = '#34495e';
            ctx.fillRect(-8, -2, 16, 4);
            ctx.restore();
        });

        // Draw center
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw camera
        ctx.fillStyle = '#1a252f';
        ctx.beginPath();
        ctx.arc(0, 10, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isOffScreen() {
        return this.x > game.canvas.width;
    }

    isHit(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
}

// Bullet class
class Bullet {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        const angle = Math.atan2(targetY - y, targetX - x);
        this.dx = Math.cos(angle) * 10;
        this.dy = Math.sin(angle) * 10;
        this.radius = 3;
        this.life = 100;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;
    }

    draw(ctx) {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Trail effect
        ctx.fillStyle = 'rgba(243, 156, 18, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - this.dx * 0.5, this.y - this.dy * 0.5, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    isOffScreen() {
        return this.life <= 0 || this.x < 0 || this.x > game.canvas.width ||
               this.y < 0 || this.y > game.canvas.height;
    }
}

// Explosion effect
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * (2 + Math.random() * 3),
                dy: Math.sin(angle) * (2 + Math.random() * 3),
                life: 30,
                size: 3 + Math.random() * 3
            });
        }
    }

    update() {
        this.particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.dy += 0.2;
            p.life--;
            p.size *= 0.95;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, ${p.life / 30})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    isDone() {
        return this.particles.length === 0;
    }
}

// Initialize game
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    game.explosions = [];

    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse click handler
    game.canvas.addEventListener('click', handleShoot);

    // Button handlers
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
}

function resizeCanvas() {
    game.canvas.width = Math.min(800, window.innerWidth - 40);
    game.canvas.height = 500;
}

function handleShoot(event) {
    if (!game.isRunning || game.isPaused) return;

    const rect = game.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Create bullet from bottom center
    const bullet = new Bullet(game.canvas.width / 2, game.canvas.height - 20, x, y);
    game.bullets.push(bullet);

    // Check if we hit a drone
    let hit = false;
    game.drones.forEach((drone, index) => {
        if (drone.isHit(x, y)) {
            hit = true;
            game.drones.splice(index, 1);
            game.score += 10;
            game.hits++;
            game.explosions.push(new Explosion(drone.x + drone.width / 2, drone.y + drone.height / 2));
        }
    });

    if (!hit) {
        game.misses++;
    }

    updateStats();
}

function spawnDrone() {
    const y = 50 + Math.random() * (game.canvas.height - 150);
    game.drones.push(new Drone(y));
}

function startGame() {
    if (!game.isRunning) {
        game.isRunning = true;
        game.isPaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        game.lastDroneSpawn = Date.now();
        gameLoop();
    }
}

function togglePause() {
    game.isPaused = !game.isPaused;
    document.getElementById('pauseBtn').textContent = game.isPaused ? 'Resume' : 'Pause';
    if (!game.isPaused) {
        gameLoop();
    }
}

function resetGame() {
    cancelAnimationFrame(game.animationId);
    game.drones = [];
    game.bullets = [];
    game.explosions = [];
    game.score = 0;
    game.hits = 0;
    game.misses = 0;
    game.isRunning = false;
    game.isPaused = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pause';
    updateStats();
    draw();
}

function updateStats() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('hits').textContent = game.hits;
    document.getElementById('misses').textContent = game.misses;

    const totalShots = game.hits + game.misses;
    const accuracy = totalShots > 0 ? Math.round((game.hits / totalShots) * 100) : 0;
    document.getElementById('accuracy').textContent = accuracy + '%';
}

function update() {
    // Spawn drones
    const now = Date.now();
    if (now - game.lastDroneSpawn > game.droneSpawnInterval) {
        spawnDrone();
        game.lastDroneSpawn = now;
        // Gradually increase difficulty
        game.droneSpawnInterval = Math.max(800, game.droneSpawnInterval - 10);
    }

    // Update drones
    game.drones.forEach((drone, index) => {
        drone.update();
        if (drone.isOffScreen()) {
            game.drones.splice(index, 1);
        }
    });

    // Update bullets
    game.bullets.forEach((bullet, bulletIndex) => {
        bullet.update();
        if (bullet.isOffScreen()) {
            game.bullets.splice(bulletIndex, 1);
            return;
        }

        // Check bullet-drone collision
        game.drones.forEach((drone, droneIndex) => {
            const dist = Math.hypot(bullet.x - (drone.x + drone.width / 2),
                                   bullet.y - (drone.y + drone.height / 2));
            if (dist < 30) {
                game.bullets.splice(bulletIndex, 1);
                game.drones.splice(droneIndex, 1);
                game.score += 10;
                game.explosions.push(new Explosion(drone.x + drone.width / 2, drone.y + drone.height / 2));
            }
        });
    });

    // Update explosions
    game.explosions.forEach((explosion, index) => {
        explosion.update();
        if (explosion.isDone()) {
            game.explosions.splice(index, 1);
        }
    });

    updateStats();
}

function draw() {
    // Clear canvas
    game.ctx.fillStyle = '#1a1a2e';
    game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

    // Draw grid background
    game.ctx.strokeStyle = 'rgba(52, 152, 219, 0.1)';
    game.ctx.lineWidth = 1;
    for (let i = 0; i < game.canvas.width; i += 40) {
        game.ctx.beginPath();
        game.ctx.moveTo(i, 0);
        game.ctx.lineTo(i, game.canvas.height);
        game.ctx.stroke();
    }
    for (let i = 0; i < game.canvas.height; i += 40) {
        game.ctx.beginPath();
        game.ctx.moveTo(0, i);
        game.ctx.lineTo(game.canvas.width, i);
        game.ctx.stroke();
    }

    // Draw drones
    game.drones.forEach(drone => drone.draw(game.ctx));

    // Draw bullets
    game.bullets.forEach(bullet => bullet.draw(game.ctx));

    // Draw explosions
    game.explosions.forEach(explosion => explosion.draw(game.ctx));

    // Draw turret at bottom
    game.ctx.fillStyle = '#95a5a6';
    game.ctx.beginPath();
    game.ctx.arc(game.canvas.width / 2, game.canvas.height - 20, 15, 0, Math.PI * 2);
    game.ctx.fill();
    game.ctx.fillStyle = '#7f8c8d';
    game.ctx.fillRect(game.canvas.width / 2 - 5, game.canvas.height - 35, 10, 20);

    // Draw pause overlay
    if (game.isPaused) {
        game.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
        game.ctx.fillStyle = '#fff';
        game.ctx.font = '48px Arial';
        game.ctx.textAlign = 'center';
        game.ctx.fillText('PAUSED', game.canvas.width / 2, game.canvas.height / 2);
    }

    // Draw start message
    if (!game.isRunning) {
        game.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
        game.ctx.fillStyle = '#fff';
        game.ctx.font = '36px Arial';
        game.ctx.textAlign = 'center';
        game.ctx.fillText('Click START to begin!', game.canvas.width / 2, game.canvas.height / 2);
    }
}

function gameLoop() {
    if (!game.isRunning || game.isPaused) return;

    update();
    draw();

    game.animationId = requestAnimationFrame(gameLoop);
}

// Start when page loads
window.addEventListener('load', () => {
    init();
    draw();
});
