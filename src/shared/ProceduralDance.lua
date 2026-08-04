-- ProceduralDance.lua
-- Procedural Motor6D dance animation generator for R6 dummy characters
-- Handles smooth mathematical dance moves without requiring external Roblox animation assets

local ProceduralDance = {}

local activeDancers = {} -- character -> { style = string, origC0 = { jointName = CFrame }, phaseOffset = number }

-- Default style mappings per theme
local ThemeStyles = {
	TIKTOK_VN_TREND = { "shuffle", "wave", "bounce" },
	KPOP_VIRAL = { "kpop", "wave", "sync" },
	EDM_FESTIVAL = { "hype", "shuffle", "bounce" },
	HIPHOP_STREET = { "hiphop", "bounce", "breakdance" },
}

function ProceduralDance.GetRandomStyleForTheme(themeKey)
	local styles = ThemeStyles[themeKey] or { "bounce", "shuffle", "wave" }
	return styles[math.random(1, #styles)]
end

local function getJoints(character)
	local hrp = character:FindFirstChild("HumanoidRootPart")
	local torso = character:FindFirstChild("Torso")
	if not hrp or not torso then return nil end

	local joints = {}
	joints["RootJoint"] = hrp:FindFirstChild("RootJoint")
	joints["Neck"] = torso:FindFirstChild("Neck")
	joints["Left Shoulder"] = torso:FindFirstChild("Left Shoulder")
	joints["Right Shoulder"] = torso:FindFirstChild("Right Shoulder")
	joints["Left Hip"] = torso:FindFirstChild("Left Hip")
	joints["Right Hip"] = torso:FindFirstChild("Right Hip")
	return joints
end

function ProceduralDance.StartDance(character, danceStyle)
	if not character then return end
	local joints = getJoints(character)
	if not joints then return end

	local origC0 = {}
	for name, joint in pairs(joints) do
		if joint and joint:IsA("Motor6D") then
			origC0[name] = joint.C0
		end
	end

	activeDancers[character] = {
		style = danceStyle or "bounce",
		origC0 = origC0,
		phaseOffset = math.random() * math.pi * 2,
		timeScale = 1 + (math.random() - 0.5) * 0.2
	}
end

function ProceduralDance.StopDance(character)
	if not character then return end
	local data = activeDancers[character]
	if data then
		local joints = getJoints(character)
		if joints then
			for name, joint in pairs(joints) do
				if joint and joint:IsA("Motor6D") and data.origC0[name] then
					joint.C0 = data.origC0[name]
				end
			end
		end
		activeDancers[character] = nil
	end
end

function ProceduralDance.Update()
	local now = os.clock()

	for character, data in pairs(activeDancers) do
		if not character or not character.Parent then
			activeDancers[character] = nil
		else
			local joints = getJoints(character)
			if joints then
				local t = (now * 5 * data.timeScale) + data.phaseOffset
				local style = data.style
				local orig = data.origC0

				-- Base sway / bounce
				local bounceY = math.abs(math.sin(t * 2)) * 0.3
				local bodyTilt = math.sin(t) * 0.1

				if joints["RootJoint"] and orig["RootJoint"] then
					joints["RootJoint"].C0 = orig["RootJoint"] * CFrame.new(0, bounceY, 0) * CFrame.Angles(0, 0, bodyTilt)
				end

				if joints["Neck"] and orig["Neck"] then
					local headNod = math.sin(t * 2) * 0.15
					joints["Neck"].C0 = orig["Neck"] * CFrame.Angles(headNod, 0, -bodyTilt)
				end

				-- Arm & Leg motion based on style
				local lArmRot = CFrame.identity
				local rArmRot = CFrame.identity
				local lLegRot = CFrame.identity
				local rLegRot = CFrame.identity

				if style == "shuffle" then
					lArmRot = CFrame.Angles(math.sin(t * 2) * 0.6, 0, math.rad(30) + math.cos(t) * 0.2)
					rArmRot = CFrame.Angles(-math.sin(t * 2) * 0.6, 0, -math.rad(30) - math.cos(t) * 0.2)
					lLegRot = CFrame.Angles(-math.sin(t * 2) * 0.4, 0, 0)
					rLegRot = CFrame.Angles(math.sin(t * 2) * 0.4, 0, 0)
				elseif style == "wave" then
					lArmRot = CFrame.Angles(0, 0, math.rad(120) + math.sin(t * 1.5) * 0.4)
					rArmRot = CFrame.Angles(0, 0, -math.rad(120) - math.cos(t * 1.5) * 0.4)
					lLegRot = CFrame.Angles(0, 0, math.sin(t) * 0.15)
					rLegRot = CFrame.Angles(0, 0, -math.sin(t) * 0.15)
				elseif style == "kpop" then
					lArmRot = CFrame.Angles(math.rad(90) + math.sin(t * 2.5) * 0.3, math.cos(t * 2.5) * 0.3, math.rad(45))
					rArmRot = CFrame.Angles(math.rad(90) - math.sin(t * 2.5) * 0.3, -math.cos(t * 2.5) * 0.3, -math.rad(45))
					lLegRot = CFrame.Angles(math.sin(t * 2.5) * 0.3, 0, math.rad(15))
					rLegRot = CFrame.Angles(-math.sin(t * 2.5) * 0.3, 0, -math.rad(15))
				elseif style == "hiphop" then
					lArmRot = CFrame.Angles(math.sin(t * 3) * 0.8, math.sin(t * 1.5) * 0.5, math.rad(20))
					rArmRot = CFrame.Angles(-math.cos(t * 3) * 0.8, -math.sin(t * 1.5) * 0.5, -math.rad(20))
					lLegRot = CFrame.Angles(math.cos(t * 3) * 0.5, 0, 0)
					rLegRot = CFrame.Angles(-math.cos(t * 3) * 0.5, 0, 0)
				elseif style == "hype" then
					lArmRot = CFrame.Angles(math.rad(160) + math.sin(t * 4) * 0.3, 0, math.rad(20))
					rArmRot = CFrame.Angles(math.rad(160) + math.cos(t * 4) * 0.3, 0, -math.rad(20))
					lLegRot = CFrame.Angles(math.sin(t * 4) * 0.4, 0, 0)
					rLegRot = CFrame.Angles(-math.sin(t * 4) * 0.4, 0, 0)
				else -- default "bounce"
					lArmRot = CFrame.Angles(math.sin(t * 2) * 0.4, 0, math.rad(20) + math.sin(t) * 0.2)
					rArmRot = CFrame.Angles(-math.sin(t * 2) * 0.4, 0, -math.rad(20) - math.sin(t) * 0.2)
					lLegRot = CFrame.Angles(math.sin(t * 2) * 0.2, 0, 0)
					rLegRot = CFrame.Angles(-math.sin(t * 2) * 0.2, 0, 0)
				end

				if joints["Left Shoulder"] and orig["Left Shoulder"] then
					joints["Left Shoulder"].C0 = orig["Left Shoulder"] * lArmRot
				end
				if joints["Right Shoulder"] and orig["Right Shoulder"] then
					joints["Right Shoulder"].C0 = orig["Right Shoulder"] * rArmRot
				end
				if joints["Left Hip"] and orig["Left Hip"] then
					joints["Left Hip"].C0 = orig["Left Hip"] * lLegRot
				end
				if joints["Right Hip"] and orig["Right Hip"] then
					joints["Right Hip"].C0 = orig["Right Hip"] * rLegRot
				end
			end
		end
	end
end

return ProceduralDance
