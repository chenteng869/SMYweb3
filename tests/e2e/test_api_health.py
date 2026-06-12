import requests, json

API = "http://localhost:3001/api"
results = []

endpoints = [
    ("GET", "/did/stats", None, "DID统计"),
    ("GET", "/did?page=1&pageSize=10", None, "DID列表"),
    ("GET", "/did/sbt/types", None, "SBT类型"),
    ("GET", "/did/wallets/nonce?walletAddress=0x1234", None, "钱包Nonce"),
    ("GET", "/did/kyc/queue?page=1&pageSize=10", None, "KYC队列"),
    ("POST", "/did/register", {"userId": 999, "primaryWallet": "0xtest1234"}, "DID注册(测试)"),
]

for method, path, body, name in endpoints:
    try:
        url = "{}{}".format(API, path)
        if method == "GET":
            r = requests.get(url, timeout=5)
        else:
            r = requests.post(url, json=body, timeout=5)
        
        data = r.json()
        results.append({
            "endpoint": name,
            "method": method,
            "path": path,
            "status_code": r.status_code,
            "has_data": bool(data.get("data")),
            "success": data.get("success", False),
            "response_keys": list(data.keys())[:5] if isinstance(data, dict) else "non-dict",
            "size": len(json.dumps(data))
        })
    except Exception as e:
        results.append({"endpoint": name, "error": str(e)[:100]})

print("\n=== API HEALTH RESULTS ===")
for r in results:
    sc = r.get('status_code', '?')
    ok = '✅' if sc in (200,201) else ('⚠️' if sc == 401 else '❌')
    print("{} [{}] {} keys={}".format(ok, sc, r.get('endpoint', '?'), r.get('response_keys', '?')))

with open(r"d:\3、系统项目开发\trae_projects\SMYweb3.020260527\tests\e2e\screenshots\health-api.json", "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
