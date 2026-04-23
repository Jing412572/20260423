/**
 * @file 期中專案主程式
 * @description 整合 p5.js 的繪圖、DOM 操作、物件導向與狀態管理，
 *              打造一個具有初始畫面與作品集導覽的互動網頁。
 * @author Gemini Code Assist
 */

// --- 全域變數定義 ---

// 1. [資料] 陣列 (Array)：儲存所有作業的標題與連結
let assignments = [
  { title: "Week 1: 基礎圖形", url: "https://jing412572.github.io/20260324-/" },
  { title: "Week 2: 互動設計", url: "https://jing412572.github.io/20260407/" },
  { title: "Week 3: 陣列與迴圈", url: "https://jing412572.github.io/20260421/" }
];

let appState = "START"; // [狀態管理] "START" 初始畫面, "INSTRUCTIONS" 說明畫面, "GALLERY" 導覽畫面
let nodes = []; // [物件] 用來存放所有史萊姆按鈕物件的陣列
let contentIframe; // [DOM] 用來顯示外部網頁的 iframe 元素
let clouds = []; // [物件] 存放天空中的白雲
let sparkles = []; // [物件] 存放滑鼠移動時產生的魔法粒子
let infoPanelExpanded = true; // [狀態管理] 記錄左下角說明面板是否展開
let burstParticles = []; // [物件] 存放點擊時爆發的星星粒子
let flowers = []; // [物件] 存放點擊草原長出的互動花朵

/**
 * p5.js 的初始化函式，在程式啟動時僅執行一次。
 * 主要負責建立畫布、生成 DOM 元素與初始化所有物件。
 */
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 隱藏系統預設游標，我們將在 draw 的最後繪製自訂的魔法棒游標
  noCursor();
  
  // 2. [DOM] 網頁嵌入 (iframe)：使用 p5.dom 的 createElement 動態建立 iframe
  contentIframe = createElement('iframe');
  contentIframe.position(320, 60);
  contentIframe.size(windowWidth - 370, windowHeight - 120);
  contentIframe.style('border', '8px solid #FFF0F5'); // 設定可愛風格的粗白邊框
  contentIframe.style('border-radius', '24px'); // 設定更圓潤的邊角
  contentIframe.style('box-shadow', '0 12px 24px rgba(255, 180, 200, 0.4)'); // 設定粉色系陰影
  
  // 初始時先隱藏 iframe，避免擋到開始畫面
  contentIframe.style('opacity', '0');
  contentIframe.style('pointer-events', 'none');
  
  // 加入淡入淡出的 CSS 轉場動畫設定
  contentIframe.style('transition', 'opacity 0.4s ease-in-out');
  // 監聽 iframe 的 onload 事件，當新網頁載入完成時，將透明度恢復為 1 (觸發淡入效果)
  contentIframe.elt.onload = () => {
    if (appState === "GALLERY") {
      contentIframe.style('opacity', '1');
    }
  };
  
  // 3. [物件導向] For 迴圈與 Class：初始化左側的「果凍史萊姆」按鈕
  let startX = 140;
  let startY = 120;
  let spacing = 130; // 垂直間距 (稍微縮小以容納左下角說明面板)
  let colorStart = color(255, 182, 193); // 漸變起始色 (粉紅)
  let colorEnd = color(173, 216, 230);   // 漸變結束色 (粉藍)
  
  for (let i = 0; i < assignments.length; i++) {
    // 根據按鈕在陣列中的順序，計算出 0.0 到 1.0 之間的比例值
    let amt = assignments.length > 1 ? i / (assignments.length - 1) : 0;
    // 使用 lerpColor 根據比例計算出漸變顏色
    let btnColor = lerpColor(colorStart, colorEnd, amt);
    let y = startY + i * spacing; // 向下排列
    // 建立 BlobButton 的新實例 (instance)，並將其推入 nodes 陣列中管理
    nodes.push(new BlobButton(startX, y, assignments[i], btnColor));
  }
  
  // 4. [陣列與物件] 初始化天空中的白雲
  for (let i = 0; i < 5; i++) {
    clouds.push(new Cloud());
  }
}

/**
 * p5.js 的繪圖迴圈函式，預設以每秒 60 次的頻率不斷執行。
 */
function draw() {
  // 繪製可愛的天空背景
  drawCuteSky();
  
  // 更新與繪製白雲 (放在背景之後，山丘之前)
  for (let cloud of clouds) {
    cloud.update();
    cloud.display();
  }
  
  // 4. Parallax 視差效果：讓場景跟隨滑鼠輕微水平移動
  let offsetX = map(mouseX, 0, width, 15, -15);
  
  // push() 和 pop() 確保 translate() 的位移效果只作用於這兩者之間的繪圖指令
  push();
  translate(offsetX, 0);
  
  // 利用 Vertex 繪製動態的波浪山丘背景
  drawRollingHills();
  
  // 繪製種下的花朵 (放在 translate 之後，讓花朵跟隨山丘一起有視差效果)
  for (let flower of flowers) {
    flower.update();
    flower.display();
  }
  
  if (appState === "GALLERY") {
    // [狀態管理] 僅在導覽模式下，才更新與繪製所有果凍按鈕
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].update(mouseX - offsetX, mouseY); // 傳入滑鼠座標，需扣除 offsetX 來校正因 translate 造成的偏移
      nodes[i].display(); // 呼叫物件自己的繪圖方法
    }
  }
  pop();
  
  // 繪製最上層的 UI
  if (appState === "START") {
    drawStartScreen();
  } else if (appState === "INSTRUCTIONS") {
    drawInstructionsScreen();
  } else if (appState === "GALLERY") {
    // 同步移動 iframe 的 CSS transform 屬性，使其也產生視差效果
    contentIframe.style('transform', `translateX(${offsetX}px)`);
    
    // 繪製左下角的心得與設計理念面板
    drawInfoPanel();
  }
  
  // 繪製滑鼠魔法軌跡 (放在 draw 的最尾端，確保顯示在最上層)
  sparkles.push(new Sparkle(mouseX, mouseY)); // 每一影格都在滑鼠位置產生新粒子
  for (let i = sparkles.length - 1; i >= 0; i--) {
    sparkles[i].update();
    sparkles[i].display();
    // 當粒子完全透明時，將其從陣列中移除，避免陣列無限變大導致卡頓
    if (sparkles[i].alpha <= 0) {
      sparkles.splice(i, 1);
    }
  }
  
  // 繪製點擊爆發的煙火粒子
  for (let i = burstParticles.length - 1; i >= 0; i--) {
    burstParticles[i].update();
    burstParticles[i].display();
    if (burstParticles[i].alpha <= 0) {
      burstParticles.splice(i, 1);
    }
  }
  
  // 繪製自訂的魔法棒游標 (確保在最上層)
  drawMagicWand(mouseX, mouseY);
}

/**
 * p5.js 的滑鼠點擊事件函式，當滑鼠被按下時觸發一次。
 */
function mousePressed() {
  if (appState === "START") {
    // 檢查是否點擊了 Start 史萊姆 (大概的位置與半徑判斷)
    let btnX = width / 2;
    let btnY = height / 2 + 100;
    if (dist(mouseX, mouseY, btnX, btnY) < 80) {
      appState = "INSTRUCTIONS"; // 將狀態切換至 "INSTRUCTIONS"
    }
  } else if (appState === "INSTRUCTIONS") {
    // 檢查是否點擊了說明頁面上的「我明白了！」按鈕
    let btnX = width / 2;
    let btnY = height / 2 + 80;
    let btnW = 150;
    let btnH = 50;
    if (mouseX > btnX - btnW / 2 && mouseX < btnX + btnW / 2 &&
        mouseY > btnY - btnH / 2 && mouseY < btnY + btnH / 2) {
      appState = "GALLERY"; // 切換至導覽畫面
    }
  } else if (appState === "GALLERY") {
    // 檢查是否點擊了左下角的說明面板標題 (標題列高度約為 45)
    let panelW = 280; // 稍微加寬面板，讓文字不擁擠
    let panelH = infoPanelExpanded ? 175 : 45; // 增加展開時的高度，避免壓到下方文字
    let panelX = 30;
    let panelY = height - panelH - 30;
    
    if (mouseX > panelX && mouseX < panelX + panelW && 
        mouseY > panelY && mouseY < panelY + 45) {
      infoPanelExpanded = !infoPanelExpanded; // 切換展開與收合狀態
      return; // 結束點擊事件，避免同時觸發到後方的果凍按鈕
    }

    let isButtonClicked = false; // 用來記錄這次點擊是否按到了史萊姆選單

    // 遍歷所有按鈕，檢查滑鼠是否懸停在其中一個上面
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].isHovered) {
        isButtonClicked = true;
        
        // [狀態重置] 先用一個迴圈將所有按鈕的 active 狀態解除
        for (let j = 0; j < nodes.length; j++) {
          nodes[j].isActive = false;
        }
        // [狀態設定] 再將當前被點擊的按鈕設為 active
        nodes[i].isActive = true;
        
        // [互動特效] 產生煙火爆發粒子
        for (let k = 0; k < 20; k++) {
          burstParticles.push(new BurstParticle(nodes[i].currentX, nodes[i].currentY));
        }
        
        // [轉場動畫] 1. 先將 iframe 變透明，觸發 CSS 的淡出 (Fade out) 動畫
        contentIframe.style('opacity', '0');
        
        // [轉場動畫] 2. 使用 setTimeout 延遲執行，等待淡出動畫結束 (400 毫秒) 後，再切換網址
        setTimeout(() => {
          // 在這裡才把 iframe 的滑鼠事件重新啟用
          contentIframe.style('pointer-events', 'auto'); // 確保 iframe 可以被互動
          // 切換 iframe 的 src 屬性，這會觸發 onload 事件，進而執行淡入動畫
          contentIframe.attribute('src', nodes[i].data.url);
        }, 400);
      }
    }
    
    // [隱藏彩蛋] 如果沒有點擊到任何按鈕，且點擊位置在畫面中下方的草原區，就種下一朵花！
    if (!isButtonClicked && mouseY > height / 2 - 50) {
      let offsetX = map(mouseX, 0, width, 15, -15);
      flowers.push(new Flower(mouseX - offsetX, mouseY));
    }
  }
}

/**
 * p5.js 的視窗縮放事件函式，當瀏覽器視窗大小改變時觸發。
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  contentIframe.size(windowWidth - 370, windowHeight - 120);
}

// --- 可愛天空背景 ---
function drawCuteSky() {
  background(80, 130, 190); // 改為較深的天藍色，讓白色字體更清晰
}

/**
 * 繪製背景的動態柔軟山丘。
 * 使用 `vertex` 和 `sin()` 函數來創造連續且有動畫效果的曲線。
 */
function drawRollingHills() {
  noStroke();
  
  // 後方山丘 (粉綠色)
  fill(152, 251, 152, 150);
  beginShape();
  vertex(-100, height);
  for (let x = -100; x <= width + 100; x += 50) {
    // 利用 sin() 製造山丘的起伏，並加入 frameCount 讓它產生隨時間變化的波動動畫
    let y = height - 120 + sin(x * 0.005 - frameCount * 0.01) * 40;
    vertex(x, y);
  }
  vertex(width + 100, height);
  endShape(CLOSE);
  
  // 前方山丘 (亮綠色)
  fill(144, 238, 144);
  beginShape();
  vertex(-100, height);
  for (let x = -100; x <= width + 100; x += 50) {
    let y = height - 60 + sin(x * 0.008 + frameCount * 0.015) * 30;
    vertex(x, y);
  }
  vertex(width + 100, height);
  endShape(CLOSE);
}

/**
 * 繪製初始畫面 (Start Screen) 的所有內容。
 * 包含標題文字和一個巨大的、可互動的史萊姆啟動按鈕。
 */
function drawStartScreen() {
  push();
  textAlign(CENTER, CENTER);
  
  // 繪製標題文字與陰影
  drawingContext.shadowOffsetY = 4;
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';
  
  fill(255);
  textSize(56);
  textStyle(BOLD);
  text("程式設計期中作品集", width / 2, height / 2 - 80);
  
  textSize(20);
  textStyle(NORMAL);
  text("My Creative Coding Journey", width / 2, height / 2 - 20);
  
  // 繪製巨大的「開始」史萊姆按鈕
  let floatOffset = sin(frameCount * 0.05) * 10; // 上下漂浮的位移量
  let btnX = width / 2;
  let btnY = height / 2 + 100 + floatOffset;
  let r = 80; // 大史萊姆半徑
  
  // 偵測滑鼠是否懸停在開始按鈕上
  let isHovered = dist(mouseX, mouseY, btnX, height / 2 + 100) < r;
  
  // 設定陰影
  drawingContext.shadowOffsetY = 8;
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.2)';
  
  fill(isHovered ? color(255, 230, 240) : color(255, 182, 193));
  if (isHovered) {
    stroke(255);
    strokeWeight(5);
  } else {
    noStroke();
  }
  
  // 史萊姆身體 (使用 curveVertex 繪製)
  beginShape();
  for (let a = 0; a <= TWO_PI + PI; a += PI / 4) {
    let squish = sin(a * 3 + frameCount * 0.1) * 5; // 邊緣的蠕動效果
    let px = btnX + cos(a) * (r + squish);
    let py = btnY + sin(a) * ((r + squish) * 0.85);
    curveVertex(px, py);
  }
  endShape();
  
  // 史萊姆表情與文字
  drawingContext.shadowBlur = 0; // 關閉陰影以繪製清晰的表情
  fill(70);
  noStroke();
  ellipse(btnX - 18, btnY - 10, 10, 16);
  ellipse(btnX + 18, btnY - 10, 10, 16);
  fill(255, 100, 100, 120);
  ellipse(btnX - 35, btnY + 5, 16, 10);
  ellipse(btnX + 35, btnY + 5, 16, 10);
  noFill(); stroke(70); strokeWeight(3);
  arc(btnX, btnY + 5, 16, 12, 0, PI);
  
  fill(70); noStroke(); textSize(24); textStyle(BOLD);
  text("START", btnX, btnY + r + 25);
  
  pop();
}

/**
 * 繪製操作說明畫面。
 */
function drawInstructionsScreen() {
  push();
  // 使用 translate 將座標原點移至畫面中央，方便定位
  translate(width / 2, height / 2);

  // 繪製對話框背景
  fill(255, 250, 240, 230); // 帶有些微透明度的柔和米白
  stroke(255, 182, 193); // 粉色邊框
  strokeWeight(5);
  rectMode(CENTER);
  rect(0, 0, 500, 300, 20); // 圓角矩形

  // 繪製標題
  noStroke();
  fill(70);
  textAlign(CENTER, CENTER);
  textSize(32);
  textStyle(BOLD);
  text("操作說明", 0, -100);

  // 繪製說明文字
  textSize(20);
  textStyle(NORMAL);
  // 使用 \n 進行換行
  text("點擊左側可愛的果凍史萊姆，\n即可在右側瀏覽各週的精彩作品！", 0, -20);

  // 繪製「我明白了！」按鈕
  let btnX = 0;
  let btnY = 80;
  let btnW = 150;
  let btnH = 50;
  // 偵測滑鼠是否懸停在按鈕上
  let isHovered = (mouseX > width / 2 + btnX - btnW / 2 && mouseX < width / 2 + btnX + btnW / 2 &&
                   mouseY > height / 2 + btnY - btnH / 2 && mouseY < height / 2 + btnY + btnH / 2);

  if (isHovered) {
    fill(255, 182, 193); // 懸停時變為粉色
    stroke(255);
    strokeWeight(3);
  } else {
    fill(173, 216, 230); // 預設為藍色
    noStroke();
  }
  rect(btnX, btnY, btnW, btnH, 25); // 圓角按鈕

  // 繪製按鈕文字
  noStroke();
  fill(isHovered ? 255 : 70); // 懸停時文字變白
  textSize(18);
  textStyle(BOLD);
  text("我明白了！", btnX, btnY);

  pop();
}

/**
 * 繪製左下角的心得與設計理念面板
 */
function drawInfoPanel() {
  push();
  // 面板位置與尺寸
  let panelW = 280; // 稍微加寬面板
  let panelH = infoPanelExpanded ? 175 : 45; // 增加展開時的高度，避免壓到下方文字
  let panelX = 30;
  let panelY = height - panelH - 30;

  // 繪製半透明的背景面板
  drawingContext.shadowOffsetY = 4;
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.1)';
  fill(255, 255, 255, 180);
  stroke(255, 182, 193);
  strokeWeight(3);
  rect(panelX, panelY, panelW, panelH, 15);

  drawingContext.shadowBlur = 0; // 關閉文字陰影
  
  // 標題
  fill(216, 112, 147); // 柔和的粉紫色
  noStroke();
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  // 依據展開狀態顯示不同的箭頭符號
  let arrow = infoPanelExpanded ? "▼" : "▲";
  text(`${arrow} 🌸 心得與設計理念`, panelX + 15, panelY + 14);

  // 內容說明 (只有在展開狀態時才繪製文字)
  if (infoPanelExpanded) {
    fill(80);
    textSize(13);
    textStyle(NORMAL);
    textLeading(22); // 設定行距
    let desc = "本作品以「可愛果凍草原」為主題：\n" +
               "• Vertex：配合 sin() 繪製會呼吸的\n  史萊姆與綿延的動態山丘。\n" +
               "• Class/陣列：封裝互動按鈕與粒子。\n" +
               "• Iframe：動態切換並展示每週作業。";
    text(desc, panelX + 15, panelY + 45);
  }
  pop();
}

/**
 * @class BlobButton
 * @description 代表一個可互動的果凍史萊姆按鈕的類別。
 */
class BlobButton {
  /**
   * BlobButton 的建構子。
   * @param {number} baseX - 按鈕的基礎 X 座標。
   * @param {number} y - 按鈕的基礎 Y 座標。
   * @param {object} data - 包含 title 和 url 的作業資料。
   * @param {p5.Color} btnColor - 按鈕的基礎顏色。
   */
  constructor(baseX, y, data, btnColor) {
    this.baseX = baseX;
    this.currentX = baseX;
    this.baseY = y;
    this.currentY = y;
    this.r = 45; // 史萊姆半徑
    this.data = data;
    this.baseColor = btnColor;
    this.isHovered = false;
    this.isActive = false; // 是否為當前選中的頁面
    this.jumpY = 0; // 跳躍高度
  }
  
  /**
   * 更新按鈕的狀態，例如位置、是否被滑鼠懸停等。
   * @param {number} mx - 當前的滑鼠 X 座標。
   * @param {number} my - 當前的滑鼠 Y 座標。
   */
  update(mx, my) {
    // 檢查滑鼠是否懸停 (利用距離計算)
    let d = dist(mx, my, this.currentX, this.currentY);
    this.isHovered = d < this.r;
    
    // 上下漂浮動畫
    let floatOffset = sin(frameCount * 0.05 + this.baseY) * 5; // 每個按鈕有不同的漂浮相位
    
    // 懸停或啟用時，會有跳躍/提起的動畫
    let targetJump = (this.isHovered || this.isActive) ? -20 : 0;
    this.jumpY = lerp(this.jumpY, targetJump, 0.2); // 使用 lerp 產生平滑的跳躍動畫
    
    this.currentY = this.baseY + floatOffset + this.jumpY;
    this.currentX = this.baseX;
  }
  
  /**
   * 將按鈕繪製到畫布上。
   */
  display() {
    push();
    translate(this.currentX, this.currentY);
    
    // 投影效果
    drawingContext.shadowOffsetY = 8;
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 0.15)';
    
    // 繪製史萊姆身體 (利用 curveVertex 畫出蠕動感)
    fill(this.isHovered || this.isActive ? lerpColor(this.baseColor, color(255), 0.2) : this.baseColor); // 懸停或啟用時提亮
    if (this.isActive) {
      stroke(255);
      strokeWeight(4);
    } else {
      noStroke();
    }
    
    beginShape();
    for (let a = 0; a <= TWO_PI + PI; a += PI / 4) {
      // 使邊緣產生些微的軟Q扭動
      let squish = sin(a * 2 + frameCount * 0.1) * 3;
      let r = this.r + squish;
      let px = cos(a) * r;
      let py = sin(a) * (r * 0.85); // Y軸壓縮一點點，讓它看起來扁扁的
      curveVertex(px, py);
    }
    endShape();

    // 繪製表情
    drawingContext.shadowBlur = 0; // 關閉陰影
    fill(70);
    noStroke();
    
    // 偶爾會眨眼睛的動畫 (利用 frameCount 的餘數判斷)
    if (frameCount % 120 < 5) {
      // 閉眼
      stroke(70);
      strokeWeight(3);
      line(-15, -5, -7, -5);
      line(7, -5, 15, -5);
    } else {
      // 睜眼
      ellipse(-12, -5, 6, 10);
      ellipse(12, -5, 6, 10);
    }
    
    // 腮紅
    fill(255, 100, 100, 120);
    noStroke();
    ellipse(-22, 2, 10, 6);
    ellipse(22, 2, 10, 6);
    
    // 微笑嘴巴
    noFill();
    stroke(70);
    strokeWeight(2);
    arc(0, 2, 10, 8, 0, PI);
    
    // 繪製標題文字 (放在史萊姆下方)
    fill(255);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(16);
    textStyle(BOLD);
    
    // 再次啟用陰影，但只作用於文字，以增加可讀性
    drawingContext.shadowOffsetY = 3;
    drawingContext.shadowBlur = 6;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 0.8)'; // 加強陰影濃度，確保字彙清楚
    text(this.data.title, 0, this.r + 5);
    
    pop();
  }
}

/**
 * @class Cloud
 * @description 漂浮在背景的白雲類別
 */
class Cloud {
  constructor() {
    this.x = random(-200, width);
    this.y = random(20, 200);
    this.s = random(0.5, 1.2); // 雲朵縮放比例
    this.speed = random(0.2, 0.6); // 漂浮速度
  }
  
  update() {
    this.x += this.speed;
    // 如果雲飄出畫面右側，就讓它從左側重新出現
    if (this.x > width + 150) {
      this.x = -150;
      this.y = random(20, 200);
    }
  }
  
  display() {
    push();
    translate(this.x, this.y);
    scale(this.s);
    noStroke();
    fill(255, 255, 255, 200); // 半透明白色
    
    // 用多個圓形組合出一朵雲的形狀
    ellipse(0, 0, 100, 60);
    ellipse(-30, 10, 60, 40);
    ellipse(30, 15, 70, 50);
    ellipse(15, -20, 80, 60);
    pop();
  }
}

/**
 * @class Sparkle
 * @description 滑鼠魔法軌跡的粒子類別
 */
class Sparkle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-1.5, 1.5); // X 軸隨機擴散速度
    this.vy = random(-1.5, 1.5); // Y 軸隨機擴散速度
    this.alpha = 255;            // 初始透明度 (不透明)
    this.size = random(5, 12);   // 粒子大小
    // 隨機選擇可愛的粉嫩色彩
    let colors = ['#FFF0F5', '#FFB6C1', '#FFFACD', '#E0FFFF'];
    this.color = color(random(colors));
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 8; // 每一影格減少透明度，產生淡出效果
    this.size *= 0.95; // 粒子慢慢變小
  }
  
  display() {
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = this.color.toString();
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.alpha);
    ellipse(this.x, this.y, this.size);
  }
}

/**
 * @class Flower
 * @description 點擊草原時長出的可愛小花
 */
class Flower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.scale = 0; // 初始大小為 0 (準備播放生長動畫)
    this.targetScale = random(0.6, 1.2); // 隨機決定最終大小
    this.rotation = random(TWO_PI); // 花瓣隨機旋轉角度
    // 隨機選擇漂亮的花瓣顏色
    let petalColors = ['#FFB6C1', '#FF69B4', '#FFA07A', '#98FB98', '#DDA0DD', '#F0E68C'];
    this.petalColor = color(random(petalColors));
  }
  
  update() {
    // 利用 lerp 產生「啵！」彈出來的生長動畫
    this.scale = lerp(this.scale, this.targetScale, 0.15);
  }
  
  display() {
    push();
    translate(this.x, this.y);
    scale(this.scale);
    
    // 畫花莖
    stroke(60, 180, 100);
    strokeWeight(4);
    line(0, 0, 0, -25);
    
    // 畫花瓣 (移到花莖上方)
    translate(0, -25);
    noStroke();
    fill(this.petalColor);
    rotate(this.rotation);
    // 用迴圈畫出 5 片花瓣
    for (let i = 0; i < 5; i++) {
      ellipse(0, -10, 14, 20);
      rotate(TWO_PI / 5);
    }
    
    // 畫花蕊
    fill(255, 215, 0); // 金黃色
    ellipse(0, 0, 12, 12);
    
    pop();
  }
}

/**
 * 繪製自訂的魔法棒游標
 */
function drawMagicWand(x, y) {
  push();
  translate(x, y);
  
  // 畫魔法棒的握柄
  stroke(210, 150, 100);
  strokeWeight(4);
  line(0, 0, 15, 20);
  
  // 畫魔法棒頂端的星星
  noStroke();
  fill(255, 215, 0); // 金黃色
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = 'rgba(255, 215, 0, 0.8)';
  
  // 簡單的五角星繪製
  beginShape();
  for (let i = 0; i < 10; i++) {
    let angle = i * PI / 5 - PI / 2;
    let r = (i % 2 === 0) ? 10 : 4;
    vertex(cos(angle) * r, sin(angle) * r);
  }
  endShape(CLOSE);
  
  pop();
}

/**
 * @class BurstParticle
 * @description 點擊史萊姆時爆發的煙火/星星粒子
 */
class BurstParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    let angle = random(TWO_PI);
    let speed = random(3, 10); // 隨機爆發速度
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    this.alpha = 255;
    this.size = random(4, 10);
    let colors = ['#FFD700', '#FF69B4', '#00FFFF', '#FF4500', '#FFFFFF'];
    this.color = color(random(colors));
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.3; // 加上些微的重力，讓粒子呈現拋物線往下掉
    this.alpha -= 6; // 淡出
  }
  
  display() {
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.alpha);
    ellipse(this.x, this.y, this.size);
  }
}