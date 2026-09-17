Get-ChildItem -Path . -Recurse -Include *.html, *.js | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content $path -Raw -Encoding UTF8
    $original = $content
    
    $content = $content.Replace('â‚¦', '$')
    $content = $content.Replace('MTNN', 'TSLA')
    $content = $content.Replace('ZENITHBANK', 'MSFT')
    
    if ($content -cne $original) {
        Set-Content -Path $path -Value $content -Encoding UTF8
        Write-Host "Fixed mangled symbol in $($path)"
    }
}
