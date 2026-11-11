# Crée les tâches planifiées Windows :
#   « Appli Courses - photos »   : analyse des photos et prix Drive à 8 h, 11 h, 14 h, 17 h et 20 h
#   « Appli Courses - recettes » : idées de recettes demandées, 10 min après chaque passage
# Si le PC est éteint à l'heure prévue, le passage a lieu dès qu'il est rallumé.
# Lancer depuis PowerShell :  powershell -ExecutionPolicy Bypass -File worker\install-taches.ps1
# Supprimer :                 Unregister-ScheduledTask -TaskName 'Appli Courses - photos' -Confirm:$false  (idem recettes)

$root = Split-Path $PSScriptRoot -Parent
$node = (Get-Command node).Source
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew

function Register-Pass($name, $options, $times) {
  # conhost --headless : pas de fenêtre qui s'ouvre pendant le passage
  $action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless `"$node`" worker\worker.js $options" -WorkingDirectory $root
  $triggers = $times | ForEach-Object { New-ScheduledTaskTrigger -Daily -At $_ }
  Register-ScheduledTask -TaskName $name -Description 'Appli Courses' -Action $action -Trigger $triggers -Settings $settings -Force | Out-Null
}

Register-Pass 'Appli Courses - photos' '--once' @('08:00', '11:00', '14:00', '17:00', '20:00')
Register-Pass 'Appli Courses - recettes' '--once --recipes' @('08:10', '11:10', '14:10', '17:10', '20:10')
'Appli Courses - photos', 'Appli Courses - recettes' | ForEach-Object { Get-ScheduledTaskInfo -TaskName $_ } | Select-Object TaskName, NextRunTime
