local isUIVisible = false
local prevVehicle = nil

-- Show/Hide NUI
local function setDisplay(bool)
    isUIVisible = bool
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = "setVisible",
        value = bool
    })
end

-- Main Thread
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)

        local ped = PlayerPedId()
        local vehicle = GetVehiclePedIsIn(ped, false)
        local isInVehicle = IsPedInAnyVehicle(ped, false)

        if isInVehicle and vehicle ~= 0 then
            if not isUIVisible then
                setDisplay(true)
            end

            -- Speed (convert m/s to KPH and MPH)
            local speedMS  = GetEntitySpeed(vehicle)
            local speedKPH = speedMS * 3.6
            local speedMPH = speedMS * 2.237

            -- RPM (0.0 - 1.0)
            local rpm = GetVehicleCurrentRpm(vehicle)

            -- Gear
            local gear = GetVehicleCurrentGear(vehicle)

            -- Fuel (0 - 100)
            local fuel = GetVehicleFuelLevel(vehicle)

            -- Engine health (0 - 1000 -> 0 - 100)
            local engineHealth = GetVehicleEngineHealth(vehicle)
            local enginePct    = math.floor((engineHealth / 1000) * 100)
            if enginePct < 0 then enginePct = 0 end

            -- Engine on/off
            local engineOn = GetIsVehicleEngineRunning(vehicle)

            -- Seatbelt (basic: check if player is being thrown out)
            -- Nitro / boost detection
            local boost = IsVehicleInBurnout(vehicle)

            -- Send to NUI
            SendNUIMessage({
                action      = "update",
                speed       = math.floor(speedKPH),
                speedMPH    = math.floor(speedMPH),
                rpm         = rpm,
                gear        = gear,
                fuel        = math.floor(fuel),
                engineHealth= enginePct,
                engineOn    = engineOn,
                boost       = boost
            })

            prevVehicle = vehicle
        else
            if isUIVisible then
                setDisplay(false)
            end
            prevVehicle = nil
        end
    end
end)
