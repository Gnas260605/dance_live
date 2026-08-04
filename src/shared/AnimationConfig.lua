local AnimationConfig = {}

AnimationConfig.ThemeOrder = {
	"TIKTOK_VN_TREND",
	"KPOP_VIRAL",
	"EDM_FESTIVAL",
	"HIPHOP_STREET",
}

AnimationConfig.Themes = {
	TIKTOK_VN_TREND = {
		name = "🔥 TikTok Vietnam Trend",
		ledColor = Color3.fromRGB(255, 0, 127),
		laserColor = Color3.fromRGB(255, 0, 127),
		lightingColor = Color3.fromRGB(255, 0, 127),
		music = {
			{ id = "rbxassetid://1837879082", name = "See Tình (Remix Beat)" },
			{ id = "rbxassetid://1838901234", name = "Cắt Đôi Nỗi Sầu (Speed Up)" },
			{ id = "rbxassetid://1849012345", name = "Waiting For You (Disco Beat)" },
		},
		dances = { "shuffle", "wave", "bounce" }
	},
	KPOP_VIRAL = {
		name = "✨ K-Pop Viral Hits",
		ledColor = Color3.fromRGB(148, 0, 211),
		laserColor = Color3.fromRGB(148, 0, 211),
		lightingColor = Color3.fromRGB(148, 0, 211),
		music = {
			{ id = "rbxassetid://1847648398", name = "Super Shy (Dance Beat)" },
			{ id = "rbxassetid://1837871234", name = "Cupid (Twin Ver. Remix)" },
			{ id = "rbxassetid://1845678901", name = "Flower (TikTok Challenge)" },
		},
		dances = { "kpop", "wave", "sync" }
	},
	EDM_FESTIVAL = {
		name = "🎧 EDM Festival Rave",
		ledColor = Color3.fromRGB(0, 200, 255),
		laserColor = Color3.fromRGB(0, 200, 255),
		lightingColor = Color3.fromRGB(0, 200, 255),
		music = {
			{ id = "rbxassetid://1841234567", name = "Ultra Rave Drop 2026" },
			{ id = "rbxassetid://1842345678", name = "Phonk Bass Boost" },
		},
		dances = { "hype", "shuffle", "bounce" }
	},
	HIPHOP_STREET = {
		name = "🎤 Hip-Hop & Street Dance",
		ledColor = Color3.fromRGB(255, 215, 0),
		laserColor = Color3.fromRGB(255, 215, 0),
		lightingColor = Color3.fromRGB(255, 215, 0),
		music = {
			{ id = "rbxassetid://1843456789", name = "Street Trap Beat" },
			{ id = "rbxassetid://1844567890", name = "B-Boy Groove Drop" },
		},
		dances = { "hiphop", "bounce", "breakdance" }
	}
}

-- Fallback backward-compatibility support
AnimationConfig.Themes.PHONK = AnimationConfig.Themes.EDM_FESTIVAL
AnimationConfig.Themes.TIKTOK_TREND = AnimationConfig.Themes.TIKTOK_VN_TREND
AnimationConfig.Themes.EDM_HYPE = AnimationConfig.Themes.EDM_FESTIVAL
AnimationConfig.Themes.HIPHOP = AnimationConfig.Themes.HIPHOP_STREET

function AnimationConfig.GetRandomMusic(themeKey)
	local theme = AnimationConfig.Themes[themeKey]
	if theme and theme.music and #theme.music > 0 then
		local track = theme.music[math.random(1, #theme.music)]
		if type(track) == "table" then
			return track.id, track.name
		else
			return track, "Track #" .. math.random(1, 99)
		end
	end
	return "rbxassetid://1837879082", "K-Pop Stage Anthem"
end

return AnimationConfig
