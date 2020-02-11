const fs = require("fs");
const crypto = require("crypto");
const jsl = require("svjsl");
const package = require("./package.json");
const graphics = require("./data/graphics.json");
const words = require("./data/words.json");

const debuggerActive = (typeof v8debug === "object" || /--debug|--inspect/.test(process.execArgv.join(" ")));


/**
 * @typedef {Object} MenuPromptResult The results of the menu prompt
 * @prop {String} key The key of the selected option
 * @prop {String} description The description of the selected option
 * @prop {String} menuTitle The title of the menu
 * @prop {Number} optionIndex The zero-based index of the selected option
 * @prop {Number} menuIndex The zero-based index of the menu
 */

/**
 * @typedef {Object} RandomWord
 * @prop {Array<String>} split Every character of the randomly selected item in an array
 * @prop {String} word The whole word
 */

/**
 * Starts Node-Hangman
 * @param {Array<MenuPromptResult>} res
 */
function init(res)
{
    clearConsole();

    process.stdin.pause();

    global._guessTries = 0;

    if(!debuggerActive)
        process.stdin.setRawMode(true);

    if(!res || res[0] == undefined || res[0].key == "x")
    {
        sayGoodbye();
        return process.exit(0);
    }

    let difficultyMap = [
        "unused",
        "easy",
        "normal",
        "hard",
        "about",
        "highscores"
    ];

    let difficulty = difficultyMap[parseInt(res[0].key)];

    if(difficulty == "about")
        return aboutGame();
    
    if(difficulty == "highscores")
        return showHighscores();
    
    global._gameDifficulty = difficulty;

    let availableWords = words[difficulty];
    let randomWord = getRandomWord(availableWords);
    let guessedChars = [];

    return renderStage(0, randomWord, guessedChars);
}

/**
 * Renders a stage of the hangman game based on the index, the word to guess and the already guessed letters
 * @param {Number} index 
 * @param {RandomWord} wordToGuess 
 * @param {Array<String>} guessedChars 
 * @param {String} [message]
 * @param {Boolean} [winGame]
 */
function renderStage(index, wordToGuess, guessedChars, message, winGame)
{
    clearConsole();

    process.stdout.write(`${graphics.ceiling}\n`);
    Object.keys(graphics.stages[index]).forEach(key => {
        let line = `${graphics.stageLinePrefix}${jsl.colors.fg.yellow}${graphics.stages[index][key]}${jsl.colors.rst}${graphics.stageLineSuffix}\n`;
        process.stdout.write(line);
    });
    process.stdout.write(`${graphics.floor}\n\n`);

    process.stdout.write(`Word: ${censoredWord(wordToGuess, guessedChars)}\n`);
    process.stdout.write(`Used letters: ${guessedChars.length > 0 ? guessedChars.sort().join(" ") : "(none)"}\n`);

    if(!graphics.stages[index + 1])
        return gameOver(`The word was "${wordToGuess.word}"`);

    if(message)
        console.log(`\n${jsl.colors.fg.yellow}${message}${jsl.colors.rst}`);
    else process.stdout.write("\n\n");

    if(winGame === true)
    {
        let score = (global._guessTries - removeDuplicates(wordToGuess.split).length);
        saveScore(global._gameDifficulty, score);
        return gameWon(score);
    }

    process.stdout.write("\n─► ");
    process.stdin.resume();

    let keypressEvent = (chunk, key) => { //eslint-disable-line no-unused-vars
        if(global._listenerAttached)
        {
            process.stdin.pause();
            removeKeypressEvent();

            // if(key.name == "escape")
            //     return startMenu();

            if(chunk && chunk.match(/\u0003/gmu)) //eslint-disable-line no-control-regex
                return process.exit(0);

            if(chunk && chunk.match(/[A-Z]/gm))
                chunk = chunk.toLowerCase();

            if(!chunk || !chunk.match(/[a-z]/gm))
                return renderStage(index, wordToGuess, guessedChars, "Invalid character!");

            if(guessedChars.includes(chunk))
                return renderStage(index, wordToGuess, guessedChars, "You already tried this letter!");

            global._guessTries++;

            guessedChars.push(chunk);

            let winGame = true;
            wordToGuess.split.forEach(wc => {
                if(!guessedChars.includes(wc))
                    winGame = false;
            });

            if(winGame)
                return renderStage(index, wordToGuess, guessedChars, null, true);

            if(wordToGuess.split.includes(chunk))
                return renderStage(index, wordToGuess, guessedChars);

            return renderStage((++index), wordToGuess, guessedChars);
        }
    };

    let removeKeypressEvent = () => {
        process.stdin.removeListener("keypress", keypressEvent);
        global._listenerAttached = false;
    };

    process.stdin.on("keypress", keypressEvent);
    global._listenerAttached = true;
}

/**
 * Returns the word from `wordToGuess` with all characters but the ones included in `guessedChars` replaced by the placeholder character
 * @param {RandomWord} wordToGuess 
 * @param {Array<String>} guessedChars 
 */
function censoredWord(wordToGuess, guessedChars)
{
    if(Array.isArray(guessedChars) && guessedChars.length <= 0)
        return wordToGuess.word.replace(/[a-zA-Z]/gm, graphics.placeholderChar);
    else
    {
        let wordLetters = removeDuplicates(wordToGuess.split);
        let replaceLetters = [];

        wordLetters.forEach(letter => {
            if(!guessedChars.includes(letter))
                replaceLetters.push(letter);
        });

        let replaceRegex = new RegExp(`[${replaceLetters.join()}]`, "gm");
        return wordToGuess.word.replace(replaceRegex, graphics.placeholderChar);
    }
}

/**
 * Waits for the user to press a key and then calls the function passed in `callFunction`
 * @param {Function} callFunction
 */
function pauseThenCall(callFunction)
{
    process.stdout.write("Press any key to continue... ");
    process.stdin.resume();

    let keypressEvent = chunk => {
        if(global._ptcListenerAttached)
        {
            process.stdin.pause();
            removeKeypressEvent();

            if(chunk && chunk.match(/\u0003/gmu)) //eslint-disable-line no-control-regex
                return process.exit(0);

            return callFunction();
        }
    };

    let removeKeypressEvent = () => {
        process.stdin.removeListener("keypress", keypressEvent);
        global._ptcListenerAttached = false;
    };

    process.stdin.on("keypress", keypressEvent);
    global._ptcListenerAttached = true;
}

/**
 * Removes duplicate items in an array
 * @param {Array<*>} array 
 */
function removeDuplicates(array) {
    return array.filter((a, b) => array.indexOf(a) === b);
}

/**
 * Capitalizes the first letter of a string
 * @param {String} str
 * @returns {String}
 */
function capitalize(str)
{
    return str.substr(0, 1).toUpperCase() + str.substr(1, str.length - 1);
}

/**
 * Shows the game over screen
 * @param {String} [message]
 */
function gameOver(message)
{
    console.log(`\n${jsl.colors.fg.red}Game over!${jsl.colors.rst}\n`);
    if(message)
        console.log(`${message}\n`);
    
    return pauseThenCall(() => startMenu());
}

/**
 * Shows the game won screen
 * @param {Number} score
 * @param {String} [message]
 */
function gameWon(score, message)
{
    console.log(`\n${jsl.colors.fg.green}You won the game!${jsl.colors.rst}\n\nDifficulty: ${jsl.colors.fg.yellow}${capitalize(global._gameDifficulty)}${jsl.colors.rst}\nYour score is ${score <= 5 ? jsl.colors.fg.green : (score <= 10 ? jsl.colors.fg.yellow : jsl.colors.fg.red)}${score}${jsl.colors.rst}\n`);
    if(message)
        console.log(`${message}\n`);
    
    return pauseThenCall(() => startMenu());
}

/**
 * Shows some about info
 */
function aboutGame()
{
    console.log(`${jsl.colors.fg.blue}About Node-Hangman:${jsl.colors.rst}\n`);
    console.log(`Made by ${jsl.colors.fg.yellow}${package.author.name}${jsl.colors.rst} ( ${package.author.url} )`);
    console.log(`Licensed under the ${jsl.colors.fg.yellow}MIT License${jsl.colors.rst} ( https://sv443.net/LICENSE )`);

    process.stdout.write("\n\n");

    return pauseThenCall(() => startMenu());
}

/**
 * Shows all highscores
 */
function showHighscores()
{
    let highscoreObj = {};

    if(fs.existsSync("./.scores"))
        highscoreObj = JSON.parse(decrypt(fs.readFileSync("./.scores").toString()));

    console.log(`Highscores:\n`);
    console.log(JSON.stringify(highscoreObj, null, 4));
    return pauseThenCall(() => startMenu());
}

/**
 * Saves a score to the scoreboard
 * @param {String} difficulty 
 * @param {Number} score 
 */
function saveScore(difficulty, score)
{
    let currentScores = {
        "easy": [],
        "normal": [],
        "hard": []
    };
    
    if(fs.existsSync("./.scores"))
        currentScores = JSON.parse(decrypt(fs.readFileSync("./.scores").toString()));
    
    currentScores[difficulty].push({
        timestamp: new Date().getTime(),
        score: score
    });

    fs.writeFileSync("./.scores", encrypt(JSON.stringify(currentScores, null, 4)));
}

/**
 * Encrypts things like the score object so users can't easily tamper with them. Obviously this isn't very safe but if you know what you're doing I won't be able to stop you anyways
 * @param {String} value 
 * @returns {Buffer}
 */
function encrypt(value)
{
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv("aes-256-cbc", "aa5de862e31081dcb5605ffdfad9d82a", iv);
    let encrypted = cipher.update(value.toString());
    return `${iv.toString("hex")}:${Buffer.concat([encrypted, cipher.final()]).toString("hex")}`;
}

/**
 * Decrypts previously encrypted things like the score object
 * @param {String} value 
 * @returns {String}
 */
function decrypt(value)
{
    let textParts = value.split(":");
    let iv = Buffer.from(textParts.shift(), "hex");
    let encryptedText = Buffer.from(textParts.join(":"), "hex");
    let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from("aa5de862e31081dcb5605ffdfad9d82a"), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

function sayGoodbye()
{
    console.log(`${jsl.colors.fg.yellow}Goodbye.${jsl.colors.rst}`);
}

/**
 * @returns {RandomWord}
 */
function getRandomWord(inArray)
{
    let itm = inArray[jsl.randRange(0, (inArray.length - 1))];
    return {
        word: itm,
        split: itm.split("")
    };
}

/**
 * Clears the console and makes sure there aren't any artifacts left after clearing
 */
function clearConsole()
{
    console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
    console.clear();
}

/**
 * Opens the start menu / main menu
 */
function startMenu()
{
    clearConsole();

    let mp = new jsl.MenuPrompt({
        retryOnInvalid: true,
        autoSubmit: true,
        exitKey: "x",
        onFinished: (res) => init(res)
    });

    mp.addMenu({
        title: `Node-Hangman v${package.version} - Choose a Difficulty:`,
        options: [
            {
                key: "1",
                description: "Easy"
            },
            {
                key: "2",
                description: "Normal"
            },
            {
                key: "3",
                description: "Hard\n"
            },
            {
                key: "4",
                description: "About"
            },
            {
                key: "5",
                description: "Highscores"
            }
        ]
    });

    mp.open();
}

if(!debuggerActive)
{
    return startMenu();
}
else return init([
    {
        "key": "2",
    }
]);