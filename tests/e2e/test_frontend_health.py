from playwright.sync_api import sync_playwright
import os, json

OUT = r'd:\3、系统项目开发\trae_projects\SMYweb3.020260527\tests\e2e\screenshots'
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    pages_to_test = [
        ('/', '首页'),
        ('/login', '登录页'),
        ('/did/list', 'DID列表'),
        ('/did/issue', 'DID签发'),
        ('/did/cards', 'DID名片'),
    ]
    
    results = []
    
    for path, name in pages_to_test:
        page = browser.new_page(viewport={'width': 1400, 'height': 900})
        
        errors = []
        console_errors = []
        
        def on_pageerror(e):
            errors.append(str(e)[:200])
            
        def on_console(msg):
            if msg.type == 'error':
                console_errors.append('[{}] {}'.format(msg.type, msg.text[:150]))
                
        page.on('pageerror', on_pageerror)
        page.on('console', on_console)
        
        try:
            url = 'http://localhost:5180{}'.format(path)
            page.goto(url, wait_until='networkidle', timeout=15000)
            page.wait_for_timeout(2000)
            
            safe_name = name.replace('/', '_')
            screenshot_path = os.path.join(OUT, 'health-{}.png'.format(safe_name))
            page.screenshot(path=screenshot_path, full_page=True)
            
            text = page.inner_text('body')
            has_content = len(text) > 100
            
            results.append({
                'page': name,
                'path': path,
                'status': 'OK' if has_content else 'EMPTY',
                'js_errors': len(errors),
                'console_errors': len(console_errors),
                'errors_detail': errors[:3] if errors else [],
                'screenshot': screenshot_path,
                'text_preview': text[:200]
            })
        except Exception as e:
            results.append({
                'page': name, 'path': path, 
                'status': 'CRASH', 'error': str(e)[:200]
            })
        finally:
            page.close()
    
    browser.close()
    
    print('=== FRONTEND HEALTH RESULTS ===')
    for r in results:
        status = r.get('status', '?')
        print('\n[{}] {} ({})'.format(status, r['page'], r['path']))
        if 'js_errors' in r:
            print('  JS Errors: {}'.format(r['js_errors']))
            for e in r.get('errors_detail', []):
                print('    - {}'.format(e))
        if 'text_preview' in r:
            print('  Text: {}...'.format(r['text_preview'][:100]))
    
    with open(os.path.join(OUT, 'health-frontend.json'), 'w') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
