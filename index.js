/**
 * A Bot for Slack!
 */
var fs = require('fs');
require('dotenv').load();
const WebSocket = require('ws');
const https = require("https");

var botData = {
    companyList: [],
    challenger: '',
    challengee: '',
    countdownTimer: {
        year: '',
        month: '',
        day: '',
        hour: '',
        minute: ''
    }
};

var yearPicker = [2018, 2019, 2020];

var monthPicker = ["January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"];

var dayPicker = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
var hourPicker = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var meridianPicker = ['am', 'pm'];
var minutePicker = [0, 15, 30, 45];


function saveData() {
    fs.writeFile("./data.json", JSON.stringify(botData), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("Successfully saved the file");
    });
}

function loadData() {
    fs.readFile("./data.json", function read(err, data) {
        if (err) {
            throw err;
        }
        console.log('DATA: ' + data);
        if (data.length > 0) {
            console.log('madeithere');
            botData = JSON.parse(data);
        }
    });
}

/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({ user: installer }, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


function displayArray(arr) {
    i = 0;
    returnvalue = '';
    arr.forEach(function (item) {
        returnvalue += i + ': ' + item + '\n';
        i++;
    })
    return returnvalue;
}

/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({ mongoUri: process.env.MONGOLAB_URI }),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN) ? './db_slack_bot_ci/' : './db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */
if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

// read data from json file if it exists
loadData();


controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});




//********************************************
// Companies Section
//********************************************
controller.hears(
    ['add company'],
    ['direct_message', 'mention', 'direct-mention'],
    function (bot, message) {
        bot.startConversation(message, function (err, convo) {
            convo.ask('What company do you want to add?', function (answer, convo) {
                botData.companyList.push(answer.text);

                saveData();
                // do something with this answer!
                // storeTacoType(convo.context.user, taco_type);
                convo.say("I have added " + answer.text + " to the list."); // add another reply
                convo.next(); // continue with conversation
            });
        });
    });

controller.hears(
    ['list companies', 'list company'],
    ['direct_mention', 'mention', 'direct_message'],
    function (bot, message) {
        response = 'The companies participating in the Guantlet Challenge are: \n';
        botData.companyList.forEach(function (item) {
            response += item + '\n';
        })
        bot.reply(message, response);
    });

controller.hears(
    ['drop companies', 'delete company'],
    ['drop companies', 'delete company'],
    ['direct_mention', 'mention', 'direct_message'],
    function (bot, message) {
        response = 'The companies participating in the Guantlet Challenge are: \n';
        botData.companyList.forEach(function (item) {
            response += item + '\n';
        })
        bot.reply(message, response);
    });

//************************************************
// Challenger Section
//************************************************
controller.hears(
    ['register challenger'],
    ['direct_message', 'mention', 'direct-mention'],
    function (bot, message) {
        bot.startConversation(message, function (err, convo) {
            question = 'Please type the number of the company that will become the challenger:\n';
            question += displayArray(botData.companyList);

            convo.ask(question, function (answer, convo) {
                index = parseInt(answer.text);

                if ((typeof index == "number") &&
                    (index <= botData.companyList.length) &&
                    (index >= 0)
                ) {
                    botData.challenger = botData.companyList[index];
                    saveData();
                    convo.say(botData.challenger + " is now the challenger.");
                } else {
                    convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                }

                convo.next(); // continue with conversation
            });
        });
    });

controller.hears(
    ['who is the challenger', 'list challenger', 'challenger'],
    ['direct_mention', 'mention', 'direct_message'],
    function (bot, message) {
        response = 'The challenger is: ' + botData.challenger;
        bot.reply(message, response);
    });


//************************************************
// START CHALLENGE
//************************************************
controller.hears(
    ['Challenge', 'challenge'],
    ['direct_message', 'mention', 'direct-mention'],
    function (bot, message) {
        bot.startConversation(message, function (err, convo) {
            convo.say('Oh boy, challenge time!');
            question = 'The gauntlet will be dropped\nPlease pick a number for the company you want to challenge:\n';
            i = 0;
            botData.companyList.forEach(function (item) {
                question += i + ': ' + item + '\n';
                i++;
            })

            convo.ask(question, function (answer, convo) {
                index = parseInt(answer.text);

                if ((typeof index == "number") &&
                    (index <= botData.companyList.length) &&
                    (index >= 0)
                ) {
                    if (botData.companyList[index] == botData.challenger) {
                        convo.say("You can't challenge yourself now.  Wait until you're alone tonight");
                    } else {
                        botData.challengee = botData.companyList[index];
                        saveData();
                        convo.say("THE CHALLENGE IS SET");
                        convo.say(":boom:It's " + botData.challenger + ' versus ' + botData.challengee + ":boom:");
                    }
                } else {
                    convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                }

                convo.next(); // continue with conversation
            });
        });
    });


//************************************************
// Set Countdown
//************************************************
controller.hears(
    ['set timer', 'set countdown'],
    ['direct_message', 'mention', 'direct-mention'],
    function (bot, message) {
        bot.startConversation(message, function (err, convo) {
            question = 'Please type the number of the year:\n';
            question += displayArray(yearPicker);

            convo.ask(question, function (answer, convo) {
                index = parseInt(answer.text);

                if ((typeof index == "number") &&
                    (index <= yearPicker.length) &&
                    (index >= 0)
                ) {
                    botData.countdownTimer.year = yearPicker[index];

                    question2 = 'Please type the number of the month:\n';
                    question2 += displayArray(monthPicker);

                    convo.ask(question2, function (answer, convo) {
                        index = parseInt(answer.text);

                        if ((typeof index == "number") &&
                            (index <= monthPicker.length) &&
                            (index >= 0)
                        ) {
                            botData.countdownTimer.month = monthPicker[index];

                            question3 = 'Day?:\n';
                            question3 += displayArray(dayPicker);

                            convo.ask(question3, function (answer, convo) {
                                index = parseInt(answer.text);

                                if ((typeof index == "number") &&
                                    (index <= dayPicker.length) &&
                                    (index >= 0)
                                ) {
                                    botData.countdownTimer.day = dayPicker[index];

                                    question4 = 'Hour?\n';
                                    question4 += displayArray(hourPicker);

                                    convo.ask(question4, function (answer, convo) {
                                        index = parseInt(answer.text);

                                        if ((typeof index == "number") &&
                                            (index <= hourPicker.length) &&
                                            (index >= 0)
                                        ) {
                                            botData.countdownTimer.hour = hourPicker[index];

                                            question5 = 'AM or PM?\n';
                                            question5 += displayArray(meridianPicker);

                                            convo.ask(question5, function (answer, convo) {
                                                index = parseInt(answer.text);

                                                if ((typeof index == "number") &&
                                                    (index <= meridianPicker.length) &&
                                                    (index >= 0)
                                                ) {
                                                    if (index == 1) {
                                                        botData.countdownTimer.hour += 12;
                                                    }
                                                    question6 = 'Minute?\n';
                                                    question6 += displayArray(minutePicker);

                                                    convo.ask(question6, function (answer, convo) {
                                                        index = parseInt(answer.text);

                                                        if ((typeof index == "number") &&
                                                            (index <= minutePicker.length) &&
                                                            (index >= 0)
                                                        ) {

                                                            botData.countdownTimer.minute = minutePicker[index];
                                                            saveData();
                                                            convo.say("The timer is now set for: " + botData.countdownTimer.year +
                                                                "-" + botData.countdownTimer.month +
                                                                "-" + botData.countdownTimer.day +
                                                                " " + botData.countdownTimer.hour +
                                                                ":" + botData.countdownTimer.minute);
                                                        } else {
                                                            convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                                                        }

                                                        convo.next(); // continue with conversation
                                                    });
                                                } else {
                                                    convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                                                }

                                                convo.next(); // continue with conversation
                                            });
                                        } else {
                                            convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                                        }

                                        convo.next(); // continue with conversation
                                    });
                                } else {
                                    convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                                }

                                convo.next(); // continue with conversation
                            });






                        } else {
                            convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                        }

                        convo.next(); // continue with conversation
                    });

                } else {
                    convo.say("Nice try funny guy \"" + answer.text + "\" is not a valid answer");
                }

                convo.next(); // continue with conversation
            });
        });
    });

controller.hears(
    ['get timer'],
    ['direct_mention', 'mention', 'direct_message'],
    function (bot, message) {
        bot.reply(message, "The timer is now set for: " + botData.countdownTimer.year +
            "-" + botData.countdownTimer.month +
            "-" + botData.countdownTimer.day +
            " " + botData.countdownTimer.hour +
            ":" + botData.countdownTimer.minute);
    });
//************************************************
// Stupid easter egg section
//************************************************
controller.hears(
    ['hello', 'hi', 'greetings'],
    ['direct_mention', 'mention', 'direct_message'],
    function (bot, message) {
        bot.reply(message, 'Hello!');
    });


/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
controller.on('direct_message,mention,direct_mention', function (bot, message) {
    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function (err) {
        if (err) {
            console.log(err)
        }
        bot.reply(message, 'Instructions Unclear.  GauntletBot now stuck in ceiling fan.');
    });
});



//***************************************************
// WEB SOCKET STUFF
// should this be here?  definitely not but i'm hacking it together so deal with it
//***************************************************

//const WebSocket = require('ws');

const server = https.createServer({
    cert: fs.readFileSync('/etc/letsencrypt/live/yeggauntlet.com/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/yeggauntlet.com/privkey.pem')
});

const wss = new WebSocket.Server({server, port:9999});

wss.on('connection', function connection(ws) {
    console.log('here1');
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    console.log('here2: ' + botData);
    ws.send(JSON.stringify(botData));

    console.log('here3');
});
server.listen(function listening () {
    //
    // If the `rejectUnauthorized` option is not `false`, the server certificate
    // is verified against a list of well-known CAs. An 'error' event is emitted
    // if verification fails.
    //
    // The certificate used in this example is self-signed so `rejectUnauthorized`
    // is set to `false`.
    //
    const ws = new WebSocket(`wss://localhost:${server.address().port}`, {
      rejectUnauthorized: false
    });
  
    ws.on('open', function open () {
      ws.send('All glory to WebSockets!');
    });
  });