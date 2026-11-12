<#
.SYNOPSIS
  Instagram Clone 원클릭 실행 스크립트
  패키지 설치 → .env/데모 데이터 준비 → 백엔드 + 프론트엔드 실행 → 브라우저 열기

.EXAMPLE
  .\run.ps1               # 기본 실행
  .\run.ps1 -NoBrowser    # 브라우저 자동 열기 끄기
  .\run.ps1 -Reset        # DB/업로드 초기화 후 데모 데이터 다시 생성
  .\run.ps1 -Reload       # 백엔드 코드 변경 시 자동 재시작 (npm run dev 가 사용)
#>
param(
    [switch]$NoBrowser,
    [switch]$Reset,
    [switch]$Reload,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$BackendPort = 8000
$FrontendPort = 5173
$AppUrl = "http://localhost:$FrontendPort"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }
function Fail($msg) {
    Write-Host "`n[오류] $msg" -ForegroundColor Red
    exit 1
}

# 새로 설치한 Python/Node/Git을 바로 인식하도록 PATH를 레지스트리에서 다시 읽음
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

function Get-Stamp($file) { (Get-FileHash $file -Algorithm SHA256).Hash }

function Test-PortInUse($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { return (Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue) }
    # 리스너 목록에 안 잡히는 경우를 대비해 실제 접속도 시도
    foreach ($addr in @('127.0.0.1', '::1')) {
        $client = New-Object System.Net.Sockets.TcpClient([System.Net.IPAddress]::Parse($addr).AddressFamily)
        try {
            if ($client.ConnectAsync($addr, $port).Wait(300) -and $client.Connected) {
                return [pscustomobject]@{ ProcessName = '알 수 없음'; Id = '?' }
            }
        } catch { } finally { $client.Dispose() }
    }
    return $null
}

# 백엔드는 별도(숨김) 콘솔에서 실행하고, 로그 파일을 읽어 이 창에 이어서 출력함.
# 이유: Windows에서 uvicorn --reload 는 재시작할 때 콘솔 전체에 Ctrl+C 를 보내므로,
#       같은 콘솔을 쓰면 이 스크립트와 프론트엔드까지 함께 종료됨.
$script:LogFiles = @()
$script:LogPos = @{}
function Show-BackendLog {
    foreach ($f in $script:LogFiles) {
        if (-not (Test-Path $f)) { continue }
        $fs = [IO.File]::Open($f, 'Open', 'Read', 'ReadWrite')
        try {
            $pos = [long]$script:LogPos[$f]
            if ($fs.Length -lt $pos) { $pos = 0 }
            if ($fs.Length -eq $pos) { continue }
            [void]$fs.Seek($pos, 'Begin')
            $text = (New-Object IO.StreamReader($fs, [Text.Encoding]::UTF8)).ReadToEnd()
            $script:LogPos[$f] = $fs.Length
            if ($text) { Write-Host -NoNewline $text }
        } finally { $fs.Dispose() }
    }
}

function Wait-Http($url, $seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
            Show-BackendLog
            return $true
        } catch { Show-BackendLog; Start-Sleep -Milliseconds 500 }
    }
    return $false
}

# 이전 실행에서 창을 강제로 닫아 남아 있는 이 프로젝트의 백엔드 프로세스 정리
function Stop-StaleBackend {
    $venvPy = [regex]::Escape((Join-Path $Backend 'venv\Scripts\python.exe'))
    Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match $venvPy -and $_.CommandLine -match 'uvicorn app\.main:app' } |
        ForEach-Object {
            Ok "이전 실행에서 남은 백엔드 종료 (PID $($_.ProcessId))"
            & taskkill.exe /PID $_.ProcessId /T /F 2>$null | Out-Null
        }
}

Write-Host '================================================' -ForegroundColor Magenta
Write-Host '   Instagram Clone  (React + FastAPI + SQLite)   ' -ForegroundColor Magenta
Write-Host '================================================' -ForegroundColor Magenta

# ---------------------------------------------------------------- 1. 필수 프로그램
Step '필수 프로그램 확인'
$python = $null
foreach ($cand in @('py', 'python')) {
    $cmd = Get-Command $cand -ErrorAction SilentlyContinue
    if (-not $cmd) { continue }
    # MS Store 설치본(WindowsApps)도 허용. 빈 스토어 바로가기는 버전 출력에 실패하므로 걸러짐
    $ver = try { & $cand -c "import sys; print('%d.%d' % sys.version_info[:2])" 2>$null } catch { $null }
    if ($LASTEXITCODE -eq 0 -and $ver -match '^\d+\.\d+$' -and [version]$ver -ge [version]'3.10') { $python = $cand; break }
}
if (-not $python) { Fail "Python 3.10 이상이 필요합니다. 설치: winget install Python.Python.3.12" }
Ok "Python $ver"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail "Node.js가 필요합니다. 설치: winget install OpenJS.NodeJS.LTS (설치 후 이 스크립트를 다시 실행)" }
Ok "Node.js $(node --version)"

# ---------------------------------------------------------------- 2. 포트 확인
Stop-StaleBackend
foreach ($p in @($BackendPort, $FrontendPort)) {
    $proc = Test-PortInUse $p
    if ($proc) { Fail "포트 $p 이(가) 이미 사용 중입니다 ($($proc.ProcessName), PID $($proc.Id)). 해당 프로그램을 종료한 뒤 다시 실행하세요." }
}

# ---------------------------------------------------------------- 3. 백엔드 패키지
$venvPython = Join-Path $Backend 'venv\Scripts\python.exe'
$reqFile = Join-Path $Backend 'requirements.txt'
$reqStamp = Join-Path $Backend 'venv\.requirements.sha256'

if (-not $SkipInstall) {
    Step '백엔드 패키지 준비 (Python venv)'
    if (-not (Test-Path $venvPython)) {
        Ok '가상환경 생성 중...'
        & $python -m venv (Join-Path $Backend 'venv')
        if ($LASTEXITCODE -ne 0) { Fail '가상환경 생성에 실패했습니다.' }
    }
    $want = Get-Stamp $reqFile
    $have = if (Test-Path $reqStamp) { Get-Content $reqStamp } else { '' }
    if ($want -ne $have) {
        Ok 'pip install -r requirements.txt (처음 한 번은 1~2분 걸릴 수 있습니다)'
        & $venvPython -m pip install -q --disable-pip-version-check -r $reqFile
        if ($LASTEXITCODE -ne 0) { Fail 'Python 패키지 설치에 실패했습니다.' }
        Set-Content -Path $reqStamp -Value $want
    } else { Ok '이미 최신 상태' }
}
if (-not (Test-Path $venvPython)) { Fail 'backend\venv 가 없습니다. -SkipInstall 없이 실행하세요.' }

# ---------------------------------------------------------------- 4. .env & 데모 데이터
Step '환경 설정 및 데이터베이스'
$envFile = Join-Path $Backend '.env'
if (-not (Test-Path $envFile)) {
    $secret = & $venvPython -c "import secrets; print(secrets.token_urlsafe(48))"
    $content = (Get-Content (Join-Path $Backend '.env.example') -Raw) -replace 'change-me-to-a-long-random-string', $secret
    [IO.File]::WriteAllText($envFile, $content, (New-Object Text.UTF8Encoding $false))
    Ok '.env 생성 (랜덤 SECRET_KEY)'
} else { Ok '.env 있음' }

$dbFile = Join-Path $Backend 'instagram.db'
Push-Location $Backend
try {
    if ($Reset) {
        Ok '데이터 초기화 후 데모 데이터 생성'
        & $venvPython seed.py --reset
    } elseif (-not (Test-Path $dbFile)) {
        Ok '첫 실행: 데모 데이터 생성'
        & $venvPython seed.py
    } else { Ok '기존 데이터베이스 사용' }
    if ($LASTEXITCODE -ne 0) { Fail '데모 데이터 생성에 실패했습니다.' }
} finally { Pop-Location }

# ---------------------------------------------------------------- 5. 프론트엔드 패키지
$lockFile = Join-Path $Frontend 'package-lock.json'
$nodeStamp = Join-Path $Frontend 'node_modules\.package-lock.sha256'
if (-not $SkipInstall) {
    Step '프론트엔드 패키지 준비 (npm)'
    $want = Get-Stamp $lockFile
    $have = if (Test-Path $nodeStamp) { Get-Content $nodeStamp } else { '' }
    if (-not (Test-Path (Join-Path $Frontend 'node_modules')) -or $want -ne $have) {
        Ok 'npm install (처음 한 번은 1~2분 걸릴 수 있습니다)'
        Push-Location $Frontend
        try { & npm.cmd install --no-audit --no-fund --loglevel=error } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { Fail 'npm 패키지 설치에 실패했습니다.' }
        Set-Content -Path $nodeStamp -Value (Get-Stamp $lockFile)
    } else { Ok '이미 최신 상태' }
}
$viteJs = Join-Path $Frontend 'node_modules\vite\bin\vite.js'
if (-not (Test-Path $viteJs)) { Fail 'frontend\node_modules 가 없습니다. -SkipInstall 없이 실행하세요.' }

# ---------------------------------------------------------------- 6. 서버 실행
Step '서버 실행'
$backendArgs = @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', $BackendPort)
if ($Reload) { $backendArgs += @('--reload', '--reload-dir', 'app') }  # venv 등은 감시하지 않음
$logDir = Join-Path $Backend 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$outLog = Join-Path $logDir 'backend.out.log'
$errLog = Join-Path $logDir 'backend.err.log'
foreach ($f in @($outLog, $errLog)) { [IO.File]::WriteAllText($f, '') }
$script:LogFiles = @($errLog, $outLog)
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUNBUFFERED = '1'

$procs = @()
try {
    $procs += Start-Process -FilePath $venvPython -ArgumentList $backendArgs -WorkingDirectory $Backend `
        -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
    if (-not (Wait-Http "http://127.0.0.1:$BackendPort/api/health" 40)) { Fail '백엔드가 시작되지 않았습니다. 위 로그를 확인하세요.' }
    Ok "백엔드   http://localhost:$BackendPort   (API 문서: /docs)"

    $procs += Start-Process -FilePath $node.Source -ArgumentList @("`"$viteJs`"", '--port', $FrontendPort, '--strictPort') -WorkingDirectory $Frontend -NoNewWindow -PassThru
    if (-not (Wait-Http $AppUrl 60)) { Fail '프론트엔드가 시작되지 않았습니다. 위 로그를 확인하세요.' }
    Ok "프론트엔드 $AppUrl"

    if (-not $NoBrowser) { Start-Process $AppUrl }

    Write-Host ''
    Write-Host "  앱 주소   : $AppUrl" -ForegroundColor Yellow
    Write-Host '  데모 계정 : demo / password123' -ForegroundColor Yellow
    Write-Host '  종료      : 이 창에서 Ctrl+C' -ForegroundColor Yellow
    Write-Host ''

    while ($true) {
        foreach ($p in $procs) {
            if ($p.HasExited) { Show-BackendLog; Fail "서버 프로세스(PID $($p.Id))가 종료되었습니다. 위 로그를 확인하세요." }
        }
        Show-BackendLog
        Start-Sleep -Milliseconds 300
    }
} finally {
    # Ctrl+C 또는 오류 시 두 서버(자식 프로세스 포함)를 모두 정리
    foreach ($p in $procs) {
        if ($p -and -not $p.HasExited) { & taskkill.exe /PID $p.Id /T /F 2>$null | Out-Null }
    }
    Write-Host "`n서버를 종료했습니다." -ForegroundColor Cyan
}
