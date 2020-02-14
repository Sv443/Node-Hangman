const fs = require("fs");

/**
 * Returns 
 * @param {("en"|"de")} language 
 * @param {String|Number} id 
 * @param {String|Number} [subID]
 * @returns {String}
 */
const translate = (language, id, subID) => {
    let trFileName = `./translations/${language}.json`;

    if(!fs.existsSync(trFileName))
        return `err_no-translation-found @ ${language}:${id}.${subID}`;
    
    let tr = JSON.parse(fs.readFileSync(trFileName).toString());

    if(tr[id] && !subID)
        return tr[id];
    else if(Object.keys(tr[id]).length > 0 && subID && (typeof tr[id][subID] != "boolean" && tr[id][subID]))
        return tr[id][subID];
    else if(Object.keys(tr[id]).length > 0 && subID && typeof tr[id][subID] == "boolean")
        return tr[id][subID];
    else
        return `err_no-translation-found @ ${language}:${id}.${subID}`;
}
module.exports = translate;