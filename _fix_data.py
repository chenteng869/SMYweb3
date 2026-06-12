"""修复 KYC 列名并完成剩余数据插入"""
import sqlite3, os

DB = r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api\prisma\dev.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# 检查 kyc_records 表结构
print("=== kyc_records 表结构 ===")
cur.execute("PRAGMA table_info(kyc_records)")
for col in cur.fetchall():
    print(f"  {col[1]} ({col[2]})")

# 检查 sbt_credentials 表结构
print("\n=== sbt_credentials 表结构 ===")
cur.execute("PRAGMA table_info(sbt_credentials)")
for col in cur.fetchall():
    print(f"  {col[1]} ({col[2]})")

# 检查 platform_permissions 表结构
print("\n=== platform_permissions 表结构 ===")
cur.execute("PRAGMA table_info(platform_permissions)")
for col in cur.fetchall():
    print(f"  {col[1]} ({col[2]})")

# 用正确的列名插入数据
dids_db = [(1,1,"did:zsdt:U2026000001"),(2,2,"did:zsdt:U2026000002"),(3,3,"did:zsdt:U2026000003"),(4,4,"did:zsdt:U2026000004"),(5,5,"did:zsdt:U2026000005")]

names = {1:"张创业", 2:"李总", 3:"Wang Wei", 4:"陈小姐", 5:"刘老板"}

# KYC 记录
print("\n--- 插入 KYC ---")
for i, (did_id, user_id, did_str) in enumerate(dids_db[:3]):
    name = names.get(user_id, f"User{user_id}")
    status = "approved" if i == 0 else ("pending" if i == 1 else "rejected")
    try:
        cur.execute(f"""INSERT INTO kyc_records (userId, didId, provider, kycStatus, 
            fullNameEncrypted, documentType, documentNoEncrypted, country, 
            resultHash, createdAt, updatedAt)
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

# SBT 凭证
print("\n--- 插入 SBT ---")
sbt_types = ["KYC_VERIFIED", "MEMBER", "VIP", "MERCHANT", "ECOSYSTEM_USER"]
sbt_levels = ["standard", "gold", "platinum", "diamond"]
for i, (did_id, user_id, did_str) in enumerate(dids_db):
    sbt_type = sbt_types[i % len(sbt_types)]
    level = sbt_levels[i % len(sbt_levels)]
    wallet_addr = f"0x{'%040d' % user_id}ABCDEF1234567890"
    try:
        cur.execute("""INSERT INTO sbt_credentials (userId, didId, walletAddress, 
            credentialType, credentialLevel, status, issuedBy, issuedAt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, 'active', 1, datetime('now'), datetime('now'), datetime('now'))""",
            (user_id, did_id, wallet_addr.lower(), sbt_type, level))
        print(f"  ✅ SBT: {sbt_type} ({level}) → user={user_id}")
    except Exception as e:
        print(f"  ⚠️ SBT user{user_id}: {e}")

# 平台权限
print("\n--- 插入权限 ---")
platforms = ["portal", "ecommerce", "exchange", "gaming"]
for did_id, user_id, did_str in dids_db[:2]:
    for plat in platforms:
        allowed = plat != "exchange"
        try:
            cur.execute("""INSERT OR IGNORE INTO platform_permissions 
                (userId, didId, platform, allowed, permissionStatus, updatedBy, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))""",
                (user_id, did_id, plat, int(allowed), "approved" if allowed else "pending"))
        except Exception as e:
            print(f"  ⚠️ 权限: {e}")
    print(f"  ✅ 权限矩阵: did_id={did_id}")

# 设置不同状态
if len(dids_db) >= 3:
    cur.execute("UPDATE did_identities SET status='frozen', frozenAt=datetime('now'), riskLevel='high' WHERE id=?", (dids_db[2][0],))
    print(f"\n  ✅ 冻结: did_id={dids_db[2][0]}")
if len(dids_db) >= 4:
    cur.execute("UPDATE did_identities SET status='created', kycStatus='unverified', riskLevel='low' WHERE id=?", (dids_db[3][0],))
    print(f"  ✅ 待激活: did_id={dids_db[3][0]}")
if len(dids_db) >= 5:
    cur.execute("UPDATE did_identities SET status='active', kycStatus='verified', memberLevel='gold', riskLevel='medium' WHERE id=?", (dids_db[4][0],))
    print(f"  ✅ 金牌会员: did_id={dids_db[4][0]}")

conn.commit()

# 最终统计
print("\n" + "=" * 40)
print("[最终统计]")
tables = ["did_identities", "wallet_accounts", "kyc_records", "sbt_credentials", "platform_permissions"]
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {cur.fetchone()[0]}")

# 显示 DID 状态分布
print("\n[DID状态分布]")
cur.execute("SELECT status, COUNT(*) FROM did_identities GROUP BY status")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
print("\n✅ 数据准备完成!")
