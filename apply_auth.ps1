$protectedPages = @("academy.html", "investments.html", "accounts.html", "dashboard.html")
$htmlFiles = Get-ChildItem -Path . -Recurse -Filter *.html | Select-Object -ExpandProperty FullName

# 1. Add auth-guard.js to protected pages
foreach ($file in $htmlFiles) {
    $basename = Split-Path $file -Leaf
    if ($protectedPages -contains $basename) {
        $content = Get-Content -Path $file -Raw
        if ($content -notmatch "auth-guard.js") {
            $depth = ($file.Substring((Get-Location).Path.Length)).Split('\').Count - 2
            $scriptSrc = if ($depth -gt 0) { "../auth-guard.js" } else { "auth-guard.js" }
            $scriptTag = "  <script src=`"$scriptSrc`"></script>`n</head>"
            $newContent = $content -replace "</head>", $scriptTag
            Set-Content -Path $file -Value $newContent -Encoding UTF8
            Write-Host "Added auth-guard to $file"
        }
    }
}

# 2. Add auth-required class to restricted links
$restrictedUrls = @("academy.html", "investments.html", "accounts.html", "dashboard.html")

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file -Raw
    $modified = $false

    # Complex regex in PowerShell can be tricky, let's use a simpler approach
    # We'll just replace the specific known nav-links
    $newContent = $content
    
    foreach ($url in $restrictedUrls) {
        # Find all <a href="...$url...">...</a> and make sure they have class="... auth-required"
        # Since the links usually look like: <a href="../academy/academy.html" class="nav-link">
        $pattern = "(?i)<a([^>]*?)href=`"([^`"]*$url)`"([^>]*?)>"
        
        $newContent = [regex]::Replace($newContent, $pattern, {
            param($match)
            $full = $match.Value
            if ($full -match "auth-required") { return $full }
            
            if ($full -match "class=`"([^`"]*)`"") {
                $oldClass = $matches[1]
                $newClass = "$oldClass auth-required".Trim()
                return $full -replace "class=`"$oldClass`"", "class=`"$newClass`""
            } else {
                return $full -replace "<a ", "<a class=`"auth-required`" "
            }
        })
    }
    
    if ($newContent -ne $content) {
        Set-Content -Path $file -Value $newContent -Encoding UTF8
        Write-Host "Updated links in $file"
    }
}

Write-Host "Done."
