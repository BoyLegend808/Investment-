Get-ChildItem -Path . -Recurse -Include *.html, *.js | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content $path -Raw
    $original = $content
    
    # Currency and Terms
    $content = $content -replace '?', '$'
    $content = $content -replace '&#8358;', '$'
    $content = $content -replace 'Naira', 'Dollars'
    $content = $content -replace 'Nigerian', 'Global'
    $content = $content -replace 'Nigeria', 'Global Markets'
    $content = $content -replace 'NGX ASI', 'S&P 500'
    $content = $content -replace 'NGX', 'Global'
    $content = $content -replace 'DANGCEM', 'AAPL'
    $content = $content -replace 'Federal Republic of Global Markets', 'US Treasury'
    $content = $content -replace 'Federal Government', 'Government'
    $content = $content -replace 'Lagos and Abuja', 'New York, London, and Dubai'
    $content = $content -replace 'SEC, NDIC, and NSE', 'SEC, FDIC, and Global Exchanges'
    $content = $content -replace 'NDIC Insured', 'FDIC Insured'
    $content = $content -replace 'NDPR', 'GDPR'
    $content = $content -replace 'WAT', 'EST'
    
    if ($content -cne $original) {
        Set-Content -Path $path -Value $content -Encoding UTF8
    }
}
