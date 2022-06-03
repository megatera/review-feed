const express = require("express"); // server tooling; less verbose than vanilla Node
const cron = require("node-cron"); // task scheduler
const fs = require("fs"); // native file system module
const generateDailyDigest = require("./generateDailyDigest");

const app = express();
const PORT = 3000;

// run existing tasks on startup and populate task map
let existingTasks = fs.readFileSync("./taskCache.json");
const taskCache = JSON.parse(existingTasks);
const taskMap = new Map();

for (const app in taskCache) {
  const job = cron.schedule(
    `${taskCache[app].minute} ${taskCache[app].hour} * * *`,
    () => {
      console.log(`⏲  Scheduled service running: ${new Date()}`);
      generateDailyDigest(app, taskCache[app].limit);
    },
    {
      scheduled: taskCache[app].scheduled,
    }
  );
  taskMap.set(app, job);
}

if (taskMap.size === Object.keys(taskCache).length) {
  console.log("Existing tasks scheduled");
} else {
  console.log("Error loading tasks");
}

// handle parsing body and url parameters
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// endpoint to manage subscription
app.post(
  "/subscription?:appId",

  // subscription controller - modularize?
  (req, res, next) => {
    try {
      const { appId, command, minute, hour, limit } = req.query;

      // validate request parameters
      if (isNaN(Number(appId)) || appId.length !== 9) {
        return next({
          log: `Express error handler caught in subscription controller ERROR: Invalid app id`,
          status: 400,
          message: {
            err: "Invalid app id",
          },
        });
      }

      if (!(command === "start" || command === "stop")) {
        return next({
          log: `Express error handler caught in subscription controller ERROR: Invalid command.`,
          status: 400,
          message: {
            err: "Invalid command",
          },
        });
      }

      if (command === "start" && (minute === undefined || hour === undefined || limit === undefined)) {
        return next({
          log: `Express error handler caught in subscription controller ERROR: Missing parameters`,
          status: 400,
          message: {
            err: "Missing parameters",
          },
        });
      }

      if (isNaN(Number(minute)) || Number(minute) > 59 || Number(minute) < 0 ) {
        return next({
          log: `Express error handler caught in subscription controller ERROR: Invalid minute parameter`,
          status: 400,
          message: {
            err: "Invalid minute parameter",
          },
        });
      }

      if (isNaN(Number(hour)) || Number(hour) > 23 || Number(hour) < 0 ) {
        return next({
          log: `Express error handler caught in subscription controller ERROR: Invalid hour parameter`,
          status: 400,
          message: {
            err: "Invalid hour parameter",
          },
        });
      }

      if (isNaN(Number(limit)) || Number(limit) <= 0) {
        return next({
          log: `Express error handler caught in subscription controller ERROR: Invalid limit parameter`,
          status: 400,
          message: {
            err: "Invalid limit parameter",
          },
        });
      }

      const existingTasks = fs.readFileSync("./taskCache.json");
      const taskCache = JSON.parse(existingTasks);

      // schedule cron job if it doesn't already exist and add to task map and cache
      if (!taskMap.has(appId)) {
        const task = cron.schedule(
          `${minute} ${hour} * * *`,
          () => {
            console.log(`⏲  Scheduled service running: ${new Date()} `);
            generateDailyDigest(appId, Number(limit));
          },
          {
            scheduled: false,
          }
        );
        taskMap.set(appId, task);
        taskCache[appId] = {
          minute: minute,
          hour: hour,
          scheduled: false,
          limit: Number(limit),
        };
      }

      // start/stop cron job and update cache
      if (command === "start") {
        // handle changes to scheduling parameters / limit
        if (
          taskCache[appId].minute !== minute ||
          taskCache[appId].hour !== hour ||
          taskCache[appId].limit !== limit
        ) {
          taskMap.get(appId).stop();
          const newTask = cron.schedule(
            `${minute} ${hour} * * *`,
            () => {
              console.log(`⏲  Scheduled service running: ${new Date()} `);
              generateDailyDigest(appId, Number(limit));
            },
            {
              scheduled: false,
            }
          );
          taskMap.set(appId, newTask);
        }
        taskMap.get(appId).start();
        taskCache[appId] = {
          minute: minute,
          hour: hour,
          scheduled: true,
          limit: Number(limit),
        };
        fs.writeFile("./taskCache.json", JSON.stringify(taskCache), (err) => {
          if (err) throw err;
          console.log(`Updated ${appId} in task cache`);
        });
      }

      if (command === "stop") {
        taskMap.get(appId).stop();
        taskCache[appId].scheduled = false;
        fs.writeFile("./taskCache.json", JSON.stringify(taskCache), (err) => {
          if (err) throw err;
          console.log(`Updated ${appId} in task cache`);
        });
      }

      next();
    } catch (err) {
      return next({
        log: `Express error handler caught in subscription controller ERROR: ${err}`,
        message: {
          err: "Error in subscription controller. Check server logs for details.",
        },
      });
    }
  },

  // send response to client
  (req, res) => {
    const { appId, command } = req.query;
    res
      .status(200)
      .send(
        `Subscription to ${appId} ${command === "start" ? "starte" : "pause"}d.`
      );
  }
);

// catch-all route handler for any requests to an unknown route
app.use((req, res) => res.status(404).send("This is not the way..."));

// global error handler
app.use((err, req, res, next) => {
  const defaultErr = {
    log: "Express error handler caught unknown middleware error",
    status: 500,
    message: { err: "An error occurred" },
  };
  const errorObj = Object.assign({}, defaultErr, err);
  console.log(errorObj);
  return res.status(errorObj.status).json(errorObj.message);
});

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log("Server listening on PORT", PORT);
});

module.exports = app;
