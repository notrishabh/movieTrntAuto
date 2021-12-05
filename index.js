const pup = require("puppeteer");
const prompt = require("prompt-sync")();
const { exec } = require("child_process");

const movie = prompt("Movie Name ? ");
console.log(`Searching ${movie}`);

//Delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
	const ext =
		"/home/rishabh/.config/google-chrome/Default/Extensions/cfhdojbkjhnklbpkdaibdccddilifddb/3.11.4_0";
	const datadir = "/home/rishabh/.config/google-chrome/Default";
	const downloadPath = "/home/rishabh/Downloads/Torrent/";
	const browser = await pup.launch({
		headless: false,
		executablePath: "/usr/bin/google-chrome",
		userDataDir: datadir,
		args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
	});
	const page = await browser.newPage();
	await page.setViewport({
		width: 1600,
		height: 900,
	});

	//Opening Website
	await page.goto("https://www.yts.vc");

	//Search bar
	await page.type("#main-search-fields > input[type=search]", movie);
	await page.keyboard.press(String.fromCharCode(13));

	//First Movie
	await page.waitForSelector(
		"body > div.main-content > div.browse-content > div > section > div > div:nth-child(1) > a"
	);

	// Get top 5 movies instead of one
	const fiveMovies = await page.evaluate(() => {
		const allMoviesDivs = Array.from(
			document.querySelectorAll(".browse-movie-bottom")
		);
		return allMoviesDivs.map((film) => film.innerText);
	});

	//Print A LIST WITH NUMBERING
	for (let i = 1; i <= fiveMovies.length; i++) {
		console.log(i + ". " + fiveMovies[i - 1].split("\n")[0], "\n");
	}

	// select one with a prompt
	const selectedMovie = prompt(`Select (1 - ${fiveMovies.length}) ? `);
	if (selectedMovie < 1 || selectedMovie > fiveMovies.length) {
		await browser.close();
		console.log("Incorrect Selection");
		return;
	}

	//Click Selected movie
	await page.click(
		`body > div.main-content > div.browse-content > div > section > div > div:nth-child(${selectedMovie}) > div > a`
	);

	//Download Button Green
	await page.waitForSelector("#movie-poster > a");
	await delay(2000);
	await page.waitForTimeout(2000);
	await page
		.click("#movie-poster > a")
		.then(() => console.log("Download Button clicked"));

	//Wait for Download Torrent
	await page
		.waitForSelector(
			"#movie-content > div:nth-child(1) > div.modal.modal-download.hidden-xs.hidden-sm.modal-active > div > div.modal-content > div:nth-child(2) > a.download-torrent.button-green-download2-big"
		)
		.then(() => console.log("Torrent loaded"));

	//Get Torrent File Name
	const fileName = await page.evaluate(() => {
		const trnt = document.querySelector(
			"#movie-content > div:nth-child(1) > div.modal.modal-download.hidden-xs.hidden-sm.modal-active > div > div.modal-content > div:nth-child(2) > a.download-torrent.button-green-download2-big"
		);
		const href = trnt.href;
		const splitHref = href.split("torrents/")[1];
		return Promise.resolve(splitHref);
	});

	//Download Torrent
	await page
		.click(
			"#movie-content > div:nth-child(1) > div.modal.modal-download.hidden-xs.hidden-sm.modal-active > div > div.modal-content > div:nth-child(2) > a.download-torrent.button-green-download2-big"
		)
		.then(() => console.log("Torrent Button Clicked", fileName));

	//Change Download Path
	await page._client
		.send("Page.setDownloadBehavior", {
			behavior: "allow",
			downloadPath: downloadPath,
		})
		.then(() => {
			console.log("Downloaded torrent file");
		});
	await delay(3000);
	await browser.close();

	//Open Transmission using shell script
	const finalPath = downloadPath + fileName;
	console.log(finalPath);
	exec(`transmission-gtk ${finalPath}`, (error, stdout, stderr) => {
		console.log("Open Transmission ", finalPath);
		if (error) {
			console.log(`error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
		}
		console.log(`stdout: ${stdout}`);
	});
})();
