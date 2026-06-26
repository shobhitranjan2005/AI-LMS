# ML Lab — Complete Project

Six ML algorithm demos with a polished macOS-style interface.

## Quick Start
1. Open `01_demos/index.html` in any browser
2. Click any demo card to open it
3. Click the ⚙ icon (top-right) to open the Customize sheet
4. Switch to "Equation-driven", type an equation (e.g. `sin(x)`), click "Generate from equation"
5. The sheet auto-closes. Click Play (▶) in the toolbar to start training
6. Switch views using the segmented control (Fit / SGD / Surface)

## Design
- macOS-style window: unified toolbar + canvas + thin status bar
- Sheet modal drops from toolbar for settings (click outside or press Escape to close)
- Inline equation field in toolbar (like Grapher.app)
- Back button (← ML Lab) returns to the landing page

## Demos
| Demo | Equation type | Lesson |
|---|---|---|
| Linear Regression | `y = f(x)` | Linear models can't fit non-linear functions |
| Logistic Regression | `p = σ(f(x))` | Learn probability curves from binary labels |
| KNN | `class 1 if f(x,y) > 0` | Instance-based — no SGD, no weights |
| SVM | `class +1 if f(x,y) > 0` | Max-margin linear separator |
| MLP | `y = f(x)` (regression) | Universal approximator — fits ANY function |
| Decision Tree | `class 1 if f(x,y) > 0` | CART + differentiable soft-tree |

## Equation Examples
- 1D: `sin(x)`, `x^2 - 4`, `tanh(2*x)`, `exp(-x^2)*cos(4*x)`
- 2D: `x - y > 0`, `y - sin(5*x) > 0`, `x^2 + y^2 - 0.3 > 0`

## Zero Dependencies
Pure HTML + CSS + vanilla JavaScript. No build step. No internet required.

## Emergence visual integration

This edition adds `index.html` as the cinematic opening page. Its **Continue to the Lab** button opens `01_demos/index.html`.

The ML Lab uses `01_demos/emergence-theme.css` and `01_demos/emergence-night.png` for typography, Apple-like liquid glass, the shared night landscape, and restrained ambient motion. The original algorithm JavaScript blocks were retained byte-for-byte.
