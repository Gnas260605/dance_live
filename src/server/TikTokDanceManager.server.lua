-- TikTokDanceManager.server.lua
-- Main Server Script for TikTok Live Comment Auto Dance & Gift FX (Production SaaS)

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

-- ====================================
-- PRODUCTION CONFIGURATION
-- ====================================
local API_KEY = script:GetAttribute("API_KEY") or "demo-api-key-sg-music"
local DOMAIN_URL = script:GetAttribute("DOMAIN_URL") or "http://localhost:3000"
local SERVER_URL = DOMAIN_URL .. "/api/v1/streamer/" .. API_KEY .. "/current-player"

local POLL_INTERVAL = 1.2
local MAX_STAGE_DANCERS = 10
local danceDurationSeconds = 12

-- Verified Working Public Roblox Audio Track IDs
local DEFAULT_MUSIC_ID = "rbxassetid://1837879082"
local GIFT_FANFARE_SOUND_ID = "rbxassetid://9043887091"

Players.CharacterAutoLoads = false

-- Bright Stage Lighting
pcall(function()
	Lighting.ClockTime = 14
	Lighting.Brightness = 2.5
	Lighting.GlobalShadows = true
	Lighting.Ambient = Color3.fromRGB(170, 170, 190)
	Lighting.OutdoorAmbient = Color3.fromRGB(140, 140, 160)
end)

-- Remote Event for Camera & HUD Focus
local focusEvent = ReplicatedStorage:FindFirstChild("FocusPlayerEvent")
if not focusEvent then
	focusEvent = Instance.new("RemoteEvent")
	focusEvent.Name = "FocusPlayerEvent"
	focusEvent.Parent = ReplicatedStorage
end

-- Stage Helper Functions
local function getStageCFrame(stg)
	if not stg then return CFrame.new(0, 1.5, 0) end
	if stg:IsA("Model") then
		return stg:GetPivot()
	elseif stg:IsA("BasePart") then
		return stg.CFrame
	end
	return CFrame.new(0, 1.5, 0)
end

local function getStageSize(stg)
	if not stg then return Vector3.new(44, 3, 28) end
	if stg:IsA("Model") then
		return stg:GetExtentsSize()
	elseif stg:IsA("BasePart") then
		return stg.Size
	end
	return Vector3.new(44, 3, 28)
end

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

	-- Glass floor overlay
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

	-- Neon Rim
	local neonRim = Instance.new("SelectionBox")
	neonRim.Name = "NeonRim"
	neonRim.Color3 = Color3.fromRGB(255, 0, 127)
	neonRim.LineThickness = 0.1
	neonRim.Adornee = stage
	neonRim.Parent = stage

	-- LED Wall Backdrop
	local ledWall = Instance.new("Part")
	ledWall.Name = "LEDWall"
	ledWall.Size = Vector3.new(36, 18, 1)
	ledWall.Position = Vector3.new(0, 12, -13)
	ledWall.Anchored = true
	ledWall.Material = Enum.Material.Neon
	ledWall.Color = Color3.fromRGB(255, 0, 127)
	ledWall.Parent = Workspace
end

-- Bright Stage Overhead Spotlight
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
	spotLight.Brightness = 6
	spotLight.Range = 45
	spotLight.Angle = 90
	spotLight.Face = Enum.NormalId.Bottom
	spotLight.Color = Color3.fromRGB(255, 255, 255)
	spotLight.Parent = lightPart
else
	spotLight = lightPart:FindFirstChildOfClass("SpotLight")
end

-- Global 2D Stage Music - SINGLE TRACK ONLY: stop all before playing
local stageMusic = SoundService:FindFirstChild("StageMusic")
if not stageMusic then
	stageMusic = Instance.new("Sound")
	stageMusic.Name = "StageMusic"
	stageMusic.SoundId = DEFAULT_MUSIC_ID
	stageMusic.Volume = 1.0
	stageMusic.Looped = true
	stageMusic.Parent = SoundService
end

-- Stop ALL existing sounds in SoundService to prevent multi-play
for _, snd in ipairs(SoundService:GetChildren()) do
	if snd:IsA("Sound") then
		pcall(function() snd:Stop() end)
	end
end
stageMusic.SoundId = DEFAULT_MUSIC_ID
stageMusic.Volume = 1.0
stageMusic.Looped = true
stageMusic:Play()

-- State Management
local lastProcessedPlayerId = ""
local currentMusicId = DEFAULT_MUSIC_ID
local activeDancersList = {}
local nextSlotIndex = 1

-- Calculate Grid Slot Offsets facing FRONT (math.rad(180))
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

-- ====================================
-- TIKTOK GIFT VISUAL & SOUND FX SYSTEM
-- ====================================
local function triggerGiftSpecialEffects(position, isVIP, giftDetails)
	pcall(function()
		-- 1. Fireworks & Particle Burst
		local attachment = Instance.new("Attachment")
		attachment.Position = position or Vector3.new(0, 4, 0)
		attachment.Parent = Workspace.Terrain

		local emitter = Instance.new("ParticleEmitter")
		emitter.Texture = "rbxassetid://243664672"
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 0, 127)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 255, 255)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 242, 254))
		})
		emitter.Size = NumberSequence.new({NumberSequenceKeypoint.new(0, 3.0), NumberSequenceKeypoint.new(1, 0)})
		emitter.Speed = NumberRange.new(20, 35)
		emitter.Lifetime = NumberRange.new(1.0, 2.5)
		emitter.Rate = isVIP and 350 or 150
		emitter.Parent = attachment

		-- 2. Play Gift Fanfare Sound Effect (using stageMusic to avoid multi-audio)
		if isVIP then
			local prevId = stageMusic.SoundId
			stageMusic:Stop()
			stageMusic.SoundId = GIFT_FANFARE_SOUND_ID
			stageMusic.Looped = false
			stageMusic.Volume = 1.2
			stageMusic:Play()
			-- Restore background music after fanfare finishes (~3s)
			task.delay(3.2, function()
				pcall(function()
					stageMusic:Stop()
					stageMusic.SoundId = prevId
					stageMusic.Volume = 1.0
					stageMusic.Looped = true
					stageMusic:Play()
				end)
			end)
		end

		-- 3. Flash Stage Lights Gold if Gift VIP
		local ledWall = Workspace:FindFirstChild("LEDWall")
		if isVIP and ledWall then
			local origColor = ledWall.Color
			ledWall.Color = Color3.fromRGB(255, 215, 0)
			if spotLight then spotLight.Brightness = 14 end

			task.delay(1.5, function()
				pcall(function()
					ledWall.Color = origColor
					if spotLight then spotLight.Brightness = 6 end
				end)
			end)
		end

		task.delay(1.2, function()
			pcall(function() emitter.Enabled = false end)
			task.wait(2)
			pcall(function() attachment:Destroy() end)
		end)
	end)
end

-- Create Stylized Nametag above Avatar Head
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

-- Play Emote Dance Animation
local function playDanceAnimation(character, animAssetId)
	pcall(function()
		local humanoid = character:WaitForChild("Humanoid", 4)
		if not humanoid then return end

		humanoid.WalkSpeed = 0
		humanoid.JumpPower = 0

		local animator = humanoid:FindFirstChildOfClass("Animator")
		if not animator then
			animator = Instance.new("Animator")
			animator.Parent = humanoid
		end

		task.wait(0.2)

		local anim = Instance.new("Animation")
		anim.AnimationId = (animAssetId and animAssetId ~= "") and animAssetId or "rbxassetid://507771019"

		local success, track = pcall(function()
			return animator:LoadAnimation(anim)
		end)

		if success and track then
			track.Priority = Enum.AnimationPriority.Action4
			track.Looped = true
			track:Play()
		end
	end)
end

-- Spawn Player Avatar on Stage without snapping existing dancers
local function spawnDancer(robloxUsername, tiktokUsername, animationId, isVIP, giftDetails, customTitle, customColor)
	print(string.format("[TikTokDanceManager] Spawning avatar for TikTok: @%s (Roblox: %s)", tostring(tiktokUsername), tostring(robloxUsername)))

	local getUserIdSuccess, userId = pcall(function()
		return Players:GetUserIdFromNameAsync(robloxUsername)
	end)

	if not getUserIdSuccess or not userId then
		userId = 1
	end

	local loadModelSuccess, characterModel = pcall(function()
		return Players:CreateHumanoidModelFromUserIdAsync(userId)
	end)

	if not loadModelSuccess or not characterModel then
		warn("[TikTokDanceManager] Could not create HumanoidModel for UserId: " .. tostring(userId))
		return
	end

	-- Remove oldest if stage is full
	if #activeDancersList >= MAX_STAGE_DANCERS then
		local oldestDancer = table.remove(activeDancersList, 1)
		if oldestDancer and oldestDancer.model and oldestDancer.model.Parent then
			pcall(function() oldestDancer.model:Destroy() end)
		end
	end

	characterModel.Name = robloxUsername
	characterModel.Parent = Workspace

	-- Position in assigned slot offset without rearranging existing dancers
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

	pcall(function()
		if hrp then triggerGiftSpecialEffects(hrp.Position, isVIP, giftDetails) end
	end)

	createNametag(characterModel, tiktokUsername, robloxUsername, isVIP)
	playDanceAnimation(characterModel, animationId)

	-- Focus camera ONLY on this newest dancer
	if focusEvent then
		pcall(function()
			focusEvent:FireAllClients(characterModel, tiktokUsername, robloxUsername, #activeDancersList, isVIP, customTitle, customColor)
		end)
	end
end

-- Change Music (SINGLE TRACK ENFORCED: stops ALL sounds before playing new one)
local function changeStageMusic(musicAssetId)
	pcall(function()
		if not musicAssetId then return end
		-- Stop every Sound object in SoundService to guarantee single playback
		for _, snd in ipairs(SoundService:GetChildren()) do
			if snd:IsA("Sound") then
				pcall(function() snd:Stop() end)
			end
		end
		stageMusic.SoundId = musicAssetId
		stageMusic.Volume = 1.0
		stageMusic.Looped = true
		stageMusic:Play()
	end)
end

-- Smooth Despawn expiration loop (Destroys expired dancer cleanly without camera jump)
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

-- Main Polling Loop to Node.js Backend
task.spawn(function()
	print(string.format("[TikTokDanceManager] Multi-Tenant Poller started [API Key: %s] -> %s", API_KEY, SERVER_URL))

	while true do
		local fetchSuccess, response = pcall(function()
			return HttpService:GetAsync(SERVER_URL)
		end)

		if fetchSuccess and response then
			local decodeSuccess, data = pcall(function()
				return HttpService:JSONDecode(response)
			end)

			if decodeSuccess and data and data.success then
				if data.danceDuration then
					danceDurationSeconds = tonumber(data.danceDuration) or 12
				end

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
		end

		task.wait(POLL_INTERVAL)
	end
end)

print("[TikTokDanceManager] TikTok Live Comment Auto Dance System Initialized.")
