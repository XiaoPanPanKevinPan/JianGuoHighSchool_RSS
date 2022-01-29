const http = require('http');
const xml = require('xmlbuilder2');

(async ()=>{
	const fetch = (await import('node-fetch')).default;

	const hostname = '127.0.0.1';
	const port = 3000;

	const server = http.createServer(async (req, res) => {
		res.statusCode = 200;
		// res.setHeader('Content-Type', 'application/json');
		// res.setHeader('Content-Type', 'application/rss+xml');
		res.setHeader('Content-Type', "application/xml"); // 原本上式亦可，但是在 firefox 會自動變成下載

		let isOk = false;
		let newses = [];
		for(let i=1; i<=5; i++){
			let fetchResponse = await fetch(
				"https://wwws.ck.tp.edu.tw/api/news/news",
				{
					method: "POST",
					body: JSON.stringify( {page: i} )
				}
			);

			if(fetchResponse.ok){
				isOk = true;
			}else{
				console.log(`fetch failed at page=${i}`);
				continue;
			}

			let originJson = await fetchResponse.json();
			if(originJson.status != "success"){
				console.log(`fetch page=${i} successed but the api returned weird status "${originJson.status}"`);
				continue;
			}

			newses = newses.concat(originJson.message.newses);
			console.log(`fetch page=${i} succeeded `);
		}

		if(isOk){
			// let responseText = await response.text();
			let basementObj = { rss: {
				"@version": "2.0",
				"@xmlns:atom": "http://www.w3.org/2005/Atom",
				channel: {
					title: "建中最新消息",
					link: "https://www2.ck.tp.edu.tw/news",
					description: "建國中學最新消息。取自官網。",
					language: "zh-tw",
					// pubDate: (new Date()).toUTCString(),
						// unimplemented
					// lastBuildDate : "",
						// unimplemented
					docs: "https://validator.w3.org/feed/docs/rss2.html#sampleFiles", // 用於給予幾百年後的人看看 rss 是什麼
					ttl: "15",
						/*
						 *	ttl == time to live, 即最長緩存時間（單位：分鐘）。
						 *	如果有個服務幫忙緩存之以減輕伺服器負擔，那麼它至少 15min 更新一次。
						 */
					image: {
						url: "https://cdn.discordapp.com/attachments/918516223979974732/932262056881705040/example.png",
						title: "建中最新消息",
						link: "https://www2.ck.tp.edu.tw/news",
						description: "建國中學圖標"
					},
					"atom:link": {
						"@href": "", // unimplemented. Left for the link of rss in the future
						"@rel": "self",
						"@type": "application/xml" // 也可以 application/rss+xml 但是在 firefox 會自動變成「下載」
					},
					item: [],
				}
			}};

			for(let news of newses){
				let itemObj = {
					title: news.name,
					link: `https://www2.ck.tp.edu.tw/news/${news.id}`,
					description: news.content,
					author: `${news.user.officee.name}${(news.user.groupp != null) ? news.user.groupp.name : ""} ${news.user.name}`,
						// 形如 "教務處教學組 acad12@gl.ck.tp.edu.tw"
					category: (news.tagg != null) ? news.tagg.name : "",
						// 諸如 "重要" "公告" "升學" "競賽" 等
					guid: {
						// 該訊息的唯一標示符，建議是指向文章的永久連結
						'@isPermaLink': true,
						'#': `https://www2.ck.tp.edu.tw/news/${news.id}`,
					},
					pubDate: (new Date(news.updated_at)).toUTCString()
				};

				if(news.categoryy != null){
					if(itemObj.category != "") itemObj.category += '/';
					itemObj.category += news.categoryy.name;
				}else{
					if(itemObj.category == "") delete itemObj.category;
				}

				basementObj.rss.channel.item.push(itemObj);
			}

			let rssXmlString = xml.create(basementObj).end({pretty: true});

			// rssXmlString = rssXmlString.replaceAll("&nbsp;", "&#x0020;");
				// 根據 xml 的什麼奇怪規範，符號 '&nbsp;' 不合法。
			rssXmlString = rssXmlString.replace(/&nbsp;/g, "&#x0020;");
				// 爲了較舊版本的 nodejs 兼容性，是故夫改用茲

			res.end(rssXmlString);
			console.log("RSS generation finished.\n");
		}else{
			console.log("All Source is Failed.\n");
		}
	});

	server.listen(port, hostname, () => {
		console.log(`Server running at http://${hostname}:${port}/`);
	});
})();
