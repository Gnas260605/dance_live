-- TikTokGiftEffectController.client.lua
-- TikTok Live-style Gift Visual & Audio Effects (client-side)
-- Comprehensive system covering all major TikTok Live gift types
-- Each gift has unique visual effect + unique sound effect

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local SoundService = game:GetService("SoundService")

local LocalPlayer = Players.LocalPlayer

-- ====================================
-- SOUND SYSTEM: Preloaded Sound Assets
-- ====================================
local SOUND_IDS = {
	sparkle = "rbxassetid://4612374036",   -- bling diamond pickup (hearts, flowers, beauty)
	firework = "rbxassetid://134947109312227", -- firework explosion
	fanfare = "rbxassetid://1844604574",     -- trumpet fanfare (VIP, crown, royalty)
	applause = "rbxassetid://9114682955",    -- group clapping applause (performance, TikTok)
	coin = "rbxassetid://4612375051",        -- coin pickup (tips, coins, small gifts)
	whoosh = "rbxassetid://9126229255",      -- whoosh swoosh (dynamic, speed, animals)
	bubble = "rbxassetid://132948338000932",  -- bubble pop (ice cream, bubbles, fun)
	drumroll = "rbxassetid://4718483268",    -- drum roll (drama, suspense, big reveal)
	roar = "rbxassetid://9116302323",        -- lion roar (lion, wild animals, powerful)
	ding = "rbxassetid://389388827",         -- message ding (notifications, stars)
	bling2 = "rbxassetid://4612374495",      -- bling diamond 2 (cosmic, galaxy, premium)
	bling3 = "rbxassetid://4612374209",      -- bling diamond 3 (candy, sweet, cake)
}

-- Preload all sounds into SoundService (shared, reused)
local preloadedSounds = {}
for name, soundId in pairs(SOUND_IDS) do
	local snd = Instance.new("Sound")
	snd.Name = "GiftSFX_" .. name
	snd.SoundId = soundId
	snd.Volume = 0.8
	snd.Parent = SoundService
	preloadedSounds[name] = snd
end

-- Play a sound by category name with optional volume override
local function playGiftSound(soundKey, volume)
	local snd = preloadedSounds[soundKey]
	if snd then
		pcall(function()
			local playInst = snd:Clone()
			playInst.Volume = volume or 0.8
			playInst.Parent = SoundService
			playInst:Play()
			task.delay(playInst.TimeLength + 0.5, function()
				pcall(function() playInst:Destroy() end)
			end)
		end)
	end
end

-- ====================================
-- GIFT TYPE CONFIGURATION (COMPREHENSIVE)
-- ====================================
-- Every TikTok Live gift mapped to: emoji, unique visual effect, color, count, and unique sound
local GIFT_EFFECT_MAP = {
	-- ======================== HEARTS / LOVE ========================
	["heart"] = { emoji = "\u{2764}\u{FE0F}", effect = "floatUp", color = Color3.fromRGB(255, 50, 80), count = 30, sound = "sparkle" },
	["tim"] = { emoji = "\u{2764}\u{FE0F}", effect = "floatUp", color = Color3.fromRGB(255, 50, 80), count = 30, sound = "sparkle" },
	["love"] = { emoji = "\u{2764}\u{FE0F}", effect = "floatUp", color = Color3.fromRGB(255, 50, 80), count = 35, sound = "sparkle" },
	["finger heart"] = { emoji = "\u{1F910}", effect = "floatUp", color = Color3.fromRGB(255, 80, 120), count = 25, sound = "sparkle" },
	["hand heart"] = { emoji = "\u{1F91F}", effect = "floatUp", color = Color3.fromRGB(255, 100, 140), count = 28, sound = "sparkle" },
	["hand hearts"] = { emoji = "\u{1F91F}", effect = "floatUp", color = Color3.fromRGB(255, 100, 140), count = 30, sound = "sparkle" },
	["love you"] = { emoji = "\u{1F495}", effect = "floatUp", color = Color3.fromRGB(255, 60, 100), count = 35, sound = "sparkle" },

	-- ======================== ROSES / FLOWERS ========================
	["rose"] = { emoji = "\u{1F339}", effect = "rainDown", color = Color3.fromRGB(255, 0, 100), count = 40, sound = "sparkle" },
	["hoa hong"] = { emoji = "\u{1F339}", effect = "rainDown", color = Color3.fromRGB(255, 0, 100), count = 40, sound = "sparkle" },
	["flower"] = { emoji = "\u{1F33A}", effect = "floatUp", color = Color3.fromRGB(255, 100, 200), count = 30, sound = "sparkle" },
	["hoa"] = { emoji = "\u{1F33A}", effect = "floatUp", color = Color3.fromRGB(255, 100, 200), count = 30, sound = "sparkle" },
	["sunflower"] = { emoji = "\u{1F33B}", effect = "floatUp", color = Color3.fromRGB(255, 200, 0), count = 25, sound = "sparkle" },
	["huong duong"] = { emoji = "\u{1F33B}", effect = "floatUp", color = Color3.fromRGB(255, 200, 0), count = 25, sound = "sparkle" },
	["tulip"] = { emoji = "\u{1F337}", effect = "floatUp", color = Color3.fromRGB(255, 150, 200), count = 25, sound = "sparkle" },
	["cherry blossom"] = { emoji = "\u{1F338}", effect = "rainDown", color = Color3.fromRGB(255, 180, 220), count = 35, sound = "sparkle" },

	-- ======================== STARS / SHINY ========================
	["star"] = { emoji = "\u{2B50}", effect = "floatUp", color = Color3.fromRGB(255, 215, 0), count = 25, sound = "ding" },
	["sao"] = { emoji = "\u{2B50}", effect = "floatUp", color = Color3.fromRGB(255, 215, 0), count = 25, sound = "ding" },
	["shooting star"] = { emoji = "\u{1F320}", effect = "burst", color = Color3.fromRGB(255, 220, 100), count = 20, sound = "ding" },
	["sparkle"] = { emoji = "\u{2728}", effect = "floatUp", color = Color3.fromRGB(255, 240, 200), count = 40, sound = "sparkle" },
	["diamond"] = { emoji = "\u{1F48E}", effect = "burst", color = Color3.fromRGB(100, 220, 255), count = 25, sound = "bling2" },
	["kim cuong"] = { emoji = "\u{1F48E}", effect = "burst", color = Color3.fromRGB(100, 220, 255), count = 25, sound = "bling2" },

	-- ======================== FIREWORKS / EXPLOSIONS ========================
	["firework"] = { emoji = "\u{1F386}", effect = "firework", color = Color3.fromRGB(255, 200, 0), count = 8, sound = "firework" },
	["fireworks"] = { emoji = "\u{1F386}", effect = "firework", color = Color3.fromRGB(255, 200, 0), count = 8, sound = "firework" },
	["phao hoa"] = { emoji = "\u{1F386}", effect = "firework", color = Color3.fromRGB(255, 200, 0), count = 8, sound = "firework" },

	-- ======================== GALAXY / COSMIC / SPACE ========================
	["galaxy"] = { emoji = "\u{1F30C}", effect = "orbit", color = Color3.fromRGB(100, 100, 255), count = 12, sound = "bling2" },
	["thien ha"] = { emoji = "\u{1F30C}", effect = "orbit", color = Color3.fromRGB(100, 100, 255), count = 12, sound = "bling2" },
	["planet"] = { emoji = "\u{1FA90}", effect = "orbit", color = Color3.fromRGB(120, 80, 200), count = 10, sound = "bling2" },
	["hanh tinh"] = { emoji = "\u{1FA90}", effect = "orbit", color = Color3.fromRGB(120, 80, 200), count = 10, sound = "bling2" },
	["moon"] = { emoji = "\u{1F319}", effect = "floatUp", color = Color3.fromRGB(200, 200, 255), count = 20, sound = "ding" },
	["meteor"] = { emoji = "\u{2604}\u{FE0F}", effect = "burst", color = Color3.fromRGB(255, 150, 50), count = 15, sound = "whoosh" },
	["rocket"] = { emoji = "\u{1F680}", effect = "spiral", color = Color3.fromRGB(255, 100, 50), count = 20, sound = "whoosh" },
	["ten lua"] = { emoji = "\u{1F680}", effect = "spiral", color = Color3.fromRGB(255, 100, 50), count = 20, sound = "whoosh" },

	-- ======================== CONFETTI / PARTY / TIKTOK ========================
	["confetti"] = { emoji = "\u{1F389}", effect = "confetti", color = Color3.fromRGB(0, 242, 254), count = 200, sound = "applause" },
	["tiktok"] = { emoji = "\u{1F3B5}", effect = "confetti", color = Color3.fromRGB(0, 242, 254), count = 200, sound = "applause" },
	["party"] = { emoji = "\u{1F389}", effect = "confetti", color = Color3.fromRGB(255, 100, 200), count = 150, sound = "applause" },
	["party popper"] = { emoji = "\u{1F389}", effect = "burst", color = Color3.fromRGB(255, 150, 50), count = 30, sound = "firework" },
	["celebration"] = { emoji = "\u{1F389}", effect = "confetti", color = Color3.fromRGB(255, 215, 0), count = 180, sound = "applause" },
	["gg"] = { emoji = "\u{1F3C6}", effect = "confetti", color = Color3.fromRGB(255, 215, 0), count = 100, sound = "applause" },
	["good game"] = { emoji = "\u{1F3C6}", effect = "confetti", color = Color3.fromRGB(255, 215, 0), count = 100, sound = "applause" },

	-- ======================== PERFUME / BEAUTY / COSMETICS ========================
	["perfume"] = { emoji = "\u{1F4A7}", effect = "floatUp", color = Color3.fromRGB(255, 100, 200), count = 35, sound = "sparkle" },
	["nuoc hoa"] = { emoji = "\u{1F4A7}", effect = "floatUp", color = Color3.fromRGB(255, 100, 200), count = 35, sound = "sparkle" },
	["sun cream"] = { emoji = "\u{1F9F4}", effect = "floatUp", color = Color3.fromRGB(255, 200, 150), count = 25, sound = "bubble" },
	["sunscreen"] = { emoji = "\u{1F9F4}", effect = "floatUp", color = Color3.fromRGB(255, 200, 150), count = 25, sound = "bubble" },
	["cosmetics"] = { emoji = "\u{1F484}", effect = "floatUp", color = Color3.fromRGB(220, 100, 180), count = 25, sound = "sparkle" },
	["lipstick"] = { emoji = "\u{1F484}", effect = "floatUp", color = Color3.fromRGB(220, 100, 180), count = 25, sound = "sparkle" },

	-- ======================== ICE CREAM / SWEETS / FOOD ========================
	["ice cream"] = { emoji = "\u{1F366}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 25, sound = "bubble" },
	["kem"] = { emoji = "\u{1F366}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 25, sound = "bubble" },
	["donut"] = { emoji = "\u{1F369}", effect = "rainDown", color = Color3.fromRGB(255, 150, 200), count = 30, sound = "bubble" },
	["doughnut"] = { emoji = "\u{1F369}", effect = "rainDown", color = Color3.fromRGB(255, 150, 200), count = 30, sound = "bubble" },
	["cake"] = { emoji = "\u{1F382}", effect = "floatUp", color = Color3.fromRGB(255, 180, 100), count = 25, sound = "bling3" },
	["banh"] = { emoji = "\u{1F382}", effect = "floatUp", color = Color3.fromRGB(255, 180, 100), count = 25, sound = "bling3" },
	["candy"] = { emoji = "\u{1F36C}", effect = "rainDown", color = Color3.fromRGB(255, 100, 200), count = 30, sound = "bling3" },
	["keo"] = { emoji = "\u{1F36C}", effect = "rainDown", color = Color3.fromRGB(255, 100, 200), count = 30, sound = "bling3" },
	["chocolate"] = { emoji = "\u{1F36B}", effect = "rainDown", color = Color3.fromRGB(180, 100, 60), count = 30, sound = "bling3" },
	["pizza"] = { emoji = "\u{1F355}", effect = "rainDown", color = Color3.fromRGB(255, 180, 50), count = 25, sound = "coin" },
	["burger"] = { emoji = "\u{1F354}", effect = "rainDown", color = Color3.fromRGB(255, 150, 50), count = 25, sound = "coin" },
	["coffee"] = { emoji = "\u{2615}", effect = "floatUp", color = Color3.fromRGB(180, 120, 60), count = 25, sound = "bubble" },
	["ca phe"] = { emoji = "\u{2615}", effect = "floatUp", color = Color3.fromRGB(180, 120, 60), count = 25, sound = "bubble" },

	-- ======================== ANIMALS ========================
	["lion"] = { emoji = "\u{1F981}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 60, sound = "roar" },
	["su tu"] = { emoji = "\u{1F981}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 60, sound = "roar" },
	["cat"] = { emoji = "\u{1F408}", effect = "floatUp", color = Color3.fromRGB(255, 150, 100), count = 25, sound = "whoosh" },
	["meo"] = { emoji = "\u{1F408}", effect = "floatUp", color = Color3.fromRGB(255, 150, 100), count = 25, sound = "whoosh" },
	["dog"] = { emoji = "\u{1F415}", effect = "floatUp", color = Color3.fromRGB(200, 150, 100), count = 25, sound = "whoosh" },
	["cho"] = { emoji = "\u{1F415}", effect = "floatUp", color = Color3.fromRGB(200, 150, 100), count = 25, sound = "whoosh" },
	["panda"] = { emoji = "\u{1F43C}", effect = "floatUp", color = Color3.fromRGB(200, 200, 200), count = 25, sound = "whoosh" },
	["tiger"] = { emoji = "\u{1F42F}", effect = "burst", color = Color3.fromRGB(255, 150, 0), count = 25, sound = "roar" },
	["ho"] = { emoji = "\u{1F42F}", effect = "burst", color = Color3.fromRGB(255, 150, 0), count = 25, sound = "roar" },
	["dragon"] = { emoji = "\u{1F409}", effect = "spiral", color = Color3.fromRGB(100, 200, 100), count = 30, sound = "roar" },
	["rong"] = { emoji = "\u{1F409}", effect = "spiral", color = Color3.fromRGB(100, 200, 100), count = 30, sound = "roar" },
	["unicorn"] = { emoji = "\u{1F984}", effect = "rainbow", color = Color3.fromRGB(255, 100, 255), count = 40, sound = "sparkle" },
	["ky lan"] = { emoji = "\u{1F984}", effect = "rainbow", color = Color3.fromRGB(255, 100, 255), count = 40, sound = "sparkle" },
	["bird"] = { emoji = "\u{1F426}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 25, sound = "whoosh" },
	["con chim"] = { emoji = "\u{1F426}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 25, sound = "whoosh" },

	-- ======================== MUSIC / INSTRUMENTS ========================
	["music"] = { emoji = "\u{1F3B5}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 30, sound = "ding" },
	["nhac"] = { emoji = "\u{1F3B5}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 30, sound = "ding" },
	["sarangi"] = { emoji = "\u{1F3BB}", effect = "floatUp", color = Color3.fromRGB(200, 150, 50), count = 25, sound = "ding" },
	["violin"] = { emoji = "\u{1F3BB}", effect = "floatUp", color = Color3.fromRGB(200, 150, 50), count = 25, sound = "ding" },
	["guitar"] = { emoji = "\u{1F3B8}", effect = "floatUp", color = Color3.fromRGB(255, 150, 50), count = 25, sound = "ding" },
	["drum"] = { emoji = "\u{1F941}", effect = "shockwave", color = Color3.fromRGB(255, 100, 50), count = 15, sound = "drumroll" },
	["trong"] = { emoji = "\u{1F941}", effect = "shockwave", color = Color3.fromRGB(255, 100, 50), count = 15, sound = "drumroll" },
	["piano"] = { emoji = "\u{1F3B9}", effect = "floatUp", color = Color3.fromRGB(255, 255, 255), count = 25, sound = "ding" },

	-- ======================== FASHION / ACCESSORIES ========================
	["glasses"] = { emoji = "\u{1F576}\u{FE0F}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 25, sound = "coin" },
	["sunglasses"] = { emoji = "\u{1F576}\u{FE0F}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 25, sound = "coin" },
	["kinh"] = { emoji = "\u{1F576}\u{FE0F}", effect = "floatUp", color = Color3.fromRGB(100, 200, 255), count = 25, sound = "coin" },
	["cap"] = { emoji = "\u{1F9E2}", effect = "floatUp", color = Color3.fromRGB(100, 150, 255), count = 20, sound = "coin" },
	["mu"] = { emoji = "\u{1F9E2}", effect = "floatUp", color = Color3.fromRGB(100, 150, 255), count = 20, sound = "coin" },

	-- ======================== COINS / TIPS / MONEY ========================
	["coin"] = { emoji = "\u{1FA99}", effect = "rainDown", color = Color3.fromRGB(255, 200, 0), count = 40, sound = "coin" },
	["xu"] = { emoji = "\u{1FA99}", effect = "rainDown", color = Color3.fromRGB(255, 200, 0), count = 40, sound = "coin" },
	["money"] = { emoji = "\u{1F4B0}", effect = "rainDown", color = Color3.fromRGB(100, 255, 100), count = 35, sound = "coin" },
	["tien"] = { emoji = "\u{1F4B0}", effect = "rainDown", color = Color3.fromRGB(100, 255, 100), count = 35, sound = "coin" },
	["tip"] = { emoji = "\u{1F4B8}", effect = "floatUp", color = Color3.fromRGB(100, 255, 100), count = 25, sound = "coin" },
	["gift"] = { emoji = "\u{1F381}", effect = "confetti", color = Color3.fromRGB(255, 0, 127), count = 80, sound = "sparkle" },

	-- ======================== NATURE / ELEMENTS ========================
	["balloon"] = { emoji = "\u{1F388}", effect = "floatUp", color = Color3.fromRGB(255, 100, 150), count = 30, sound = "bubble" },
	["bong bay"] = { emoji = "\u{1F388}", effect = "floatUp", color = Color3.fromRGB(255, 100, 150), count = 30, sound = "bubble" },
	["rainbow"] = { emoji = "\u{1F308}", effect = "rainbow", color = Color3.fromRGB(255, 255, 255), count = 50, sound = "sparkle" },
	["cau vong"] = { emoji = "\u{1F308}", effect = "rainbow", color = Color3.fromRGB(255, 255, 255), count = 50, sound = "sparkle" },
	["rain"] = { emoji = "\u{1F327}\u{FE0F}", effect = "rainDown", color = Color3.fromRGB(100, 150, 255), count = 40, sound = "bubble" },
	["mua"] = { emoji = "\u{1F327}\u{FE0F}", effect = "rainDown", color = Color3.fromRGB(100, 150, 255), count = 40, sound = "bubble" },
	["snow"] = { emoji = "\u{2744}\u{FE0F}", effect = "rainDown", color = Color3.fromRGB(200, 230, 255), count = 50, sound = "ding" },
	["tuyet"] = { emoji = "\u{2744}\u{FE0F}", effect = "rainDown", color = Color3.fromRGB(200, 230, 255), count = 50, sound = "ding" },
	["fire"] = { emoji = "\u{1F525}", effect = "burst", color = Color3.fromRGB(255, 100, 0), count = 30, sound = "whoosh" },
	["lua"] = { emoji = "\u{1F525}", effect = "burst", color = Color3.fromRGB(255, 100, 0), count = 30, sound = "whoosh" },
	["lightning"] = { emoji = "\u{26A1}", effect = "shockwave", color = Color3.fromRGB(255, 255, 100), count = 15, sound = "firework" },
	["sét"] = { emoji = "\u{26A1}", effect = "shockwave", color = Color3.fromRGB(255, 255, 100), count = 15, sound = "firework" },

	-- ======================== VIP / PREMIUM / ROYALTY ========================
	["universe"] = { emoji = "\u{1F30C}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 60, sound = "fanfare" },
	["drama"] = { emoji = "\u{1F3AD}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 60, sound = "fanfare" },
	["crown"] = { emoji = "\u{1F451}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 60, sound = "fanfare" },
	["vuong"] = { emoji = "\u{1F451}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 60, sound = "fanfare" },
	["king"] = { emoji = "\u{1F451}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 55, sound = "fanfare" },
	["vua"] = { emoji = "\u{1F451}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 55, sound = "fanfare" },
	["queen"] = { emoji = "\u{1F451}", effect = "vip", color = Color3.fromRGB(255, 200, 255), count = 55, sound = "fanfare" },
	["castle"] = { emoji = "\u{1F3F0}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 50, sound = "fanfare" },
	["lau dai"] = { emoji = "\u{1F3F0}", effect = "vip", color = Color3.fromRGB(255, 215, 0), count = 50, sound = "fanfare" },
	["whale"] = { emoji = "\u{1F40B}", effect = "vip", color = Color3.fromRGB(100, 150, 255), count = 50, sound = "fanfare" },
	["ca voi"] = { emoji = "\u{1F40B}", effect = "vip", color = Color3.fromRGB(100, 150, 255), count = 50, sound = "fanfare" },
}

-- Default effect for unknown gifts
local DEFAULT_EFFECT = { emoji = "\u{1F381}", effect = "confetti", color = Color3.fromRGB(255, 0, 127), count = 100, sound = "sparkle" }

-- ====================================
-- HELPER FUNCTIONS
-- ====================================

local function getStageCenter()
	local stage = Workspace:FindFirstChild("KPopStage") or Workspace:FindFirstChild("DanceStage")
	if not stage then return Vector3.new(0, 6, 0) end
	if stage:IsA("Model") then
		return stage:GetPivot().Position
	elseif stage:IsA("BasePart") then
		return stage.Position
	end
	return Vector3.new(0, 6, 0)
end

local function getGiftConfig(giftDetails)
	local giftName = ""
	if type(giftDetails) == "string" then
		giftName = giftDetails
	elseif type(giftDetails) == "table" then
		giftName = giftDetails.name or giftDetails.giftName or giftDetails.type or ""
	end
	giftName = string.lower(tostring(giftName))

	-- Find the best matching gift key (longest key that matches for specificity)
	local bestMatch = nil
	local bestLen = 0
	for key, config in pairs(GIFT_EFFECT_MAP) do
		if string.find(giftName, key, 1, true) and #key > bestLen then
			bestMatch = config
			bestLen = #key
		end
	end
	if bestMatch then return bestMatch, giftName end
	return DEFAULT_EFFECT, giftName
end

-- ====================================
-- GIFT HUD (ScreenGui for banners and flashes)
-- ====================================

local function ensureGiftHUD()
	local playerGui = LocalPlayer:FindFirstChild("PlayerGui")
	if not playerGui then return nil end
	local screenGui = playerGui:FindFirstChild("TikTokGiftHUD")
	if not screenGui then
		screenGui = Instance.new("ScreenGui")
		screenGui.Name = "TikTokGiftHUD"
		screenGui.ResetOnSpawn = false
		screenGui.IgnoreGuiInset = true
		screenGui.DisplayOrder = 100
		screenGui.Parent = playerGui
	end
	return screenGui
end

-- ====================================
-- EFFECT 1: Floating Emojis (hearts, stars, flowers floating up)
-- ====================================
local function spawnFloatingEmojis(emoji, count, centerPos, isUp)
	for i = 1, count do
		task.spawn(function()
			local part = Instance.new("Part")
			part.Size = Vector3.new(0.5, 0.5, 0.5)
			part.Transparency = 1
			part.CanCollide = false
			part.Anchored = true

			local areaSize = 25
			local xOffset = math.random(-areaSize, areaSize)
			local zOffset = math.random(-areaSize, areaSize)
			local startY = isUp and (centerPos.Y - 3) or (centerPos.Y + 35)
			local endY = isUp and (startY + 30) or (startY - 40)

			part.Position = Vector3.new(
				centerPos.X + xOffset,
				startY,
				centerPos.Z + zOffset
			)
			part.Parent = Workspace

			local billboard = Instance.new("BillboardGui")
			billboard.Size = UDim2.new(0, 50, 0, 50)
			billboard.AlwaysOnTop = true
			billboard.Parent = part

			local label = Instance.new("TextLabel")
			label.Size = UDim2.new(1, 0, 1, 0)
			label.BackgroundTransparency = 1
			label.Text = emoji
			label.TextScaled = true
			label.Font = Enum.Font.GothamBold
			label.Parent = billboard

			local duration = 3 + math.random(0, 20) / 10
			local endPos = Vector3.new(
				part.Position.X + math.random(-3, 3),
				endY,
				part.Position.Z + math.random(-3, 3)
			)

			local tweenInfo = TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
			local tween = TweenService:Create(part, tweenInfo, { Position = endPos })
			tween:Play()

			task.delay(duration - 1, function()
				if label and label.Parent then
					local fadeTween = TweenService:Create(label, TweenInfo.new(1), { TextTransparency = 1 })
					fadeTween:Play()
				end
			end)

			tween.Completed:Wait()
			if part and part.Parent then
				part:Destroy()
			end
		end)
		task.wait(math.random(10, 80) / 1000)
	end
end

-- ====================================
-- EFFECT 2: Fireworks (explosions above stage)
-- ====================================
local function spawnFireworks(centerPos, count)
	for i = 1, count do
		task.spawn(function()
			task.wait(math.random(0, count * 0.3))

			local pos = centerPos + Vector3.new(
				math.random(-30, 30),
				math.random(15, 35),
				math.random(-15, 15)
			)

			local attachment = Instance.new("Attachment")
			attachment.Position = pos
			attachment.Parent = Workspace.Terrain

			local hue = math.random()
			local emitter = Instance.new("ParticleEmitter")
			emitter.Texture = "rbxassetid://243664672"
			emitter.Color = ColorSequence.new({
				ColorSequenceKeypoint.new(0, Color3.fromHSV(hue, 1, 1)),
				ColorSequenceKeypoint.new(0.5, Color3.fromHSV((hue + 0.1) % 1, 1, 1)),
				ColorSequenceKeypoint.new(1, Color3.fromHSV((hue + 0.2) % 1, 0.8, 1))
			})
			emitter.Size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 3),
				NumberSequenceKeypoint.new(0.5, 2),
				NumberSequenceKeypoint.new(1, 0)
			})
			emitter.Speed = NumberRange.new(25, 40)
			emitter.Lifetime = NumberRange.new(1.5, 2.5)
			emitter.Rate = 0
			emitter.SpreadAngle = Vector2.new(180, 180)
			emitter.Rotation = NumberRange.new(0, 360)
			emitter.Parent = attachment

			emitter:Emit(80)

			task.wait(0.1)
			emitter.Enabled = false
			task.wait(3)
			if attachment and attachment.Parent then
				attachment:Destroy()
			end
		end)
	end
end

-- ====================================
-- EFFECT 3: Confetti Rain
-- ====================================
local function spawnConfettiRain(centerPos, duration)
	local attachment = Instance.new("Attachment")
	attachment.Position = centerPos + Vector3.new(0, 30, 0)
	attachment.Parent = Workspace.Terrain

	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = "rbxassetid://243664672"
	emitter.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 0, 127)),
		ColorSequenceKeypoint.new(0.25, Color3.fromRGB(0, 242, 254)),
		ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 215, 0)),
		ColorSequenceKeypoint.new(0.75, Color3.fromRGB(147, 255, 0)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 100, 200))
	})
	emitter.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1.5),
		NumberSequenceKeypoint.new(1, 0.5)
	})
	emitter.Speed = NumberRange.new(3, 10)
	emitter.Lifetime = NumberRange.new(4, 6)
	emitter.Rate = 60
	emitter.SpreadAngle = Vector2.new(20, 20)
	emitter.Acceleration = Vector3.new(0, -15, 0)
	emitter.Rotation = NumberRange.new(0, 360)
	emitter.RotSpeed = NumberRange.new(180, 360)
	emitter.Parent = attachment

	task.delay(duration, function()
		if emitter and emitter.Parent then
			emitter.Enabled = false
		end
		task.wait(6)
		if attachment and attachment.Parent then
			attachment:Destroy()
		end
	end)
end

-- ====================================
-- EFFECT 4: Stage Light Flash
-- ====================================
local function flashStageLights(color, duration)
	local stage = Workspace:FindFirstChild("KPopStage")
	if not stage then return end

	local lightsToFlash = {}

	-- LED Wall
	local ledWall = stage:FindFirstChild("LEDWall")
	if ledWall and ledWall:IsA("BasePart") then
		table.insert(lightsToFlash, ledWall)
	end

	-- LED Frames and Neon parts
	for _, child in ipairs(stage:GetChildren()) do
		if child:IsA("BasePart") then
			local name = string.lower(child.Name)
			if (string.find(name, "led") or string.find(name, "neon")) and child ~= ledWall then
				table.insert(lightsToFlash, child)
			end
		end
	end

	-- Store original colors and flash
	local originalColors = {}
	for _, light in ipairs(lightsToFlash) do
		originalColors[light] = light.Color
		light.Color = color
	end

	task.delay(duration, function()
		for light, origColor in pairs(originalColors) do
			pcall(function() light.Color = origColor end)
		end
	end)
end

-- ====================================
-- ADVANCED CINEMATIC & 3D CUTSCENE EFFECTS
-- ====================================

local Camera = Workspace.CurrentCamera

-- 1. Camera Shake Effect
local function applyScreenShake(intensity, duration)
	task.spawn(function()
		local startTime = tick()
		while (tick() - startTime) < duration do
			local offsetX = (math.random() - 0.5) * intensity
			local offsetY = (math.random() - 0.5) * intensity
			local offsetZ = (math.random() - 0.5) * intensity
			Camera.CFrame = Camera.CFrame * CFrame.new(offsetX, offsetY, offsetZ)
			task.wait(0.03)
		end
	end)
end

-- 2. 3D Spotlight Beam & Spinning Aura Ring on Dancer
local function spawnStageBeamAndAura(centerPos, color, duration)
	task.spawn(function()
		-- 3D Spotlight Beam
		local beamPart = Instance.new("Part")
		beamPart.Name = "GiftSpotlightBeam"
		beamPart.Shape = Enum.PartType.Cylinder
		beamPart.Size = Vector3.new(60, 10, 10)
		beamPart.CFrame = CFrame.new(centerPos + Vector3.new(0, 30, 0)) * CFrame.Angles(0, 0, math.rad(90))
		beamPart.Material = Enum.Material.Neon
		beamPart.Color = color
		beamPart.Transparency = 0.6
		beamPart.CanCollide = false
		beamPart.Anchored = true
		beamPart.Parent = Workspace

		-- Spinning Aura Ring on Floor
		local auraPart = Instance.new("Part")
		auraPart.Name = "GiftAuraRing"
		auraPart.Size = Vector3.new(16, 0.2, 16)
		auraPart.CFrame = CFrame.new(centerPos + Vector3.new(0, 0.2, 0))
		auraPart.Material = Enum.Material.Neon
		auraPart.Color = color
		auraPart.Transparency = 0.3
		auraPart.CanCollide = false
		auraPart.Anchored = true
		auraPart.Parent = Workspace

		local auraMesh = Instance.new("SpecialMesh")
		auraMesh.MeshType = Enum.MeshType.FileMesh
		auraMesh.MeshId = "rbxassetid://3270017" -- Cylinder/Ring mesh
		auraMesh.Scale = Vector3.new(18, 0.2, 18)
		auraMesh.Parent = auraPart

		-- Spin Aura ring
		task.spawn(function()
			local angle = 0
			local startTime = tick()
			while (tick() - startTime) < duration do
				angle = angle + 5
				auraPart.CFrame = CFrame.new(centerPos + Vector3.new(0, 0.2, 0)) * CFrame.Angles(0, math.rad(angle), 0)
				task.wait(0.03)
			end
		end)

		-- Fade out and destroy
		task.delay(duration - 0.8, function()
			if beamPart and beamPart.Parent then
				TweenService:Create(beamPart, TweenInfo.new(0.8), { Transparency = 1 }):Play()
			end
			if auraPart and auraPart.Parent then
				TweenService:Create(auraPart, TweenInfo.new(0.8), { Transparency = 1 }):Play()
			end
		end)

		task.wait(duration)
		if beamPart and beamPart.Parent then beamPart:Destroy() end
		if auraPart and auraPart.Parent then auraPart:Destroy() end
	end)
end

-- 3. Cinematic Camera Cutscene (Dramatic Close-Up Zoom & Orbit)
local function playCinematicCameraCutscene(centerPos, duration)
	task.spawn(function()
		local originalCamType = Camera.CameraType
		local originalCamCF = Camera.CFrame
		Camera.CameraType = Enum.CameraType.Scriptable

		-- Start Position: Low Angle Close-up facing the dancer
		local targetPos = centerPos + Vector3.new(0, 4, 0)
		local startCamCF = CFrame.new(centerPos + Vector3.new(0, 3, 12), targetPos)
		local endCamCF = CFrame.new(centerPos + Vector3.new(-8, 7, 8), targetPos)

		Camera.CFrame = startCamCF

		-- Smooth cinematic movement across dancer
		local tween = TweenService:Create(Camera, TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), {
			CFrame = endCamCF
		})
		tween:Play()
		tween.Completed:Wait()

		-- Restore camera back to player control smoothly
		local restoreTween = TweenService:Create(Camera, TweenInfo.new(0.8, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut), {
			CFrame = originalCamCF
		})
		restoreTween:Play()
		restoreTween.Completed:Wait()

		Camera.CameraType = originalCamType
	end)
end

-- ====================================
-- EFFECT 5: Screen Flash (VIP only)
-- ====================================
local function flashScreen(color)
	local screenGui = ensureGiftHUD()
	if not screenGui then return end

	local flash = Instance.new("Frame")
	flash.Size = UDim2.new(1, 0, 1, 0)
	flash.BackgroundColor3 = color
	flash.BackgroundTransparency = 0.7
	flash.BorderSizePixel = 0
	flash.ZIndex = 50
	flash.Parent = screenGui

	local tween = TweenService:Create(flash, TweenInfo.new(0.5), { BackgroundTransparency = 1 })
	tween:Play()
	tween.Completed:Wait()
	if flash and flash.Parent then
		flash:Destroy()
	end
end

-- ====================================
-- EFFECT 6: Spiral Emojis (rocket, dragon - spiral upward)
-- ====================================
local function spawnSpiralEmojis(emoji, count, centerPos)
	for i = 1, count do
		task.spawn(function()
			local part = Instance.new("Part")
			part.Size = Vector3.new(0.5, 0.5, 0.5)
			part.Transparency = 1
			part.CanCollide = false
			part.Anchored = true
			part.Position = centerPos + Vector3.new(0, 2, 0)
			part.Parent = Workspace

			local billboard = Instance.new("BillboardGui")
			billboard.Size = UDim2.new(0, 50, 0, 50)
			billboard.AlwaysOnTop = true
			billboard.Parent = part

			local label = Instance.new("TextLabel")
			label.Size = UDim2.new(1, 0, 1, 0)
			label.BackgroundTransparency = 1
			label.Text = emoji
			label.TextScaled = true
			label.Font = Enum.Font.GothamBold
			label.Parent = billboard

			local duration = 3
			local radius = 20
			local startAngle = (i / count) * math.pi * 4
			local heightStep = 25 / count

			task.spawn(function()
				local elapsed = 0
				while elapsed < duration do
					local t = elapsed / duration
					local angle = startAngle + t * math.pi * 4
					local r = radius * (1 - t * 0.5)
					local h = t * 25 + i * heightStep
					part.Position = Vector3.new(
						centerPos.X + math.cos(angle) * r,
						centerPos.Y + h,
						centerPos.Z + math.sin(angle) * r
					)
					if t > 0.7 then
						label.TextTransparency = (t - 0.7) / 0.3
					end
					task.wait(0.03)
					elapsed = elapsed + 0.03
				end
				if part and part.Parent then part:Destroy() end
			end)
		end)
		task.wait(0.05)
	end
end

-- ====================================
-- EFFECT 7: Burst Emojis (shooting star, diamond, fire - explode outward)
-- ====================================
local function spawnBurstEmojis(emoji, count, centerPos, color)
	for i = 1, count do
		task.spawn(function()
			local part = Instance.new("Part")
			part.Size = Vector3.new(0.5, 0.5, 0.5)
			part.Transparency = 1
			part.CanCollide = false
			part.Anchored = true
			part.Position = centerPos + Vector3.new(0, 8, 0)
			part.Parent = Workspace

			local billboard = Instance.new("BillboardGui")
			billboard.Size = UDim2.new(0, 45, 0, 45)
			billboard.AlwaysOnTop = true
			billboard.Parent = part

			local label = Instance.new("TextLabel")
			label.Size = UDim2.new(1, 0, 1, 0)
			label.BackgroundTransparency = 1
			label.Text = emoji
			label.TextScaled = true
			label.Font = Enum.Font.GothamBold
			label.Parent = billboard

			-- Random outward direction in 3D
			local angle = math.random() * math.pi * 2
			local pitch = math.random() * math.pi - math.pi / 2
			local speed = 30 + math.random(0, 20)
			local dirX = math.cos(angle) * math.cos(pitch) * speed
			local dirY = math.sin(pitch) * speed + 15
			local dirZ = math.sin(angle) * math.cos(pitch) * speed

			local endPos = part.Position + Vector3.new(dirX, dirY, dirZ)
			local duration = 2.5

			local tween = TweenService:Create(part, TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = endPos })
			tween:Play()

			task.delay(duration - 0.8, function()
				if label and label.Parent then
					local fade = TweenService:Create(label, TweenInfo.new(0.8), { TextTransparency = 1 })
					fade:Play()
				end
			end)

			tween.Completed:Wait()
			if part and part.Parent then part:Destroy() end
		end)
		task.wait(math.random(10, 50) / 1000)
	end
end

-- ====================================
-- EFFECT 8: Orbit Emojis (galaxy, planet - circle around stage)
-- ====================================
local function spawnOrbitEmojis(emoji, count, centerPos)
	for i = 1, count do
		task.spawn(function()
			local part = Instance.new("Part")
			part.Size = Vector3.new(0.5, 0.5, 0.5)
			part.Transparency = 1
			part.CanCollide = false
			part.Anchored = true
			part.Position = centerPos + Vector3.new(20, 15, 0)
			part.Parent = Workspace

			local billboard = Instance.new("BillboardGui")
			billboard.Size = UDim2.new(0, 55, 0, 55)
			billboard.AlwaysOnTop = true
			billboard.Parent = part

			local label = Instance.new("TextLabel")
			label.Size = UDim2.new(1, 0, 1, 0)
			label.BackgroundTransparency = 1
			label.Text = emoji
			label.TextScaled = true
			label.Font = Enum.Font.GothamBold
			label.Parent = billboard

			local radius = 25
			local startAngle = (i / count) * math.pi * 2
			local height = 10 + math.random(0, 15)
			local duration = 4
			local orbitSpeed = 0.02

			task.spawn(function()
				local elapsed = 0
				while elapsed < duration do
					local angle = startAngle + elapsed * 1.5
					part.Position = Vector3.new(
						centerPos.X + math.cos(angle) * radius,
						centerPos.Y + height + math.sin(elapsed * 2) * 3,
						centerPos.Z + math.sin(angle) * radius
					)
					if elapsed > duration - 1 then
						label.TextTransparency = (elapsed - (duration - 1)) / 1
					end
					task.wait(orbitSpeed)
					elapsed = elapsed + orbitSpeed
				end
				if part and part.Parent then part:Destroy() end
			end)
		end)
		task.wait(0.08)
	end
end

-- ====================================
-- EFFECT 9: Shockwave Ring (drum, lightning - expanding ring)
-- ====================================
local function spawnShockwaveRing(centerPos, color)
	for ring = 1, 4 do
		task.spawn(function()
			task.wait(ring * 0.15)

			local part = Instance.new("Part")
			part.Shape = Enum.PartType.Cylinder
			part.Size = Vector3.new(0.5, 2, 2)
			part.Transparency = 0.3
			part.Material = Enum.Material.Neon
			part.Color = color
			part.Anchored = true
			part.CanCollide = false
			part.CFrame = CFrame.new(centerPos + Vector3.new(0, 5, 0))
				* CFrame.Angles(0, 0, math.rad(90))
			part.Parent = Workspace

			local goalSize = Vector3.new(0.5, 80, 80)
			local tween = TweenService:Create(part, TweenInfo.new(1.5, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
				Size = goalSize,
				Transparency = 1
			})
			tween:Play()
			tween.Completed:Wait()
			if part and part.Parent then part:Destroy() end
		end)
	end

	-- Particle burst at center
	task.spawn(function()
		local attachment = Instance.new("Attachment")
		attachment.Position = centerPos + Vector3.new(0, 5, 0)
		attachment.Parent = Workspace.Terrain

		local emitter = Instance.new("ParticleEmitter")
		emitter.Texture = "rbxassetid://243664672"
		emitter.Color = ColorSequence.new(color)
		emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 4), NumberSequenceKeypoint.new(1, 0) })
		emitter.Speed = NumberRange.new(20, 35)
		emitter.Lifetime = NumberRange.new(0.8, 1.5)
		emitter.Rate = 0
		emitter.SpreadAngle = Vector2.new(90, 90)
		emitter.Parent = attachment

		emitter:Emit(40)
		task.wait(0.1)
		emitter.Enabled = false
		task.wait(2)
		if attachment and attachment.Parent then attachment:Destroy() end
	end)
end

-- ====================================
-- EFFECT 10: Rainbow Trail (unicorn, rainbow - colorful emojis in rainbow colors)
-- ====================================
local function spawnRainbowEffect(emoji, count, centerPos)
	local rainbowColors = {
		Color3.fromRGB(255, 0, 0), Color3.fromRGB(255, 127, 0),
		Color3.fromRGB(255, 255, 0), Color3.fromRGB(0, 255, 0),
		Color3.fromRGB(0, 200, 255), Color3.fromRGB(75, 0, 130),
		Color3.fromRGB(238, 130, 238),
	}

	for i = 1, count do
		task.spawn(function()
			local part = Instance.new("Part")
			part.Size = Vector3.new(0.5, 0.5, 0.5)
			part.Transparency = 1
			part.CanCollide = false
			part.Anchored = true

			local areaSize = 30
			part.Position = Vector3.new(
				centerPos.X + math.random(-areaSize, areaSize),
				centerPos.Y + math.random(-2, 5),
				centerPos.Z + math.random(-areaSize, areaSize)
			)
			part.Parent = Workspace

			local billboard = Instance.new("BillboardGui")
			billboard.Size = UDim2.new(0, 50, 0, 50)
			billboard.AlwaysOnTop = true
			billboard.Parent = part

			local label = Instance.new("TextLabel")
			label.Size = UDim2.new(1, 0, 1, 0)
			label.BackgroundTransparency = 1
			label.Text = emoji
			label.TextScaled = true
			label.Font = Enum.Font.GothamBold
			label.TextColor3 = rainbowColors[(i % #rainbowColors) + 1]
			label.Parent = billboard

			local duration = 3.5
			local endPos = part.Position + Vector3.new(
				math.random(-5, 5),
				25 + math.random(0, 10),
				math.random(-5, 5)
			)

			local tween = TweenService:Create(part, TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = endPos })
			tween:Play()

			task.delay(duration - 1, function()
				if label and label.Parent then
					local fade = TweenService:Create(label, TweenInfo.new(1), { TextTransparency = 1 })
					fade:Play()
				end
			end)

			tween.Completed:Wait()
			if part and part.Parent then part:Destroy() end
		end)
		task.wait(math.random(20, 60) / 1000)
	end

	-- Rainbow confetti rain
	task.spawn(function()
		local attachment = Instance.new("Attachment")
		attachment.Position = centerPos + Vector3.new(0, 30, 0)
		attachment.Parent = Workspace.Terrain

		local emitter = Instance.new("ParticleEmitter")
		emitter.Texture = "rbxassetid://243664672"
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 0, 0)),
			ColorSequenceKeypoint.new(0.17, Color3.fromRGB(255, 127, 0)),
			ColorSequenceKeypoint.new(0.33, Color3.fromRGB(255, 255, 0)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 255, 0)),
			ColorSequenceKeypoint.new(0.67, Color3.fromRGB(0, 200, 255)),
			ColorSequenceKeypoint.new(0.83, Color3.fromRGB(75, 0, 130)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(238, 130, 238))
		})
		emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.5), NumberSequenceKeypoint.new(1, 0.5) })
		emitter.Speed = NumberRange.new(3, 10)
		emitter.Lifetime = NumberRange.new(4, 6)
		emitter.Rate = 80
		emitter.SpreadAngle = Vector2.new(20, 20)
		emitter.Acceleration = Vector3.new(0, -15, 0)
		emitter.Rotation = NumberRange.new(0, 360)
		emitter.RotSpeed = NumberRange.new(180, 360)
		emitter.Parent = attachment

		task.delay(4, function()
			if emitter and emitter.Parent then emitter.Enabled = false end
			task.wait(5)
			if attachment and attachment.Parent then attachment:Destroy() end
		end)
	end)
end

-- ====================================
-- EFFECT 11: Gift Notification Banner (slides in from right)
-- ====================================
local function showGiftBanner(emoji, giftName, senderName, isVIP, color)
	local screenGui = ensureGiftHUD()
	if not screenGui then return end

	local banner = Instance.new("Frame")
	banner.Size = UDim2.new(0, 420, 0, 70)
	banner.Position = UDim2.new(1, 0, 0.25, 0)
	banner.BackgroundColor3 = isVIP and Color3.fromRGB(45, 30, 5) or Color3.fromRGB(12, 14, 24)
	banner.BackgroundTransparency = 0.1
	banner.BorderSizePixel = 0
	banner.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = banner

	local stroke = Instance.new("UIStroke")
	stroke.Color = color
	stroke.Thickness = isVIP and 3 or 2
	stroke.Parent = banner

	-- Emoji icon
	local emojiLabel = Instance.new("TextLabel")
	emojiLabel.Size = UDim2.new(0, 55, 0, 55)
	emojiLabel.Position = UDim2.new(0, 8, 0.5, -27)
	emojiLabel.BackgroundTransparency = 1
	emojiLabel.Text = emoji
	emojiLabel.TextScaled = true
	emojiLabel.Font = Enum.Font.GothamBold
	emojiLabel.Parent = banner

	-- Gift name label
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, -75, 0, 35)
	nameLabel.Position = UDim2.new(0, 68, 0.08, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = isVIP and ("\u{1F451} " .. giftName) or giftName
	nameLabel.TextColor3 = isVIP and Color3.fromRGB(255, 215, 0) or color
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.Parent = banner

	-- Sender label
	local senderLabel = Instance.new("TextLabel")
	senderLabel.Size = UDim2.new(1, -75, 0, 22)
	senderLabel.Position = UDim2.new(0, 68, 0.55, 0)
	senderLabel.BackgroundTransparency = 1
	senderLabel.Text = "\u{1F381} t\u{1EEB} @" .. (senderName or "Unknown")
	senderLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
	senderLabel.TextScaled = true
	senderLabel.Font = Enum.Font.GothamMedium
	senderLabel.TextXAlignment = Enum.TextXAlignment.Left
	senderLabel.Parent = banner

	-- Slide in from right
	local slideIn = TweenService:Create(banner,
		TweenInfo.new(0.6, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
		{ Position = UDim2.new(1, -440, 0.25, 0) }
	)
	slideIn:Play()

	-- Slide out after 5 seconds
	task.delay(5, function()
		if banner and banner.Parent then
			local slideOut = TweenService:Create(banner,
				TweenInfo.new(0.5, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
				{ Position = UDim2.new(1, 0, 0.25, 0) }
			)
			slideOut:Play()
			slideOut.Completed:Wait()
			if banner and banner.Parent then
				banner:Destroy()
			end
		end
	end)
end

-- ====================================
-- MAIN GIFT EFFECT HANDLER
-- ====================================
local function triggerGiftEffect(giftDetails, senderName, stagePos, isVIP)
	local config, giftName = getGiftConfig(giftDetails)
	local effectType = config.effect or "floatUp"
	local centerPos = stagePos or getStageCenter()
	local displayName = (giftName ~= "" and giftName) or "Qu\u{00E0} t\u{1EB7}ng"

	-- Play the unique sound for this gift type
	if config.sound then
		local soundVolume = isVIP and 1.2 or 0.8
		playGiftSound(config.sound, soundVolume)
	end

	-- Always show notification banner
	showGiftBanner(config.emoji, displayName, senderName, isVIP, config.color)

	-- Always flash stage lights and spawn 3D Spotlight Beam + Floor Aura Ring
	flashStageLights(config.color, 3)
	spawnStageBeamAndAura(centerPos, config.color, 4)

	-- Apply Cinematic Cutscenes & Screen Shake for all gifts
	playCinematicCameraCutscene(centerPos, 3.5)
	applyScreenShake(0.8, 1.5)

	-- Trigger specific effect
	if effectType == "floatUp" then
		spawnFloatingEmojis(config.emoji, config.count, centerPos, true)

	elseif effectType == "rainDown" then
		spawnFloatingEmojis(config.emoji, config.count, centerPos, false)

	elseif effectType == "firework" then
		spawnFireworks(centerPos, config.count)
		spawnConfettiRain(centerPos, 3)

	elseif effectType == "confetti" then
		spawnConfettiRain(centerPos, 5)

	elseif effectType == "spiral" then
		spawnSpiralEmojis(config.emoji, config.count, centerPos)

	elseif effectType == "burst" then
		spawnBurstEmojis(config.emoji, config.count, centerPos, config.color)

	elseif effectType == "orbit" then
		spawnOrbitEmojis(config.emoji, config.count, centerPos)

	elseif effectType == "shockwave" then
		spawnShockwaveRing(centerPos, config.color)
		spawnFloatingEmojis(config.emoji, config.count, centerPos, true)

	elseif effectType == "rainbow" then
		spawnRainbowEffect(config.emoji, config.count, centerPos)

	elseif effectType == "vip" then
		-- VIP: Everything at once!
		spawnFireworks(centerPos, 14)
		spawnConfettiRain(centerPos, 6)
		spawnFloatingEmojis(config.emoji, config.count, centerPos, true)
		spawnFloatingEmojis("\u{2728}", 25, centerPos, true)
		task.spawn(function() flashScreen(config.color) end)
	end
end

-- ====================================
-- EVENT CONNECTION
-- ====================================

local giftEffectEvent = ReplicatedStorage:WaitForChild("GiftEffectEvent", 10)
if giftEffectEvent then
	giftEffectEvent.OnClientEvent:Connect(function(giftDetails, senderName, stagePos, isVIP)
		pcall(function()
			triggerGiftEffect(giftDetails, senderName, stagePos, isVIP)
		end)
	end)
end

local giftCount = 0
for _ in pairs(GIFT_EFFECT_MAP) do giftCount = giftCount + 1 end
print(string.format("[TikTokGiftEffectController] Comprehensive Gift Effect + Audio System initialized! (%d gifts, 12 sounds, 10 effects)", giftCount))