$files = Get-ChildItem -Path . -Filter *.html -Recurse
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $newContent = $content -replace '(<div class="ticker-item"><span class="ticker-symbol">USD/GBP</span>.*?</div>)\s*</div>\s*(<div class="ticker-item">|<!-- Loop duplicate)', "`$1`r`n      `$2"
    if ($newContent -ne $content) {
        Set-Content -Path $f.FullName -Value $newContent -Encoding UTF8
        Write-Host "Updated $($f.FullName)"
    }
}
