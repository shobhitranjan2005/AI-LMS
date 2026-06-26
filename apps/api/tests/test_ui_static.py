from __future__ import annotations


def test_digit_lab_ui_exposes_phase_one_controls(repo_root) -> None:
    html = (repo_root / "apps" / "web" / "public" / "index.html").read_text(encoding="utf-8")
    script = (repo_root / "apps" / "web" / "public" / "app.js").read_text(encoding="utf-8")

    for expected in [
        "drawingCanvas",
        "strokeWidth",
        "rotation",
        "noise",
        "predictButton",
        "battleButton",
        "modelSelect",
        "calmMotion",
        "aria-live=\"polite\"",
    ]:
        assert expected in html

    assert "/api/predict/digit" in script
    assert "/api/battle/run" in script
    assert "digit-lab-history" in script


def test_css_has_glass_shell_focus_and_reduced_motion(repo_root) -> None:
    css = (repo_root / "apps" / "web" / "public" / "styles.css").read_text(encoding="utf-8")

    assert "backdrop-filter: blur" in css
    assert ".blossom-scene" in css
    assert ":focus-visible" in css
    assert "@media (prefers-reduced-motion: reduce)" in css
    assert ".force-reduced-motion" in css
    assert "@media (max-width: 980px)" in css
    assert "@media (max-width: 640px)" in css


def test_all_required_playgrounds_are_present(repo_root) -> None:
    html = (repo_root / "apps" / "web" / "public" / "index.html").read_text(encoding="utf-8").lower()
    script = (repo_root / "apps" / "web" / "public" / "app.js").read_text(encoding="utf-8")

    for required in [
        "digit-lab",
        "image-repair",
        "text-lab",
        "sound-lab",
        "style-studio",
        "model-battle",
    ]:
        assert required in html

    for endpoint in [
        "/api/repair/image",
        "/api/predict/text",
        "/api/predict/sound",
        "/api/transform/style",
        "/api/battle/text",
        "/api/battle/sound",
        "/api/battle/style",
    ]:
        assert endpoint in script


def test_frontend_has_challenges_explanations_and_local_saving(repo_root) -> None:
    html = (repo_root / "apps" / "web" / "public" / "index.html").read_text(encoding="utf-8")
    script = (repo_root / "apps" / "web" / "public" / "app.js").read_text(encoding="utf-8")

    assert "educationMode" in html
    assert "challengeList" in html
    assert "ai-playground-experiments" in script
    assert "advanced" in script
    assert script.count("challenge") >= 5


def test_accessibility_and_touch_targets(repo_root) -> None:
    html = (repo_root / "apps" / "web" / "public" / "index.html").read_text(encoding="utf-8")
    css = (repo_root / "apps" / "web" / "public" / "styles.css").read_text(encoding="utf-8")

    assert 'role="status"' in html
    assert 'aria-live="polite"' in html
    assert 'aria-label="Digit drawing canvas"' in html
    assert "min-height: 44px" in css
    assert "touch-action: none" in css
