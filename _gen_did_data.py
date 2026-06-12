"""
DID 测试数据生成 + 页面验证
使用公开API (不需要登录) 创建 DID 测试数据
"""
import requests, json, time, os

API = "http://localhost:3001/api"
WEB = "http://localhost:5180"
OUT = r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\tests\e2e\screenshots"

print("=" * 50)
print("DID 测试数据生成")
print("=" * 50)

# ===== 1. 用公开 API 注册 DID =====
print("\n[1] 注册 DID (公开API, 无需登录)")
created_dids = []

for uid in [1, 2, 3, 4, 5]:
    try:
        wallet = f"0x{'%040d' % uid}TestWalletABCD"
        r = requests.post(f"{API}/did/register", json={
            "userId": uid,
            "primaryWallet": wallet
        }, timeout=5)
        
        if r.status_code in (200, 201):
            data = r.json().get("data", {})
            did_str = data.get("did", "?")
            did_id = data.get("id", uid)
            print(f"  ✅ User{uid}: {did_str}")
            created_dids.append({"id": did_id, "did": did_str, "userId": uid, "wallet": wallet})
        else:
            print(f"  ⚠️ User{uid}: {r.status_code} - {r.text[:80]}")
    except Exception as e:
        print(f"  ❌ User{uid}: {e}")
    time.sleep(0.2)

# ===== 2. 查看统计 =====
print("\n[2] DID 统计")
try:
    r = requests.get(f"{API}/did/stats", timeout=5)
    if r.status_code == 200:
        stats = r.json().get("data", {})
        print(f"  总数: {stats.get('total', '?')}")
        print(f"  状态分布: {json.dumps(stats.get('byStatus', {}), ensure_ascii=False)}")
except Exception as e:
    print(f"  ⚠️ {e}")

# ===== 3. 绑定钱包 (需要JWT, 跳过) =====
print("\n[3] 钱包绑定 → 需要JWT, 通过数据库直接插入")

# ===== 4. 直接写数据库创建完整测试数据 =====
import sqlite3

DB = r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api\prisma\dev.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# 查询已有的DID
cur.execute("SELECT id, userId, did FROM did_identities ORDER BY id")
dids_db = cur.fetchall()
print(f"\n  数据库中已有 {len(dids_db)} 条DID记录:")
for d in dids_db:
    print(f"    id={d[0]} user={d[1]} did={d[2]}")

if dids_db:
    # 为每个 DID 绑定钱包
    for did_rec in dids_db:
        did_id, user_id, did_str = did_rec
        wallet_addr = f"0x{'%040d' % user_id}ABCDEF1234567890"
        
        # 检查是否已有钱包
        cur.execute("SELECT id FROM wallet_accounts WHERE didId=? AND walletAddress=?", 
                   (did_id, wallet_addr.lower()))
        if not cur.fetchone():
            try:
                cur.execute("""INSERT INTO wallet_accounts (userId, didId, walletAddress, chainId, walletType, isPrimary, role, riskStatus, linkedAt, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, 'metamask', 1, 'primary', 'normal', datetime('now'), datetime('now'), datetime('now'))""",
                    (user_id, did_id, wallet_addr.lower(), "1"))
                print(f"  ✅ 钱包: {wallet_addr[:15]}... → did_id={did_id}")
            except Exception as e:
                print(f"  ⚠️ 钱包插入: {e}")
    
    # 创建 KYC 记录
    names = {1:"张创业", 2:"李总", 3:"Wang Wei", 4:"陈小姐", 5:"刘老板"}
    for i, did_rec in enumerate(dids_db[:3]):
        did_id, user_id, did_str = did_rec
        name = names.get(user_id, f"User{user_id}")
        
        cur.execute("SELECT id FROM kyc_records WHERE didId=?", (did_id,))
        if not cur.fetchone():
            status = "approved" if i == 0 else ("pending" if i == 1 else "rejected")
            cur.execute("""INSERT INTO kyc_records (userId, didId, provider, kycStatus, fullNameEncrypted, documentType, documentNoEncrypted, country, resultHash, createdAt, updatedAt)
                VALUES (?, ?, 'manual', ?, ?, 'id_card', ?, 'CN', hex(randomblob(16)), datetime('now'), datetime('now'))""",
                (user_id, did_id, status, name, f"{110101+i:06d}199001011234"))
            
            if status == "approved":
                cur.execute("UPDATE kyc_records SET reviewedBy=1, reviewedAt=datetime('now') WHERE didId=?", (did_id,))
                cur.execute("UPDATE did_identities SET kycStatus='verified', status='active', activatedAt=datetime('now') WHERE id=?", (did_id))
            elif status == "rejected":
                cur.execute("UPDATE kyc_records SET reviewedBy=1, reviewedAt=datetime('now'), rejectionReason='证件模糊' WHERE didId=?", (did_id,))
                cur.execute("UPDATE did_identities SET kycStatus='rejected' WHERE id=?", (did_id))
            
            print(f"  ✅ KYC: {name} → {status}")
    
    # 创建 SBT 凭证
    sbt_types = ["KYC_VERIFIED", "MEMBER", "VIP", "MERCHANT", "ECOSYSTEM_USER"]
    sbt_levels = ["standard", "gold", "platinum", "diamond"]
    for i, did_rec in enumerate(dids_db):
        did_id, user_id, did_str = did_rec
        sbt_type = sbt_types[i % len(sbt_types)]
        level = sbt_levels[i % len(sbt_levels)]
        
        cur.execute("SELECT id FROM sbt_credentials WHERE didId=? AND credentialType=?", (did_id, sbt_type))
        if not cur.fetchone():
            wallet_addr = f"0x{'%040d' % user_id}ABCDEF1234567890"
            cur.execute("""INSERT INTO sbt_credentials (userId, didId, walletAddress, credentialType, credentialLevel, status, issuedBy, issuedAt, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 'active', 1, datetime('now'), datetime('now'), datetime('now'))""",
                (user_id, did_id, wallet_addr.lower(), sbt_type, level))
            print(f"  ✅ SBT: {sbt_type} ({level}) → user={user_id}")
    
    # 设置平台权限
    platforms = ["portal", "ecommerce", "exchange", "gaming"]
    for did_rec in dids_db[:2]:
        did_id, user_id, _ = did_rec
        for plat in platforms:
            allowed = plat != "exchange"  # 默认不开交易所
            cur.execute("""INSERT OR IGNORE INTO platform_permissions (userId, didId, platform, allowed, permissionStatus, updatedBy, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))""",
                (user_id, did_id, plat, int(allowed), "approved" if allowed else "pending"))
        print(f"  ✅ 权限矩阵: did_id={did_id}")
    
    # 设置不同的 DID 状态
    if len(dids_db) >= 3:
        cur.execute("UPDATE did_identities SET status='frozen', frozenAt=datetime('now'), riskLevel='high' WHERE id=?", (dids_db[2][0],))
        print(f"  ✅ 冻结: did_id={dids_db[2][0]}")
    if len(dids_db) >= 4:
        cur.execute("UPDATE did_identities SET status='created', kycStatus='unverified', riskLevel='low' WHERE id=?", (dids_db[3][0],))
        print(f"  ✅ 待激活: did_id={dids_db[3][0]}")
    if len(dids_db) >= 5:
        cur.execute("UPDATE did_identities SET status='active', kycStatus='verified', memberLevel='gold', riskLevel='medium' WHERE id=?", (dids_db[4][0],))
        print(f"  ✅ 金牌会员: did_id={dids_db[4][0]}")
    
    conn.commit()

# 最终统计
print("\n" + "=" * 50)
print("[最终统计]")
cur.execute("SELECT COUNT(*), GROUP_CONCAT(DISTINCT status) FROM did_identities")
row = cur.fetchone()
print(f"  DID总数: {row[0]}, 状态: {row[1]}")

cur.execute("SELECT COUNT(*) FROM wallet_accounts")
print(f"  钱包数: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM kyc_records")
print(f"  KYC记录: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM sbt_credentials")
print(f"  SBT凭证: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM platform_permissions")
print(f"  平台权限: {cur.fetchone()[0]}")

conn.close()

# ===== 5. 浏览器截图 =====
print("\n" + "=" * 50)
print("[浏览器截图验证]")

try:
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})
        
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)[:100]))
        
        # DID 列表页
        page.goto(f"{WEB}/did/list", wait_until='networkidle')
        page.wait_for_timeout(3000)
        page.screenshot(path=os.path.join(OUT, "did-list-data.png"), full_page=True)
        text = page.inner_text('body')
        print(f"\n  📸 DID列表页:")
        has_content = "暂无数据" not in text and "DID 统一身份管理" in text
        print(f"     渲染: {'✅ 成功' if has_content else '❌ 失败'}")
        print(f"     错误: {len(errors)}条")
        
        # Issue 页
        page.goto(f"{WEB}/did/issue", wait_until='networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(OUT, "did-issue-data.png"), full_page=True)
        print(f"  📸 Issue页: ✅ 截图完成")
        
        # Cards 页  
        page.goto(f"{WEB}/did/cards", wait_until='networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(OUT, "did-cards-data.png"), full_page=True)
        print(f"  📸 Cards页: ✅ 截图完成")
        
        browser.close()

except ImportError:
    print("  playwright 未安装")
except Exception as e:
    print(f"  截图错误: {e}")

print(f"\n✅ 全部完成! 截图目录: {OUT}")

# 清理临时文件
try:
    os.remove(r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\_check_db.py")
    os.remove(r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\_gen_did_data.py")
except:
    pass
