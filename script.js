new file mode 100644
index 0000000000000000000000000000000000000000..f2367e88222c94a67f87f40755240928f67a8fcc
--- /dev/null
+++ b/script.js
@@ -0,0 +1,614 @@
+const canvas = document.getElementById("game");
+const context = canvas.getContext("2d");
+const scoreLabel = document.getElementById("score");
+const bestLabel = document.getElementById("best-score");
+const coinsLabel = document.getElementById("coins");
+const overlay = document.getElementById("overlay");
+const title = document.getElementById("title");
+const subtitle = document.getElementById("subtitle");
+const easterEgg = document.getElementById("easter-egg");
+const toast = document.getElementById("toast");
+const shop = document.getElementById("shop");
+const shopContent = document.getElementById("shop-content");
+const shopTabs = document.querySelectorAll(".shop-tabs button");
+const openShopButton = document.getElementById("open-shop");
+const openShopOverlayButton = document.getElementById("open-shop-overlay");
+const closeShopButton = document.getElementById("close-shop");
+const startGameButton = document.getElementById("start-game");
+
+const STORAGE_KEY = "flappy-bird-skins";
+
+const SKINS = {
+  bird: [
+    {
+      id: "classic",
+      name: "Classic",
+      type: "normal",
+      cost: 0,
+      colors: {
+        body: "#ffd34d",
+        wing: "#f2b544",
+        beak: "#ff5f4c",
+      },
+    },
+    {
+      id: "sky",
+      name: "Sky Fade",
+      type: "normal",
+      cost: 25,
+      colors: {
+        body: "#7dc5ff",
+        wing: "#4aa4ff",
+        beak: "#ff7f5a",
+      },
+    },
+    {
+      id: "lava",
+      name: "Lava Pop",
+      type: "normal",
+      cost: 55,
+      colors: {
+        body: "#ff6b6b",
+        wing: "#ffb347",
+        beak: "#6f1d1b",
+      },
+    },
+    {
+      id: "neon",
+      name: "Neon Rider",
+      type: "unique",
+      cost: 120,
+      texture: "neon",
+    },
+  ],
+  pipes: [
+    {
+      id: "classic",
+      name: "Classic",
+      type: "normal",
+      cost: 0,
+      colors: {
+        body: "#43c23b",
+        rim: "#69dc5c",
+      },
+    },
+    {
+      id: "mint",
+      name: "Mint",
+      type: "normal",
+      cost: 35,
+      colors: {
+        body: "#31cbb3",
+        rim: "#6ee8d5",
+      },
+    },
+    {
+      id: "sunset",
+      name: "Sunset",
+      type: "normal",
+      cost: 70,
+      colors: {
+        body: "#ff8c61",
+        rim: "#ffc3a0",
+      },
+    },
+    {
+      id: "pixel",
+      name: "Pixel Grid",
+      type: "unique",
+      cost: 140,
+      texture: "pixel",
+    },
+  ],
+};
+
+const defaultSave = {
+  coins: 0,
+  owned: {
+    bird: ["classic"],
+    pipes: ["classic"],
+  },
+  equipped: {
+    bird: "classic",
+    pipes: "classic",
+  },
+};
+
+const loadSave = () => {
+  try {
+    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
+    if (!stored) return JSON.parse(JSON.stringify(defaultSave));
+    return {
+      coins: stored.coins ?? 0,
+      owned: {
+        bird: stored.owned?.bird ?? ["classic"],
+        pipes: stored.owned?.pipes ?? ["classic"],
+      },
+      equipped: {
+        bird: stored.equipped?.bird ?? "classic",
+        pipes: stored.equipped?.pipes ?? "classic",
+      },
+    };
+  } catch (error) {
+    return JSON.parse(JSON.stringify(defaultSave));
+  }
+};
+
+const saveState = loadSave();
+
+const persistSave = () => {
+  try {
+    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
+  } catch (error) {
+    // Ignore storage errors (private mode, file:// restrictions, etc.)
+  }
+};
+
+const gameState = {
+  running: false,
+  gameOver: false,
+  score: 0,
+  best: 0,
+  pipes: [],
+  lastSpawn: 0,
+  easterEgg: false,
+  effects: {
+    russian: 0,
+    squid: 0,
+  },
+};
+
+const settings = {
+  gravity: 0.4,
+  flapStrength: -7,
+  pipeGap: 150,
+  pipeWidth: 58,
+  pipeSpeed: 2.5,
+  spawnRate: 1400,
+};
+
+const bird = {
+  x: 90,
+  y: canvas.height / 2,
+  radius: 18,
+  velocity: 0,
+  flapFrame: 0,
+  hasGlasses: false,
+};
+
+const backgroundLayers = [
+  { speed: 0.4, color: "#9be5ff", offset: 0, height: 140 },
+  { speed: 0.8, color: "#6cc9ff", offset: 0, height: 120 },
+];
+
+const ground = {
+  height: 90,
+  offset: 0,
+  speed: 2.5,
+};
+
+const pixelPatternCanvas = document.createElement("canvas");
+pixelPatternCanvas.width = 12;
+pixelPatternCanvas.height = 12;
+const pixelPatternContext = pixelPatternCanvas.getContext("2d");
+pixelPatternContext.fillStyle = "#3d5a80";
+pixelPatternContext.fillRect(0, 0, 12, 12);
+pixelPatternContext.fillStyle = "#98c1d9";
+pixelPatternContext.fillRect(0, 0, 6, 6);
+pixelPatternContext.fillRect(6, 6, 6, 6);
+const pixelPattern = context.createPattern(pixelPatternCanvas, "repeat");
+const pixelPatternFallback = "#3d5a80";
+
+const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
+
+const updateScore = () => {
+  scoreLabel.textContent = `${gameState.score}`;
+  bestLabel.textContent = `Best: ${gameState.best}`;
+  coinsLabel.textContent = `Coins: ${saveState.coins}`;
+};
+
+const showOverlay = (heading, message) => {
+  title.textContent = heading;
+  subtitle.textContent = message;
+  overlay.classList.add("visible");
+};
+
+const showToast = (message) => {
+  toast.textContent = message;
+  toast.classList.add("visible");
+  setTimeout(() => {
+    toast.classList.remove("visible");
+  }, 2200);
+};
+
+const resetGame = () => {
+  gameState.running = false;
+  gameState.gameOver = false;
+  gameState.score = 0;
+  gameState.pipes = [];
+  gameState.lastSpawn = 0;
+  gameState.easterEgg = false;
+  gameState.effects.russian = 0;
+  gameState.effects.squid = 0;
+  bird.y = canvas.height / 2;
+  bird.velocity = 0;
+  bird.flapFrame = 0;
+  bird.hasGlasses = false;
+  backgroundLayers.forEach((layer) => {
+    layer.offset = 0;
+  });
+  ground.offset = 0;
+  updateScore();
+  showOverlay("Flappy Bird", "Tap, click, or press space to start");
+  easterEgg.classList.remove("visible");
+};
+
+const startGame = () => {
+  if (gameState.running) return;
+  gameState.running = true;
+  overlay.classList.remove("visible");
+};
+
+const triggerGameOver = () => {
+  gameState.running = false;
+  gameState.gameOver = true;
+  if (gameState.score > gameState.best) {
+    gameState.best = gameState.score;
+  }
+  updateScore();
+  showOverlay("Game Over", "Tap or press space to restart");
+};
+
+const addPipePair = () => {
+  const minY = 120;
+  const maxY = canvas.height - ground.height - settings.pipeGap - 120;
+  const gapY = Math.random() * (maxY - minY) + minY;
+  gameState.pipes.push({
+    x: canvas.width + settings.pipeWidth,
+    gapY,
+    scored: false,
+  });
+};
+
+const handleInput = () => {
+  if (shop.classList.contains("visible")) return;
+  if (gameState.gameOver) {
+    resetGame();
+    startGame();
+    bird.velocity = settings.flapStrength;
+    return;
+  }
+  if (!gameState.running) {
+    startGame();
+  }
+  bird.velocity = settings.flapStrength;
+  bird.flapFrame = 0;
+};
+
+const getBirdSkin = () =>
+  SKINS.bird.find((skin) => skin.id === saveState.equipped.bird) ?? SKINS.bird[0];
+
+const getPipeSkin = () =>
+  SKINS.pipes.find((skin) => skin.id === saveState.equipped.pipes) ?? SKINS.pipes[0];
+
+const drawBackground = () => {
+  let baseColor = "#7cc8ff";
+  if (gameState.easterEgg) baseColor = "#ffed99";
+  if (gameState.effects.squid > 0) baseColor = "#ffb3c1";
+  if (gameState.effects.russian > 0) baseColor = "#9bd1ff";
+  context.fillStyle = baseColor;
+  context.fillRect(0, 0, canvas.width, canvas.height);
+
+  backgroundLayers.forEach((layer, index) => {
+    layer.offset = (layer.offset + layer.speed) % canvas.width;
+    const baseY = canvas.height - ground.height - layer.height + index * 25;
+    context.fillStyle = layer.color;
+    context.beginPath();
+    context.moveTo(-layer.offset, baseY);
+    context.bezierCurveTo(
+      canvas.width * 0.25 - layer.offset,
+      baseY - 20,
+      canvas.width * 0.5 - layer.offset,
+      baseY + 30,
+      canvas.width * 0.75 - layer.offset,
+      baseY - 10
+    );
+    context.lineTo(canvas.width - layer.offset, baseY + layer.height);
+    context.lineTo(-layer.offset, baseY + layer.height);
+    context.closePath();
+    context.fill();
+
+    context.beginPath();
+    context.moveTo(canvas.width - layer.offset, baseY);
+    context.bezierCurveTo(
+      canvas.width * 1.25 - layer.offset,
+      baseY - 20,
+      canvas.width * 1.5 - layer.offset,
+      baseY + 30,
+      canvas.width * 1.75 - layer.offset,
+      baseY - 10
+    );
+    context.lineTo(canvas.width * 2 - layer.offset, baseY + layer.height);
+    context.lineTo(canvas.width - layer.offset, baseY + layer.height);
+    context.closePath();
+    context.fill();
+  });
+
+  ground.offset = (ground.offset + ground.speed) % canvas.width;
+  context.fillStyle = gameState.easterEgg ? "#d49835" : "#58b84c";
+  context.fillRect(0, canvas.height - ground.height, canvas.width, ground.height);
+  context.fillStyle = gameState.easterEgg ? "#f5d07f" : "#9be16a";
+  for (let x = -ground.offset; x < canvas.width; x += 40) {
+    context.fillRect(x, canvas.height - ground.height + 15, 30, 10);
+  }
+};
+
+const drawBird = () => {
+  const skin = getBirdSkin();
+  const flapOffset = Math.sin(bird.flapFrame * 0.35) * 2;
+  context.save();
+  context.translate(bird.x, bird.y + flapOffset);
+  context.rotate(clamp(bird.velocity / 15, -0.5, 0.7));
+
+  if (skin.type === "normal") {
+    context.fillStyle = skin.colors.body;
+  } else if (skin.texture === "neon") {
+    const gradient = context.createLinearGradient(-18, -18, 18, 18);
+    gradient.addColorStop(0, "#46f7ff");
+    gradient.addColorStop(0.5, "#7b2dff");
+    gradient.addColorStop(1, "#ff4fd8");
+    context.fillStyle = gradient;
+  }
+
+  context.beginPath();
+  context.ellipse(0, 0, bird.radius + 2, bird.radius - 2, 0, 0, Math.PI * 2);
+  context.fill();
+
+  if (skin.type === "unique" && skin.texture === "neon") {
+    context.strokeStyle = "rgba(255, 255, 255, 0.7)";
+    context.lineWidth = 2;
+    context.beginPath();
+    context.arc(0, 0, 14, 0, Math.PI * 2);
+    context.stroke();
+  }
+
+  context.fillStyle = skin.type === "normal" ? skin.colors.beak : "#ff9f1c";
+  context.beginPath();
+  context.moveTo(10, 0);
+  context.lineTo(26, -4);
+  context.lineTo(26, 4);
+  context.closePath();
+  context.fill();
+
+  context.fillStyle = "#ffffff";
+  context.beginPath();
+  context.arc(-4, -6, 6, 0, Math.PI * 2);
+  context.fill();
+  context.fillStyle = "#333333";
+  context.beginPath();
+  context.arc(-2, -6, 3, 0, Math.PI * 2);
+  context.fill();
+
+  context.fillStyle = skin.type === "normal" ? skin.colors.wing : "#ffe59c";
+  context.beginPath();
+  context.moveTo(-8, 6);
+  context.quadraticCurveTo(-28, 2, -20, -8);
+  context.quadraticCurveTo(-6, -5, -8, 6);
+  context.fill();
+
+  if (bird.hasGlasses) {
+    context.strokeStyle = "#1f1f1f";
+    context.lineWidth = 3;
+    context.beginPath();
+    context.rect(-15, -13, 12, 8);
+    context.rect(0, -13, 12, 8);
+    context.moveTo(-3, -9);
+    context.lineTo(0, -9);
+    context.stroke();
+  }
+
+  context.restore();
+};
+
+const drawPipes = () => {
+  const skin = getPipeSkin();
+  gameState.pipes.forEach((pipe) => {
+    const topPipeHeight = pipe.gapY;
+    const bottomPipeY = pipe.gapY + settings.pipeGap;
+
+    if (skin.type === "normal") {
+      context.fillStyle = skin.colors.body;
+    } else if (skin.texture === "pixel") {
+      context.fillStyle = pixelPattern ?? pixelPatternFallback;
+    }
+
+    context.fillRect(pipe.x, 0, settings.pipeWidth, topPipeHeight);
+    context.fillRect(
+      pipe.x,
+      bottomPipeY,
+      settings.pipeWidth,
+      canvas.height - bottomPipeY - ground.height
+    );
+
+    context.fillStyle = skin.type === "normal" ? skin.colors.rim : "#cad2f5";
+    context.fillRect(pipe.x - 4, topPipeHeight - 18, settings.pipeWidth + 8, 18);
+    context.fillRect(pipe.x - 4, bottomPipeY, settings.pipeWidth + 8, 18);
+  });
+};
+
+const updatePipes = (deltaTime) => {
+  gameState.lastSpawn += deltaTime;
+  if (gameState.lastSpawn >= settings.spawnRate) {
+    addPipePair();
+    gameState.lastSpawn = 0;
+  }
+
+  gameState.pipes.forEach((pipe) => {
+    pipe.x -= settings.pipeSpeed;
+    if (!pipe.scored && pipe.x + settings.pipeWidth < bird.x) {
+      pipe.scored = true;
+      gameState.score += 1;
+      saveState.coins += 1;
+      updateScore();
+      persistSave();
+
+      if (gameState.score === 50) {
+        bird.hasGlasses = true;
+        showToast("Cool shades unlocked! 😎");
+      }
+      if (gameState.score === 228) {
+        gameState.effects.russian = 4000;
+        showToast("228! Meme activated");
+      }
+      if (gameState.score === 456) {
+        gameState.effects.squid = 4500;
+        showToast("Red Light, Green Light!");
+      }
+      if (gameState.score === 1000 && !gameState.easterEgg) {
+        gameState.easterEgg = true;
+        easterEgg.classList.add("visible");
+        showToast("Golden Flight!");
+      }
+    }
+  });
+
+  gameState.pipes = gameState.pipes.filter((pipe) => pipe.x + settings.pipeWidth > -20);
+};
+
+const checkCollisions = () => {
+  if (bird.y + bird.radius > canvas.height - ground.height || bird.y - bird.radius < 0) {
+    triggerGameOver();
+    return;
+  }
+
+  for (const pipe of gameState.pipes) {
+    const inXRange = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + settings.pipeWidth;
+    if (!inXRange) continue;
+
+    const hitsTop = bird.y - bird.radius < pipe.gapY;
+    const hitsBottom = bird.y + bird.radius > pipe.gapY + settings.pipeGap;
+    if (hitsTop || hitsBottom) {
+      triggerGameOver();
+      return;
+    }
+  }
+};
+
+const renderShop = (type) => {
+  shopContent.innerHTML = "";
+  const list = SKINS[type];
+  list.forEach((skin) => {
+    const wrapper = document.createElement("div");
+    wrapper.className = "shop-item";
+
+    const preview = document.createElement("div");
+    preview.className = "shop-preview";
+    preview.style.background = "#ffffff";
+    if (skin.type === "normal") {
+      preview.style.background = skin.colors?.body ?? skin.colors?.rim ?? "#ffffff";
+    } else {
+      preview.style.background = "linear-gradient(135deg, #46f7ff, #ff4fd8)";
+    }
+
+    const text = document.createElement("div");
+    const titleEl = document.createElement("h3");
+    titleEl.textContent = skin.name;
+    const meta = document.createElement("span");
+    meta.textContent = `${skin.type === "unique" ? "Unique" : "Normal"} · ${skin.cost} coins`;
+    text.append(titleEl, meta);
+
+    const button = document.createElement("button");
+    const owned = saveState.owned[type].includes(skin.id);
+    const equipped = saveState.equipped[type] === skin.id;
+
+    if (!owned) {
+      button.textContent = `Buy (${skin.cost})`;
+      button.disabled = saveState.coins < skin.cost;
+    } else if (equipped) {
+      button.textContent = "Equipped";
+      button.classList.add("secondary");
+    } else {
+      button.textContent = "Equip";
+    }
+
+    button.addEventListener("click", () => {
+      const nowOwned = saveState.owned[type].includes(skin.id);
+      if (!nowOwned) {
+        if (saveState.coins < skin.cost) return;
+        saveState.coins -= skin.cost;
+        saveState.owned[type].push(skin.id);
+      }
+      saveState.equipped[type] = skin.id;
+      persistSave();
+      updateScore();
+      renderShop(type);
+    });
+
+    wrapper.append(preview, text, button);
+    shopContent.append(wrapper);
+  });
+};
+
+const openShop = () => {
+  shop.classList.add("visible");
+  renderShop("bird");
+};
+
+const closeShop = () => {
+  shop.classList.remove("visible");
+};
+
+shopTabs.forEach((tab) => {
+  tab.addEventListener("click", () => {
+    shopTabs.forEach((btn) => btn.classList.remove("active"));
+    tab.classList.add("active");
+    renderShop(tab.dataset.tab);
+  });
+});
+
+openShopButton.addEventListener("click", openShop);
+openShopOverlayButton.addEventListener("click", openShop);
+closeShopButton.addEventListener("click", closeShop);
+startGameButton.addEventListener("click", () => handleInput());
+
+let lastTime = 0;
+const loop = (timestamp) => {
+  const deltaTime = timestamp - lastTime;
+  lastTime = timestamp;
+  bird.flapFrame += deltaTime / 16;
+
+  if (gameState.effects.russian > 0) {
+    gameState.effects.russian = Math.max(0, gameState.effects.russian - deltaTime);
+  }
+  if (gameState.effects.squid > 0) {
+    gameState.effects.squid = Math.max(0, gameState.effects.squid - deltaTime);
+  }
+
+  if (gameState.running) {
+    bird.velocity += settings.gravity;
+    bird.y += bird.velocity;
+    updatePipes(deltaTime);
+    checkCollisions();
+  }
+
+  drawBackground();
+  drawPipes();
+  drawBird();
+
+  requestAnimationFrame(loop);
+};
+
+window.addEventListener("keydown", (event) => {
+  if (event.code === "Space") {
+    event.preventDefault();
+    handleInput();
+  }
+});
+
+window.addEventListener("pointerdown", () => {
+  handleInput();
+});
+
+updateScore();
+resetGame();
+requestAnimationFrame(loop);
 
EOF
)
