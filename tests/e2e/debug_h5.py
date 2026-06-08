"""
诊断 h5-app 54 个 console 错误的具体内容
"""
import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 375, "height": 812})  # 移动端尺寸
    page = context.new_page()

    errors = []
    warnings = []
    page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
    page.on("console", lambda m: (
        errors.append((m.type, m.text)) if m.type == "error"
        else warnings.append((m.type, m.text)) if m.type == "warning"
        else None
    ))

    print("=== 访问 http://localhost:5174/ ===")
    resp = page.goto("http://localhost:5174/", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("load", timeout=15000)
    time.sleep(5)

    print(f"\n=== 错误 ({len(errors)} 条) ===")
    for i, (etype, etext) in enumerate(errors[:60]):
        print(f"[{i+1}] [{etype}] {etext[:400]}")
        print("---")

    print(f"\n=== 警告 ({len(warnings)} 条) ===")
    for i, (etype, etext) in enumerate(warnings[:10]):
        print(f"[{i+1}] {etext[:300]}")
        print("---")

    browser.close()
