// Haxball Pro Arena - Client Engine
(() => {
  'use strict';

  // Canvas roundRect Polyfill
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      if (typeof r === 'undefined') r = 0;
      if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
      this.beginPath();
      this.moveTo(x + (r.tl || 0), y);
      this.lineTo(x + w - (r.tr || 0), y);
      this.quadraticCurveTo(x + w, y, x + w, y + (r.tr || 0));
      this.lineTo(x + w, y + h - (r.br || 0));
      this.quadraticCurveTo(x + w, y + h, x + w - (r.br || 0), y + h);
      this.lineTo(x + (r.bl || 0), y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - (r.bl || 0));
      this.lineTo(x, y + (r.tl || 0));
      this.quadraticCurveTo(x, y, x + (r.tl || 0), y);
      this.closePath();
      return this;
    };
  }

  // --- SES SİSTEMİ (WEB AUDIO API) ---
  class SoundSystem {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('haxball_muted') === 'true';
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      localStorage.setItem('haxball_muted', this.muted);
      return this.muted;
    }

    playKick() {
      if (this.muted) return;
      this.init();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    playBounce() {
      if (this.muted) return;
      this.init();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    playPost() {
      if (this.muted) return;
      this.init();
      const t = this.ctx.currentTime;
      [880, 1760].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.35 / (idx + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    }

    playWhistle(duration = 0.4) {
      if (this.muted) return;
      this.init();
      const t = this.ctx.currentTime;
      [2800, 3150].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
      });
    }

    playTripleWhistle() {
      if (this.muted) return;
      this.playWhistle(0.2);
      setTimeout(() => this.playWhistle(0.2), 250);
      setTimeout(() => this.playWhistle(0.5), 500);
    }

    playCountdownBeep() {
      if (this.muted) return;
      this.init();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    playGoalHorn() {
      if (this.muted) return;
      this.init();
      const t = this.ctx.currentTime;
      [349.23, 466.16].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 1.2);
      });
    }

    // Coşkulu Taraftar Tezahüratı ve Uğultusu (Crowd Cheer Roar)
    playCrowdCheer() {
      if (this.muted) return;
      this.init();
      const t = this.ctx.currentTime;
      const duration = 3.6;

      // 1. Çok Katmanlı Pembe/Beyaz Gürültü (Binlerce Kişilik Stadyum Uğultusu)
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02; // Pembe gürültü filtresi
        data[i] = lastOut * 3.2;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // İnsan sesi formants (400Hz, 850Hz, 1500Hz)
      [420, 850, 1500].forEach((freq, idx) => {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, t);
        filter.Q.setValueAtTime(2.6, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.exponentialRampToValueAtTime(0.28 / (idx + 1), t + 0.35); // Hızlı yükseliş
        gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), t + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
      });

      noise.start(t);
      noise.stop(t + duration);

      // 2. Coşkulu Taraftar Trompetleri ("OLE OLE OLE OLE!")
      const trumpetNotes = [
        { freq: 392.00, start: 0.1, dur: 0.28 },  // Sol
        { freq: 440.00, start: 0.42, dur: 0.28 }, // La
        { freq: 523.25, start: 0.75, dur: 0.45 }, // Do
        { freq: 659.25, start: 1.35, dur: 0.65 }  // Mi (Zirve coşku)
      ];

      trumpetNotes.forEach(n => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, t + n.start);

        g.gain.setValueAtTime(0.001, t + n.start);
        g.gain.linearRampToValueAtTime(0.16, t + n.start + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);

        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t + n.start);
        osc.stop(t + n.start + n.dur);
      });
    }
  }

  const sound = new SoundSystem();

  // --- STADYUM TARAFTARLARI VE TRİBÜN YÖNETİMİ ---
  class CrowdManager {
    constructor() {
      this.fans = [];
      this.excitement = 0; // 0: normal, 1.0: gol kutlaması!
      this.scoringTeam = null;
      this.flashes = [];
      this.confetti = [];
      this.initFans();
    }

    initFans() {
      // 1. Üst Tribün (Kuzey Tribünü - 3 Sıra)
      for (let row = 0; row < 3; row++) {
        const y = 14 + row * 20;
        const count = 42;
        for (let i = 0; i < count; i++) {
          const x = 152 + (i / count) * 796 + (Math.random() * 6 - 3);
          const teamPref = x < 550 ? 'red' : 'blue';
          this.fans.push(this.createFan(x, y, teamPref));
        }
      }

      // 2. Alt Tribün (Güney Tribünü - 3 Sıra)
      for (let row = 0; row < 3; row++) {
        const y = 536 + row * 20;
        const count = 42;
        for (let i = 0; i < count; i++) {
          const x = 152 + (i / count) * 796 + (Math.random() * 6 - 3);
          const teamPref = x < 550 ? 'red' : 'blue';
          this.fans.push(this.createFan(x, y, teamPref));
        }
      }

      // 3. Sol Tribün (Kırmızı Takım Kale Arkası - Ateşli Kırmızı Taraftarlar)
      for (let col = 0; col < 3; col++) {
        const x = 20 + col * 20;
        const count = 26;
        for (let i = 0; i < count; i++) {
          const y = 80 + (i / count) * 440;
          this.fans.push(this.createFan(x, y, 'red'));
        }
      }

      // 4. Sağ Tribün (Mavi Takım Kale Arkası - Coşkulu Mavi Taraftarlar)
      for (let col = 0; col < 3; col++) {
        const x = 1025 + col * 20;
        const count = 26;
        for (let i = 0; i < count; i++) {
          const y = 80 + (i / count) * 440;
          this.fans.push(this.createFan(x, y, 'blue'));
        }
      }
    }

    createFan(x, y, teamPref) {
      const isRedTeam = teamPref === 'red' ? Math.random() < 0.82 : Math.random() < 0.18;
      const redColors = ['#ef4444', '#dc2626', '#b91c1c', '#f87171', '#ffffff'];
      const blueColors = ['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#ffffff'];
      const colors = isRedTeam ? redColors : blueColors;

      return {
        baseX: x,
        baseY: y,
        x: x,
        y: y,
        color: colors[Math.floor(Math.random() * colors.length)],
        skinColor: ['#fed7aa', '#fde047', '#fbcfe8', '#e2e8f0', '#f5d0fe'][Math.floor(Math.random() * 5)],
        headRadius: 4.5 + Math.random() * 1.5,
        hasFlag: Math.random() < 0.18,
        flagColor: isRedTeam ? '#ef4444' : '#3b82f6',
        animPhase: Math.random() * Math.PI * 2,
        animSpeed: 0.04 + Math.random() * 0.05,
        team: isRedTeam ? 'red' : 'blue',
        jumpOffset: 0,
        armUp: false
      };
    }

    onGoal(team) {
      this.excitement = 1.0;
      this.scoringTeam = team;

      // Konfetiler patlasın
      for (let i = 0; i < 110; i++) {
        const isTeamRed = team === 'red';
        const confettiColors = isTeamRed 
          ? ['#ef4444', '#f59e0b', '#ffffff', '#f87171', '#fbbf24']
          : ['#3b82f6', '#38bdf8', '#ffffff', '#60a5fa', '#93c5fd'];

        this.confetti.push({
          x: Math.random() * 1100,
          y: Math.random() * 100,
          vx: (Math.random() - 0.5) * 5,
          vy: 2.5 + Math.random() * 4.5,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          size: 4 + Math.random() * 4,
          rot: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.25
        });
      }
    }

    update() {
      if (this.excitement > 0) {
        this.excitement -= 0.0035; // Yaklaşık 4.5 saniye sürer
        if (this.excitement < 0) this.excitement = 0;

        // Fotoğraf flaşları
        if (Math.random() < 0.35) {
          const randomFan = this.fans[Math.floor(Math.random() * this.fans.length)];
          this.flashes.push({
            x: randomFan.x,
            y: randomFan.y,
            r: 10 + Math.random() * 14,
            alpha: 1.0
          });
        }
      }

      // Flaşları söndür
      for (let i = this.flashes.length - 1; i >= 0; i--) {
        this.flashes[i].alpha -= 0.12;
        if (this.flashes[i].alpha <= 0) {
          this.flashes.splice(i, 1);
        }
      }

      // Konfetileri düşür
      for (let i = this.confetti.length - 1; i >= 0; i--) {
        const c = this.confetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.rot += c.rotSpeed;
        if (c.y > 600) {
          this.confetti.splice(i, 1);
        }
      }

      // Taraftarların canlı animasyonu
      for (const fan of this.fans) {
        const isScorerFan = fan.team === this.scoringTeam;
        const boost = this.excitement * (isScorerFan ? 2.8 : 1.2);

        fan.animPhase += fan.animSpeed * (1 + boost * 3.5);

        if (this.excitement > 0.05) {
          // GOLDE ÇILGINCA ZIPLAMA VE ELLER HAVAYA!
          fan.jumpOffset = Math.abs(Math.sin(fan.animPhase * 2.2)) * (6 + boost * 7);
          fan.armUp = Math.sin(fan.animPhase * 3) > -0.2;
        } else {
          // NORMAL MAÇTAKİ SALINIM VE UFAK HAREKETLER
          fan.jumpOffset = Math.abs(Math.sin(fan.animPhase)) * 1.8;
          fan.armUp = false;
        }

        fan.y = fan.baseY - fan.jumpOffset;
        fan.x = fan.baseX + Math.sin(fan.animPhase * 0.8) * (1 + boost);
      }
    }

    drawStands(ctx) {
      // 1. Üst Tribün Arka Planı (Koltuk Sıraları)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1100, 78);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      [24, 48, 72].forEach(y => {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1100, y); ctx.stroke();
      });

      // 2. Alt Tribün Arka Planı
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 522, 1100, 78);
      [546, 570, 594].forEach(y => {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1100, y); ctx.stroke();
      });

      // 3. Sol Tribün (Kırmızı)
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 78, 148, 444);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 82, 140, 436);

      // 4. Sağ Tribün (Mavi)
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(952, 78, 148, 444);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(956, 82, 140, 436);

      // 5. Taraftarları Çiz
      for (const fan of this.fans) {
        // Gövde (Forma)
        ctx.fillStyle = fan.color;
        ctx.beginPath();
        ctx.arc(fan.x, fan.y + 6, fan.headRadius * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Kollar havada mı? (Gol coşkusu)
        if (fan.armUp) {
          ctx.fillStyle = fan.skinColor;
          ctx.beginPath();
          ctx.arc(fan.x - 5, fan.y - 3, 2.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(fan.x + 5, fan.y - 3, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Kafa
        ctx.fillStyle = fan.skinColor;
        ctx.beginPath();
        ctx.arc(fan.x, fan.y, fan.headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bayrak Sallama
        if (fan.hasFlag && (this.excitement > 0.1 || Math.sin(fan.animPhase) > 0.4)) {
          const flagAngle = Math.sin(fan.animPhase * 3) * 0.4;
          const fx = fan.x + (fan.team === 'red' ? -7 : 7);
          const fy = fan.y - 7;

          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(flagAngle);

          // Bayrak Sopası
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, 7);
          ctx.lineTo(0, -6);
          ctx.stroke();

          // Bayrak Kumaşı
          ctx.fillStyle = fan.flagColor;
          ctx.fillRect(0, -6, 9, 6);
          ctx.restore();
        }
      }
    }

    drawEffects(ctx) {
      // Fotoğraf Flaşları
      for (const f of this.flashes) {
        ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Konfetiler
      for (const c of this.confetti) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        ctx.restore();
      }
    }
  }

  const crowd = new CrowdManager();

  // --- DOM ELEMENTLERİ ---
  const canvas = document.getElementById('pitch-canvas');
  const ctx = canvas.getContext('2d');

  const redScoreEl = document.getElementById('red-score');
  const blueScoreEl = document.getElementById('blue-score');
  const matchTimerEl = document.getElementById('match-timer');
  const matchStatusEl = document.getElementById('match-status');
  const ruleHintEl = document.getElementById('rule-hint');

  const countRedEl = document.getElementById('count-red');
  const countSpecEl = document.getElementById('count-spec');
  const countBlueEl = document.getElementById('count-blue');

  const btnJoinRed = document.getElementById('btn-join-red');
  const btnJoinSpec = document.getElementById('btn-join-spec');
  const btnJoinBlue = document.getElementById('btn-join-blue');

  const btnStartMatch = document.getElementById('btn-start-match');
  const btnResetMatch = document.getElementById('btn-reset-match');
  const btnToggleBots = document.getElementById('btn-toggle-bots');
  const btnSettings = document.getElementById('btn-settings');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const currentNameDisplay = document.getElementById('current-name-display');
  const currentEloBadge = document.getElementById('current-elo-badge');
  const copyIpBtn = document.getElementById('copy-ip-btn');
  const ipAddressDisplay = document.getElementById('ip-address-display');

  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNumber = document.getElementById('countdown-number');
  const goalBanner = document.getElementById('goal-banner');
  const goalScorerEl = document.getElementById('goal-scorer');
  const gameOverBanner = document.getElementById('game-over-banner');
  const winnerTextEl = document.getElementById('winner-text');
  const finalScoreTextEl = document.getElementById('final-score-text');
  const btnPlayAgain = document.getElementById('btn-play-again');

  // SOHBET (DIŞ PANEL)
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  // PARTİ (GRUP)
  const noPartyView = document.getElementById('no-party-view');
  const activePartyView = document.getElementById('active-party-view');
  const createPartyName = document.getElementById('create-party-name');
  const btnCreateParty = document.getElementById('btn-create-party');
  const joinPartyCode = document.getElementById('join-party-code');
  const btnJoinParty = document.getElementById('btn-join-party');
  const partyDisplayName = document.getElementById('party-display-name');
  const partyCodeText = document.getElementById('party-code-text');
  const btnCopyPartyCode = document.getElementById('btn-copy-party-code');
  const partyMembersUl = document.getElementById('party-members-ul');
  const partyLeaderControls = document.getElementById('party-leader-controls');
  const btnPartyMoveRed = document.getElementById('btn-party-move-red');
  const btnPartyMoveBlue = document.getElementById('btn-party-move-blue');
  const btnLeaveParty = document.getElementById('btn-leave-party');

  // ELO & LİDERLİK TABLOSU
  const myTierIcon = document.getElementById('my-tier-icon');
  const myTierText = document.getElementById('my-tier-text');
  const myEloVal = document.getElementById('my-elo-val');
  const myWinsCount = document.getElementById('my-wins-count');
  const myLossCount = document.getElementById('my-loss-count');
  const myGoalsCount = document.getElementById('my-goals-count');
  const leaderboardBody = document.getElementById('leaderboard-body');

  // MODALLAR
  const nameModal = document.getElementById('name-modal');
  const nameForm = document.getElementById('name-form');
  const nicknameInput = document.getElementById('nickname-input');
  const closeNameModalBtn = document.getElementById('close-name-modal');

  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const scoreLimitSelect = document.getElementById('score-limit-select');
  const timeLimitSelect = document.getElementById('time-limit-select');
  const autoBotsCheck = document.getElementById('auto-bots-check');

  // --- OYUN DEĞİŞKENLERİ ---
  let socket = null;
  let myPlayerId = null;
  let myNickname = localStorage.getItem('haxball_nick') || '';
  let myTeam = 'spec';
  let myElo = 1000;
  let serverPitch = null;
  let serverPosts = [];
  let localServerUrl = '';
  let autoBotsEnabled = true;

  let targetState = null;

  const keyState = {
    up: false,
    down: false,
    left: false,
    right: false,
    kick: false
  };

  // --- YARDIMCI TIER FONKSİYONU ---
  function getTierInfo(elo) {
    if (elo >= 1600) return { icon: '👑', text: 'USTA / EFSANE' };
    if (elo >= 1400) return { icon: '💎', text: 'PLATİN KADEME' };
    if (elo >= 1200) return { icon: '🥇', text: 'ALTIN KADEME' };
    if (elo >= 1000) return { icon: '🥈', text: 'GÜMÜŞ KADEME' };
    return { icon: '🥉', text: 'BRONZ KADEME' };
  }

  function updateMyEloDisplay(elo, stats = null) {
    myElo = elo || 1000;
    const tier = getTierInfo(myElo);
    myTierIcon.textContent = tier.icon;
    myTierText.textContent = tier.text;
    myEloVal.textContent = myElo;
    currentEloBadge.textContent = `${myElo} ELO`;

    if (stats) {
      myWinsCount.textContent = stats.wins || 0;
      myLossCount.textContent = stats.losses || 0;
      myGoalsCount.textContent = stats.goals || 0;
    }
  }

  // --- SEKME GEÇİŞLERİ (SIDEBAR TABS) ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // --- İSİM YÖNETİMİ ---
  if (myNickname) {
    nicknameInput.value = myNickname;
    currentNameDisplay.textContent = myNickname;
  }

  const radioCards = document.querySelectorAll('.radio-card');
  radioCards.forEach(card => {
    card.addEventListener('click', () => {
      radioCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // --- SOCKET.IO BAĞLANTISI ---
  socket = io();

  socket.on('connect', () => {
    console.log('[Socket] Sunucuya bağlanıldı. ID:', socket.id);
    startPingMeasurement();
  });

  socket.on('init_pitch', (data) => {
    serverPitch = data.pitch;
    serverPosts = data.posts;
    myPlayerId = data.playerId;
    localServerUrl = `http://${data.localIp}:${data.port}`;
    ipAddressDisplay.textContent = `${data.localIp}:${data.port}`;
    autoBotsEnabled = data.settings ? data.settings.autoBots : true;

    if (data.elo) updateMyEloDisplay(data.elo);
    if (data.settings) {
      updateRuleHint(data.settings.scoreLimit, data.settings.timeLimit, data.settings.autoBots);
      autoBotsCheck.checked = !!data.settings.autoBots;
      updateBotBtnUI(data.settings.autoBots);
    }
    if (data.leaderboard) {
      renderLeaderboard(data.leaderboard);
    }
  });

  // Durum Yayını (60 FPS)
  socket.on('state', (state) => {
    targetState = state;
    updateHUD(state);
  });

  // Ses Olayları
  socket.on('sound', (s) => {
    switch (s.type) {
      case 'kick': sound.playKick(); break;
      case 'bounce': sound.playBounce(); break;
      case 'post': sound.playPost(); break;
      case 'whistle': sound.playWhistle(0.6); break;
      case 'whistle_short': sound.playWhistle(0.3); break;
      case 'whistle_triple': sound.playTripleWhistle(); break;
      case 'countdown_beep': sound.playCountdownBeep(); break;
      case 'goal': 
        sound.playGoalHorn(); 
        sound.playCrowdCheer(); 
        break;
    }
  });

  // Gol
  socket.on('goal_event', (data) => {
    goalScorerEl.textContent = data.scorer || 'Oyuncu';
    goalBanner.classList.remove('hidden');
    crowd.onGoal(data.team);
    sound.playGoalHorn();
    sound.playCrowdCheer();
    setTimeout(() => { goalBanner.classList.add('hidden'); }, 2800);
  });

  // Maç Sonu
  socket.on('match_ended', (data) => {
    winnerTextEl.textContent = `${data.winner} KAZANDI!`;
    finalScoreTextEl.textContent = `${data.redScore} - ${data.blueScore}`;
    gameOverBanner.classList.remove('hidden');
  });

  // Sohbet Mesajı (Dış panelde)
  socket.on('chat_broadcast', (msg) => {
    addChatMessage(msg);
  });

  // Sistem Mesajı (Yalnızca "Maç Bitti" ve "GOOOL" skorer yazısı sohbete düşer)
  socket.on('system_message', (msg) => {
    if (msg && (msg.isMatchEnd || msg.isGoal || (typeof msg.text === 'string' && (msg.text.includes('MAÇ BİTTİ') || msg.text.includes('GOOOOL'))))) {
      addSystemMessage(msg.text, msg.isGoal);
    }
  });

  // ELO Güncellemesi
  socket.on('elo_updated', (data) => {
    updateMyEloDisplay(data.elo);
  });

  // Liderlik Tablosu Güncellemesi
  socket.on('leaderboard_update', (list) => {
    renderLeaderboard(list);
  });

  // Parti Durumu
  socket.on('party_state', (pState) => {
    if (pState.inParty) {
      noPartyView.classList.add('hidden');
      activePartyView.classList.remove('hidden');
      partyDisplayName.textContent = pState.name;
      partyCodeText.textContent = pState.code;

      partyMembersUl.innerHTML = '';
      (pState.members || []).forEach(mName => {
        const li = document.createElement('li');
        li.className = 'party-member-item';
        li.innerHTML = `<span>👤 ${escapeHtml(mName)}</span>`;
        partyMembersUl.appendChild(li);
      });

      partyLeaderControls.style.display = pState.isLeader ? 'block' : 'none';
    } else {
      noPartyView.classList.remove('hidden');
      activePartyView.classList.add('hidden');
    }
  });

  socket.on('party_error', (errMsg) => {
    alert(errMsg);
  });

  // Ayarlar Güncellendi
  socket.on('settings_updated', (st) => {
    autoBotsEnabled = st.autoBots;
    updateRuleHint(st.scoreLimit, st.timeLimit, st.autoBots);
    updateBotBtnUI(st.autoBots);
  });

  function startPingMeasurement() {
    setInterval(() => {
      const sendTime = performance.now();
      socket.emit('ping_check', sendTime);
    }, 2000);

    socket.on('pong_check', (sentTime) => {
      const rtt = performance.now() - sentTime;
      socket.emit('client_ping_result', rtt);
    });
  }

  // --- GİRDİ YÖNETİMİ (YAZI ALANLARINDA ASLA ENGELLEME YAPMAZ) ---
  function sendInputs() {
    socket.emit('inputs', keyState);
  }

  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
      if (document.activeElement === chatInput && e.key === 'Escape') {
        chatInput.blur();
      }
      return;
    }

    let changed = false;

    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      if (!keyState.up) { keyState.up = true; changed = true; }
      e.preventDefault();
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      if (!keyState.down) { keyState.down = true; changed = true; }
      e.preventDefault();
    } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      if (!keyState.left) { keyState.left = true; changed = true; }
      e.preventDefault();
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      if (!keyState.right) { keyState.right = true; changed = true; }
      e.preventDefault();
    } else if (e.code === 'Space' || e.code === 'KeyX') {
      if (!keyState.kick) { keyState.kick = true; changed = true; }
      e.preventDefault();
    } else if (e.code === 'Enter') {
      // Sohbet sekmesine geç ve kutuyu odakla
      document.querySelector('.tab-btn[data-tab="tab-chat"]').click();
      chatInput.focus();
      e.preventDefault();
    }

    if (changed) sendInputs();
  });

  window.addEventListener('keyup', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;

    let changed = false;

    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      if (keyState.up) { keyState.up = false; changed = true; }
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      if (keyState.down) { keyState.down = false; changed = true; }
    } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      if (keyState.left) { keyState.left = false; changed = true; }
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      if (keyState.right) { keyState.right = false; changed = true; }
    } else if (e.code === 'Space' || e.code === 'KeyX') {
      if (keyState.kick) { keyState.kick = false; changed = true; }
    }

    if (changed) sendInputs();
  });

  window.addEventListener('blur', () => {
    keyState.up = false;
    keyState.down = false;
    keyState.left = false;
    keyState.right = false;
    keyState.kick = false;
    sendInputs();
  });

  // --- İSİM SEÇİM FORMU ---
  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = nicknameInput.value.trim().substring(0, 14);
    if (!entered) return;

    myNickname = entered;
    localStorage.setItem('haxball_nick', myNickname);
    currentNameDisplay.textContent = myNickname;

    socket.emit('set_name', myNickname);

    const selectedTeamRadio = document.querySelector('input[name="init-team"]:checked');
    const chosenTeam = selectedTeamRadio ? selectedTeamRadio.value : 'spec';
    selectTeam(chosenTeam);

    nameModal.classList.add('hidden');
    sound.init();
  });

  document.getElementById('player-profile-btn').addEventListener('click', () => {
    closeNameModalBtn.classList.remove('hidden');
    nameModal.classList.remove('hidden');
    nicknameInput.focus();
    nicknameInput.select();
  });

  closeNameModalBtn.addEventListener('click', () => {
    nameModal.classList.add('hidden');
  });

  // --- TAKIM DEĞİŞTİRME BUTONLARI ---
  function selectTeam(team) {
    myTeam = team;
    socket.emit('join_team', team);

    btnJoinRed.classList.toggle('active', team === 'red');
    btnJoinSpec.classList.toggle('active', team === 'spec');
    btnJoinBlue.classList.toggle('active', team === 'blue');
  }

  btnJoinRed.addEventListener('click', () => selectTeam('red'));
  btnJoinSpec.addEventListener('click', () => selectTeam('spec'));
  btnJoinBlue.addEventListener('click', () => selectTeam('blue'));

  // --- MAÇ VE BOT KONTROLLERİ ---
  btnStartMatch.addEventListener('click', () => {
    sound.init();
    socket.emit('start_match');
  });

  btnResetMatch.addEventListener('click', () => {
    socket.emit('reset_match');
  });

  btnToggleBots.addEventListener('click', () => {
    socket.emit('toggle_bots');
  });

  function updateBotBtnUI(isOpen) {
    if (isOpen) {
      btnToggleBots.classList.remove('disabled');
      btnToggleBots.textContent = '🤖 Botlar: Açık';
    } else {
      btnToggleBots.classList.add('disabled');
      btnToggleBots.textContent = '🤖 Botlar: Kapalı';
    }
  }

  btnPlayAgain.addEventListener('click', () => {
    gameOverBanner.classList.add('hidden');
    socket.emit('start_match');
  });

  // Ses Aç / Kapat
  function updateSoundBtn() {
    btnSoundToggle.textContent = sound.muted ? '🔇' : '🔊';
    btnSoundToggle.title = sound.muted ? 'Sesi Aç' : 'Sesi Kapat';
  }
  updateSoundBtn();

  btnSoundToggle.addEventListener('click', () => {
    sound.toggleMute();
    updateSoundBtn();
  });

  // IP Kopyalama
  copyIpBtn.addEventListener('click', () => {
    const textToCopy = localServerUrl || window.location.href;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const orig = ipAddressDisplay.textContent;
      ipAddressDisplay.textContent = 'KOPYALANDI! 🚀';
      setTimeout(() => { ipAddressDisplay.textContent = orig; }, 1500);
    });
  });

  // Ayarlar Modal
  btnSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  btnSaveSettings.addEventListener('click', () => {
    const scoreLimit = parseInt(scoreLimitSelect.value, 10);
    const timeLimit = parseInt(timeLimitSelect.value, 10);
    const autoBots = autoBotsCheck.checked;
    socket.emit('update_settings', { scoreLimit, timeLimit, autoBots });
    settingsModal.classList.add('hidden');
  });

  function updateRuleHint(scoreLimit, timeLimit, bots) {
    const goalText = scoreLimit > 0 ? `${scoreLimit} Gol` : 'Limitsiz Gol';
    const timeText = timeLimit > 0 ? `${timeLimit / 60} Dk` : 'Limitsiz Süre';
    const botText = bots ? 'Botlar: Açık' : 'Botlar: Kapalı';
    ruleHintEl.textContent = `Hedef: ${goalText} | ${timeText} | ${botText}`;
  }

  // --- SOHBET YÖNETİMİ (DIŞ PANEL) ---
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg) {
      socket.emit('chat_message', msg);
      chatInput.value = '';
    }
    chatInput.focus();
  });

  function addChatMessage(data) {
    const el = document.createElement('div');
    el.className = `chat-msg ${data.team}`;

    let partyHtml = data.party ? `<span class="party-tag-in-chat">[${escapeHtml(data.party)}]</span>` : '';
    let eloHtml = `<span class="elo-tag-in-chat">(${data.elo || 1000})</span>`;

    el.innerHTML = `${partyHtml}<span class="chat-sender ${data.team}">${escapeHtml(data.name)}</span> ${eloHtml}: ${escapeHtml(data.text)}`;
    chatMessages.appendChild(el);
    pruneChat();
    // Otomatik alta kaydır
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  function addSystemMessage(text, isGoal = false) {
    const el = document.createElement('div');
    el.className = `chat-msg system ${isGoal ? 'goal' : ''}`;
    el.textContent = text;
    chatMessages.appendChild(el);
    pruneChat();
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  function pruneChat() {
    while (chatMessages.children.length > 50) {
      chatMessages.removeChild(chatMessages.firstChild);
    }
  }

  // --- PARTİ SİSTEMİ ETKİLEŞİMLERİ ---
  btnCreateParty.addEventListener('click', () => {
    const pName = createPartyName.value.trim() || 'Takım';
    socket.emit('create_party', pName);
  });

  btnJoinParty.addEventListener('click', () => {
    const pCode = joinPartyCode.value.trim();
    if (pCode) {
      socket.emit('join_party', pCode);
    }
  });

  btnLeaveParty.addEventListener('click', () => {
    socket.emit('leave_party');
  });

  btnPartyMoveRed.addEventListener('click', () => {
    socket.emit('join_team', 'red');
  });

  btnPartyMoveBlue.addEventListener('click', () => {
    socket.emit('join_team', 'blue');
  });

  btnCopyPartyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(partyCodeText.textContent).then(() => {
      alert(`Parti Kodu (${partyCodeText.textContent}) panoya kopyalandı!`);
    });
  });

  // --- LİDERLİK TABLOSU RENDER ---
  function renderLeaderboard(list) {
    leaderboardBody.innerHTML = '';
    if (!list || list.length === 0) {
      leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Henüz kayıt yok</td></tr>';
      return;
    }

    list.forEach((item, index) => {
      const tr = document.createElement('tr');
      const isMe = item.name === myNickname;
      if (isMe) {
        tr.style.background = 'rgba(56, 189, 248, 0.15)';
        updateMyEloDisplay(item.elo, item);
      }

      const tier = getTierInfo(item.elo);
      tr.innerHTML = `
        <td><b>#${index + 1}</b></td>
        <td>${tier.icon} <b>${escapeHtml(item.name)}</b></td>
        <td><b style="color:#f59e0b;">${item.elo}</b></td>
        <td><span style="color:#10b981;">${item.wins}</span> / <span style="color:#ef4444;">${item.losses}</span></td>
      `;
      leaderboardBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- HUD GÜNCELLEMESİ ---
  function updateHUD(state) {
    redScoreEl.textContent = state.redScore;
    blueScoreEl.textContent = state.blueScore;

    const m = Math.floor(state.matchTime / 60).toString().padStart(2, '0');
    const s = (state.matchTime % 60).toString().padStart(2, '0');
    matchTimerEl.textContent = `${m}:${s}`;

    matchStatusEl.className = 'status-badge ' + state.status.toLowerCase();
    switch (state.status) {
      case 'WAITING':
        matchStatusEl.textContent = 'HAZIRLIK';
        countdownOverlay.classList.add('hidden');
        gameOverBanner.classList.add('hidden');
        break;
      case 'COUNTDOWN':
        matchStatusEl.textContent = 'SANTRA';
        countdownOverlay.classList.remove('hidden');
        countdownNumber.textContent = state.countdown > 0 ? state.countdown : 'BAŞLA!';
        break;
      case 'PLAYING':
        matchStatusEl.textContent = 'CANLI MAÇ';
        countdownOverlay.classList.add('hidden');
        gameOverBanner.classList.add('hidden');
        break;
      case 'GOAL':
        matchStatusEl.textContent = 'GOL';
        break;
      case 'ENDED':
        matchStatusEl.textContent = 'BİTTİ';
        break;
    }

    let redCount = 0;
    let blueCount = 0;
    let specCount = 0;

    for (const id in state.players) {
      const p = state.players[id];
      if (p.team === 'red') redCount++;
      else if (p.team === 'blue') blueCount++;
      else specCount++;
    }

    countRedEl.textContent = `(${redCount})`;
    countBlueEl.textContent = `(${blueCount})`;
    countSpecEl.textContent = `(${specCount})`;
  }

  // --- MOBİL DOKUNMATİK KONTROLLER ---
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const touchControls = document.getElementById('touch-controls');
    touchControls.classList.remove('hidden');

    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const touchKickBtn = document.getElementById('touch-kick-btn');

    let touchId = null;
    let startX = 0;
    let startY = 0;

    joystickZone.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      const rect = joystickZone.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
      handleJoystick(touch.clientX, touch.clientY);
    });

    joystickZone.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          handleJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    });

    const resetJoystick = () => {
      touchId = null;
      joystickKnob.style.transform = 'translate(0px, 0px)';
      keyState.up = false;
      keyState.down = false;
      keyState.left = false;
      keyState.right = false;
      sendInputs();
    };

    joystickZone.addEventListener('touchend', resetJoystick);
    joystickZone.addEventListener('touchcancel', resetJoystick);

    function handleJoystick(clientX, clientY) {
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dist = Math.hypot(dx, dy);
      const maxR = 36;
      const clampedDist = Math.min(dist, maxR);
      const angle = Math.atan2(dy, dx);

      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;

      keyState.left = dx < -12;
      keyState.right = dx > 12;
      keyState.up = dy < -12;
      keyState.down = dy > 12;
      sendInputs();
    }

    touchKickBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      keyState.kick = true;
      sendInputs();
    });

    touchKickBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      keyState.kick = false;
      sendInputs();
    });
  }

  // --- ÇİZİM VE RENDER MOTORU ---
  function render() {
    requestAnimationFrame(render);

    if (!targetState || !serverPitch) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('Stadyum Yükleniyor...', canvas.width / 2, canvas.height / 2);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Tribünler ve Taraftarları Çiz (Sahanın etrafı)
    crowd.update();
    crowd.drawStands(ctx);

    // 2. Sahayı Çiz
    drawStadium(serverPitch, serverPosts);

    // 3. Oyuncuları Çiz
    for (const id in targetState.players) {
      const player = targetState.players[id];
      if (player.team !== 'spec') {
        drawPlayer(player, id === myPlayerId);
      }
    }

    // 4. Topu Çiz
    drawBall(targetState.ball);

    // 5. Gol Flaşları ve Konfetileri Sahanın Üzerinde Çiz
    crowd.drawEffects(ctx);
  }

  function drawStadium(pitch, posts) {
    // Saha Dış Kenar Bordürü (Yeşil Çim Zemin)
    ctx.fillStyle = '#164e29';
    ctx.fillRect(pitch.leftNetX - 4, pitch.minY - 4, (pitch.rightNetX - pitch.leftNetX) + 8, (pitch.maxY - pitch.minY) + 8);

    ctx.save();
    roundedPitchPath(ctx, pitch);
    ctx.clip();

    // Biçilmiş Çim Deseni
    const stripeCount = 14;
    const stripeWidth = (pitch.maxX - pitch.minX) / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = (i % 2 === 0) ? '#247a46' : '#2d8b51';
      ctx.fillRect(pitch.minX + i * stripeWidth, pitch.minY, stripeWidth, pitch.maxY - pitch.minY);
    }

    // Saha Çizgileri
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pitch.centerX, pitch.minY);
    ctx.lineTo(pitch.centerX, pitch.maxY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pitch.centerX, pitch.centerY, pitch.centerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(pitch.centerX, pitch.centerY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Ceza Sahaları
    ctx.strokeRect(pitch.minX, pitch.centerY - 100, 100, 200);
    ctx.strokeRect(pitch.maxX - 100, pitch.centerY - 100, 100, 200);

    ctx.restore();

    // Kaleler
    drawGoalNet(pitch.leftNetX, pitch.goalTopY, pitch.minX - pitch.leftNetX, pitch.goalBottomY - pitch.goalTopY, 'left');
    drawGoalNet(pitch.maxX, pitch.goalTopY, pitch.rightNetX - pitch.maxX, pitch.goalBottomY - pitch.goalTopY, 'right');

    // Direkler
    for (const post of posts) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(post.x, post.y + 3, pitch.postRadius + 1, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createRadialGradient(post.x - 3, post.y - 3, 2, post.x, post.y, pitch.postRadius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#cbd5e1');
      grad.addColorStop(1, '#64748b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(post.x, post.y, pitch.postRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function roundedPitchPath(c, p) {
    const r = p.cornerRadius;
    c.beginPath();
    c.moveTo(p.minX + r, p.minY);
    c.lineTo(p.maxX - r, p.minY);
    c.arcTo(p.maxX, p.minY, p.maxX, p.minY + r, r);
    c.lineTo(p.maxX, p.maxY - r);
    c.arcTo(p.maxX, p.maxY, p.maxX - r, p.maxY, r);
    c.lineTo(p.minX + r, p.maxY);
    c.arcTo(p.minX, p.maxY, p.minX, p.maxY - r, r);
    c.lineTo(p.minX, p.minY + r);
    c.arcTo(p.minX, p.minY, p.minX + r, p.minY, r);
    c.closePath();
  }

  function drawGoalNet(x, y, w, h, side) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 30, 45, 0.5)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;

    const step = 8;
    for (let gx = x; gx <= x + w; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }

    for (let gy = y; gy <= y + h; gy += step) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = side === 'left' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.restore();
  }

  // Oyuncu / Bot Diski Çizimi
  function drawPlayer(player, isMe) {
    const r = 16;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(player.x, player.y + 4, r + 1, 0, Math.PI * 2);
    ctx.fill();

    // Şut Dalgası
    if (player.isKicking) {
      ctx.strokeStyle = player.isBot ? '#38bdf8' : '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Disk Rengi
    const isRed = player.team === 'red';
    const grad = ctx.createRadialGradient(player.x - 4, player.y - 4, 3, player.x, player.y, r);

    if (isRed) {
      grad.addColorStop(0, '#f87171');
      grad.addColorStop(0.6, '#ef4444');
      grad.addColorStop(1, '#991b1b');
    } else {
      grad.addColorStop(0, '#60a5fa');
      grad.addColorStop(0.6, '#3b82f6');
      grad.addColorStop(1, '#1e40af');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Çerçeve
    ctx.strokeStyle = player.isBot ? '#0284c7' : (isMe ? '#fef08a' : '#ffffff');
    ctx.lineWidth = isMe ? 2.5 : 2;
    ctx.stroke();

    // Numara / Bot Simgesi
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (player.isBot) {
      ctx.fillText(player.role === 'gk' ? '🧤' : '🤖', player.x, player.y);
    } else {
      const initial = (player.name || '?').charAt(0).toUpperCase();
      ctx.fillText(initial, player.x, player.y);
    }

    // Kendi Oyuncumuzu Gösteren Ok
    if (isMe) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - r - 12);
      ctx.lineTo(player.x - 5, player.y - r - 18);
      ctx.lineTo(player.x + 5, player.y - r - 18);
      ctx.closePath();
      ctx.fill();
    }

    // İsim, Parti ve ELO Etiketi
    drawPlayerBadge(player.x, player.y - r - 6, player, isMe);

    ctx.restore();
  }

  function drawPlayerBadge(x, y, player, isMe) {
    ctx.save();
    ctx.font = 'bold 11px Outfit, sans-serif';

    let label = player.name;
    if (player.party) {
      label = `[${player.party}] ${player.name}`;
    }
    if (player.elo && !player.isBot) {
      label += ` (${player.elo})`;
    }

    const textWidth = ctx.measureText(label).width;
    const paddingX = 6;
    const badgeW = textWidth + paddingX * 2;
    const badgeH = 15;

    ctx.fillStyle = player.isBot ? 'rgba(15, 23, 42, 0.9)' : 'rgba(10, 14, 23, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - badgeW / 2, y - badgeH, badgeW, badgeH, 4);
    ctx.fill();

    ctx.strokeStyle = player.isBot ? '#0284c7' : (isMe ? '#fef08a' : (player.team === 'red' ? '#f87171' : '#60a5fa'));
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isMe ? '#fef08a' : (player.isBot ? '#38bdf8' : '#ffffff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - badgeH / 2);
    ctx.restore();
  }

  function drawBall(ball) {
    const r = ball.radius || 10.5;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y + 4, r + 0.5, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 2, ball.x, ball.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e2e8f0');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    const sides = 5;
    const innerR = r * 0.42;
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const px = ball.x + Math.cos(a) * innerR;
      const py = ball.y + Math.sin(a) * innerR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  requestAnimationFrame(render);
})();
