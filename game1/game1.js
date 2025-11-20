// ==================== 遊戲配置 ====================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_RADIUS: 15,
    PLAYER_SPEED: 3,
    ENEMY_RADIUS: 15,
    ENEMY_SPEED: 2.5,
    ENEMY_CHASE_SPEED: 4,
    ENEMY_VISION_RANGE: 200,
    INITIAL_LIVES: 3,
    INVINCIBLE_TIME: 2000, // 2 秒無敵
    HIT_MESSAGE_TIME: 1500, // 被抓訊息顯示時間
    PLAYER_COLOR: '#a0c5db',
    ENEMY_COLOR: '#c34e17',
    ENEMY_CHASE_COLOR: '#c34e17',
    WALL_COLOR: '#d0d4d0',
    FLOOR_COLOR: '#2e3933'
};

// ==================== 地圖定義 ====================
// 牆體定義 {x, y, width, height}
const WALLS = [
    // 外牆
    {x: 0, y: 0, width: 800, height: 20},
    {x: 0, y: 580, width: 800, height: 20},
    {x: 0, y: 0, width: 20, height: 600},
    {x: 780, y: 0, width: 20, height: 600},

    // 內部障礙物 - 創造迷宮效果
    {x: 100, y: 100, width: 150, height: 20},
    {x: 100, y: 100, width: 20, height: 150},

    {x: 300, y: 200, width: 20, height: 200},
    {x: 300, y: 380, width: 200, height: 20},

    {x: 550, y: 100, width: 150, height: 20},
    {x: 680, y: 100, width: 20, height: 200},

    {x: 400, y: 50, width: 20, height: 100},

    {x: 150, y: 300, width: 100, height: 20},

    {x: 500, y: 450, width: 200, height: 20},
    {x: 500, y: 300, width: 20, height: 150},

    {x: 100, y: 480, width: 150, height: 20}
];

const PLAYER_START = {x: 60, y: 60};
const ENEMY_START = {x: 740, y: 540};

// ==================== 工具函數 ====================

// 圓形與矩形碰撞檢測
function circleRectCollision(cx, cy, radius, rect) {
    let testX = cx;
    let testY = cy;

    if (cx < rect.x) testX = rect.x;
    else if (cx > rect.x + rect.width) testX = rect.x + rect.width;

    if (cy < rect.y) testY = rect.y;
    else if (cy > rect.y + rect.height) testY = rect.y + rect.height;

    const distX = cx - testX;
    const distY = cy - testY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    return distance <= radius;
}

// 圓形與圓形碰撞檢測
function circleCircleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= r1 + r2;
}

// 射線與矩形相交檢測 (用於視線檢測)
function lineRectIntersection(x1, y1, x2, y2, rect) {
    // 使用 Liang-Barsky 演算法
    const dx = x2 - x1;
    const dy = y2 - y1;

    let t0 = 0, t1 = 1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - rect.x, rect.x + rect.width - x1, y1 - rect.y, rect.y + rect.height - y1];

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return true;
        } else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                if (t > t1) return false;
                if (t > t0) t0 = t;
            } else {
                if (t < t0) return false;
                if (t < t1) t1 = t;
            }
        }
    }

    return true;
}

// 檢查兩點之間是否有牆阻擋 (視線檢測)
function hasLineOfSight(x1, y1, x2, y2) {
    for (let wall of WALLS) {
        if (lineRectIntersection(x1, y1, x2, y2, wall)) {
            return false;
        }
    }
    return true;
}

// ==================== Player 類別 ====================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.PLAYER_RADIUS;
        this.speed = CONFIG.PLAYER_SPEED;
        this.lives = CONFIG.INITIAL_LIVES;
        this.invincible = false;
        this.invincibleTimer = 0;

        // 移動目標 (for mouse/touch)
        this.targetX = null;
        this.targetY = null;

        // 鍵盤控制
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };
    }

    update() {
        let dx = 0;
        let dy = 0;

        // 鍵盤控制
        if (this.keys.up) dy -= 1;
        if (this.keys.down) dy += 1;
        if (this.keys.left) dx -= 1;
        if (this.keys.right) dx += 1;

        // 滑鼠/觸控控制
        if (this.targetX !== null && this.targetY !== null) {
            const distX = this.targetX - this.x;
            const distY = this.targetY - this.y;
            const distance = Math.sqrt(distX * distX + distY * distY);

            if (distance > 5) { // 避免抖動
                dx = distX / distance;
                dy = distY / distance;
            }
        }

        // 正規化對角線移動
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // 計算新位置
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;

        // 碰撞檢測
        if (!this.checkCollision(newX, this.y)) {
            this.x = newX;
        }
        if (!this.checkCollision(this.x, newY)) {
            this.y = newY;
        }

        // 更新無敵狀態
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
    }

    checkCollision(x, y) {
        for (let wall of WALLS) {
            if (circleRectCollision(x, y, this.radius, wall)) {
                return true;
            }
        }
        return false;
    }

    hit() {
        if (!this.invincible) {
            this.lives--;
            this.invincible = true;
            this.invincibleTimer = CONFIG.INVINCIBLE_TIME / (1000 / 60); // 轉換為幀數
            this.respawn();
            return true;
        }
        return false;
    }

    respawn() {
        this.x = PLAYER_START.x;
        this.y = PLAYER_START.y;
    }

    draw(ctx) {
        // 閃爍效果 (無敵時)
        if (this.invincible && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
            return;
        }

        ctx.fillStyle = CONFIG.PLAYER_COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 繪製眼睛
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== Enemy 類別 ====================
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.ENEMY_RADIUS;
        this.baseSpeed = CONFIG.ENEMY_SPEED; // 記錄初始速度
        this.speed = CONFIG.ENEMY_SPEED;
        this.isChasing = false;

        // 速度提升機制
        this.lastCatchTime = Date.now();
        this.speedBoostTimer = 0; // 用於追蹤沒抓到人的時間
        this.maxSpeedMultiplier = 3.0; // 最大速度倍率（300%）

        // 隨機移動
        this.direction = Math.random() * Math.PI * 2;
        this.changeDirectionTimer = 0;
        this.changeDirectionInterval = 60; // 每 60 幀改變方向
    }

    updateSpeedBoost() {
        // 計算自上次抓到人後經過的時間（秒）
        const timeSinceLastCatch = (Date.now() - this.lastCatchTime) / 1000;

        // 每20秒增加10%速度（0.1倍率）
        const boostIntervals = Math.floor(timeSinceLastCatch / 5);
        const speedMultiplier = Math.min(1.0 + (boostIntervals * 0.2), this.maxSpeedMultiplier);

        // 更新當前速度
        this.speed = this.baseSpeed * speedMultiplier;

        return speedMultiplier;
    }

    resetSpeedBoost() {
        // 重置速度提升機制
        this.lastCatchTime = Date.now();
        this.speed = this.baseSpeed;
    }

    update(player) {
        // 更新速度提升
        this.updateSpeedBoost();

        // 檢查是否看到玩家
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.isChasing = false;

        if (distance <= CONFIG.ENEMY_VISION_RANGE) {
            if (hasLineOfSight(this.x, this.y, player.x, player.y)) {
                this.isChasing = true;
            }
        }

        let moveX, moveY;

        if (this.isChasing) {
            // 追擊模式 - 直接朝玩家移動，套用速度倍率
            const chaseSpeed = CONFIG.ENEMY_CHASE_SPEED * (this.speed / this.baseSpeed);
            moveX = (dx / distance) * chaseSpeed;
            moveY = (dy / distance) * chaseSpeed;
        } else {
            // 巡邏模式 - 隨機移動
            this.changeDirectionTimer++;
            if (this.changeDirectionTimer >= this.changeDirectionInterval) {
                this.direction = Math.random() * Math.PI * 2;
                this.changeDirectionTimer = 0;
            }

            moveX = Math.cos(this.direction) * this.speed;
            moveY = Math.sin(this.direction) * this.speed;
        }

        // 計算新位置並檢查碰撞
        const newX = this.x + moveX;
        const newY = this.y + moveY;

        if (!this.checkCollision(newX, this.y)) {
            this.x = newX;
        } else {
            // 碰牆改變方向
            this.direction = Math.random() * Math.PI * 2;
        }

        if (!this.checkCollision(this.x, newY)) {
            this.y = newY;
        } else {
            // 碰牆改變方向
            this.direction = Math.random() * Math.PI * 2;
        }
    }

    checkCollision(x, y) {
        for (let wall of WALLS) {
            if (circleRectCollision(x, y, this.radius, wall)) {
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        ctx.fillStyle = this.isChasing ? CONFIG.ENEMY_CHASE_COLOR : CONFIG.ENEMY_COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 繪製憤怒的眼睛
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // 繪製手持文件（保單）
        const docX = this.x + 12;
        const docY = this.y - 8;
        const docWidth = 10;
        const docHeight = 14;

        // 文件背景（白色紙張）
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(docX, docY, docWidth, docHeight);

        // 文件邊框
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(docX, docY, docWidth, docHeight);

        // 文件上的文字線條
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(docX + 2, docY + 3);
        ctx.lineTo(docX + docWidth - 2, docY + 3);
        ctx.moveTo(docX + 2, docY + 6);
        ctx.lineTo(docX + docWidth - 2, docY + 6);
        ctx.moveTo(docX + 2, docY + 9);
        ctx.lineTo(docX + docWidth - 2, docY + 9);
        ctx.stroke();

        // 追擊時繪製視線
        if (this.isChasing) {
            ctx.strokeStyle = 'rgba(195, 78, 23, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(game.player.x, game.player.y);
            ctx.stroke();
        }
    }
}

// ==================== Game 類別 ====================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(PLAYER_START.x, PLAYER_START.y);
        this.enemy = new Enemy(ENEMY_START.x, ENEMY_START.y);
        this.gameOver = false;
        this.gameStarted = false;
        this.startTime = Date.now();
        this.elapsedTime = 0;

        this.setupInput();
        this.updateUI();
    }

    setupInput() {
        // 鍵盤控制
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.player.keys.up = true;
                e.preventDefault();
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.player.keys.down = true;
                e.preventDefault();
            }
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.player.keys.left = true;
                e.preventDefault();
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.player.keys.right = true;
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.player.keys.up = false;
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.player.keys.down = false;
            }
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.player.keys.left = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.player.keys.right = false;
            }
        });

        // 滑鼠控制
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.player.targetX = (e.clientX - rect.left) * scaleX;
            this.player.targetY = (e.clientY - rect.top) * scaleY;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.player.targetX = null;
            this.player.targetY = null;
        });

        // 觸控控制
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const touch = e.touches[0];
            this.player.targetX = (touch.clientX - rect.left) * scaleX;
            this.player.targetY = (touch.clientY - rect.top) * scaleY;
        }, {passive: false});

        this.canvas.addEventListener('touchend', () => {
            this.player.targetX = null;
            this.player.targetY = null;
        });

        // 重新開始按鈕
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });

        // 勝利畫面重新開始按鈕
        document.getElementById('winRestartBtn').addEventListener('click', () => {
            this.restart();
        });

        // 回首頁按鈕 (遊戲結束)
        document.getElementById('homeBtn').addEventListener('click', () => {
            window.location.href = '../index.html';
        });

        // 回首頁按鈕 (勝利)
        document.getElementById('winHomeBtn').addEventListener('click', () => {
            window.location.href = '../index.html';
        });

        // 開始遊戲按鈕
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
    }

    update() {
        if (this.gameOver || !this.gameStarted) return;

        this.player.update();
        this.enemy.update(this.player);

        // 檢查碰撞
        if (circleCircleCollision(
            this.player.x, this.player.y, this.player.radius,
            this.enemy.x, this.enemy.y, this.enemy.radius
        )) {
            if (this.player.hit()) {
                // 重置保險員的速度提升
                this.enemy.resetSpeedBoost();

                // 顯示被抓訊息
                this.showHitMessage();

                if (this.player.lives <= 0) {
                    this.endGame();
                }
            }
        }

        // 更新計時器
        this.elapsedTime = (Date.now() - this.startTime) / 1000;

        // 檢查是否達到勝利條件（5分鐘 = 300秒）
        if (this.elapsedTime >= 300) {
            this.winGame();
        }

        this.updateUI();
    }

    draw() {
        // 清空畫面
        this.ctx.fillStyle = CONFIG.FLOOR_COLOR;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 繪製牆體
        this.ctx.fillStyle = CONFIG.WALL_COLOR;
        for (let wall of WALLS) {
            this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }

        // 繪製角色
        this.enemy.draw(this.ctx);
        this.player.draw(this.ctx);
    }

    updateUI() {
        // 更新金錢（生命）
        const livesCount = document.getElementById('livesCount');
        livesCount.innerHTML = '';
        for (let i = 0; i < this.player.lives; i++) {
            livesCount.innerHTML += '<span class="money">💰</span>';
        }

        // 更新計時器
        document.getElementById('timeCount').textContent = this.elapsedTime.toFixed(1);
    }

    showHitMessage() {
        const hitMessage = document.getElementById('hitMessage');
        hitMessage.classList.add('show');

        // 1.5秒後隱藏訊息
        setTimeout(() => {
            hitMessage.classList.remove('show');
        }, CONFIG.HIT_MESSAGE_TIME);
    }

    startGame() {
        document.getElementById('startScreen').classList.add('hide');
        this.gameStarted = true;
        this.startTime = Date.now();
    }

    endGame() {
        this.gameOver = true;
        document.getElementById('finalTime').textContent = this.elapsedTime.toFixed(1);
        document.getElementById('gameOver').classList.add('show');
    }

    winGame() {
        this.gameOver = true;
        document.getElementById('winTime').textContent = this.elapsedTime.toFixed(1);
        document.getElementById('winScreen').classList.add('show');
    }

    restart() {
        document.getElementById('gameOver').classList.remove('show');
        document.getElementById('winScreen').classList.remove('show');
        document.getElementById('hitMessage').classList.remove('show');
        this.player = new Player(PLAYER_START.x, PLAYER_START.y);
        this.enemy = new Enemy(ENEMY_START.x, ENEMY_START.y);
        this.gameOver = false;
        this.gameStarted = true;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.updateUI();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.gameLoop();
    }
}

// ==================== 初始化遊戲 ====================
let game;
window.addEventListener('load', () => {
    game = new Game();
    game.start(); // 啟動遊戲循環（但不開始遊戲，等待玩家點擊開始按鈕）
});
