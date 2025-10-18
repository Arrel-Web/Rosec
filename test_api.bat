@echo off
echo Testing API connectivity...
echo.
echo Testing port 8080:
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/test' -TimeoutSec 5; Write-Host 'SUCCESS: ' $response.StatusCode; Write-Host $response.Content } catch { Write-Host 'ERROR: ' $_.Exception.Message }"
echo.
echo Testing localhost:
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/test' -TimeoutSec 5; Write-Host 'SUCCESS: ' $response.StatusCode; Write-Host $response.Content } catch { Write-Host 'ERROR: ' $_.Exception.Message }"
echo.
pause
