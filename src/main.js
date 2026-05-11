import './style.css';

const COLS = 32;
const ROWS = 16;
const SCALE = 4; // each pixel = 4x4 on OLED (128/32=4, 64/16=4)

const colors = [
  { name: '天蓝', cls: 'default', hex: '#00e5ff' },
  { name: '红色', cls: 'color1', hex: '#ff4444' },
  { name: '绿色', cls: 'color2', hex: '#44ff44' },
  { name: '黄色', cls: 'color3', hex: '#ffff44' },
  { name: '粉色', cls: 'color4', hex: '#ff44ff' },
  { name: '青色', cls: 'color5', hex: '#44ffff' },
  { name: '橙色', cls: 'color6', hex: '#ff8800' },
  { name: '淡紫', cls: 'color7', hex: '#8888ff' },
  { name: '白色', cls: 'color8', hex: '#ffffff' },
];

let grid = [];
let currentColor = 0; // index into colors
let isDrawing = false;

function initGrid() {
  grid = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < COLS; x++) {
      grid[y][x] = -1; // -1 = off, otherwise color index
    }
  }
}
initGrid();

function app() {
  const appEl = document.getElementById('app');

  // Board
  const boardWrapper = document.createElement('div');
  boardWrapper.className = 'board-wrapper';

  const boardContainer = document.createElement('div');
  boardContainer.className = 'board-container';

  for (let y = 0; y < ROWS; y++) {
    const row = document.createElement('div');
    row.className = 'board-row';
    for (let x = 0; x < COLS; x++) {
      const pixel = document.createElement('div');
      pixel.className = 'pixel';
      pixel.dataset.x = x;
      pixel.dataset.y = y;

      pixel.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDrawing = true;
        togglePixel(x, y);
      });

      pixel.addEventListener('mouseenter', () => {
        if (isDrawing) {
          togglePixel(x, y);
        }
      });

      row.appendChild(pixel);
    }
    boardContainer.appendChild(row);
  }

  document.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  document.addEventListener('mouseleave', () => {
    isDrawing = false;
  });

  boardWrapper.appendChild(boardContainer);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  const colorPicker = document.createElement('div');
  colorPicker.className = 'color-picker';

  colors.forEach((c, i) => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (i === 0 ? ' active' : '');
    dot.style.background = c.hex;
    if (c.cls === 'default') {
      dot.style.background = 'linear-gradient(135deg, #00e5ff, #0077ff)';
    }
    dot.title = c.name + (i === 0 ? ' (当前)' : '');
    dot.addEventListener('click', () => {
      currentColor = i;
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
    colorPicker.appendChild(dot);
  });

  toolbar.appendChild(colorPicker);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'clear-btn';
  clearBtn.textContent = '清除全部';
  clearBtn.addEventListener('click', () => {
    initGrid();
    renderPixels();
    updatePreview();
    updateCode();
  });
  toolbar.appendChild(clearBtn);

  // OLED preview
  const previewContainer = document.createElement('div');
  previewContainer.className = 'preview-container';

  const previewLabel = document.createElement('div');
  previewLabel.className = 'preview-label';
  previewLabel.textContent = 'OLED 128×64 预览 (1:4 缩放)';
  previewContainer.appendChild(previewLabel);

  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'preview-canvas';
  previewCanvas.width = 128 * 2;  // 2x for visibility
  previewCanvas.height = 64 * 2;
  previewCanvas.style.width = '256px';
  previewCanvas.style.height = '128px';
  previewContainer.appendChild(previewCanvas);

  // Code section
  const codeSection = document.createElement('div');
  codeSection.className = 'code-section';

  const codeHeader = document.createElement('div');
  codeHeader.className = 'code-header';

  const codeTitle = document.createElement('h2');
  codeTitle.textContent = 'Arduino IDE (u8g2) 代码';
  codeHeader.appendChild(codeTitle);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = '复制代码';
  copyBtn.addEventListener('click', () => {
    const code = generateCode();
    navigator.clipboard.writeText(code).then(() => {
      copyBtn.textContent = '已复制!';
      setTimeout(() => { copyBtn.textContent = '复制代码'; }, 2000);
    });
  });
  codeHeader.appendChild(copyBtn);

  codeSection.appendChild(codeHeader);

  const codeOutput = document.createElement('pre');
  codeOutput.className = 'code-output';
  codeSection.appendChild(codeOutput);

  appEl.appendChild(boardWrapper);
  appEl.appendChild(toolbar);
  appEl.appendChild(previewContainer);
  appEl.appendChild(codeSection);

  // Helper functions exposed to module scope
  window.renderPixels = renderPixels;
  window.updatePreview = updatePreview;
  window.updateCode = updateCode;

  renderPixels();
  updatePreview();
  updateCode();
}

function togglePixel(x, y) {
  const currentVal = grid[y][x];
  if (currentVal === currentColor) {
    grid[y][x] = -1; // turn off
  } else {
    grid[y][x] = currentColor; // set to current color
  }
  renderPixels();
  updatePreview();
  updateCode();
}

function renderPixels() {
  const rows = document.querySelectorAll('.board-row');
  for (let y = 0; y < ROWS; y++) {
    const pixels = rows[y].querySelectorAll('.pixel');
    for (let x = 0; x < COLS; x++) {
      const val = grid[y][x];
      const el = pixels[x];
      // Remove all color classes
      el.className = 'pixel';
      if (val >= 0) {
        el.classList.add('on', colors[val].cls);
      }
    }
  }
}

function generatePixelArrayCode() {
  let code = '';
  for (let y = 0; y < ROWS; y++) {
    let line = '  ';
    for (let x = 0; x < COLS; x++) {
      line += grid[y][x] >= 0 ? '1, ' : '0, ';
    }
    code += line + '\n';
  }
  return code;
}

function generateDrawBoxesCode() {
  // Use minimal drawBox calls by finding rectangles to merge (rle by rows)
  let lines = [];
  for (let y = 0; y < ROWS; y++) {
    let x = 0;
    while (x < COLS) {
      if (grid[y][x] >= 0) {
        let startX = x;
        while (x < COLS && grid[y][x] >= 0) {
          x++;
        }
        const w = (x - startX) * SCALE;
        lines.push(`    u8g2.drawBox(${startX * SCALE}, ${y * SCALE}, ${w}, ${SCALE});`);
      } else {
        x++;
      }
    }
  }
  return lines.join('\n');
}

function generateCode() {
  const hasPixels = grid.some(row => row.some(cell => cell >= 0));
  const hasColor = grid.some(row => row.some(cell => cell > 0));

  let code = `/**
 * 32×16 像素画 → OLED 128×64 (u8g2)
 * 使用 drawBox(x, y, w, h) 绘制像素块
 * 每个像素点对应 4×4 的 OLED 像素区域
 */
#include <U8g2lib.h>
#include <Wire.h>

// SSD1306 128x64 I2C 初始化
// 如果你用的是其他型号，请更换构造参数
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// 像素数据表 (32列 × 16行) — 1=亮, 0=灭
const unsigned char pixels[16][32] PROGMEM = {
${generatePixelArrayCode()}};

void setup(void) {
  u8g2.begin();
}

void loop(void) {
  u8g2.clearBuffer();

  // 遍历 32×16 像素，每个像素用 drawBox 绘制 4×4 区域
  for (int y = 0; y < 16; y++) {
    for (int x = 0; x < 32; x++) {
      if (pgm_read_byte(&pixels[y][x])) {
        u8g2.drawBox(x * 4, y * 4, 4, 4);
      }
    }
  }

  u8g2.sendBuffer();
}
`;

  // Compact version without pixel array
  let compactCode = `/**
 * 32×16 像素画 → OLED 128×64 (u8g2)
 * 仅包含被点亮像素的 drawBox 调用，代码更紧凑
 */
#include <U8g2lib.h>
#include <Wire.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

void setup(void) {
  u8g2.begin();
}

void loop(void) {
  u8g2.clearBuffer();

${generateDrawBoxesCode()}

  u8g2.sendBuffer();
}
`;

  // Combined tabbed view
  return `═════════════ 方案一：像素数组法 ═════════════

${code}

═════════════ 方案二：drawBox 直接法（更紧凑）═════════════

${compactCode}`;
}

function updateCode() {
  const codeOutput = document.querySelector('.code-output');
  if (!codeOutput) return;
  codeOutput.textContent = generateCode();
}

function updatePreview() {
  const canvas = document.querySelector('.preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = 128;
  const h = 64;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw gridlines subtly
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= 32; x++) {
    ctx.beginPath();
    ctx.moveTo(x * 4 * 2, 0);
    ctx.lineTo(x * 4 * 2, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= 16; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * 4 * 2);
    ctx.lineTo(canvas.width, y * 4 * 2);
    ctx.stroke();
  }

  // Draw pixels
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const val = grid[y][x];
      if (val >= 0) {
        ctx.fillStyle = colors[val].hex;
        ctx.fillRect(x * 4 * 2, y * 4 * 2, 4 * 2, 4 * 2);
      }
    }
  }
}

app();
