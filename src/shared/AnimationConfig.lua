local AnimationConfig = {}

AnimationConfig.ThemeOrder = {
	"TIKTOK_VN_TREND",
	"KPOP_VIRAL",
	"EDM_FESTIVAL",
	"HIPHOP_STREET",
	"LATIN_REGGAETON",
	"BRAZIL_FUNK",
	"JAPAN_JPOP",
	"AFROBEAT",
	"US_POP_HITS",
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
	},
	LATIN_REGGAETON = {
		name = "💃 Latin Reggaeton Hits",
		ledColor = Color3.fromRGB(255, 105, 180),
		laserColor = Color3.fromRGB(255, 105, 180),
		lightingColor = Color3.fromRGB(255, 105, 180),
		music = {
			{ id = "rbxassetid://1837879082", name = "Dákiti (Remix Beat)" },
			{ id = "rbxassetid://1838901234", name = "Despacito (TikTok Remix)" },
			{ id = "rbxassetid://1849012345", name = "Pepas (Festival Edit)" },
		},
		dances = { "reggaeton", "wave", "bounce" }
	},
	BRAZIL_FUNK = {
		name = "🇧🇷 Brazil Funk Rave",
		ledColor = Color3.fromRGB(0, 255, 127),
		laserColor = Color3.fromRGB(0, 255, 127),
		lightingColor = Color3.fromRGB(0, 255, 127),
		music = {
			{ id = "rbxassetid://1847648398", name = "Baile Funk (TikTok Edit)" },
			{ id = "rbxassetid://1837871234", name = "Montagem (Funk Beat)" },
			{ id = "rbxassetid://1845678901", name = "Pop Hold It (Remix)" },
		},
		dances = { "funk", "shuffle", "hype" }
	},
	JAPAN_JPOP = {
		name = "🌸 Japan J-Pop & City Pop",
		ledColor = Color3.fromRGB(255, 182, 193),
		laserColor = Color3.fromRGB(255, 182, 193),
		lightingColor = Color3.fromRGB(255, 182, 193),
		music = {
			{ id = "rbxassetid://1841234567", name = "YOASOBI - Idol (Remix)" },
			{ id = "rbxassetid://1842345678", name = "Kenshi Yonezu - KICK BACK" },
			{ id = "rbxassetid://1843456789", name = "City Pop Groove (Lo-Fi)" },
		},
		dances = { "jpop", "sync", "wave" }
	},
	AFROBEAT = {
		name = "🥁 Afrobeats Global",
		ledColor = Color3.fromRGB(255, 140, 0),
		laserColor = Color3.fromRGB(255, 140, 0),
		lightingColor = Color3.fromRGB(255, 140, 0),
		music = {
			{ id = "rbxassetid://1844567890", name = "Calm Down (Rema Remix)" },
			{ id = "rbxassetid://1845678901", name = "Water (Tyla TikTok)" },
			{ id = "rbxassetid://1846789012", name = "Unavailable (Davido)" },
		},
		dances = { "afrobeat", "bounce", "shuffle" }
	},
	US_POP_HITS = {
		name = "🌟 US Pop Trending Hits",
		ledColor = Color3.fromRGB(138, 43, 226),
		laserColor = Color3.fromRGB(138, 43, 226),
		lightingColor = Color3.fromRGB(138, 43, 226),
		music = {
			{ id = "rbxassetid://1847890123", name = "Flowers (Miley Remix)" },
			{ id = "rbxassetid://1848901234", name = "Anti-Hero (Taylor Beat)" },
			{ id = "rbxassetid://1849012345", name = "Espresso (Sabrina Edit)" },
		},
		dances = { "floss", "robot", "wave" }
	}
}

-- Fallback backward-compatibility support
AnimationConfig.Themes.PHONK = AnimationConfig.Themes.EDM_FESTIVAL
AnimationConfig.Themes.TIKTOK_TREND = AnimationConfig.Themes.TIKTOK_VN_TREND
AnimationConfig.Themes.EDM_HYPE = AnimationConfig.Themes.EDM_FESTIVAL
AnimationConfig.Themes.HIPHOP = AnimationConfig.Themes.HIPHOP_STREET
AnimationConfig.Themes.LATIN = AnimationConfig.Themes.LATIN_REGGAETON
AnimationConfig.Themes.REGGAETON = AnimationConfig.Themes.LATIN_REGGAETON
AnimationConfig.Themes.FUNK = AnimationConfig.Themes.BRAZIL_FUNK
AnimationConfig.Themes.JPOP = AnimationConfig.Themes.JAPAN_JPOP
AnimationConfig.Themes.AFRO = AnimationConfig.Themes.AFROBEAT
AnimationConfig.Themes.POP = AnimationConfig.Themes.US_POP_HITS

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
