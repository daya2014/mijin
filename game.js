const ITEMS = [
  { name: "旧电池", value: 50, quality: "白" },
  { name: "绷带", value: 120, quality: "白" },
  { name: "手电", value: 200, quality: "绿" },
  { name: "弹匣", value: 350, quality: "绿" },
  { name: "军用电台", value: 800, quality: "蓝" },
  { name: "显卡", value: 1500, quality: "紫" },
  { name: "黑匣子", value: 3000, quality: "金" },
  { name: "曼德尔超算", value: 5000, quality: "红" }
];

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // 先用色块占位，后面换成图片
    this.make.graphics({ x: 0, y: 0, add: false })
      .fillStyle(0x4caf50).fillRect(0, 0, 32, 32)
      .generateTexture("player", 32, 32);

    this.make.graphics({ x: 0, y: 0, add: false })
      .fillStyle(0xff9800).fillRect(0, 0, 40, 40)
      .generateTexture("box", 40, 40);

    this.make.graphics({ x: 0, y: 0, add: false })
      .fillStyle(0x2196f3).fillRect(0, 0, 48, 48)
      .generateTexture("exit", 48, 48);
  }

  create() {
    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.cameras.main.setBounds(0, 0, 1600, 1200);

    this.add.rectangle(800, 600, 1600, 1200, 0x222222);

    this.player = this.physics.add.sprite(200, 200, "player");
    this.player.setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({ w: "W", a: "A", s: "S", d: "D", e: "E" });

    this.boxes = this.physics.add.group();
    for (let i = 0; i < 8; i++) {
      let x, y;
      do {
        x = Phaser.Math.Between(200, 1400);
        y = Phaser.Math.Between(200, 1000);
      } while (Phaser.Math.Distance.Between(x, y, 1500, 1100) < 150);
      const box = this.boxes.create(x, y, "box");
      box.setImmovable(true);
      box.setData("searched", false);
    }

    this.exit = this.physics.add.sprite(1500, 1100, "exit");
    this.exit.setDisplaySize(70, 70);
    this.exit.setImmovable(true);

    this.backpack = [];
    this.value = 0;

    this.hudText = this.add.text(16, 16, "", {
      font: "18px monospace",
      fill: "#ffffff",
      backgroundColor: "#00000099",
      padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(100);

    this.msgText = this.add.text(400, 560, "", {
      font: "20px monospace",
      fill: "#ffeb3b",
      backgroundColor: "#000000cc",
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setOrigin(0.5, 0.5).setDepth(100);

    this.timeLeft = 180;
    this.timerText = this.add.text(600, 16, "", {
      font: "20px monospace",
      fill: "#ff5252",
      backgroundColor: "#00000099",
      padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(100);

    this.timeEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        if (this.timeLeft <= 0) this.endGame(false);
      },
      loop: true
    });

    this.gameOver = false;
  }

  update() {
    if (this.gameOver) return;

    const speed = 220;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown || this.keys.a.isDown) this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown || this.keys.d.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown || this.keys.w.isDown) this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown || this.keys.s.isDown) this.player.setVelocityY(speed);

    let nearBox = null;
    this.boxes.children.iterate((box) => {
      if (!box.active) return;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, box.x, box.y) < 60) {
        nearBox = box;
      }
    });

    const ePressed = Phaser.Input.Keyboard.JustDown(this.keys.e);

    if (ePressed) {
      const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exit.x, this.exit.y) < 70;
      if (nearExit) {
        this.endGame(true);
        return;
      }
      if (nearBox) {
        if (!nearBox.getData("searched")) {
          nearBox.setData("searched", true);
          const item = this.rollItem();
          this.backpack.push(item);
          this.value += item.value;
          this.showMessage(`获得【${item.name}】${item.quality} 价值${item.value}`, 2500);
        } else {
          this.showMessage("箱子已经搜过了", 1500);
        }
      } else {
        this.showMessage("附近没有可搜索的箱子，去蓝色撤离点按 E 撤离", 1500);
      }
    }

    if (nearBox) {
      this.msgText.setText("靠近箱子按 E 搜索");
    }
    const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exit.x, this.exit.y) < 60;
    if (nearExit && Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.endGame(true);
    }

    this.hudText.setText(
      `背包 ${this.backpack.length} 件\n总价值 ${this.value}\n按 E 搜索 / 撤离`
    );

    this.timerText.setText(`撤离倒计时 ${this.timeLeft}s`);
  }

  rollItem() {
    const rand = Math.random();
    let pool;
    if (rand < 0.45) pool = ITEMS.slice(0, 2);
    else if (rand < 0.75) pool = ITEMS.slice(2, 4);
    else if (rand < 0.90) pool = ITEMS.slice(4, 5);
    else if (rand < 0.97) pool = ITEMS.slice(5, 6);
    else pool = ITEMS.slice(6);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  showMessage(text, duration = 2000) {
  this.msgText.setText(text);
  if (this.msgTimer) this.msgTimer.remove();
  this.msgTimer = this.time.delayedCall(duration, () => {
    this.msgText.setText("");
  });
}

  endGame(success) {
    this.gameOver = true;
    this.timeEvent.remove();
    if (success) {
      this.showMessage(`撤离成功！带走 ${this.backpack.length} 件，总价值 ${this.value}`);
    } else {
      this.showMessage(`撤离失败！丢失全部物资，总价值 ${this.value}`);
      this.backpack.length = 0;
      this.value = 0;
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: MainScene
};

const game = new Phaser.Game(config);