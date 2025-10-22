# -----------------------------------------------
# Refevo Dev Reset Script
# Clears key reference tables for clean E2E testing
# Requires: PowerShell 7+, valid SB_URL + SB_SERVICE_ROLE_KEY
# -----------------------------------------------

$SB_URL = "https://nimeatbatzdchlfwnrdx.supabase.co"
$SERVICE_ROLE_KEY = "<YOUR_SUPABASE_SERVICE_ROLE_KEY>"   # replace or load from env

$tables = @(
    "referee_email_logs",
    "reference_email_logs",
    "referees",
    "candidates",
    "audit_logs"
)

foreach ($table in $tables) {
    Write-Host "🧹 Truncating $table..."
    $response = Invoke-RestMethod -Uri "$SB_URL/rest/v1/rpc/truncate_table" `
        -Headers @{
            "apikey" = $SERVICE_ROLE_KEY
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
        } `
        -Method POST `
        -Body (@{ table_name = $table } | ConvertTo-Json)
    Write-Host "✅ $table cleared."
}

Write-Host "-----------------------------------------------"
Write-Host "✅ All key tables cleared. IDs reset to 1."
Write-Host "You can now run a fresh end-to-end flow test."
Write-Host "-----------------------------------------------"
