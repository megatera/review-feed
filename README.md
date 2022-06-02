## Installation

- Install [node.js](http://nodejs.org/)
- Clone repo and run `npm install` to install dependencies
- Run `npm start` to start server

## Managing subscriptions

To manage a subscription, send a POST request to the `/subscription` endpoint. 

### Parameters:
| Parameter | Description                                                                                                    |
|-----------|----------------------------------------------------------------------------------------------------------------|
| appId     | 9-digit id (can be obtained from the app store url - eg. https://apps.apple.com/us/app/snapchat/id447188370)   |
| command   | `start` to activate subscription or `stop` to pause it                                                         |
| hour      | hour in the day to run the job (0-23); <i>* only required when starting/restarting a subscription</i>          |
| minute    | minutes past the hour to run the job (0-59); <i>* only required when starting/restarting a subscription</i>    |
| limit     | max number of reviews to include in each digest; <i>* only required when starting/restarting a subscription</i>|

### Example:
To start a subscription to app with id 447188370 and deliver daily digest every day at 9:25 PM with 5 reviews.

http://localhost:3000/subscription?appId=447188370&command=start&hour=21&minute=25&limit=5

To pause it:
http://localhost:3000/subscription?appId=447188370&command=stop

## To do
- test suite
- error handler missing/incorrect params
- ability to configure timezone
- modularize cron scheduling

