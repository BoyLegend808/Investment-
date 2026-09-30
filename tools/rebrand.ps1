$extensions = @(".html", ".css", ".js", ".xml", ".txt", ".md", ".json")
$files = Get-ChildItem -Path . -Recurse -File | Where-Object { $extensions -contains $_.Extension -and $_.FullName -notmatch "\\\.git\\" }

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content

    # 1. novaracapital.com -> crestwealth.com
    $content = $content -replace "(?i)novaracapital\.com", "crestwealth.com"
    $content = $content -replace "(?i)novaracapital", "crestwealth"
    
    # 2. Novara Capital -> Crest Wealth
    $content = $content -replace "Novara Capital", "Crest Wealth"
    $content = $content -replace "NOVARA CAPITAL", "CREST WEALTH"
    
    # 3. Novara -> Crest
    $content = $content -replace "Novara", "Crest"
    $content = $content -replace "NOVARA", "CREST"

    if ($content -cne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Rebranded $($file.FullName)"
    }
}
Write-Host "Rebranding complete."
