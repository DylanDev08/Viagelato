# Exporta la BD comercial de Viagelato sin subir datos privados a GitHub.
# Requiere Docker Desktop, Gpg4win y una clave GPG pública propia en el llavero.
# El archivo de conexión se protege con DPAPI de Windows (usuario actual).
[CmdletBinding()]
param(
 [string]$BackupDir=(Join-Path $env:USERPROFILE "Documents\Viagelato-Backups"),
 [string]$OffsiteDir="",
 [int]$Keep=12
)
$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest
$projectRef="mxopaakzlmjbnrwolpgh"
if($Keep -lt 2 -or $Keep -gt 365){throw "Keep debe estar entre 2 y 365."}
$secretDir=Join-Path $env:LOCALAPPDATA "Viagelato"
$secretFile=Join-Path $secretDir "backup-connection.dpapi"
$keyFile=Join-Path $secretDir "backup-recipient.txt"
if(!(Test-Path $secretFile) -or !(Test-Path $keyFile)){
 throw "Primero ejecutá scripts/backup-viagelato-setup.ps1 con tu propia conexión y fingerprint GPG."
}
foreach($name in @("docker","gpg")){if(!(Get-Command $name -ErrorAction SilentlyContinue)){throw "Falta el comando $name."}}
$recipient=(Get-Content -LiteralPath $keyFile -Raw).Trim()
if($recipient -notmatch '^[a-fA-F0-9]{40}$'){throw "Fingerprint GPG incorrecto."}
& gpg --batch --list-keys $recipient *> $null
if($LASTEXITCODE -ne 0){throw "La clave pública GPG no está disponible en este equipo."}
$secure=(Get-Content -LiteralPath $secretFile -Raw).Trim() | ConvertTo-SecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try{$dbUrl=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
# Comprobar que no se realizará un dump de otro proyecto por accidente.
try{
 $uri=[uri]$dbUrl
 $username=([uri]::UnescapeDataString($uri.UserInfo)).Split(":")[0]
 $validHost=$uri.Host -eq "db.$projectRef.supabase.co" -or $uri.Host -match '\.pooler\.supabase\.com$'
 if($uri.Scheme -notin @("postgresql","postgres") -or !$validHost -or
    $username -notin @("postgres","postgres.$projectRef")){
  throw "La conexión no corresponde al proyecto Viagelato."
 }
}catch{
 $dbUrl=$null
 throw "Conexión PostgreSQL inválida o para otro proyecto; no se realizó un backup."
}
if(!(Test-Path -LiteralPath $BackupDir)){New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null}
$BackupDir=(Resolve-Path -LiteralPath $BackupDir).Path
$workDir=Join-Path ([IO.Path]::GetTempPath()) ("viagelato-dump-"+[guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workDir -Force | Out-Null
$stamp=[DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
$base="viagelato_public_$stamp"
$encrypted=Join-Path $BackupDir "$base.dump.gpg"
$hashFile="$encrypted.sha256"
$manifest="$encrypted.json"
$ok=$false
try{
 # La credencial se hereda por ambiente; nunca se imprime en la línea de comandos.
 $env:SUPABASE_DB_URL=$dbUrl
 $dbUrl=$null
 & docker run --rm -e SUPABASE_DB_URL -v "${workDir}:/export" postgres:17-alpine sh -ec 'pg_dump --dbname="$SUPABASE_DB_URL" --schema=public --format=custom --no-owner --no-acl --file=/export/database.dump'
 if($LASTEXITCODE -ne 0){throw "Falló pg_dump; no se guardó ninguna copia como válida."}
 $raw=Join-Path $workDir "database.dump"
 if(!(Test-Path -LiteralPath $raw) -or (Get-Item $raw).Length -lt 100){throw "pg_dump generó un archivo vacío o inválido."}
 & docker run --rm -v "${workDir}:/export:ro" postgres:17-alpine pg_restore --list /export/database.dump *> $null
 if($LASTEXITCODE -ne 0){throw "pg_restore no reconoció el archivo exportado."}
 & gpg --batch --yes --trust-model always --recipient $recipient --output $encrypted --encrypt $raw
 if($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $encrypted)){throw "No se pudo cifrar el respaldo."}
 $file=(Get-Item -LiteralPath $encrypted)
 $hash=(Get-FileHash -LiteralPath $encrypted -Algorithm SHA256).Hash
 [IO.File]::WriteAllText($hashFile,"$hash  $($file.Name)`n")
 $details=[ordered]@{
  project_ref=$projectRef
  created_utc=$stamp
  encrypted_file=$file.Name
  bytes=$file.Length
  sha256=$hash
  scope="schema_public_only"
  auth_and_storage_managed_schemas_included=$false
  storage_object_bytes_included=$false
  cryptography="OpenPGP public-key encryption (GPG)"
  restore_test_performed=$false
 }
 $details | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $manifest -Encoding UTF8
 if($OffsiteDir){
  if(!(Test-Path -LiteralPath $OffsiteDir)){throw "La carpeta privada externa/offsite no existe; no se completó la réplica."}
  foreach($filePath in @($encrypted,$hashFile,$manifest)){Copy-Item -LiteralPath $filePath -Destination $OffsiteDir -Force}
  $remote=Join-Path $OffsiteDir ([IO.Path]::GetFileName($encrypted))
  if((Get-FileHash $remote -Algorithm SHA256).Hash -ne $hash){throw "La copia remota no coincide con su SHA256."}
 }
 $ok=$true
 Write-Host "Respaldo cifrado correcto: $encrypted"
 Write-Host "SHA256: $hash"
 if(!$OffsiteDir){Write-Warning "Backup sólo local: copiá el .gpg y checksum a un destino privado fuera del equipo."}
}catch{
 foreach($filePath in @($encrypted,$hashFile,$manifest)){
  if(Test-Path -LiteralPath $filePath){Remove-Item -LiteralPath $filePath -Force}
 }
 throw
}finally{
 $env:SUPABASE_DB_URL=$null
 $dbUrl=$null
 if(Test-Path -LiteralPath $workDir){Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue}
}
if($ok){
 # Limpiar sólo copias cifradas históricas; nunca archivos sin cifrar.
 $old=Get-ChildItem -LiteralPath $BackupDir -Filter "viagelato_public_*.dump.gpg" -File |
  Sort-Object LastWriteTime -Descending | Select-Object -Skip $Keep
 foreach($item in $old){
  foreach($candidate in @($item.FullName,"$($item.FullName).sha256","$($item.FullName).json")){
   if(Test-Path -LiteralPath $candidate){Remove-Item -LiteralPath $candidate -Force}
  }
 }
}
