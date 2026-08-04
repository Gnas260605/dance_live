-- TikTokDanceManager.server.lua
-- Production Roblox Action Executor & Multi-Tenant TikTok Live Sync Engine

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

-- ====================================
-- CONFIGURATION
-- ====================================
local API_KEY = script:GetAttribute("API_KEY") or "demo-api-key-sg-music"
local DOMAIN_URL = script:GetAttribute("DOMAIN_URL") or "https://loose-dogs-see.loca.lt"
local BASE_URL = DOMAIN_URL .. "/api/v1/streamer/" .. API_KEY

local POLL_INTERVAL = 1.2
local MAX_STAGE_DANCERS = 10
local danceDurationSeconds = 12

local DEFAULT_MUSIC_ID = "rbxassetid://1837879082"
local GIFT_FANFARE_SOUND_ID = "rbxassetid://9043887091"

Players.CharacterAutoLoads = false

-- Balanced Stage Lighting (Không bị chói nhân vật)
pcall(function()
	Lighting.ClockTime = 14
	Lighting.Brightness = 1.0
	Lighting.GlobalShadows = true
	Lighting.Ambient = Color3.fromRGB(110, 110, 130)
	Lighting.OutdoorAmbient = Color3.fromRGB(90, 90, 110)
end)

-- Remote Event for Camera & HUD Focus
local focusEvent = ReplicatedStorage:FindFirstChild("FocusPlayerEvent")
if not focusEvent then
	focusEvent = Instance.new("RemoteEvent")
	focusEvent.Name = "FocusPlayerEvent"
	focusEvent.Parent = ReplicatedStorage
end

-- Remote Event for Client-side Gift Visual & Audio Effects
local giftEffectEvent = ReplicatedStorage:FindFirstChild("GiftEffectEvent")
if not giftEffectEvent then
	giftEffectEvent = Instance.new("RemoteEvent")
	giftEffectEvent.Name = "GiftEffectEvent"
	giftEffectEvent.Parent = ReplicatedStorage
end

-- Stage Helpers
local function getStageCFrame(stg)
	if not stg then return CFrame.new(0, 1.5, 0) end
	if stg:IsA("Model") then return stg:GetPivot()
	elseif stg:IsA("BasePart") then return stg.CFrame end
	return CFrame.new(0, 1.5, 0)
end

local function getStageSize(stg)
	if not stg then return Vector3.new(44, 3, 28) end
	if stg:IsA("Model") then return stg:GetExtentsSize()
	elseif stg:IsA("BasePart") then return stg.Size end
	return Vector3.new(44, 3, 28)
end

-- AUTOMATED SCRIPT CLEANUP: Clean up broken third-party scripts that crash the server
pcall(function()
	local namesToClean = { "LightConfig", "qPerfectionWeld", "PackageLink", "FlashChance", "CoreSkyboxSystem" }
	for _, desc in ipairs(Workspace:GetDescendants()) do
		if desc:IsA("Script") or desc:IsA("LocalScript") or desc:IsA("ModuleScript") then
			local dName = desc.Name
			local pName = desc.Parent and desc.Parent.Name or ""
			local isDecor = desc:FindFirstAncestor("MapDecor") or desc:FindFirstAncestor("StoreAssets")
			if table.find(namesToClean, dName) or isDecor then
				pcall(function() desc:Destroy() end)
			end
		end
	end
end)

-- Ensure Stage Exists
local stage = Workspace:FindFirstChild("KPopStage") or Workspace:FindFirstChild("DanceStage")
if not stage then
	stage = Instance.new("Part")
	stage.Name = "DanceStage"
	stage.Size = Vector3.new(44, 3, 28)
	stage.Position = Vector3.new(0, 1.5, 0)
	stage.Anchored = true
	stage.Material = Enum.Material.SmoothPlastic
	stage.Color = Color3.fromRGB(30, 35, 55)
	stage.Parent = Workspace

	local stageFloor = Instance.new("Part")
	stageFloor.Name = "StageFloor"
	stageFloor.Size = Vector3.new(43.8, 0.1, 27.8)
	stageFloor.Position = Vector3.new(0, 3.05, 0)
	stageFloor.Anchored = true
	stageFloor.Material = Enum.Material.Glass
	stageFloor.Color = Color3.fromRGB(0, 242, 254)
	stageFloor.Transparency = 0.5
	stageFloor.CanCollide = false
	stageFloor.Parent = Workspace

	local neonRim = Instance.new("SelectionBox")
	neonRim.Name = "NeonRim"
	neonRim.Color3 = Color3.fromRGB(255, 0, 127)
	neonRim.LineThickness = 0.1
	neonRim.Adornee = stage
	neonRim.Parent = stage

	local ledWall = Instance.new("Part")
	ledWall.Name = "LEDWall"
	ledWall.Size = Vector3.new(36, 18, 1)
	ledWall.Position = Vector3.new(0, 12, -13)
	ledWall.Anchored = true
	ledWall.Material = Enum.Material.Neon
	ledWall.Color = Color3.fromRGB(255, 0, 127)
	ledWall.Parent = Workspace
end

-- Spotlight
local lightPart = Workspace:FindFirstChild("OverheadLight")
local spotLight
if not lightPart then
	local stageCF = getStageCFrame(stage)
	lightPart = Instance.new("Part")
	lightPart.Name = "OverheadLight"
	lightPart.Size = Vector3.new(4, 1, 4)
	lightPart.Position = stageCF.Position + Vector3.new(0, 22, 0)
	lightPart.Anchored = true
	lightPart.Transparency = 1
	lightPart.Parent = Workspace

	spotLight = Instance.new("SpotLight")
	spotLight.Name = "SpotLight"
	spotLight.Brightness = 1.8
	spotLight.Range = 45
	spotLight.Angle = 90
	spotLight.Face = Enum.NormalId.Bottom
	spotLight.Color = Color3.fromRGB(255, 255, 255)
	spotLight.Parent = lightPart
else
	spotLight = lightPart:FindFirstChildOfClass("SpotLight")
end

-- Stage Music
local stageMusic = SoundService:FindFirstChild("StageMusic")
if not stageMusic then
	stageMusic = Instance.new("Sound")
	stageMusic.Name = "StageMusic"
	stageMusic.SoundId = DEFAULT_MUSIC_ID
	stageMusic.Volume = 1.0
	stageMusic.Looped = true
	stageMusic.Parent = SoundService
end

for _, snd in ipairs(SoundService:GetChildren()) do
	if snd:IsA("Sound") and snd.Name ~= "StageMusic" then
		pcall(function() snd:Stop() end)
	end
end
stageMusic.SoundId = DEFAULT_MUSIC_ID
stageMusic.Volume = 1.0
stageMusic.Looped = true
stageMusic:Play()

-- State Tracking
local lastProcessedPlayerId = ""
local currentMusicId = DEFAULT_MUSIC_ID
local activeDancersList = {}
local nextSlotIndex = 1
local processedEventIds = {}

local function getSlotOffset(index)
	local row = math.floor((index - 1) / 5)
	local col = (index - 1) % 5
	local xSpacing = 7.0
	local zSpacing = 7.5
	local xOffset = (col - 2) * xSpacing
	local zOffset = (row - 0.5) * zSpacing
	local stgSize = getStageSize(stage)
	return Vector3.new(xOffset, stgSize.Y / 2 + 3.2, zOffset)
end

-- Change Stage Music
local function changeStageMusic(musicAssetId)
	pcall(function()
		if not musicAssetId or musicAssetId == "" then return end
		if not string.find(musicAssetId, "rbxassetid://") then
			musicAssetId = "rbxassetid://" .. musicAssetId
		end
		if stageMusic.SoundId == musicAssetId and stageMusic.IsPlaying then
			return -- Already playing this track, don't restart loop!
		end
		stageMusic:Stop()
		stageMusic.SoundId = musicAssetId
		stageMusic.Volume = 1.0
		stageMusic.Looped = true
		stageMusic:Play()
	end)
end

-- =========================================================
-- SPEC SECTION 22: ACTION HANDLERS REGISTRY
-- =========================================================
local ActionHandlers = {}

-- 1. FLOWER_RAIN Action Handler
ActionHandlers.FLOWER_RAIN = function(action, context)
	pcall(function()
		local pos = getStageCFrame(stage).Position
		if giftEffectEvent then
			giftEffectEvent:FireAllClients({ giftId = "rose", giftName = "Rose" }, context.tiktokUsername or "Viewer", pos, true)
		end
	end)
end

-- 2. HEART_BURST Action Handler
ActionHandlers.HEART_BURST = function(action, context)
	pcall(function()
		local pos = getStageCFrame(stage).Position
		if giftEffectEvent then
			giftEffectEvent:FireAllClients({ giftId = "hand_heart", giftName = "Hand Heart" }, context.tiktokUsername or "Viewer", pos, true)
		end
	end)
end

-- 3. CHANGE_STAGE_LIGHT Action Handler
ActionHandlers.CHANGE_STAGE_LIGHT = function(action, context)
	pcall(function()
		local ledWall = Workspace:FindFirstChild("LEDWall")
		local duration = (action.durationMs or 6000) / 1000
		if not ledWall then return end

		local origColor = ledWall.Color
		ledWall.Color = Color3.fromRGB(0, 242, 254)
		if spotLight then spotLight.Brightness = 3.5 end

		if giftEffectEvent then
			giftEffectEvent:FireAllClients({ giftId = "galaxy", giftName = "Galaxy" }, context.tiktokUsername or "Viewer", getStageCFrame(stage).Position, true)
		end

		task.delay(duration, function()
			pcall(function()
				ledWall.Color = origColor
				if spotLight then spotLight.Brightness = 1.8 end
			end)
		end)
	end)
end

-- 4. FIREWORKS Action Handler
ActionHandlers.FIREWORKS = function(action, context)
	pcall(function()
		local pos = getStageCFrame(stage).Position
		if giftEffectEvent then
			giftEffectEvent:FireAllClients({ giftId = "fireworks", giftName = "Fireworks" }, context.tiktokUsername or "Viewer", pos, true)
		end
	end)
end

-- 5. DRAGON_AURA Action Handler
ActionHandlers.DRAGON_AURA = function(action, context)
	pcall(function()
		local pos = getStageCFrame(stage).Position
		if giftEffectEvent then
			giftEffectEvent:FireAllClients({ giftId = "dragon", giftName = "Dragon" }, context.tiktokUsername or "Viewer", pos, true)
		end
	end)
end

-- 6. LION_KING Action Handler
ActionHandlers.LION_KING = function(action, context)
	pcall(function()
		local pos = getStageCFrame(stage).Position
		if giftEffectEvent then
			giftEffectEvent:FireAllClients({ giftId = "lion", giftName = "Lion King" }, context.tiktokUsername or "Viewer", pos, true)
		end
	end)
end

-- 7. SHOW_MESSAGE Action Handler
ActionHandlers.SHOW_MESSAGE = function(action, context)
	pcall(function()
		local params = action.parameters or {}
		local msgText = params.template or string.format("🎁 %s vừa tặng quà!", context.tiktokUsername or "Khán giả")
		print("[RobloxAction] SHOW_MESSAGE: " .. msgText)
	end)
end

-- 8. CHANGE_MUSIC Action Handler
ActionHandlers.CHANGE_MUSIC = function(action, context)
	pcall(function()
		local params = action.parameters or {}
		local musicId = params.musicId
		if musicId then changeStageMusic(musicId) end
	end)
end

-- Execute Game Event & Actions Sequence
local function executeGameEvent(gameEvent)
	if not gameEvent or not gameEvent.eventId then return end
	if processedEventIds[gameEvent.eventId] then return end
	processedEventIds[gameEvent.eventId] = true

	print(string.format("[TikTokDanceManager] Executing GameEvent [%s] (%s actions)", gameEvent.eventId, tostring(#(gameEvent.actions or {}))))

	local allSuccess = true
	local lastErr = nil

	for _, action in ipairs(gameEvent.actions or {}) do
		local handler = ActionHandlers[action.type]
		if handler then
			local ok, err = pcall(function()
				handler(action, gameEvent.context or {})
			end)
			if not ok then
				allSuccess = false
				lastErr = tostring(err)
				warn(string.format("[TikTokDanceManager] Action error [%s]: %s", action.type, tostring(err)))
			end
		end
	end

	-- Send ACK to Backend
	pcall(function()
		local ackUrl = BASE_URL .. "/game-events/" .. gameEvent.eventId .. "/ack"
		local body = HttpService:JSONEncode({ success = allSuccess, error = lastErr })
		HttpService:PostAsync(ackUrl, body, Enum.HttpContentType.ApplicationJson)
	end)
end

-- Create Nametag
local function createNametag(character, tiktokUsername, robloxUsername, isVIP)
	pcall(function()
		local head = character:FindFirstChild("Head")
		if not head then return end

		local existing = head:FindFirstChild("DancerNametag")
		if existing then existing:Destroy() end

		local bbGui = Instance.new("BillboardGui")
		bbGui.Name = "DancerNametag"
		bbGui.Size = UDim2.new(0, 170, 0, 42)
		bbGui.StudsOffset = Vector3.new(0, 2.8, 0)
		bbGui.AlwaysOnTop = true

		local frame = Instance.new("Frame")
		frame.Size = UDim2.new(1, 0, 1, 0)
		frame.BackgroundColor3 = isVIP and Color3.fromRGB(45, 35, 10) or Color3.fromRGB(12, 14, 24)
		frame.BackgroundTransparency = 0.15
		frame.BorderSizePixel = 0
		frame.Parent = bbGui

		local uiCorner = Instance.new("UICorner")
		uiCorner.CornerRadius = UDim.new(0, 8)
		uiCorner.Parent = frame

		local uiStroke = Instance.new("UIStroke")
		uiStroke.Color = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 0, 127)
		uiStroke.Thickness = isVIP and 2.5 or 1.5
		uiStroke.Parent = frame

		local label = Instance.new("TextLabel")
		label.Size = UDim2.new(1, -8, 1, -2)
		label.Position = UDim2.new(0, 4, 0, 1)
		label.BackgroundTransparency = 1
		local displayName = isVIP and ("👑 GIFT VIP: @" .. tiktokUsername) or ("@" .. tiktokUsername)
		label.Text = displayName .. "\n(" .. robloxUsername .. ")"
		label.TextColor3 = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 255, 255)
		label.TextScaled = true
		label.Font = Enum.Font.GothamBold
		label.Parent = frame

		bbGui.Parent = head
	end)
end

-- Play Dance Animation
local function playDanceAnimation(character, animAssetId)
	pcall(function()
		local humanoid = character:WaitForChild("Humanoid", 4)
		if not humanoid then return end
		humanoid.WalkSpeed = 0
		humanoid.JumpPower = 0

		local animator = humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator", humanoid)

		task.wait(0.2)
		local anim = Instance.new("Animation")
		anim.AnimationId = (animAssetId and animAssetId ~= "") and animAssetId or "rbxassetid://507771019"

		local success, track = pcall(function() return animator:LoadAnimation(anim) end)
		if success and track then
			track.Priority = Enum.AnimationPriority.Action4
			track.Looped = true
			track:Play()
		end
	end)
end

-- Spawn Player Avatar on Stage
local function spawnDancer(robloxUsername, tiktokUsername, animationId, isVIP, giftDetails, customTitle, customColor)
	print(string.format("[TikTokDanceManager] Spawning avatar for TikTok: @%s (Roblox: %s)", tostring(tiktokUsername), tostring(robloxUsername)))

	local getUserIdSuccess, userId = pcall(function() return Players:GetUserIdFromNameAsync(robloxUsername) end)
	if not getUserIdSuccess or not userId then userId = 1 end

	local loadModelSuccess, characterModel = pcall(function() return Players:CreateHumanoidModelFromUserIdAsync(userId) end)
	if not loadModelSuccess or not characterModel then
		-- Fallback to creating a standard Rig/Dummy if Roblox API request fails
		characterModel = Instance.new("Model")
		characterModel.Name = robloxUsername

		local hum = Instance.new("Humanoid")
		hum.Parent = characterModel

		local hrp = Instance.new("Part")
		hrp.Name = "HumanoidRootPart"
		hrp.Size = Vector3.new(2, 2, 1)
		hrp.Transparency = 1
		hrp.CanCollide = true
		hrp.Parent = characterModel
		characterModel.PrimaryPart = hrp

		local head = Instance.new("Part")
		head.Name = "Head"
		head.Size = Vector3.new(1.2, 1.2, 1.2)
		head.Position = hrp.Position + Vector3.new(0, 1.5, 0)
		head.Parent = characterModel

		local torso = Instance.new("Part")
		torso.Name = "Torso"
		torso.Size = Vector3.new(2, 2, 1)
		torso.Position = hrp.Position
		torso.Color = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(0, 242, 254)
		torso.Parent = characterModel
	end

	if #activeDancersList >= MAX_STAGE_DANCERS then
		local oldestDancer = table.remove(activeDancersList, 1)
		if oldestDancer and oldestDancer.model and oldestDancer.model.Parent then
			pcall(function() oldestDancer.model:Destroy() end)
		end
	end

	characterModel.Name = robloxUsername
	characterModel.Parent = Workspace

	local slotIdx = ((nextSlotIndex - 1) % MAX_STAGE_DANCERS) + 1
	nextSlotIndex = nextSlotIndex + 1

	local stageCF = getStageCFrame(stage)
	local offset = getSlotOffset(slotIdx)
	local targetCFrame = stageCF * CFrame.new(offset) * CFrame.Angles(0, math.rad(180), 0)
	characterModel:PivotTo(targetCFrame)

	local hrp = characterModel:FindFirstChild("HumanoidRootPart") or characterModel.PrimaryPart
	if hrp then hrp.Anchored = false end

	table.insert(activeDancersList, {
		model = characterModel,
		robloxUsername = robloxUsername,
		tiktokUsername = tiktokUsername,
		isVIP = isVIP,
		spawnTime = tick()
	})

	createNametag(characterModel, tiktokUsername, robloxUsername, isVIP)
	playDanceAnimation(characterModel, animationId)

	if giftDetails and giftEffectEvent then
		pcall(function()
			giftEffectEvent:FireAllClients(giftDetails, tiktokUsername, targetCFrame.Position, isVIP)
		end)
	end

	if focusEvent then
		pcall(function()
			focusEvent:FireAllClients(characterModel, tiktokUsername, robloxUsername, #activeDancersList, isVIP, customTitle, customColor)
		end)
	end
end

-- Despawn loop
task.spawn(function()
	while true do
		task.wait(1)
		local currentTick = tick()
		local i = 1
		while i <= #activeDancersList do
			local dancer = activeDancersList[i]
			if dancer and (currentTick - dancer.spawnTime >= danceDurationSeconds) then
				if dancer.model and dancer.model.Parent then
					pcall(function() dancer.model:Destroy() end)
				end
				table.remove(activeDancersList, i)
			else
				i = i + 1
			end
		end
	end
end)

-- Heartbeat Loop to Backend
task.spawn(function()
	local heartbeatUrl = BASE_URL .. "/heartbeat"
	while true do
		local ok, err = pcall(function()
			local payload = HttpService:JSONEncode({
				placeId = tostring(game.PlaceId),
				jobId = tostring(game.JobId),
				scriptVer = "1.0.0"
			})
			HttpService:PostAsync(heartbeatUrl, payload, Enum.HttpContentType.ApplicationJson, false, { ["bypass-tunnel-reminder"] = "true" })
		end)
		if not ok then
			warn("[TikTokDanceManager] Heartbeat HTTP Error: " .. tostring(err))
		end
		task.wait(10)
	end
end)

-- Main Polling Loop to Backend (Current Player & Game Events)
task.spawn(function()
	print(string.format("[TikTokDanceManager] Multi-Tenant Poller & Action Engine started [API Key: %s]", API_KEY))

	local playerUrl = BASE_URL .. "/current-player"
	local eventsUrl = BASE_URL .. "/game-events"
	local customHeaders = { ["bypass-tunnel-reminder"] = "true" }

	while true do
		-- 1. Poll Current Active Player (Dancer Queue)
		local ok1, err1 = pcall(function()
			local response = HttpService:GetAsync(playerUrl, false, customHeaders)
			local data = HttpService:JSONDecode(response)
			if data and data.success then
				if data.danceDuration then danceDurationSeconds = tonumber(data.danceDuration) or 12 end
				if data.currentMusicId and data.currentMusicId ~= currentMusicId then
					currentMusicId = data.currentMusicId
					changeStageMusic(currentMusicId)
				end

				if data.player and data.player.id ~= lastProcessedPlayerId then
					lastProcessedPlayerId = data.player.id
					spawnDancer(
						data.player.robloxUsername,
						data.player.tiktokUsername,
						data.player.animationId,
						data.player.isVIP,
						data.player.giftDetails,
						data.overlayTitle,
						data.overlayColor
					)
				end
			end
		end)
		if not ok1 then
			warn("[TikTokDanceManager] Player Poll Error: " .. tostring(err1))
		end

		-- 2. Poll Game Events Queue (Gift Effects, Lights, Animations)
		local ok2, err2 = pcall(function()
			local response = HttpService:GetAsync(eventsUrl, false, customHeaders)
			local data = HttpService:JSONDecode(response)
			if data and data.success and data.events then
				for _, gameEvent in ipairs(data.events) do
					executeGameEvent(gameEvent)
				end
			end
		end)
		if not ok2 then
			warn("[TikTokDanceManager] Events Poll Error: " .. tostring(err2))
		end

		task.wait(POLL_INTERVAL)
	end
end)

print("[TikTokDanceManager] TikTok Live Comment & Game Event Engine Initialized.")
