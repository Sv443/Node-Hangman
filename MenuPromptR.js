const jsl = require("svjsl");

//#MARKER typedefs
/**
 * @typedef {Object} MenuPromptMenuOption
 * @prop {String} key The key(s) that need(s) to be pressed to select this option
 * @prop {String} description The description of this option
 */

/**
 * @typedef {Object} MenuPropmtMenu
 * @prop {String} title The title of this menu
 * @prop {Array<MenuPromptMenuOption>} options An array of options for this menu
 */

/**
 * @typedef {Object} MenuPromptOptions The options of the menu prompt
 * @prop {String} [exitKey="x"] The key or keys that need to be entered to exit the prompt
 * @prop {String} [optionSeparator=")"] The separator character(s) between the option key and the option description
 * @prop {String} [cursorPrefix="─►"] Character(s) that should be prefixed to the cursor. Will default to this arrow: "─►"
 * @prop {Boolean} [retryOnInvalid=true] Whether the menu should be retried if the user entered a wrong option - if false, continues to next menu
 * @prop {MenuPromptOnFinishedCallback} [onFinished] A function that gets called when the user is done with all of the menus of the prompt or entered the exit key(s). The only passed parameter is an array containing all selected option keys
 * @prop {Boolean} [autoSubmit] If set to true, the MenuPrompt will only accept a single character of input and will then automatically submit the value. If set to false, the user will have to explicitly press the Enter key to submit a value
 */

/**
 * @callback MenuPromptOnFinishedCallback A callback that gets executed once the MenuPrompt has finished
 * @param {Array<MenuPromptResult>} results The results of the MenuPrompt (an array containing objects) - will be an empty array if there aren't any results
 */

/**
 * @typedef {Object} MenuPromptResult The results of the menu prompt
 * @prop {String} key The key of the selected option
 * @prop {String} description The description of the selected option
 * @prop {String} menuTitle The title of the menu
 * @prop {Number} optionIndex The zero-based index of the selected option
 * @prop {Number} menuIndex The zero-based index of the menu
 */

 /**
  * 🔹 Creates an interactive prompt with one or many menus - add them using `MenuPrompt.addMenu()` 🔹
  * ⚠️ Warning: Make sure to use the `new` keyword to create an object of this class - example: `let mp = new jsl.MenuPrompt()` ⚠️
  * @class
  * @since 1.8.0
  */
//#MARKER constructor
class MenuPromptR extends jsl.MenuPrompt {
    /**
     * 🔹 Creates an interactive prompt with one or many menus - add them using `MenuPrompt.addMenu()` 🔹
     * ⚠️ Warning: After creating a MenuPrompt object, the process will no longer exit automatically until the MenuPrompt has finished or was explicitly closed. You have to explicitly use process.exit() until the menu has finished or is closed
     * @param {MenuPromptOptions} options The options for the prompt
     * @returns {(Boolean|String)} Returns true, if the MenuPrompt was successfully created, a string containing the error message, if not
     * @constructor
     * @since 1.8.0
     * @version 1.8.2 Removed second parameter - use `MenuPrompt.addMenu()` instead
     */
    constructor(options)
    {
        let superRes = super(options);
        this._exitText = "Exit";
        this._titleUlChar = "‾";
        this._ufEmptySelection = "Please type one of the green options and press enter";
        this._ufInvalidOption = "Invalid option \"%1\" selected";

        return superRes;
    }

    //#MARKER open
    /**
     * 🔹 Opens the menu 🔹
     * ⚠️ Warning: While the menu is opened you shouldn't write anything to the console / to the stdout and stderr as this could mess up the layout of the menu and/or make stuff unreadable
     * @returns {(Boolean|String)} Returns true, if the menu could be opened or a string containing an error message, if not
     * @since 1.8.0
     */
    open()
    {
        let isEmpty = jsl.isEmpty;
        let col = jsl.colors;

        if(this._active)
            return "This MenuPrompt object was already opened - not opening again";

        if(isEmpty(this._menus))
            return `No menus were added to the MenuPrompt object. Please use the method "MenuPrompt.addMenu()" or supply the menu(s) in the construction of the MenuPrompt object before calling "MenuPrompt.open()"`;

        this._active = true;


        let openMenu = (idx, userFeedback) => {
            if(idx >= this._menus.length || !this._active)
            {
                this.close();
                this._options.onFinished(this._results);
                return;
            }
            else
            {
                this._currentMenu = idx;

                this._clearConsole();

                let currentMenu = {
                    title: "",
                    options: ""
                }

                currentMenu.title = this._menus[idx].title;

                let titleUL = "";
                currentMenu.title.split("").forEach(() => titleUL += this._titleUlChar);

                let longestOption = 0;
                this._menus[idx].options.forEach(option => longestOption = option.key.length > longestOption ? option.key.length : longestOption);

                this._menus[idx].options.forEach(option => {
                    let optionSpacer = "  ";
                    let neededSpaces = longestOption - option.key.length;
                    for(let i = 0; i < neededSpaces; i++)
                        optionSpacer += " ";
                    
                    currentMenu.options += `${col.fg.green}${option.key}${col.rst}${this._options.optionSeparator}${optionSpacer}${option.description}\n`;
                });

                if(!isEmpty(this._options.exitKey))
                {
                    let exitSpacer = "  ";
                    let neededExitSpaces = longestOption - this._options.exitKey.length;
                    for(let i = 0; i < neededExitSpaces; i++)
                        exitSpacer += " ";
                
                    currentMenu.options += `\n${col.fg.red}${this._options.exitKey}${col.rst}${this._options.optionSeparator}${exitSpacer}${this._exitText}\n`;
                }

                let menuText = `\
${isEmpty(userFeedback) ? "\n\n\n" : `${col.fg.red}❗️ > ${userFeedback}${col.rst}\n\n\n`}${col.fat}${col.fg.cyan}${currentMenu.title}${col.rst}
${col.fg.cyan}${titleUL}${col.rst}
${currentMenu.options}

${this._options.cursorPrefix} \
`;

                let answerCallback = answer => {
                    if(!isEmpty(this._options.exitKey) && answer == this._options.exitKey)
                        return openMenu(++idx);

                    console.log();

                    if(isEmpty(answer) && this._options.retryOnInvalid !== false)
                    {
                        return openMenu(idx, this._ufEmptySelection);
                    }
                    else
                    {
                        let currentOptions = this._menus[idx].options;
                        let selectedOption = null;
                        currentOptions.forEach((opt, i) => {
                            if(opt.key == answer)
                            {
                                selectedOption = opt;
                                selectedOption["menuTitle"] = this._menus[idx].title;
                                selectedOption["optionIndex"] = i;
                                selectedOption["menuIndex"] = idx;
                            }
                        });

                        if(selectedOption != null)
                        {
                            if(typeof this._results != "object" || isNaN(parseInt(this._results.length)))
                                this._results = [selectedOption];
                            else this._results.push(selectedOption);

                            return openMenu(++idx);
                        }
                        else
                        {
                            return openMenu(idx, this._ufInvalidOption.replace("%1", answer.replace(/\n|\r\n/gm, "\\\\n")));
                        }
                    }
                }

                if(!this._options.autoSubmit)
                {
                    this._rl.resume();
                    this._rl.question(menuText, answer => {
                        this._rl.pause();
                        return answerCallback(answer);
                    });
                }
                else
                {
                    this._listenerAttached = true;
                    process.stdout.write(menuText);
                    process.stdin.resume();

                    let keypressEvent = chunk => {
                        if(this._listenerAttached)
                        {
                            process.stdin.pause();
                            removeKeypressEvent();
                            return answerCallback(chunk);
                        }
                    };

                    let removeKeypressEvent = () => {
                        process.stdin.removeListener("keypress", keypressEvent);
                        this._listenerAttached = false;
                    };

                    process.stdin.on("keypress", keypressEvent);
                }
            }
        }

        openMenu(0);
        return true;
    }
}
module.exports = MenuPromptR;
