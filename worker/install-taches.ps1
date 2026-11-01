# Crée les tâches planifiées Windows :
#   « Appli Courses - photos »   : analyse des photos à 12 h et 20 h
#   « Appli Courses - recettes » : idées de recettes demandées, 10 min après (12 h 10 et 20 h 10)
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

Register-Pass 'Appli Courses - photos' '--once' @('12:00', '20:00')
Register-Pass 'Appli Courses - recettes' '--once --recipes' @('12:10', '20:10')
'Appli Courses - photos', 'Appli Courses - recettes' | ForEach-Object { Get-ScheduledTaskInfo -TaskName $_ } | Select-Object TaskName, NextRunTime
