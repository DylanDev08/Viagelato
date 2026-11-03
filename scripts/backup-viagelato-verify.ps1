# Verificación criptográfica y estructural, sin escribir en producción.
# Requiere la clave GPG privada (y su desbloqueo) en este equipo.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$EncryptedFile)
$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest
if(!(Test-Path -LiteralPath $EncryptedFile)){throw "No existe el archivo .gpg"}
foreach($name in @("docker","gpg")){if(!(Get-Command $name -ErrorAction SilentlyContinue)){throw "Falta $name."}}
$EncryptedFile=(Resolve-Path -LiteralPath $EncryptedFile).Path
$hashFile="$EncryptedFile.sha256"
if(!(Test-Path -LiteralPath $hashFile)){throw "Falta el checksum SHA256."}
$expected=(Get-Content -LiteralPath $hashFile -Raw).Trim().Split(" ")[0].ToUpperInvariant()
$actual=(Get-FileHash -LiteralPath $EncryptedFile -Algorithm SHA256).Hash
if($expected -ne $actual){throw "SHA256 no coincide. El backup está corrupto o fue modificado."}
$workDir=Join-Path ([IO.Path]::GetTempPath()) ("viagelato-verify-"+[guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workDir -Force | Out-Null
try{
 $raw=Join-Path $workDir "restore.dump"
 & gpg --decrypt --output $raw $EncryptedFile
 if($LASTEXITCODE -ne 0){throw "No fue posible descifrar el backup. Revisá tu clave privada GPG."}
 & docker run --rm -v "${workDir}:/restore:ro" postgres:17-alpine pg_restore --list /restore/restore.dump *> $null
 if($LASTEXITCODE -ne 0){throw "El archivo no es un pg_dump válido."}
 Write-Host "OK: SHA256, descifrado y estructura de pg_dump válidos."
 Write-Warning "Esto NO equivale a restaurar la base ni cubre auth/storage. Ensayá una restauración sobre un Supabase local descartable."
}finally{
 if(Test-Path -LiteralPath $workDir){Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue}
}
