param (
    [string]$Message = "Update"
)

Write-Host "🚀 Starting Dual Push Sequence..." -ForegroundColor Cyan

# Add all changes
Write-Host "1. Staging changes..."
git add .

# Commit
Write-Host "2. Committing with message: '$Message'"
git commit -m "$Message"

# Push to Origin
Write-Host "3. Pushing to ORIGIN (jacobjerin38)..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) { Write-Host "✅ Origin Success" -ForegroundColor Green } else { Write-Host "❌ Origin Failed" -ForegroundColor Red }

# Push to Backup
Write-Host "4. Pushing to BACKUP (jerinjacobai)..." -ForegroundColor Yellow
git push backup main
if ($LASTEXITCODE -eq 0) { Write-Host "✅ Backup Success" -ForegroundColor Green } else { Write-Host "❌ Backup Failed" -ForegroundColor Red }

Write-Host "✨ All Done!" -ForegroundColor Cyan
