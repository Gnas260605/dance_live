-- TikTokDanceManager.server.lua
-- Production Roblox Action Executor & Multi-Tenant TikTok Live Sync Engine

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")
local RunService = game:GetService("RunService")

-- Require ProceduralDance Module for Motor6D Limb Animations
local ProceduralDance = nil
pcall(function()
	local sharedFolder = ReplicatedStorage:FindFirstChild("Shared") or ReplicatedStorage
	local procMod = sharedFolder:FindFirstChild("ProceduralDance")
	if procMod then
		ProceduralDance = require(procMod)
	end
end)

-- Heartbeat loop to drive Procedural Motor6D limb dance animations
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

local API_KEY = script:GetAttribute("API_KEY") or "demo-api-key-sg-music"
local PUBLIC_URL = "https://dance-live.onrender.com"
local LOCAL_URL = "http://127.0.0.1:3001"



-- Automatically detect environment: Default to Render Public URL so Studio and Web Dashboard sync seamlessly
local DOMAIN_URL = script:GetAttribute("DOMAIN_URL")
if not DOMAIN_URL or DOMAIN_URL == "" then
	local useLocal = script:GetAttribute("USE_LOCAL")
	if useLocal == true then
		DOMAIN_URL = LOCAL_URL
	else
		DOMAIN_URL = PUBLIC_URL
	end
end

local BASE_URL = DOMAIN_URL .. "/api/v1/streamer/" .. API_KEY
local DANCE_STATUS_URL = BASE_URL .. "/dance-status"
local POLL_INTERVAL = 1.2
local MAX_STAGE_DANCERS = 10
local danceDurationSeconds = 60

local globalDanceCounter = 0
local ALL_VERIFIED_EMOTE_IDS = {
	"507770677", -- Cheer Hype (Hands up jump)
	"507771019", -- Dance 1 (Phonk Rocking)
	"507772104", -- Dance 3 (Breakdance B-boy)
	"507770238", -- Wave (Chill Wave)
	"507770453", -- Point (Cute Idol Pointing)
	"507771520", -- Stadium (Street Dance)
	"507770897"  -- Laugh / Sway
}

local DEFAULT_MUSIC_ID = ""
local GIFT_FANFARE_SOUND_ID = "rbxassetid://9043887091"

-- AUTOMATED CONTINUOUS VIRUS & FAKE ERROR 501 / BACKDOOR PURGE ENGINE
task.spawn(function()
	while true do
		pcall(function()
			-- 1. Destroy any Virus GUI / Backdoor Textbox elements instantly
			for _, desc in ipairs(game:GetDescendants()) do
				pcall(function()
					if desc:IsA("TextLabel") or desc:IsA("TextButton") or desc:IsA("TextBox") or desc:IsA("Hint") or desc:IsA("Message") then
						local txt = tostring(desc.Text or ""):lower()
						if string.find(txt, "501") or string.find(txt, "something went wrong") or string.find(txt, "command bar") or string.find(txt, "issue with a model") or string.find(txt, "copy the text") or string.find(txt, "getobjects") or string.find(txt, "rbxassetid") or string.find(txt, "getfullname") or string.find(txt, "split") or string.find(txt, "10979999") or string.find(txt, "103102799") then
							local targetGui = desc:FindFirstAncestorWhichIsA("SurfaceGui") 
								or desc:FindFirstAncestorWhichIsA("BillboardGui") 
								or desc:FindFirstAncestorWhichIsA("ScreenGui") 
								or desc.Parent
							if targetGui and targetGui.Name ~= "Workspace" and targetGui.Name ~= "DataModel" then
								pcall(function() targetGui:Destroy() end)
							else
								pcall(function() desc:Destroy() end)
							end
						end
					elseif desc:IsA("SurfaceGui") or desc:IsA("BillboardGui") or desc:IsA("ScreenGui") then
						if string.find(desc.Name:lower(), "error") or string.find(desc.Name:lower(), "backdoor") or string.find(desc.Name:lower(), "virus") or string.find(desc.Name:lower(), "toolbox") then
							pcall(function() desc:Destroy() end)
						end
					end
				end)
			end

			-- 2. Destroy any malicious third-party virus scripts in MapDecor, Workspace, Lighting, StarterGui
			for _, desc in ipairs(game:GetDescendants()) do
				pcall(function()
					if (desc:IsA("Script") or desc:IsA("LocalScript") or desc:IsA("ModuleScript")) and desc.Name ~= "TikTokDanceManager" and desc.Name ~= "ProceduralDance" then
						local scriptName = desc.Name:lower()
						if string.find(scriptName, "virus") or string.find(scriptName, "backdoor") or string.find(scriptName, "weld") or string.find(scriptName, "error") or desc:FindFirstAncestor("MapDecor") or desc:FindFirstAncestor("StoreAssets") then
							pcall(function() desc:Destroy() end)
						end
					end
				end)
			end
		end)
		task.wait(0.2)
	end
end)

pcall(function()
	local vfxRoot = Workspace:FindFirstChild("vfx")
	local template = vfxRoot and vfxRoot:FindFirstChild("Explosion effect")
	if not template and vfxRoot then
		template = vfxRoot:FindFirstChildWhichIsA("BasePart")
	end
	if template then
		for _, desc in ipairs(template:GetDescendants()) do
			if desc:IsA("Script") or desc:IsA("LocalScript") or desc:IsA("ModuleScript") then
				desc:Destroy()
			elseif desc:IsA("LayerCollector") or desc:IsA("GuiObject") then
				desc:Destroy()
			elseif desc:IsA("PostEffect") then
				desc.Enabled = false
			elseif desc:IsA("Sound") then
				desc:Stop()
				desc.SoundId = ""
			end
		end
	end
end)

local function purgeBrokenMapDecor()
	pcall(function()
		for _, child in ipairs(Workspace:GetChildren()) do
			if child.Name == "MapDecor" then
				child:Destroy()
			end
		end
	end)
end

purgeBrokenMapDecor()
task.defer(purgeBrokenMapDecor)

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
if stageMusic.SoundId and stageMusic.SoundId ~= "" then
	stageMusic:Play()
else
	pcall(function() stageMusic:Stop() end)
end

-- RemoteEvents for Client Panels & VFX
local giftEffectEvent = ReplicatedStorage:FindFirstChild("TikTokGiftEffectRemote") or ReplicatedStorage:FindFirstChild("GiftEffectEvent")
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

-- State Tracking
local lastProcessedPlayerId = ""
local currentMusicId = DEFAULT_MUSIC_ID
local currentSelectedDanceId = "rbxassetid://82137434664110"
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

-- Change Stage Music
local function changeStageMusic(musicAssetId)
	pcall(function()
		if not musicAssetId or musicAssetId == "" then
			stageMusic:Stop()
			stageMusic.SoundId = ""
			return
		end
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
		local ttUser = (tiktokUsername and tostring(tiktokUsername) ~= "") and tostring(tiktokUsername) or tostring(robloxUsername or "Viewer")
		local rbxUser = (robloxUsername and tostring(robloxUsername) ~= "") and tostring(robloxUsername) or ttUser
		local displayName = isVIP and ("👑 GIFT VIP: @" .. ttUser) or ("@" .. ttUser)
		label.Text = displayName .. "\n(" .. rbxUser .. ")"
		label.TextColor3 = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 255, 255)
		label.TextScaled = true
		label.Font = Enum.Font.GothamBold
		label.Parent = frame

		bbGui.Parent = head
	end)
end

-- Procedural Dance Motion Fallback Engine
local function startProceduralDance(character, danceStyle)
	local hrp = character:FindFirstChild("HumanoidRootPart") or character.PrimaryPart
	if not hrp then return end

	local existingTag = character:FindFirstChild("ProceduralDanceTag")
	if existingTag then existingTag:Destroy() end

	local tag = Instance.new("BoolValue")
	tag.Name = "ProceduralDanceTag"
	tag.Parent = character

	local baseCF = hrp.CFrame
	local style = tostring(danceStyle or "bounce"):lower()

	task.spawn(function()
		local startTime = tick()
		while character and character.Parent and tag and tag.Parent do
			local t = tick() - startTime
			local offsetCFrame = CFrame.new()

			if style == "bounce" or style == "hype" or style == "phonk" or style == "funk" then
				local yOffset = math.abs(math.sin(t * 8)) * 0.45
				local tilt = math.sin(t * 8) * 0.12
				local rotY = math.sin(t * 4) * 0.15
				offsetCFrame = CFrame.new(0, yOffset, 0) * CFrame.Angles(0, rotY, tilt)
			elseif style == "shuffle" or style == "hiphop" then
				local xOffset = math.sin(t * 6) * 0.6
				local yOffset = math.abs(math.cos(t * 6)) * 0.3
				local rotY = math.sin(t * 6) * 0.2
				offsetCFrame = CFrame.new(xOffset, yOffset, 0) * CFrame.Angles(0, rotY, 0)
			elseif style == "wave" or style == "chill" then
				local rotZ = math.sin(t * 3.5) * 0.15
				local rotX = math.cos(t * 3.5) * 0.08
				local yOffset = math.sin(t * 3.5) * 0.15
				offsetCFrame = CFrame.new(0, yOffset, 0) * CFrame.Angles(rotX, 0, rotZ)
			else
				local yOffset = math.abs(math.sin(t * 7)) * 0.35
				local rotY = math.sin(t * 7) * 0.15
				offsetCFrame = CFrame.new(0, yOffset, 0) * CFrame.Angles(0, rotY, 0)
			end

			pcall(function()
				hrp.CFrame = baseCF * offsetCFrame
			end)
			task.wait(0.03)
		end
	end)
end

-- Play Dance Animation Engine
local function reportDanceStatus(playerId, robloxUsername, danceId, danceStyle, success, mode, message)
	pcall(function()
		local payload = HttpService:JSONEncode({
			playerId = playerId,
			robloxUsername = robloxUsername,
			danceId = danceId or "",
			danceStyle = danceStyle or "bounce",
			success = success and true or false,
			mode = mode or "pending",
			message = message or ""
		})
		HttpService:PostAsync(DANCE_STATUS_URL, payload, Enum.HttpContentType.ApplicationJson, false, { ["bypass-tunnel-reminder"] = "true" })
	end)
end

local function playDanceAnimation(character, animAssetId, danceStyle, playerId, robloxUsername)
	task.spawn(function()
		local humanoid = character:WaitForChild("Humanoid", 4)
		if not humanoid then
			reportDanceStatus(playerId, robloxUsername or character.Name, animAssetId, danceStyle, false, "failed", "Khong tim thay Humanoid de bat dau nhay.")
			return
		end

		pcall(function()
			humanoid.AutoRotate = false
			humanoid.WalkSpeed = 0
			humanoid.JumpPower = 0
			humanoid.JumpHeight = 0
		end)

		-- Destroy default Animate script from avatar to prevent animation conflicts
		local defaultAnimate = character:FindFirstChild("Animate")
		if defaultAnimate then pcall(function() defaultAnimate:Destroy() end) end

		-- Ensure HRP is NOT anchored so Roblox Animator can move limbs
		local hrp = character:FindFirstChild("HumanoidRootPart") or character.PrimaryPart
		if hrp then
			hrp.Anchored = false
			pcall(function() hrp:SetNetworkOwner(nil) end)
		end

		local animator = humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator", humanoid)

		-- Stop playing old dance tracks
		pcall(function()
			for _, oldTrack in ipairs(animator:GetPlayingAnimationTracks()) do
				oldTrack:Stop(0.1)
			end
		end)

		-- FIX: dừng ngay vòng lặp ProceduralDance cũ (nếu có) của nhân vật này để nó
		-- không tiếp tục ghi đè Motor6D trong lúc ta thử phát animation thật bên dưới.
		if ProceduralDance then
			pcall(function() ProceduralDance.StopDance(character) end)
		end
		local oldProcTag = character:FindFirstChild("ProceduralDanceTag")
		if oldProcTag then pcall(function() oldProcTag:Destroy() end) end

		task.wait(0.15)

		local rawIdStr = tostring(animAssetId or ""):gsub("rbxassetid://", ""):match("^%s*(.-)%s*$")
		local rawIdNum = tonumber(rawIdStr)
		local resolvedAnimId = nil

		-- 1. Try InsertService to resolve Marketplace Catalog Emote Item IDs to internal Animation Track
		if rawIdNum and rawIdNum > 0 then
			pcall(function()
				local loadedAsset = game:GetService("InsertService"):LoadAsset(rawIdNum)
				if loadedAsset then
					local innerAnim = loadedAsset:FindFirstChildOfClass("Animation", true)
					if innerAnim and innerAnim.AnimationId and innerAnim.AnimationId ~= "" then
						resolvedAnimId = innerAnim.AnimationId
					end
					pcall(function() loadedAsset:Destroy() end)
				end
			end)
		end

		if not resolvedAnimId and rawIdStr ~= "" then
			resolvedAnimId = "rbxassetid://" .. rawIdStr
		end

		local animPlayedSuccessfully = false
		local verifiedDanceId = animAssetId or ""

		-- Step 1: Ưu tiên Animation/KeyframeSequence do BẠN tự đặt trong ReplicatedStorage.
		-- FIX: chỉ quét ReplicatedStorage:GetDescendants() thay vì game:GetDescendants()
		-- (toàn bộ game) -- nhanh hơn nhiều và không match nhầm object ở chỗ khác.
		local KeyframeSequenceProvider = game:GetService("KeyframeSequenceProvider")
		pcall(function()
			for _, desc in ipairs(ReplicatedStorage:GetDescendants()) do
				if animPlayedSuccessfully then break end
				if desc:IsA("Animation") or desc:IsA("KeyframeSequence") then
					local animToLoad = desc
					local animId = desc:IsA("Animation") and (desc.AnimationId or "") or ""

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

					local success, track = pcall(function() return animator:LoadAnimation(animToLoad) end)
					if success and track then
						track.Priority = Enum.AnimationPriority.Action4
						track.Looped = true
						track:Play(0.15, 1, 1)
						task.wait(0.2)
						if track.IsPlaying then
							animPlayedSuccessfully = true
							verifiedDanceId = animId ~= "" and animId or desc.Name
							print(string.format("[TikTokDanceManager] 💃 Playing CUSTOM %s [%s] from ReplicatedStorage for %s!", desc.ClassName, desc.Name, character.Name))
							reportDanceStatus(playerId, robloxUsername or character.Name, verifiedDanceId, danceStyle, true, "asset", "Custom Animation trong ReplicatedStorage da chay.")
						else
							pcall(function() track:Stop(0) end)
						end
					end
				end
			end
		end)

		-- Step 2: Try playing the requested Animation Asset ID directly (dashboard/EulerStream selection)
		if not animPlayedSuccessfully and resolvedAnimId and resolvedAnimId ~= "" and resolvedAnimId ~= "rbxassetid://" then
			print(string.format("[TikTokDanceManager] Attempting to load Animation Asset ID [%s] for %s...", resolvedAnimId, character.Name))
			local anim = Instance.new("Animation")
			anim.AnimationId = resolvedAnimId
			local success, track = pcall(function() return animator:LoadAnimation(anim) end)
			if success and track then
				local playOk = pcall(function()
					track.Priority = Enum.AnimationPriority.Action4
					track.Looped = true
					track:Play(0.15, 1, 1)
				end)
				if playOk then
					task.wait(0.25)
					if track.IsPlaying then
						animPlayedSuccessfully = true
						verifiedDanceId = resolvedAnimId
						print(string.format("[TikTokDanceManager] 💃 Successfully playing custom dance track [%s] for %s!", resolvedAnimId, character.Name))
						reportDanceStatus(playerId, robloxUsername or character.Name, resolvedAnimId, danceStyle, true, "asset", "Animation track loaded and playing.")
					else
						print(string.format("[TikTokDanceManager] ⚠️ Animation [%s] IsPlaying is false (Roblox Asset Ownership or Security Check failed).", resolvedAnimId))
						pcall(function() track:Stop(0) end)
					end
				end
			else
				warn(string.format("[TikTokDanceManager] Failed to LoadAnimation for [%s]: %s", resolvedAnimId, tostring(track)))
			end
		end

		-- Step 3: Fallback catalog verified emotes
		if not animPlayedSuccessfully then
			globalDanceCounter = globalDanceCounter + 1
			local primaryEmoteIdx = ((globalDanceCounter - 1) % #ALL_VERIFIED_EMOTE_IDS) + 1
			local primaryEmoteId = "rbxassetid://" .. ALL_VERIFIED_EMOTE_IDS[primaryEmoteIdx]

			local anim = Instance.new("Animation")
			anim.AnimationId = primaryEmoteId
			local success, track = pcall(function() return animator:LoadAnimation(anim) end)
			if success and track then
				track.Priority = Enum.AnimationPriority.Action4
				track.Looped = true
				track:Play(0.15, 1, 1)
				task.wait(0.2)
				if track.IsPlaying then
					animPlayedSuccessfully = true
					verifiedDanceId = primaryEmoteId
					print(string.format("[TikTokDanceManager] Playing fallback emote [%s] for %s", primaryEmoteId, character.Name))
					reportDanceStatus(playerId, robloxUsername or character.Name, primaryEmoteId, danceStyle, true, "asset", "Fallback catalog emote playing.")
				else
					pcall(function() track:Stop(0) end)
				end
			end
		end

		-- 2. FIX: chỉ bật ProceduralDance Motor6D khi CẢ 3 bước trên đều không phát được gì.
		-- Trước đây khối này chạy vô điều kiện nên nó luôn đè lên animation thật vừa phát ở Step 1/2/3.
		if not animPlayedSuccessfully then
			print(string.format("[TikTokDanceManager] 💃 Khong co animation nao phat duoc, kich hoat ProceduralDance Motor6D cho %s (Style: %s)", character.Name, tostring(danceStyle or "hype")))
			if ProceduralDance then
				pcall(function()
					ProceduralDance.StartDance(character, danceStyle or "hype")
				end)
			else
				startProceduralDance(character, danceStyle or "hype")
			end
			task.wait(0.15)
			reportDanceStatus(playerId, robloxUsername or character.Name, verifiedDanceId, danceStyle, true, "procedural", "Khong co animation asset nao chay duoc, da fallback sang procedural dance.")
		end
	end)
end

-- Spawn Player Avatar on Stage
local function spawnDancer(playerId, robloxUsername, tiktokUsername, animationId, isVIP, giftDetails, customTitle, customColor, danceStyle)
	print(string.format("[TikTokDanceManager] Spawning avatar for TikTok: @%s (Roblox: %s)", tostring(tiktokUsername), tostring(robloxUsername)))

	local getUserIdSuccess, userId = pcall(function() return Players:GetUserIdFromNameAsync(robloxUsername) end)
	if not getUserIdSuccess or not userId or userId <= 0 then userId = 1 end

	local characterModel = nil
	local humDescSuccess, humDesc = pcall(function()
		return Players:GetHumanoidDescriptionFromUserIdAsync(userId)
	end)

	if humDescSuccess and humDesc then
		pcall(function()
			characterModel = Players:CreateHumanoidModelFromDescription(humDesc, Enum.HumanoidRigType.R15)
		end)
	end

	if not characterModel then
		pcall(function()
			characterModel = Players:CreateHumanoidModelFromUserIdAsync(userId)
		end)
	end
	if not characterModel then
		-- Fallback to creating a standard Rig/Dummy if Roblox API request fails
		characterModel = Instance.new("Model")
		characterModel.Name = robloxUsername

		local hum = Instance.new("Humanoid")
		hum.Parent = characterModel

		local hrp = Instance.new("Part")
		hrp.Name = "HumanoidRootPart"
		hrp.Size = Vector3.new(2, 2, 1)
		hrp.Transparency = 1
		hrp.CanCollide = false
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

	-- Anchor HumanoidRootPart to keep character standing firmly on stage floor
	local hrp = characterModel:FindFirstChild("HumanoidRootPart") or characterModel.PrimaryPart
	if hrp then
		hrp.Anchored = true
	end

	-- Disable default Roblox idle Animate script to prevent animation overrides
	pcall(function()
		local animScript = characterModel:FindFirstChild("Animate")
		if animScript then
			animScript.Disabled = true
		end
	end)

	table.insert(activeDancersList, {
		model = characterModel,
		robloxUsername = robloxUsername,
		tiktokUsername = tiktokUsername,
		isVIP = isVIP,
		spawnTime = tick()
	})

	createNametag(characterModel, tiktokUsername, robloxUsername, isVIP)
	playDanceAnimation(characterModel, animationId, danceStyle, playerId, robloxUsername)

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
						data.player.id,
						data.player.robloxUsername,
						data.player.tiktokUsername,
						(data.player.animationId and data.player.animationId ~= "") and data.player.animationId or (data.selectedDanceId or "rbxassetid://82137434664110"),
						data.player.isVIP,
						data.player.giftDetails,
						data.overlayTitle,
						data.overlayColor,
						data.player.danceStyle or data.selectedDanceStyle
					)
				elseif data.selectedDanceId and data.selectedDanceId ~= currentSelectedDanceId then
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