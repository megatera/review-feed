const axios = require("axios"); // HTTP client
const fs = require("fs"); // file system interface
const json2md = require("json2md"); // convert JSON to markdown

module.exports = async function generateDailyDigest(appId, limit) {
  // fetch reviews
  const raw = await axios.get(
    `https://itunes.apple.com/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/page=1/json`
  );
  let reviews = raw.data.feed.entry;

  // get date of most recent review in cache if available
  // filter reviews for those dated after most recent from cache
  let mostRecent = null;
  const regEx = /^### Date: (.*$)/m;
  const cacheData = fs
    .readFileSync(`cache_${appId}.md`, { flag: "a+" }) // 'a+' flag to create cache file if it doesn't exist
    .toString();

  if (cacheData.length > 0) {
    mostRecent = new Date(cacheData.match(regEx)[1]);
  }

  if (mostRecent !== null) {
    reviews = reviews.filter(
      (entry) => new Date(entry.updated.label) > mostRecent
    );
  }

  // iterate over fetched reviews up (till desired limit) and convert to markdown
  let dailyDigest = "";

  for (let i = reviews.length - 1; i > reviews.length - 1 - limit && i >= 0; i--) {
    json2md.converters.label = function (input) {
      return input;
    };

    dailyDigest = "***\n\n" + dailyDigest;
    dailyDigest = json2md(reviews[i].content) + dailyDigest;
    dailyDigest = "### Rating: " + json2md(reviews[i]["im:rating"]) + dailyDigest;
    dailyDigest = "### Author: " + json2md(reviews[i].author.name) + dailyDigest;
    dailyDigest = "### Date: " + json2md(reviews[i].updated) + dailyDigest;
    dailyDigest = "# " + json2md(reviews[i].title) + dailyDigest;
  }

  // updated cache content
  const updatedCache = dailyDigest + cacheData;

  // generate daily digest and update cache files
  let timestamp = Date();
  if (dailyDigest.length === 0) {
    dailyDigest = "No new reviews today";
  }

  fs.writeFile(`Daily_Digest_${appId}_${timestamp}.md`, dailyDigest, (err) => {
    if (err) throw err;
    console.log(`Daily digest for ${appId} created ${timestamp}`);
  });

  fs.writeFile(`cache_${appId}.md`, updatedCache, (err) => {
    if (err) throw err;
    console.log(`Review cache for ${appId} updated ${timestamp}`);
  });
};
