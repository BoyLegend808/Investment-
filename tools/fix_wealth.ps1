$extensions = @(".html", ".js")
$files = Get-ChildItem -Path . -Recurse -File | Where-Object { $extensions -contains $_.Extension -and $_.FullName -notmatch "\\\.git\\" }

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content

    $content = $content -replace "Crest <span>CAPITAL</span>", "Crest <span>WEALTH</span>"
    $content = $content -replace "CREST <span>CAPITAL</span>", "CREST <span>WEALTH</span>"

    if ($content -cne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Fixed CAPITAL to WEALTH in $($file.FullName)"
    }
}
Write-Host "Fix complete."
