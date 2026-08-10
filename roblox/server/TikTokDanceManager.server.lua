-- TikTokDanceManager.server.lua
-- Production Roblox Action Executor & Multi-Tenant TikTok Live Sync Engine
-- Version 2.1 - Fixed: Avatar load race condition, InsertService block, rate limit

local HttpService    = game:GetService("HttpService")
local Players        = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace      = game:GetService("Workspace")
local Lighting       = game:GetService("Lighting")
local TweenService   = game:GetService("TweenService")
local SoundService   = game:GetService("SoundService")
local RunService     = game:GetService("RunService")

-- Require ProceduralDance Module
local ProceduralDance = nil
pcall(function()
	local sharedFolder = ReplicatedStorage:FindFirstChild("Shared") or ReplicatedStorage
	local procMod = sharedFolder:FindFirstChild("ProceduralDance")
	if procMod then
		ProceduralDance = require(procMod)
	end
end)

if ProceduralDance then
	RunService.Heartbeat:Connect(function()
		pcall(function()
			ProceduralDance.Update()
		end)
	end)
end

-- ====================================
-- CONFIGURATION
-- ====================================

local API_KEY    = script:GetAttribute("API_KEY") or "demo-api-key-sg-music"
local PUBLIC_URL = "https://dance-live.onrender.com/"
local LOCAL_URL  = "http://127.0.0.1:3001"

-- Clean trailing slash from base URLs to prevent double-slash (//) routing issues
local function cleanUrl(url)
	if url and string.sub(url, -1) == "/" then
		return string.sub(url, 1, -2)
	end
	return url
end

local function getActiveBaseUrl()
	local baseUrl = PUBLIC_URL
	local customDomain = script:GetAttribute("DOMAIN_URL")
	if customDomain and customDomain ~= "" then
		baseUrl = customDomain
	elseif script:GetAttribute("USE_LOCAL") == true then
		baseUrl = LOCAL_URL
	end
	
	baseUrl = cleanUrl(baseUrl)
	return baseUrl .. "/api/v1/streamer/" .. API_KEY
end

local function getRequestHeaders()
	return {
		["bypass-tunnel-reminder"] = "true",
		["Authorization"] = "Bearer " .. API_KEY,
		["X-Bridge-Version"] = "2.0.0"
	}
end

local POLL_INTERVAL    = 1.5   -- slightly slower to reduce rate-limit pressure
local MAX_STAGE_DANCERS = 10
local danceDurationSeconds = 60

local globalDanceCounter = 0

-- Verified catalog emote IDs (always work, owned by Roblox)
local ALL_VERIFIED_EMOTE_IDS = {
	"507770677",  -- Cheer Hype
	"507771019",  -- Dance 1 (Phonk)
	"507772104",  -- Dance 3 (Breakdance)
	"507770238",  -- Wave (Chill)
	"507770453",  -- Point (Idol)
	"507771520",  -- Stadium
	"507770897",  -- Sway
	"507771195",  -- Salute
	"507776043",  -- Stadium wave
}

local DEFAULT_MUSIC_ID       = ""
local GIFT_FANFARE_SOUND_ID  = "rbxassetid://9043887091"

-- ====================================
-- VIRUS / BACKDOOR PURGE ENGINE
-- (minimal footprint – only clear known malicious names)
-- ====================================
local VIRUS_SCRIPT_NAMES = {
	["fe_god"] = true, ["virus"] = true, ["backdoor"] = true,
	["wan_function"] = true, ["admin_virus"] = true,
}
local VIRUS_TEXT_PATTERNS = { "501", "getobjects", "getfullname", "10979999", "103102799" }

task.spawn(function()
	while true do
		pcall(function()
			for _, desc in ipairs(game:GetDescendants()) do
				pcall(function()
					if desc:IsA("TextLabel") or desc:IsA("Hint") or desc:IsA("Message") then
						local txt = tostring(desc.Text or ""):lower()
						for _, pat in ipairs(VIRUS_TEXT_PATTERNS) do
							if string.find(txt, pat, 1, true) then
								local g = desc:FindFirstAncestorWhichIsA("ScreenGui")
									or desc:FindFirstAncestorWhichIsA("BillboardGui")
									or desc.Parent
								if g and g ~= Workspace then pcall(function() g:Destroy() end) end
								break
							end
						end
					elseif (desc:IsA("Script") or desc:IsA("LocalScript") or desc:IsA("ModuleScript"))
						and desc.Name ~= "TikTokDanceManager" and desc.Name ~= "ProceduralDance"
					then
						local n = desc.Name:lower()
						if VIRUS_SCRIPT_NAMES[n]
							or desc:FindFirstAncestor("MapDecor")
							or desc:FindFirstAncestor("StoreAssets")
						then
							pcall(function() desc:Destroy() end)
						end
					end
				end)
			end
		end)
		task.wait(5) -- much less aggressive, every 5s
	end
end)

-- ====================================
-- STAGE SETUP
-- ====================================Players.CharacterAutoLoads = false

pcall(function()
	Lighting.ClockTime      = 20 -- Set to night (8 PM) for awesome lighting contrast!
	Lighting.Brightness     = 0.65
	Lighting.GlobalShadows  = true
	Lighting.Ambient        = Color3.fromRGB(15, 15, 30)
	Lighting.OutdoorAmbient = Color3.fromRGB(10, 10, 20)
	Lighting.EnvironmentDiffuseScale = 0.4
	Lighting.EnvironmentSpecularScale = 0.4

	-- Ensure Bloom exists for neon glow
	local bloom = Lighting:FindFirstChildOfClass("BloomEffect")
	if not bloom then
		bloom = Instance.new("BloomEffect")
		bloom.Intensity = 0.4
		bloom.Size = 18
		bloom.Threshold = 0.85
		bloom.Parent = Lighting
	end

	-- Ensure ColorCorrection exists for vibrant saturation
	local cc = Lighting:FindFirstChildOfClass("ColorCorrectionEffect")
	if not cc then
		cc = Instance.new("ColorCorrectionEffect")
		cc.Brightness = 0.03
		cc.Contrast = 0.12
		cc.Saturation = 0.22
		cc.Parent = Lighting
	end
end)

-- Remote Events
local focusEvent = ReplicatedStorage:FindFirstChild("FocusPlayerEvent")
if not focusEvent then
	focusEvent = Instance.new("RemoteEvent")
	focusEvent.Name = "FocusPlayerEvent"
	focusEvent.Parent = ReplicatedStorage
end

local giftEffectEvent = ReplicatedStorage:FindFirstChild("TikTokGiftEffectEvent") or ReplicatedStorage:FindFirstChild("TikTokGiftEffectRemote")
if not giftEffectEvent then
	giftEffectEvent = Instance.new("RemoteEvent")
	giftEffectEvent.Name = "TikTokGiftEffectRemote"
	giftEffectEvent.Parent = ReplicatedStorage
end

local liveAnimEvent = ReplicatedStorage:FindFirstChild("LiveAnimationControl")
if not liveAnimEvent then
	liveAnimEvent = Instance.new("RemoteEvent")
	liveAnimEvent.Name = "LiveAnimationControl"
	liveAnimEvent.Parent = ReplicatedStorage
end

-- Stage helpers
local function getStageCFrame(stg)
	if not stg then return CFrame.new(0, 1.5, 0) end
	if stg:IsA("Model") then return stg:GetPivot() end
	if stg:IsA("BasePart") then return stg.CFrame end
	return CFrame.new(0, 1.5, 0)
end

local function getStageSize(stg)
	if not stg then return Vector3.new(44, 3, 28) end
	if stg:IsA("Model") then return stg:GetExtentsSize() end
	if stg:IsA("BasePart") then return stg.Size end
	return Vector3.new(44, 3, 28)
end

-- Ensure Stage exists
local stage = Workspace:FindFirstChild("KPopStage") or Workspace:FindFirstChild("DanceStage")
local panels = {}

if not stage then
	stage = Instance.new("Part")
	stage.Name     = "DanceStage"
	stage.Size     = Vector3.new(44, 3, 28)
	stage.Position = Vector3.new(0, 1.5, 0)
	stage.Anchored = true
	stage.Material = Enum.Material.SmoothPlastic
	stage.Color    = Color3.fromRGB(15, 15, 25)
	stage.Parent   = Workspace

	local stageFloor = Instance.new("Part")
	stageFloor.Name         = "StageFloor"
	stageFloor.Size         = Vector3.new(43.8, 0.1, 27.8)
	stageFloor.Position     = Vector3.new(0, 3.05, 0)
	stageFloor.Anchored     = true
	stageFloor.Material     = Enum.Material.Glass
	stageFloor.Color        = Color3.fromRGB(0, 242, 254)
	stageFloor.Transparency = 0.6
	stageFloor.CanCollide   = false
	stageFloor.Parent       = Workspace

	-- Spawn grid panels for beautiful light waves
	local gridContainer = Instance.new("Folder")
	gridContainer.Name = "StageGrid"
	gridContainer.Parent = Workspace
	
	local rows = 4
	local cols = 6
	local startX = -18.75
	local startZ = -11.25
	local spacingX = 7.5
	local spacingZ = 7.5
	
	for r = 1, rows do
		for c = 1, cols do
			local p = Instance.new("Part")
			p.Name = "GridPanel_" .. r .. "_" .. c
			p.Size = Vector3.new(7.0, 0.05, 7.0)
			p.Position = Vector3.new(startX + (c - 1) * spacingX, 3.06, startZ + (r - 1) * spacingZ)
			p.Anchored = true
			p.Material = Enum.Material.Neon
			p.Color = Color3.fromRGB(20, 20, 30)
			p.CanCollide = false
			p.Parent = gridContainer
			table.insert(panels, {part = p, row = r, col = c})
		end
	end

	local neonRim = Instance.new("SelectionBox")
	neonRim.Name          = "NeonRim"
	neonRim.Color3        = Color3.fromRGB(255, 0, 127)
	neonRim.LineThickness = 0.15
	neonRim.Adornee       = stage
	neonRim.Parent        = stage

	local ledWall = Instance.new("Part")
	ledWall.Name      = "LEDWall"
	ledWall.Size      = Vector3.new(36, 18, 1)
	ledWall.Position  = Vector3.new(0, 12, -13)
	ledWall.Anchored  = true
	ledWall.Material  = Enum.Material.Neon
	ledWall.Color     = Color3.fromRGB(255, 0, 127)
	ledWall.Parent    = Workspace
end

-- Spawn cheering audience NPCs
local function spawnAudience()
	local audienceFolder = Workspace:FindFirstChild("StageAudience")
	if audienceFolder then pcall(function() audienceFolder:Destroy() end) end
	
	audienceFolder = Instance.new("Folder")
	audienceFolder.Name = "StageAudience"
	audienceFolder.Parent = Workspace
	
	local audiencePositions = {
		Vector3.new(-22, 1.6, 18),
		Vector3.new(-12, 1.6, 20),
		Vector3.new(0, 1.6, 21),
		Vector3.new(12, 1.6, 20),
		Vector3.new(22, 1.6, 18),
	}
	
	for idx, pos in ipairs(audiencePositions) do
		pcall(function()
			local dummy = Instance.new("Model")
			dummy.Name = "Audience_" .. idx
			dummy.Parent = audienceFolder
			
			local head = Instance.new("Part")
			head.Name = "Head"
			head.Size = Vector3.new(1.2, 1.2, 1.2)
			head.Position = pos + Vector3.new(0, 3.0, 0)
			head.Color = Color3.fromRGB(150, 140, 160)
			head.Anchored = true
			head.CanCollide = false
			head.Parent = dummy
			
			local torso = Instance.new("Part")
			torso.Name = "Torso"
			torso.Size = Vector3.new(2, 2, 1)
			torso.Position = pos + Vector3.new(0, 1.5, 0)
			torso.Color = Color3.fromRGB(40, 45, 60)
			torso.Anchored = true
			torso.CanCollide = false
			torso.Parent = dummy
			
			-- Glow stick
			local stick = Instance.new("Part")
			stick.Name = "GlowStick"
			stick.Size = Vector3.new(0.3, 2.5, 0.3)
			stick.Position = pos + Vector3.new(0.8, 2.2, -0.8)
			stick.Rotation = Vector3.new(20, 0, 15)
			stick.Material = Enum.Material.Neon
			stick.Color = Color3.fromHSV(math.random(), 0.9, 1.0)
			stick.Anchored = true
			stick.CanCollide = false
			stick.Parent = dummy
			
			-- Make them wave
			task.spawn(function()
				local tOffset = math.random() * 10
				local stickBaseCFrame = stick.CFrame
				local torsoBaseCFrame = torso.CFrame
				local headBaseCFrame = head.CFrame
				
				while dummy and dummy.Parent do
					local t = tick() + tOffset
					local waveAngle = math.sin(t * 3) * 15
					local torsoTilt = math.sin(t * 1.5) * 3
					
					pcall(function()
						stick.CFrame = stickBaseCFrame * CFrame.Angles(math.rad(waveAngle), 0, math.rad(waveAngle/2))
						torso.CFrame = torsoBaseCFrame * CFrame.Angles(0, 0, math.rad(torsoTilt))
						head.CFrame = headBaseCFrame * CFrame.Angles(0, 0, math.rad(torsoTilt * 1.2))
					end)
					task.wait(0.05)
				end
			end)
		end)
	end
end

pcall(spawnAudience)

-- Stage dynamic light show (HSV spectrum cycling with diagonal waves)
_G.IsTweeningLighting = false

-- Initialize LEDWall to stable Cyan
task.spawn(function()
	local ledWall = Workspace:FindFirstChild("LEDWall")
	if ledWall then
		ledWall.Color = Color3.fromRGB(0, 200, 255)
	end
end)

task.spawn(function()
	local baseHue = 0
	while true do
		baseHue = (baseHue + 0.003) % 1.0
		
		pcall(function()
			if not _G.IsTweeningLighting then
				-- Cycle grid panels if they exist
				if #panels > 0 then
					for _, item in ipairs(panels) do
						local p = item.part
						if p and p.Parent then
							local panelHue = (baseHue + (item.row + item.col) * 0.04) % 1.0
							p.Color = Color3.fromHSV(panelHue, 0.8, 0.8)
						end
					end
				else
					-- Fallback: Cycle any Neon part inside the stage model (excluding screens/leds)
					local stageObj = Workspace:FindFirstChild("DanceStage") or Workspace:FindFirstChild("KPopStage")
					if stageObj then
						for _, child in ipairs(stageObj:GetDescendants()) do
							if child:IsA("BasePart") and child.Material == Enum.Material.Neon then
								local nameLower = child.Name:lower()
								if not string.find(nameLower, "led") and not string.find(nameLower, "screen") then
									child.Color = Color3.fromHSV(baseHue, 0.8, 0.8)
								end
							end
						end
					end
				end
				
				-- Cycle stage rim
				local stageObj = Workspace:FindFirstChild("DanceStage") or Workspace:FindFirstChild("KPopStage")
				if stageObj then
					local neonRim = stageObj:FindFirstChild("NeonRim")
					if neonRim then
						neonRim.Color3 = Color3.fromHSV(baseHue, 0.8, 1.0)
					end
				end
			end
		end)
		task.wait(0.05)
	end
end)

-- Spotlight
local lightPart = Workspace:FindFirstChild("OverheadLight")
local spotLight
if not lightPart then
	local stageCF = getStageCFrame(stage)
	lightPart          = Instance.new("Part")
	lightPart.Name     = "OverheadLight"
	lightPart.Size     = Vector3.new(4, 1, 4)
	lightPart.Position = stageCF.Position + Vector3.new(0, 22, 0)
	lightPart.Anchored = true
	lightPart.Transparency = 1
	lightPart.Parent   = Workspace

	spotLight            = Instance.new("SpotLight")
	spotLight.Name       = "SpotLight"
	spotLight.Brightness = 1.8
	spotLight.Range      = 45
	spotLight.Angle      = 90
	spotLight.Face       = Enum.NormalId.Bottom
	spotLight.Color      = Color3.fromRGB(255, 255, 255)
	spotLight.Parent     = lightPart
else
	spotLight = lightPart:FindFirstChildOfClass("SpotLight")
end

-- Stage Music
local stageMusic = SoundService:FindFirstChild("StageMusic")
if not stageMusic then
	stageMusic          = Instance.new("Sound")
	stageMusic.Name     = "StageMusic"
	stageMusic.SoundId  = DEFAULT_MUSIC_ID
	stageMusic.Volume   = 1.0
	stageMusic.Looped   = true
	stageMusic.Parent   = SoundService
end
stageMusic.SoundId = DEFAULT_MUSIC_ID
stageMusic.Volume  = 1.0
stageMusic.Looped  = true
if stageMusic.SoundId and stageMusic.SoundId ~= "" then
	stageMusic:Play()
else
	pcall(function() stageMusic:Stop() end)
end

-- ====================================
-- MUSIC
-- ====================================
local currentMusicId = DEFAULT_MUSIC_ID

local function changeStageMusic(musicAssetId)
	pcall(function()
		if not musicAssetId or musicAssetId == "" then
			stageMusic:Stop(); stageMusic.SoundId = ""; return
		end
		if not string.find(musicAssetId, "rbxassetid://") then
			musicAssetId = "rbxassetid://" .. musicAssetId
		end
		if stageMusic.SoundId == musicAssetId and stageMusic.IsPlaying then return end
		stageMusic:Stop()
		stageMusic.SoundId = musicAssetId
		stageMusic.Volume  = 1.0
		stageMusic.Looped  = true
		stageMusic:Play()
	end)
end

-- ====================================
-- ACTION HANDLERS (Gift effects & Primitives)
-- ====================================
local ActionHandlers = {}

-- Primitive Action Handlers (Phase 5 Dynamic Action Executor)
ActionHandlers.SPAWN_PARTICLES = function(action, context)
	pcall(function()
		local params = action.parameters or {}
		if giftEffectEvent then
			local giftId = params.giftId or params.giftName or "rose"
			local giftName = params.giftName or giftId
			giftEffectEvent:FireAllClients(
				{ giftId = tostring(giftId):lower(), giftName = tostring(giftName) },
				context.tiktokUsername or "Viewer",
				getStageCFrame(stage).Position,
				true
			)
		end
	end)
end

ActionHandlers.TWEEN_LIGHTING = function(action, context)
	pcall(function()
		local params = action.parameters or {}
		local color = params.color or "#00f2fe"
		local brightness = params.brightness or 3.5
		local duration = (params.durationMs or action.durationMs or 6000) / 1000

		local ledWall = Workspace:FindFirstChild("LEDWall")
		if not ledWall then return end
		
		_G.IsTweeningLighting = true
		
		local r, g, b = 0, 242, 254
		if type(color) == "string" and string.sub(color, 1, 1) == "#" then
			local hex = string.sub(color, 2)
			r = tonumber(string.sub(hex, 1, 2), 16) or 0
			g = tonumber(string.sub(hex, 3, 4), 16) or 242
			b = tonumber(string.sub(hex, 5, 6), 16) or 254
		elseif type(color) == "table" then
			r = color.R or color[1] or 0
			g = color.G or color[2] or 242
			b = color.B or color[3] or 254
		end
		
		ledWall.Color = Color3.fromRGB(r, g, b)
		if spotLight then spotLight.Brightness = brightness end
		
		task.delay(duration, function()
			pcall(function()
				if spotLight then spotLight.Brightness = 1.8 end
				_G.IsTweeningLighting = false
			end)
		end)
	end)
end

ActionHandlers.PLAY_SOUND = function(action, context)
	pcall(function()
		local params = action.parameters or {}
		local soundId = params.soundId or params.musicId
		if soundId then
			changeStageMusic(tostring(soundId))
		end
	end)
end

ActionHandlers.BROADCAST_MESSAGE = function(action, context)
	pcall(function()
		local params = action.parameters or {}
		local template = params.template or "🎁 %s vừa tặng quà!"
		local msgText = string.format(template, context.tiktokUsername or "Khán giả")
		print("[RobloxAction] BROADCAST_MESSAGE: " .. msgText)
		if liveAnimEvent then
			liveAnimEvent:FireAllClients("message", msgText)
		end
	end)
end

-- Backward Compatibility Mappings (Call primitives internally)
ActionHandlers.FLOWER_RAIN = function(action, context)
	ActionHandlers.SPAWN_PARTICLES({ parameters = { giftId = "rose", giftName = "Rose" } }, context)
end

ActionHandlers.HEART_BURST = function(action, context)
	ActionHandlers.SPAWN_PARTICLES({ parameters = { giftId = "hand_heart", giftName = "Hand Heart" } }, context)
end

ActionHandlers.FIREWORKS = function(action, context)
	ActionHandlers.SPAWN_PARTICLES({ parameters = { giftId = "fireworks", giftName = "Fireworks" } }, context)
end

ActionHandlers.DRAGON_AURA = function(action, context)
	ActionHandlers.SPAWN_PARTICLES({ parameters = { giftId = "dragon", giftName = "Dragon" } }, context)
end

ActionHandlers.LION_KING = function(action, context)
	ActionHandlers.SPAWN_PARTICLES({ parameters = { giftId = "lion", giftName = "Lion King" } }, context)
end

ActionHandlers.CHANGE_STAGE_LIGHT = function(action, context)
	ActionHandlers.TWEEN_LIGHTING(action, context)
end

ActionHandlers.SHOW_MESSAGE = function(action, context)
	ActionHandlers.BROADCAST_MESSAGE(action, context)
end

ActionHandlers.CHANGE_MUSIC = function(action, context)
	ActionHandlers.PLAY_SOUND(action, context)
end

-- Execute Game Event (Phase 5: Detailed sub-actions ACK & diagnostics)
local processedEventIds = {}
local function executeGameEvent(gameEvent)
	if not gameEvent or not gameEvent.eventId then return end
	if processedEventIds[gameEvent.eventId] then return end
	processedEventIds[gameEvent.eventId] = true

	print(string.format("[TikTokDanceManager] Executing GameEvent [%s] (%d actions)", gameEvent.eventId, #(gameEvent.actions or {})))

	local allSuccess = true
	local lastErr    = nil
	local actionsAck = {}

	for _, action in ipairs(gameEvent.actions or {}) do
		local handler = ActionHandlers[action.type]
		local success = false
		local runErr  = nil
		if handler then
			local ok, err = pcall(function() handler(action, gameEvent.context or {}) end)
			if ok then
				success = true
			else
				allSuccess = false
				runErr = tostring(err)
				lastErr = runErr
				warn(string.format("[TikTokDanceManager] Action error [%s]: %s", action.type, runErr))
			end
		else
			allSuccess = false
			runErr = "Unknown action type"
			lastErr = runErr
			warn(string.format("[TikTokDanceManager] Unknown Action type: %s", action.type))
		end

		table.insert(actionsAck, {
			actionId = action.actionId or action.id or action.type,
			success = success,
			["error"] = runErr
		})
	end

	pcall(function()
		local stats = game:GetService("Stats")
		local memUsage = stats and stats:GetTotalMemoryUsageMb() or 250
		local fps = 60
		pcall(function()
			fps = math.round(Workspace:GetRealPhysicsFPS())
		end)

		local diagnostics = {
			fps = fps,
			memoryUsage = math.round(memUsage),
			ping = 15
		}

		local ackUrl = getActiveBaseUrl() .. "/game-events/" .. gameEvent.eventId .. "/ack"
		local body   = HttpService:JSONEncode({
			success = allSuccess,
			["error"] = lastErr,
			actions = actionsAck,
			diagnostics = diagnostics
		})
		HttpService:PostAsync(ackUrl, body, Enum.HttpContentType.ApplicationJson, false, getRequestHeaders())
	end)
end

-- ====================================
-- NAMETAG
-- ====================================
local function createNametag(character, tiktokUsername, robloxUsername, isVIP)
	pcall(function()
		local head = character:FindFirstChild("Head")
		if not head then return end

		local existing = head:FindFirstChild("DancerNametag")
		if existing then existing:Destroy() end

		local bbGui       = Instance.new("BillboardGui")
		bbGui.Name        = "DancerNametag"
		bbGui.Size        = UDim2.new(0, 170, 0, 42)
		bbGui.StudsOffset = Vector3.new(0, 2.8, 0)
		bbGui.AlwaysOnTop = true

		local frame                    = Instance.new("Frame")
		frame.Size                     = UDim2.new(1, 0, 1, 0)
		frame.BackgroundColor3         = isVIP and Color3.fromRGB(45, 35, 10) or Color3.fromRGB(12, 14, 24)
		frame.BackgroundTransparency   = 0.15
		frame.BorderSizePixel          = 0
		frame.Parent                   = bbGui

		local uiCorner             = Instance.new("UICorner")
		uiCorner.CornerRadius      = UDim.new(0, 8)
		uiCorner.Parent            = frame

		local uiStroke             = Instance.new("UIStroke")
		uiStroke.Color             = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 0, 127)
		uiStroke.Thickness         = isVIP and 2.5 or 1.5
		uiStroke.Parent            = frame

		local label                = Instance.new("TextLabel")
		label.Size                 = UDim2.new(1, -8, 1, -2)
		label.Position             = UDim2.new(0, 4, 0, 1)
		label.BackgroundTransparency = 1
		local ttUser               = (tiktokUsername and tostring(tiktokUsername) ~= "") and tostring(tiktokUsername) or tostring(robloxUsername or "Viewer")
		local rbxUser              = (robloxUsername and tostring(robloxUsername) ~= "") and tostring(robloxUsername) or ttUser
		label.Text                 = (isVIP and "👑 VIP: @" or "@") .. ttUser .. "\n(" .. rbxUser .. ")"
		label.TextColor3           = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 255, 255)
		label.TextScaled           = true
		label.Font                 = Enum.Font.GothamBold
		label.Parent               = frame

		bbGui.Parent = head
	end)
end

-- ====================================
-- PROCEDURAL DANCE FALLBACK
-- ====================================
local function startProceduralDance(character, danceStyle)
	local hrp = character:FindFirstChild("HumanoidRootPart") or character.PrimaryPart
	if not hrp then return end

	local existingTag = character:FindFirstChild("ProceduralDanceTag")
	if existingTag then existingTag:Destroy() end

	local tag      = Instance.new("BoolValue")
	tag.Name       = "ProceduralDanceTag"
	tag.Parent     = character

	local baseCF   = hrp.CFrame
	local style    = tostring(danceStyle or "bounce"):lower()

	task.spawn(function()
		local startTime = tick()
		while character and character.Parent and tag and tag.Parent do
			local t           = tick() - startTime
			local offsetCFrame = CFrame.new()

			if style == "bounce" or style == "hype" or style == "phonk" or style == "funk" then
				local yOffset = math.abs(math.sin(t * 8)) * 0.45
				local tilt    = math.sin(t * 8) * 0.12
				local rotY    = math.sin(t * 4) * 0.15
				offsetCFrame  = CFrame.new(0, yOffset, 0) * CFrame.Angles(0, rotY, tilt)
			elseif style == "shuffle" or style == "hiphop" then
				local xOffset = math.sin(t * 6) * 0.6
				local yOffset = math.abs(math.cos(t * 6)) * 0.3
				local rotY    = math.sin(t * 6) * 0.2
				offsetCFrame  = CFrame.new(xOffset, yOffset, 0) * CFrame.Angles(0, rotY, 0)
			elseif style == "wave" or style == "chill" then
				local rotZ    = math.sin(t * 3.5) * 0.15
				local rotX    = math.cos(t * 3.5) * 0.08
				local yOffset = math.sin(t * 3.5) * 0.15
				offsetCFrame  = CFrame.new(0, yOffset, 0) * CFrame.Angles(rotX, 0, rotZ)
			else
				local yOffset = math.abs(math.sin(t * 7)) * 0.35
				local rotY    = math.sin(t * 7) * 0.15
				offsetCFrame  = CFrame.new(0, yOffset, 0) * CFrame.Angles(0, rotY, 0)
			end

			pcall(function() hrp.CFrame = baseCF * offsetCFrame end)
			task.wait(0.03)
		end
	end)
end

-- ====================================
-- DANCE STATUS REPORT
-- ====================================
local function reportDanceStatus(playerId, robloxUsername, danceId, danceStyle, success, mode, message)
	pcall(function()
		local danceStatusUrl = getActiveBaseUrl() .. "/dance-status"
		local payload = HttpService:JSONEncode({
			playerId       = playerId,
			robloxUsername = robloxUsername,
			danceId        = danceId or "",
			danceStyle     = danceStyle or "bounce",
			success        = success and true or false,
			mode           = mode or "pending",
			message        = message or ""
		})
		HttpService:PostAsync(danceStatusUrl, payload, Enum.HttpContentType.ApplicationJson, false, getRequestHeaders())
	end)
end

-- ====================================
-- PLAY DANCE ANIMATION (Fixed)
-- ====================================
local function playDanceAnimation(character, animAssetId, danceStyle, playerId, robloxUsername)
	task.spawn(function()
		-- Wait for Humanoid (max 5s)
		local humanoid = character:WaitForChild("Humanoid", 5)
		if not humanoid then
			reportDanceStatus(playerId, robloxUsername or character.Name, animAssetId, danceStyle, false, "failed", "Khong tim thay Humanoid.")
			return
		end

		-- Disable movement
		pcall(function()
			humanoid.AutoRotate  = false
			humanoid.WalkSpeed   = 0
			humanoid.JumpPower   = 0
			humanoid.JumpHeight  = 0
		end)

		-- Kill default Animate script
		local defaultAnimate = character:FindFirstChild("Animate")
		if defaultAnimate then pcall(function() defaultAnimate:Destroy() end) end

		-- HRP: must NOT be anchored for Animator to work
		local hrp = character:FindFirstChild("HumanoidRootPart") or character.PrimaryPart
		if hrp then
			hrp.Anchored = false
			-- Give network ownership to server
			pcall(function() hrp:SetNetworkOwner(nil) end)
		end

		-- Stop old ProceduralDance
		if ProceduralDance then
			pcall(function() ProceduralDance.StopDance(character) end)
		end
		local oldProcTag = character:FindFirstChild("ProceduralDanceTag")
		if oldProcTag then pcall(function() oldProcTag:Destroy() end) end

		-- Ensure Animator exists
		local animator = humanoid:FindFirstChildOfClass("Animator")
		if not animator then
			animator = Instance.new("Animator")
			animator.Parent = humanoid
		end

		-- Stop all existing tracks
		pcall(function()
			for _, track in ipairs(animator:GetPlayingAnimationTracks()) do
				track:Stop(0.1)
			end
		end)

		task.wait(0.2)

		-- Parse animation ID
		local rawIdStr = tostring(animAssetId or ""):gsub("rbxassetid://", ""):match("^%s*(.-)%s*$")
		local rawIdNum = tonumber(rawIdStr)

		local animPlayedSuccessfully = false
		local verifiedDanceId        = animAssetId or ""

		-- =====================================================================
		-- STEP 1: Try direct Animation Asset ID
		-- NOTE: InsertService:LoadAsset() is REMOVED - blocked in Live server
		-- =====================================================================
		if not animPlayedSuccessfully and rawIdStr ~= "" and rawIdNum and rawIdNum > 0 then
			local resolvedId = "rbxassetid://" .. rawIdStr

			local anim        = Instance.new("Animation")
			anim.AnimationId  = resolvedId

			local loadOk, track = pcall(function() return animator:LoadAnimation(anim) end)
			if loadOk and track then
				local playOk = pcall(function()
					track.Priority = Enum.AnimationPriority.Action4
					track.Looped   = true
					track:Play(0.15, 1, 1)
				end)
				if playOk then
					task.wait(0.3)
					if track.IsPlaying then
						animPlayedSuccessfully = true
						verifiedDanceId        = resolvedId
						print(string.format("[TikTokDanceManager] ✅ Playing animation [%s] for %s", resolvedId, robloxUsername or character.Name))
						reportDanceStatus(playerId, robloxUsername or character.Name, resolvedId, danceStyle, true, "asset", "Animation track loaded and playing.")
					else
						pcall(function() track:Stop(0) end)
						print(string.format("[TikTokDanceManager] ⚠️ Animation [%s] IsPlaying=false (ownership/security check). Trying fallback.", resolvedId))
					end
				end
			else
				warn(string.format("[TikTokDanceManager] LoadAnimation failed for [%s]: %s", rawIdStr, tostring(track)))
			end
		end

		-- =====================================================================
		-- STEP 2: Custom Animation/KeyframeSequence from ReplicatedStorage
		-- =====================================================================
		if not animPlayedSuccessfully then
			pcall(function()
				local KeyframeSequenceProvider = game:GetService("KeyframeSequenceProvider")
				for _, desc in ipairs(ReplicatedStorage:GetDescendants()) do
					if animPlayedSuccessfully then break end
					if desc:IsA("Animation") or desc:IsA("KeyframeSequence") then
						local animToLoad = desc
						local animId     = (desc:IsA("Animation") and desc.AnimationId) or ""

						if desc:IsA("KeyframeSequence") then
							pcall(function()
								local hashId = KeyframeSequenceProvider:RegisterKeyframeSequence(desc)
								if hashId then
									local tempAnim = Instance.new("Animation")
									tempAnim.AnimationId = hashId
									animToLoad = tempAnim
								end
							end)
						end

						local ok, track = pcall(function() return animator:LoadAnimation(animToLoad) end)
						if ok and track then
							track.Priority = Enum.AnimationPriority.Action4
							track.Looped   = true
							track:Play(0.15, 1, 1)
							task.wait(0.2)
							if track.IsPlaying then
								animPlayedSuccessfully = true
								verifiedDanceId        = animId ~= "" and animId or desc.Name
								print(string.format("[TikTokDanceManager] 💃 Playing CUSTOM %s [%s] from ReplicatedStorage!", desc.ClassName, desc.Name))
								reportDanceStatus(playerId, robloxUsername or character.Name, verifiedDanceId, danceStyle, true, "asset", "Custom Animation trong ReplicatedStorage da chay.")
							else
								pcall(function() track:Stop(0) end)
							end
						end
					end
				end
			end)
		end

		-- =====================================================================
		-- STEP 3: Fallback to verified catalog emotes (always work)
		-- =====================================================================
		if not animPlayedSuccessfully then
			globalDanceCounter = globalDanceCounter + 1
			local idx          = ((globalDanceCounter - 1) % #ALL_VERIFIED_EMOTE_IDS) + 1
			local emoteId      = "rbxassetid://" .. ALL_VERIFIED_EMOTE_IDS[idx]

			local anim        = Instance.new("Animation")
			anim.AnimationId  = emoteId
			local ok, track   = pcall(function() return animator:LoadAnimation(anim) end)
			if ok and track then
				track.Priority = Enum.AnimationPriority.Action4
				track.Looped   = true
				track:Play(0.15, 1, 1)
				task.wait(0.2)
				if track.IsPlaying then
					animPlayedSuccessfully = true
					verifiedDanceId        = emoteId
					print(string.format("[TikTokDanceManager] 🎭 Fallback emote [%s] playing for %s", emoteId, robloxUsername or character.Name))
					reportDanceStatus(playerId, robloxUsername or character.Name, emoteId, danceStyle, true, "asset", "Fallback catalog emote playing.")
				else
					pcall(function() track:Stop(0) end)
				end
			end
		end

		-- =====================================================================
		-- STEP 4: ProceduralDance Motor6D (last resort)
		-- =====================================================================
		if not animPlayedSuccessfully then
			print(string.format("[TikTokDanceManager] 🔄 Using ProceduralDance for %s (style: %s)", robloxUsername or character.Name, tostring(danceStyle or "hype")))
			if ProceduralDance then
				pcall(function() ProceduralDance.StartDance(character, danceStyle or "hype") end)
			else
				startProceduralDance(character, danceStyle or "hype")
			end
			task.wait(0.15)
			reportDanceStatus(playerId, robloxUsername or character.Name, verifiedDanceId, danceStyle, true, "procedural", "Fallback ProceduralDance Motor6D.")
		end
	end)
end

-- ====================================
-- SLOT POSITIONS
-- ====================================
local function getSlotOffset(index)
	local row   = math.floor((index - 1) / 5)
	local col   = (index - 1) % 5
	local xSpacing = 7.0
	local zSpacing = 7.5
	local xOffset  = (col - 2) * xSpacing
	local zOffset  = (row - 0.5) * zSpacing

	local yOffset = 3.2
	if stage then
		local stageSize = getStageSize(stage)
		yOffset = (stageSize.Y / 2) + 3.0
	end

	local stageFloor = Workspace:FindFirstChild("StageFloor") or (stage and stage:FindFirstChild("StageFloor"))
	if stageFloor and stage then
		yOffset = (stageFloor.Position.Y + 3.0) - stage.Position.Y
	end

	return Vector3.new(xOffset, yOffset, zOffset)
end

-- ====================================
-- SPAWN DANCER (Fixed avatar load)
-- ====================================
local activeDancersList  = {}
local nextSlotIndex      = 1

local function spawnDancer(playerId, robloxUsername, tiktokUsername, animationId, isVIP, giftDetails, customTitle, customColor, danceStyle)
	print(string.format("[TikTokDanceManager] 🕺 Spawning: TikTok @%s → Roblox: %s", tostring(tiktokUsername), tostring(robloxUsername)))

	task.spawn(function()
		-- DEDUP: Remove existing avatar with same username first
		local existingModel = Workspace:FindFirstChild(robloxUsername)
		if existingModel then
			pcall(function() existingModel:Destroy() end)
			for i = #activeDancersList, 1, -1 do
				if activeDancersList[i] and activeDancersList[i].robloxUsername == robloxUsername then
					table.remove(activeDancersList, i)
				end
			end
		end

		-- Get Roblox UserID (with pcall)
		local userId = 1
		local userIdOk, userIdResult = pcall(function()
			return Players:GetUserIdFromNameAsync(robloxUsername)
		end)
		if userIdOk and userIdResult and userIdResult > 0 then
			userId = userIdResult
		else
			warn(string.format("[TikTokDanceManager] GetUserIdFromNameAsync failed for '%s': %s", robloxUsername, tostring(userIdResult)))
		end

		-- Load avatar character model
		-- Strategy: try GetHumanoidDescriptionFromUserIdAsync → CreateHumanoidModelFromDescription
		--           fallback: CreateHumanoidModelFromUserIdAsync (old API, slower but works)
		--           fallback: fallback box rig
		local characterModel = nil

		-- Attempt 1: Description-based (better fidelity)
		if userId > 1 then
			local humDescOk, humDesc = pcall(function()
				return Players:GetHumanoidDescriptionFromUserIdAsync(userId)
			end)
			if humDescOk and humDesc then
				local createOk, model = pcall(function()
					return Players:CreateHumanoidModelFromDescription(humDesc, Enum.HumanoidRigType.R15)
				end)
				if createOk and model then
					characterModel = model
				end
			end
		end

		-- Attempt 2: Direct userId model (works on Live, slightly slower)
		if not characterModel and userId > 1 then
			local ok, model = pcall(function()
				return Players:CreateHumanoidModelFromUserIdAsync(userId)
			end)
			if ok and model then characterModel = model end
		end

		-- Attempt 3: Minimal fallback rig (never fails)
		if not characterModel then
			warn(string.format("[TikTokDanceManager] ⚠️ Avatar load failed for userId=%s, using fallback rig.", tostring(userId)))
			characterModel = Instance.new("Model")

			local hum = Instance.new("Humanoid")
			hum.Parent = characterModel

			local hrp       = Instance.new("Part")
			hrp.Name        = "HumanoidRootPart"
			hrp.Size        = Vector3.new(2, 2, 1)
			hrp.Transparency = 1
			hrp.CanCollide  = false
			hrp.Parent      = characterModel
			characterModel.PrimaryPart = hrp

			local head      = Instance.new("Part")
			head.Name       = "Head"
			head.Shape      = Enum.PartType.Ball
			head.Size       = Vector3.new(1.2, 1.2, 1.2)
			head.Color      = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 200, 100)
			head.Parent     = characterModel

			local torso     = Instance.new("Part")
			torso.Name      = "UpperTorso"
			torso.Size      = Vector3.new(2, 2, 1)
			torso.Color     = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(0, 242, 254)
			torso.Parent    = characterModel
		end

		-- Limit max dancers on stage
		if #activeDancersList >= MAX_STAGE_DANCERS then
			local oldest = table.remove(activeDancersList, 1)
			if oldest and oldest.model and oldest.model.Parent then
				pcall(function() oldest.model:Destroy() end)
			end
		end

		characterModel.Name   = robloxUsername
		characterModel.Parent = Workspace

		-- Position on stage BEFORE disabling Animate script to avoid T-pose flash
		local slotIdx   = ((nextSlotIndex - 1) % MAX_STAGE_DANCERS) + 1
		nextSlotIndex   = nextSlotIndex + 1

		local stageCF     = getStageCFrame(stage)
		local offset      = getSlotOffset(slotIdx)
		local targetCFrame = stageCF * CFrame.new(offset) * CFrame.Angles(0, math.rad(180), 0)
		characterModel:PivotTo(targetCFrame)

		-- Disable default Roblox Animate script
		pcall(function()
			local animScript = characterModel:FindFirstChild("Animate")
			if animScript then animScript.Disabled = true end
		end)

		-- DO NOT anchor HRP here — let playDanceAnimation handle it
		-- (Anchoring HRP before animation causes animation to not play)

		table.insert(activeDancersList, {
			model          = characterModel,
			robloxUsername = robloxUsername,
			tiktokUsername = tiktokUsername,
			isVIP          = isVIP,
			spawnTime      = tick(),
		})

		-- Nametag
		createNametag(characterModel, tiktokUsername, robloxUsername, isVIP)

		-- Start dancing (handles HRP anchor internally)
		playDanceAnimation(characterModel, animationId, danceStyle, playerId, robloxUsername)

		-- Gift VFX
		if giftDetails and giftEffectEvent then
			pcall(function()
				giftEffectEvent:FireAllClients(giftDetails, tiktokUsername, targetCFrame.Position, isVIP)
			end)
		end

		-- Focus camera on dancer
		if focusEvent then
			pcall(function()
				focusEvent:FireAllClients(characterModel, tiktokUsername, robloxUsername, #activeDancersList, isVIP, customTitle, customColor)
			end)
		end
	end)
end

-- ====================================
-- DESPAWN LOOP (auto-remove after duration)
-- ====================================
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

-- ====================================
-- HEARTBEAT LOOP
-- ====================================
task.spawn(function()
	while true do
		local ok, err = pcall(function()
			local heartbeatUrl = getActiveBaseUrl() .. "/heartbeat"
			local payload = HttpService:JSONEncode({
				placeId   = tostring(game.PlaceId),
				jobId     = tostring(game.JobId),
				scriptVer = "2.2.0"
			})
			HttpService:PostAsync(heartbeatUrl, payload, Enum.HttpContentType.ApplicationJson, false, getRequestHeaders())
		end)
		if not ok then
			warn("[TikTokDanceManager] Heartbeat Error: " .. tostring(err))
		end
		task.wait(10)
	end
end)

-- ====================================
-- MAIN POLLING LOOP (Phase 5: Exponential Backoff & Jitter)
-- ====================================
local lastProcessedPlayerId  = ""
local currentSelectedDanceId = "rbxassetid://86539981118136"

task.spawn(function()
	print(string.format("[TikTokDanceManager] 🚀 Poller started [API Key: %s]", API_KEY))
	
	local currentPollInterval = POLL_INTERVAL
	local baseInterval        = POLL_INTERVAL
	local maxInterval         = 30.0

	while true do
		local activeBase = getActiveBaseUrl()
		local playerUrl  = activeBase .. "/current-player"
		local eventsUrl  = activeBase .. "/game-events"
		local pollSuccess = true

		-- 1. Poll current player
		local ok1, err1 = pcall(function()
			local response = HttpService:GetAsync(playerUrl, false, getRequestHeaders())
			local data     = HttpService:JSONDecode(response)

			if data and data.success then
				if data.danceDuration then
					danceDurationSeconds = tonumber(data.danceDuration) or 60
				end

				-- Music change
				if data.currentMusicId and data.currentMusicId ~= currentMusicId then
					currentMusicId = data.currentMusicId
					changeStageMusic(currentMusicId)
				end

				-- New player
				if data.player and data.player.id ~= lastProcessedPlayerId then
					lastProcessedPlayerId = data.player.id

					local animId = (data.player.animationId and data.player.animationId ~= "")
						and data.player.animationId
						or (data.selectedDanceId or "rbxassetid://86539981118136")

					spawnDancer(
						data.player.id,
						data.player.robloxUsername,
						data.player.tiktokUsername,
						animId,
						data.player.isVIP,
						data.player.giftDetails,
						data.overlayTitle,
						data.overlayColor,
						data.player.danceStyle or data.selectedDanceStyle or "bounce"
					)

				elseif data.selectedDanceId and data.selectedDanceId ~= currentSelectedDanceId then
					-- Dance style changed → re-animate all active dancers
					currentSelectedDanceId = data.selectedDanceId
					for _, dancer in ipairs(activeDancersList) do
						if dancer and dancer.model and dancer.model.Parent then
							playDanceAnimation(dancer.model, currentSelectedDanceId, data.selectedDanceStyle, nil, dancer.robloxUsername)
						end
					end
				end
			end
		end)
		if not ok1 then
			pollSuccess = false
			warn("[TikTokDanceManager] Player Poll Error: " .. tostring(err1))
		end

		-- 2. Poll game events (gift effects etc.)
		local ok2, err2 = pcall(function()
			local response = HttpService:GetAsync(eventsUrl, false, getRequestHeaders())
			local data     = HttpService:JSONDecode(response)
			if data and data.success and data.events then
				for _, gameEvent in ipairs(data.events) do
					executeGameEvent(gameEvent)
				end
			end
		end)
		if not ok2 then
			pollSuccess = false
			warn("[TikTokDanceManager] Events Poll Error: " .. tostring(err2))
		end

		-- Exponential Backoff poller check
		if pollSuccess then
			currentPollInterval = baseInterval
		else
			local jitter = 0.8 + math.random() * 0.4
			currentPollInterval = math.min(maxInterval, currentPollInterval * 2 * jitter)
			print(string.format("[TikTokDanceManager] ⚠️ Connection error. Backing off for %.2f seconds...", currentPollInterval))
		end

		task.wait(currentPollInterval)
	end
end)

print("[TikTokDanceManager] ✅ v2.1 TikTok Live Comment & Game Event Engine Initialized.")
