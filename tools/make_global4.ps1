$replacements = @{
    '₦' = '$'
    '&#8358;' = '$'
    'Naira' = 'Dollars'
    'Nigerian equities' = 'Global equities'
    'Nigerian Stocks' = 'US Stocks'
    'Nigerian' = 'Global'
    'Nigeria' = 'Global Markets'
    'NGX ASI' = 'S&P 500'
    'NGX' = 'Global'
    'DANGCEM' = 'AAPL'
    'Federal Republic of Nigeria' = 'US Treasury'
    'Federal Government' = 'Government'
    'Lagos and Abuja' = 'New York, London, and Dubai'
    'SEC, NDIC, and NSE' = 'SEC, FDIC, and Global Exchanges'
    'NDIC Insured' = 'FDIC Insured'
    'NDPR' = 'GDPR'
    'WAT' = 'EST'
}

Get-ChildItem -Path . -Recurse | Where-Object { $_.Extension -match "\.(html|js)$" } | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content $path -Raw -Encoding UTF8
    $original = $content
    
    foreach ($key in $replacements.Keys) {
        $content = $content.Replace($key, $replacements[$key])
    }
    
    if ($content -cne $original) {
        Set-Content -Path $path -Value $content -Encoding UTF8
        Write-Host "Updated $($path)"
    }
}
