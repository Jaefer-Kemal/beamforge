# ==============================================================================
# BeamForge Local Dual-Node Bootstrap Script (Windows Native)
# Launches hidden grader node and interactive learner node on localhost
# ==============================================================================

param(
    [switch]$Stop,
    [switch]$Status,
    [string]$Cookie = "bf_internal_sandbox_cookie"
)

$ErlCmd = Get-Command erl.exe -ErrorAction SilentlyContinue
$ErlPath = if (Test-Path "D:\Program Files\Erlang OTP\bin\erl.exe") {
    "D:\Program Files\Erlang OTP\bin\erl.exe"
} elseif ($ErlCmd) {
    $ErlCmd.Source
} else {
    $null
}

$ErlcCmd = Get-Command erlc.exe -ErrorAction SilentlyContinue
$ErlcPath = if (Test-Path "D:\Program Files\Erlang OTP\bin\erlc.exe") {
    "D:\Program Files\Erlang OTP\bin\erlc.exe"
} elseif ($ErlcCmd) {
    $ErlcCmd.Source
} else {
    $null
}

if (-not $ErlPath) {
    Write-Error "[BeamForge] Erlang/OTP not found! Please ensure erl.exe is installed."
    exit 1
}

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$HarnessDir = "$ProjectRoot\runtimes\erl-harness"
$EbinDir = "$HarnessDir\ebin"

# 1. Stop command
if ($Stop) {
    Write-Host "==> [BeamForge] Stopping local BEAM sandbox nodes..." -ForegroundColor Yellow
    Get-Process -Name erl, beam.smp -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match "learner" -or $_.CommandLine -match "grader"
    } | Stop-Process -Force
    Write-Host "==> [BeamForge] Sandbox nodes stopped." -ForegroundColor Green
    exit 0
}

# 2. Compile harness apps if needed
if (-not (Test-Path $EbinDir)) {
    New-Item -ItemType Directory -Path $EbinDir -Force | Out-Null
}

Write-Host "==> [BeamForge] Building erl-harness bytecode..." -ForegroundColor Cyan
$SourceFiles = (Get-ChildItem -Recurse $HarnessDir -Filter *.erl).FullName
& $ErlcPath -I "$HarnessDir\apps" -o $EbinDir $SourceFiles

if ($LASTEXITCODE -ne 0) {
    Write-Error "[BeamForge] Failed to compile erl-harness bytecode."
    exit 1
}

# 3. Boot hidden grader node in background
Write-Host "==> [BeamForge] Booting hidden verification node (grader@localhost)..." -ForegroundColor Magenta
$GraderArgs = @(
    "-sname", "grader",
    "-hidden",
    "-setcookie", $Cookie,
    "+P", "65536",
    "+t", "1048576",
    "-pa", $EbinDir,
    "-noshell",
    "-eval", "application:ensure_all_started(bf_grader), application:ensure_all_started(bf_tracer), application:ensure_all_started(bf_xmpp_sim), io:format('==> [grader] Nodes ready.~n')."
)

$GraderProc = Start-Process -FilePath $ErlPath -ArgumentList $GraderArgs -PassThru -WindowStyle Hidden

Start-Sleep -Milliseconds 600

# 4. Boot or connect learner node
Write-Host "==> [BeamForge] Dual-node cluster active. Starting learner@localhost shell..." -ForegroundColor Green
Write-Host "    Grader Node : grader@$([System.Net.Dns]::GetHostName()) (Hidden verification node, PID $($GraderProc.Id))" -ForegroundColor Gray
Write-Host "    Cookie      : $Cookie" -ForegroundColor Gray
Write-Host "==============================================================================" -ForegroundColor DarkGray

& $ErlPath -sname learner -setcookie $Cookie +P 32768 +t 262144 +Q 4096 -pa $EbinDir
