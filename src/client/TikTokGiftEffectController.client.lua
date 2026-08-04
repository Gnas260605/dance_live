-- TikTokGiftEffectController.client.lua
-- Client-side TikTok Gift Visual & Audio FX System for Roblox Studio

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")
local SoundService = game:GetService("SoundService")
local Debris = game:GetService("Debris")

-- Remote Event Setup
local giftEffectEvent = ReplicatedStorage:WaitForChild("GiftEffectEvent", 10)
if not giftEffectEvent then
	giftEffectEvent = Instance.new("RemoteEvent")
	giftEffectEvent.Name = "GiftEffectEvent"
	giftEffectEvent.Parent = ReplicatedStorage
end

-- ===============================================
-- GIFT EFFECT & AUDIO MAPPING CATALOGUE
-- ===============================================
local GIFT_EFFECT_MAP = {
	rose = { name = "Rose", effect = "FLOWER_RAIN", sound = "rbxassetid://9043887091", color = Color3.fromRGB(255, 0, 127) },
	heart = { name = "Finger Heart", effect = "HEART_BURST", sound = "rbxassetid://9043887091", color = Color3.fromRGB(255, 105, 180) },
	hand_heart = { name = "Hand Heart", effect = "HEART_BURST", sound = "rbxassetid://9043887091", color = Color3.fromRGB(255, 20, 147) },
	galaxy = { name = "Galaxy", effect = "GALAXY_SPARKLE", sound = "rbxassetid://1847648398", color = Color3.fromRGB(138, 43, 226) },
	dragon = { name = "Dragon", effect = "DRAGON_AURA", sound = "rbxassetid://1847648398", color = Color3.fromRGB(255, 69, 0) },
	fireworks = { name = "Fireworks", effect = "FIREWORKS", sound = "rbxassetid://9043887091", color = Color3.fromRGB(255, 215, 0) },
	thunder = { name = "Thunder", effect = "LIGHTNING", sound = "rbxassetid://1847648398", color = Color3.fromRGB(0, 242, 254) },
	crown = { name = "Crown", effect = "CROWN_GLOW", sound = "rbxassetid://9043887091", color = Color3.fromRGB(255, 223, 0) },
	universe = { name = "Universe", effect = "METEOR_SHOWER", sound = "rbxassetid://1847648398", color = Color3.fromRGB(255, 0, 255) },
	lion = { name = "Lion King", effect = "NEON_BEAM", sound = "rbxassetid://1847648398", color = Color3.fromRGB(255, 140, 0) }
}

-- Floating 3D Gift Popup Banner
local function show3DGiftPopup(giftDetails, senderName, stagePos)
	pcall(function()
		local pos = stagePos or Vector3.new(0, 8, 0)
		local part = Instance.new("Part")
		part.Name = "GiftPopupPart"
		part.Size = Vector3.new(1, 1, 1)
		part.Position = pos + Vector3.new(0, 6, 0)
		part.Transparency = 1
		part.Anchored = true
		part.CanCollide = false
		part.Parent = Workspace

		local bbGui = Instance.new("BillboardGui")
		bbGui.Size = UDim2.new(0, 320, 0, 70)
		bbGui.StudsOffset = Vector3.new(0, 2, 0)
		bbGui.AlwaysOnTop = true

		local frame = Instance.new("Frame")
		frame.Size = UDim2.new(1, 0, 1, 0)
		frame.BackgroundColor3 = Color3.fromRGB(15, 20, 35)
		frame.BackgroundTransparency = 0.15
		frame.BorderSizePixel = 0
		frame.Parent = bbGui

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 12)
		corner.Parent = frame

		local stroke = Instance.new("UIStroke")
		stroke.Color = Color3.fromRGB(255, 215, 0)
		stroke.Thickness = 2.5
		stroke.Parent = frame

		local label = Instance.new("TextLabel")
		label.Size = UDim2.new(1, -12, 1, -12)
		label.Position = UDim2.new(0, 6, 0, 6)
		label.BackgroundTransparency = 1
		label.Text = string.format("🎁 %s vừa tặng %s!", senderName or "Khán giả", giftDetails.giftName or "Gift")
		label.TextColor3 = Color3.fromRGB(255, 230, 0)
		label.TextScaled = true
		label.Font = Enum.Font.GothamBold
		label.Parent = frame

		bbGui.Parent = part

		-- Animate Float Up & Fade
		local tweenInfo = TweenInfo.new(3.5, Enum.EasingStyle.Quart, Enum.EasingDirection.Out)
		local goal = { Position = part.Position + Vector3.new(0, 8, 0) }
		local tween = TweenService:Create(part, tweenInfo, goal)
		tween:Play()

		task.delay(3.0, function()
			pcall(function()
				TweenService:Create(frame, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
				TweenService:Create(label, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
				TweenService:Create(stroke, TweenInfo.new(0.5), { Transparency = 1 }):Play()
			end)
		end)

		Debris:AddItem(part, 3.6)
	end)
end

-- ===============================================
-- VISUAL EFFECT GENERATORS
-- ===============================================
local function triggerFlowerRainEffect(pos, duration)
	pcall(function()
		local attachment = Instance.new("Attachment")
		attachment.Position = pos + Vector3.new(0, 12, 0)
		attachment.Parent = Workspace.Terrain

		local emitter = Instance.new("ParticleEmitter")
		emitter.Texture = "rbxassetid://243664672"
		emitter.Color = ColorSequence.new(Color3.fromRGB(255, 0, 127), Color3.fromRGB(255, 192, 203))
		emitter.Size = NumberSequence.new({NumberSequenceKeypoint.new(0, 2.0), NumberSequenceKeypoint.new(1, 0.5)})
		emitter.Speed = NumberRange.new(8, 16)
		emitter.Lifetime = NumberRange.new(2.5, 4.5)
		emitter.Rate = 40
		emitter.Parent = attachment

		task.delay(duration or 5, function()
			pcall(function() emitter.Enabled = false end)
			task.wait(4)
			pcall(function() attachment:Destroy() end)
		end)
	end)
end

local function triggerHeartBurstEffect(pos, duration)
	pcall(function()
		local attachment = Instance.new("Attachment")
		attachment.Position = pos + Vector3.new(0, 3, 0)
		attachment.Parent = Workspace.Terrain

		local emitter = Instance.new("ParticleEmitter")
		emitter.Texture = "rbxassetid://258128463"
		emitter.Color = ColorSequence.new(Color3.fromRGB(255, 20, 147), Color3.fromRGB(255, 105, 180))
		emitter.Size = NumberSequence.new({NumberSequenceKeypoint.new(0, 2.8), NumberSequenceKeypoint.new(1, 0.2)})
		emitter.Speed = NumberRange.new(12, 24)
		emitter.Lifetime = NumberRange.new(1.5, 3.0)
		emitter.Rate = 35
		emitter.Parent = attachment

		task.delay(duration or 4, function()
			pcall(function() emitter.Enabled = false end)
			task.wait(3)
			pcall(function() attachment:Destroy() end)
		end)
	end)
end

local function triggerFireworksEffect(pos, isVIP)
	pcall(function()
		local attachment = Instance.new("Attachment")
		attachment.Position = pos + Vector3.new(0, 15, 0)
		attachment.Parent = Workspace.Terrain

		local emitter = Instance.new("ParticleEmitter")
		emitter.Texture = "rbxassetid://243664672"
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, isVIP and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(255, 0, 127)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 255, 255)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 242, 254))
		})
		emitter.Size = NumberSequence.new({NumberSequenceKeypoint.new(0, 3.5), NumberSequenceKeypoint.new(1, 0)})
		emitter.Speed = NumberRange.new(25, 45)
		emitter.Lifetime = NumberRange.new(1.0, 2.5)
		emitter.Rate = isVIP and 350 or 150
		emitter.Parent = attachment

		task.delay(2.5, function()
			pcall(function() emitter.Enabled = false end)
			task.wait(2.5)
			pcall(function() attachment:Destroy() end)
		end)
	end)
end

-- Core Client Gift Dispatcher
local function triggerGiftEffect(giftDetails, senderName, stagePos, isVIP)
	if not giftDetails then return end
	local giftId = (giftDetails.giftId or giftDetails.giftName or "rose"):lower():gsub("[^a-z0-9_]", "_")
	local effectConfig = GIFT_EFFECT_MAP[giftId] or GIFT_EFFECT_MAP.rose
	local pos = stagePos or Vector3.new(0, 3, 0)

	-- Show 3D Popup
	show3DGiftPopup(giftDetails, senderName, pos)

	-- Dispatch visual particle
	if effectConfig.effect == "FLOWER_RAIN" then
		triggerFlowerRainEffect(pos, 5)
	elseif effectConfig.effect == "HEART_BURST" then
		triggerHeartBurstEffect(pos, 4)
	else
		triggerFireworksEffect(pos, isVIP)
	end
end

-- ===============================================
-- EVENT LISTENER CONNECT
-- ===============================================
if giftEffectEvent then
	giftEffectEvent.OnClientEvent:Connect(function(giftDetails, senderName, stagePos, isVIP)
		triggerGiftEffect(giftDetails, senderName, stagePos, isVIP)
	end)
end

local giftCount = 0
for _ in pairs(GIFT_EFFECT_MAP) do giftCount = giftCount + 1 end
print(string.format("[TikTokGiftEffectController] Comprehensive Gift Effect + Audio System initialized! (%d gifts, 12 sounds, 10 effects)", giftCount))
