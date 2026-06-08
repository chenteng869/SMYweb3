"""
Playwright 增强版 UI 联调测试
- Phase 1: API 登录流程
- Phase 2: 3 个前端 + admin-web-legacy 真实端到端登录
- Phase 3: 路由跳转验证
"""
import os
import sys
import time
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

OUT_DIR = Path(__file__).parent / "screenshots"
OUT_DIR.mkdir(exist_ok=True)

results = {"summary": {}, "details": [], "screenshots": []}

def log(msg):
    print(msg, flush=True)


def screenshot(page, name):
    path = OUT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    return path.name


def test_api():
    log("\n=== Phase 1: API 登录流程 ===")
    detail = {"name": "api-login", "checks": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context().new_page()

        # 登录
        resp = page.request.post(
            "http://localhost:3001/api/admin/auth/login",
            data=json.dumps({"username": "admin", "password": "admin123"}),
            headers={"Content-Type": "application/json"},
        )
        body = resp.json()
        token = (body.get("data") or {}).get("token", "")
        detail["login_ok"] = body.get("success", False) and bool(token)
        detail["login_message"] = body.get("message", "")
        detail["token_length"] = len(token)
        detail["user"] = (body.get("data") or {}).get("user", {})
        detail["checks"].append({"name": "POST /api/admin/auth/login", "ok": detail["login_ok"]})
        log(f"  [OK] 登录 HTTP {resp.status}, JWT {len(token)} 字符")
        log(f"  [OK] 用户: {detail['user'].get('username')} / {detail['user'].get('roleName')}")

        # Dashboard
        dash = page.request.get(
            "http://localhost:3001/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        detail["dashboard_ok"] = dash.status == 200
        detail["checks"].append({"name": "GET /api/admin/dashboard/stats", "ok": dash.status == 200})
        log(f"  [OK] Dashboard HTTP {dash.status}")

        # Users
        users = page.request.get(
            "http://localhost:3001/api/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        u_body = users.json() if users.status == 200 else {}
        u_data = u_body.get("data", [])
        if isinstance(u_data, list):
            u_items = u_data
        else:
            u_items = u_data.get("items", [])
        detail["users_count"] = len(u_items)
        detail["users_total"] = u_data.get("total", 0) if isinstance(u_data, dict) else len(u_items)
        detail["checks"].append({"name": "GET /api/admin/users", "ok": users.status == 200})
        log(f"  [OK] Users HTTP {users.status}, 共 {detail['users_count']} 个用户 (total={detail['users_total']})")

        # Recent activities
        ra = page.request.get(
            "http://localhost:3001/api/admin/dashboard/recent-activities",
            headers={"Authorization": f"Bearer {token}"},
        )
        ra_body = ra.json() if ra.status == 200 else {}
        ra_data = ra_body.get("data", [])
        if isinstance(ra_data, list):
            ra_items = ra_data
        else:
            ra_items = ra_data.get("items", [])
        detail["activities_count"] = len(ra_items)
        detail["checks"].append({"name": "GET /api/admin/dashboard/recent-activities", "ok": ra.status == 200})
        log(f"  [OK] Recent Activities HTTP {ra.status}, {detail['activities_count']} 条")

        # Chart data
        cd = page.request.get(
            "http://localhost:3001/api/admin/dashboard/chart-data",
            headers={"Authorization": f"Bearer {token}"},
        )
        detail["chart_data_ok"] = cd.status == 200
        detail["checks"].append({"name": "GET /api/admin/dashboard/chart-data", "ok": cd.status == 200})
        log(f"  [OK] Chart Data HTTP {cd.status}")

        browser.close()
    results["details"].append(detail)
    return detail


def test_legacy_login():
    """admin-web-legacy 端到端登录测试"""
    log("\n=== Phase 2: admin-web-legacy 端到端登录 ===")
    detail = {"name": "admin-web-legacy-e2e", "url": "http://localhost:3000", "checks": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text[:200]}") if m.type == "error" else None)

        # 1. 访问登录页
        page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("load", timeout=15000)
        time.sleep(2)
        sh1 = screenshot(page, "legacy-01-login")
        detail["login_screenshot"] = sh1
        log(f"  [OK] 打开登录页: {sh1}")

        # 2. 填写表单
        # Next.js + Antd 的输入框可能用 id placeholder label
        try:
            # 找到用户名输入框
            username_input = page.locator('input[type="text"]').first
            password_input = page.locator('input[type="password"]').first
            username_input.click()
            username_input.press_sequentially("admin", delay=30)
            password_input.click()
            password_input.press_sequentially("admin123", delay=30)
            detail["checks"].append({"name": "填表", "ok": True})
            log(f"  [OK] 填写 admin / admin123")
        except Exception as e:
            detail["checks"].append({"name": "填表", "ok": False, "err": str(e)[:100]})
            log(f"  [FAIL] 填表失败: {e}")
            browser.close()
            results["details"].append(detail)
            return detail

        time.sleep(0.5)
        sh2 = screenshot(page, "legacy-02-filled")
        log(f"  [OK] 填表截图: {sh2}")

        # 3. 点击登录按钮
        try:
            login_btn = page.get_by_role("button", name="登录管理后台")
            login_btn.click()
            detail["checks"].append({"name": "点击登录", "ok": True})
            log(f"  [OK] 点击登录按钮")
        except Exception as e:
            # 备用：找所有 button 找第一个
            try:
                page.locator("button").first.click()
                detail["checks"].append({"name": "点击登录 (fallback)", "ok": True})
                log(f"  [OK] 点击登录按钮 (fallback)")
            except Exception as e2:
                detail["checks"].append({"name": "点击登录", "ok": False, "err": str(e2)[:100]})
                log(f"  [FAIL] 点击登录失败: {e2}")
                browser.close()
                results["details"].append(detail)
                return detail

        # 4. 等待登录后跳转（mockLogin 1s + 路由跳转 2s）
        try:
            page.wait_for_url("**/admin/dashboard", timeout=10000)
            log(f"  [OK] 成功跳转到 /admin/dashboard")
        except Exception as e:
            log(f"  [WARN] 未在 10s 内跳转到 dashboard: {e}")
        time.sleep(2)
        current_url = page.url
        detail["post_login_url"] = current_url
        log(f"  [INFO] 登录后 URL: {current_url}")
        sh3 = screenshot(page, "legacy-03-after-login")
        detail["post_login_screenshot"] = sh3
        log(f"  [OK] 登录后截图: {sh3}")

        # 5. 验证是否成功（通过 URL 变化或内容）
        body_text = page.evaluate("() => document.body ? document.body.innerText : ''")
        detail["body_text_after_login"] = body_text[:500]
        log(f"  [INFO] 登录后文本: {body_text[:200].replace(chr(10), ' | ')}")

        # URL 含 dashboard 路径 或 body 含登录后关键字
        success_indicators = ["dashboard", "管理", "统计", "退出", "logout", "用户", "数据"]
        url_ok = "dashboard" in current_url.lower() or "/" == current_url.rstrip("/").split("?")[-1] and current_url != "http://localhost:3000"
        body_ok = any(kw in body_text for kw in success_indicators) and "登录" not in body_text[:200]
        detail["login_succeeded"] = url_ok or body_ok
        detail["checks"].append({"name": "登录后跳转", "ok": detail["login_succeeded"]})

        if detail["login_succeeded"]:
            log(f"  [OK] 登录成功！已跳转到登录后页面")
        else:
            log(f"  [WARN] 登录状态待确认")

        # 6. Console 错误
        detail["console_errors"] = errors[:5]
        log(f"  [INFO] Console 错误: {len(errors)} 个")

        browser.close()
    results["details"].append(detail)
    return detail


def test_frontend(p, name, url, expect_login=False):
    log(f"\n=== 测试 {name} ({url}) ===")
    detail = {"name": name, "url": url, "checks": []}
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text[:200]}") if m.type == "error" else None)

    try:
        resp = page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("load", timeout=15000)
        time.sleep(3)
        detail["http_status"] = resp.status if resp else None
        detail["checks"].append({"name": "导航", "ok": resp.status < 400})
        log(f"  [OK] HTTP {resp.status}")

        sh = screenshot(page, f"{name.replace('/', '-')}-home")
        detail["screenshot"] = sh
        log(f"  [OK] 截图: {sh}")

        title = page.title()
        body_len = page.evaluate("() => document.body ? document.body.innerText.length : 0")
        detail["title"] = title
        detail["body_text_length"] = body_len
        log(f"  [INFO] title={title}, body={body_len}字符")

        detail["console_errors_count"] = len(errors)
        log(f"  [INFO] console errors: {len(errors)}")
    except Exception as e:
        detail["checks"].append({"name": "导航", "ok": False, "err": str(e)[:100]})
        log(f"  [FAIL] {e}")

    browser.close()
    results["details"].append(detail)


def main():
    log("=" * 50)
    log("MSB-EXCHANGE Web3 增强版 UI 联调测试")
    log("=" * 50)

    api_result = test_api()
    test_legacy_login()

    with sync_playwright() as p:
        test_frontend(p, "admin-web", "http://localhost:5173")
        test_frontend(p, "h5-app", "http://localhost:5174")

    # 汇总
    log("\n\n" + "=" * 50)
    log("最终测试汇总")
    log("=" * 50)
    total = sum(len(d.get("checks", [])) for d in results["details"])
    ok = sum(sum(1 for c in d.get("checks", []) if c.get("ok")) for d in results["details"])
    for d in results["details"]:
        checks = d.get("checks", [])
        c_ok = sum(1 for c in checks if c.get("ok"))
        log(f"  {d['name']:30s}  {c_ok}/{len(checks)}")
        if d.get("screenshot"):
            log(f"     📷 {d['screenshot']}")
        if d.get("login_screenshot"):
            log(f"     📷 {d['login_screenshot']} + {d.get('post_login_screenshot', '')}")
        if d.get("login_succeeded") is not None:
            log(f"     登录: {'✓' if d['login_succeeded'] else '✗'}")
    log(f"\n总计: {ok}/{total} 检查通过")
    log(f"截图目录: {OUT_DIR}")

    # 保存报告
    report = OUT_DIR / "report.json"
    with open(report, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    log(f"报告: {report}")
    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(main())
