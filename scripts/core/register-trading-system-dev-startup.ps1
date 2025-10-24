<#
  Registers or removes a Windows Scheduled Task that launches the TradingSystem
  development services at user logon.
#>
[CmdletBinding()]
param(
  [ValidateNotNullOrEmpty()]
  [string]$TaskName = 'TradingSystem Dev Startup',

  [switch]$Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScriptPath = Join-Path -Path $scriptDirectory -ChildPath 'start-trading-system-dev.ps1'

if (-not (Test-Path -LiteralPath $startScriptPath)) {
  throw "Start script not found at '$startScriptPath'. Make sure it exists before registering the scheduled task."
}

if ($Remove) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Scheduled task '$TaskName' removed."
  }
  else {
    Write-Host "Scheduled task '$TaskName' is not registered."
  }
  return
}

$argument = "-NoLogo -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScriptPath`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null

Write-Host "Scheduled task '$TaskName' registered. The dev services will start automatically at logon."
Write-Host "Use -Remove to unregister this startup task if needed."
