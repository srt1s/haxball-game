const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'elo_ratings.json');

// Statik dosyaları sun
app.use(express.static(path.join(__dirname, 'public')));

// Yerel IP adresini tespit et
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

// --- ELO VERİ TABANI ---
let eloData = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    eloData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
} catch (e) {
  console.error('ELO dosyası yüklenirken hata:', e);
  eloData = {};
}

function saveEloData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(eloData, null, 2), 'utf8');
  } catch (e) {
    console.error('ELO dosyası kaydedilirken hata:', e);
  }
}

function getPlayerEloRecord(name) {
  const clean = name.trim();
  if (!eloData[clean]) {
    eloData[clean] = {
      name: clean,
      elo: 1000,
      wins: 0,
      losses: 0,
      goals: 0
    };
    saveEloData();
  }
  return eloData[clean];
}

function getLeaderboard() {
  return Object.values(eloData)
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 15);
}

// --- PARTİ YÖNETİMİ ---
// partyId -> { id, name, leaderId, members: [socketIds] }
const parties = new Map();

function generatePartyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- STADYUM VE FİZİK SABİTLERİ ---
const PITCH = {
  width: 1100,
  height: 600,
  minX: 150,
  maxX: 950,
  minY: 80,
  maxY: 520,
  centerX: 550,
  centerY: 300,
  centerRadius: 85,
  cornerRadius: 60,
  // Kale direkleri
  postRadius: 9,
  goalTopY: 235,
  goalBottomY: 365,
  goalDepth: 70,
  leftNetX: 80,
  rightNetX: 1020
};

const POSTS = [
  { x: PITCH.minX, y: PITCH.goalTopY, color: '#f8fafc' },
  { x: PITCH.minX, y: PITCH.goalBottomY, color: '#f8fafc' },
  { x: PITCH.maxX, y: PITCH.goalTopY, color: '#f8fafc' },
  { x: PITCH.maxX, y: PITCH.goalBottomY, color: '#f8fafc' }
];

const BALL_CONFIG = {
  radius: 10.5,
  mass: 1.0,
  damping: 0.986,
  wallRestitution: 0.8,
  postRestitution: 0.85,
  maxSpeed: 20
};

const PLAYER_CONFIG = {
  radius: 16,
  mass: 3.5,
  accel: 0.65,
  damping: 0.89,
  maxSpeed: 5.2,
  kickRange: 34,
  kickPower: 11.2,
  kickRecoil: 0.8
};

// --- OYUN DURUMU ---
const gameState = {
  status: 'WAITING', // WAITING, COUNTDOWN, PLAYING, GOAL, ENDED
  countdown: 3,
  matchTime: 0,
  timeLimit: 180, // saniye (3 dk), 0 ise limitsiz
  scoreLimit: 3,  // 3 gol, 0 ise limitsiz
  redScore: 0,
  blueScore: 0,
  lastScorer: null,
  lastTeamTouch: null,
  autoBots: true, // Otomatik bot dengeleme açık
  ball: {
    x: PITCH.centerX,
    y: PITCH.centerY,
    vx: 0,
    vy: 0,
    radius: BALL_CONFIG.radius
  },
  players: {},
  kickoffTeam: 'red'
};

// --- AKILLI BOT SİSTEMİ ---
const BOT_NAMES = ['Demir', 'Hakan', 'Fırtına', 'Rüzgar', 'Şahin', 'Atlas', 'Volkan', 'Baron'];
let botCounter = 0;

function createBot(team) {
  botCounter++;
  const baseName = BOT_NAMES[(botCounter - 1) % BOT_NAMES.length];
  const botId = `bot_${botCounter}_${Date.now()}`;
  return {
    id: botId,
    name: `[BOT] ${baseName}`,
    isBot: true,
    team: team,
    role: 'striker', // 'gk' veya 'striker' dinamik atanır
    avatar: '🤖',
    x: team === 'red' ? PITCH.minX + 220 : PITCH.maxX - 220,
    y: PITCH.centerY,
    vx: 0,
    vy: 0,
    radius: PLAYER_CONFIG.radius,
    inputs: { up: false, down: false, left: false, right: false, kick: false },
    isKicking: false,
    kickDebounce: false,
    ping: 5,
    elo: 1050,
    party: null,
    // Bot zeka durumu
    targetX: PITCH.centerX,
    targetY: PITCH.centerY,
    decisionCooldown: 0
  };
}

// Bot Dengeleme Fonksiyonu
function updateBotBalance() {
  if (!gameState.autoBots) return;

  const redHumans = Object.values(gameState.players).filter(p => !p.isBot && p.team === 'red');
  const blueHumans = Object.values(gameState.players).filter(p => !p.isBot && p.team === 'blue');

  const maxHumans = Math.max(redHumans.length, blueHumans.length);
  // Eğer sahada en az bir insan oyuncu varsa, her iki takımı eşit sayıda oyuncuyla (en az 1v1) doldur
  const targetPerTeam = maxHumans > 0 ? maxHumans : 0;

  adjustTeamBots('red', targetPerTeam);
  adjustTeamBots('blue', targetPerTeam);
}

function adjustTeamBots(team, targetCount) {
  const teamMembers = Object.values(gameState.players).filter(p => p.team === team);
  const diff = targetCount - teamMembers.length;

  if (diff > 0) {
    // Eksik oyuncu yerine akıllı bot ekle
    for (let i = 0; i < diff; i++) {
      const bot = createBot(team);
      gameState.players[bot.id] = bot;
    }
  } else if (diff < 0) {
    // Fazla botları çıkar
    const bots = teamMembers.filter(p => p.isBot);
    const toRemove = Math.min(bots.length, Math.abs(diff));
    for (let i = 0; i < toRemove; i++) {
      const b = bots[i];
      delete gameState.players[b.id];
    }
  }
}

// Oyuncu pozisyonlarını santraya göre düzenle
function resetPositions() {
  gameState.ball.x = PITCH.centerX;
  gameState.ball.y = PITCH.centerY;
  gameState.ball.vx = 0;
  gameState.ball.vy = 0;

  const redPlayers = Object.values(gameState.players).filter(p => p.team === 'red');
  const bluePlayers = Object.values(gameState.players).filter(p => p.team === 'blue');

  redPlayers.forEach((p, index) => {
    p.vx = 0; p.vy = 0; p.isKicking = false;
    const total = redPlayers.length;
    const spacing = 280 / (total + 1);
    p.x = PITCH.minX + 180;
    p.y = PITCH.minY + 80 + spacing * (index + 1);
    if (index === 0 && gameState.kickoffTeam === 'red') {
      p.x = PITCH.centerX - 55;
      p.y = PITCH.centerY;
    }
  });

  bluePlayers.forEach((p, index) => {
    p.vx = 0; p.vy = 0; p.isKicking = false;
    const total = bluePlayers.length;
    const spacing = 280 / (total + 1);
    p.x = PITCH.maxX - 180;
    p.y = PITCH.minY + 80 + spacing * (index + 1);
    if (index === 0 && gameState.kickoffTeam === 'blue') {
      p.x = PITCH.centerX + 55;
      p.y = PITCH.centerY;
    }
  });
}

function startCountdown(kickoffTeam = 'red') {
  gameState.status = 'COUNTDOWN';
  gameState.countdown = 3;
  gameState.kickoffTeam = kickoffTeam;
  resetPositions();
  io.emit('sound', { type: 'whistle_short' });

  let count = 3;
  const cdInterval = setInterval(() => {
    count--;
    gameState.countdown = count;
    if (count > 0) {
      io.emit('sound', { type: 'countdown_beep' });
    } else {
      clearInterval(cdInterval);
      gameState.status = 'PLAYING';
      io.emit('sound', { type: 'whistle' });
    }
  }, 1000);
}

// ELO HESAPLAMA VE GÜNCELLEME
function processMatchElo(winnerTeam) {
  const redPlayers = Object.values(gameState.players).filter(p => p.team === 'red' && !p.isBot);
  const bluePlayers = Object.values(gameState.players).filter(p => p.team === 'blue' && !p.isBot);

  if (redPlayers.length === 0 && bluePlayers.length === 0) return;

  const redAvg = redPlayers.length > 0 
    ? redPlayers.reduce((sum, p) => sum + (p.elo || 1000), 0) / redPlayers.length 
    : 1000;
  const blueAvg = bluePlayers.length > 0 
    ? bluePlayers.reduce((sum, p) => sum + (p.elo || 1000), 0) / bluePlayers.length 
    : 1000;

  // Standart ELO Beklenen Sonuç
  const expectedRed = 1 / (1 + Math.pow(10, (blueAvg - redAvg) / 400));
  const expectedBlue = 1 - expectedRed;

  const actualRed = winnerTeam === 'red' ? 1 : (winnerTeam === 'blue' ? 0 : 0.5);
  const actualBlue = winnerTeam === 'blue' ? 1 : (winnerTeam === 'red' ? 0 : 0.5);

  const kFactor = 32;
  const deltaRed = Math.round(kFactor * (actualRed - expectedRed));
  const deltaBlue = Math.round(kFactor * (actualBlue - expectedBlue));

  // Kırmızı oyuncuları güncelle
  redPlayers.forEach(p => {
    const rec = getPlayerEloRecord(p.name);
    rec.elo = Math.max(600, rec.elo + deltaRed);
    if (winnerTeam === 'red') rec.wins++;
    else if (winnerTeam === 'blue') rec.losses++;
    p.elo = rec.elo;
  });

  // Mavi oyuncuları güncelle
  bluePlayers.forEach(p => {
    const rec = getPlayerEloRecord(p.name);
    rec.elo = Math.max(600, rec.elo + deltaBlue);
    if (winnerTeam === 'blue') rec.wins++;
    else if (winnerTeam === 'red') rec.losses++;
    p.elo = rec.elo;
  });

  saveEloData();
  io.emit('leaderboard_update', getLeaderboard());
}

function handleGoal(scoringTeam, scorerName) {
  if (gameState.status !== 'PLAYING') return;
  gameState.status = 'GOAL';

  if (scoringTeam === 'red') gameState.redScore++;
  else if (scoringTeam === 'blue') gameState.blueScore++;

  const cleanScorer = scorerName || (scoringTeam === 'red' ? 'Kırmızı Takım' : 'Mavi Takım');

  // Skorer istatistiğini kaydet
  if (cleanScorer && !cleanScorer.startsWith('[BOT]') && !cleanScorer.includes('(Kendi Kalesine)')) {
    const rec = getPlayerEloRecord(cleanScorer);
    rec.goals++;
    saveEloData();
  }

  const teamNameTr = scoringTeam === 'red' ? 'KIRMIZI' : 'MAVİ';

  io.emit('goal_event', {
    team: scoringTeam,
    scorer: cleanScorer,
    redScore: gameState.redScore,
    blueScore: gameState.blueScore
  });
  io.emit('sound', { type: 'goal' });
  io.emit('system_message', { 
    text: `⚽ GOOOOL! ${cleanScorer} (${teamNameTr}) ağları havalandırdı!`,
    isGoal: true 
  });

  const redWon = gameState.scoreLimit > 0 && gameState.redScore >= gameState.scoreLimit;
  const blueWon = gameState.scoreLimit > 0 && gameState.blueScore >= gameState.scoreLimit;

  setTimeout(() => {
    if (redWon || blueWon) {
      gameState.status = 'ENDED';
      const winner = redWon ? 'red' : 'blue';
      const winnerName = redWon ? 'KIRMIZI TAKIM' : 'MAVİ TAKIM';
      processMatchElo(winner);
      io.emit('match_ended', { winner: winnerName, redScore: gameState.redScore, blueScore: gameState.blueScore });
      io.emit('sound', { type: 'whistle_triple' });
      io.emit('system_message', { 
        text: `🏆 MAÇ BİTTİ! KAZANAN: ${winnerName}! Skor: ${gameState.redScore} - ${gameState.blueScore}`,
        isMatchEnd: true
      });
    } else {
      startCountdown(scoringTeam === 'red' ? 'blue' : 'red');
    }
  }, 2800);
}

// --- AKILLI BOT YAPAY ZEKA DÖNGÜSÜ ---
function updateBotAI() {
  const ball = gameState.ball;
  const allPlayers = Object.values(gameState.players);

  ['red', 'blue'].forEach(team => {
    const teamMembers = allPlayers.filter(p => p.team === team);
    const bots = teamMembers.filter(p => p.isBot);
    if (bots.length === 0) return;

    const isRed = team === 'red';
    const ownGoalX = isRed ? PITCH.minX : PITCH.maxX;
    const oppGoalX = isRed ? PITCH.maxX : PITCH.minX;

    // Rol Ataması: Kendi kalesine en yakın olan oyuncu/bot Kaleci/Savunma olsun
    let closestToGoalBot = null;
    let minGoalDist = Infinity;

    bots.forEach(b => {
      const distToOwnGoal = Math.abs(b.x - ownGoalX);
      if (distToOwnGoal < minGoalDist) {
        minGoalDist = distToOwnGoal;
        closestToGoalBot = b;
      }
    });

    bots.forEach(bot => {
      bot.role = (bot === closestToGoalBot && teamMembers.length > 1) ? 'gk' : 'striker';

      // 1. Topun gelecekteki tahmini konumu
      const ballSpeed = Math.hypot(ball.vx, ball.vy);
      const distToBall = Math.hypot(ball.x - bot.x, ball.y - bot.y);
      const leadTime = Math.min(18, Math.max(0, distToBall / 7));
      const predBallX = Math.max(PITCH.minX + 20, Math.min(PITCH.maxX - 20, ball.x + ball.vx * leadTime));
      const predBallY = Math.max(PITCH.minY + 20, Math.min(PITCH.maxY - 20, ball.y + ball.vy * leadTime));

      let targetX = bot.x;
      let targetY = bot.y;
      let shouldKick = false;

      // 2. ROL DAVRANIŞLARI
      if (bot.role === 'gk') {
        // --- KALECİ / SAVUNMA BOTU ---
        const gkStandX = isRed ? PITCH.minX + 90 : PITCH.maxX - 90;
        const clampedBallY = Math.max(PITCH.goalTopY - 15, Math.min(PITCH.goalBottomY + 15, ball.y));

        const ballInDangerZone = isRed ? ball.x < PITCH.minX + 260 : ball.x > PITCH.maxX - 260;

        if (ballInDangerZone) {
          // Tehlikeli top! Topa çıkıp tehlikeyi uzaklaştır veya şut çek
          targetX = predBallX;
          targetY = predBallY;
          if (distToBall < 42) {
            shouldKick = true;
          }
        } else {
          // Kalede güvenli açıyı kapat
          targetX = gkStandX;
          targetY = clampedBallY;
        }
      } else {
        // --- FORVET / OYUN KURUCU BOT ---
        // Rakip kaleye veya boştaki takım arkadaşına hedef al
        let aimTargetX = oppGoalX;
        let aimTargetY = PITCH.centerY;

        // PAS VERME KONTROLÜ:
        // Eğer ileride daha iyi pozisyonda olan bir takım arkadaşı (insan veya bot) varsa pas at!
        const forwardTeammates = teamMembers.filter(tm => 
          tm.id !== bot.id && 
          (isRed ? tm.x > bot.x + 80 : tm.x < bot.x - 80)
        );

        if (forwardTeammates.length > 0) {
          // En ileri ve müsait oyuncuyu seç
          forwardTeammates.sort((a, b) => isRed ? b.x - a.x : a.x - b.x);
          const passTarget = forwardTeammates[0];
          aimTargetX = passTarget.x;
          aimTargetY = passTarget.y;
        } else {
          // Rakip kalenin köşelerine şut hedefi
          aimTargetY = (ball.y < PITCH.centerY) ? PITCH.goalBottomY - 15 : PITCH.goalTopY + 15;
        }

        // Topun arkasına geçme mantığı (kendi kalesine vurmamak için)
        const dirToTargetX = aimTargetX - predBallX;
        const dirToTargetY = aimTargetY - predBallY;
        const dirLen = Math.hypot(dirToTargetX, dirToTargetY) || 1;
        const normDirX = dirToTargetX / dirLen;
        const normDirY = dirToTargetY / dirLen;

        // Topun hedef yönünün tersinde, 30 piksel arkasında bir nokta belirle
        const behindBallX = predBallX - normDirX * 30;
        const behindBallY = predBallY - normDirY * 30;

        const isBehindBall = isRed ? (bot.x < ball.x + 5) : (bot.x > ball.x - 5);

        if (!isBehindBall && Math.abs(ball.y - bot.y) < 35) {
          // Topun yanlış tarafında! Topun etrafından dolaş
          targetX = behindBallX;
          targetY = ball.y > bot.y ? bot.y - 40 : bot.y + 40;
        } else {
          // Topun arkasından hedefe doğru sür veya vur
          targetX = behindBallX;
          targetY = behindBallY;

          if (distToBall < 38) {
            // Şut veya pas mesafesinde
            // Açı kontrolü: bot toptan geçerken hedefe bakıyor mu?
            const ballToBotAngle = Math.atan2(predBallY - bot.y, predBallX - bot.x);
            const targetAngle = Math.atan2(dirToTargetY, dirToTargetX);
            const angleDiff = Math.abs(ballToBotAngle - targetAngle);

            if (angleDiff < 1.2 || distToBall < 30) {
              shouldKick = true;
            }
          }
        }
      }

      // 3. Hedefe göre girdi üret (Klavye tuşları gibi)
      const dx = targetX - bot.x;
      const dy = targetY - bot.y;

      bot.inputs.left = dx < -6;
      bot.inputs.right = dx > 6;
      bot.inputs.up = dy < -6;
      bot.inputs.down = dy > 6;
      bot.inputs.kick = shouldKick;
    });
  });
}

// Fizik Döngüsü (60 FPS)
let lastTick = Date.now();
let lastSecondTick = Date.now();

function physicsTick() {
  const now = Date.now();
  lastTick = now;

  // Maç süresi sayacı
  if (gameState.status === 'PLAYING') {
    if (now - lastSecondTick >= 1000) {
      lastSecondTick = now;
      gameState.matchTime++;

      if (gameState.timeLimit > 0 && gameState.matchTime >= gameState.timeLimit) {
        gameState.status = 'ENDED';
        let winner = 'draw';
        let winnerName = 'BERABERE';
        if (gameState.redScore > gameState.blueScore) { winner = 'red'; winnerName = 'KIRMIZI TAKIM'; }
        else if (gameState.blueScore > gameState.redScore) { winner = 'blue'; winnerName = 'MAVİ TAKIM'; }

        processMatchElo(winner);
        io.emit('match_ended', { winner: winnerName, redScore: gameState.redScore, blueScore: gameState.blueScore });
        io.emit('sound', { type: 'whistle_triple' });
        io.emit('system_message', { 
          text: `🏆 MAÇ BİTTİ! Sonuç: ${winnerName}! Skor: ${gameState.redScore} - ${gameState.blueScore}`,
          isMatchEnd: true
        });
      }
    }
  }

  // Akıllı Botları Güncelle
  updateBotAI();

  // --- OYUNCU VE BOT HAREKETLERİ ---
  const playerList = Object.values(gameState.players);

  for (const player of playerList) {
    if (player.team === 'spec') continue;

    if (gameState.status === 'COUNTDOWN') {
      player.vx *= 0.5;
      player.vy *= 0.5;
    } else {
      let moveX = 0;
      let moveY = 0;
      if (player.inputs.up) moveY -= 1;
      if (player.inputs.down) moveY += 1;
      if (player.inputs.left) moveX -= 1;
      if (player.inputs.right) moveX += 1;

      if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
      }

      player.vx += moveX * PLAYER_CONFIG.accel;
      player.vy += moveY * PLAYER_CONFIG.accel;

      const speed = Math.hypot(player.vx, player.vy);
      if (speed > PLAYER_CONFIG.maxSpeed) {
        player.vx = (player.vx / speed) * PLAYER_CONFIG.maxSpeed;
        player.vy = (player.vy / speed) * PLAYER_CONFIG.maxSpeed;
      }
    }

    player.vx *= PLAYER_CONFIG.damping;
    player.vy *= PLAYER_CONFIG.damping;

    player.x += player.vx;
    player.y += player.vy;

    player.isKicking = !!player.inputs.kick;

    // Saha Sınırları
    if (player.x - player.radius < PITCH.minX) {
      player.x = PITCH.minX + player.radius;
      player.vx = 0;
    }
    if (player.x + player.radius > PITCH.maxX) {
      player.x = PITCH.maxX - player.radius;
      player.vx = 0;
    }
    if (player.y - player.radius < PITCH.minY) {
      player.y = PITCH.minY + player.radius;
      player.vy = 0;
    }
    if (player.y + player.radius > PITCH.maxY) {
      player.y = PITCH.maxY - player.radius;
      player.vy = 0;
    }

    resolveCorner(player, player.radius, 0.2);

    for (const post of POSTS) {
      resolveStaticCircle(player, player.radius, post, PITCH.postRadius, 0.4);
    }
  }

  // Oyuncu - Oyuncu Çarpışması
  for (let i = 0; i < playerList.length; i++) {
    const p1 = playerList[i];
    if (p1.team === 'spec') continue;
    for (let j = i + 1; j < playerList.length; j++) {
      const p2 = playerList[j];
      if (p2.team === 'spec') continue;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p1.radius + p2.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        p1.x -= nx * overlap * 0.5;
        p1.y -= ny * overlap * 0.5;
        p2.x += nx * overlap * 0.5;
        p2.y += ny * overlap * 0.5;

        const kx = p1.vx - p2.vx;
        const ky = p1.vy - p2.vy;
        const p = 2 * (nx * kx + ny * ky) / (PLAYER_CONFIG.mass + PLAYER_CONFIG.mass);

        p1.vx -= p * PLAYER_CONFIG.mass * nx;
        p1.vy -= p * PLAYER_CONFIG.mass * ny;
        p2.vx += p * PLAYER_CONFIG.mass * nx;
        p2.vy += p * PLAYER_CONFIG.mass * ny;
      }
    }
  }

  // --- TOP HAREKETİ ---
  const ball = gameState.ball;

  if (gameState.status !== 'COUNTDOWN') {
    ball.vx *= BALL_CONFIG.damping;
    ball.vy *= BALL_CONFIG.damping;

    if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.01) ball.vy = 0;

    const bSpeed = Math.hypot(ball.vx, ball.vy);
    if (bSpeed > BALL_CONFIG.maxSpeed) {
      ball.vx = (ball.vx / bSpeed) * BALL_CONFIG.maxSpeed;
      ball.vy = (ball.vy / bSpeed) * BALL_CONFIG.maxSpeed;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;
  }

  // --- OYUNCU - TOP ETKİLEŞİMİ (SÜRME VE ŞUT) ---
  for (const player of playerList) {
    if (player.team === 'spec') continue;

    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minDist = player.radius + ball.radius;

    // Şut
    if (player.inputs.kick && dist < minDist + 16 && !player.kickDebounce) {
      player.kickDebounce = true;
      gameState.lastScorer = player.name;
      gameState.lastTeamTouch = player.team;

      let nx = dx / (dist || 1);
      let ny = dy / (dist || 1);

      const kickSpeed = PLAYER_CONFIG.kickPower;
      ball.vx = nx * kickSpeed + player.vx * 0.35;
      ball.vy = ny * kickSpeed + player.vy * 0.35;

      player.vx -= nx * PLAYER_CONFIG.kickRecoil;
      player.vy -= ny * PLAYER_CONFIG.kickRecoil;

      io.emit('sound', { type: 'kick', x: ball.x, y: ball.y });
    }

    if (!player.inputs.kick) {
      player.kickDebounce = false;
    }

    // Normal Dokunma
    if (dist < minDist && dist > 0) {
      gameState.lastScorer = player.name;
      gameState.lastTeamTouch = player.team;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      ball.x += nx * overlap;
      ball.y += ny * overlap;

      const kx = player.vx - ball.vx;
      const ky = player.vy - ball.vy;
      const p = (2 * (nx * kx + ny * ky)) / (PLAYER_CONFIG.mass + BALL_CONFIG.mass);

      ball.vx += p * PLAYER_CONFIG.mass * nx * 1.15;
      ball.vy += p * PLAYER_CONFIG.mass * ny * 1.15;
      player.vx -= p * BALL_CONFIG.mass * nx * 0.3;
      player.vy -= p * BALL_CONFIG.mass * ny * 0.3;
    }
  }

  // Top - Direk
  for (const post of POSTS) {
    if (resolveStaticCircle(ball, ball.radius, post, PITCH.postRadius, BALL_CONFIG.postRestitution)) {
      io.emit('sound', { type: 'post' });
    }
  }

  // Top - Saha Duvarları
  if (ball.y - ball.radius < PITCH.minY) {
    ball.y = PITCH.minY + ball.radius;
    ball.vy = -ball.vy * BALL_CONFIG.wallRestitution;
    if (Math.abs(ball.vy) > 0.5) io.emit('sound', { type: 'bounce' });
  } else if (ball.y + ball.radius > PITCH.maxY) {
    ball.y = PITCH.maxY - ball.radius;
    ball.vy = -ball.vy * BALL_CONFIG.wallRestitution;
    if (Math.abs(ball.vy) > 0.5) io.emit('sound', { type: 'bounce' });
  }

  if (resolveCorner(ball, ball.radius, BALL_CONFIG.wallRestitution)) {
    if (Math.hypot(ball.vx, ball.vy) > 1) io.emit('sound', { type: 'bounce' });
  }

  // Sol Taraf (Kırmızı Kale)
  const isInLeftGoalMouth = (ball.y >= PITCH.goalTopY - 2 && ball.y <= PITCH.goalBottomY + 2);

  if (ball.x - ball.radius < PITCH.minX) {
    if (isInLeftGoalMouth) {
      if (ball.x - ball.radius < PITCH.leftNetX) {
        ball.x = PITCH.leftNetX + ball.radius;
        ball.vx = -ball.vx * 0.3;
        ball.vy *= 0.5;
      }
      if (ball.y - ball.radius < PITCH.goalTopY) {
        ball.y = PITCH.goalTopY + ball.radius;
        ball.vy = -ball.vy * 0.3;
      }
      if (ball.y + ball.radius > PITCH.goalBottomY) {
        ball.y = PITCH.goalBottomY - ball.radius;
        ball.vy = -ball.vy * 0.3;
      }

      if (ball.x + ball.radius < PITCH.minX) {
        // Mavi gol attı (top sol kaleden içeri girdi)
        let scorer = gameState.lastTeamTouch === 'blue' 
          ? gameState.lastScorer 
          : (gameState.lastScorer ? `${gameState.lastScorer} (Kendi Kalesine)` : 'Mavi Takım');
        handleGoal('blue', scorer);
      }
    } else {
      ball.x = PITCH.minX + ball.radius;
      ball.vx = -ball.vx * BALL_CONFIG.wallRestitution;
      if (Math.abs(ball.vx) > 0.5) io.emit('sound', { type: 'bounce' });
    }
  }

  // Sağ Taraf (Mavi Kale)
  const isInRightGoalMouth = (ball.y >= PITCH.goalTopY - 2 && ball.y <= PITCH.goalBottomY + 2);

  if (ball.x + ball.radius > PITCH.maxX) {
    if (isInRightGoalMouth) {
      if (ball.x + ball.radius > PITCH.rightNetX) {
        ball.x = PITCH.rightNetX - ball.radius;
        ball.vx = -ball.vx * 0.3;
        ball.vy *= 0.5;
      }
      if (ball.y - ball.radius < PITCH.goalTopY) {
        ball.y = PITCH.goalTopY + ball.radius;
        ball.vy = -ball.vy * 0.3;
      }
      if (ball.y + ball.radius > PITCH.goalBottomY) {
        ball.y = PITCH.goalBottomY - ball.radius;
        ball.vy = -ball.vy * 0.3;
      }

      if (ball.x - ball.radius > PITCH.maxX) {
        // Kırmızı gol attı (top sağ kaleden içeri girdi)
        let scorer = gameState.lastTeamTouch === 'red' 
          ? gameState.lastScorer 
          : (gameState.lastScorer ? `${gameState.lastScorer} (Kendi Kalesine)` : 'Kırmızı Takım');
        handleGoal('red', scorer);
      }
    } else {
      ball.x = PITCH.maxX - ball.radius;
      ball.vx = -ball.vx * BALL_CONFIG.wallRestitution;
      if (Math.abs(ball.vx) > 0.5) io.emit('sound', { type: 'bounce' });
    }
  }
}

function resolveStaticCircle(obj, objRadius, staticCircle, staticRadius, restitution) {
  const dx = obj.x - staticCircle.x;
  const dy = obj.y - staticCircle.y;
  const dist = Math.hypot(dx, dy);
  const minDist = objRadius + staticRadius;

  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;

    obj.x += nx * overlap;
    obj.y += ny * overlap;

    const dot = obj.vx * nx + obj.vy * ny;
    if (dot < 0) {
      obj.vx -= (1 + restitution) * dot * nx;
      obj.vy -= (1 + restitution) * dot * ny;
      return true;
    }
  }
  return false;
}

function resolveCorner(obj, radius, restitution) {
  const R = PITCH.cornerRadius;
  const corners = [
    { cx: PITCH.minX + R, cy: PITCH.minY + R, check: (x, y) => x < PITCH.minX + R && y < PITCH.minY + R },
    { cx: PITCH.maxX - R, cy: PITCH.minY + R, check: (x, y) => x > PITCH.maxX - R && y < PITCH.minY + R },
    { cx: PITCH.minX + R, cy: PITCH.maxY - R, check: (x, y) => x < PITCH.minX + R && y > PITCH.maxY - R },
    { cx: PITCH.maxX - R, cy: PITCH.maxY - R, check: (x, y) => x > PITCH.maxX - R && y > PITCH.maxY - R }
  ];

  let collided = false;
  for (const c of corners) {
    if (c.check(obj.x, obj.y)) {
      const dx = obj.x - c.cx;
      const dy = obj.y - c.cy;
      const dist = Math.hypot(dx, dy);
      const limit = R - radius;
      if (dist > limit && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        obj.x = c.cx + nx * limit;
        obj.y = c.cy + ny * limit;

        const dot = obj.vx * nx + obj.vy * ny;
        if (dot > 0) {
          obj.vx -= (1 + restitution) * dot * nx;
          obj.vy -= (1 + restitution) * dot * ny;
          collided = true;
        }
      }
    }
  }
  return collided;
}

// 60 FPS Fizik Döngüsü
setInterval(physicsTick, 1000 / 60);

// Client Durum Yayını (60 FPS)
setInterval(() => {
  io.emit('state', {
    t: Date.now(),
    status: gameState.status,
    countdown: gameState.countdown,
    matchTime: gameState.matchTime,
    redScore: gameState.redScore,
    blueScore: gameState.blueScore,
    autoBots: gameState.autoBots,
    ball: {
      x: Math.round(gameState.ball.x * 10) / 10,
      y: Math.round(gameState.ball.y * 10) / 10,
      vx: Math.round(gameState.ball.vx * 100) / 100,
      vy: Math.round(gameState.ball.vy * 100) / 100
    },
    players: Object.fromEntries(
      Object.entries(gameState.players).map(([id, p]) => [
        id,
        {
          id: p.id,
          name: p.name,
          isBot: !!p.isBot,
          team: p.team,
          role: p.role,
          avatar: p.avatar,
          elo: p.elo || 1000,
          party: p.party ? p.party.name : null,
          x: Math.round(p.x * 10) / 10,
          y: Math.round(p.y * 10) / 10,
          vx: Math.round(p.vx * 100) / 100,
          vy: Math.round(p.vy * 100) / 100,
          isKicking: p.isKicking,
          ping: p.ping || 0
        }
      ])
    )
  });
}, 1000 / 60);

// --- SOCKET.IO ETKİLEŞİMLERİ ---
let playerCounter = 1;

io.on('connection', (socket) => {
  const defaultName = `Oyuncu ${playerCounter++}`;
  const eloRec = getPlayerEloRecord(defaultName);

  const newPlayer = {
    id: socket.id,
    name: defaultName,
    team: 'spec',
    avatar: '⚽',
    elo: eloRec.elo,
    party: null,
    x: PITCH.centerX,
    y: PITCH.centerY,
    vx: 0,
    vy: 0,
    radius: PLAYER_CONFIG.radius,
    inputs: { up: false, down: false, left: false, right: false, kick: false },
    isKicking: false,
    kickDebounce: false,
    ping: 0
  };

  gameState.players[socket.id] = newPlayer;

  // Başlangıç verilerini gönder
  socket.emit('init_pitch', {
    pitch: PITCH,
    posts: POSTS,
    localIp: LOCAL_IP,
    port: PORT,
    playerId: socket.id,
    elo: newPlayer.elo,
    settings: {
      scoreLimit: gameState.scoreLimit,
      timeLimit: gameState.timeLimit,
      autoBots: gameState.autoBots
    },
    leaderboard: getLeaderboard()
  });

  // İsim güncelleme
  socket.on('set_name', (rawName) => {
    const cleanName = String(rawName || '').trim().substring(0, 16);
    if (cleanName.length > 0) {
      newPlayer.name = cleanName;
      const rec = getPlayerEloRecord(cleanName);
      newPlayer.elo = rec.elo;
      socket.emit('elo_updated', { elo: newPlayer.elo });
    }
  });

  // Takım seçimi (Kırmızı, Mavi, İzleyici)
  socket.on('join_team', (team) => {
    if (!['red', 'blue', 'spec'].includes(team)) return;

    // Eğer parti lideriyse tüm partiyi o takıma geçir
    if (newPlayer.party && newPlayer.party.leaderId === socket.id) {
      const party = parties.get(newPlayer.party.id);
      if (party) {
        party.members.forEach(memberId => {
          const member = gameState.players[memberId];
          if (member) {
            member.team = team;
            if (team === 'red') { member.x = PITCH.minX + 160; member.y = PITCH.centerY; }
            else if (team === 'blue') { member.x = PITCH.maxX - 160; member.y = PITCH.centerY; }
            member.vx = 0; member.vy = 0;
          }
        });
        updateBotBalance();
        return;
      }
    }

    newPlayer.team = team;
    if (team === 'red') {
      newPlayer.x = PITCH.minX + 160;
      newPlayer.y = PITCH.centerY;
    } else if (team === 'blue') {
      newPlayer.x = PITCH.maxX - 160;
      newPlayer.y = PITCH.centerY;
    }
    newPlayer.vx = 0;
    newPlayer.vy = 0;

    updateBotBalance();
  });

  // PARTİ SİSTEMİ
  socket.on('create_party', (partyName) => {
    const code = generatePartyCode();
    const name = String(partyName || 'Takım').trim().substring(0, 14) || 'Takım';
    const party = {
      id: code,
      name: name,
      leaderId: socket.id,
      members: [socket.id]
    };
    parties.set(code, party);
    newPlayer.party = { id: code, name: name, leaderId: socket.id };

    socket.emit('party_state', { inParty: true, isLeader: true, code: code, name: name, members: [newPlayer.name] });
  });

  socket.on('join_party', (rawCode) => {
    const code = String(rawCode || '').trim().toUpperCase();
    const party = parties.get(code);
    if (!party) {
      socket.emit('party_error', 'Parti bulunamadı! Kodu kontrol edin.');
      return;
    }

    if (newPlayer.party) {
      leaveParty(socket.id);
    }

    party.members.push(socket.id);
    newPlayer.party = { id: code, name: party.name, leaderId: party.leaderId };

    const memberNames = party.members.map(id => gameState.players[id] ? gameState.players[id].name : 'Oyuncu');
    party.members.forEach(mId => {
      io.to(mId).emit('party_state', {
        inParty: true,
        isLeader: mId === party.leaderId,
        code: party.id,
        name: party.name,
        members: memberNames
      });
    });
  });

  socket.on('leave_party', () => {
    leaveParty(socket.id);
  });

  function leaveParty(sockId) {
    const player = gameState.players[sockId];
    if (!player || !player.party) return;
    const party = parties.get(player.party.id);
    if (party) {
      party.members = party.members.filter(id => id !== sockId);
      if (party.members.length === 0) {
        parties.delete(party.id);
      } else {
        if (party.leaderId === sockId) {
          party.leaderId = party.members[0]; // Yeni lider ata
        }
        const memberNames = party.members.map(id => gameState.players[id] ? gameState.players[id].name : 'Oyuncu');
        party.members.forEach(mId => {
          io.to(mId).emit('party_state', {
            inParty: true,
            isLeader: mId === party.leaderId,
            code: party.id,
            name: party.name,
            members: memberNames
          });
        });
      }
    }
    player.party = null;
    socket.emit('party_state', { inParty: false });
  }

  // Tuş girdileri
  socket.on('inputs', (inputs) => {
    if (newPlayer && inputs) {
      newPlayer.inputs.up = !!inputs.up;
      newPlayer.inputs.down = !!inputs.down;
      newPlayer.inputs.left = !!inputs.left;
      newPlayer.inputs.right = !!inputs.right;
      newPlayer.inputs.kick = !!inputs.kick;
    }
  });

  // Sohbet mesajı
  socket.on('chat_message', (msg) => {
    const text = String(msg || '').trim().substring(0, 140);
    if (text.length > 0) {
      io.emit('chat_broadcast', {
        id: socket.id,
        name: newPlayer.name,
        team: newPlayer.team,
        elo: newPlayer.elo || 1000,
        party: newPlayer.party ? newPlayer.party.name : null,
        text: text,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // Maç Başlatma / Durdurma / Sıfırlama
  socket.on('start_match', () => {
    gameState.redScore = 0;
    gameState.blueScore = 0;
    gameState.matchTime = 0;
    updateBotBalance();
    startCountdown('red');
  });

  socket.on('reset_match', () => {
    gameState.status = 'WAITING';
    gameState.redScore = 0;
    gameState.blueScore = 0;
    gameState.matchTime = 0;
    resetPositions();
  });

  socket.on('toggle_bots', () => {
    gameState.autoBots = !gameState.autoBots;
    if (!gameState.autoBots) {
      for (const id in gameState.players) {
        if (gameState.players[id].isBot) {
          delete gameState.players[id];
        }
      }
    } else {
      updateBotBalance();
    }
    io.emit('settings_updated', {
      scoreLimit: gameState.scoreLimit,
      timeLimit: gameState.timeLimit,
      autoBots: gameState.autoBots
    });
  });

  socket.on('update_settings', (settings) => {
    if (settings) {
      if (typeof settings.scoreLimit === 'number') gameState.scoreLimit = Math.max(0, settings.scoreLimit);
      if (typeof settings.timeLimit === 'number') gameState.timeLimit = Math.max(0, settings.timeLimit);
      if (typeof settings.autoBots === 'boolean') gameState.autoBots = settings.autoBots;
      updateBotBalance();
      io.emit('settings_updated', {
        scoreLimit: gameState.scoreLimit,
        timeLimit: gameState.timeLimit,
        autoBots: gameState.autoBots
      });
    }
  });

  // Ping kontrolü
  socket.on('ping_check', (clientTimestamp) => {
    socket.emit('pong_check', clientTimestamp);
  });

  socket.on('client_ping_result', (ping) => {
    newPlayer.ping = Math.round(ping);
  });

  // Ayrılma
  socket.on('disconnect', () => {
    console.log(`[Ayrılma] ${newPlayer.name} ayrıldı.`);
    leaveParty(socket.id);
    delete gameState.players[socket.id];
    updateBotBalance();
  });
});

// Sunucuyu Başlat
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`⚽ HAXBALL PRO MULTIPLAYER SUNUCUSU BAŞLATILDI!`);
  console.log(`> Yerel Bağlantı:   http://localhost:${PORT}`);
  console.log(`> Ağ Bağlantısı:    http://${LOCAL_IP}:${PORT}`);
  console.log(`> ELO & Bot & Parti Sistemleri Aktif!`);
  console.log(`===============================================`);
});
