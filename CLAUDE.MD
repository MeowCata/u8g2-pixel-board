# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Architecture

Single-page Vite + vanilla JS app — 3 source files total:

- **`index.html`** — entry point, minimal shell with dark theme base styles
- **`src/main.js`** — all application logic: pixel grid state, DOM construction, drawing, code generation
- **`src/style.css`** — all styling

### Data flow

`grid[y][x]` holds a color index (-1 = off, 0-8 = color). Any change to the grid triggers three synchronous updates:
1. `renderPixels()` — sync grid state to DOM pixel elements' CSS classes
2. `updatePreview()` — redraw the Canvas 128x64 OLED preview (2x scale)
3. `updateCode()` — regenerate the Arduino u8g2 code block

### Drawing mechanics

- `mousedown` on a pixel starts drawing; `mouseenter` during drag applies to hovered pixel
- Clicking a pixel that's already the active color turns it off (toggle)
- `mouseup` / `mouseleave` on document ends the stroke

### Code generation

`generateCode()` produces two interconnected Arduino sketches:

1. **像素数组法** — stores all 512 bits in a `PROGMEM` array, reads via `pgm_read_byte`
2. **drawBox 直接法** — only emits `u8g2.drawBox(x*4, y*4, w, 4)` for lit pixels, merging horizontal runs

Both map 32x16 board pixels to 128x64 OLED via 4x scaling (drawBox 4x4 per pixel).

### Key constants

- `COLS=32, ROWS=16` — board dimensions
- `SCALE=4` — board pixel to OLED pixel ratio
- 9 colors indexed 0-8, stored in `colors[]` array (name, CSS class, hex)
