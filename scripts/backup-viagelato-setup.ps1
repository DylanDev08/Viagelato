# Ejecutar una sola vez en Windows, en la cuenta que hará los respaldos.
# Nunca pegues la URL con contraseña en GitHub, mensajes o archivos de texto.
[CmdletBinding()]
param([switch]$RegisterWeeklyTask)
$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest
if(!(Get-Command docker -ErrorAction SilentlyContinue)){throw "Instalá Docker Desktop antes de configurar el backup."}
if(!(Get-Command gpg -ErrorAction SilentlyContinue)){throw "Instalá Gpg4win y configurá tu clave GPG."}
$ref="mxopaakzlmjbnrwolpgh"
Write-Host "Proyecto esperado: Viagelato-ECommerce ($ref)"
Write-Host "Usá la conexión Session pooler (IPv4) del botón Connect de Supabase."
$recipient=(Read-Host "Fingerprint de tu clave GPG pública (40 dígitos hexadecimales)").Trim()
if($recipient -notmatch '^[A-Fa-f0-9]{40}$'){throw "Fingerprint incorrecto."}
& gpg --batch --list-keys $recipient *> $null
if($LASTEXITCODE -ne 0){throw "Importá primero la clave pública GPG que controlás."}
$secret=Read-Host "URL PostgreSQL completa (con contraseña; entrada oculta)" -AsSecureString
$folder=Join-Path $env:LOCALAPPDATA "Viagelato"
if(!(Test-Path -LiteralPath $folder)){New-Item -ItemType Directory -Path $folder -Force | Out-Null}
# ConvertFrom-SecureString en Windows usa DPAPI ligado al usuario actual.
$secret | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $folder "backup-connection.dpapi") -Encoding ASCII
$recipient | Set-Content -LiteralPath (Join-Path $folder "backup-recipient.txt") -Encoding ASCII
Write-Host "Configuración cifrada para tu usuario en $folder."
$script=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "backup-viagelato.ps1")).Path
if($RegisterWeeklyTask){
 $action=New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$script`""
 $trigger=New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "10:00"
 $username=[Security.Principal.WindowsIdentity]::GetCurrent().Name
 $principal=New-ScheduledTaskPrincipal -UserId $username -LogonType Interactive -RunLevel Limited
 Register-ScheduledTask -TaskName "Viagelato-Backup-Weekly" -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
 Write-Host "Tarea semanal creada. Solo se ejecuta cuando la sesión Windows del mismo usuario está iniciada."
}else{
 Write-Host "Para activar backup semanal: .\scripts\backup-viagelato-setup.ps1 -RegisterWeeklyTask"
}
Write-Host "Primera copia manual: .\scripts\backup-viagelato.ps1"
