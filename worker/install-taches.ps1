# Crée la tâche planifiée Windows « Appli Courses - photos » : un passage à 12 h et un à 20 h.
# Si le PC est éteint à l'heure prévue, le passage a lieu dès qu'il est rallumé.
# Lancer depuis PowerShell :  powershell -ExecutionPolicy Bypass -File worker\install-taches.ps1
# Supprimer :                 Unregister-ScheduledTask -TaskName 'Appli Courses - photos' -Confirm:$false

$root = Split-Path $PSScriptRoot -Parent
$node = (Get-Command node).Source
# conhost --headless : pas de fenêtre qui s'ouvre pendant le passage
$action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless `"$node`" worker\worker.js --once" -WorkingDirectory $root
$triggers = @(
  New-ScheduledTaskTrigger -Daily -At '12:00'
  New-ScheduledTaskTrigger -Daily -At '20:00'
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'Appli Courses - photos' -Description 'Analyse les photos envoyées depuis l''appli Courses' `
  -Action $action -Trigger $triggers -Settings $settings -Force | Out-Null
Get-ScheduledTaskInfo -TaskName 'Appli Courses - photos' | Select-Object TaskName, NextRunTime
