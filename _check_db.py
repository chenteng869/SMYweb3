import sqlite3, json

conn = sqlite3.connect(r'd:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api\prisma\dev.db')
cur = conn.cursor()

print("=== 所有表 ===")
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
for row in cur.fetchall():
    print(f"  {row[0]}")

# 查找用户相关表
print("\n=== 用户表数据 ===")
for table in ['admin_user', 'AdminUser', 'users', 'User']:
    try:
        cur.execute(f"SELECT * FROM {table} LIMIT 5")
        cols = [d[0] for d in cur.description]
        print(f"\n-- {table} ({cols}) --")
        for row in cur.fetchall():
            print(row)
    except:
        pass

conn.close()
