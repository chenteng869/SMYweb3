# Check WSL/Hyper-V features
Get-WindowsOptionalFeature -Online | Where-Object { $_.FeatureName -match 'Windows-Subsystem-Linux|VirtualMachine|Hypervisor|Container|Hyper-V' } | Select-Object FeatureName, State | Format-Table -AutoSize
