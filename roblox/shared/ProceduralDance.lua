-- ProceduralDance.lua
-- Procedural dance system that overlays reliable limb motion on spawned avatars.

local ProceduralDance = {}

local activeDancers = {}

local ThemeStyles = {
	TIKTOK_VN_TREND = { "shuffle", "wave", "bounce" },
	KPOP_VIRAL = { "kpop", "wave", "sync" },
	EDM_FESTIVAL = { "hype", "shuffle", "bounce" },
	HIPHOP_STREET = { "hiphop", "bounce", "breakdance" },
}

local STYLE_ALIASES = {
	PHONK = "hype",
	KPOP = "kpop",
	HIPHOP = "hiphop",
	CHILL = "wave",
	REGGAETON = "reggaeton",
	FUNK = "funk",
	AFROBEAT = "afrobeat",
	ROBOT = "robot",
	SYNC = "sync",
}

local JOINT_NAME_MAP = {
	LeftShoulder = "Left Shoulder",
	RightShoulder = "Right Shoulder",
	LeftHip = "Left Hip",
	RightHip = "Right Hip",
	LeftElbow = "Left Elbow",
	RightElbow = "Right Elbow",
	LeftKnee = "Left Knee",
	RightKnee = "Right Knee",
	Neck = "Neck",
	Root = "RootJoint",
	RootJoint = "RootJoint",
	Waist = "Waist",
}

local PART_NAME_MAP = {
	LeftUpperArm = "Left Shoulder",
	RightUpperArm = "Right Shoulder",
	LeftLowerArm = "Left Elbow",
	RightLowerArm = "Right Elbow",
	LeftUpperLeg = "Left Hip",
	RightUpperLeg = "Right Hip",
	LeftLowerLeg = "Left Knee",
	RightLowerLeg = "Right Knee",
	UpperTorso = "Waist",
	Head = "Neck",
}

function ProceduralDance.GetRandomStyleForTheme(themeKey)
	local styles = ThemeStyles[themeKey] or { "bounce", "shuffle", "wave" }
	return styles[math.random(1, #styles)]
end

local function normalizeStyle(style)
	if type(style) ~= "string" or style == "" then
		return "bounce"
	end

	local upper = string.upper(style)
	return STYLE_ALIASES[upper] or string.lower(style)
end

local function getHumanoidRootPart(character)
	return character and character:FindFirstChild("HumanoidRootPart") or nil
end

local function classifyJoint(motor)
	if not motor or not motor:IsA("Motor6D") then
		return nil
	end

	local mappedByName = JOINT_NAME_MAP[motor.Name]
	if mappedByName then
		return mappedByName
	end

	local part1 = motor.Part1
	if part1 and PART_NAME_MAP[part1.Name] then
		return PART_NAME_MAP[part1.Name]
	end

	return nil
end

local function getJointMap(character)
	local hrp = getHumanoidRootPart(character)
	if not hrp then
		return nil
	end

	local joints = {}
	for _, desc in ipairs(character:GetDescendants()) do
		if desc:IsA("Motor6D") then
			local key = classifyJoint(desc)
			if key and not joints[key] then
				joints[key] = desc
			end
		end
	end

	return joints
end

local function resetJointTransforms(joints, originalTransforms)
	for key, joint in pairs(joints or {}) do
		if joint and joint.Parent then
			joint.C0 = originalTransforms[key] or joint.C0
		end
	end
end

function ProceduralDance.StartDance(character, danceStyle)
	if not character then
		return
	end

	local joints = getJointMap(character)
	local hrp = getHumanoidRootPart(character)
	if not hrp then
		return
	end

	local originalTransforms = {}
	for key, joint in pairs(joints or {}) do
		originalTransforms[key] = joint.C0
	end

	activeDancers[character] = {
		style = normalizeStyle(danceStyle),
		joints = joints or {},
		originalTransforms = originalTransforms,
		baseRootCFrame = hrp.CFrame,
		phaseOffset = math.random() * math.pi * 2,
		timeScale = 1 + (math.random() - 0.5) * 0.18,
	}
end

function ProceduralDance.StopDance(character)
	if not character then
		return
	end

	local data = activeDancers[character]
	if not data then
		return
	end

	resetJointTransforms(data.joints, data.originalTransforms)

	local hrp = getHumanoidRootPart(character)
	if hrp and data.baseRootCFrame then
		hrp.CFrame = data.baseRootCFrame
	end

	activeDancers[character] = nil
end

local function setTransform(joints, originalTransforms, key, transform)
	local joint = joints[key]
	if joint and joint.Parent then
		local baseC0 = originalTransforms[key] or joint.C0
		joint.C0 = baseC0 * transform
	end
end

local function buildPose(style, t)
	local pose = {
		root = CFrame.identity,
		waist = CFrame.identity,
		neck = CFrame.identity,
		leftShoulder = CFrame.identity,
		rightShoulder = CFrame.identity,
		leftElbow = CFrame.identity,
		rightElbow = CFrame.identity,
		leftHip = CFrame.identity,
		rightHip = CFrame.identity,
		leftKnee = CFrame.identity,
		rightKnee = CFrame.identity,
	}

	local bodyTilt = math.sin(t * 1.5) * 0.25
	local hipSwing = math.sin(t * 2.2) * 0.35
	local bounce = math.abs(math.sin(t * 3.5)) * 0.5

	pose.root = CFrame.new(0, bounce * 0.9, 0) * CFrame.Angles(0, math.sin(t * 1.2) * 0.25, bodyTilt * 0.6)
	pose.waist = CFrame.Angles(bodyTilt * 0.5, hipSwing * 0.5, math.cos(t * 1.8) * 0.2)
	pose.neck = CFrame.Angles(math.sin(t * 3) * 0.25, 0, -bodyTilt * 0.7)

	if style == "shuffle" or style == "shuffle_stage" then
		pose.leftShoulder = CFrame.Angles(math.sin(t * 4.5) * 1.1, 0, math.rad(35))
		pose.rightShoulder = CFrame.Angles(-math.sin(t * 4.5) * 1.1, 0, -math.rad(35))
		pose.leftElbow = CFrame.Angles(math.abs(math.sin(t * 4.5)) * 0.6, 0, 0)
		pose.rightElbow = CFrame.Angles(math.abs(math.cos(t * 4.5)) * 0.6, 0, 0)
		pose.leftHip = CFrame.Angles(-math.sin(t * 4.5) * 0.85, 0, math.rad(12))
		pose.rightHip = CFrame.Angles(math.sin(t * 4.5) * 0.85, 0, -math.rad(12))
		pose.leftKnee = CFrame.Angles(math.abs(math.sin(t * 4.5)) * 0.7, 0, 0)
		pose.rightKnee = CFrame.Angles(math.abs(math.cos(t * 4.5)) * 0.7, 0, 0)
	elseif style == "wave" or style == "chill" then
		pose.leftShoulder = CFrame.Angles(math.rad(90), 0, math.rad(90) + math.sin(t * 2) * 0.6)
		pose.rightShoulder = CFrame.Angles(math.rad(70), 0, -math.rad(90) - math.cos(t * 2) * 0.6)
		pose.leftElbow = CFrame.Angles(math.sin(t * 2) * 0.8, 0, 0)
		pose.rightElbow = CFrame.Angles(math.cos(t * 2) * 0.8, 0, 0)
		pose.leftHip = CFrame.Angles(0, 0, math.sin(t * 1.5) * 0.3)
		pose.rightHip = CFrame.Angles(0, 0, -math.sin(t * 1.5) * 0.3)
	elseif style == "kpop" or style == "anime_kawaii" then
		pose.leftShoulder = CFrame.Angles(math.rad(110) + math.sin(t * 3.5) * 0.5, math.cos(t * 3.5) * 0.35, math.rad(45))
		pose.rightShoulder = CFrame.Angles(math.rad(110) - math.sin(t * 3.5) * 0.5, -math.cos(t * 3.5) * 0.35, -math.rad(45))
		pose.leftElbow = CFrame.Angles(math.rad(45) + math.sin(t * 3.5) * 0.4, 0, 0)
		pose.rightElbow = CFrame.Angles(math.rad(45) - math.sin(t * 3.5) * 0.4, 0, 0)
		pose.leftHip = CFrame.Angles(math.sin(t * 3.5) * 0.5, 0, math.rad(18))
		pose.rightHip = CFrame.Angles(-math.sin(t * 3.5) * 0.5, 0, -math.rad(18))
		pose.leftKnee = CFrame.Angles(math.abs(math.sin(t * 3.5)) * 0.4, 0, 0)
		pose.rightKnee = CFrame.Angles(math.abs(math.cos(t * 3.5)) * 0.4, 0, 0)
	elseif style == "hiphop" or style == "breakdance" then
		pose.leftShoulder = CFrame.Angles(math.sin(t * 4) * 1.3, math.sin(t * 2) * 0.6, math.rad(30))
		pose.rightShoulder = CFrame.Angles(-math.cos(t * 4) * 1.3, -math.sin(t * 2) * 0.6, -math.rad(30))
		pose.leftElbow = CFrame.Angles(math.rad(40) + math.sin(t * 4) * 0.3, 0, 0)
		pose.rightElbow = CFrame.Angles(math.rad(40) - math.sin(t * 4) * 0.3, 0, 0)
		pose.leftHip = CFrame.Angles(math.cos(t * 4) * 0.7, 0, 0)
		pose.rightHip = CFrame.Angles(-math.cos(t * 4) * 0.7, 0, 0)
		pose.leftKnee = CFrame.Angles(math.abs(math.sin(t * 4)) * 0.5, 0, 0)
		pose.rightKnee = CFrame.Angles(math.abs(math.cos(t * 4)) * 0.5, 0, 0)
	elseif style == "hype" or style == "hype_jump" then
		pose.leftShoulder = CFrame.Angles(math.rad(165) + math.sin(t * 5) * 0.45, 0, math.rad(25))
		pose.rightShoulder = CFrame.Angles(math.rad(165) + math.cos(t * 5) * 0.45, 0, -math.rad(25))
		pose.leftElbow = CFrame.Angles(math.rad(50), 0, 0)
		pose.rightElbow = CFrame.Angles(math.rad(50), 0, 0)
		pose.leftHip = CFrame.Angles(math.sin(t * 5) * 0.6, 0, 0)
		pose.rightHip = CFrame.Angles(-math.sin(t * 5) * 0.6, 0, 0)
		pose.leftKnee = CFrame.Angles(math.abs(math.sin(t * 5)) * 0.6, 0, 0)
		pose.rightKnee = CFrame.Angles(math.abs(math.cos(t * 5)) * 0.6, 0, 0)
	elseif style == "funk" or style == "brazil_funk" then
		pose.leftShoulder = CFrame.Angles(math.rad(80) + math.sin(t * 4.5) * 0.45, 0, math.rad(45))
		pose.rightShoulder = CFrame.Angles(math.rad(80) - math.sin(t * 4.5) * 0.45, 0, -math.rad(45))
		pose.leftElbow = CFrame.Angles(math.rad(60), 0, 0)
		pose.rightElbow = CFrame.Angles(math.rad(60), 0, 0)
		pose.leftHip = CFrame.Angles(math.sin(t * 4.5) * 0.6, 0, math.rad(20))
		pose.rightHip = CFrame.Angles(-math.sin(t * 4.5) * 0.6, 0, -math.rad(20))
		pose.leftKnee = CFrame.Angles(math.abs(math.sin(t * 4.5)) * 0.5, 0, 0)
		pose.rightKnee = CFrame.Angles(math.abs(math.cos(t * 4.5)) * 0.5, 0, 0)
	elseif style == "aura_floating" then
		pose.root = CFrame.new(0, 1.2 + math.sin(t * 2) * 0.4, 0) * CFrame.Angles(0, math.sin(t * 1.5) * 0.3, 0)
		pose.leftShoulder = CFrame.Angles(math.rad(40), 0, math.rad(75) + math.sin(t * 2) * 0.2)
		pose.rightShoulder = CFrame.Angles(math.rad(40), 0, -math.rad(75) - math.sin(t * 2) * 0.2)
		pose.leftElbow = CFrame.Angles(math.rad(30), 0, 0)
		pose.rightElbow = CFrame.Angles(math.rad(30), 0, 0)
		pose.leftHip = CFrame.Angles(math.rad(20), 0, math.rad(15))
		pose.rightHip = CFrame.Angles(math.rad(20), 0, -math.rad(15))
		pose.leftKnee = CFrame.Angles(math.rad(35), 0, 0)
		pose.rightKnee = CFrame.Angles(math.rad(35), 0, 0)
	else
		pose.leftShoulder = CFrame.Angles(math.sin(t * 3) * 0.7, 0, math.rad(35) + math.sin(t * 1.5) * 0.3)
		pose.rightShoulder = CFrame.Angles(-math.sin(t * 3) * 0.7, 0, -math.rad(35) - math.sin(t * 1.5) * 0.3)
		pose.leftHip = CFrame.Angles(math.sin(t * 3) * 0.45, 0, 0)
		pose.rightHip = CFrame.Angles(-math.sin(t * 3) * 0.45, 0, 0)
		pose.leftKnee = CFrame.Angles(math.abs(math.sin(t * 3)) * 0.35, 0, 0)
		pose.rightKnee = CFrame.Angles(math.abs(math.cos(t * 3)) * 0.35, 0, 0)
	end

	return pose, bounce, bodyTilt
end

function ProceduralDance.Update()
	local now = os.clock()

	for character, data in pairs(activeDancers) do
		if not character or not character.Parent then
			activeDancers[character] = nil
		else
			local hrp = getHumanoidRootPart(character)
			if not hrp or not data.baseRootCFrame then
				activeDancers[character] = nil
			else
				local t = (now * 4.7 * data.timeScale) + data.phaseOffset
				local pose, bounce, bodyTilt = buildPose(data.style, t)
				local swayX = math.sin(t * 1.5) * 0.1
				local swayZ = math.cos(t * 1.3) * 0.04

				hrp.CFrame = data.baseRootCFrame
					* CFrame.new(swayX, bounce * 0.32, swayZ)
					* CFrame.Angles(0, math.sin(t * 0.7) * 0.14, bodyTilt * 0.4)

				setTransform(data.joints, data.originalTransforms, "RootJoint", pose.root)
				setTransform(data.joints, data.originalTransforms, "Waist", pose.waist)
				setTransform(data.joints, data.originalTransforms, "Neck", pose.neck)
				setTransform(data.joints, data.originalTransforms, "Left Shoulder", pose.leftShoulder)
				setTransform(data.joints, data.originalTransforms, "Right Shoulder", pose.rightShoulder)
				setTransform(data.joints, data.originalTransforms, "Left Elbow", pose.leftElbow)
				setTransform(data.joints, data.originalTransforms, "Right Elbow", pose.rightElbow)
				setTransform(data.joints, data.originalTransforms, "Left Hip", pose.leftHip)
				setTransform(data.joints, data.originalTransforms, "Right Hip", pose.rightHip)
				setTransform(data.joints, data.originalTransforms, "Left Knee", pose.leftKnee)
				setTransform(data.joints, data.originalTransforms, "Right Knee", pose.rightKnee)
			end
		end
	end
end

return ProceduralDance
