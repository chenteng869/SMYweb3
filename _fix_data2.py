"""使用正确的 Prisma @@map 列名插入数据"""
import sqlite3, os

DB = r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api\prisma\dev.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# 查所有表名
print("=== 所有表 ===")
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%did%' OR name LIKE '%kyc%' OR name LIKE '%sbt%' OR name LIKE '%wallet%' OR name LIKE '%platform%' ORDER BY name")
for row in cur.fetchall():
    print(f"  {row[0]}")

# 检查 platform_permissions 实际表名
print("\n=== 搜索权限表 ===")
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%perm%' OR name LIKE '%access%')")
for row in cur.fetchall():
    print(f"  找到: {row[0]}")
    # 显示结构
    cur.execute(f"PRAGMA table_info({row[0]})")
    for c in cur.fetchall():
        print(f"    {c[1]} ({c[2]})")

dids_db = [(1,1,"did:zsdt:U2026000001"),(2,2,"did:zsdt:U2026000002"),(3,3,"did:zsdt:U2026000003"),(4,4,"did:zsdt:U2026000004"),(5,5,"did:zsdt:U2026000005")]
names = {1:"张创业", 2:"李总", 3:"Wang Wei", 4:"陈小姐", 5:"刘老板"}

# ===== KYC (正确列名) =====
print("\n--- KYC ---")
for i, (did_id, user_id, did_str) in enumerate(dids_db[:3]):
    name = names.get(user_id, f"User{user_id}")
    status = "approved" if i == 0 else ("pending" if i == 1 else "rejected")
    try:
        cur.execute("""INSERT INTO kyc_records (userId, didId, provider, kycStatus,
            full_name_encrypted, document_type, document_no_encrypted, country,
            result_hash, createdAt, updatedAt)
            VALUES (?, ?, 'manual', ?, ?, 'id_card', ?, 'CN',
            hex(randomblob(16)), datetime('now'), datetime('now'))""",
            (user_id, did_id, status, name, f"{110101+i:06d}199001011234"))
        
        if status == "approved":
            cur.execute("UPDATE kyc_records SET reviewedBy=1, reviewedAt=datetime('now') WHERE id=last_insert_rowid()")
            cur.execute("UPDATE did_identities SET kycStatus='verified', status='active', activatedAt=datetime('now') WHERE id=?", (did_id,))
        elif status == "rejected":
            cur.execute("UPDATE kyc_records SET reviewedBy=1, reviewedAt=datetime('now'), rejectionReason='证件模糊' WHERE id=last_insert_rowid()")
            cur.execute("UPDATE did_identities SET kycStatus='rejected' WHERE id=?", (did_id,))
        print(f"  ✅ KYC: {name} → {status}")
    except Exception as e:
        print(f"  ⚠️ KYC user{user_id}: {e}")

# ===== SBT (正确列名) =====
print("\n--- SBT ---")
sbt_types = ["KYC_VERIFIED", "MEMBER", "VIP", "MERCHANT", "ECOSYSTEM_USER"]
sbt_levels = ["standard", "gold", "platinum", "diamond"]
for i, (did_id, user_id, did_str) in enumerate(dids_db):
    sbt_type = sbt_types[i % len(sbt_types)]
    level = sbt_levels[i % len(sbt_levels)]
    wallet_addr = f"0x{'%040d' % user_id}ABCDEF1234567890"
    try:
        cur.execute("""INSERT INTO sbt_credentials (userId, didId, walletAddress,
            credential_type, credential_level, status, issued_by, issued_at, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, 'active', 1, datetime('now'), datetime('now'), datetime('now'))""",
            (user_id, did_id, wallet_addr.lower(), sbt_type, level))
        print(f"  ✅ SBT: {sbt_type} ({level}) → user={user_id}")
    except Exception as e:
        print(f"  ⚠️ SBT user{user_id}: {e}")

# ===== 平台权限 (查找实际表名) =====
print("\n--- 权限 ---")
# 尝试可能的表名
perm_table = None
for tname in ['did_platform_permissions', 'platform_permissions', 'PlatformPermission']:
    try:
        cur.execute(f"SELECT 1 FROM {tname} LIMIT 1")
        perm_table = tname
        break
    except:
        pass

if perm_table:
    print(f"  使用表: {perm_table}")
    platforms = ["portal", "ecommerce", "exchange", "gaming"]
    for did_id, user_id, did_str in dids_db[:2]:
        for plat in platforms:
            allowed = plat != "exchange"
            try:
                # 检查列名
                cur.execute(f"PRAGMA table_info({perm_table})")
                cols = [c[1] for c in cur.fetchall()]
                has_didId = 'didId' in cols or 'did_id' in cols
                
                if has_didId:
                    cur.execute(f"""INSERT OR IGNORE INTO {perm_table}
                        (userId, didId, platform, allowed, permissionStatus, updatedBy, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))""",
                        (user_id, did_id, plat, int(allowed), "approved" if allowed else "pending"))
            except Exception as e:
                pass
        print(f"  ✅ 权限矩阵: did_id={did_id}")
else:
    print("  ⚠️ 未找到权限表，跳过")

conn.commit()

# 最终统计
print("\n" + "=" * 40)
print("[最终统计]")
for t in ["did_identities", "wallet_accounts", "kyc_records", "sbt_credentials"]:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t}: {cur.fetchone()[0]}")
    except:
        print(f"  {t}: 表不存在")

if perm_table:
    cur.execute(f"SELECT COUNT(*) FROM {perm_table}")
    print(f"  {perm_table}: {cur.fetchone()[0]}")

print("\n[DID状态]")
cur.execute("SELECT id, did, status, kycStatus, riskLevel, memberLevel FROM did_identities")
for r in cur.fetchall():
    print(f"  [{r[0]}] {r[1]} | {r[2]} | KYC:{r[3]} | 风险:{r[4]} | 等级:{r[5]}")

conn.close()
print("\n✅ 完成!")
