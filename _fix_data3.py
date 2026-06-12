"""最终数据补全"""
import sqlite3

DB = r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api\prisma\dev.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

dids_db = [(1,1),(2,2),(3,3),(4,4),(5,5)]
names = {1:"张创业", 2:"李总", 3:"Wang Wei", 4:"陈小姐", 5:"刘老板"}

# 1. 钱包 - 检查列名
print("=== wallet_accounts 结构 ===")
cur.execute("PRAGMA table_info(wallet_accounts)")
for c in cur.fetchall():
    print(f"  {c[1]}")

print("\n--- 插入钱包 ---")
for did_id, user_id in dids_db:
    wallet_addr = f"0x{'%040d' % user_id}ABCDEF1234567890"
    try:
        cur.execute("""INSERT OR IGNORE INTO wallet_accounts 
            (userId, didId, walletAddress, chainId, walletType, isPrimary, role, riskStatus, linkedAt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'metamask', 1, 'primary', 'normal', datetime('now'), datetime('now'), datetime('now'))""",
            (user_id, did_id, wallet_addr.lower(), "1"))
        print(f"  ✅ 钱包 user{user_id}")
    except Exception as e:
        print(f"  ⚠️ 钱包 user{user_id}: {e}")

# 2. KYC 修复 reviewedAt -> reviewed_at
print("\n--- 修复 KYC ---")
# user1: approved
try:
    cur.execute("""INSERT INTO kyc_records (userId, didId, provider, kycStatus,
        full_name_encrypted, document_type, document_no_encrypted, country, result_hash, createdAt, updatedAt)
        VALUES (1, 1, 'manual', 'approved', '张创业', 'id_card', '110101199001011234', 'CN',
        hex(randomblob(16)), datetime('now'), datetime('now'))""")
    cur.execute("UPDATE kyc_records SET reviewed_by=1, reviewed_at=datetime('now') WHERE id=last_insert_rowid()")
    cur.execute("UPDATE did_identities SET kycStatus='verified', status='active', activatedAt=datetime('now') WHERE id=1")
    print("  ✅ KYC 张创业 → approved")
except Exception as e:
    print(f"  ⚠️ {e}")

# user3: rejected
try:
    cur.execute("""INSERT INTO kyc_records (userId, didId, provider, kycStatus,
        full_name_encrypted, document_type, document_no_encrypted, country, result_hash, rejectionReason, createdAt, updatedAt)
        VALUES (3, 3, 'manual', 'rejected', 'Wang Wei', 'passport', 'S1234567', 'SG',
        hex(randomblob(16)), '证件模糊', datetime('now'), datetime('now'))""")
    cur.execute("UPDATE kyc_records SET reviewed_by=1, reviewed_at=datetime('now') WHERE id=last_insert_rowid()")
    cur.execute("UPDATE did_identities SET kycStatus='rejected' WHERE id=3")
    print("  ✅ KYC Wang Wei → rejected")
except Exception as e:
    print(f"  ⚠️ {e}")

# 3. 平台权限 - 使用正确列名 permission_status / updated_by
print("\n--- 平台权限 ---")
platforms = ["portal", "ecommerce", "exchange", "gaming"]
for did_id, user_id in [(1,1), (2,2)]:
    for plat in platforms:
        allowed = plat != "exchange"
        try:
            cur.execute("""INSERT OR IGNORE INTO did_platform_permissions
                (userId, didId, platform, allowed, permission_status, updated_by, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))""",
                (user_id, did_id, plat, int(allowed), "approved" if allowed else "pending"))
        except Exception as e:
            print(f"  ⚠️ 权限 {plat}: {e}")
    print(f"  ✅ 权限矩阵 did_id={did_id}")

conn.commit()

# 最终统计
print("\n" + "=" * 40)
for t in ["did_identities", "wallet_accounts", "kyc_records", "sbt_credentials", "did_platform_permissions"]:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {cur.fetchone()[0]}")

conn.close()
print("\n✅ 数据全部就绪!")
