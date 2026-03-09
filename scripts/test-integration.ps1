<# 
  Integration test runner for Vannette.
  Spins up a disposable PostgreSQL container, runs migrations, executes tests, 
  and tears everything down. Zero impact on production.
#>

$ErrorActionPreference = "Stop"

$TEST_DB_URL = "postgresql://testuser:testpass@localhost:5433/vannette_test"
$ComposeFile = Join-Path $PSScriptRoot "docker-compose.test.yml"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }

# ── 1. Start test database ──
Write-Step "Starting test PostgreSQL container..."
docker compose -f $ComposeFile up -d --wait

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start test database. Is Docker Desktop running?" -ForegroundColor Red
    exit 1
}

try {
    # ── 2. Run Prisma migrations against test DB ──
    Write-Step "Running Prisma migrations..."
    $env:DATABASE_URL = $TEST_DB_URL
    npx prisma migrate deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Migrations failed." -ForegroundColor Red
        exit 1
    }

    # ── 3. Run integration tests ──
    Write-Step "Running integration tests..."
    $env:TEST_DATABASE_URL = $TEST_DB_URL
    npx vitest run src/test/integration.test.ts
    $testExit = $LASTEXITCODE
}
finally {
    # ── 4. Tear down (always runs, even if tests fail) ──
    Write-Step "Tearing down test database..."
    docker compose -f $ComposeFile down -v

    # Restore DATABASE_URL from .env (dotenv will reload on next run)
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\TEST_DATABASE_URL -ErrorAction SilentlyContinue
}

if ($testExit -eq 0) {
    Write-Host "`n✅ All integration tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Some integration tests failed." -ForegroundColor Red
}

exit $testExit
