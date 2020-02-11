# Node-Hangman
A simple game of hangman you can play directly in the CLI.  
Features three difficulties (easy, medium and hard), an easy to use graphical interface.

<br>

## You can download the latest release [by clicking here](https://github.com/Sv443/Node-Hangman/releases)

<br>

To delete all highscores, turn on ["show hidden files and folders"](https://www.howtogeek.com/howto/windows-vista/show-hidden-files-and-folders-in-windows-vista/) in Windows Explorer and delete the `.scores` file.

<br><br>

## Build instructions:
To build Node-Hangman from source, follow these steps:
1. Make sure at least a semi-recent version of Node.js is installed on your system
2. Run the commands `npm i` and `npm i --save-dev` to install all the dependencies
3. Build the executable file:
    - To build a .exe for Windows, run the command `npm run build-win`
    - To build an executable file for Linux, run the command `npm run build-linux`
    - To build both, run the command `npm run build`