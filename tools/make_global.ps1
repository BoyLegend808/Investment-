Get-ChildItem -Path . -Recurse -Include *.html, *.js | ForEach-Object {
     = .FullName
     = Get-Content  -Raw
     = 
    
    # Currency and Terms
     =  -replace '?', '$'
     =  -replace '&#8358;', '$'
     =  -replace 'Naira', 'Dollars'
     =  -replace 'Nigerian', 'Global'
     =  -replace 'Nigeria', 'Global Markets'
     =  -replace 'NGX ASI', 'S&P 500'
     =  -replace 'NGX', 'Global'
     =  -replace 'DANGCEM', 'AAPL'
     =  -replace 'Federal Republic of Global Markets', 'US Treasury'
     =  -replace 'Federal Government', 'Government'
     =  -replace 'Lagos and Abuja', 'New York, London, and Dubai'
     =  -replace 'SEC, NDIC, and NSE', 'SEC, FDIC, and Global Exchanges'
     =  -replace 'NDIC Insured', 'FDIC Insured'
     =  -replace 'NDPR', 'GDPR'
     =  -replace 'WAT', 'EST'
    
    if ( -ne ) {
        Set-Content -Path  -Value  -Encoding UTF8
    }
}
