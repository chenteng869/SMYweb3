$f = 'd:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api\src\modules\evidence\evidence.service.ts'
$c = [System.IO.File]::ReadAllText($f)

# Fix 1: blockNumber cast
$c = $c.Replace('blockNumber: evidence.blockNumber!', 'blockNumber: Number(evidence.blockNumber!)')

# Fix 2: status -> isVerified
$c = $c.Replace("evidence.status === 'confirmed'", 'evidence.isVerified')

# Fix 3: fileSize -> sizeBytes (all occurrences)
$c = $c.Replace('fileSize: true', 'sizeBytes: true')

# Fix 4: user relation -> did (in include blocks)
$c = $c.Replace("user: { select: { id: true, name: true } }", "did: { select: { id: true, did: true } }")

# Fix 5: userId -> didId in where clause
$c = $c.Replace('where: { userId },', 'where: { didId: userId },')
$c = $c.Replace('where: { userId }', 'where: { didId: userId }')

# Fix 6: Buffer to Uint8Array for Blob
$c = $c.Replace("new Blob([fileBuffer])", "new Blob([new Uint8Array(fileBuffer)])")

# Fix 7: MinIO prototype issue - remove .prototype
$c = $c.Replace(
  ").default.prototype.getObject.call(",
  ").default.getObject.call("
)

[System.IO.File]::WriteAllText($f, $c)
Write-Host "evidence.service.ts all fixes applied"
