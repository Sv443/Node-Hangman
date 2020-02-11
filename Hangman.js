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
        return process.exit(0);

    let difficultyMap = [
        "unused",
        "easy",
        "normal",
        "hard",
        "about"
    ];

    let difficulty = difficultyMap[parseInt(res[0].key)];

    if(difficulty == "about")
        return aboutGame();

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
 * @param {Boolean} [gameWon]
 */
function renderStage(index, wordToGuess, guessedChars, message, winGame)
{
    clearConsole();

    process.stdout.write(`${graphics.ceiling}\n`);
    Object.keys(graphics.stages[index]).forEach(key => {
        let line = `${graphics.stageLinePrefix}${graphics.stages[index][key]}${graphics.stageLineSuffix}\n`;
        process.stdout.write(line);
    });
    process.stdout.write(`${graphics.floor}\n\n`);

    process.stdout.write(`Word: ${censoredWord(wordToGuess, guessedChars)}\n`);
    process.stdout.write(`Used letters: ${guessedChars.length > 0 ? guessedChars.join(" ") : "(none)"}\n`);

    if(!graphics.stages[index + 1])
        return gameOver(`The word was "${wordToGuess.word}"`);

    if(message)
        console.log(`\n${jsl.colors.fg.yellow}${message}${jsl.colors.rst}`);
    else process.stdout.write("\n\n");

    if(winGame === true)
        return gameWon();

    process.stdout.write("\n─► ");
    process.stdin.resume();

    let keypressEvent = (chunk, key) => {
        if(global._listenerAttached)
        {
            process.stdin.pause();
            removeKeypressEvent();

            if(key.name == "escape")
                return startMenu();

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
 * Removes duplicate items in an array
 * @param {Array<*>} array 
 */
function removeDuplicates(array) {
    return array.filter((a, b) => array.indexOf(a) === b);
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
    process.exit(0);
}

/**
 * Shows the game won screen
 * @param {String} [message]
 */
function gameWon(message)
{
    console.log(`\n${jsl.colors.fg.green}You won the game after ${global._guessTries} guessed letters!${jsl.colors.rst}\n`);
    if(message)
        console.log(`${message}\n`);
    process.exit(0);
}

/**
 * Shows some about info
 */
function aboutGame()
{
    console.log(`About Node-Hangman:\n`);

    setTimeout(() => {
        return startMenu();
    }, 10 * 1000);
}

/**
 * @typedef {Object} RandomWord
 * @prop {Array<String>} split Every character of the randomly selected item in an array
 * @prop {String} word The whole word
 */

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
                description: "Hard"
            },
            {
                key: "4",
                description: "About"
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