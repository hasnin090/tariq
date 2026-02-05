# ROLE: Senior Frontend Architect & UI Stability Specialist

# OBJECTIVE
Refactor the current CloudOps Dashboard UI to achieve "Pixel-Perfect Responsiveness" and "Cross-Browser Resilience" (specifically targeting Safari/macOS quirks). The goal is structural optimization WITHOUT altering the Visual Identity (Colors, Branding, or Aesthetic Vibe).

# STRICT TECHNICAL GUIDELINES

## 1. Layout & Grid Systems (The Skeleton)
- **Fluid Grids:** Replace fixed-width containers with CSS Grid `repeat(auto-fit, minmax(REM_VALUE, 1fr))` to ensure cards flow naturally from Desktop (4 cols) to Mobile (1 col).
- **Flexbox Hygiene:** Ensure all flex containers utilize `flex-wrap: wrap` where content might overflow.
- **Visual Regression:** Eliminate all horizontal scrolling on mobile (`overflow-x: hidden` on root).
- **Card Boundaries:** Enforce `box-sizing: border-box` and strict padding to prevent border clipping or content bleeding during window resizing.

## 2. Adaptive Components (The Organs)
- **Sidebar Logic:** - **Desktop:** Sticky/Fixed sidebar.
  - **Mobile/Tablet (<1024px):** Transform into a "Slide-over Drawer" or "Hamburger Menu" with a backdrop overlay.
  - **Z-Index:** Ensure the mobile menu sits above all dashboard widgets (z-index: 50+).
- **Button Groups:** Implement "Stacking Logic". If horizontal space < content width, buttons must stack vertically with consistent gaps.
- **Touch Targets:** On mobile viewports, increase clickable areas to min 44px (according to Apple Human Interface Guidelines).

## 3. Safari & macOS Compatibility (The Fixes)
- **Viewport Height:** REPLACE `100vh` with `100svh` (Small Viewport Height) to fix the "Jumping Address Bar" issue on iOS Safari.
- **Glassmorphism:** Use `-webkit-backdrop-filter` alongside `backdrop-filter` for blur effects.
- **Flex Gap:** Ensure `gap` property has fallbacks or is thoroughly tested for older Safari versions (Webkit).
- **Font Rendering:** Apply `-webkit-font-smoothing: antialiased` for crisp text on Mac Retina displays.

## 4. Typography (The Content)
- **Fluid Scaling:** Do not use static pixels for main headings. Use `clamp(MIN, PREFERRED, MAX)` (e.g., `font-size: clamp(1rem, 2.5vw, 2rem)`) to prevent text breaking on resizing.

# NEGATIVE CONSTRAINTS (DO NOT DO)
- ❌ **DO NOT** change the Hex/RGB color codes or the theme variables.
- ❌ **DO NOT** modify the business logic or data fetching methods.
- ❌ **DO NOT** use hardcoded pixels for container widths (use %, rem, or vw).
- ❌ **DO NOT** remove aria-labels or accessibility attributes.

# OUTPUT REQUIREMENT
Return only the refactored code blocks with comments explaining the *specific* responsiveness fixes applied.