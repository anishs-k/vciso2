# Packs what the server needs into Downloads\vciso-deploy.tar.gz (run on the Windows laptop):
#   powershell -ExecutionPolicy Bypass -File deploy\aws\make-package.ps1
# Left out: node_modules, .venv, .git, old builds (image files), client bundles, secrets (.env), screenshots.
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$out = Join-Path $env:USERPROFILE 'Downloads\vciso-deploy.tar.gz'
$items = @('ctw-admin', 'db', 'docs', 'intake', 'scripts', 'src', 'vciso-platform', 'deploy',
           'Dockerfile', 'Dockerfile.dockerignore', '.dockerignore', 'package.json', 'package-lock.json',
           'docker-compose.yml', 'README.md', 'SETUP.md') | Where-Object { Test-Path (Join-Path $root $_) }
tar -czf $out -C $root `
  --exclude=node_modules --exclude=.env --exclude=ctw-admin/builds --exclude=ctw-admin/ui/dist `
  --exclude=vciso-platform/vciso-app/dist --exclude=__pycache__ @items
if ($LASTEXITCODE -ne 0) { throw 'tar failed' }
$mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "Package ready: $out ($mb MB)"
