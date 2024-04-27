const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = 8080;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.urlencoded({ extended: true }));

// Serve the HTML file
// Home Page
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Comparison Page
app.get("/compare", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "compare.html"));
});

// Main Comparison Endpoint
app.post("/compare", async (req, res) => {
	try {
		const profileUrl1 = req.body.profile1;
		const profileUrl2 = req.body.profile2;

		const profile1Results = await scrapeProfile(profileUrl1);
		const profile2Results = await scrapeProfile(profileUrl2);

		const comparisonResult = compareAchievements(
			profile1Results.achievements,
			profile2Results.achievements,
			profile1Results.profileName,
			profile2Results.profileName
		);
		const total1 = profile1Results.totalAchievements;
		const total2 = profile2Results.totalAchievements;

		// Create HTML for the results
		const account1ResultsHTML = `
            <h3>${profile1Results.profileName} vs ${profile2Results.profileName}</h3>
            <div class="achievements-list">
                <div class="achievement-item">${comparisonResult}</div> 
            </div>
			`;
		//<p>Total Achievements for ${profile1Results.profileName}: ${total1} vs Total Achievements for ${profile2Results.profileName}: ${total2}</p>

		const comparisonHTML = `
        <!DOCTYPE html>
        <html>
          <head>
                <title>Achievement Comparison</title>
                <link rel="stylesheet" href="style.css">
          </head>
            <body class="compare-page">
                <div class="comparison-container">
                  ${account1ResultsHTML}
                </div>
            </body>
        </html>
                  `;

		// Send the HTML response
		res.send(comparisonHTML);
	} catch (error) {
		console.error(`Error in comparison process:`, error);
		res.status(500).send("Error during comparison. Check server logs.");
	}
});

// Scraping function (modified to include total count)
async function scrapeProfile(profileUrl) {
	try {
		const response = await axios(profileUrl);
		const html = response.data;

		const $ = cheerio.load(html);

		const profileName = $(".whiteLink.persona_name_text_content").text().trim();
		const achievements = [];
		$(".achieveTxtHolder", html).each(function () {
			const title = $(this).find(".achieveTxt h3").text().trim();
			const unlockTime = $(this).find(".achieveUnlockTime").text().trim();

			// Check if the achievement is unlocked
			const isUnlocked = $(this).find(".achieveState").length !== 0; // Adjust selector if needed

			achievements.push({
				title,
				unlockTime,
				unlocked: isUnlocked,
			});
		});

		// Calculate total earned achievements
		const totalEarnedAchievements = achievements.filter(
			(ach) => ach.unlocked
		).length;

		return {
			achievements,
			totalAchievements: totalEarnedAchievements,
			profileName,
		};
	} catch (error) {
		console.error(`Error scraping profile ${profileUrl}:`, error);
		return { achievements: [], totalAchievements: 0 };
	}
}

// Enhanced comparison function
function compareAchievements(
	profile1Achievements,
	profile2Achievements,
	profile1Name,
	profile2Name
) {
	let comparisonResult = "Comparison Results:<br>";

	for (const ach1 of profile1Achievements) {
		const matchingAch2 = profile2Achievements.find(
			(ach2) => ach2.title === ach1.title
		);

		if (matchingAch2) {
			comparisonResult += `<p>${ach1.title}: ${profile1Name} (${ach1.unlockTime}) vs ${profile2Name} (${matchingAch2.unlockTime})</p>`;
		} else {
			comparisonResult += `<p>${ach1.title}: Present only in ${profile1Name}</p>`;
		}
	}

	const total1 = profile1Achievements.length;
	const total2 = profile2Achievements.length;
	comparisonResult += `<p>Total Achievements: ${profile1Name} (${total1}) vs ${profile2Name} (${total2})</p>`;

	return comparisonResult;
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
