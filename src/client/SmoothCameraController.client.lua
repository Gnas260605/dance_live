-- SmoothCameraController.client.lua
-- Client script for TikTok Live Spectator Camera, Guaranteed Audio Playback & Stream Overlay HUD

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")

local LocalPlayer = Players.LocalPlayer
local Camera = Workspace.CurrentCamera

-- List of verified open Roblox official audio IDs
local AUDIO_FALLBACKS = {
	"rbxassetid://1837879082",
	"rbxassetid://1847648398",
	"rbxassetid://9043887091",
	"rbxassetid://1837871234"
}

-- Client-side Local Audio Engine (Guarantees loud music playback on local client device)
local localMusic = SoundService:FindFirstChild("ClientStageMusic")
if not localMusic then
	localMusic = Instance.new("Sound")
	localMusic.Name = "ClientStageMusic"
	localMusic.SoundId = AUDIO_FALLBACKS[1]
	localMusic.Volume = 1.0
	localMusic.Looped = true
	localMusic.Parent = SoundService
end

local function ensureMusicPlaying(targetSoundId)
	pcall(function()
		if targetSoundId and targetSoundId ~= "" then
			if localMusic.SoundId ~= targetSoundId then
				localMusic:Stop()
				localMusic.SoundId = targetSoundId
			end
		end
		localMusic.Volume = 1.0
		localMusic.Looped = true
		if not localMusic.IsPlaying then
			localMusic:Play()
		end
	end)
end

-- Try playing audio immediately
task.spawn(function()
	task.wait(0.5)
	ensureMusicPlaying()
	
	-- Fallback loop if sound failed to load
	task.wait(2)
	if not localMusic.IsPlaying then
		for _, altAudioId in ipairs(AUDIO_FALLBACKS) do
			if not localMusic.IsPlaying then
				ensureMusicPlaying(altAudioId)
				task.wait(1)
			end
		end
	end
end)

-- Helper to safely get position of a stage whether it's a Model or Part
local function getStageCenter(stg)
	if not stg then return Vector3.new(0, 6, -3) end
	local pos = Vector3.new(0, 1.5, 0)
	if stg:IsA("Model") then
		pos = stg:GetPivot().Position
	elseif stg:IsA("BasePart") then
		pos = stg.Position
	end
	return pos + Vector3.new(0, 4, 2)
end

-- Camera state tracking
local currentTargetModel = nil
local focusTimer = 0
local swayTimer = 0

local function startDynamicTrackingCamera()
	RunService.RenderStepped:Connect(function(dt)
		pcall(function()
			Camera.CameraType = Enum.CameraType.Scriptable
			swayTimer = swayTimer + dt * 0.45
			local orbitAngle = math.rad(math.sin(swayTimer * 0.2) * 22)

			local stage = Workspace:FindFirstChild("KPopStage") or Workspace:FindFirstChild("DanceStage")
			local stageCenter = getStageCenter(stage)

			local cameraPos, targetFocus

			if currentTargetModel and currentTargetModel.Parent then
				focusTimer = focusTimer + dt
				local hrp = currentTargetModel:FindFirstChild("HumanoidRootPart") or currentTargetModel.PrimaryPart

				if hrp and focusTimer < 9 then
					-- Close-up spotlight view on active commenter
					local targetPos = hrp.Position
					local offset = Vector3.new(
						math.sin(swayTimer) * 4.5,
						2.2 + math.cos(swayTimer * 0.8) * 0.4,
						12 + math.sin(swayTimer * 0.5) * 1.5
					)
					cameraPos = targetPos + offset
					targetFocus = targetPos + Vector3.new(0, 1.2, 0)
				else
					-- Reset to wide stage shot after 9 seconds
					currentTargetModel = nil
				end
			end

			if not currentTargetModel then
				-- Wide stage overview shot
				local radius = 32
				cameraPos = stageCenter + Vector3.new(
					math.sin(orbitAngle) * radius,
					6 + math.sin(swayTimer * 0.5) * 1.5,
					radius
				)
				targetFocus = stageCenter
			end

			local targetCFrame = CFrame.new(cameraPos, targetFocus)
			Camera.CFrame = Camera.CFrame:Lerp(targetCFrame, math.clamp(dt * 2.8, 0, 1))
		end)
	end)
end

-- ====================================
-- HUD SETUP
-- ====================================
local infoLabel, bannerStroke, titleLabel

local function setupHUD()
	pcall(function()
		local playerGui = LocalPlayer:WaitForChild("PlayerGui")
		local screenGui = Instance.new("ScreenGui")
		screenGui.Name = "TikTokDanceHUD"
		screenGui.ResetOnSpawn = false
		screenGui.IgnoreGuiInset = true
		screenGui.Parent = playerGui

		-- Top main banner
		local topBanner = Instance.new("Frame")
		topBanner.Name = "Banner"
		topBanner.Size = UDim2.new(0, 540, 0, 72)
		topBanner.Position = UDim2.new(0.5, -270, 0, 15)
		topBanner.BackgroundColor3 = Color3.fromRGB(12, 14, 24)
		topBanner.BackgroundTransparency = 0.15
		topBanner.BorderSizePixel = 0
		topBanner.Parent = screenGui

		local bannerCorner = Instance.new("UICorner")
		bannerCorner.CornerRadius = UDim.new(0, 14)
		bannerCorner.Parent = topBanner

		bannerStroke = Instance.new("UIStroke")
		bannerStroke.Color = Color3.fromRGB(255, 0, 127)
		bannerStroke.Thickness = 2
		bannerStroke.Parent = topBanner

		titleLabel = Instance.new("TextLabel")
		titleLabel.Size = UDim2.new(1, -20, 0.4, 0)
		titleLabel.Position = UDim2.new(0, 10, 0.08, 0)
		titleLabel.BackgroundTransparency = 1
		titleLabel.Text = "🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵"
		titleLabel.TextColor3 = Color3.fromRGB(255, 230, 0)
		titleLabel.TextScaled = true
		titleLabel.Font = Enum.Font.GothamBold
		titleLabel.Parent = topBanner

		infoLabel = Instance.new("TextLabel")
		infoLabel.Size = UDim2.new(1, -20, 0.45, 0)
		infoLabel.Position = UDim2.new(0, 10, 0.48, 0)
		infoLabel.BackgroundTransparency = 1
		infoLabel.Text = "Comment tên Roblox của bạn để lên sàn nhảy (12s)..."
		infoLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
		infoLabel.TextScaled = true
		infoLabel.Font = Enum.Font.GothamMedium
		infoLabel.Parent = topBanner

		-- Bottom hint bar
		local bottomBar = Instance.new("Frame")
		bottomBar.Size = UDim2.new(0, 380, 0, 34)
		bottomBar.Position = UDim2.new(0.5, -190, 1, -45)
		bottomBar.BackgroundColor3 = Color3.fromRGB(12, 14, 24)
		bottomBar.BackgroundTransparency = 0.3
		bottomBar.BorderSizePixel = 0
		bottomBar.Parent = screenGui

		local bottomCorner = Instance.new("UICorner")
		bottomCorner.CornerRadius = UDim.new(0, 8)
		bottomCorner.Parent = bottomBar

		local bottomLabel = Instance.new("TextLabel")
		bottomLabel.Size = UDim2.new(1, -10, 1, 0)
		bottomLabel.Position = UDim2.new(0, 5, 0, 0)
		bottomLabel.BackgroundTransparency = 1
		bottomLabel.Text = "🔥 Comment tên Roblox trên TikTok Live để quẩy ngay!"
		bottomLabel.TextColor3 = Color3.fromRGB(0, 242, 254)
		bottomLabel.TextScaled = true
		bottomLabel.Font = Enum.Font.GothamBold
		bottomLabel.Parent = bottomBar
	end)
end

-- Listen to FocusPlayerEvent from Server
local focusEvent = ReplicatedStorage:WaitForChild("FocusPlayerEvent", 10)
if focusEvent then
	focusEvent.OnClientEvent:Connect(function(targetModel, tiktokUsername, robloxUsername, dancerIndex, isVIP, customTitle, customColor)
		pcall(function()
			if targetModel then
				currentTargetModel = targetModel
				focusTimer = 0
			end

			-- Ensure client music is playing
			ensureMusicPlaying()

			if customTitle and titleLabel then
				titleLabel.Text = tostring(customTitle)
			end

			if infoLabel and tiktokUsername and robloxUsername then
				local prefix = isVIP and "👑 VIP GIFT DANCER: @" or "💃 Đang nhảy: @"
				infoLabel.Text = prefix .. tostring(tiktokUsername) .. " (" .. tostring(robloxUsername) .. ")"
			end

			if bannerStroke then
				local strokeColor = isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 0, 127)
				if customColor and not isVIP then
					strokeColor = Color3.fromHex(customColor) or Color3.fromRGB(255, 0, 127)
				end
				TweenService:Create(bannerStroke, TweenInfo.new(0.4), { Color = strokeColor }):Play()
			end
		end)
	end)
end

-- Start camera and HUD
task.spawn(setupHUD)
task.wait(0.5)
startDynamicTrackingCamera()
