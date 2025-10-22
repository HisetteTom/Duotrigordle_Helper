// Word list management
const WORD_LIST_URL = 'https://gist.githubusercontent.com/dracos/dd0668f281e685bad51479e5acaadb93/raw/6bfa15d263d6d5b63840a8e5b64e04b382fdb079/valid-wordle-words.txt';
let wordleWords = [];

function initializeWordList() {
  GM_xmlhttpRequest({
    method: 'GET',
    url: WORD_LIST_URL,
    onload: function(response) {
      wordleWords = response.responseText.toLowerCase().split('\n')
        .map(word => word.trim())
        .filter(word => word.length === 5);
      console.log(`Loaded ${wordleWords.length} valid Wordle words`);
    }
  });
}

function getWordList() {
  return wordleWords;
}

export { initializeWordList, getWordList };